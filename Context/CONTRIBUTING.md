# Contributing

## Development setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for local infra)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# App runs at http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Start the API server
uvicorn app.main:app --reload --port 8000

# Start Celery workers (in a separate terminal)
celery -A app.workers worker --loglevel=info
```

### Database

```bash
# With Docker
docker compose up -d postgres redis

# Run migrations
alembic upgrade head

# Seed sample data (optional)
python scripts/seed.py
```

## Code style

### Python

- Formatter: `black` (line length 120)
- Linter: `ruff`
- Type checker: `mypy --strict`
- Imports: sorted with `isort`

```bash
black . --line-length 120
ruff check .
mypy app/ --strict
```

### TypeScript / React

- Formatter: `prettier`
- Linter: `eslint` with Next.js config
- Strict TypeScript: `"strict": true` in tsconfig

```bash
npm run lint
npm run format
```

### Naming conventions

- **Python:** snake_case for functions, variables, file names. PascalCase for classes.
- **TypeScript:** camelCase for functions, variables. PascalCase for components, types, interfaces.
- **Database:** snake_case for tables and columns.
- **API endpoints:** kebab-case for paths, snake_case for query params and JSON fields.

## Testing

### Backend tests

```bash
cd backend
pytest tests/ -v
pytest tests/ -v --cov=app --cov-report=term-missing
```

Test structure:
```
tests/
├── unit/
│   ├── test_detector.py      # Format + encoding detection
│   ├── test_parser.py        # CSV, JSON, XML parsing
│   ├── test_normalizers.py   # Each field-type normalizer
│   ├── test_planner.py       # LLM transform plan generation
│   ├── test_executor.py      # Polars execution engine
│   └── test_validator.py     # Pre-execution validation
├── integration/
│   ├── test_pipeline.py      # Full ingest → clean → export flow
│   ├── test_api.py           # API endpoint tests
│   └── test_integrations.py  # CRM connector tests (mocked)
└── fixtures/
    ├── messy_contacts.csv
    ├── messy_products.json
    ├── messy_invoices.xml
    └── expected_outputs/
```

### Frontend tests

```bash
cd frontend
npm test
```

Use React Testing Library for component tests. Vitest as the test runner.

### Test data

The `tests/fixtures/` directory contains sample messy datasets covering:
- Mixed date formats
- Inconsistent casing
- Duplicate records
- Missing values / "N/A" strings
- Currency formatting variations
- Phone number format variations
- Unicode / encoding edge cases
- Malformed CSV (unquoted commas, extra columns)
- Nested JSON
- XML with missing closing tags

Every normalizer must have tests for: valid input, empty input, null input, "N/A" input, edge cases specific to that field type.

## Pull request process

1. Create a feature branch from `main`: `git checkout -b feature/your-feature`
2. Write code + tests. Ensure all tests pass.
3. Run linters and formatters. Fix all issues.
4. Write a clear PR description: what it does, why, how to test.
5. Request review. At least one approval required to merge.
6. Squash merge into `main`. Delete the feature branch.

## Commit messages

Use conventional commits:

```
feat: add fuzzy deduplication with Jaro-Winkler similarity
fix: handle edge case where CSV has trailing comma on every row
docs: update API reference with webhook payload format
test: add unit tests for phone number normalizer
refactor: extract transform executor into separate module
chore: update Polars to 0.20.x
```

## Architecture decisions

If you're making a significant architectural change, write an ADR (Architecture Decision Record) in `docs/adr/` before implementing. Format:

```markdown
# ADR-NNN: Title

## Status: Proposed / Accepted / Deprecated

## Context
What is the issue?

## Decision
What did we decide?

## Consequences
What are the trade-offs?
```
