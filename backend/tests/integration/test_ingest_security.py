"""Security tests: SSRF protection, upload limits, CORS headers."""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.api.ingest import _is_safe_url

client = TestClient(app)


# ── SSRF Protection ───────────────────────────────────────────────────────────

def test_ssrf_blocks_localhost():
    assert _is_safe_url("http://localhost/secret") is False
    assert _is_safe_url("http://127.0.0.1/secret") is False

def test_ssrf_blocks_private_ipv4():
    assert _is_safe_url("http://192.168.1.1/data.csv") is False
    assert _is_safe_url("http://10.0.0.1/data.csv") is False
    assert _is_safe_url("http://172.16.0.1/data.csv") is False

def test_ssrf_blocks_loopback_ipv6():
    assert _is_safe_url("http://[::1]/secret") is False

def test_ssrf_blocks_non_http_schemes():
    assert _is_safe_url("file:///etc/passwd") is False
    assert _is_safe_url("ftp://example.com/data.csv") is False
    assert _is_safe_url("gopher://evil.com") is False

def test_ssrf_allows_public_url():
    # This resolves to a real public IP — only check scheme+structure not actual network
    assert _is_safe_url("https://example.com/data.csv") is True

def test_url_ingest_endpoint_blocks_private_ip():
    resp = client.post("/api/v1/ingest/url", json={"url": "http://192.168.1.1/data.csv"})
    assert resp.status_code == 400

def test_url_ingest_endpoint_blocks_localhost():
    resp = client.post("/api/v1/ingest/url", json={"url": "http://localhost:8080/internal"})
    assert resp.status_code == 400

def test_url_ingest_handles_network_timeout():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        import httpx
        mock_get.side_effect = httpx.TimeoutException("timeout")
        # We need a "safe" public URL that passes SSRF check
        with patch("app.api.ingest._is_safe_url", return_value=True):
            resp = client.post("/api/v1/ingest/url", json={"url": "https://example.com/data.csv"})
        assert resp.status_code == 408

def test_url_ingest_handles_fetch_error():
    with patch("app.api.ingest._is_safe_url", return_value=True):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("connection refused")
            resp = client.post("/api/v1/ingest/url", json={"url": "https://example.com/data.csv"})
    assert resp.status_code == 400


# ── Upload Size Limits ────────────────────────────────────────────────────────

def test_file_upload_exceeding_10mb_returns_413():
    oversized = b"a,b\n" + b"x,y\n" * (10 * 1024 * 1024 // 4 + 1)
    resp = client.post(
        "/api/v1/ingest",
        files={"file": ("big.csv", oversized, "text/csv")},
    )
    assert resp.status_code == 413

def test_file_upload_within_limit_succeeds():
    small_csv = b"name,email\njohn,john@example.com\n"
    resp = client.post(
        "/api/v1/ingest",
        files={"file": ("small.csv", small_csv, "text/csv")},
    )
    assert resp.status_code == 200


# ── CORS Headers ─────────────────────────────────────────────────────────────

def test_cors_allows_vercel_app_origin():
    resp = client.options(
        "/api/v1/ingest/raw",
        headers={
            "Origin": "https://smelt.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    # Should not be blocked
    assert resp.status_code in (200, 204)
    assert "access-control-allow-origin" in resp.headers

def test_cors_allows_localhost():
    resp = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3002",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code in (200, 204)

def test_cors_blocks_unknown_origin():
    resp = client.options(
        "/health",
        headers={
            "Origin": "https://evil.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Unknown origins should not receive allow-origin header
    allow = resp.headers.get("access-control-allow-origin", "")
    assert allow != "https://evil.com"


# ── XML Injection ─────────────────────────────────────────────────────────────

def test_xml_export_escapes_special_chars():
    csv_data = 'name,note\n"<script>alert(1)</script>","a & b"\n'
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    assert ingest_resp.status_code == 200
    job_id = ingest_resp.json()["job_id"]
    export_resp = client.post("/api/v1/export", json={"job_id": job_id, "format": "xml"})
    assert export_resp.status_code == 200
    # Raw script tags must not appear in XML output
    assert "<script>" not in export_resp.text
    assert "&lt;script&gt;" in export_resp.text or "script" not in export_resp.text.lower()

def test_xml_export_escapes_ampersand():
    csv_data = "company,country\nFoo & Bar,US\nBaz & Qux,UK\n"
    ingest_resp = client.post("/api/v1/ingest/raw", json={"data": csv_data})
    assert ingest_resp.status_code == 200
    job_id = ingest_resp.json()["job_id"]
    export_resp = client.post("/api/v1/export", json={"job_id": job_id, "format": "xml"})
    assert export_resp.status_code == 200
    # Raw & must be escaped to &amp; in XML output
    assert "&amp;" in export_resp.text


# ── XXE Protection ────────────────────────────────────────────────────────────

def test_xxe_payload_rejected():
    xxe = """<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<records><record><name>&xxe;</name></record></records>"""
    resp = client.post("/api/v1/ingest/raw", json={"data": xxe})
    # Should either parse safely (entity not expanded) or return 400
    if resp.status_code == 200:
        # Entity must NOT be resolved to file contents
        preview = str(resp.json().get("preview", ""))
        assert "root:" not in preview
    else:
        assert resp.status_code == 400
