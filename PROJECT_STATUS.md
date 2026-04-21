# Smelt — Project Status

_Last updated: 2026-04-21_

---

## Phase 1 — Core Pipeline ✅ Complete

Everything needed to go from raw file → cleaned export.

| Area | Status | Notes |
|---|---|---|
| Multi-format ingest (CSV, JSON, XML, TSV) | ✅ | File upload + paste |
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
| Stripe env vars in Render + Vercel | ❌ | See TODO.md §6 |

---

## Manual Setup Remaining (user action required)

See [TODO.md](TODO.md) for step-by-step instructions.

| Task | Urgency | Notes |
|---|---|---|
| Generate + set `NEXTAUTH_SECRET` in Render + Vercel | **Critical** | Auth returns 503 in prod without it |
| Provision PostgreSQL on Render + set `DATABASE_URL` | High | Users table needed in prod |
| Register domain `smelt.fyi` + point DNS to Vercel | High | |
| Google OAuth credentials (Client ID + Secret) | Medium | "Continue with Google" hidden until set |
| Set `CORS_ORIGINS` on Render to production domain | Medium | Currently allows localhost only |
| Stripe account + keys (Day 4) | Low | When ready for billing |

---

## Known Gaps / Tech Debt

| Item | Priority |
|---|---|
| Auth middleware on `/clean` — requests not yet user-scoped | High (needed for tier gating) |
| Rate limiting on API endpoints | Medium |
| Password reset / forgot password flow | Medium |
| `passlib` `crypt` deprecation warning (Python 3.13) | Low |
| Vitest frontend test suite needs update for new pages | Low |

---

## Architecture

```
Browser
  ├── / (landing page)
  ├── /login (NextAuth — credentials + Google)
  └── /app (cleaning tool)
        │
        ▼
FastAPI (Render · Python 3.11)
  ├── /api/v1/ingest       → parser → job store
  ├── /api/v1/clean        → sampler → planner (LLM) → executor (Polars)
  ├── /api/v1/export       → stream CSV / JSON / XML
  ├── /api/v1/job/{id}     → job status
  └── /api/v1/auth/*       → register / login (JWT)
        │
        ├── Redis (job store, 24h TTL) + in-memory fallback
        ├── SQLite (local) / PostgreSQL (prod) — users table
        └── OpenRouter (DeepSeek) → Anthropic → rule-based fallback
```

---

## Deployment

| Service | URL | Status |
|---|---|---|
| Frontend | Vercel (custom domain pending) | ✅ Live |
| Backend | `https://smelt-0vgv.onrender.com` | ✅ Live |
| Database | SQLite (local) · PostgreSQL pending (prod) | ⚠️ No prod DB yet |
