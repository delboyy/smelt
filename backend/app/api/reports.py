"""Shareable cleaning report — public token-based access."""
import secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.core.job_store import get_job, set_job, update_job

router = APIRouter()

@router.post("/jobs/{job_id}/share")
async def create_share_link(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, detail="Job not found")

    token = secrets.token_urlsafe(24)
    expires_at = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    # Store the share token alongside the job
    update_job(job_id, {"share_token": token, "share_expires_at": expires_at})

    # Also store a reverse lookup: token → job_id
    # Use the job store itself with a special key pattern
    set_job(f"share:{token}", {"job_id": job_id, "expires_at": expires_at}, ttl=30 * 86400)

    return JSONResponse(content={"token": token, "expires_at": expires_at})


@router.get("/reports/{token}")
async def get_report(token: str) -> JSONResponse:
    # Look up the share mapping
    share = get_job(f"share:{token}")
    if share is None:
        raise HTTPException(404, detail="Report not found or expired")

    # Check expiry
    try:
        expires = datetime.fromisoformat(share["expires_at"])
        if datetime.now(UTC) > expires:
            raise HTTPException(410, detail="Report link has expired")
    except (KeyError, ValueError):
        pass

    job = get_job(share["job_id"])
    if job is None:
        raise HTTPException(404, detail="Job data no longer available")

    # Return only metadata — never raw data
    stats = job.get("stats", {})
    quality_before = job.get("quality_score_before", {})
    quality_after = job.get("quality_score_after", {})

    return JSONResponse(content={
        "job_id": share["job_id"],
        "filename": job.get("filename", "Unknown"),
        "format": job.get("format", ""),
        "record_count_in": stats.get("records_in") or job.get("record_count") or len(job.get("records", [])),
        "record_count_out": stats.get("records_out"),
        "duplicates_removed": stats.get("duplicates_removed", 0),
        "fields_normalized": stats.get("fields_normalized", 0),
        "nulls_set": stats.get("nulls_set", 0),
        "quality_before": quality_before,
        "quality_after": quality_after,
        "expires_at": share.get("expires_at"),
    })
