"""GET /api/v1/job/{id} — job status polling. GET /api/v1/jobs — job history."""

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
from app.core.job_store import get_job, get_job_index
from app.api.auth import _get_current_user_id

router = APIRouter()


@router.get("/jobs")
async def list_jobs(page: int = 1, limit: int = 20, authorization: str | None = Header(default=None)):
    """List recent jobs (paginated)."""
    user_id = _get_current_user_id(authorization)
    jobs, total = get_job_index(page=page, limit=min(limit, 50), user_id=user_id)
    return {"jobs": jobs, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/job/{job_id}")
async def get_job_status(job_id: str) -> JSONResponse:
    """Get the status of a cleaning or export job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found"}},
        )
    return JSONResponse(
        content={
            "job_id": job_id,
            "status": job["status"],
            "progress": 100 if job["status"] in ("cleaned", "complete") else 50,
            "record_count": len(job.get("records", [])),
            "format": job.get("format"),
        }
    )
