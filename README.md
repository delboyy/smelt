# Smelt

**Raw data in. Pure data out.**

AI-powered universal data cleaning. Drop any messy CSV, JSON, XML, or TSV file and get clean, normalized, export-ready data in seconds.

**Live:** [frontend-m0lefzz6z-nathans-projects-6ed76785.vercel.app](https://frontend-m0lefzz6z-nathans-projects-6ed76785.vercel.app) *(backend deploy in progress)*

## What it does

Smelt combines a hybrid AI + deterministic pipeline:

1. **Ingest** — drag-drop a file or paste raw data; format auto-detected (CSV/JSON/XML/TSV)
2. **Preview** — inspect detected schema, inferred field types, and a sample of parsed records
3. **Clean** — Claude API generates a JSON transform spec from a stratified 100-row sample; Polars executes it on the full dataset
4. **Review** — audit log of every change: rows fixed, fields normalized, duplicates removed
5. **Export** — download full cleaned dataset as CSV, JSON, or XML

The LLM never touches individual data rows — only writes a reusable transform spec (~$0.002 per dataset). Polars executes deterministically and scales to millions of rows.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · Zustand · TanStack Query |
| Backend | FastAPI · Polars · Pydantic v2 · Anthropic SDK |
| Job store | Redis (24h TTL, `smelt:job:{id}` keys, in-memory fallback) |
| Tests | Vitest (119 frontend) · pytest (104 backend) · 68 E2E API contract tests |
| Deploy | Vercel (frontend) · Railway (backend) |

## Quick start (local)

### Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start Redis (required for job persistence)
redis-server --daemonize yes

# Optional: add ANTHROPIC_API_KEY for AI cleaning (falls back to rule-based without it)
export ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### Frontend (port 3002)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3002
```

The frontend auto-connects to `http://localhost:8000`. Set `NEXT_PUBLIC_API_URL` to override.

## Running tests

```bash
# Frontend — 119 tests across 4 suites
cd frontend && npm test

# Backend — 104 unit + integration tests
cd backend && pytest tests/ -v
```

## Project structure

```
smelt/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js app router (layout, page, providers)
│   │   ├── components/
│   │   │   ├── ui/                 # Badge, Button, StatCard, DataTable
│   │   │   ├── layout/             # Header, StepBar
│   │   │   ├── ingest/             # FileDropzone, PasteInput, SampleButtons, FormatBadge
│   │   │   ├── preview/            # SchemaDisplay, DataPreview
│   │   │   ├── clean/              # CleaningProgress
│   │   │   ├── review/             # StatsDashboard, IssueFilters, ChangeLog
│   │   │   └── export/             # FormatPicker, ExportPreview, DownloadButton, CRMPushTeaser
│   │   └── lib/
│   │       ├── api.ts              # Typed API client (ingestFile, ingestRaw, cleanJob, downloadExport)
│   │       ├── store.ts            # Zustand global state (incl. jobId, isLoading, error)
│   │       ├── parsers/            # CSV, JSON, XML, TSV parsers
│   │       ├── detection/          # Format detection + schema inference (12 field types)
│   │       ├── normalizers/        # 12 normalizers: name, email, phone, date, currency, …
│   │       ├── cleaning/           # Client-side cleaning engine (fallback)
│   │       ├── export/             # CSV/JSON/XML formatters (used for preview/copy)
│   │       └── constants.ts        # Step definitions, color tokens, sample data
├── backend/
│   ├── app/
│   │   ├── api/                    # REST endpoints: ingest · clean · export · jobs
│   │   ├── core/
│   │   │   ├── job_store.py        # Redis-backed job store (set/get/update, 24h TTL)
│   │   │   ├── detector.py         # Format + encoding detection
│   │   │   ├── parser.py           # Multi-format parser
│   │   │   ├── sampling.py         # Stratified 100-row sampler
│   │   │   ├── planner.py          # Claude API → JSON transform spec
│   │   │   ├── executor.py         # Polars-backed transform executor
│   │   │   ├── validator.py        # Spec validation against sample
│   │   │   └── auditor.py          # Change auditing
│   │   └── models/schemas.py       # Pydantic models
│   ├── tests/
│   │   ├── fixtures/               # messy_contacts.csv, messy_products.json, messy_invoices.xml
│   │   ├── unit/                   # detector, parser, normalizers, executor, sampling
│   │   └── integration/            # full pipeline + API (TestClient)
│   ├── railway.toml                # Railway deploy config
│   └── deploy.sh                   # One-shot Railway deploy script
├── frontend/vercel.json            # Vercel deploy config
└── docker-compose.yml              # Postgres 16 + Redis 7 (alternative to native Redis)
```

## Field types

Smelt auto-detects and normalizes 12 field types:

| Type | Example input | Normalized output |
|---|---|---|
| `name` | `"john doe"` | `"John Doe"` |
| `email` | `"USER@GMAIL.COM"` | `"user@gmail.com"` |
| `phone` | `"555-123-4567"` | `"(555) 123-4567"` |
| `date` | `"01/20/2023"` | `"2023-01-20"` |
| `currency` | `"$120,000"` | `120000` |
| `currency_code` | `"usd"` | `"USD"` |
| `status` | `"actve"` | `"Active"` (fuzzy match) |
| `company` | `"bigco llc"` | `"Bigco LLC"` |
| `category` | `"Food & Beverage"` | `"Food > Beverage"` |
| `number` | `"4.2 stars"` | `4.2` |
| `id` | `"  SKU-001  "` | `"SKU-001"` |
| `text` | `"hello   world"` | `"hello world"` |

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/ingest` | Upload file (multipart/form-data) |
| `POST` | `/api/v1/ingest/raw` | Submit raw text/JSON body |
| `POST` | `/api/v1/clean` | Run cleaning pipeline on a job |
| `POST` | `/api/v1/export` | Stream cleaned data (CSV/JSON/XML) |
| `GET` | `/api/v1/job/{id}` | Get job status |

Interactive docs at `http://localhost:8000/docs` when the backend is running.

## Environment variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | No | — | Claude API key. Without it, falls back to rule-based cleaning. |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection string. Falls back to in-memory store. |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3002` | Allowed frontend origins. |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API base URL. |

## Deploy

### Backend → Railway

```bash
cd backend && ./deploy.sh
```

### Frontend → Vercel

```bash
cd frontend && vercel --prod
# Then set env var:
echo "https://your-backend.railway.app" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

## Design

- **Dark mode only** — `#09090b` background, amber `#d97706` primary, copper `#c2855a` accent
- **DM Sans** for UI text, **DM Mono** for data/code
- Zero external UI libraries — all components hand-written
