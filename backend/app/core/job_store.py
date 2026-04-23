"""Redis-backed job store with in-memory fallback."""

import json
import logging
from datetime import datetime, UTC
from typing import Any

import redis as redis_lib

from app.config import get_settings

logger = logging.getLogger(__name__)

FREE_TTL = 86_400        # 24 hours
PRO_TTL = 86_400 * 30   # 30 days

_settings = get_settings()
_redis: redis_lib.Redis | None = None
_fallback: dict[str, dict] = {}
_user_index: dict[str, list] = {}


def _get_redis() -> redis_lib.Redis | None:
    global _redis
    if _redis is not None:
        return _redis
    try:
        client = redis_lib.from_url(_settings.redis_url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        _redis = client
        logger.info("Redis connected at %s", _settings.redis_url)
    except Exception as e:
        logger.warning("Redis unavailable (%s) — falling back to in-memory store", e)
        _redis = None
    return _redis


def _key(job_id: str) -> str:
    return f"smelt:job:{job_id}"


def set_job(job_id: str, data: dict[str, Any], ttl: int = FREE_TTL) -> None:
    client = _get_redis()
    if client:
        try:
            client.setex(_key(job_id), ttl, json.dumps(data, default=str))
            return
        except redis_lib.RedisError as e:
            logger.warning("Redis write failed: %s", e)
    _fallback[job_id] = data


def get_job(job_id: str) -> dict[str, Any] | None:
    client = _get_redis()
    if client:
        try:
            raw = client.get(_key(job_id))
            return json.loads(raw) if raw else None
        except redis_lib.RedisError as e:
            logger.warning("Redis read failed: %s", e)
    return _fallback.get(job_id)


def update_job(job_id: str, updates: dict[str, Any], ttl: int = FREE_TTL) -> None:
    job = get_job(job_id)
    if job is None:
        return
    job.update(updates)
    set_job(job_id, job, ttl)


def add_to_job_index(job_id: str, meta: dict, user_id: str | None = None) -> None:
    """Track job in the global job index (last 200 jobs) and optionally a per-user index."""
    entry = json.dumps({"job_id": job_id, "created_at": datetime.now(UTC).isoformat(), **meta})
    client = _get_redis()
    if client:
        try:
            client.lpush("smelt:job_index", entry)
            client.ltrim("smelt:job_index", 0, 199)
            if user_id:
                client.lpush(f"smelt:job_index:{user_id}", entry)
                client.ltrim(f"smelt:job_index:{user_id}", 0, 199)
        except Exception:
            pass
    if not hasattr(add_to_job_index, "_index"):
        add_to_job_index._index = []
    parsed = json.loads(entry)
    add_to_job_index._index.insert(0, parsed)
    add_to_job_index._index = add_to_job_index._index[:200]
    if user_id:
        if user_id not in _user_index:
            _user_index[user_id] = []
        _user_index[user_id].insert(0, parsed)
        _user_index[user_id] = _user_index[user_id][:200]


def get_job_index(page: int = 1, limit: int = 20, user_id: str | None = None) -> tuple[list[dict], int]:
    """Get paginated job index, optionally scoped to a user."""
    items = []
    client = _get_redis()
    if user_id:
        if client:
            try:
                raw = client.lrange(f"smelt:job_index:{user_id}", 0, 199)
                items = [json.loads(r) for r in raw]
            except Exception:
                pass
        if not items:
            items = _user_index.get(user_id, [])
    else:
        if client:
            try:
                raw = client.lrange("smelt:job_index", 0, 199)
                items = [json.loads(r) for r in raw]
            except Exception:
                pass
        if not items and hasattr(add_to_job_index, "_index"):
            items = add_to_job_index._index
    total = len(items)
    start = (page - 1) * limit
    return items[start:start + limit], total
