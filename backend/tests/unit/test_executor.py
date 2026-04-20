"""Tests for the Polars execution engine."""

import pytest
from app.core.executor import execute_transforms
from app.models.schemas import TransformSpec, TransformAction, DedupConfig, FieldSchema


def make_spec(
    field: str,
    field_type: str,
    actions: list[str],
    dedup_enabled: bool = False,
    dedup_keys: list[str] | None = None,
) -> TransformSpec:
    return TransformSpec(
        source_format="CSV",
        record_count=10,
        sample_size=10,
        schema={field: FieldSchema(detected_type=field_type, confidence=0.9)},
        transforms=[TransformAction(field=field, actions=actions)],
        dedup=DedupConfig(enabled=dedup_enabled, keys=dedup_keys or []),
    )


def test_trim_action():
    records = [{"name": "  John  "}]
    spec = make_spec("name", "name", ["trim"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["name"] == "John"


def test_lowercase_action():
    records = [{"email": "JOHN@EXAMPLE.COM"}]
    spec = make_spec("email", "email", ["lowercase"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["email"] == "john@example.com"


def test_uppercase_action():
    records = [{"currency": "usd"}]
    spec = make_spec("currency", "currency_code", ["uppercase"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["currency"] == "USD"


def test_title_case_action():
    records = [{"name": "john doe"}]
    spec = make_spec("name", "name", ["title_case"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["name"] == "John Doe"


def test_strip_currency_action():
    records = [{"amount": "$50,000"}]
    spec = make_spec("amount", "currency", ["strip_currency"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["amount"] == "50000"


def test_parse_float_action():
    records = [{"amount": "79.99"}]
    spec = make_spec("amount", "currency", ["parse_float"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["amount"] == "79.99"


def test_normalize_date_action():
    records = [{"date": "2023/01/15"}]
    spec = make_spec("date", "date", ["normalize_date"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["date"] == "2023-01-15"


def test_format_phone_action():
    records = [{"phone": "5551234567"}]
    spec = make_spec("phone", "phone", ["extract_digits", "format_phone"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["phone"] == "(555) 123-4567"


def test_dedup_removes_exact_duplicates():
    records = [
        {"email": "john@x.com", "name": "John"},
        {"email": "john@x.com", "name": "John"},
        {"email": "jane@x.com", "name": "Jane"},
    ]
    spec = TransformSpec(
        source_format="CSV",
        record_count=3,
        sample_size=3,
        schema={},
        transforms=[],
        dedup=DedupConfig(enabled=True, keys=["email"]),
    )
    cleaned, audit = execute_transforms(records, spec)
    assert len(cleaned) == 2
    assert any(e.change_type == "duplicate" for e in audit)


def test_empty_records():
    spec = TransformSpec(
        source_format="CSV",
        record_count=0,
        sample_size=0,
        schema={},
        transforms=[],
        dedup=DedupConfig(enabled=False),
    )
    cleaned, audit = execute_transforms([], spec)
    assert cleaned == []
    assert audit == []


def test_set_null_if_empty():
    records = [{"email": ""}, {"email": "N/A"}, {"email": "john@x.com"}]
    spec = make_spec("email", "email", ["set_null_if_empty"])
    cleaned, _ = execute_transforms(records, spec)
    assert cleaned[0]["email"] is None
    assert cleaned[1]["email"] is None
    assert cleaned[2]["email"] == "john@x.com"


def test_audit_tracks_changes():
    records = [{"email": "JOHN@EXAMPLE.COM"}]
    spec = make_spec("email", "email", ["lowercase"])
    _, audit = execute_transforms(records, spec)
    assert len(audit) > 0
    assert audit[0].field == "email"
    assert audit[0].original == "JOHN@EXAMPLE.COM"
    assert audit[0].cleaned == "john@example.com"
