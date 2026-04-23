"""Export-to-integration endpoints: Airtable and Notion."""

import asyncio
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.api.auth import _get_current_user_id
from app.core.job_store import get_job

router = APIRouter()


class AirtableExportRequest(BaseModel):
    job_id: str
    personal_access_token: str
    base_id: str
    table_name: str = "Cleaned Data"


class NotionExportRequest(BaseModel):
    job_id: str
    integration_token: str
    parent_page_id: str
    database_title: str = "Cleaned Data"


def _get_records(job_id: str) -> list[dict]:
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.get("status") != "cleaned":
        raise HTTPException(400, f"Job is not in cleaned state (current: {job.get('status')})")
    records = job.get("cleaned") or []
    if not records:
        raise HTTPException(400, "No cleaned records found in this job")
    return records


@router.post("/export/airtable")
async def export_to_airtable(
    body: AirtableExportRequest,
    authorization: str | None = Header(default=None),
):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    records = _get_records(body.job_id)
    headers = {
        "Authorization": f"Bearer {body.personal_access_token}",
        "Content-Type": "application/json",
    }
    fields = list(records[0].keys())
    airtable_fields = [{"name": f, "type": "singleLineText"} for f in fields]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            create_resp = await client.post(
                f"https://api.airtable.com/v0/meta/bases/{body.base_id}/tables",
                headers=headers,
                json={"name": body.table_name, "fields": airtable_fields},
            )
            if create_resp.status_code == 401:
                raise HTTPException(401, "Invalid Airtable token")
            if create_resp.status_code == 422:
                err = create_resp.json()
                raise HTTPException(400, err.get("error", {}).get("message", "Airtable validation error"))
            # 409/200 means table already exists — proceed anyway

            pushed = 0
            batch_size = 10
            for i in range(0, len(records), batch_size):
                batch = records[i : i + batch_size]
                insert_resp = await client.post(
                    f"https://api.airtable.com/v0/{body.base_id}/{body.table_name}",
                    headers=headers,
                    json={"records": [{"fields": r} for r in batch]},
                )
                if insert_resp.status_code == 401:
                    raise HTTPException(401, "Invalid Airtable token")
                if insert_resp.status_code == 422:
                    err = insert_resp.json()
                    raise HTTPException(400, err.get("error", {}).get("message", "Airtable validation error"))
                insert_resp.raise_for_status()
                pushed += len(batch)
                await asyncio.sleep(0.2)

    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(503, f"Network error reaching Airtable: {e}")

    return {"records_pushed": pushed, "table": body.table_name, "base_id": body.base_id}


@router.post("/export/notion")
async def export_to_notion(
    body: NotionExportRequest,
    authorization: str | None = Header(default=None),
):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    records = _get_records(body.job_id)
    truncated = len(records) > 100
    records = records[:100]

    fields = list(records[0].keys())
    headers = {
        "Authorization": f"Bearer {body.integration_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }

    properties_schema = {}
    for i, f in enumerate(fields):
        properties_schema[f] = {"title": {}} if i == 0 else {"rich_text": {}}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            db_resp = await client.post(
                "https://api.notion.com/v1/databases",
                headers=headers,
                json={
                    "parent": {"type": "page_id", "page_id": body.parent_page_id},
                    "title": [{"type": "text", "text": {"content": body.database_title}}],
                    "properties": properties_schema,
                },
            )
            if db_resp.status_code == 401:
                raise HTTPException(401, "Invalid Notion integration token")
            if db_resp.status_code == 400:
                err = db_resp.json()
                raise HTTPException(400, err.get("message", "Notion validation error"))
            db_resp.raise_for_status()
            database_id = db_resp.json()["id"]

            pushed = 0
            for record in records:
                page_properties = {}
                for i, (k, v) in enumerate(record.items()):
                    text_content = str(v) if v is not None else ""
                    if i == 0:
                        page_properties[k] = {"title": [{"type": "text", "text": {"content": text_content}}]}
                    else:
                        page_properties[k] = {"rich_text": [{"type": "text", "text": {"content": text_content}}]}

                page_resp = await client.post(
                    "https://api.notion.com/v1/pages",
                    headers=headers,
                    json={
                        "parent": {"database_id": database_id},
                        "properties": page_properties,
                    },
                )
                if page_resp.status_code == 401:
                    raise HTTPException(401, "Invalid Notion integration token")
                page_resp.raise_for_status()
                pushed += 1
                await asyncio.sleep(0.34)

    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(503, f"Network error reaching Notion: {e}")

    return {"records_pushed": pushed, "database_id": database_id, "truncated": truncated}
