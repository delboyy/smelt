# Smelt

**Raw data in. Pure data out.**

Smelt is an AI-powered universal data cleaning platform. Drop any messy data file — CSV, JSON, XML, Excel, TSV — and get clean, normalized, export-ready data in seconds. No code required.

**Website:** [smelt.fyi](https://smelt.fyi)

---

## What it does

1. **Ingest** — Drag-and-drop or paste any structured data. Format, encoding, and schema are auto-detected.
2. **Clean** — AI infers field types, normalizes values (dates, phones, emails, names, currencies), deduplicates rows, and flags ambiguous items for human review.
3. **Review** — See every change with before/after diffs, grouped by type. Accept all, reject individual fixes, or go row-by-row.
4. **Export** — Download as CSV, JSON, XML, or Parquet. Or push directly to Salesforce, HubSpot, Airtable via API (Pro tier).

## Who it's for

- **RevOps / Marketing Ops** — Clean vendor CSVs, event attendee lists, lead imports before pushing to CRM.
- **Data Analysts** — Normalize messy datasets without writing pandas scripts.
- **SMB Owners** — Merge and clean customer data from multiple sources.

## Quick start (development)

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Documentation

| Document | Description |
|----------|-------------|
| [Project Overview](docs/PROJECT_OVERVIEW.md) | Vision, problem statement, target users, competitive positioning |
| [Architecture](docs/ARCHITECTURE.md) | System design, hybrid AI engine, data flow diagrams |
| [Tech Stack](docs/TECH_STACK.md) | All technologies, libraries, and infrastructure decisions |
| [API Reference](docs/API_REFERENCE.md) | REST API endpoints, request/response schemas |
| [Cleaning Engine](docs/CLEANING_ENGINE.md) | How the hybrid AI cleaning pipeline works |
| [Data Models](docs/DATA_MODELS.md) | Database schemas, transform specs, audit log structure |
| [GTM & Business](docs/GTM_AND_BUSINESS.md) | Go-to-market strategy, pricing, growth channels, timeline |
| [Brand Guidelines](docs/BRAND_GUIDELINES.md) | Name, tagline, visual identity, tone of voice |
| [Project Status](docs/PROJECT_STATUS.md) | Current state, what's built, what's next, known issues |
| [Contributing](docs/CONTRIBUTING.md) | How to contribute, code style, PR process |

## Project structure

```
smelt/
├── frontend/                # Next.js + React + Tailwind
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   │   ├── ui/          # Reusable UI primitives
│   │   │   ├── ingest/      # File upload, paste, format detection
│   │   │   ├── preview/     # Data table, schema display
│   │   │   ├── clean/       # Cleaning animation, progress
│   │   │   ├── review/      # Diff view, change log, filters
│   │   │   └── export/      # Format picker, download, CRM push
│   │   ├── lib/             # Utilities, client-side cleaning engine
│   │   │   ├── parsers/     # CSV, JSON, XML, TSV parsers
│   │   │   ├── normalizers/ # Field-type normalizers
│   │   │   └── detection/   # Format detection, schema inference
│   │   └── styles/          # Global styles, theme tokens
│   └── public/              # Static assets
│
├── backend/                 # Python FastAPI
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── api/             # Route handlers
│   │   │   ├── ingest.py    # File upload + format detection
│   │   │   ├── clean.py     # Cleaning pipeline orchestration
│   │   │   ├── export.py    # Export + CRM push
│   │   │   └── webhooks.py  # Webhook delivery
│   │   ├── core/            # Business logic
│   │   │   ├── detector.py  # Format + encoding detection
│   │   │   ├── parser.py    # Multi-format parser
│   │   │   ├── planner.py   # LLM-powered transform planner
│   │   │   ├── executor.py  # Deterministic transform executor (Polars)
│   │   │   ├── validator.py # Pre-execution validation
│   │   │   └── auditor.py   # Change tracking + audit log
│   │   ├── integrations/    # CRM connectors
│   │   │   ├── salesforce.py
│   │   │   ├── hubspot.py
│   │   │   └── airtable.py
│   │   ├── models/          # Pydantic models + DB schemas
│   │   ├── workers/         # Celery async tasks
│   │   └── config.py        # Environment config
│   ├── tests/
│   └── requirements.txt
│
├── infra/                   # Infrastructure as code
│   ├── terraform/           # AWS resources
│   └── docker/              # Dockerfiles
│
├── docs/                    # Project documentation
└── README.md
```

## License

Proprietary. All rights reserved.
