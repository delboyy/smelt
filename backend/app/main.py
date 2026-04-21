"""Smelt FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import ingest, clean, export, jobs
from app.api import auth as auth_api
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Smelt API",
    description="Raw data in. Pure data out.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

settings = get_settings()

_default_origins = ["http://localhost:3000", "http://localhost:3002"]
_allowed_origins = (
    [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if settings.cors_origins
    else [settings.frontend_url, *_default_origins]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Routes
app.include_router(ingest.router, prefix="/api/v1", tags=["ingest"])
app.include_router(clean.router, prefix="/api/v1", tags=["clean"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
app.include_router(auth_api.router, prefix="/api/v1", tags=["auth"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "smelt-api"}
