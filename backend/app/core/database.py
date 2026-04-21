"""SQLAlchemy async engine + session factory."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    settings = get_settings()
    url = settings.database_url
    connect_args = {}
    # SQLite needs check_same_thread=False when used with async
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_async_engine(url, echo=False, connect_args=connect_args)


engine = _make_engine()
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create all tables. Called at app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
