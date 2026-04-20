"""POST /api/v1/clean — run the cleaning pipeline."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.api.ingest import get_jobs
from app.core.sampling import stratified_sample
from app.core.planner import generate_transform_spec
from app.core.validator import validate_spec
from app.core.executor import execute_transforms
from app.core.auditor import build_audit_summary
from app.models.schemas import CleanRequest

router = APIRouter()


@router.post("/clean")
async def clean_data(request: CleanRequest) -> JSONResponse:
    """Run the hybrid AI cleaning pipeline on a previously ingested dataset."""
    jobs = get_jobs()
    if request.job_id not in jobs:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {request.job_id} not found"}},
        )

    job = jobs[request.job_id]
    if job["status"] not in ("parsed", "cleaned"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATE", "message": f"Job is in state: {job['status']}"}},
        )

    records = job["records"]
    source_format = job["format"]

    # Phase 1: Stratified sample
    sample = stratified_sample(records, n=100)

    # Phase 2: LLM generates transform spec (or rule-based fallback)
    spec = await generate_transform_spec(
        sample=sample,
        source_format=source_format,
        record_count=len(records),
    )

    # Phase 3: Validate spec against sample
    validation = validate_spec(spec, sample)
    # Warnings are logged but don't block execution

    # Phase 4: Execute deterministically with Polars (LLM NOT called again)
    cleaned, audit_entries = execute_transforms(records, spec)

    # Phase 5: Build audit summary
    stats = build_audit_summary(records, cleaned, audit_entries)

    job["status"] = "cleaned"
    job["cleaned"] = cleaned
    job["spec"] = spec
    job["audit"] = audit_entries

    return JSONResponse(
        content={
            "job_id": request.job_id,
            "status": "cleaned",
            "stats": stats.model_dump(),
            "transform_spec": spec.model_dump(by_alias=True),
            "changes": [e.model_dump() for e in audit_entries[:500]],
            "flagged": [],
            "cleaned_preview": cleaned[:10],
            "validation_warnings": validation.warnings,
        }
    )
