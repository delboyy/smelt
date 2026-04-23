"""Tests for new executor actions: merge_columns, rename_column, filter_rows, split_column."""
import pytest
import polars as pl
from app.core.executor import execute_transforms, _apply_action
from app.models.schemas import TransformSpec, TransformAction, DedupConfig, FieldSchema


def _spec(*actions_list, dedup=False) -> TransformSpec:
    transforms = []
    for field, actions, params in actions_list:
        transforms.append(TransformAction(field=field, actions=actions, priority=1, params=params))
    return TransformSpec(
        source_format="CSV",
        record_count=3,
        sample_size=3,
        transforms=transforms,
        dedup=DedupConfig(enabled=dedup),
    )


# ── merge_columns ─────────────────────────────────────────────────────────────

def test_merge_columns_basic():
    records = [{"first": "John", "last": "Doe"}, {"first": "Jane", "last": "Smith"}]
    spec = _spec(("full_name", ["merge_columns"], {"fields": ["first", "last"], "separator": " "}))
    # merge_columns writes into the target field — add it first
    import polars as pl
    df = pl.DataFrame(records, infer_schema_length=None).with_columns(pl.lit("").alias("full_name"))
    df = _apply_action(df, "full_name", "merge_columns", {"fields": ["first", "last"], "separator": " "})
    result = df["full_name"].to_list()
    assert result[0] == "John Doe"
    assert result[1] == "Jane Smith"

def test_merge_columns_custom_separator():
    records = [{"a": "foo", "b": "bar"}]
    df = pl.DataFrame(records).with_columns(pl.lit("").alias("combined"))
    df = _apply_action(df, "combined", "merge_columns", {"fields": ["a", "b"], "separator": "-"})
    assert df["combined"].to_list()[0] == "foo-bar"

def test_merge_columns_missing_fields_ignored():
    records = [{"a": "x"}]
    df = pl.DataFrame(records).with_columns(pl.lit("").alias("out"))
    # "b" doesn't exist — should not crash, needs 2+ valid fields
    result = _apply_action(df, "out", "merge_columns", {"fields": ["a", "nonexistent"], "separator": " "})
    # With only 1 valid field, no merge should happen — df unchanged
    assert "out" in result.columns


# ── rename_column ─────────────────────────────────────────────────────────────

def test_rename_column():
    records = [{"old_name": "Alice"}, {"old_name": "Bob"}]
    df = pl.DataFrame(records)
    df = _apply_action(df, "old_name", "rename_column", {"new_name": "full_name"})
    assert "full_name" in df.columns
    assert "old_name" not in df.columns
    assert df["full_name"].to_list() == ["Alice", "Bob"]

def test_rename_column_no_op_if_name_exists():
    records = [{"a": "1", "b": "2"}]
    df = pl.DataFrame(records)
    result = _apply_action(df, "a", "rename_column", {"new_name": "b"})
    # "b" already exists — should not rename
    assert "a" in result.columns

def test_rename_column_no_op_if_no_new_name():
    records = [{"name": "Alice"}]
    df = pl.DataFrame(records)
    result = _apply_action(df, "name", "rename_column", {})
    assert "name" in result.columns


# ── filter_rows ───────────────────────────────────────────────────────────────

def test_filter_rows_removes_equals():
    records = [{"status": "active"}, {"status": "deleted"}, {"status": "active"}]
    df = pl.DataFrame(records)
    df = _apply_action(df, "status", "filter_rows", {"condition": "equals", "value": "deleted"})
    assert len(df) == 2
    assert "deleted" not in df["status"].to_list()

def test_filter_rows_removes_empty_values():
    records = [{"email": "a@b.com"}, {"email": ""}, {"email": None}, {"email": "c@d.com"}]
    df = pl.DataFrame(records, infer_schema_length=None)
    df = _apply_action(df, "email", "filter_rows", {"condition": "empty"})
    assert len(df) == 2

def test_filter_rows_unknown_condition_no_crash():
    records = [{"x": "1"}, {"x": "2"}]
    df = pl.DataFrame(records)
    result = _apply_action(df, "x", "filter_rows", {"condition": "unknown_op", "value": "1"})
    assert len(result) == 2


# ── split_column ──────────────────────────────────────────────────────────────

def test_split_column_basic():
    records = [{"full_name": "John Doe"}, {"full_name": "Jane Smith"}]
    df = pl.DataFrame(records)
    df = _apply_action(df, "full_name", "split_column", {
        "delimiter": " ", "into": ["first_name", "last_name"]
    })
    assert "first_name" in df.columns
    assert "last_name" in df.columns
    assert df["first_name"].to_list()[0] == "John"
    assert df["last_name"].to_list()[0] == "Doe"

def test_split_column_with_extra_parts():
    records = [{"name": "a b c"}]
    df = pl.DataFrame(records)
    df = _apply_action(df, "name", "split_column", {
        "delimiter": " ", "into": ["p1", "p2"]
    })
    assert df["p1"].to_list()[0] == "a"
    assert df["p2"].to_list()[0] == "b"

def test_split_column_no_into_param_no_crash():
    records = [{"x": "a-b"}]
    df = pl.DataFrame(records)
    result = _apply_action(df, "x", "split_column", {"delimiter": "-", "into": []})
    assert "x" in result.columns


# ── Integration: execute_transforms with new actions ──────────────────────────

def test_nl_actions_through_pipeline():
    records = [
        {"first_name": "john", "last_name": "doe", "status": "spam"},
        {"first_name": "jane", "last_name": "smith", "status": "active"},
    ]
    spec = TransformSpec(
        source_format="CSV",
        record_count=2,
        sample_size=2,
        transforms=[
            TransformAction(
                field="status",
                actions=["filter_rows"],
                priority=1,
                params={"condition": "equals", "value": "spam"},
            ),
        ],
        dedup=DedupConfig(enabled=False),
    )
    cleaned, audit = execute_transforms(records, spec)
    assert len(cleaned) == 1
    assert cleaned[0]["first_name"] == "jane"
