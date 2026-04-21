# Smelt — Project Status

_Last updated: 2026-04-22_

---

## Phase 1 — Core Pipeline ✅ Complete

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
| 104 backend tests | ✅ | |
| Render deployment (backend) | ✅ | Python 3.11 pinned |
| Vercel deployment (frontend) | ✅ | |

---

## Phase 2 — Auth, Landing, Monetisation

### Day 3 — Auth + Landing ✅ Complete

| Area | Status |
|---|---|
| Landing page (`/`) | ✅ |
| Login / signup page with NextAuth | ✅ |
| Backend auth (register, login, JWT) | ✅ |
| User model + SQLite/PostgreSQL | ✅ |
| Security fixes (XXE, CORS, JWT, upload cap) | ✅ |

### Day 4 — Stripe + Tier Gating ❌ Not started

| Area | Status |
|---|---|
| Stripe Checkout + webhook handler | ❌ |
| Row limit enforcement (Free 500 / Pro unlimited) | ❌ |
| Upgrade prompt in UI | ❌ |

---

## Phase 3, Week 1 ✅ Complete

| Feature | Status |
|---|---|
| Fetch from URL (`POST /ingest/url`) + SSRF protection | ✅ |
| Data Quality Score (4-dim scorer, SVG ring, before/after in UI) | ✅ |
| Cleaning History (`GET /jobs` + `/app/history` page) | ✅ |
| Public API Keys (SHA-256 hashed, `/app/settings` management) | ✅ |

---

## Phase 3, Week 2 ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Smart Suggestions (`POST /preview-plan` + toggle cards in Preview) | ✅ | Rule-based; 7 suggestion types |
| Before/After Comparison (toggle in Review step) | ✅ | Original records stored, cleaned/original toggle |
| Shareable Report (`POST /jobs/{id}/share`, public `/report/[token]`) | ✅ | 30-day token, metadata-only (no raw data) |
| Slack notification infrastructure | ✅ | OAuth flow + notification function wired |
| Slack settings UI (connect/disconnect in `/app/settings`) | ✅ | Requires `SLACK_CLIENT_ID` env var |

---

## Phase 3, Week 3 (Next up)

| Feature | Effort | Status |
|---|---|---|
| Airtable sync | 2 days | ❌ |
| Notion sync | 2 days | ❌ |

---

## Phase 4

| Feature | Effort | Status |
|---|---|---|
| Natural language cleaning instructions | 3-4 days | ❌ |
| Email-in (forward to clean) | 2-3 days | ❌ |
| Stripe billing (Day 4) | 2 days | ❌ |
| Recipe marketplace | 3 days | ❌ |
| Scheduled pipelines (Enterprise) | 5 days | ❌ |
| Google Drive / Sheets import+export | 2.5 days | ❌ (needs Google OAuth app verification) |

---

## Manual Setup Remaining

See [TODO.md](TODO.md) for step-by-step instructions.

| Task | Urgency | Notes |
|---|---|---|
| Generate + set `NEXTAUTH_SECRET` in Render + Vercel | **Critical** | Auth returns 503 in prod without it |
| Provision PostgreSQL on Render + set `DATABASE_URL` | High | Users + API keys table needed in prod |
| Register domain `smelt.fyi` + point DNS to Vercel | High | |
| Google OAuth credentials | Medium | "Continue with Google" hidden until set |
| Set `CORS_ORIGINS` on Render to production domain | Medium | |
| Slack app (Client ID + Secret) for Slack integration | Low | See TODO.md §7 |
| Stripe account + keys (Day 4) | Low | When ready for billing |

---

## Architecture

```
Browser
  ├── / (landing page)
  ├── /login (NextAuth)
  ├── /report/[token] (public shareable report — no auth)
  └── /app
        ├── Ingest: Drop file | Paste | Fetch URL
        ├── Preview: Quality score + Schema + Suggestions panel
        ├── Review: Stats + Before/After toggle + Share button
        └── Export: CSV / JSON / XML
        ├── /app/history (paginated cleaning history)
        └── /app/settings (API keys + Slack integration)
              │
              ▼
FastAPI (Render · Python 3.11)
  ├── /api/v1/ingest              → parse → quality score → job store + index
  ├── /api/v1/ingest/url          → SSRF-safe fetch → same pipeline
  ├── /api/v1/preview-plan        → rule-based suggestions from job records
  ├── /api/v1/clean               → LLM → Polars → quality score → Slack notify
  ├── /api/v1/export              → stream CSV / JSON / XML
  ├── /api/v1/jobs                → paginated history
  ├── /api/v1/jobs/{id}/share     → create share token (30d)
  ├── /api/v1/reports/{token}     → public report (metadata only)
  ├── /api/v1/integrations/slack/* → OAuth connect/status/disconnect
  └── /api/v1/auth/*              → register / login / api-keys CRUD
        │
        ├── Redis (job store + job index) + in-memory fallback
        ├── SQLite (local) / PostgreSQL (prod)
        └── OpenRouter → Anthropic → rule-based fallback
```

---

## Known Gaps / Tech Debt

| Item | Priority |
|---|---|
| API key rate limiting (Redis INCR per key on `/clean`) | High |
| User-scoped jobs (currently global index, no per-user filtering) | High |
| Stripe billing + tier enforcement | High (Phase 4) |
| Slack token persistence (currently in-memory only — lost on restart) | Medium |
| Google Drive import (needs Google OAuth app verification, weeks-long process) | Medium |
| `passlib` `crypt` deprecation warning (Python 3.13) | Low |
