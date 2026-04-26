"""POST /api/v1/clean — run the cleaning pipeline."""

import asyncio
import hashlib
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse

from app.core.job_store import get_job, update_job, _get_redis
from app.core.sampling import stratified_sample
from app.core.planner import generate_transform_spec
from app.core.validator import validate_spec
from app.core.executor import execute_transforms
from app.core.auditor import build_audit_summary
from app.core.quality_scorer import calculate_data_quality_score
from app.core.notifications import notify_slack
from app.api.integrations import _slack_tokens
from app.api.auth import _get_current_user_id
from app.models.schemas import CleanRequest

router = APIRouter()


@router.post("/clean")
async def clean_data(request: CleanRequest, authorization: str | None = Header(default=None)) -> JSONResponse:
    """Run the hybrid AI cleaning pipeline on a previously ingested dataset."""
    job = get_job(request.job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {request.job_id} not found"}},
        )

    if job["status"] not in ("parsed", "cleaned"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATE", "message": f"Job is in state: {job['status']}"}},
        )

    user_id = _get_current_user_id(authorization)

    if authorization and authorization.startswith("Bearer sk_live_"):
        key_hash = hashlib.sha256(authorization[7:].encode()).hexdigest()
        redis = _get_redis()
        if redis:
            try:
                rate_key = f"smelt:rate:{key_hash}"
                count = redis.incr(rate_key)
                if count == 1:
                    redis.expire(rate_key, 60)
                if count > 100:
                    raise HTTPException(429, "Rate limit exceeded: 100 requests/minute")
            except HTTPException:
                raise
            except Exception:
                pass

    records = job["records"]
    source_format = job["format"]

    # Free-tier row cap
    if user_id:
        from sqlalchemy import select as _select
        from app.models.user import User
        import app.core.database as _db_mod
        async with _db_mod.AsyncSessionLocal() as _db:
            _result = await _db.execute(_select(User).where(User.id == user_id))
            _user = _result.scalar_one_or_none()
            if _user and _user.tier == "free" and len(records) > 500:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": {
                            "code": "ROW_LIMIT_EXCEEDED",
                            "message": f"Free plan is limited to 500 rows. This job has {len(records)} rows. Upgrade to Pro for unlimited rows.",
                            "limit": 500,
                            "count": len(records),
                        }
                    },
                )

    # Phase 1: Stratified sample
    sample = stratified_sample(records, n=100)

    # Phase 2: LLM generates transform spec (or rule-based fallback)
    spec = await generate_transform_spec(
        sample=sample,
        source_format=source_format,
        record_count=len(records),
        instructions=request.instructions,
    )

    # Phase 3: Validate spec against sample
    validation = validate_spec(spec, sample)

    # Phase 4: Execute deterministically with Polars (LLM NOT called again)
    cleaned, audit_entries = execute_transforms(records, spec)

    # Phase 5: Build audit summary
    stats = build_audit_summary(records, cleaned, audit_entries)

    # Quality score after cleaning
    schema = job.get("schema", {})
    quality = calculate_data_quality_score(cleaned, schema)

    stats_dict = stats.model_dump()
    update_job(request.job_id, {
        "status": "cleaned",
        "cleaned": cleaned,
        "spec": spec.model_dump(mode="json", by_alias=True),
        "audit": [e.model_dump(mode="json") for e in audit_entries],
        "quality_score_after": quality,
        "stats": stats_dict,
    })

    # Fire Slack notification if connected (best-effort)
    try:
        if user_id and user_id in _slack_tokens:
            slack_info = _slack_tokens[user_id]
            asyncio.create_task(notify_slack(
                token=slack_info["token"],
                channel=slack_info.get("channel_id", "general"),
                filename=job.get("filename", "data"),
                records_in=stats.records_in,
                records_out=stats.records_out,
                duplicates_removed=stats.duplicates_removed,
                fields_normalized=stats.fields_normalized,
                job_id=request.job_id,
                quality_before=job.get("quality_score_before"),
                quality_after=quality,
            ))
    except Exception:
        pass

    return JSONResponse(
        content={
            "job_id": request.job_id,
            "status": "cleaned",
            "stats": stats.model_dump(),
            "transform_spec": spec.model_dump(mode="json", by_alias=True),
            "changes": [e.model_dump(mode="json") for e in audit_entries[:500]],
            "flagged": [],
            "cleaned_preview": cleaned[:10],
            "validation_warnings": validation.warnings,
            "quality_score": quality,
        }
    )
