"""Tests for field type normalizers via the executor."""

import pytest
from app.core.executor import (
    _title_case,
    _normalize_date,
    _format_phone,
    _standardize_company_suffix,
    _normalize_category,
    _is_numeric,
)


class TestTitleCase:
    def test_lowercases_input(self):
        assert _title_case("john doe") == "John Doe"

    def test_uppercase_input(self):
        assert _title_case("JOHN DOE") == "John Doe"

    def test_trims_whitespace(self):
        assert _title_case("  jane smith  ") == "Jane Smith"

    def test_empty_string(self):
        assert _title_case("") == ""

    def test_none(self):
        assert _title_case(None) is None

    def test_single_word(self):
        assert _title_case("alice") == "Alice"


class TestNormalizeDate:
    def test_yyyy_mm_dd_slash(self):
        assert _normalize_date("2023/01/15") == "2023-01-15"

    def test_yyyy_mm_dd_dot(self):
        assert _normalize_date("2023.02.01") == "2023-02-01"

    def test_mm_dd_yyyy_dash(self):
        assert _normalize_date("01-20-2023") == "2023-01-20"

    def test_dd_mm_yyyy_when_day_gt_12(self):
        assert _normalize_date("20/01/2023") == "2023-01-20"

    def test_mm_dd_yyyy_slash(self):
        assert _normalize_date("01/15/2023") == "2023-01-15"

    def test_month_name_format(self):
        assert _normalize_date("Feb 5 2023") == "2023-02-05"

    def test_month_name_with_comma(self):
        assert _normalize_date("March 12, 2023") == "2023-03-12"

    def test_already_iso(self):
        assert _normalize_date("2023-01-15") == "2023-01-15"

    def test_empty_returns_none(self):
        assert _normalize_date("") is None

    def test_na_returns_none(self):
        assert _normalize_date("N/A") is None

    def test_none_returns_none(self):
        assert _normalize_date(None) is None


class TestFormatPhone:
    def test_10_digit(self):
        assert _format_phone("5551234567") == "(555) 123-4567"

    def test_dashes(self):
        assert _format_phone("555-123-4567") == "(555) 123-4567"

    def test_parens_format(self):
        assert _format_phone("(555) 123-4567") == "(555) 123-4567"

    def test_country_code_1(self):
        assert _format_phone("15551234567") == "(555) 123-4567"

    def test_spaces(self):
        assert _format_phone("555 123 4567") == "(555) 123-4567"

    def test_7_digit(self):
        assert _format_phone("5551234") == "555-1234"

    def test_none(self):
        assert _format_phone(None) is None

    def test_empty(self):
        assert _format_phone("") == ""


class TestStandardizeCompanySuffix:
    def test_llc_uppercase(self):
        result = _standardize_company_suffix("bigco llc")
        assert "LLC" in result

    def test_corporation_to_inc(self):
        result = _standardize_company_suffix("widgets corporation")
        assert "Inc" in result or "Corp" in result

    def test_corp_normalized(self):
        result = _standardize_company_suffix("Acme corp")
        assert result == "Acme Corp"

    def test_none_returns_none(self):
        assert _standardize_company_suffix(None) is None


class TestNormalizeCategory:
    def test_slash_to_arrow(self):
        result = _normalize_category("Electronics/Accessories")
        assert ">" in result

    def test_ampersand_to_arrow(self):
        result = _normalize_category("Food & Beverage")
        assert ">" in result

    def test_title_cases(self):
        result = _normalize_category("ELECTRONICS")
        assert result == "Electronics"

    def test_none_returns_none(self):
        assert _normalize_category(None) is None


class TestIsNumeric:
    def test_integer(self):
        assert _is_numeric("42") is True

    def test_float(self):
        assert _is_numeric("4.5") is True

    def test_negative(self):
        assert _is_numeric("-3.14") is True

    def test_non_numeric(self):
        assert _is_numeric("abc") is False

    def test_empty(self):
        assert _is_numeric("") is False
