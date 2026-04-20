"""GET /api/v1/job/{id} — job status polling."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.api.ingest import get_jobs

router = APIRouter()


@router.get("/job/{job_id}")
async def get_job_status(job_id: str) -> JSONResponse:
    """Get the status of a cleaning or export job."""
    jobs = get_jobs()
    if job_id not in jobs:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found"}},
        )
    job = jobs[job_id]
    return JSONResponse(
        content={
            "job_id": job_id,
            "status": job["status"],
            "progress": 100 if job["status"] in ("cleaned", "complete") else 50,
            "record_count": len(job.get("records", [])),
            "format": job.get("format"),
        }
    )
