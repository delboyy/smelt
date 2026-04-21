"""POST /api/v1/ingest — file upload and raw data ingestion."""

import uuid
import ipaddress
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import httpx

from app.core.detector import detect_encoding, detect_format, detect_issues
from app.core.parser import parse_data
from app.core.planner import infer_schema_rule_based
from app.core.job_store import set_job, add_to_job_index
from app.core.quality_scorer import calculate_data_quality_score
from app.models.schemas import IngestRequest, IngestResponse, FieldSchema, ErrorResponse, ErrorDetail

router = APIRouter()


class UrlIngestRequest(BaseModel):
    url: str


def _is_safe_url(url: str) -> bool:
    """Block SSRF: only http/https, no private IPs."""
    from urllib.parse import urlparse
    import socket
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    host = parsed.hostname or ""
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(host))
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
    except Exception:
        return False
    return True


@router.post("/ingest/url", response_model=IngestResponse)
async def ingest_from_url(request: UrlIngestRequest) -> JSONResponse:
    if not _is_safe_url(request.url):
        raise HTTPException(400, "Invalid or blocked URL")
    MAX_BYTES = 100 * 1024 * 1024  # 100 MB
    try:
        async with httpx.AsyncClient(timeout=30, headers={"User-Agent": "Smelt/1.0 (https://smelt.fyi)"}) as client:
            resp = await client.get(request.url)
            resp.raise_for_status()
            raw_bytes = resp.content
    except httpx.TimeoutException:
        raise HTTPException(408, "URL fetch timed out")
    except Exception as e:
        raise HTTPException(400, "Failed to fetch URL")
    if len(raw_bytes) > MAX_BYTES:
        raise HTTPException(413, "URL content exceeds 100 MB limit")
    encoding = detect_encoding(raw_bytes)
    try:
        content = raw_bytes.decode(encoding, errors="replace")
    except Exception:
        content = raw_bytes.decode("utf-8", errors="replace")
    return await _process_content(content, encoding, request.url.split("/")[-1] or "url_import")


@router.post("/ingest", response_model=IngestResponse)
async def ingest_file(
    file: Optional[UploadFile] = File(None),
) -> JSONResponse:
    """Accept a file upload and parse it."""
    if file is None:
        raise HTTPException(status_code=400, detail="No file provided")

    MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
    raw_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")
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
                    "message": f"Failed to parse {fmt} data. Check that the file is valid and not corrupted.",
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
    quality = calculate_data_quality_score(records, schema_types)

    set_job(job_id, {
        "status": "parsed",
        "format": fmt,
        "encoding": encoding,
        "records": records,
        "schema": schema_types,
        "filename": filename,
        "quality_score_before": quality,
    })

    add_to_job_index(job_id, {
        "filename": filename,
        "format": fmt,
        "record_count": len(records),
        "quality_score_before": quality,
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
            "quality_score": quality,
        }
    )
