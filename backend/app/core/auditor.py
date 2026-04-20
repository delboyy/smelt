"""Change tracking and audit log generation."""

from typing import Any
from app.models.schemas import AuditEntry, CleaningStats


def build_audit_summary(
    original: list[dict[str, Any]],
    cleaned: list[dict[str, Any]],
    audit_entries: list[AuditEntry],
) -> CleaningStats:
    """Compute cleaning stats from audit entries."""
    dupes = sum(1 for e in audit_entries if e.change_type == "duplicate")
    normalized = sum(1 for e in audit_entries if e.change_type == "normalized")
    nulled = sum(1 for e in audit_entries if e.change_type == "nulled")
    flagged = sum(1 for e in audit_entries if e.change_type == "flagged")

    return CleaningStats(
        records_in=len(original),
        records_out=len(cleaned),
        duplicates_removed=dupes,
        fields_normalized=normalized,
        nulls_set=nulled,
        flagged_for_review=flagged,
    )


def expand_row_audit(
    original: list[dict[str, Any]],
    cleaned: list[dict[str, Any]],
) -> list[AuditEntry]:
    """
    Generate per-row, per-field audit entries by comparing original vs cleaned.
    Used when Polars execution doesn't track changes inline.
    """
    entries: list[AuditEntry] = []
    min_len = min(len(original), len(cleaned))

    for i in range(min_len):
        orig_row = original[i]
        clean_row = cleaned[i]

        for field in orig_row:
            orig_val = str(orig_row[field]) if orig_row[field] is not None else None
            clean_val = str(clean_row.get(field)) if clean_row.get(field) is not None else None

            if orig_val != clean_val:
                entries.append(
                    AuditEntry(
                        row=i + 1,
                        field=field,
                        original=orig_val,
                        cleaned=clean_val,
                        action="transform",
                        confidence=0.9,
                        change_type="normalized" if clean_val is not None else "nulled",
                    )
                )

    # Rows in original but not cleaned = duplicates removed
    if len(original) > len(cleaned):
        for i in range(len(cleaned), len(original)):
            entries.append(
                AuditEntry(
                    row=i + 1,
                    field="*",
                    original="Duplicate row",
                    cleaned="Removed",
                    action="dedup",
                    confidence=1.0,
                    change_type="duplicate",
                )
            )

    return entries
