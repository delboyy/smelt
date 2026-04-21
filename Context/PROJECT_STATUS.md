# Project Status

**Last updated:** 2026-04-21

## Current phase: Phase 2 in progress — frontend wired, Redis live, frontend deployed

---

## What's built

### Frontend (Next.js 14 — fully complete + wired to backend)

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js 14 scaffold** | ✅ Complete | App router, TypeScript strict mode, Tailwind CSS, port 3002 |
| **Brand & design system** | ✅ Complete | Dark-only (#09090b), amber #d97706, copper #c2855a, DM Sans + DM Mono |
| **Zustand global store** | ✅ Complete | step, rawData, format, parsed, schema, result, exportFormat, issueFilter, **jobId, isLoading, error** |
| **API client (lib/api.ts)** | ✅ Complete | ingestFile, ingestRaw, cleanJob, downloadExport — typed, error-handled |
| **QueryClientProvider** | ✅ Complete | TanStack Query wired in providers.tsx |
| **Format detection** | ✅ Complete | Auto-detects JSON, CSV, XML, TSV from content patterns |
| **Parsers** | ✅ Complete | CSV, JSON, XML, TSV — SSR-safe (no DOMParser dependency) |
| **Schema inference** | ✅ Complete | 12 field types inferred from column names + content heuristics |
| **12 normalizers** | ✅ Complete | name, email, phone, date, currency, currency_code, status, company, category, number, id, text |
| **Client-side cleaning engine** | ✅ Retained | Still available as fallback; active pipeline now uses backend |
| **Export formatters** | ✅ Complete | CSV, JSON, XML — used for preview/copy; download fetches from API |
| **5-step UI flow** | ✅ Complete | Ingest → Preview → Clean → Review → Export — all steps call backend |
| **FileDropzone** | ✅ Updated | Now passes File object to API (was reading as text client-side) |
| **DownloadButton** | ✅ Updated | Now takes onDownload callback; downloads full dataset from /export endpoint |
| **Error states** | ✅ Complete | Error banner on Ingest step, error panel on Review step |
| **Loading states** | ✅ Complete | Upload spinner on Ingest, CleaningProgress on Review |

### Frontend tests (119 passing)

| Suite | Tests | Status |
|-------|-------|--------|
| normalizers.test.ts | 67 | ✅ All pass |
| detection.test.ts | 25 | ✅ All pass |
| parsers.test.ts | 16 | ✅ All pass |
| cleaning.test.ts | 11 | ✅ All pass |
| **Total** | **119** | ✅ |

### Backend (FastAPI — fully wired, Redis-backed)

| Component | Status | Notes |
|-----------|--------|-------|
| **FastAPI scaffold** | ✅ Complete | App structure, CORS (allows localhost:3002 + prod domain) |
| **Pydantic schemas** | ✅ Complete | TransformSpec, FieldSchema, TransformAction, DedupConfig, CleaningStats, AuditEntry, IngestResponse, CleanRequest, ExportRequest |
| **Format detector** | ✅ Complete | MIME type + content pattern detection |
| **Multi-format parser** | ✅ Complete | CSV, JSON, XML, TSV server-side parsing |
| **Stratified sampler** | ✅ Complete | 100-row sample: first 10, last 10, 10 most-null, 10 longest-value, 60 random |
| **Transform planner** | ✅ Complete | Calls Claude API → JSON transform spec; falls back to rule-based spec if no API key |
| **Polars executor** | ✅ Complete | Executes transform spec deterministically on full dataset via Polars |
| **Spec validator** | ✅ Complete | Validates spec against sample before full execution |
| **Auditor** | ✅ Complete | Logs every field change: row, field, before, after |
| **Ingest API** | ✅ Complete | POST /api/v1/ingest (file upload), POST /api/v1/ingest/raw (JSON body) |
| **Clean API** | ✅ Complete | POST /api/v1/clean — full pipeline: sample → plan → validate → execute → audit |
| **Export API** | ✅ Complete | POST /api/v1/export — streams CSV/JSON/XML response |
| **Job API** | ✅ Complete | GET /api/v1/job/{id} — job status and results |
| **Redis job store** | ✅ Complete | `smelt:job:{id}` keys, 24h TTL, graceful in-memory fallback if Redis is down |
| **Executor bug fixes** | ✅ Fixed | parse_float/parse_int now strip non-numeric chars before conversion ("500+" → 500.0) |
| **Suffix normalizer fix** | ✅ Fixed | _standardize_company_suffix no longer uppercases Inc/Corp |
| **Backend test fixtures** | ✅ Complete | messy_contacts.csv, messy_products.json, messy_invoices.xml |
| **Backend test suite** | ✅ All passing | 104/104 — unit: detector, parser, normalizers, executor, sampling; integration: pipeline + API |

### E2E API contract tests

| Suite | Tests | Status |
|-------|-------|--------|
| Health + CORS | 3 | ✅ |
| Ingest (CSV/JSON/XML/errors) | 16 | ✅ |
| Clean pipeline + data contract | 17 | ✅ |
| Export (CSV/JSON/XML/errors) | 13 | ✅ |
| Job status | 4 | ✅ |
| Frontend data contract | 15 | ✅ |
| **Total** | **68** | ✅ |

### Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| **Redis** | ✅ Running locally | brew-installed, port 6379, 24h job TTL |
| **Docker Compose** | ✅ Available | Postgres 16 + Redis 7 (Docker not running locally — using native Redis) |
| **GitHub repo** | ✅ Live | [github.com/delboyy/smelt](https://github.com/delboyy/smelt) |
| **Frontend — Vercel** | ✅ Deployed | https://frontend-m0lefzz6z-nathans-projects-6ed76785.vercel.app |
| **Backend — Railway** | ⏳ Pending | `railway login` requires interactive terminal — run `cd backend && ./deploy.sh` |
| **NEXT_PUBLIC_API_URL** | ⏳ Pending | Set via `vercel env add` once Railway URL is known |
| **Custom domain (smelt.fyi)** | ⏳ Pending | Register on Namecheap, point to Vercel |

---

## What still needs to be done

### P0 — Required to go live (remaining)

| Task | Effort | Notes |
|------|--------|-------|
| **Deploy backend to Railway** | 30 min | Run `cd backend && ./deploy.sh` — needs interactive login |
| **Set NEXT_PUBLIC_API_URL** | 5 min | `vercel env add NEXT_PUBLIC_API_URL production` then redeploy |
| **Register smelt.fyi** | 5 min | $6.98/yr on Namecheap. Do immediately. |
| **ANTHROPIC_API_KEY in Railway** | 5 min | Set via Railway dashboard or CLI during deploy |

### P1 — Core product quality

| Task | Effort | Notes |
|------|--------|-------|
| **User auth** | 2 days | Email/password + Google OAuth. JWT tokens. Store job history per user. |
| **Landing page** | 2 days | Marketing page at smelt.fyi. Value prop, demo, pricing. |
| **Large file support** | 2 days | Streaming parse for files >10MB. Chunk upload. Progress indicator. |
| **Excel (.xlsx) support** | 1 day | SheetJS (frontend) or openpyxl (backend). |
| **Celery workers** | 2 days | Move clean pipeline to async Celery task. Poll job status from frontend. |
| **Stripe billing** | 2 days | Free / $59 Pro. Usage tracking. Overage for large datasets. |
| **Error boundaries** | 1 day | React error boundaries on each step. Graceful fallback UI. |
| **Accessibility audit** | 1 day | ARIA labels, keyboard nav, screen reader support. |

### P2 — Growth features

| Task | Effort | Notes |
|------|--------|-------|
| **Salesforce integration** | 3 days | OAuth, Bulk API v2, field mapping UI, upsert. |
| **HubSpot integration** | 2 days | API key auth, batch import, contact/company creation. |
| **Webhook delivery** | 1 day | POST cleaned data to user URL on job completion. |
| **Fuzzy deduplication** | 2 days | Jaro-Winkler / Levenshtein with configurable threshold. Needs backend (rapidfuzz). |
| **Recipe system** | 3 days | Save, name, and share cleaning templates. Recipe marketplace. |
| **Zapier integration** | 3 days | Trigger (file cleaned) + action (clean data). |

### P3 — Enterprise / scale

| Task | Effort | Notes |
|------|--------|-------|
| **Scheduled pipelines** | 5 days | Watch S3/SFTP/URL. Cron scheduling. Auto-clean on arrival. |
| **Locale-aware date parsing** | 1 day | "01/02/2023" is ambiguous without locale. User preference or auto-detect. |
| **i18n** | 3 days | UI translations. |
| **Audit log persistence** | 1 day | Store full audit trail in Postgres. Queryable per job/user. |

---

## Known limitations (current state)

1. **Backend not deployed yet** — Railway deploy requires interactive login. Run `cd backend && ./deploy.sh`.
2. **Frontend points to localhost** — `NEXT_PUBLIC_API_URL` not set on Vercel yet. Set after Railway deploy.
3. **No auth** — No user accounts, no job history, no API keys.
4. **No Excel support** — .xlsx not yet implemented.
5. **Date ambiguity** — "01/02/2023" defaults to MM/DD/YYYY (US). No locale awareness.
6. **No large file support** — Browser posts full file to server; memory cap at ~50MB.
7. **No fuzzy dedup** — Exact-match only. Fuzzy matching requires rapidfuzz on backend.

---

## Technical debt

- Frontend client-side cleaning engine (`lib/cleaning/engine.ts`) now duplicates backend executor logic — can be retired once the API is the sole pipeline
- No React error boundaries yet
- No accessibility audit
- `next-env.d.ts` is auto-generated by Next.js and should not be manually edited

---

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-20 | Name: Smelt | All other candidates (DataForge, Scrubly, CleanPipe, Tidy, Norma, Refinery) were taken or had SEO conflicts. "Smelt" has zero competition in data tooling. |
| 2026-04-20 | Domain: smelt.fyi | smelt.com is taken (registered since 1999). smelt.fyi is $6.98/yr and .fyi fits the product. |
| 2026-04-20 | Platform: Web SaaS | Target users (ops teams, analysts) won't install desktop software. Web = zero friction, instant updates. |
| 2026-04-20 | Architecture: Hybrid AI | LLM plans, Polars executes. ~$0.002 per dataset vs $5-50 for naive row-by-row approach. |
| 2026-04-20 | Pricing: $0/$59/custom | Free tier hooks users. $59/mo is below expense-report threshold. |
| 2026-04-20 | GTM: PLG first | SEO + ProductHunt + community. No sales team until enterprise demand proves itself. |
| 2026-04-20 | AI provider: Claude (Anthropic) | Best structured output reliability for JSON transform specs. |
| 2026-04-20 | Data processing: Polars | 10-100x faster than pandas, lower memory, Rust-based. Scales to millions of rows. |
| 2026-04-20 | Port: 3002 | Port 3000/3001/3004 used by other local projects. |
| 2026-04-20 | Phase 1 scope: client-side first | Built full working product in the browser before wiring to backend. Validates UX before infra investment. |
| 2026-04-21 | Job store: Redis | 24h TTL, smelt:job:{id} keys, graceful in-memory fallback. Survives server restarts. |
| 2026-04-21 | Deploy: Vercel (FE) + Railway (BE) | Vercel = zero-config Next.js. Railway = simple Docker/Nixpacks deploy with managed Redis addon. |
