"""Shared fixtures for integration tests."""
import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("NEXTAUTH_SECRET", "test-secret-for-auth-tests")


@pytest.fixture(scope="module")
def db_client():
    """TestClient that runs the app lifespan (creates DB tables)."""
    from app.main import app
    with TestClient(app) as c:
        yield c
