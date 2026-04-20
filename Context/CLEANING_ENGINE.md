# Cleaning Engine

## Overview

The cleaning engine is Smelt's core value. It follows a hybrid architecture: an LLM analyses a sample and produces a structured transform plan, then deterministic code executes the plan at scale.

## Supported field types

The engine detects and normalizes these field types:

| Type | Detection signals | Normalization |
|------|-------------------|---------------|
| `name` | Column name contains "name", "client", "contact" | Title case, trim whitespace, collapse multiple spaces |
| `company` | Column name contains "company", "org", "employer" | Title case, standardize suffixes (Corp, Inc, LLC, Ltd) |
| `email` | Column name contains "email"; values contain `@` | Lowercase, trim |
| `phone` | Column name contains "phone", "mobile", "tel" | Extract digits, format as `(XXX) XXX-XXXX` for US numbers |
| `date` | Column name contains "date", "signup", "created", "updated"; date patterns in values | Normalize to ISO 8601 (`YYYY-MM-DD`). Handles: `2023/01/15`, `01-20-2023`, `15/01/2023`, `Feb 5, 2023`, `March 12 2023` |
| `currency` | Column name contains "amount", "price", "revenue", "value", "cost"; `$` prefix in values | Strip currency symbols and commas, parse to float |
| `currency_code` | Column name is "currency" | Uppercase (`usd` → `USD`) |
| `status` | Column name contains "status", "state", "stage" | Capitalize, fix common typos (`actve` → `Active`) |
| `category` | Column name contains "category", "type", "group" | Title case, normalize separators (`/` → ` > `) |
| `number` | Column name contains "rating", "score", "stock", "qty" | Strip non-numeric characters, parse to float |
| `id` | Column name contains "sku", "id", "code", "ref" | Trim only (no case change — IDs are case-sensitive) |
| `text` | Fallback | Trim whitespace, collapse multiple spaces |

## Detection strategy

Detection uses a two-pass approach:

### Pass 1: Column name matching

Check if the column name contains known keywords (case-insensitive). This catches ~80% of fields accurately.

### Pass 2: Content pattern heuristic

For fields not matched by name, sample the values and check for patterns:

- Date patterns: `\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}` or month names
- Currency patterns: `^\$` or `USD|EUR|GBP`
- Email patterns: `.*@.*\..*`
- Phone patterns: sequences of 7-11 digits with optional formatting

### Pass 3 (Pro): LLM inference

For ambiguous fields, send the column name + 10 sample values to the LLM and ask it to classify. This catches non-obvious cases like a column called "dt_jnd" (date joined) or "amt" (amount).

## Transform spec format

The cleaning plan is expressed as a JSON spec, not executable code. This is a deliberate design choice for safety, auditability, and reusability.

```json
{
  "version": "1.0",
  "created_at": "2025-04-20T12:00:00Z",
  "source_format": "CSV",
  "record_count": 2847,
  "sample_size": 100,

  "schema": {
    "full_name": {"detected_type": "name", "confidence": 0.95, "nullable": false},
    "email": {"detected_type": "email", "confidence": 0.99, "nullable": true},
    "phone": {"detected_type": "phone", "confidence": 0.88, "nullable": true},
    "signup_date": {"detected_type": "date", "confidence": 0.92, "nullable": false},
    "deal_value": {"detected_type": "currency", "confidence": 0.97, "nullable": true},
    "status": {"detected_type": "status", "confidence": 0.90, "nullable": false}
  },

  "transforms": [
    {
      "field": "full_name",
      "actions": ["trim", "collapse_whitespace", "title_case"],
      "priority": 1
    },
    {
      "field": "email",
      "actions": ["trim", "lowercase"],
      "null_handling": "set_null_if_empty",
      "priority": 1
    },
    {
      "field": "phone",
      "actions": ["extract_digits", "format_phone"],
      "format_phone": {"pattern": "(XXX) XXX-XXXX", "country": "US"},
      "null_handling": "set_null_if_invalid",
      "priority": 2
    },
    {
      "field": "signup_date",
      "actions": ["normalize_date"],
      "normalize_date": {"target": "YYYY-MM-DD", "source_formats": ["YYYY/MM/DD", "MM-DD-YYYY", "DD/MM/YYYY", "Month DD, YYYY"]},
      "priority": 2
    },
    {
      "field": "deal_value",
      "actions": ["strip_currency", "parse_float"],
      "priority": 1
    },
    {
      "field": "status",
      "actions": ["trim", "lowercase", "map_values"],
      "map_values": {"active": "Active", "actve": "Active", "inactive": "Inactive", "paid": "Paid"},
      "priority": 1
    }
  ],

  "dedup": {
    "enabled": true,
    "strategy": "exact",
    "keys": ["full_name", "email"],
    "normalize_before_compare": true
  }
}
```

## Available transform actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `trim` | Remove leading/trailing whitespace | — |
| `collapse_whitespace` | Replace multiple spaces with single space | — |
| `lowercase` | Convert to lowercase | — |
| `uppercase` | Convert to uppercase | — |
| `title_case` | Capitalize first letter of each word | — |
| `normalize_date` | Parse various date formats to ISO 8601 | `target`, `source_formats` |
| `extract_digits` | Remove all non-digit characters | — |
| `format_phone` | Format digit string as phone number | `pattern`, `country` |
| `strip_currency` | Remove `$`, `,`, currency codes | — |
| `parse_float` | Convert string to floating point number | — |
| `parse_int` | Convert string to integer | — |
| `map_values` | Replace values using a lookup map | `{old: new}` dictionary |
| `set_null_if_empty` | Convert empty strings and "N/A" to null | — |
| `set_null_if_invalid` | Set null if value doesn't match expected pattern | — |
| `standardize_suffix` | Normalize company suffixes (Corp, Inc, LLC) | — |
| `normalize_category` | Clean category separators, title case | `separator` |

## Deduplication

### Exact dedup

Normalize the dedup key columns (lowercase, trim, strip), concatenate, and compare. O(n) with a hash set.

### Fuzzy dedup (Pro tier)

Use Levenshtein distance or Jaro-Winkler similarity on dedup key columns. Configurable threshold (default 0.85). Flag potential duplicates for human review rather than auto-removing.

```python
from rapidfuzz import fuzz

def is_fuzzy_duplicate(row_a, row_b, keys, threshold=0.85):
    scores = []
    for key in keys:
        score = fuzz.ratio(str(row_a[key]).lower(), str(row_b[key]).lower()) / 100
        scores.append(score)
    return (sum(scores) / len(scores)) >= threshold
```

## Confidence scoring

Each transform gets a confidence score (0-100%):

- **90-100%**: High confidence. Auto-applied. Examples: lowercasing emails, trimming whitespace.
- **60-89%**: Medium confidence. Applied but shown in the change log. Examples: date format conversion, company name standardization.
- **Below 60%**: Low confidence. Flagged for human review. Examples: ambiguous date formats (is "01/02/2023" January 2nd or February 1st?), potential false-positive duplicates.

## Cleaning recipes (reusable specs)

When a user cleans a dataset and the result is good, the transform spec can be saved as a "recipe." The recipe stores:

- The schema mapping (column names → field types)
- The transform actions
- The dedup configuration
- Metadata: name, description, source type (e.g., "Salesforce contact export")

Recipes can be applied to future datasets with similar structure, skipping the LLM inference step entirely. This is both faster and cheaper.

Over time, the recipe library becomes Smelt's data flywheel — every cleaning job makes future cleanings better.
