"""Tests for preview-plan suggestions and shareable report endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

CSV_WITH_ISSUES = (
    "full_name,email,signup_date\n"
    "john doe,JOHN@EXAMPLE.COM,2024/01/15\n"
    "  Jane Smith  ,jane@example.com,01-20-2024\n"
    "john doe,JOHN@EXAMPLE.COM,2024/01/15\n"  # exact duplicate
)

def _ingest(data: str = CSV_WITH_ISSUES) -> str:
    resp = client.post("/api/v1/ingest/raw", json={"data": data})
    assert resp.status_code == 200
    return resp.json()["job_id"]

def _ingest_and_clean(data: str = CSV_WITH_ISSUES) -> str:
    job_id = _ingest(data)
    clean_resp = client.post("/api/v1/clean", json={"job_id": job_id})
    assert clean_resp.status_code == 200
    return job_id


# ── Preview Plan ──────────────────────────────────────────────────────────────

def test_preview_plan_returns_suggestions():
    job_id = _ingest()
    resp = client.post("/api/v1/preview-plan", json={"job_id": job_id})
    assert resp.status_code == 200
    body = resp.json()
    assert body["job_id"] == job_id
    assert "suggestions" in body
    assert isinstance(body["suggestions"], list)
    assert body["total"] == len(body["suggestions"])

def test_preview_plan_detects_duplicates():
    job_id = _ingest()
    resp = client.post("/api/v1/preview-plan", json={"job_id": job_id})
    suggestions = resp.json()["suggestions"]
    ids = [s["id"] for s in suggestions]
    assert "remove_duplicates" in ids

def test_preview_plan_detects_email_case():
    job_id = _ingest()
    resp = client.post("/api/v1/preview-plan", json={"job_id": job_id})
    suggestions = resp.json()["suggestions"]
    # At least one suggestion should be email-related
    email_suggestions = [s for s in suggestions if "email" in s.get("id", "")]
    assert len(email_suggestions) >= 1

def test_preview_plan_suggestion_schema():
    job_id = _ingest()
    resp = client.post("/api/v1/preview-plan", json={"job_id": job_id})
    for s in resp.json()["suggestions"]:
        assert "id" in s
        assert "label" in s
        assert "description" in s
        assert "affected_rows" in s
        assert "enabled" in s
        assert "category" in s

def test_preview_plan_job_not_found():
    resp = client.post("/api/v1/preview-plan", json={"job_id": "smlt_doesnotexist"})
    assert resp.status_code == 404

def test_preview_plan_on_clean_data_returns_few_suggestions():
    clean_csv = "name,value\nAlice,1\nBob,2\nCarol,3"
    job_id = _ingest(clean_csv)
    resp = client.post("/api/v1/preview-plan", json={"job_id": job_id})
    assert resp.status_code == 200
    # Clean data should have no duplicate suggestion
    ids = [s["id"] for s in resp.json()["suggestions"]]
    assert "remove_duplicates" not in ids


# ── Shareable Reports ─────────────────────────────────────────────────────────

def test_create_share_link():
    job_id = _ingest_and_clean()
    resp = client.post(f"/api/v1/jobs/{job_id}/share")
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body
    assert "expires_at" in body
    assert len(body["token"]) > 10

def test_share_link_for_nonexistent_job():
    resp = client.post("/api/v1/jobs/smlt_doesnotexist/share")
    assert resp.status_code == 404

def test_get_report_returns_metadata():
    job_id = _ingest_and_clean()
    token = client.post(f"/api/v1/jobs/{job_id}/share").json()["token"]
    resp = client.get(f"/api/v1/reports/{token}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["job_id"] == job_id
    assert "record_count_in" in body
    assert "duplicates_removed" in body
    assert "fields_normalized" in body
    assert "quality_before" in body
    assert "quality_after" in body

def test_get_report_does_not_return_raw_records():
    job_id = _ingest_and_clean()
    token = client.post(f"/api/v1/jobs/{job_id}/share").json()["token"]
    resp = client.get(f"/api/v1/reports/{token}")
    body = resp.json()
    # Raw records must never appear in public report
    assert "records" not in body
    assert "cleaned" not in body

def test_get_report_invalid_token():
    resp = client.get("/api/v1/reports/totallyinvalidtoken")
    assert resp.status_code == 404

def test_share_link_can_be_used_without_auth():
    job_id = _ingest_and_clean()
    token = client.post(f"/api/v1/jobs/{job_id}/share").json()["token"]
    # No auth header — should still work (public endpoint)
    resp = client.get(f"/api/v1/reports/{token}")
    assert resp.status_code == 200


# ── Job List (history) ────────────────────────────────────────────────────────

def test_job_list_returns_paginated_result():
    _ingest()
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200
    body = resp.json()
    assert "jobs" in body
    assert "total" in body
    assert "page" in body
    assert "pages" in body

def test_job_list_respects_limit():
    resp = client.get("/api/v1/jobs?limit=2")
    assert resp.status_code == 200
    assert len(resp.json()["jobs"]) <= 2

def test_job_list_invalid_page():
    resp = client.get("/api/v1/jobs?page=0")
    # Should either return 422 or default to page 1
    assert resp.status_code in (200, 422)
