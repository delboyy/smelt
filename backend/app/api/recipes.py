"""Recipes API — save, list, retrieve, delete, and apply transform recipes."""

import json
from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.job_store import get_job, update_job
from app.core.executor import execute_transforms
from app.core.auditor import build_audit_summary
from app.core.quality_scorer import calculate_data_quality_score
from app.api.auth import _get_current_user_id
from app.models.recipe import Recipe
from app.models.schemas import TransformSpec

router = APIRouter()


class SaveRecipeRequest(BaseModel):
    job_id: str
    name: str
    description: str = ""


class ApplyRecipeRequest(BaseModel):
    job_id: str


def _recipe_summary(r: Recipe) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "source_format": r.source_format,
        "field_count": r.field_count,
        "created_at": r.created_at.isoformat(),
    }


@router.post("/recipes")
async def save_recipe(
    body: SaveRecipeRequest,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Save a cleaned job's TransformSpec as a named recipe."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    job = get_job(body.job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    if job.get("status") != "cleaned":
        raise HTTPException(400, "Job must have status 'cleaned' to save as recipe")
    spec_dict = job.get("spec")
    if not spec_dict:
        raise HTTPException(400, "Job has no transform spec")

    source_format = spec_dict.get("source_format") or job.get("format", "")
    transforms = spec_dict.get("transforms", [])
    field_count = len(transforms)

    recipe = Recipe(
        user_id=user_id,
        name=body.name,
        description=body.description,
        source_format=source_format,
        field_count=field_count,
        spec_json=json.dumps(spec_dict),
    )
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)

    return JSONResponse(content=_recipe_summary(recipe), status_code=201)


@router.get("/recipes")
async def list_recipes(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List all recipes for the authenticated user, newest first."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    result = await db.execute(
        select(Recipe)
        .where(Recipe.user_id == user_id)
        .order_by(Recipe.created_at.desc())
    )
    recipes = result.scalars().all()
    return {"recipes": [_recipe_summary(r) for r in recipes], "total": len(recipes)}


@router.get("/recipes/{recipe_id}")
async def get_recipe(
    recipe_id: str,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get a single recipe including its full spec_json."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    recipe = await db.scalar(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == user_id)
    )
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    data = _recipe_summary(recipe)
    data["spec_json"] = recipe.spec_json
    return data


@router.delete("/recipes/{recipe_id}", status_code=204)
async def delete_recipe(
    recipe_id: str,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Delete a recipe owned by the authenticated user."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    recipe = await db.scalar(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == user_id)
    )
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    await db.delete(recipe)
    await db.commit()
    return Response(status_code=204)


@router.post("/recipes/{recipe_id}/apply")
async def apply_recipe(
    recipe_id: str,
    body: ApplyRecipeRequest,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Apply a saved recipe to an existing job, skipping the LLM entirely."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    recipe = await db.scalar(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == user_id)
    )
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    job = get_job(body.job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    if job.get("status") not in ("parsed", "cleaned"):
        raise HTTPException(400, f"Job must be in state 'parsed' or 'cleaned', got: {job.get('status')}")

    spec_dict = json.loads(recipe.spec_json)
    spec = TransformSpec.model_validate(spec_dict)

    records = job["records"]
    cleaned, audit_entries = execute_transforms(records, spec)
    stats = build_audit_summary(records, cleaned, audit_entries)

    schema = job.get("schema", {})
    quality = calculate_data_quality_score(cleaned, schema)

    stats_dict = stats.model_dump()
    update_job(body.job_id, {
        "status": "cleaned",
        "cleaned": cleaned,
        "spec": spec.model_dump(mode="json", by_alias=True),
        "audit": [e.model_dump(mode="json") for e in audit_entries],
        "quality_score_after": quality,
        "stats": stats_dict,
    })

    return JSONResponse(content={
        "job_id": body.job_id,
        "status": "cleaned",
        "stats": stats_dict,
        "changes": [e.model_dump(mode="json") for e in audit_entries[:500]],
        "cleaned_preview": cleaned[:10],
        "validation_warnings": [],
        "quality_score": quality,
    })
