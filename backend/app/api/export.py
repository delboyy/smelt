"""POST /api/v1/export — export cleaned data."""

import csv
import json
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from app.api.ingest import get_jobs
from app.models.schemas import ExportRequest

router = APIRouter()


@router.post("/export")
async def export_data(request: ExportRequest) -> StreamingResponse | JSONResponse:
    """Export cleaned data in the requested format."""
    jobs = get_jobs()
    if request.job_id not in jobs:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {request.job_id} not found"}},
        )

    job = jobs[request.job_id]
    records = job.get("cleaned") or job.get("records", [])

    if not records:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NO_DATA", "message": "No cleaned data available"}},
        )

    fmt = (request.format or "csv").lower()

    if fmt == "json":
        content = json.dumps(records, indent=2, default=str)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=smelted_data.json"},
        )

    if fmt == "xml":
        content = _to_xml(records)
        return StreamingResponse(
            iter([content]),
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=smelted_data.xml"},
        )

    # Default: CSV
    output = io.StringIO()
    if records:
        writer = csv.DictWriter(output, fieldnames=list(records[0].keys()), extrasaction="ignore")
        writer.writeheader()
        writer.writerows({k: ("" if v is None else str(v)) for k, v in row.items()} for row in records)
    content = output.getvalue()

    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smelted_data.csv"},
    )


def _to_xml(records: list[dict]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<records>"]
    for r in records:
        lines.append("  <record>")
        for k, v in r.items():
            tag = k.replace(" ", "_").lower()
            val = "" if v is None else str(v)
            lines.append(f"    <{tag}>{val}</{tag}>")
        lines.append("  </record>")
    lines.append("</records>")
    return "\n".join(lines)
