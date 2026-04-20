"""Tests for multi-format parser."""

import pytest
from app.core.parser import parse_csv, parse_json, parse_xml, parse_data


def test_parse_csv_basic():
    csv = "name,email\njohn,john@example.com\njane,jane@example.com"
    result = parse_csv(csv)
    assert len(result) == 2
    assert result[0]["name"] == "john"
    assert result[0]["email"] == "john@example.com"


def test_parse_csv_quoted_commas():
    csv = 'name,value\njohn,"$120,000"'
    result = parse_csv(csv)
    assert result[0]["value"] == "$120,000"


def test_parse_csv_strips_whitespace():
    csv = "name , email\n  john  ,  j@x.com  "
    result = parse_csv(csv)
    assert result[0]["name"] == "john"


def test_parse_csv_empty_fields():
    csv = "name,email\njohn,"
    result = parse_csv(csv)
    assert result[0]["email"] == ""


def test_parse_json_array():
    j = '[{"name": "John"}, {"name": "Jane"}]'
    result = parse_json(j)
    assert len(result) == 2
    assert result[0]["name"] == "John"


def test_parse_json_object_with_array():
    j = '{"records": [{"id": 1}, {"id": 2}]}'
    result = parse_json(j)
    assert len(result) == 2
    assert result[0]["id"] == 1


def test_parse_json_single_object():
    j = '{"name": "John", "email": "j@x.com"}'
    result = parse_json(j)
    assert len(result) == 1


def test_parse_json_invalid_raises():
    with pytest.raises(Exception):
        parse_json("{invalid}")


def test_parse_xml_basic():
    xml = """<?xml version="1.0"?>
<invoices>
  <invoice><id>INV-001</id><client>John</client></invoice>
  <invoice><id>INV-002</id><client>Jane</client></invoice>
</invoices>"""
    result = parse_xml(xml)
    assert len(result) == 2
    assert result[0]["id"] == "INV-001"
    assert result[0]["client"] == "John"


def test_parse_xml_trims_whitespace():
    xml = """<records><record><name>  Bob Wilson  </name></record></records>"""
    result = parse_xml(xml)
    assert result[0]["name"] == "Bob Wilson"


def test_parse_data_routes_csv():
    csv = "name,email\njohn,j@x.com"
    result = parse_data(csv, "CSV")
    assert len(result) == 1


def test_parse_data_routes_json():
    j = '[{"name": "John"}]'
    result = parse_data(j, "JSON")
    assert len(result) == 1


def test_parse_data_routes_tsv():
    tsv = "name\temail\njohn\tj@x.com"
    result = parse_data(tsv, "TSV")
    assert len(result) == 1


def test_parse_real_contacts_csv():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_contacts.csv")
    with open(fixture) as f:
        content = f.read()
    result = parse_csv(content)
    assert len(result) >= 7
    assert "full_name" in result[0]
    assert "email" in result[0]


def test_parse_real_products_json():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_products.json")
    with open(fixture) as f:
        content = f.read()
    result = parse_json(content)
    assert len(result) == 6
    assert "product_name" in result[0]


def test_parse_real_invoices_xml():
    import os
    fixture = os.path.join(os.path.dirname(__file__), "../fixtures/messy_invoices.xml")
    with open(fixture) as f:
        content = f.read()
    result = parse_xml(content)
    assert len(result) == 5
    assert "id" in result[0]
