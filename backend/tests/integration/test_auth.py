"""Auth endpoint integration tests: register, login, API key CRUD."""
import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("NEXTAUTH_SECRET", "test-secret-for-auth-tests")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register(client, email: str, password: str = "TestPass123!", name: str = "Test User"):
    return client.post("/api/v1/auth/register", json={"email": email, "password": password, "name": name})

def _login(client, email: str, password: str = "TestPass123!"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})

def _auth_header(client, email: str) -> dict:
    _register(client, email)
    token = _login(client, email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Register ──────────────────────────────────────────────────────────────────

def test_register_success(db_client):
    resp = _register(db_client, "reg_success@example.com")
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "reg_success@example.com"

def test_register_duplicate_email_returns_409(db_client):
    _register(db_client, "dup_test@example.com")
    resp = _register(db_client, "dup_test@example.com")
    assert resp.status_code == 409

def test_register_invalid_email_returns_422(db_client):
    resp = db_client.post("/api/v1/auth/register", json={"email": "notanemail", "password": "pass"})
    assert resp.status_code == 422

def test_register_name_defaults_to_email_prefix(db_client):
    resp = _register(db_client, "noname_test@example.com", name="")
    assert resp.status_code == 200
    assert resp.json()["user"]["name"] == "noname_test"


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_success(db_client):
    _register(db_client, "login_ok@example.com")
    resp = _login(db_client, "login_ok@example.com")
    assert resp.status_code == 200
    assert "access_token" in resp.json()

def test_login_wrong_password_returns_401(db_client):
    _register(db_client, "wrongpass_test@example.com")
    resp = _login(db_client, "wrongpass_test@example.com", "WrongPassword!")
    assert resp.status_code == 401

def test_login_unknown_email_returns_401(db_client):
    resp = _login(db_client, "nobody@nowhere.example.com")
    assert resp.status_code == 401

def test_login_returns_user_fields(db_client):
    _register(db_client, "jwtfields@example.com", name="JWT User")
    resp = _login(db_client, "jwtfields@example.com")
    assert resp.status_code == 200
    user = resp.json()["user"]
    assert "id" in user
    assert user["email"] == "jwtfields@example.com"
    assert "tier" in user


# ── API Keys ──────────────────────────────────────────────────────────────────

def test_create_api_key_requires_auth(db_client):
    resp = db_client.post("/api/v1/auth/api-keys", json={"name": "test"})
    assert resp.status_code == 401

def test_create_api_key_success(db_client):
    headers = _auth_header(db_client, "create_key_ok@example.com")
    resp = db_client.post("/api/v1/auth/api-keys", json={"name": "Production"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["key"].startswith("sk_live_")
    assert body["name"] == "Production"
    assert "id" in body

def test_api_key_shown_only_once(db_client):
    headers = _auth_header(db_client, "once_key_ok@example.com")
    db_client.post("/api/v1/auth/api-keys", json={"name": "tmp"}, headers=headers)
    list_resp = db_client.get("/api/v1/auth/api-keys", headers=headers)
    assert list_resp.status_code == 200
    for k in list_resp.json():
        # Listed keys must not expose the plaintext key value
        assert "key" not in k

def test_list_api_keys_requires_auth(db_client):
    resp = db_client.get("/api/v1/auth/api-keys")
    assert resp.status_code == 401

def test_list_api_keys_returns_active_keys(db_client):
    headers = _auth_header(db_client, "list_keys_ok@example.com")
    db_client.post("/api/v1/auth/api-keys", json={"name": "Key A"}, headers=headers)
    db_client.post("/api/v1/auth/api-keys", json={"name": "Key B"}, headers=headers)
    resp = db_client.get("/api/v1/auth/api-keys", headers=headers)
    assert resp.status_code == 200
    names = [k["name"] for k in resp.json()]
    assert "Key A" in names
    assert "Key B" in names

def test_revoke_api_key(db_client):
    headers = _auth_header(db_client, "revoke_ok@example.com")
    key_id = db_client.post("/api/v1/auth/api-keys", json={"name": "ToRevoke"}, headers=headers).json()["id"]
    assert db_client.delete(f"/api/v1/auth/api-keys/{key_id}", headers=headers).status_code == 204
    ids = [k["id"] for k in db_client.get("/api/v1/auth/api-keys", headers=headers).json()]
    assert key_id not in ids

def test_revoke_nonexistent_key_returns_404(db_client):
    headers = _auth_header(db_client, "revoke404_ok@example.com")
    resp = db_client.delete("/api/v1/auth/api-keys/does-not-exist", headers=headers)
    assert resp.status_code == 404

def test_cannot_revoke_another_users_key(db_client):
    headers_a = _auth_header(db_client, "user_a_isolate@example.com")
    headers_b = _auth_header(db_client, "user_b_isolate@example.com")
    key_id = db_client.post("/api/v1/auth/api-keys", json={"name": "UserAKey"}, headers=headers_a).json()["id"]
    resp = db_client.delete(f"/api/v1/auth/api-keys/{key_id}", headers=headers_b)
    assert resp.status_code == 404

def test_list_api_keys_only_shows_own_keys(db_client):
    headers_a = _auth_header(db_client, "owner_a_isolate@example.com")
    headers_b = _auth_header(db_client, "owner_b_isolate@example.com")
    db_client.post("/api/v1/auth/api-keys", json={"name": "A-Private"}, headers=headers_a)
    keys_b = db_client.get("/api/v1/auth/api-keys", headers=headers_b).json()
    names_b = [k["name"] for k in keys_b]
    assert "A-Private" not in names_b
