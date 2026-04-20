# Project Status

**Last updated:** 2026-04-20

## Current phase: MVP

### What's built

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend MVP (React/JSX)** | ✅ Complete | Single-file React component with full cleaning flow. Runs client-side. See `/frontend/smelt.jsx`. |
| **Format detection** | ✅ Complete | Auto-detects JSON, CSV, XML, TSV from content patterns (not just file extension). |
| **Schema inference** | ✅ Complete | Rule-based detection of 12 field types from column names + content heuristics. |
| **Cleaning engine** | ✅ Complete | 14 normalizer functions covering name, email, phone, date, currency, status, company, category, number, ID, currency_code, text. |
| **Deduplication** | ✅ Complete | Exact-match dedup with normalized fingerprinting. |
| **Review UI** | ✅ Complete | Change log with before/after diffs, filterable by type, stat cards. |
| **Export** | ✅ Complete | JSON, CSV, XML formatters with download. |
| **Brand identity** | ✅ Complete | Name (Smelt), domain (smelt.fyi), colors, typography, tone of voice. |
| **Documentation** | ✅ Complete | Full doc suite: architecture, tech stack, API reference, data models, cleaning engine, GTM, brand, project status, contributing guide. |

### What's next (priority order)

| Component | Priority | Effort | Notes |
|-----------|----------|--------|-------|
| **Register smelt.fyi domain** | P0 | 5 min | $6.98/yr on Namecheap. Do this immediately. |
| **Next.js project scaffold** | P0 | 1 day | Set up the real project: Next.js + Tailwind + TypeScript. Port the JSX MVP into proper component structure. |
| **FastAPI backend scaffold** | P0 | 1 day | Set up Python project: FastAPI + Polars + Pydantic. Implement `/ingest`, `/clean`, `/export` endpoints. |
| **File upload (server-side)** | P0 | 2 days | Handle file uploads via S3. Support larger files. Add encoding detection with chardet. |
| **LLM-powered schema inference** | P1 | 3 days | Replace rule-based inference with Claude API call for ambiguous fields. Implement the stratified sampling strategy. |
| **Transform spec generator** | P1 | 3 days | LLM generates JSON transform spec from sample. Validate against sample before execution. |
| **Polars execution engine** | P1 | 2 days | Translate transform spec into Polars operations. Process full datasets server-side. |
| **PostgreSQL setup** | P1 | 1 day | Database schema, migrations (Alembic), job tracking, audit log storage. |
| **User auth** | P1 | 2 days | Email/password + OAuth (Google). JWT tokens. Session management. |
| **Landing page** | P1 | 2 days | Marketing landing page at smelt.fyi. Clear value prop, demo video, pricing section. |
| **Stripe billing** | P2 | 2 days | Pro tier subscription. Usage tracking. Overage billing. |
| **Salesforce integration** | P2 | 3 days | OAuth flow, Bulk API v2, field mapping UI, upsert support. |
| **HubSpot integration** | P2 | 2 days | API key auth, batch import, contact/company creation. |
| **Webhook delivery** | P2 | 1 day | POST cleaned data to user-defined URL on job completion. |
| **Celery workers** | P2 | 2 days | Async processing for large files, CRM push jobs. |
| **Zapier integration** | P3 | 3 days | Build Zapier app: trigger (file cleaned) + action (clean data). |
| **Fuzzy dedup** | P3 | 2 days | Jaro-Winkler or Levenshtein similarity matching with configurable threshold. |
| **Recipe system** | P3 | 2 days | Save, load, and share cleaning templates. Recipe marketplace UI. |
| **Scheduled pipelines** | P3 | 5 days | Watch S3/SFTP/URL. Cron-based scheduling. Auto-clean on arrival. Enterprise feature. |

### Known limitations (current MVP)

1. **Client-side only** — Everything runs in the browser. No backend, no persistence, no auth.
2. **No LLM integration** — Schema inference is purely rule-based. The hybrid AI architecture is designed but not implemented.
3. **No CRM push** — Export is download-only. CRM integrations are shown as a teaser.
4. **No large file support** — Browser memory limits processing to ~50k rows. Backend needed for larger datasets.
5. **No fuzzy dedup** — Only exact-match deduplication. Fuzzy matching requires the rapidfuzz library (server-side).
6. **No Excel support** — .xlsx parsing requires SheetJS or openpyxl. Designed for but not implemented.
7. **Date format ambiguity** — "01/02/2023" is interpreted as MM/DD/YYYY (US convention). No locale awareness yet.
8. **No undo** — Once cleaning is applied, there's no undo. The review step is the safeguard.

### Technical debt

- The frontend MVP is a single 800-line JSX file. Needs to be decomposed into proper component hierarchy.
- No tests. Need unit tests for every normalizer, parser, and the detection engine.
- No error boundaries in the React components.
- No accessibility audit. Need ARIA labels, keyboard navigation, screen reader support.
- No i18n. UI is English-only. Date format detection should be locale-aware.

## Timeline

```
Week 1-2:   Next.js scaffold + FastAPI backend + file upload
Week 3-4:   LLM integration + Polars engine + database
Week 5-6:   Auth + landing page + Stripe billing
Week 7-8:   Salesforce + HubSpot integrations
Week 9-10:  Zapier + webhooks + polish
Week 11-12: ProductHunt launch prep + SEO content
```

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-20 | Name: Smelt | All other candidates (DataForge, Scrubly, CleanPipe, Tidy, Norma, Refinery) were taken or had SEO conflicts. "Smelt" has zero competition in data tooling. |
| 2026-04-20 | Domain: smelt.fyi | smelt.com is taken (registered since 1999). smelt.fyi is $6.98/yr and the .fyi extension fits the product ("for your information"). |
| 2026-04-20 | Platform: Web SaaS | Target users (ops teams, analysts) won't install desktop software. Web = zero friction, instant updates, built-in analytics. |
| 2026-04-20 | Architecture: Hybrid AI | Sending every row through an LLM is too slow and expensive. LLM plans, deterministic code executes. ~$0.002 per dataset vs $5-50 for naive approach. |
| 2026-04-20 | Pricing: $0/$59/custom | Free tier hooks users. $59/mo is below expense-report threshold. Enterprise is custom for procurement. |
| 2026-04-20 | GTM: PLG first | No sales team until enterprise demand proves itself. SEO + ProductHunt + community is the acquisition strategy. |
| 2026-04-20 | AI provider: Claude (Anthropic) | Best structured output reliability for JSON transform specs. Competitive pricing. |
| 2026-04-20 | Data processing: Polars over pandas | 10-100x faster, lower memory usage, Rust-based. Essential for processing large datasets quickly. |
