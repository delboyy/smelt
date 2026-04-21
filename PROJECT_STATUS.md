# Smelt — Project Status

_Last updated: 2026-04-21_

---

## Phase 1 — Core Pipeline ✅ Complete

Everything needed to go from raw file → cleaned export.

| Area | Status | Notes |
|---|---|---|
| Multi-format ingest (CSV, JSON, XML, TSV) | ✅ | File upload + paste + URL fetch |
| Format + encoding auto-detection | ✅ | |
| Schema inference (12 field types) | ✅ | Rule-based, runs on ingest |
| AI cleaning pipeline | ✅ | OpenRouter (DeepSeek) → Anthropic → rule-based fallback |
| Polars executor (14 transform actions) | ✅ | Deterministic, scalable |
| Stratified 100-row sampler | ✅ | LLM never sees full dataset |
| Audit log / change review step | ✅ | Per-field change counts |
| Export (CSV, JSON, XML) | ✅ | Streaming response |
| Redis job store + in-memory fallback | ✅ | 24h TTL |
| 104 backend tests (unit + integration) | ✅ | |
| Render deployment (backend) | ✅ | Python 3.11 pinned |
| Vercel deployment (frontend) | ✅ | |

---

## Phase 2 — Auth, Landing, Monetisation

### Day 3 — Auth + Landing ✅ Complete

| Area | Status | Notes |
|---|---|---|
| Landing page (`/`) | ✅ | Hero, before/after, pricing, how-it-works, CTA |
| App moved to `/app` | ✅ | |
| Login / signup page (`/login`) | ✅ | Credentials + Google OAuth (conditional) |
| NextAuth v4 integration | ✅ | JWT session strategy |
| Backend auth endpoints | ✅ | `POST /api/v1/auth/register` + `/login` |
| User model + database | ✅ | SQLite local · PostgreSQL prod |
| Pricing tiers defined (Free / Pro / Team) | ✅ | UI only — not yet enforced |
| Security fixes | ✅ | XXE, XML injection, CORS, JWT secret, 10 MB upload cap |

### Day 4 — Stripe + Tier Gating ❌ Not started

| Area | Status | Notes |
|---|---|---|
| Stripe Checkout integration | ❌ | |
| Webhook handler (`/api/v1/billing/webhook`) | ❌ | `checkout.session.completed`, subscription events |
| Tier enforcement on `/clean` and `/export` | ❌ | Row limits: Free 500 · Pro unlimited |
| `rows_used_this_month` counter | ❌ | Reset monthly |
| Upgrade prompt in UI when limit hit | ❌ | |

---

## Phase 3 — Week 1 Features ✅ Complete

### Feature 3: Fetch from URL ✅

| Area | Status |
|---|---|
| `POST /api/v1/ingest/url` backend endpoint | ✅ |
| SSRF protection (block private IPs, scheme validation, 100 MB limit) | ✅ |
| "Fetch URL" tab in ingest step | ✅ |
| `ingestUrl()` in frontend API client | ✅ |

### Feature 7: Data Quality Score ✅

| Area | Status |
|---|---|
| `quality_scorer.py` — completeness, consistency, uniqueness, conformity | ✅ |
| Score included in ingest response (`quality_score`) | ✅ |
| Score included in clean response (`quality_score`) | ✅ |
| Job index tracks `quality_score_before` | ✅ |
| `QualityScore` SVG ring component | ✅ |
| Before score shown in Preview step | ✅ |
| Before/After side-by-side shown in Review step | ✅ |

### Feature 11: Cleaning History Dashboard ✅

| Area | Status |
|---|---|
| `add_to_job_index()` / `get_job_index()` in job store (Redis + in-memory) | ✅ |
| `GET /api/v1/jobs?page=1&limit=20` endpoint | ✅ |
| Job index populated on every ingest | ✅ |
| `/app/history` page with paginated job list | ✅ |
| History link in Header | ✅ |

### Feature 1: Public API Keys ✅

| Area | Status |
|---|---|
| `ApiKey` SQLAlchemy model + `api_keys` table | ✅ |
| `POST /api/v1/auth/api-keys` — generate key (shown once) | ✅ |
| `GET /api/v1/auth/api-keys` — list active keys | ✅ |
| `DELETE /api/v1/auth/api-keys/{id}` — revoke key | ✅ |
| SHA-256 hashing — plaintext never stored | ✅ |
| `/app/settings` page with key management UI | ✅ |
| Account info + email link in Header | ✅ |

---

## Phase 3 — Week 2 (Next up)

| Feature | Effort | Status |
|---|---|---|
| Google Drive / Sheets import | 2.5 days | ❌ |
| Write back to Google Sheets | 0.5 days | ❌ |
| Slack notification on clean complete | 1 day | ❌ |
| Smart suggestions before cleaning | 1.5 days | ❌ |
| Before/after comparison mode (cell-level highlights) | 1 day | ❌ |
| Shareable clean report (public URL) | 1 day | ❌ |

## Phase 3 — Week 3

| Feature | Effort | Status |
|---|---|---|
| Airtable sync | 2 days | ❌ |
| Notion sync | 2 days | ❌ |

## Phase 4

| Feature | Effort | Status |
|---|---|---|
| Natural language cleaning instructions | 3-4 days | ❌ |
| Email-in (forward to clean) | 2-3 days | ❌ |
| Stripe billing (Day 4) | 2 days | ❌ |
| Recipe marketplace | 3 days | ❌ |
| Scheduled pipelines (Enterprise) | 5 days | ❌ |

---

## Manual Setup Remaining (user action required)

See [TODO.md](TODO.md) for step-by-step instructions.

| Task | Urgency | Notes |
|---|---|---|
| Generate + set `NEXTAUTH_SECRET` in Render + Vercel | **Critical** | Auth returns 503 in prod without it |
| Provision PostgreSQL on Render + set `DATABASE_URL` | High | Users + API keys table needed in prod |
| Register domain `smelt.fyi` + point DNS to Vercel | High | |
| Google OAuth credentials (Client ID + Secret) | Medium | "Continue with Google" hidden until set |
| Set `CORS_ORIGINS` on Render to production domain | Medium | Currently allows localhost only |
| Stripe account + keys (Day 4) | Low | When ready for billing |

---

## Architecture

```
Browser
  ├── / (landing page)
  ├── /login (NextAuth — credentials + Google)
  └── /app (cleaning tool)
  │     ├── Ingest: Drop file | Paste | Fetch URL
  │     ├── Preview: Schema + quality score (before)
  │     ├── Review: Stats + quality score (before/after) + audit log
  │     └── Export: CSV / JSON / XML
  ├── /app/history (cleaning history dashboard)
  └── /app/settings (API key management)
        │
        ▼
FastAPI (Render · Python 3.11)
  ├── /api/v1/ingest           → parser → quality score → job store + index
  ├── /api/v1/ingest/url       → SSRF-safe fetch → same pipeline
  ├── /api/v1/clean            → sampler → LLM → executor (Polars) → quality score
  ├── /api/v1/export           → stream CSV / JSON / XML
  ├── /api/v1/job/{id}         → job status
  ├── /api/v1/jobs             → paginated job history
  └── /api/v1/auth/*           → register / login / api-keys (CRUD)
        │
        ├── Redis (job store + job index, 24h TTL) + in-memory fallback
        ├── SQLite (local) / PostgreSQL (prod) — users + api_keys tables
        └── OpenRouter (DeepSeek) → Anthropic → rule-based fallback
```

---

## Deployment

| Service | URL | Status |
|---|---|---|
| Frontend | Vercel (custom domain pending) | ✅ Live |
| Backend | `https://smelt-0vgv.onrender.com` | ✅ Live |
| Database | SQLite (local) · PostgreSQL pending (prod) | ⚠️ No prod DB yet |

---

## Known Gaps / Tech Debt

| Item | Priority |
|---|---|
| API key rate limiting on `/clean` (Redis INCR per key) | High |
| Auth middleware on `/clean` to scope jobs to users | High |
| API key auth middleware to allow programmatic access to all endpoints | High |
| `passlib` `crypt` deprecation warning (Python 3.13) | Low |
| Frontend test suite needs update for new pages (URL tab, history, settings) | Low |
