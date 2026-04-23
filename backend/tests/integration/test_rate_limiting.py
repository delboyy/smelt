"""Tests for API key rate limiting and user-scoped job history."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.job_store import set_job, _user_index

client = TestClient(app)

CSV = "col1,col2\nfoo,bar\nbaz,qux"


# ── Rate limiting ─────────────────────────────────────────────────────────────

def _make_cleaned_job(job_id: str):
    set_job(job_id, {
        "status": "cleaned",
        "format": "CSV",
        "records": [{"col1": "foo", "col2": "bar"}],
        "cleaned": [{"col1": "foo", "col2": "bar"}],
        "schema": {},
        "filename": "test.csv",
        "spec": {},
        "audit": [],
        "stats": {},
        "quality_score_after": 1.0,
    })


def test_rate_limit_not_triggered_under_100():
    """Under 100 calls, no 429 should be raised."""
    mock_redis = MagicMock()
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True

    _make_cleaned_job("smlt_rl_test1")

    with patch("app.api.clean._get_redis", return_value=mock_redis), \
         patch("app.core.planner.generate_transform_spec") as mock_plan, \
         patch("app.core.executor.execute_transforms") as mock_exec, \
         patch("app.core.auditor.build_audit_summary") as mock_audit, \
         patch("app.core.quality_scorer.calculate_data_quality_score", return_value=0.9):
        from app.models.schemas import TransformSpec, DedupConfig
        mock_plan.return_value = TransformSpec(
            source_format="CSV", record_count=1, sample_size=1,
            transforms=[], dedup=DedupConfig(enabled=False),
        )
        mock_exec.return_value = ([{"col1": "foo"}], [])
        mock_audit.return_value = MagicMock(
            records_in=1, records_out=1, duplicates_removed=0,
            fields_normalized=0, model_dump=lambda: {}
        )

        resp = client.post(
            "/api/v1/clean",
            json={"job_id": "smlt_rl_test1"},
            headers={"Authorization": "Bearer sk_live_testkey123"},
        )
    # Should not be rate limited (count=1)
    assert resp.status_code != 429


def test_rate_limit_triggered_at_101():
    """At count=101, should return 429."""
    mock_redis = MagicMock()
    mock_redis.incr.return_value = 101
    mock_redis.expire.return_value = True

    _make_cleaned_job("smlt_rl_test2")

    with patch("app.api.clean._get_redis", return_value=mock_redis):
        resp = client.post(
            "/api/v1/clean",
            json={"job_id": "smlt_rl_test2"},
            headers={"Authorization": "Bearer sk_live_testkey123"},
        )
    assert resp.status_code == 429


def test_rate_limit_only_applies_to_api_keys():
    """JWT bearer tokens (not sk_live_) should not be rate limited."""
    mock_redis = MagicMock()
    mock_redis.incr.return_value = 999  # Would be over limit

    _make_cleaned_job("smlt_rl_test3")

    with patch("app.api.clean._get_redis", return_value=mock_redis), \
         patch("app.core.planner.generate_transform_spec") as mock_plan, \
         patch("app.core.executor.execute_transforms") as mock_exec, \
         patch("app.core.auditor.build_audit_summary") as mock_audit, \
         patch("app.core.quality_scorer.calculate_data_quality_score", return_value=0.9):
        from app.models.schemas import TransformSpec, DedupConfig
        mock_plan.return_value = TransformSpec(
            source_format="CSV", record_count=1, sample_size=1,
            transforms=[], dedup=DedupConfig(enabled=False),
        )
        mock_exec.return_value = ([{"col1": "foo"}], [])
        mock_audit.return_value = MagicMock(
            records_in=1, records_out=1, duplicates_removed=0,
            fields_normalized=0, model_dump=lambda: {}
        )

        resp = client.post(
            "/api/v1/clean",
            json={"job_id": "smlt_rl_test3"},
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.fake.jwt"},
        )
    # JWT token — rate limit check skipped entirely, should not be 429
    assert resp.status_code != 429


def test_rate_limit_skipped_when_redis_unavailable():
    """If Redis is None, rate limiting is silently skipped (no crash)."""
    _make_cleaned_job("smlt_rl_test4")

    with patch("app.api.clean._get_redis", return_value=None), \
         patch("app.core.planner.generate_transform_spec") as mock_plan, \
         patch("app.core.executor.execute_transforms") as mock_exec, \
         patch("app.core.auditor.build_audit_summary") as mock_audit, \
         patch("app.core.quality_scorer.calculate_data_quality_score", return_value=0.9):
        from app.models.schemas import TransformSpec, DedupConfig
        mock_plan.return_value = TransformSpec(
            source_format="CSV", record_count=1, sample_size=1,
            transforms=[], dedup=DedupConfig(enabled=False),
        )
        mock_exec.return_value = ([{"col1": "foo"}], [])
        mock_audit.return_value = MagicMock(
            records_in=1, records_out=1, duplicates_removed=0,
            fields_normalized=0, model_dump=lambda: {}
        )

        resp = client.post(
            "/api/v1/clean",
            json={"job_id": "smlt_rl_test4"},
            headers={"Authorization": "Bearer sk_live_keyabc"},
        )
    assert resp.status_code != 429


# ── User-scoped job history ───────────────────────────────────────────────────

def test_job_index_scoped_by_user():
    """Jobs ingested by different users should not appear in each other's list."""
    from app.core.job_store import add_to_job_index, get_job_index

    add_to_job_index("smlt_user_a_job", {"filename": "a.csv", "format": "CSV", "record_count": 5, "quality_score_before": 0.8}, user_id="user_a")
    add_to_job_index("smlt_user_b_job", {"filename": "b.csv", "format": "CSV", "record_count": 3, "quality_score_before": 0.9}, user_id="user_b")

    a_jobs, _ = get_job_index(user_id="user_a")
    b_jobs, _ = get_job_index(user_id="user_b")

    a_ids = [j["job_id"] for j in a_jobs]
    b_ids = [j["job_id"] for j in b_jobs]

    assert "smlt_user_a_job" in a_ids
    assert "smlt_user_b_job" not in a_ids
    assert "smlt_user_b_job" in b_ids
    assert "smlt_user_a_job" not in b_ids


def test_job_index_anonymous_returns_global():
    """Jobs with no user_id go to the global index, accessible without user_id."""
    from app.core.job_store import add_to_job_index, get_job_index

    add_to_job_index("smlt_anon_job", {"filename": "anon.csv", "format": "CSV", "record_count": 1, "quality_score_before": 0.5}, user_id=None)
    anon_jobs, _ = get_job_index(user_id=None)
    anon_ids = [j["job_id"] for j in anon_jobs]
    assert "smlt_anon_job" in anon_ids


def test_ingest_stores_job_in_user_scope():
    """Ingesting with a valid JWT should scope job to that user."""
    from app.api.auth import _get_current_user_id
    from app.core.job_store import get_job_index

    with patch("app.api.ingest._get_current_user_id", return_value="scoped_user_x"):
        resp = client.post("/api/v1/ingest/raw", json={"data": CSV})
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]

    jobs, _ = get_job_index(user_id="scoped_user_x")
    job_ids = [j["job_id"] for j in jobs]
    assert job_id in job_ids


def test_nl_instructions_passed_to_planner():
    """instructions field in CleanRequest should be passed to generate_transform_spec."""
    _make_cleaned_job("smlt_nl_test1")

    captured = {}

    async def mock_plan(**kwargs):
        captured.update(kwargs)
        from app.models.schemas import TransformSpec, DedupConfig
        return TransformSpec(
            source_format="CSV", record_count=1, sample_size=1,
            transforms=[], dedup=DedupConfig(enabled=False),
        )

    with patch("app.api.clean.generate_transform_spec", side_effect=mock_plan), \
         patch("app.core.executor.execute_transforms") as mock_exec, \
         patch("app.core.auditor.build_audit_summary") as mock_audit, \
         patch("app.core.quality_scorer.calculate_data_quality_score", return_value=0.9):
        mock_exec.return_value = ([{"col1": "foo"}], [])
        mock_audit.return_value = MagicMock(
            records_in=1, records_out=1, duplicates_removed=0,
            fields_normalized=0, model_dump=lambda: {}
        )
        resp = client.post("/api/v1/clean", json={
            "job_id": "smlt_nl_test1",
            "instructions": "Remove all rows where col1 is empty",
        })
    assert resp.status_code == 200
    assert captured.get("instructions") == "Remove all rows where col1 is empty"
