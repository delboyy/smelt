# Smelt Build Prompt

You are building Smelt — an AI-powered universal data cleaning web application at /Users/a1/Projects/Smelt.

## Context
All documentation is in /Users/a1/Projects/Smelt/Context/. The reference MVP is at /Users/a1/Projects/Smelt/Context/smelt.jsx (768 lines). Read ALL docs before writing code.

Key docs (all in /Users/a1/Projects/Smelt/Context/):
- README.md — project overview + directory structure
- PROJECT_STATUS.md — what is built, priority backlog
- ARCHITECTURE.md — hybrid AI pipeline
- TECH_STACK.md — Next.js 14, FastAPI, Polars, Claude API, PostgreSQL
- CLEANING_ENGINE.md — 12 field types, 16 transform actions
- API_REFERENCE.md — REST endpoints
- DATA_MODELS.md — PostgreSQL schema + Pydantic models
- BRAND_GUIDELINES.md — colors, fonts, dark mode
- CONTRIBUTING.md — code style, testing

## PHASE 1A — Next.js Frontend

Scaffold /Users/a1/Projects/Smelt/frontend/ as Next.js 14+ with TypeScript, Tailwind CSS, app router.

Files to create:
1. package.json with: next, react, react-dom, typescript, tailwindcss, @tailwindcss/typography, zustand, @tanstack/react-query, papaparse, @types/papaparse
2. tailwind.config.ts with ALL brand colors
3. src/app/layout.tsx with DM Sans + DM Mono fonts, dark bg, metadata
4. src/app/page.tsx — main cleaning app
5. src/app/globals.css — global styles, scrollbar
6. tsconfig.json
7. next.config.ts
8. postcss.config.mjs

Components (src/components/):
- ui/Badge.tsx — pill badge
- ui/Button.tsx — primary gradient + secondary
- ui/StatCard.tsx — value + label card
- ui/DataTable.tsx — monospace table with sticky header
- ingest/FileDropzone.tsx — drag-drop
- ingest/PasteInput.tsx — textarea
- ingest/SampleButtons.tsx — sample datasets
- preview/SchemaDisplay.tsx — field type display
- preview/DataPreview.tsx — data table
- clean/CleaningProgress.tsx — spinner
- review/ChangeLog.tsx — before/after diffs
- review/IssueFilters.tsx — filter buttons
- review/StatsDashboard.tsx — stats row
- export/FormatPicker.tsx — CSV/JSON/XML
- export/ExportPreview.tsx — code pane
- export/DownloadButton.tsx — download
- export/CRMPushTeaser.tsx — Pro teaser
- layout/StepBar.tsx — 5-step progress bar
- layout/Header.tsx — logo + nav

Lib (src/lib/):
- parsers/csv.ts — port parseCSV from smelt.jsx
- parsers/json.ts — port parseJSON
- parsers/xml.ts — port parseXML
- parsers/tsv.ts — TSV parser
- detection/format.ts — detectFormat()
- detection/schema.ts — inferFieldType()
- normalizers/index.ts — ALL 12 normalizers ported from smelt.jsx
- cleaning/engine.ts — cleanRecords()
- export/formatters.ts — toCSV, toJSON, toXML
- store.ts — Zustand store (step, rawData, format, parsed, schema, result)
- constants.ts — SAMPLES, STEPS, color tokens T

## PHASE 1B — FastAPI Backend

Scaffold /Users/a1/Projects/Smelt/backend/ with:

- app/main.py — FastAPI app with CORS
- app/api/ingest.py — POST /api/v1/ingest
- app/api/clean.py — POST /api/v1/clean
- app/api/export.py — POST /api/v1/export
- app/api/jobs.py — GET /api/v1/job/{id}
- app/core/detector.py — format + encoding detection
- app/core/parser.py — multi-format parser
- app/core/planner.py — Claude API transform spec generator
- app/core/executor.py — Polars execution engine
- app/core/validator.py — pre-execution validation
- app/core/auditor.py — change tracking
- app/core/sampling.py — stratified_sample(df, n=100)
- app/models/schemas.py — ALL Pydantic models from DATA_MODELS.md
- app/config.py — env config
- requirements.txt
- .env.example
- tests/unit/test_detector.py
- tests/unit/test_parser.py
- tests/unit/test_normalizers.py
- tests/unit/test_executor.py
- tests/unit/test_sampling.py
- tests/integration/test_pipeline.py
- tests/integration/test_api.py
- tests/fixtures/messy_contacts.csv
- tests/fixtures/messy_products.json
- tests/fixtures/messy_invoices.xml

## PHASE 1C — Frontend Tests

- src/__tests__/normalizers.test.ts — every normalizer: valid/empty/null/N/A/edge cases
- src/__tests__/parsers.test.ts — CSV/JSON/XML parsing with malformed inputs
- src/__tests__/detection.test.ts — format detection + schema inference
- src/__tests__/cleaning.test.ts — cleanRecords() with sample datasets
- vitest.config.ts — test runner config

## PHASE 1D — Root files

- /Users/a1/Projects/Smelt/docker-compose.yml — postgres + redis
- /Users/a1/Projects/Smelt/README.md — quick start

## Brand rules
- Background: #09090b, Surface: #18181b, SurfaceAlt: #1c1c20
- Border: #27272a, BorderLight: #3f3f46
- Accent: #d97706 (amber), Copper: #c2855a
- Primary buttons: linear-gradient(135deg, #d97706, #c2855a) with dark text (#09090b)
- Text: #fafafa / #a1a1aa / #71717a
- Green #22c55e, Red #ef4444, Blue #3b82f6, Amber #f59e0b
- Cards: border-radius 10px, border 1px solid #27272a, bg #18181b
- Badges: pill shape, 8% opacity bg, full color text, 1px border at 20% opacity
- DM Sans (headings/body) + DM Mono (data/code)
- Dark mode ONLY

## Critical architecture rule
LLM (Claude API) ONLY generates a JSON transform spec from ~100 row sample. NEVER processes individual rows. Polars executes the spec deterministically on full dataset.

## Progress tracking per iteration
Run: find /Users/a1/Projects/Smelt -name "*.ts" -o -name "*.tsx" -o -name "*.py" | grep -v node_modules | grep -v .next | sort

Check what exists, build what is missing. If file exists but is a stub, complete it.

After building frontend, run: cd /Users/a1/Projects/Smelt/frontend && npm install && npm run build
Fix ALL TypeScript errors before finishing.

## Completion signal
When ALL criteria are met:
1. All frontend components exist and are complete (not stubs)
2. All backend modules exist
3. All test files exist with real test cases
4. npm run build passes with 0 errors
5. The app flow works: ingest -> preview -> clean -> review -> export

Output the exact text "SMELT COMPLETE" (without angle brackets) when done.
