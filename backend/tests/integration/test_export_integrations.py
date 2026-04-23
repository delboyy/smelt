"""Tests for Airtable and Notion export integrations (httpx mocked)."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.job_store import set_job

client = TestClient(app)

CSV = "name,email\nAlice,alice@example.com\nBob,bob@example.com"

FAKE_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"


def _ingest_and_clean() -> str:
    resp = client.post("/api/v1/ingest/raw", json={"data": CSV})
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    # Manually set cleaned state so we don't need the LLM
    set_job(job_id, {
        "status": "cleaned",
        "format": "CSV",
        "records": [{"name": "Alice", "email": "alice@example.com"}, {"name": "Bob", "email": "bob@example.com"}],
        "cleaned": [{"name": "Alice", "email": "alice@example.com"}, {"name": "Bob", "email": "bob@example.com"}],
        "schema": {},
        "filename": "test.csv",
    })
    return job_id


def _fake_airtable_responses(status_create=200, status_insert=200):
    """Return a mock AsyncClient context manager for Airtable calls."""
    mock_client = AsyncMock()
    create_resp = MagicMock()
    create_resp.status_code = status_create
    create_resp.json.return_value = {"id": "tblXXX"}
    create_resp.raise_for_status = MagicMock()

    insert_resp = MagicMock()
    insert_resp.status_code = status_insert
    insert_resp.json.return_value = {"records": []}
    insert_resp.raise_for_status = MagicMock()

    mock_client.post = AsyncMock(side_effect=[create_resp, insert_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


def _fake_notion_responses(status_db=200, status_page=200):
    mock_client = AsyncMock()
    db_resp = MagicMock()
    db_resp.status_code = status_db
    db_resp.json.return_value = {"id": "db-uuid-123"}
    db_resp.raise_for_status = MagicMock()

    page_resp = MagicMock()
    page_resp.status_code = status_page
    page_resp.json.return_value = {"id": "page-uuid"}
    page_resp.raise_for_status = MagicMock()

    mock_client.post = AsyncMock(side_effect=[db_resp, page_resp, page_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


# ── Auth guard ────────────────────────────────────────────────────────────────

def test_airtable_export_requires_auth():
    job_id = _ingest_and_clean()
    resp = client.post("/api/v1/export/airtable", json={
        "job_id": job_id,
        "personal_access_token": "pat123",
        "base_id": "appXXX",
    })
    assert resp.status_code == 401


def test_notion_export_requires_auth():
    job_id = _ingest_and_clean()
    resp = client.post("/api/v1/export/notion", json={
        "job_id": job_id,
        "integration_token": "secret_123",
        "parent_page_id": "page-uuid",
    })
    assert resp.status_code == 401


# ── Job state guard ───────────────────────────────────────────────────────────

def test_airtable_export_rejects_uncleaned_job():
    resp = client.post("/api/v1/ingest/raw", json={"data": CSV})
    raw_job_id = resp.json()["job_id"]  # status = "parsed", not cleaned
    resp2 = client.post("/api/v1/export/airtable", json={
        "job_id": raw_job_id,
        "personal_access_token": "pat123",
        "base_id": "appXXX",
    }, headers={"Authorization": FAKE_TOKEN})
    assert resp2.status_code in (400, 401)


def test_notion_export_rejects_nonexistent_job():
    resp = client.post("/api/v1/export/notion", json={
        "job_id": "smlt_doesnotexist",
        "integration_token": "secret_123",
        "parent_page_id": "page-uuid",
    }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code in (404, 401)


# ── Airtable success path ─────────────────────────────────────────────────────

def test_airtable_export_success():
    job_id = _ingest_and_clean()
    mock_client = _fake_airtable_responses()
    with patch("app.api.export_integrations._get_current_user_id", return_value="user123"), \
         patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/api/v1/export/airtable", json={
            "job_id": job_id,
            "personal_access_token": "pat123",
            "base_id": "appXXX",
            "table_name": "Test Table",
        }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code == 200
    body = resp.json()
    assert body["records_pushed"] == 2
    assert body["table"] == "Test Table"


def test_airtable_export_invalid_token_returns_401():
    job_id = _ingest_and_clean()
    mock_client = _fake_airtable_responses(status_create=401)
    with patch("app.api.export_integrations._get_current_user_id", return_value="user123"), \
         patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/api/v1/export/airtable", json={
            "job_id": job_id,
            "personal_access_token": "bad",
            "base_id": "appXXX",
        }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code == 401


# ── Notion success path ───────────────────────────────────────────────────────

def test_notion_export_success():
    job_id = _ingest_and_clean()
    mock_client = _fake_notion_responses()
    with patch("app.api.export_integrations._get_current_user_id", return_value="user123"), \
         patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/api/v1/export/notion", json={
            "job_id": job_id,
            "integration_token": "secret_abc",
            "parent_page_id": "page-uuid-123",
            "database_title": "My DB",
        }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code == 200
    body = resp.json()
    assert body["records_pushed"] == 2
    assert body["database_id"] == "db-uuid-123"
    assert body["truncated"] is False


def test_notion_export_invalid_token_returns_401():
    job_id = _ingest_and_clean()
    mock_client = _fake_notion_responses(status_db=401)
    with patch("app.api.export_integrations._get_current_user_id", return_value="user123"), \
         patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/api/v1/export/notion", json={
            "job_id": job_id,
            "integration_token": "bad",
            "parent_page_id": "page-uuid",
        }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code == 401


def test_notion_export_truncates_at_100():
    """Records > 100 should push only 100 and set truncated=True."""
    big_records = [{"name": f"Row {i}", "val": str(i)} for i in range(150)]
    job_id = "smlt_bigtest"
    set_job(job_id, {
        "status": "cleaned",
        "format": "CSV",
        "records": big_records,
        "cleaned": big_records,
        "schema": {},
        "filename": "big.csv",
    })

    call_count = 0

    async def fake_post(url, **kwargs):
        nonlocal call_count
        call_count += 1
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {"id": f"id-{call_count}"}
        resp.raise_for_status = MagicMock()
        return resp

    mock_client = AsyncMock()
    mock_client.post = fake_post
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.export_integrations._get_current_user_id", return_value="user123"), \
         patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/api/v1/export/notion", json={
            "job_id": job_id,
            "integration_token": "secret_abc",
            "parent_page_id": "page-uuid",
        }, headers={"Authorization": FAKE_TOKEN})
    assert resp.status_code == 200
    body = resp.json()
    assert body["truncated"] is True
    assert body["records_pushed"] == 100
