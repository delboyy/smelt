"""Deterministic Polars-based transform executor."""

import re
from typing import Any, Optional
import polars as pl
from app.models.schemas import TransformSpec, AuditEntry


def execute_transforms(
    records: list[dict[str, Any]],
    spec: TransformSpec,
) -> tuple[list[dict[str, Any]], list[AuditEntry]]:
    """
    Execute a TransformSpec against a dataset using Polars.
    Returns (cleaned_records, audit_log).
    LLM is NOT called here — spec was already generated.
    """
    if not records:
        return [], []

    df = pl.DataFrame(records, infer_schema_length=None)
    audit: list[AuditEntry] = []

    # Apply transforms in priority order
    sorted_transforms = sorted(spec.transforms, key=lambda t: t.priority)

    for transform in sorted_transforms:
        field = transform.field
        if field not in df.columns:
            continue

        original_series = df[field].cast(pl.String)

        for action in transform.actions:
            df = _apply_action(df, field, action, transform.params)

        # Track changes in audit log
        new_series = df[field]
        for i, (orig, new_val) in enumerate(zip(original_series.to_list(), new_series.to_list())):
            orig_str = str(orig) if orig is not None else None
            new_str = str(new_val) if new_val is not None else None
            if orig_str != new_str and orig_str:
                audit.append(
                    AuditEntry(
                        row=i + 1,
                        field=field,
                        original=orig_str,
                        cleaned=new_str,
                        action=action,
                        confidence=spec.schema_map.get(field, None) and
                            spec.schema_map[field].confidence or 0.8,
                        change_type="normalized" if new_str is not None else "nulled",
                    )
                )

    # Deduplication
    if spec.dedup.enabled and spec.dedup.keys:
        valid_keys = [k for k in spec.dedup.keys if k in df.columns]
        if valid_keys:
            before_count = len(df)
            df = _deduplicate(df, valid_keys)
            dupes = before_count - len(df)
            if dupes > 0:
                audit.append(
                    AuditEntry(
                        row=0,
                        field="*",
                        original=f"{dupes} duplicate rows",
                        cleaned="Removed",
                        action="dedup",
                        confidence=1.0,
                        change_type="duplicate",
                    )
                )
    elif spec.dedup.enabled:
        # Dedup on all columns
        before_count = len(df)
        df = df.unique(maintain_order=True)
        dupes = before_count - len(df)
        if dupes > 0:
            audit.append(
                AuditEntry(
                    row=0,
                    field="*",
                    original=f"{dupes} duplicate rows",
                    cleaned="Removed",
                    action="dedup",
                    confidence=1.0,
                    change_type="duplicate",
                )
            )

    return df.to_dicts(), audit


def _apply_action(
    df: pl.DataFrame,
    field: str,
    action: str,
    params: dict[str, Any],
) -> pl.DataFrame:
    """Apply a single transform action to a column."""
    col = pl.col(field).cast(pl.String)

    if action == "trim":
        return df.with_columns(col.str.strip_chars().alias(field))

    if action == "collapse_whitespace":
        return df.with_columns(col.str.replace_all(r"\s+", " ").alias(field))

    if action == "lowercase":
        return df.with_columns(col.str.to_lowercase().alias(field))

    if action == "uppercase":
        return df.with_columns(col.str.to_uppercase().alias(field))

    if action == "title_case":
        # Polars doesn't have title_case; apply via map_elements
        return df.with_columns(
            col.map_elements(
                lambda v: _title_case(v) if v else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "normalize_date":
        return df.with_columns(
            col.map_elements(
                lambda v: _normalize_date(v) if v else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "extract_digits":
        return df.with_columns(col.str.replace_all(r"[^\d]", "").alias(field))

    if action == "format_phone":
        return df.with_columns(
            col.map_elements(
                lambda v: _format_phone(v) if v else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "strip_currency":
        return df.with_columns(
            col.str.replace_all(r"[$,\s]|USD|EUR|GBP", "", literal=False).alias(field)
        )

    if action == "parse_float":
        return df.with_columns(
            col.map_elements(
                lambda v: str(float(re.sub(r"[^\d.\-]", "", v))) if v and _is_numeric(v) else None,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "parse_int":
        return df.with_columns(
            col.map_elements(
                lambda v: str(int(float(re.sub(r"[^\d.\-]", "", v)))) if v and _is_numeric(v) else None,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "set_null_if_empty":
        return df.with_columns(
            col.map_elements(
                lambda v: None if not v or v.strip() in ("N/A", "n/a", "null", "None", "") else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "set_null_if_invalid":
        return df.with_columns(
            col.map_elements(
                lambda v: None if not v or v.strip() in ("N/A", "invalid", "") else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "standardize_suffix":
        return df.with_columns(
            col.map_elements(
                lambda v: _standardize_company_suffix(v) if v else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "normalize_category":
        return df.with_columns(
            col.map_elements(
                lambda v: _normalize_category(v) if v else v,
                return_dtype=pl.String,
            ).alias(field)
        )

    if action == "map_values":
        mapping = params.get("map_values", {})
        if mapping:
            return df.with_columns(
                col.map_elements(
                    lambda v: mapping.get(v.lower() if v else v, v),
                    return_dtype=pl.String,
                ).alias(field)
            )

    return df


def _deduplicate(df: pl.DataFrame, keys: list[str]) -> pl.DataFrame:
    """Remove duplicate rows based on key columns (normalized)."""
    norm_cols = []
    for k in keys:
        norm_col = pl.col(k).cast(pl.String).str.to_lowercase().str.strip_chars()
        norm_cols.append(norm_col.alias(f"__dedup_{k}"))

    df_with_keys = df.with_columns(norm_cols)
    dedup_key_cols = [f"__dedup_{k}" for k in keys]
    df_deduped = df_with_keys.unique(subset=dedup_key_cols, maintain_order=True)
    return df_deduped.drop(dedup_key_cols)


def _title_case(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    return " ".join(w.capitalize() for w in v.strip().split())


def _normalize_date(v: Optional[str]) -> Optional[str]:
    if not v or v.strip() in ("N/A", ""):
        return None
    d = v.strip()
    patterns = [
        (r"^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$",
         lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),
        (r"^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$",
         lambda m: (f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
                    if int(m.group(1)) > 12
                    else f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}")),
        (r"^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$",
         lambda m: _month_name_to_date(m)),
    ]
    for pattern, formatter in patterns:
        match = re.match(pattern, d)
        if match:
            return formatter(match)
    return d


def _month_name_to_date(m: re.Match) -> str:
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    mo = months.get(m.group(1).lower()[:3])
    if mo:
        return f"{m.group(3)}-{str(mo).zfill(2)}-{m.group(2).zfill(2)}"
    return m.group(0)


def _format_phone(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    digits = re.sub(r"[^\d]", "", v)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    if len(digits) == 7:
        return f"{digits[:3]}-{digits[3:]}"
    return v


def _standardize_company_suffix(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    v = re.sub(r"\b(corporation|incorporated)\b\.?$", "Inc", v, flags=re.I)
    v = re.sub(r"\bcorp\.?$", "Corp", v, flags=re.I)
    return " ".join(
        w.upper() if w.lower() in ("llc", "llp", "ltd", "co", "plc") else w
        for w in v.split()
    )


def _normalize_category(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    c = re.sub(r"[\/&]+", " > ", v.strip())
    c = re.sub(r"\s+", " ", c)
    return " ".join(w if w == ">" else w.capitalize() for w in c.split())


def _is_numeric(v: str) -> bool:
    try:
        float(re.sub(r"[^\d.\-]", "", v))
        return True
    except ValueError:
        return False
