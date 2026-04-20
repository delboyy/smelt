"""Tests for format and encoding detection."""

import pytest
from app.core.detector import detect_format, detect_issues


def test_detect_json_array():
    assert detect_format('[{"key": "val"}]') == "JSON"


def test_detect_json_object():
    assert detect_format('{"key": "val"}') == "JSON"


def test_detect_xml_with_declaration():
    assert detect_format('<?xml version="1.0"?><root></root>') == "XML"


def test_detect_xml_without_declaration():
    assert detect_format("<records><record><id>1</id></record></records>") == "XML"


def test_detect_csv():
    content = "name,email,phone\njohn,j@x.com,555-1234"
    assert detect_format(content) == "CSV"


def test_detect_tsv():
    content = "name\temail\tphone\njohn\tj@x.com\t555"
    assert detect_format(content) == "TSV"


def test_detect_txt_fallback():
    assert detect_format("just some plain text") == "TXT"


def test_detect_leading_whitespace_json():
    assert detect_format("  [1, 2, 3]") == "JSON"


def test_detect_issues_empty():
    assert detect_issues([]) == {}


def test_detect_issues_finds_missing_values():
    records = [{"name": "John", "email": ""}, {"name": "Jane", "email": "j@x.com"}]
    issues = detect_issues(records)
    assert issues["missing_values"] > 0


def test_detect_issues_finds_duplicates():
    records = [
        {"name": "john", "email": "j@x.com"},
        {"name": "john", "email": "j@x.com"},
    ]
    issues = detect_issues(records)
    assert issues["potential_duplicates"] > 0
