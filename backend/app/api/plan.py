"""POST /api/v1/preview-plan — generate cleaning suggestions without executing."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.job_store import get_job
from app.core.planner import infer_schema_rule_based
from app.core.sampling import stratified_sample

router = APIRouter()

class PlanRequest(BaseModel):
    job_id: str

@router.post("/preview-plan")
async def preview_plan(request: PlanRequest) -> JSONResponse:
    job = get_job(request.job_id)
    if job is None:
        raise HTTPException(404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job {request.job_id} not found"}})

    records = job.get("records", [])
    schema = job.get("schema", {})

    if not records:
        raise HTTPException(400, detail={"error": {"code": "NO_DATA", "message": "No records in job"}})

    # Use rule-based schema if not already inferred
    if not schema:
        schema = infer_schema_rule_based(records)

    # Build suggestions from schema
    suggestions = _build_suggestions(records, schema)

    return JSONResponse(content={"job_id": request.job_id, "suggestions": suggestions, "total": len(suggestions)})


def _build_suggestions(records: list[dict], schema: dict) -> list[dict]:
    """Build a list of suggested cleaning actions with affected row counts."""
    suggestions = []

    if not records:
        return suggestions

    # Check for duplicates
    fingerprints = set()
    dupe_count = 0
    for r in records:
        fp = "|".join(str(r.get(f, "")).lower().strip() for f in records[0].keys())
        if fp in fingerprints:
            dupe_count += 1
        else:
            fingerprints.add(fp)
    if dupe_count > 0:
        suggestions.append({
            "id": "remove_duplicates",
            "action": "remove_duplicates",
            "label": "Remove duplicate rows",
            "description": f"{dupe_count} exact duplicate row{'s' if dupe_count != 1 else ''} detected",
            "affected_rows": dupe_count,
            "enabled": True,
            "category": "dedup",
        })

    # Check for empty values
    import re
    empty_pattern = re.compile(r"^(n/?a|null|none|nan|-|\s*)$", re.IGNORECASE)

    for field, ftype in schema.items():
        values = [r.get(field) for r in records]
        non_empty = [v for v in values if v is not None and str(v).strip()]
        empty_count = len(values) - len(non_empty)

        if not non_empty:
            continue

        # Null/empty handling
        null_count = sum(1 for v in values if v is None or empty_pattern.match(str(v).strip()))
        if null_count > 0:
            suggestions.append({
                "id": f"nullify_{field}",
                "action": "set_null",
                "field": field,
                "label": f"Standardize empty values in '{field}'",
                "description": f"{null_count} cell{'s' if null_count != 1 else ''} with N/A, null, or blank — normalize to empty",
                "affected_rows": null_count,
                "enabled": True,
                "category": "nullify",
            })

        # Whitespace trimming
        needs_trim = sum(1 for v in non_empty if isinstance(v, str) and (v != v.strip() or "  " in v))
        if needs_trim > 0:
            suggestions.append({
                "id": f"trim_{field}",
                "action": "trim",
                "field": field,
                "label": f"Trim whitespace in '{field}'",
                "description": f"{needs_trim} value{'s' if needs_trim != 1 else ''} with leading/trailing or double spaces",
                "affected_rows": needs_trim,
                "enabled": True,
                "category": "normalize",
            })

        # Type-specific normalizations
        if ftype == "email":
            mixed_case = sum(1 for v in non_empty if isinstance(v, str) and v != v.lower())
            if mixed_case > 0:
                suggestions.append({
                    "id": f"lowercase_{field}",
                    "action": "lowercase",
                    "field": field,
                    "label": f"Lowercase email addresses in '{field}'",
                    "description": f"{mixed_case} email{'s' if mixed_case != 1 else ''} with uppercase letters",
                    "affected_rows": mixed_case,
                    "enabled": True,
                    "category": "normalize",
                })

        elif ftype == "name":
            needs_title = sum(1 for v in non_empty if isinstance(v, str) and v != v.title() and v == v.lower())
            if needs_title > 0:
                suggestions.append({
                    "id": f"titlecase_{field}",
                    "action": "title_case",
                    "field": field,
                    "label": f"Title-case names in '{field}'",
                    "description": f"{needs_title} name{'s' if needs_title != 1 else ''} in lowercase — convert to Title Case",
                    "affected_rows": needs_title,
                    "enabled": True,
                    "category": "normalize",
                })

        elif ftype == "date":
            import re as _re
            inconsistent = sum(1 for v in non_empty
                               if isinstance(v, str) and not _re.match(r"\d{4}-\d{2}-\d{2}", str(v)))
            if inconsistent > 0:
                suggestions.append({
                    "id": f"normalize_date_{field}",
                    "action": "normalize_date",
                    "field": field,
                    "label": f"Standardize dates in '{field}' to ISO 8601",
                    "description": f"{inconsistent} date{'s' if inconsistent != 1 else ''} not in YYYY-MM-DD format",
                    "affected_rows": inconsistent,
                    "enabled": True,
                    "category": "normalize",
                })

        elif ftype == "phone":
            suggestions.append({
                "id": f"format_phone_{field}",
                "action": "format_phone",
                "field": field,
                "label": f"Standardize phone numbers in '{field}'",
                "description": f"Normalize to (###) ###-#### format",
                "affected_rows": len(non_empty),
                "enabled": True,
                "category": "normalize",
            })

        elif ftype in ("currency", "number"):
            needs_parse = sum(1 for v in non_empty
                              if isinstance(v, str) and not re.match(r"^-?\d+\.?\d*$", str(v).strip()))
            if needs_parse > 0:
                suggestions.append({
                    "id": f"parse_number_{field}",
                    "action": "parse_float",
                    "field": field,
                    "label": f"Parse numeric values in '{field}'",
                    "description": f"{needs_parse} value{'s' if needs_parse != 1 else ''} with currency symbols or text — extract number",
                    "affected_rows": needs_parse,
                    "enabled": True,
                    "category": "normalize",
                })

    return suggestions
