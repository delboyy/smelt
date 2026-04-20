"""API endpoint integration tests."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_ingest_raw_csv():
    csv_data = "full_name,email\njohn doe,JOHN@X.COM\njane smith,jane@x.com"
    resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "parsed"
    assert body["format"] == "CSV"
    assert body["record_count"] == 2
    assert "job_id" in body
    assert body["job_id"].startswith("smlt_")


def test_ingest_raw_json():
    import json
    records = [{"name": "John"}, {"name": "Jane"}]
    resp = client.post("/api/v1/ingest/raw", json={"data": json.dumps(records)})
    assert resp.status_code == 200
    assert resp.json()["format"] == "JSON"
    assert resp.json()["record_count"] == 2


def test_ingest_raw_xml():
    xml = """<?xml version="1.0"?>
<records>
  <record><name>John</name><email>john@x.com</email></record>
</records>"""
    resp = client.post("/api/v1/ingest/raw", json={"data": xml})
    assert resp.status_code == 200
    assert resp.json()["format"] == "XML"


def test_ingest_no_data_returns_400():
    resp = client.post("/api/v1/ingest/raw", json={"data": ""})
    assert resp.status_code == 400


def test_ingest_invalid_format_returns_400():
    resp = client.post("/api/v1/ingest/raw", json={"data": "just plain text"})
    assert resp.status_code == 400


def test_clean_pipeline():
    # First ingest
    csv_data = "full_name,email,status\njohn doe,JOHN@X.COM,active\njane smith,jane@x.com,ACTIVE"
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    assert ingest_resp.status_code == 200
    job_id = ingest_resp.json()["job_id"]

    # Then clean
    clean_resp = client.post("/api/v1/clean", json={"job_id": job_id})
    assert clean_resp.status_code == 200
    body = clean_resp.json()
    assert body["status"] == "cleaned"
    assert "stats" in body
    assert "changes" in body


def test_export_csv():
    csv_data = "name,email\njohn,john@x.com"
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    job_id = ingest_resp.json()["job_id"]

    export_resp = client.post("/api/v1/export", json={"job_id": job_id, "format": "csv"})
    assert export_resp.status_code == 200
    assert "name" in export_resp.text


def test_export_json():
    csv_data = "name,email\njohn,john@x.com"
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    job_id = ingest_resp.json()["job_id"]

    export_resp = client.post("/api/v1/export", json={"job_id": job_id, "format": "json"})
    assert export_resp.status_code == 200
    import json
    data = json.loads(export_resp.text)
    assert isinstance(data, list)


def test_job_status():
    csv_data = "name,email\njohn,john@x.com"
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    job_id = ingest_resp.json()["job_id"]

    status_resp = client.get(f"/api/v1/job/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["job_id"] == job_id
    assert status_resp.json()["status"] == "parsed"


def test_job_not_found():
    resp = client.get("/api/v1/job/smlt_doesnotexist")
    assert resp.status_code == 404


def test_clean_job_not_found():
    resp = client.post("/api/v1/clean", json={"job_id": "smlt_doesnotexist"})
    assert resp.status_code == 404
