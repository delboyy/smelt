"""Unit tests for data quality scorer."""
import pytest
from app.core.quality_scorer import (
    calculate_data_quality_score,
    _is_empty,
    _is_valid_for_type,
    _is_conformed,
)


# ── _is_empty ─────────────────────────────────────────────────────────────────

def test_is_empty_none():
    assert _is_empty(None) is True

def test_is_empty_blank_string():
    assert _is_empty("") is True
    assert _is_empty("   ") is True

def test_is_empty_sentinel_values():
    for val in ("n/a", "N/A", "na", "null", "NULL", "none", "nan", "-", "unknown"):
        assert _is_empty(val) is True, f"Expected {val!r} to be empty"

def test_is_empty_real_values():
    assert _is_empty("john") is False
    assert _is_empty(0) is False
    assert _is_empty("0") is False


# ── _is_valid_for_type ────────────────────────────────────────────────────────

def test_valid_email():
    assert _is_valid_for_type("user@example.com", "email") is True
    assert _is_valid_for_type("notanemail", "email") is False

def test_valid_phone():
    assert _is_valid_for_type("5551234567", "phone") is True
    assert _is_valid_for_type("123", "phone") is False  # too short

def test_valid_date():
    assert _is_valid_for_type("2024-01-15", "date") is True
    assert _is_valid_for_type("not a date", "date") is False

def test_valid_number():
    assert _is_valid_for_type("$1,200.50", "number") is True
    assert _is_valid_for_type("abc", "number") is False

def test_valid_text_always_true():
    assert _is_valid_for_type("anything", "text") is True


# ── _is_conformed ─────────────────────────────────────────────────────────────

def test_conformed_email():
    assert _is_conformed("user@example.com", "email") is True
    assert _is_conformed("USER@EXAMPLE.COM", "email") is False

def test_conformed_date_iso():
    assert _is_conformed("2024-01-15", "date") is True
    assert _is_conformed("01/15/2024", "date") is False

def test_conformed_phone_us():
    assert _is_conformed("(555) 123-4567", "phone") is True
    assert _is_conformed("5551234567", "phone") is False


# ── calculate_data_quality_score ──────────────────────────────────────────────

def test_empty_records_returns_zero():
    result = calculate_data_quality_score([], {})
    assert result["score"] == 0
    assert result["grade"] == "F"

def test_perfect_data_scores_high():
    records = [
        {"email": "alice@example.com", "name": "Alice"},
        {"email": "bob@example.com", "name": "Bob"},
    ]
    schema = {"email": "email", "name": "name"}
    result = calculate_data_quality_score(records, schema)
    assert result["score"] >= 75
    assert result["grade"] in ("A", "B")

def test_score_has_all_dimensions():
    records = [{"name": "Alice"}]
    result = calculate_data_quality_score(records, {"name": "name"})
    for key in ("score", "completeness", "consistency", "uniqueness", "conformity", "grade"):
        assert key in result

def test_grade_assignment():
    # Perfect completeness/uniqueness/consistency with no schema → grade A
    records = [{"a": "x"}, {"a": "y"}, {"a": "z"}]
    result = calculate_data_quality_score(records, {})
    assert result["grade"] == "A"

def test_missing_values_reduce_completeness():
    records = [
        {"email": "a@b.com", "name": None},
        {"email": None, "name": "Bob"},
    ]
    result = calculate_data_quality_score(records, {})
    assert result["completeness"] == 50

def test_duplicates_reduce_uniqueness():
    records = [
        {"name": "Alice", "email": "a@b.com"},
        {"name": "Alice", "email": "a@b.com"},  # exact dupe
    ]
    result = calculate_data_quality_score(records, {})
    assert result["uniqueness"] == 50

def test_score_bounded_0_to_100():
    records = [{"x": None}, {"x": None}]
    result = calculate_data_quality_score(records, {})
    assert 0 <= result["score"] <= 100

def test_nonconforming_emails_reduce_conformity():
    records = [
        {"email": "USER@EXAMPLE.COM"},
        {"email": "ANOTHER@EXAMPLE.COM"},
    ]
    result = calculate_data_quality_score(records, {"email": "email"})
    assert result["conformity"] == 0
