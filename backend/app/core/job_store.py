"""Redis-backed job store with in-memory fallback."""

import json
import logging
from typing import Any

import redis as redis_lib

from app.config import get_settings

logger = logging.getLogger(__name__)

FREE_TTL = 86_400        # 24 hours
PRO_TTL = 86_400 * 30   # 30 days

_settings = get_settings()
_redis: redis_lib.Redis | None = None
_fallback: dict[str, dict] = {}


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
