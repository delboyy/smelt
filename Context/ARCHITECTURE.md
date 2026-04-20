# Architecture

## System overview

Smelt uses a hybrid AI architecture: an LLM plans the data cleaning strategy by analysing a sample, then deterministic code executes the plan at scale. This gives us the intelligence of AI with the speed and reliability of traditional ETL.

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                  Next.js + React + Tailwind                 │
│                     (Vercel hosting)                        │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Ingest   │ │ Preview  │ │  Review  │ │    Export      │  │
│  │  Upload   │ │ Schema   │ │ Diff UI  │ │ Download/Push │  │
│  │  Paste    │ │ Table    │ │ Filters  │ │ Format picker │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (HTTPS)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│                  Python FastAPI + Polars                     │
│                     (AWS ECS / Lambda)                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  API Layer (FastAPI)                  │   │
│  │  POST /ingest  POST /clean  POST /export  GET /job   │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │              Cleaning Pipeline                       │   │
│  │                                                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌───────┐  │   │
│  │  │ Detect  │→ │ Sample  │→ │ LLM Plan │→ │Validate│ │   │
│  │  │ Format  │  │ 100 rows│  │(Claude)  │  │Against │ │   │
│  │  │Encoding │  │stratified│ │JSON spec │  │Sample  │ │   │
│  │  └─────────┘  └─────────┘  └──────────┘  └───┬────┘ │   │
│  │                                               │      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐      │      │   │
│  │  │ Audit   │← │ Dedup   │← │ Execute  │←─────┘      │   │
│  │  │ Log     │  │ (fuzzy) │  │ (Polars) │              │   │
│  │  └─────────┘  └─────────┘  └──────────┘              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Integration Layer                       │   │
│  │  Salesforce │ HubSpot │ Airtable │ Webhooks │ Zapier │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Async Workers (Celery + Redis)          │   │
│  │  Large file processing │ Scheduled pipelines │ Push  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA STORES                             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ S3       │  │PostgreSQL│  │   Redis    │  │  Claude   │  │
│  │ File     │  │ Metadata │  │   Queue    │  │   API     │  │
│  │ Storage  │  │ Audit log│  │   Cache    │  │ (Anthropic│  │
│  │ Uploads  │  │ Recipes  │  │   Sessions │  │  hosted)  │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Request lifecycle

### Small files (< 5MB) — synchronous

1. User uploads file via `POST /api/v1/ingest`
2. Backend detects format, encoding, parses structure
3. Returns parsed records + inferred schema to frontend
4. User clicks "Smelt" → `POST /api/v1/clean`
5. Backend samples 100 rows, sends to Claude API for transform plan
6. Validates plan against sample, executes via Polars on full dataset
7. Returns cleaned records + audit log + stats
8. User reviews, then exports via `POST /api/v1/export`

### Large files (> 5MB) — asynchronous

1. User uploads file → stored in S3
2. Backend returns a `job_id` immediately
3. Celery worker picks up the job, processes in background
4. Frontend polls `GET /api/v1/job/{job_id}` for status
5. When complete, results are cached and frontend fetches them

## The hybrid AI pipeline (detailed)

### Phase 1: Sample + Analyse

The LLM never sees the full dataset. We extract a stratified sample:

```python
def stratified_sample(df, n=100):
    """
    Pick rows that represent the full diversity of the data.
    - First 10 rows (shows typical structure)
    - Last 10 rows (catches format drift)
    - 10 rows with most null values (edge cases)
    - 10 rows with longest string values (complex data)
    - 60 random rows from the middle
    """
```

The sample is sent to Claude with a structured prompt that asks for a JSON transform spec:

```json
{
  "schema": {
    "full_name": {"type": "name", "confidence": 0.95},
    "email": {"type": "email", "confidence": 0.99},
    "signup_date": {"type": "date", "confidence": 0.92}
  },
  "transforms": [
    {"field": "full_name", "action": "title_case", "trim": true},
    {"field": "email", "action": "lowercase", "trim": true},
    {"field": "signup_date", "action": "normalize_date", "target_format": "YYYY-MM-DD"},
    {"field": "phone", "action": "normalize_phone", "format": "(XXX) XXX-XXXX"},
    {"field": "deal_value", "action": "parse_currency", "output_type": "float"}
  ],
  "dedup": {
    "strategy": "fuzzy",
    "keys": ["full_name", "email"],
    "threshold": 0.85
  }
}
```

### Phase 2: Validate

Before touching the real data, we run the transform spec against the sample:

- Every transform is applied to the 100 sample rows
- We check: no unexpected nulls, types match, row count stable
- If any transform fails validation, it's flagged (not auto-applied)
- The user is shown flagged transforms in the review step

### Phase 3: Execute

The validated spec is translated into Polars operations:

```python
# Each action maps to a deterministic Polars expression
ACTION_MAP = {
    "title_case": lambda col: col.str.to_titlecase().str.strip_chars(),
    "lowercase": lambda col: col.str.to_lowercase().str.strip_chars(),
    "normalize_date": lambda col, fmt: col.str.strptime(Date, fmt),
    "normalize_phone": lambda col, fmt: apply_phone_regex(col, fmt),
    "parse_currency": lambda col: col.str.replace_all(r"[$,]", "").cast(Float64),
}
```

Polars processes millions of rows in seconds. The LLM is never called again after Phase 1.

### Phase 4: Audit

Every change is logged:

```json
{
  "row": 2,
  "field": "signup_date",
  "original": "01-20-2023",
  "cleaned": "2023-01-20",
  "transform": "normalize_date",
  "confidence": 0.95
}
```

## Client-side vs server-side cleaning

For the MVP, small datasets (< 10,000 rows) can be cleaned entirely client-side in the browser using the JavaScript cleaning engine. This means:

- No backend needed for free-tier basic usage
- Zero latency for small files
- No data leaves the user's browser (privacy advantage)

For larger files or Pro features (CRM push, API, scheduled pipelines), the backend handles everything.

## Security model

- Files are encrypted at rest in S3 (AES-256)
- Files are deleted after 24 hours (free tier) or 30 days (Pro)
- PII is redacted before sending samples to the Claude API
- Enterprise tier supports VPC deployment with self-hosted LLM (Llama 3)
- All API endpoints require authentication (JWT) except the anonymous free-tier upload
- Rate limiting: 10 requests/minute for free tier, 100/minute for Pro
