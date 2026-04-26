"""Integration tests for billing endpoints and tier enforcement."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

# ── helpers ──────────────────────────────────────────────────────────────────

def _register_and_login(client: TestClient, email: str, password: str = "pass1234"):
    client.post("/api/v1/auth/register", json={"email": email, "password": password, "name": "Test"})
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ── 1. status requires auth ───────────────────────────────────────────────────

def test_billing_status_requires_auth(db_client):
    r = db_client.get("/api/v1/billing/status")
    assert r.status_code == 401


# ── 2. status returns free plan for new user ─────────────────────────────────

def test_billing_status_returns_free_plan(db_client):
    token = _register_and_login(db_client, "billing_free@example.com")
    r = db_client.get("/api/v1/billing/status", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "free"
    assert data["row_limit"] == 500
    assert "rows_used_this_month" in data


# ── 3. checkout requires auth ─────────────────────────────────────────────────

def test_checkout_requires_auth(db_client):
    r = db_client.post("/api/v1/billing/checkout")
    assert r.status_code == 401


# ── 4. checkout returns 503 when Stripe not configured ───────────────────────

def test_checkout_returns_503_when_stripe_not_configured(db_client):
    token = _register_and_login(db_client, "billing_checkout_503@example.com")
    # No STRIPE_SECRET_KEY → 503
    with patch("app.api.billing.get_settings") as mock_settings:
        s = MagicMock()
        s.stripe_secret_key = ""
        s.stripe_price_id = ""
        s.stripe_webhook_secret = ""
        s.frontend_url = "http://localhost:3000"
        mock_settings.return_value = s
        r = db_client.post(
            "/api/v1/billing/checkout",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 503


# ── 5. portal requires auth ───────────────────────────────────────────────────

def test_portal_requires_auth(db_client):
    r = db_client.get("/api/v1/billing/portal")
    assert r.status_code == 401


# ── 6. portal returns 503 when user has no stripe_customer_id ────────────────

def test_portal_returns_503_when_no_customer_id(db_client):
    token = _register_and_login(db_client, "billing_portal_503@example.com")
    # Stripe is "configured" but user has no customer id
    import stripe as real_stripe
    with patch("app.api.billing._stripe", return_value=real_stripe):
        r = db_client.get(
            "/api/v1/billing/portal",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 503


# ── 7. row limit not enforced for small jobs ──────────────────────────────────

def test_row_limit_not_enforced_for_small_jobs(db_client):
    """Jobs with ≤500 rows should not be blocked."""
    from app.core.job_store import update_job
    token = _register_and_login(db_client, "billing_small@example.com")

    r = db_client.post(
        "/api/v1/ingest/raw",
        json={"data": "a,b\n1,2\n3,4", "format": "auto", "encoding": "auto"},
    )
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Patch the planner so we don't need an LLM key
    with patch("app.core.planner.generate_transform_spec", new_callable=AsyncMock) as mock_plan:
        from app.models.schemas import TransformSpec
        mock_plan.return_value = TransformSpec(transforms=[], strategy="")
        resp = db_client.post(
            "/api/v1/clean",
            json={"job_id": job_id},
            headers={"Authorization": f"Bearer {token}"},
        )
    # Should not be 402 (may succeed or fail for other reasons, but not row-limit)
    assert resp.status_code != 402


# ── 8. row limit enforced for large jobs (free user) ─────────────────────────

def test_row_limit_enforced_for_large_jobs_free_user(db_client):
    """Jobs with >500 rows should be blocked with 402 for free-tier users."""
    from app.core.job_store import update_job, get_job

    token = _register_and_login(db_client, "billing_large@example.com")

    # Create a job via ingest, then force-set 501 records
    r = db_client.post(
        "/api/v1/ingest/raw",
        json={"data": "a,b\n1,2", "format": "auto", "encoding": "auto"},
    )
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Inflate records count past limit
    big_records = [{"a": str(i), "b": str(i)} for i in range(501)]
    update_job(job_id, {"records": big_records, "status": "parsed"})

    resp = db_client.post(
        "/api/v1/clean",
        json={"job_id": job_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 402
    detail = resp.json()["detail"]
    assert detail["error"]["code"] == "ROW_LIMIT_EXCEEDED"
    assert detail["error"]["limit"] == 500
    assert detail["error"]["count"] == 501


# ── 9. row limit not enforced when unauthenticated ────────────────────────────

def test_row_limit_not_enforced_when_unauthenticated(db_client):
    """Anonymous users bypass the row cap (they also bypass job ownership tracking)."""
    from app.core.job_store import update_job

    r = db_client.post(
        "/api/v1/ingest/raw",
        json={"data": "a,b\n1,2", "format": "auto", "encoding": "auto"},
    )
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    big_records = [{"a": str(i), "b": str(i)} for i in range(501)]
    update_job(job_id, {"records": big_records, "status": "parsed"})

    with patch("app.core.planner.generate_transform_spec", new_callable=AsyncMock) as mock_plan:
        from app.models.schemas import TransformSpec
        mock_plan.return_value = TransformSpec(transforms=[], strategy="")
        resp = db_client.post("/api/v1/clean", json={"job_id": job_id})

    # Should not 402 — row cap only applies when authenticated
    assert resp.status_code != 402


# ── 10. webhook returns 200 without secret configured ────────────────────────

def test_webhook_returns_200_without_secret_configured(db_client):
    """When STRIPE_WEBHOOK_SECRET is not set, webhook should return 200."""
    with patch("app.api.billing.get_settings") as mock_settings:
        s = MagicMock()
        s.stripe_secret_key = "sk_test_fake"
        s.stripe_webhook_secret = ""
        s.stripe_price_id = ""
        s.frontend_url = "http://localhost:3000"
        mock_settings.return_value = s
        r = db_client.post(
            "/api/v1/billing/webhook",
            content=b'{"type":"checkout.session.completed","data":{"object":{}}}',
            headers={"Content-Type": "application/json", "stripe-signature": "fake"},
        )
    assert r.status_code == 200
    assert r.json()["received"] is True
