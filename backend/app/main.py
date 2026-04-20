"""Smelt FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import ingest, clean, export, jobs

app = FastAPI(
    title="Smelt API",
    description="Raw data in. Pure data out.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(ingest.router, prefix="/api/v1", tags=["ingest"])
app.include_router(clean.router, prefix="/api/v1", tags=["clean"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "smelt-api"}
