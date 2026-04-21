"""GET /api/v1/job/{id} — job status polling."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.core.job_store import get_job

router = APIRouter()


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
