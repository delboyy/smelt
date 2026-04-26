"""Integration tests for the Recipes API."""
import os
import pytest
from unittest.mock import patch

os.environ.setdefault("NEXTAUTH_SECRET", "test-secret-for-auth-tests")

_MINIMAL_SPEC = {
    "source_format": "CSV",
    "record_count": 2,
    "sample_size": 2,
    "transforms": [],
    "dedup": {"enabled": False},
}

_SAMPLE_CSV = "name,email\nAlice,alice@example.com\nBob,bob@example.com\n"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register_login(client, suffix: str) -> str:
    email = f"recipe_{suffix}@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "Pass123!", "name": "Test"})
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Pass123!"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_cleaned_job(client, token: str, spec: dict | None = None) -> str:
    """Ingest CSV, then inject a cleaned job directly into the job store."""
    from app.core.job_store import set_job
    import uuid
    job_id = str(uuid.uuid4())
    set_job(job_id, {
        "status": "cleaned",
        "format": "CSV",
        "records": [{"name": "Alice", "email": "alice@example.com"}, {"name": "Bob", "email": "bob@example.com"}],
        "cleaned": [{"name": "Alice", "email": "alice@example.com"}, {"name": "Bob", "email": "bob@example.com"}],
        "spec": spec or _MINIMAL_SPEC,
        "schema": {},
        "filename": "test.csv",
    })
    return job_id


def _create_parsed_job(client, token: str) -> str:
    """Create a job in 'parsed' state for apply tests."""
    from app.core.job_store import set_job
    import uuid
    job_id = str(uuid.uuid4())
    set_job(job_id, {
        "status": "parsed",
        "format": "CSV",
        "records": [{"name": "  Charlie  ", "email": "CHARLIE@EXAMPLE.COM"}],
        "schema": {},
        "filename": "new.csv",
    })
    return job_id


def _save_recipe(client, token: str, job_id: str, name: str = "My Recipe") -> dict:
    resp = client.post(
        "/api/v1/recipes",
        json={"job_id": job_id, "name": name, "description": "A test recipe"},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_list_recipes_requires_auth(db_client):
    resp = db_client.get("/api/v1/recipes")
    assert resp.status_code == 401


def test_list_recipes_empty_for_new_user(db_client):
    token = _register_login(db_client, "list_empty")
    resp = db_client.get("/api/v1/recipes", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["recipes"] == []
    assert data["total"] == 0


def test_save_recipe_requires_auth(db_client):
    resp = db_client.post("/api/v1/recipes", json={"job_id": "x", "name": "x"})
    assert resp.status_code == 401


def test_save_recipe_requires_cleaned_job(db_client):
    token = _register_login(db_client, "save_uncleaned")
    from app.core.job_store import set_job
    import uuid
    job_id = str(uuid.uuid4())
    set_job(job_id, {"status": "parsed", "format": "CSV", "records": [], "schema": {}})
    resp = db_client.post(
        "/api/v1/recipes",
        json={"job_id": job_id, "name": "Should Fail"},
        headers=_auth(token),
    )
    assert resp.status_code == 400


def test_save_recipe_success(db_client):
    token = _register_login(db_client, "save_ok")
    job_id = _create_cleaned_job(db_client, token)
    resp = db_client.post(
        "/api/v1/recipes",
        json={"job_id": job_id, "name": "Sales Cleaner", "description": "Cleans sales CSV"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Sales Cleaner"
    assert data["description"] == "Cleans sales CSV"
    assert data["source_format"] == "CSV"
    assert "id" in data
    assert "created_at" in data


def test_get_recipe_by_id(db_client):
    token = _register_login(db_client, "get_by_id")
    job_id = _create_cleaned_job(db_client, token)
    recipe = _save_recipe(db_client, token, job_id, name="Get By ID")

    resp = db_client.get(f"/api/v1/recipes/{recipe['id']}", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == recipe["id"]
    assert data["name"] == "Get By ID"
    assert "spec_json" in data
    import json
    spec = json.loads(data["spec_json"])
    assert "transforms" in spec


def test_get_recipe_not_found_or_wrong_user(db_client):
    token_a = _register_login(db_client, "recipe_owner_a")
    token_b = _register_login(db_client, "recipe_owner_b")

    job_id = _create_cleaned_job(db_client, token_a)
    recipe = _save_recipe(db_client, token_a, job_id)

    # Wrong user gets 404
    resp = db_client.get(f"/api/v1/recipes/{recipe['id']}", headers=_auth(token_b))
    assert resp.status_code == 404

    # Non-existent ID
    resp2 = db_client.get("/api/v1/recipes/does-not-exist", headers=_auth(token_a))
    assert resp2.status_code == 404


def test_delete_recipe(db_client):
    token = _register_login(db_client, "delete_recipe")
    job_id = _create_cleaned_job(db_client, token)
    recipe = _save_recipe(db_client, token, job_id)

    resp = db_client.delete(f"/api/v1/recipes/{recipe['id']}", headers=_auth(token))
    assert resp.status_code == 204

    # Should be gone now
    resp2 = db_client.get(f"/api/v1/recipes/{recipe['id']}", headers=_auth(token))
    assert resp2.status_code == 404

    # List should be empty
    resp3 = db_client.get("/api/v1/recipes", headers=_auth(token))
    assert resp3.json()["total"] == 0


def test_apply_recipe_to_new_job(db_client):
    token = _register_login(db_client, "apply_recipe")
    job_id = _create_cleaned_job(db_client, token)
    recipe = _save_recipe(db_client, token, job_id)

    new_job_id = _create_parsed_job(db_client, token)
    resp = db_client.post(
        f"/api/v1/recipes/{recipe['id']}/apply",
        json={"job_id": new_job_id},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cleaned"
    assert data["job_id"] == new_job_id
    assert "stats" in data
    assert "cleaned_preview" in data
    assert isinstance(data["validation_warnings"], list)


def test_apply_recipe_job_not_found(db_client):
    token = _register_login(db_client, "apply_no_job")
    job_id = _create_cleaned_job(db_client, token)
    recipe = _save_recipe(db_client, token, job_id)

    resp = db_client.post(
        f"/api/v1/recipes/{recipe['id']}/apply",
        json={"job_id": "nonexistent-job-id"},
        headers=_auth(token),
    )
    assert resp.status_code == 404


def test_list_recipes_shows_saved_recipes(db_client):
    token = _register_login(db_client, "list_multi")
    job1 = _create_cleaned_job(db_client, token)
    job2 = _create_cleaned_job(db_client, token)
    _save_recipe(db_client, token, job1, name="Recipe Alpha")
    _save_recipe(db_client, token, job2, name="Recipe Beta")

    resp = db_client.get("/api/v1/recipes", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    names = [r["name"] for r in data["recipes"]]
    assert "Recipe Alpha" in names
    assert "Recipe Beta" in names
