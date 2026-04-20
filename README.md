# Smelt

**Raw data in. Pure data out.**

AI-powered universal data cleaning. Drop any messy CSV, JSON, XML, or TSV file and get clean, normalized, export-ready data in seconds.

## What it does

Smelt combines a hybrid AI + deterministic pipeline:

1. **Ingest** — drag-drop or paste any structured data file; format is auto-detected
2. **Preview** — inspect detected schema, inferred field types, and a sample of parsed records
3. **Clean** — Claude API generates a JSON transform spec from a stratified sample; Polars executes it on the full dataset
4. **Review** — see an audit log of every change: rows fixed, fields normalized, duplicates removed
5. **Export** — download cleaned data as CSV, JSON, or XML

The LLM never touches individual data rows. It only writes a reusable transform spec (~$0.002 per dataset). Polars executes the spec deterministically and scales to millions of rows.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · Zustand · TanStack Query |
| Backend | FastAPI · Polars · Pydantic v2 · Anthropic SDK |
| Infrastructure | PostgreSQL 16 · Redis 7 (Docker Compose) |
| Tests | Vitest (119 frontend tests) · pytest (backend unit + integration) |

## Quick start

### Frontend (port 3002)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3002
```

### Backend (port 8000)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### Infrastructure

```bash
docker compose up -d          # starts Postgres + Redis
```

## Running tests

```bash
# Frontend — 119 tests across 4 suites
cd frontend && npm test

# Backend — unit + integration
cd backend && pytest tests/ -v
```

## Project structure

```
smelt/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js app router (layout + page)
│   │   ├── components/
│   │   │   ├── ui/                 # Badge, Button, StatCard, DataTable
│   │   │   ├── layout/             # Header, StepBar
│   │   │   ├── ingest/             # FileDropzone, PasteInput, SampleButtons, FormatBadge
│   │   │   ├── preview/            # SchemaDisplay, DataPreview
│   │   │   ├── clean/              # CleaningProgress
│   │   │   ├── review/             # StatsDashboard, IssueFilters, ChangeLog
│   │   │   └── export/             # FormatPicker, ExportPreview, DownloadButton, CRMPushTeaser
│   │   ├── lib/
│   │   │   ├── parsers/            # CSV, JSON, XML, TSV parsers
│   │   │   ├── detection/          # Format detection + schema inference (12 field types)
│   │   │   ├── normalizers/        # 12 normalizers: name, email, phone, date, currency, …
│   │   │   ├── cleaning/           # Client-side cleaning engine with dedup
│   │   │   ├── export/             # CSV/JSON/XML formatters
│   │   │   ├── store.ts            # Zustand global state
│   │   │   └── constants.ts        # Step definitions, color tokens, sample data
│   │   └── __tests__/              # 119 Vitest tests
│   ├── tailwind.config.ts          # Smelt brand palette (amber #d97706, copper #c2855a)
│   └── vitest.config.ts
├── backend/
│   ├── app/
│   │   ├── api/                    # REST endpoints: /ingest /clean /export /job
│   │   ├── core/
│   │   │   ├── detector.py         # Format + encoding detection
│   │   │   ├── parser.py           # Multi-format parser
│   │   │   ├── sampling.py         # Stratified 100-row sampler
│   │   │   ├── planner.py          # Claude API → JSON transform spec
│   │   │   ├── executor.py         # Polars-backed transform executor
│   │   │   ├── validator.py        # Spec validation against sample
│   │   │   └── auditor.py          # Change auditing
│   │   └── models/schemas.py       # Pydantic models
│   └── tests/
│       ├── fixtures/               # messy_contacts.csv, messy_products.json, messy_invoices.xml
│       ├── unit/                   # detector, parser, normalizers, executor, sampling
│       └── integration/            # full pipeline + API (TestClient)
├── docker-compose.yml              # Postgres 16 + Redis 7
└── Context/                        # Product documentation and MVP reference
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
| `POST` | `/api/v1/ingest` | Upload file (multipart) |
| `POST` | `/api/v1/ingest/raw` | Submit raw text/JSON body |
| `POST` | `/api/v1/clean` | Run cleaning pipeline on a job |
| `POST` | `/api/v1/export` | Export cleaned data (CSV/JSON/XML) |
| `GET` | `/api/v1/job/{id}` | Get job status and results |

Interactive docs at `http://localhost:8000/docs` when the backend is running.

## Design

- **Dark mode only** — #09090b background, amber #d97706 primary, copper #c2855a accent
- **DM Sans** for UI text, **DM Mono** for data/code
- Zero external UI libraries — all components hand-written with Tailwind inline styles

## Environment variables

Copy `backend/.env.example` and fill in:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://smelt:smelt@localhost:5432/smelt
REDIS_URL=redis://localhost:6379
```
