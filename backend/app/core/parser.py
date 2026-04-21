"""Multi-format data parser: CSV, JSON, XML, TSV."""

import csv
import json
import io
import re
from typing import Any
from lxml import etree


def parse_data(content: str, fmt: str) -> list[dict[str, Any]]:
    """Parse content string into list of records."""
    fmt = fmt.upper()
    if fmt == "JSON":
        return parse_json(content)
    if fmt == "XML":
        return parse_xml(content)
    if fmt == "TSV":
        return parse_csv(content, delimiter="\t")
    if fmt == "CSV":
        return parse_csv(content, delimiter=",")
    return []


def parse_csv(content: str, delimiter: str = ",") -> list[dict[str, Any]]:
    """Parse CSV or TSV content."""
    reader = csv.DictReader(
        io.StringIO(content.strip()),
        delimiter=delimiter,
        skipinitialspace=True,
    )
    records = []
    for row in reader:
        records.append({k.strip(): v.strip() if v else "" for k, v in row.items() if k})
    return records


def parse_json(content: str) -> list[dict[str, Any]]:
    """Parse JSON array or object."""
    obj = json.loads(content.strip())
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        # Look for array value
        for v in obj.values():
            if isinstance(v, list):
                return v
        return [obj]
    return []


def parse_xml(content: str) -> list[dict[str, Any]]:
    """Parse XML into list of records from child elements of root."""
    # Safe parser: no external entities, no DTD network access (prevents XXE)
    safe_parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        load_dtd=False,
        recover=False,
    )
    try:
        root = etree.fromstring(content.encode("utf-8"), safe_parser)
    except etree.XMLSyntaxError:
        recovery_parser = etree.XMLParser(
            resolve_entities=False,
            no_network=True,
            load_dtd=False,
            recover=True,
        )
        root = etree.fromstring(content.encode("utf-8"), recovery_parser)

    records = []
    for child in root:
        record: dict[str, Any] = {}
        for elem in child:
            tag = re.sub(r"\{[^}]+\}", "", elem.tag)  # strip namespace
            record[tag] = (elem.text or "").strip()
        if record:
            records.append(record)
    return records
