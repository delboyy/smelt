# Smelt

**Raw data in. Pure data out.**

AI-powered universal data cleaning. Drop any messy CSV, JSON, XML, or TSV file and get clean, normalized, export-ready data in seconds.

**Live:** [smelt.fyi](https://smelt.fyi) _(domain setup pending — see [TODO.md](TODO.md))_
**Backend:** `https://smelt-0vgv.onrender.com`

## What it does

Smelt combines a hybrid AI + deterministic pipeline:

1. **Ingest** — drag-drop a file or paste raw data; format auto-detected (CSV/JSON/XML/TSV)
2. **Preview** — inspect detected schema, inferred field types, and a sample of parsed records
3. **Clean** — LLM generates a JSON transform spec from a stratified 100-row sample; Polars executes it on the full dataset
4. **Review** — audit log of every change: rows fixed, fields normalized, duplicates removed
5. **Export** — download full cleaned dataset as CSV, JSON, or XML

The LLM never touches individual data rows — only writes a reusable transform spec (~$0.002 per dataset). Polars executes deterministically and scales to millions of rows.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 · TypeScript · Zustand · TanStack Query |
| Backend | FastAPI · Polars · Pydantic v2 · SQLAlchemy async |
| Auth | NextAuth v4 · bcrypt · JWT · Google OAuth (optional) |
| LLM | OpenRouter (DeepSeek) → Anthropic Claude → rule-based fallback |
| Job store | Redis (24h TTL) + in-memory fallback |
| Database | SQLite (local) · PostgreSQL (prod) |
| Tests | pytest (104 backend) |
| Deploy | Vercel (frontend) · Render (backend, Python 3.11) |

## Quick start (local)

### Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Required for auth to work
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Optional: add LLM key for AI cleaning (falls back to rule-based without it)
export OPENROUTER_API_KEY=sk-or-v1-...
# or
export ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

Database auto-creates as `backend/smelt.db` (SQLite) on first run.

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
# Backend — 104 unit + integration tests
cd backend && NEXTAUTH_SECRET=test pytest tests/ -q
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, pricing, how-it-works |
| `/login` | Login + signup (credentials or Google OAuth) |
| `/app` | Data cleaning tool |

## Project structure

```
smelt/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── login/page.tsx        # Auth (login + signup)
│   │   │   ├── app/page.tsx          # Cleaning tool
│   │   │   ├── api/auth/[...nextauth]/route.ts
│   │   │   └── providers.tsx         # SessionProvider + QueryClient
│   │   ├── components/
│   │   │   ├── ui/                   # Badge, Button, StatCard, DataTable
│   │   │   ├── layout/               # Header (auth-aware), StepBar
│   │   │   ├── ingest/               # FileDropzone, PasteInput, SampleButtons
│   │   │   ├── preview/              # SchemaDisplay, DataPreview
│   │   │   ├── clean/                # CleaningProgress
│   │   │   ├── review/               # StatsDashboard, IssueFilters, ChangeLog
│   │   │   └── export/               # FormatPicker, ExportPreview, DownloadButton
│   │   └── lib/
│   │       ├── api.ts                # Typed API client
│   │       ├── auth.ts               # NextAuth config
│   │       ├── store.ts              # Zustand global state
│   │       └── constants.ts          # Tokens, step definitions, sample data
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest.py             # File upload + raw paste (10 MB limit)
│   │   │   ├── clean.py              # LLM → Polars pipeline
│   │   │   ├── export.py             # CSV / JSON / XML streaming export
│   │   │   ├── jobs.py               # Job status
│   │   │   └── auth.py               # Register + login (JWT)
│   │   ├── core/
│   │   │   ├── job_store.py          # Redis-backed store (24h TTL)
│   │   │   ├── database.py           # SQLAlchemy async engine + session
│   │   │   ├── detector.py           # Format + encoding detection
│   │   │   ├── parser.py             # Multi-format parser (XXE-safe)
│   │   │   ├── sampling.py           # Stratified 100-row sampler
│   │   │   ├── planner.py            # LLM → JSON transform spec
│   │   │   ├── executor.py           # Polars transform executor
│   │   │   └── auditor.py            # Change auditing
│   │   └── models/
│   │       ├── schemas.py            # Pydantic request/response models
│   │       └── user.py               # SQLAlchemy User model
│   └── tests/
│       ├── fixtures/                 # messy_contacts.csv, products.json, invoices.xml
│       ├── unit/                     # detector, parser, executor, sampling
│       └── integration/              # full pipeline + API contract tests
├── TODO.md                           # Manual setup checklist (domain, OAuth, DB, env vars)
└── PROJECT_STATUS.md                 # Phase progress + what's next
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
| `POST` | `/api/v1/ingest` | Upload file (multipart/form-data, max 10 MB) |
| `POST` | `/api/v1/ingest/raw` | Submit raw text/JSON body |
| `POST` | `/api/v1/clean` | Run cleaning pipeline on a job |
| `POST` | `/api/v1/export` | Stream cleaned data (CSV/JSON/XML) |
| `GET` | `/api/v1/job/{id}` | Get job status |
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login → JWT |

Interactive docs at `http://localhost:8000/docs` when running locally.

## Environment variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXTAUTH_SECRET` | **Yes** | — | JWT signing secret. Must match frontend. Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./smelt.db` | PostgreSQL in prod: `postgresql+asyncpg://...` |
| `OPENROUTER_API_KEY` | No | — | Primary LLM (DeepSeek via OpenRouter). Falls back to Anthropic, then rule-based. |
| `ANTHROPIC_API_KEY` | No | — | Fallback LLM if OpenRouter not set. |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Falls back to in-memory store. |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3002` | Comma-separated allowed origins. |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXTAUTH_SECRET` | **Yes** | — | Must match backend value exactly. |
| `NEXTAUTH_URL` | **Yes** | — | Full URL of the frontend (e.g. `https://smelt.fyi`). |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API base URL. |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret. |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | `false` | Set `true` to show "Continue with Google" button. |

## Deploy

### Backend → Render

Backend deploys automatically from `main` via `render.yaml`. Python 3.11 is pinned via `backend/.python-version`.

Set environment variables in Render dashboard → smelt service → Environment.

### Frontend → Vercel

```bash
cd frontend && npx vercel --prod
```

Set environment variables in Vercel dashboard → project → Settings → Environment Variables.

See [TODO.md](TODO.md) for the complete manual setup checklist.

## Design

- **Dark mode only** — `#09090b` background, amber `#d97706` primary, copper `#c2855a` accent
- **DM Sans** for UI text, **DM Mono** for data/code
- Zero external UI libraries — all components hand-written
