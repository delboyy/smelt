# Project Status

**Last updated:** 2026-04-20

## Current phase: Phase 1 complete — full-stack MVP running locally

---

## What's built

### Frontend (Next.js 14 — fully complete)

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js 14 scaffold** | ✅ Complete | App router, TypeScript strict mode, Tailwind CSS, port 3002 |
| **Brand & design system** | ✅ Complete | Dark-only (#09090b), amber #d97706, copper #c2855a, DM Sans + DM Mono |
| **Zustand global store** | ✅ Complete | step, rawData, format, parsed, schema, result, exportFormat, issueFilter |
| **Format detection** | ✅ Complete | Auto-detects JSON, CSV, XML, TSV from content patterns |
| **Parsers** | ✅ Complete | CSV, JSON, XML, TSV — SSR-safe (no DOMParser dependency) |
| **Schema inference** | ✅ Complete | 12 field types inferred from column names + content heuristics |
| **12 normalizers** | ✅ Complete | name, email, phone, date, currency, currency_code, status, company, category, number, id, text |
| **Client-side cleaning engine** | ✅ Complete | Applies all normalizers, exact-match dedup via fingerprint hash |
| **Export formatters** | ✅ Complete | CSV, JSON, XML download |
| **5-step UI flow** | ✅ Complete | Ingest → Preview → Clean → Review → Export |
| **Ingest components** | ✅ Complete | FileDropzone, PasteInput, SampleButtons (CRM/Product/Invoice), FormatBadge |
| **Preview components** | ✅ Complete | SchemaDisplay (field types), DataPreview (paginated table) |
| **Clean components** | ✅ Complete | CleaningProgress spinner |
| **Review components** | ✅ Complete | StatsDashboard (stat cards), IssueFilters, ChangeLog (before/after diff) |
| **Export components** | ✅ Complete | FormatPicker, ExportPreview, DownloadButton, CRMPushTeaser |
| **UI primitives** | ✅ Complete | Badge, Button (gradient), StatCard, DataTable (DM Mono sticky-header) |
| **Header + StepBar** | ✅ Complete | Amber S logo, 5-step progress indicator |
| **Sample data** | ✅ Complete | Built-in CRM contacts CSV, product feed JSON, invoices XML for demos |

### Frontend tests (119 passing)

| Suite | Tests | Status |
|-------|-------|--------|
| normalizers.test.ts | 67 | ✅ All pass |
| detection.test.ts | 25 | ✅ All pass |
| parsers.test.ts | 16 | ✅ All pass |
| cleaning.test.ts | 11 | ✅ All pass |
| **Total** | **119** | ✅ |

### Backend (FastAPI — scaffold complete, AI pipeline stubbed)

| Component | Status | Notes |
|-----------|--------|-------|
| **FastAPI scaffold** | ✅ Complete | App structure, CORS, Pydantic v2 models |
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
| **In-memory job store** | ✅ Complete | `_jobs` dict (dev only — needs Redis/PG for production) |
| **Backend test fixtures** | ✅ Complete | messy_contacts.csv, messy_products.json, messy_invoices.xml |
| **Backend test suite** | ✅ Scaffolded | Unit: detector, parser, normalizers, executor, sampling. Integration: pipeline + API |

### Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| **Docker Compose** | ✅ Complete | Postgres 16 + Redis 7 |
| **GitHub repo** | ✅ Live | [github.com/delboyy/smelt](https://github.com/delboyy/smelt) |
| **README** | ✅ Complete | Quick start, architecture, API reference, field type table, env vars |
| **Context docs** | ✅ Complete | Full doc suite inherited from planning phase |

---

## What still needs to be done

### P0 — Required to go live

| Task | Effort | Notes |
|------|--------|-------|
| **Wire frontend to backend API** | 2 days | Replace client-side cleaning engine calls with fetch to FastAPI endpoints. TanStack Query for loading/error states. |
| **File upload to server** | 1 day | Frontend FileDropzone currently processes files client-side. Needs multipart POST to /api/v1/ingest. Add file size limits + progress bar. |
| **Persistent job store** | 1 day | Replace `_jobs` dict with Redis (or Postgres). Jobs currently lost on server restart. |
| **Register smelt.fyi domain** | 5 min | $6.98/yr on Namecheap. Do immediately. |
| **Deploy backend** | 1 day | Railway, Render, or Fly.io. Add `ANTHROPIC_API_KEY` env var in prod. |
| **Deploy frontend** | 2 hours | Vercel. Set `NEXT_PUBLIC_API_URL` to deployed backend. |
| **ANTHROPIC_API_KEY in .env** | 5 min | Backend planner falls back to rule-based spec without it — works but less intelligent. |

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
| **Backend test coverage** | 2 days | Run pytest, fix failures, add missing cases for executor + integration tests. |

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

1. **Frontend ↔ backend not connected** — The frontend runs the full cleaning pipeline client-side in the browser. The FastAPI backend exists and is complete but isn't wired up yet.
2. **In-memory job store** — Backend `_jobs` dict is lost on restart. Not suitable for production.
3. **No auth** — No user accounts, no job history, no API keys.
4. **No deployment** — Runs locally only. Not accessible at smelt.fyi yet.
5. **No fuzzy dedup** — Exact-match only. Fuzzy matching requires backend.
6. **No Excel support** — .xlsx not yet implemented.
7. **Date ambiguity** — "01/02/2023" defaults to MM/DD/YYYY (US). No locale awareness.
8. **No large file support** — Browser memory limits client-side to ~50k rows.
9. **Backend tests need a run** — Scaffolded but not confirmed passing end-to-end yet.

---

## Technical debt

- Backend `_jobs` is an in-memory dict — replace with Redis before any multi-instance deploy
- Frontend cleaning engine duplicates some logic that now exists in the backend executor — once frontend is wired to API, client-side engine can be retired
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

---

## Timeline (from here)

```
Week 1:   Wire frontend → backend, deploy to Railway + Vercel, register smelt.fyi
Week 2:   Auth (email + Google), landing page, Stripe billing
Week 3:   Salesforce + HubSpot integrations, Celery async workers
Week 4:   Fuzzy dedup, recipe system, accessibility audit
Week 5:   ProductHunt launch prep, SEO content, beta outreach
Week 6:   Launch 🚀
```
