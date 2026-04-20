"""Format and encoding detection for uploaded data."""

import re
from charset_normalizer import from_bytes


def detect_encoding(raw_bytes: bytes) -> str:
    """Detect encoding of raw bytes using charset-normalizer."""
    result = from_bytes(raw_bytes)
    best = result.best()
    if best is None:
        return "utf-8"
    return str(best.encoding)


def detect_format(content: str) -> str:
    """Detect data format from content string."""
    t = content.strip()
    if t.startswith("{") or t.startswith("["):
        return "JSON"
    if t.startswith("<?xml") or (t.startswith("<") and "</" in t):
        return "XML"
    lines = [l for l in t.split("\n") if l.strip()]
    if len(lines) > 1:
        first = lines[0]
        tabs = len(re.findall(r"\t", first))
        commas = len(re.findall(r",", first))
        if tabs > commas and tabs >= 1:
            return "TSV"
        if commas >= 1:
            return "CSV"
    return "TXT"


def detect_issues(records: list[dict]) -> dict[str, int]:
    """Detect common data quality issues."""
    if not records:
        return {}

    issues: dict[str, int] = {
        "inconsistent_dates": 0,
        "mixed_case": 0,
        "potential_duplicates": 0,
        "missing_values": 0,
    }

    date_pattern = re.compile(r"\d{4}[\/\-\.]\d{1,2}|\d{1,2}[\/\-\.]\d{4}|[A-Z][a-z]{2}\s\d")

    seen_keys: set[str] = set()
    for row in records:
        key_parts = []
        for k, v in row.items():
            v_str = str(v) if v is not None else ""

            # Missing values
            if not v_str or v_str in ("N/A", "n/a", "null", "None", ""):
                issues["missing_values"] += 1

            # Mixed case (only for string-looking fields)
            if v_str and v_str != v_str.lower() and v_str != v_str.upper() and len(v_str) > 3:
                issues["mixed_case"] += 1

            # Inconsistent dates
            if date_pattern.search(v_str) and "/" in v_str and "-" in v_str:
                issues["inconsistent_dates"] += 1

            key_parts.append(v_str.lower().strip())

        fingerprint = "|".join(key_parts)
        if fingerprint in seen_keys:
            issues["potential_duplicates"] += 1
        else:
            seen_keys.add(fingerprint)

    return issues
