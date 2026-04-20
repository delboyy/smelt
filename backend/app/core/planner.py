"""LLM-powered transform spec generator using Claude API."""

import json
from typing import Any
import anthropic
from app.config import get_settings
from app.models.schemas import TransformSpec, FieldSchema, TransformAction, DedupConfig

SYSTEM_PROMPT = """You are a data quality expert. Analyze the provided data sample and generate a JSON transform spec.

Return ONLY valid JSON matching this exact schema:
{
  "schema": {
    "<field_name>": {
      "detected_type": "<one of: name|company|email|phone|date|currency|currency_code|status|category|number|id|text>",
      "confidence": <0.0-1.0>,
      "nullable": <true|false>
    }
  },
  "transforms": [
    {
      "field": "<field_name>",
      "actions": ["<action1>", "<action2>"],
      "priority": <1|2|3>,
      "params": {},
      "null_handling": "<set_null_if_empty|set_null_if_invalid|null>"
    }
  ],
  "dedup": {
    "enabled": <true|false>,
    "strategy": "<exact|fuzzy>",
    "keys": ["<key_field>"],
    "threshold": 0.85
  }
}

Available actions: trim, collapse_whitespace, lowercase, uppercase, title_case,
normalize_date, extract_digits, format_phone, strip_currency, parse_float,
parse_int, map_values, set_null_if_empty, set_null_if_invalid,
standardize_suffix, normalize_category

Be conservative with confidence scores. Flag ambiguous fields with lower confidence."""


def infer_schema_rule_based(records: list[dict[str, Any]]) -> dict[str, str]:
    """Fast rule-based schema inference without LLM."""
    if not records:
        return {}

    import re
    schema: dict[str, str] = {}
    keys = list(records[0].keys())

    for key in keys:
        kl = key.lower()
        values = [str(r.get(key, "")) for r in records if r.get(key)]
        sample = values[:20]

        if "email" in kl:
            schema[key] = "email"
        elif any(w in kl for w in ("phone", "mobile", "tel")):
            schema[key] = "phone"
        elif any(w in kl for w in ("date", "signup", "joined", "created", "updated", "due")):
            schema[key] = "date"
        elif any(w in kl for w in ("name", "client", "contact")):
            schema[key] = "name"
        elif any(w in kl for w in ("company", "org", "employer")):
            schema[key] = "company"
        elif any(w in kl for w in ("status", "state", "stage")):
            schema[key] = "status"
        elif any(w in kl for w in ("amount", "price", "revenue", "deal", "cost", "value", "total")):
            schema[key] = "currency"
        elif kl == "currency":
            schema[key] = "currency_code"
        elif any(w in kl for w in ("category", "type", "group")):
            schema[key] = "category"
        elif any(w in kl for w in ("rating", "score", "stock", "qty", "quantity", "count")):
            schema[key] = "number"
        elif any(w in kl for w in ("sku", "id", "code", "ref")):
            schema[key] = "id"
        else:
            # Content heuristics
            date_matches = sum(1 for v in sample if re.search(r"\d{4}[\/\-\.]|\d{1,2}[\/\-\.]\d{4}", v))
            if date_matches > len(sample) * 0.5:
                schema[key] = "date"
            elif sum(1 for v in sample if re.search(r"^\$|USD|EUR|GBP", v, re.I)) > len(sample) * 0.3:
                schema[key] = "currency"
            else:
                schema[key] = "text"

    return schema


async def generate_transform_spec(
    sample: list[dict[str, Any]],
    source_format: str,
    record_count: int,
) -> TransformSpec:
    """Call Claude API to generate a transform spec from a data sample."""
    settings = get_settings()

    if not settings.anthropic_api_key:
        # Fall back to rule-based inference
        return _rule_based_spec(sample, source_format, record_count)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    sample_json = json.dumps(sample[:20], indent=2, default=str)
    columns = list(sample[0].keys()) if sample else []

    prompt = f"""Analyze this data sample and generate a transform spec.

Source format: {source_format}
Total records: {record_count}
Columns: {columns}

Sample data (first 20 rows):
{sample_json}

Generate the transform spec JSON."""

    try:
        message = await client.messages.create(
            model=settings.llm_model,
            max_tokens=settings.llm_max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        content = message.content[0].text if message.content else ""
        # Extract JSON from response
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            spec_dict = json.loads(content[json_start:json_end])
            return _dict_to_spec(spec_dict, source_format, record_count, len(sample))
    except Exception:
        pass

    # Fallback to rule-based
    return _rule_based_spec(sample, source_format, record_count)


def _dict_to_spec(
    d: dict[str, Any],
    source_format: str,
    record_count: int,
    sample_size: int,
) -> TransformSpec:
    schema_map = {}
    for field, info in d.get("schema", {}).items():
        schema_map[field] = FieldSchema(
            detected_type=info.get("detected_type", "text"),
            confidence=float(info.get("confidence", 0.8)),
            nullable=info.get("nullable", True),
        )

    transforms = []
    for t in d.get("transforms", []):
        transforms.append(
            TransformAction(
                field=t.get("field", ""),
                actions=t.get("actions", []),
                priority=t.get("priority", 1),
                params=t.get("params", {}),
                null_handling=t.get("null_handling"),
            )
        )

    dedup_d = d.get("dedup", {})
    dedup = DedupConfig(
        enabled=dedup_d.get("enabled", True),
        strategy=dedup_d.get("strategy", "exact"),
        keys=dedup_d.get("keys", []),
        threshold=float(dedup_d.get("threshold", 0.85)),
    )

    return TransformSpec(
        source_format=source_format,
        record_count=record_count,
        sample_size=sample_size,
        schema=schema_map,
        transforms=transforms,
        dedup=dedup,
    )


def _rule_based_spec(
    sample: list[dict[str, Any]],
    source_format: str,
    record_count: int,
) -> TransformSpec:
    """Generate a transform spec using rule-based schema inference."""
    inferred = infer_schema_rule_based(sample)

    schema_map = {
        field: FieldSchema(detected_type=ftype, confidence=0.85, nullable=True)
        for field, ftype in inferred.items()
    }

    TYPE_ACTIONS: dict[str, list[str]] = {
        "name": ["trim", "collapse_whitespace", "title_case"],
        "company": ["trim", "collapse_whitespace", "title_case", "standardize_suffix"],
        "email": ["trim", "lowercase"],
        "phone": ["extract_digits", "format_phone"],
        "date": ["normalize_date"],
        "currency": ["strip_currency", "parse_float"],
        "currency_code": ["trim", "uppercase"],
        "status": ["trim", "lowercase", "map_values"],
        "category": ["trim", "normalize_category"],
        "number": ["extract_digits", "parse_float"],
        "id": ["trim"],
        "text": ["trim", "collapse_whitespace"],
    }

    transforms = [
        TransformAction(
            field=field,
            actions=TYPE_ACTIONS.get(ftype, ["trim"]),
            priority=1,
            null_handling="set_null_if_empty",
        )
        for field, ftype in inferred.items()
    ]

    # Detect likely dedup keys
    dedup_keys = [f for f in inferred if inferred[f] in ("email", "id")]

    return TransformSpec(
        source_format=source_format,
        record_count=record_count,
        sample_size=len(sample),
        schema=schema_map,
        transforms=transforms,
        dedup=DedupConfig(
            enabled=True,
            strategy="exact",
            keys=dedup_keys[:2],
        ),
    )
