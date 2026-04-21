"""Data quality scoring: completeness, consistency, uniqueness, conformity."""
import re
from typing import Any


def _is_empty(v: Any) -> bool:
    if v is None:
        return True
    s = str(v).strip().lower()
    return s in ("", "n/a", "na", "null", "none", "nan", "-", "unknown")


def _is_valid_for_type(v: Any, field_type: str) -> bool:
    s = str(v).strip()
    if field_type == "email":
        return bool(re.match(r"[^@]+@[^@]+\.[^@]+", s))
    if field_type == "phone":
        digits = re.sub(r"\D", "", s)
        return 7 <= len(digits) <= 15
    if field_type == "date":
        return bool(re.search(r"\d{4}|\d{1,2}[\/\-]\d{1,2}", s))
    if field_type in ("number", "currency"):
        return bool(re.search(r"\d", s))
    return True


def _is_conformed(v: Any, field_type: str) -> bool:
    s = str(v).strip()
    if field_type == "email":
        return s == s.lower() and "@" in s
    if field_type == "date":
        return bool(re.match(r"\d{4}-\d{2}-\d{2}", s))
    if field_type == "phone":
        return bool(re.match(r"\(\d{3}\) \d{3}-\d{4}", s))
    return True


def calculate_data_quality_score(records: list[dict], schema: dict) -> dict:
    if not records:
        return {"score": 0, "completeness": 0, "consistency": 0, "uniqueness": 0, "conformity": 0, "grade": "F"}

    fields = list(records[0].keys())
    n = len(records)

    # Completeness (30%)
    total_cells = n * len(fields)
    filled = sum(1 for r in records for f in fields if not _is_empty(r.get(f)))
    completeness = filled / total_cells if total_cells else 1.0

    # Consistency (25%)
    consistency_scores = []
    for field in fields:
        ftype = schema.get(field, "text")
        values = [r.get(field) for r in records if not _is_empty(r.get(field))]
        if not values:
            continue
        valid = sum(1 for v in values if _is_valid_for_type(v, ftype))
        consistency_scores.append(valid / len(values))
    consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0

    # Uniqueness (25%)
    fingerprints: set[str] = set()
    unique_count = 0
    for r in records:
        fp = "|".join(str(r.get(f, "")).lower().strip() for f in fields)
        if fp not in fingerprints:
            fingerprints.add(fp)
            unique_count += 1
    uniqueness = unique_count / n if n else 1.0

    # Conformity (20%)
    conformity_scores = []
    for field in fields:
        ftype = schema.get(field, "text")
        if ftype == "text":
            continue
        values = [r.get(field) for r in records if not _is_empty(r.get(field))]
        if not values:
            continue
        conformed = sum(1 for v in values if _is_conformed(v, ftype))
        conformity_scores.append(conformed / len(values))
    conformity = sum(conformity_scores) / len(conformity_scores) if conformity_scores else 1.0

    score = round(completeness * 30 + consistency * 25 + uniqueness * 25 + conformity * 20)
    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"

    return {
        "score": score,
        "completeness": round(completeness * 100),
        "consistency": round(consistency * 100),
        "uniqueness": round(uniqueness * 100),
        "conformity": round(conformity * 100),
        "grade": grade,
    }
