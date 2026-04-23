"""Shared fixtures for integration tests."""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

os.environ["NEXTAUTH_SECRET"] = "test-secret-for-auth-tests"


@pytest.fixture(scope="module")
def db_client():
    """TestClient with a fresh per-module SQLite DB so registrations never collide."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    # Patch the engine BEFORE the app starts its lifespan (init_db)
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    import app.core.database as _db

    new_engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    new_session = async_sessionmaker(new_engine, class_=AsyncSession, expire_on_commit=False)

    original_engine = _db.engine
    original_session = _db.AsyncSessionLocal

    _db.engine = new_engine
    _db.AsyncSessionLocal = new_session

    from app.main import app
    with TestClient(app) as c:
        yield c

    _db.engine = original_engine
    _db.AsyncSessionLocal = original_session

    try:
        os.unlink(db_path)
    except OSError:
        pass
