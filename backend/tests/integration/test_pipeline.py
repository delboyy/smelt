"""Integration tests for the full ingest → clean pipeline."""

import pytest
from app.core.detector import detect_format, detect_issues
from app.core.parser import parse_data
from app.core.sampling import stratified_sample
from app.core.planner import _rule_based_spec
from app.core.executor import execute_transforms
from app.core.auditor import build_audit_summary


def run_pipeline(content: str) -> dict:
    """Run the full pipeline synchronously using rule-based planner."""
    fmt = detect_format(content)
    records = parse_data(content, fmt)
    sample = stratified_sample(records, n=100)
    spec = _rule_based_spec(sample, fmt, len(records))
    cleaned, audit = execute_transforms(records, spec)
    stats = build_audit_summary(records, cleaned, audit)
    return {
        "format": fmt,
        "records_in": len(records),
        "cleaned": cleaned,
        "audit": audit,
        "stats": stats,
    }


def test_csv_pipeline():
    csv = """full_name,email,phone,signup_date,status
john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15,active
Jane Smith,jane@widgets.io,(555) 567-8901,01-20-2023,Active
john doe,john@acmecorp.com,555-1234,15/01/2023,active"""
    result = run_pipeline(csv)
    assert result["format"] == "CSV"
    assert result["records_in"] == 3
    # Should have normalized email
    emails = [r.get("email") for r in result["cleaned"]]
    assert all(e == e.lower() for e in emails if e)


def test_json_pipeline():
    import json
    records = [
        {"name": "john doe", "price": "$79.99", "category": "ELECTRONICS"},
        {"name": "JANE SMITH", "price": "12.50", "category": "food"},
    ]
    content = json.dumps(records)
    result = run_pipeline(content)
    assert result["format"] == "JSON"
    assert result["records_in"] == 2


def test_xml_pipeline():
    xml = """<?xml version="1.0"?>
<invoices>
  <invoice><id>INV-001</id><client>john doe</client><amount>$1,500.00</amount><status>paid</status></invoice>
  <invoice><id>INV-002</id><client>Jane Smith</client><amount>2500</amount><status>PAID</status></invoice>
</invoices>"""
    result = run_pipeline(xml)
    assert result["format"] == "XML"
    assert result["records_in"] == 2


def test_dedup_in_pipeline():
    csv = """email,name
john@x.com,John
john@x.com,John
jane@x.com,Jane"""
    result = run_pipeline(csv)
    assert result["stats"].duplicates_removed >= 1


def test_pipeline_with_fixture_csv():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_contacts.csv")
    with open(fixture) as f:
        content = f.read()
    result = run_pipeline(content)
    assert result["records_in"] >= 7
    assert len(result["cleaned"]) > 0
    assert result["stats"].fields_normalized > 0 or result["stats"].duplicates_removed > 0


def test_pipeline_with_fixture_json():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_products.json")
    with open(fixture) as f:
        content = f.read()
    result = run_pipeline(content)
    assert result["records_in"] == 6
    assert len(result["cleaned"]) > 0


def test_pipeline_with_fixture_xml():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_invoices.xml")
    with open(fixture) as f:
        content = f.read()
    result = run_pipeline(content)
    assert result["records_in"] == 5
