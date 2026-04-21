# Smelt — Claude Code Instructions

## Rule: Always update docs after every change

After **every** implementation task — no exceptions — update:

1. **`PROJECT_STATUS.md`** (repo root) — mark completed features ✅, update "what's next", note any new manual tasks
2. **`README.md`** (repo root) — update pages table, API table, env vars, and project structure if anything changed
3. **`TODO.md`** (repo root) — add any new manual steps the user needs to do (OAuth keys, env vars, DNS, etc.)
4. **`Context/FEATURE_ANALYSIS.md`** — do NOT modify (it is the source spec); read it, don't rewrite it

Commit the doc updates in the **same commit** as the feature code, not as a separate commit.

---

## Project overview

Smelt is an AI-powered data cleaning SaaS. FastAPI backend + Next.js 14 frontend.

- **Repo:** github.com/delboyy/smelt
- **Frontend:** Vercel → smelt.fyi (domain pending)
- **Backend:** Render → https://smelt-0vgv.onrender.com
- **Spec docs:** `Context/` folder — read these before building any feature

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 · TypeScript · Zustand · TanStack Query |
| Backend | FastAPI · Polars · SQLAlchemy async · Pydantic v2 |
| Auth | NextAuth v4 · bcrypt · JWT · Google OAuth (optional) |
| LLM | OpenRouter (DeepSeek) → Anthropic → rule-based fallback |
| Job store | Redis + in-memory fallback |
| Database | SQLite (local) · PostgreSQL (prod) |
| Deploy | Vercel (FE) · Render (BE, Python 3.11) |

---

## Key files

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app, CORS, lifespan (init_db) |
| `backend/app/api/ingest.py` | File/paste/URL ingest endpoints |
| `backend/app/api/clean.py` | LLM → Polars cleaning pipeline |
| `backend/app/api/export.py` | CSV/JSON/XML streaming export |
| `backend/app/api/auth.py` | Register/login/API keys |
| `backend/app/api/jobs.py` | Job status + history index |
| `backend/app/core/job_store.py` | Redis-backed job store + job index |
| `backend/app/core/quality_scorer.py` | Data quality scoring (4 dimensions) |
| `backend/app/models/user.py` | User SQLAlchemy model |
| `backend/app/models/api_key.py` | ApiKey SQLAlchemy model |
| `frontend/src/app/app/page.tsx` | Main cleaning tool (5-step wizard) |
| `frontend/src/lib/store.ts` | Zustand global state |
| `frontend/src/lib/api.ts` | Typed API client |
| `frontend/src/lib/constants.ts` | Design tokens (T.*), step definitions |

---

## Design rules

- **Dark mode only.** Background `#09090b`, surface `#18181b`, border `#27272a`
- **Accent:** amber `#d97706` (primary), copper `#c2855a` (secondary)
- **Fonts:** DM Sans (UI), DM Mono (data/code)
- **No external UI libs** — all components are hand-written inline styles
- Use the `T` constant from `@/lib/constants` for all colours
- No comments in code unless the WHY is non-obvious

---

## Dev workflow

```bash
# Backend tests (must pass before every commit)
cd backend && source .venv/bin/activate && NEXTAUTH_SECRET=test python -m pytest tests/ -q

# TypeScript check
cd frontend && npx tsc --noEmit

# Run backend locally
cd backend && source .venv/bin/activate && NEXTAUTH_SECRET=dev uvicorn app.main:app --reload --port 8000

# Run frontend locally
cd frontend && npm run dev
```

---

## Environment variables

### Backend (Render)
| Variable | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | **Yes** | JWT signing — must match frontend |
| `DATABASE_URL` | No | Defaults to SQLite; set `postgresql+asyncpg://...` in prod |
| `OPENROUTER_API_KEY` | No | Primary LLM |
| `ANTHROPIC_API_KEY` | No | Fallback LLM |
| `REDIS_URL` | No | Falls back to in-memory |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

### Frontend (Vercel)
| Variable | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | **Yes** | Must match backend |
| `NEXTAUTH_URL` | **Yes** | `https://smelt.fyi` in prod |
| `NEXT_PUBLIC_API_URL` | No | Defaults to `http://localhost:8000` |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | Set `true` to show Google button |

---

## Feature implementation order

See `Context/FEATURE_ANALYSIS.md` for full specs on every feature.

**Phase 3 Week 1** ✅ Done — URL ingest, quality score, history, API keys  
**Phase 3 Week 2** — Smart suggestions, before/after comparison, shareable report, Google Drive, Slack  
**Phase 3 Week 3** — Airtable, Notion  
**Phase 4** — Natural language instructions, email-in, recipes, scheduled pipelines
