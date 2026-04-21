"""POST /api/v1/ingest — file upload and raw data ingestion."""

import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from app.core.detector import detect_encoding, detect_format, detect_issues
from app.core.parser import parse_data
from app.core.planner import infer_schema_rule_based
from app.core.job_store import set_job
from app.models.schemas import IngestRequest, IngestResponse, FieldSchema, ErrorResponse, ErrorDetail

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_file(
    file: Optional[UploadFile] = File(None),
) -> JSONResponse:
    """Accept a file upload and parse it."""
    if file is None:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    encoding = detect_encoding(raw_bytes)
    try:
        content = raw_bytes.decode(encoding, errors="replace")
    except Exception:
        content = raw_bytes.decode("utf-8", errors="replace")

    return await _process_content(content, encoding, file.filename or "upload")


@router.post("/ingest/raw", response_model=IngestResponse)
async def ingest_raw(request: IngestRequest) -> JSONResponse:
    """Accept raw data string."""
    if not request.data:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="INVALID_INPUT",
                    message="No data provided",
                )
            ).model_dump(),
        )
    return await _process_content(request.data, "UTF-8", "paste")


async def _process_content(content: str, encoding: str, filename: str) -> JSONResponse:
    fmt = detect_format(content)

    if fmt == "TXT":
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_FORMAT",
                    "message": "Could not detect a valid data format. Supported: CSV, JSON, XML, TSV.",
                    "details": {"detected": "TXT"},
                }
            },
        )

    try:
        records = parse_data(content, fmt)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "PARSE_ERROR",
                    "message": f"Failed to parse {fmt} data: {str(e)}",
                    "details": {"format": fmt},
                }
            },
        )

    if not records:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EMPTY_DATA", "message": "File contains no records"}},
        )

    schema_types = infer_schema_rule_based(records)
    schema_map = {
        field: FieldSchema(
            detected_type=ftype,
            confidence=0.85,
            nullable=True,
            sample_values=[str(r.get(field, "")) for r in records[:3] if r.get(field)],
        )
        for field, ftype in schema_types.items()
    }

    issues = detect_issues(records)
    job_id = f"smlt_{uuid.uuid4().hex[:8]}"

    set_job(job_id, {
        "status": "parsed",
        "format": fmt,
        "encoding": encoding,
        "records": records,
        "schema": schema_types,
        "filename": filename,
    })

    return JSONResponse(
        content={
            "job_id": job_id,
            "status": "parsed",
            "format": fmt,
            "encoding": encoding,
            "record_count": len(records),
            "field_count": len(records[0]) if records else 0,
            "schema": {k: v.model_dump() for k, v in schema_map.items()},
            "preview": records[:10],
            "issues_detected": issues,
        }
    )
