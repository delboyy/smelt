"""Pre-execution validation of transform specs against sample data."""

from typing import Any
from app.models.schemas import TransformSpec


class ValidationResult:
    def __init__(self) -> None:
        self.valid = True
        self.warnings: list[str] = []
        self.errors: list[str] = []

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        self.valid = False


def validate_spec(
    spec: TransformSpec,
    sample: list[dict[str, Any]],
) -> ValidationResult:
    """Validate a transform spec against sample data."""
    result = ValidationResult()

    if not sample:
        result.add_warning("Sample is empty — validation skipped")
        return result

    sample_keys = set(sample[0].keys())

    # Check all transform fields exist in sample
    for transform in spec.transforms:
        if transform.field not in sample_keys and transform.field != "*":
            result.add_warning(f"Field '{transform.field}' in transforms not found in data")

    # Check dedup keys exist
    if spec.dedup.enabled:
        for key in spec.dedup.keys:
            if key not in sample_keys:
                result.add_warning(f"Dedup key '{key}' not found in data columns")

    # Validate schema fields reference real columns
    for field in spec.schema_map:
        if field not in sample_keys:
            result.add_warning(f"Schema field '{field}' not found in data")

    # Check for unknown actions
    known_actions = {
        "trim", "collapse_whitespace", "lowercase", "uppercase", "title_case",
        "normalize_date", "extract_digits", "format_phone", "strip_currency",
        "parse_float", "parse_int", "map_values", "set_null_if_empty",
        "set_null_if_invalid", "standardize_suffix", "normalize_category",
    }
    for transform in spec.transforms:
        for action in transform.actions:
            if action not in known_actions:
                result.add_warning(f"Unknown action '{action}' on field '{transform.field}'")

    # Check for data loss risk: if a column has all values and we're setting null
    for transform in spec.transforms:
        field = transform.field
        if field not in sample_keys:
            continue
        values = [str(r.get(field, "")) for r in sample if r.get(field)]
        fill_rate = len(values) / len(sample)

        if fill_rate < 0.5 and transform.null_handling is None:
            result.add_warning(
                f"Field '{field}' has {fill_rate:.0%} fill rate — consider setting null_handling"
            )

    return result
