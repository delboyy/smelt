# Tech Stack

## Frontend

| Technology | Purpose | Why this choice |
|-----------|---------|-----------------|
| **Next.js 14+** | React framework, app router | Server components for SEO landing pages, client components for the app. Vercel deployment = instant global CDN, zero DevOps. |
| **React 18+** | UI components | Industry standard. Huge ecosystem. Easy to hire for. |
| **Tailwind CSS** | Styling | Rapid iteration, consistent spacing/color system, dark mode built in. Matches our industrial design tokens. |
| **TypeScript** | Type safety | Catch bugs at compile time. Essential for a data tool where type correctness matters. |
| **Zustand** | State management | Lightweight, no boilerplate. Perfect for managing the multi-step cleaning workflow state. |
| **React Query (TanStack)** | Server state / API calls | Handles caching, polling (for async jobs), and optimistic updates cleanly. |
| **Papa Parse** | Client-side CSV parsing | Battle-tested, handles edge cases (quoted fields, BOM, encoding). |
| **Shiki** | Code/data syntax highlighting | For the export preview panel. Lightweight, accurate. |

## Backend

| Technology | Purpose | Why this choice |
|-----------|---------|-----------------|
| **Python 3.11+** | Backend language | Best ecosystem for data processing. Polars, pandas, and LLM libraries are all Python-first. |
| **FastAPI** | API framework | Async by default, auto-generated OpenAPI docs, Pydantic validation, excellent performance. |
| **Polars** | Data processing engine | 10-100x faster than pandas. Lazy evaluation for memory efficiency. Rust-based. Handles millions of rows in seconds. |
| **Pydantic v2** | Data validation + schemas | Defines the transform spec, API request/response models, and database schemas. |
| **Celery** | Async task queue | Handles large file processing, scheduled pipelines, and CRM push jobs in background workers. |
| **Redis** | Queue broker + cache | Fast, reliable. Caches session data, parsed results, and job status. |
| **chardet / charset-normalizer** | Encoding detection | Auto-detects file encoding (UTF-8, Latin-1, Windows-1252, Shift-JIS, etc.) |
| **lxml** | XML parsing | Fast, robust XML parser. Handles malformed XML gracefully. |
| **python-magic** | File type detection | Uses libmagic for reliable format detection beyond file extensions. |

## AI Layer

| Technology | Purpose | Why this choice |
|-----------|---------|-----------------|
| **Anthropic Claude API** (claude-sonnet-4-20250514) | Schema inference + transform planning | Best structured output reliability. JSON mode for consistent transform specs. Cost-effective for the planning-only use case (~$0.002 per dataset). |
| **Llama 3 (self-hosted)** | Enterprise privacy option | For customers who can't send data to external APIs. Runs on-prem or in customer VPC. |

### LLM usage boundaries

The LLM is ONLY used for:
1. Inferring field types from column names + sample values
2. Generating the JSON transform spec
3. AI-powered field mapping for CRM push (matching user columns to CRM object fields)

The LLM is NEVER used for:
- Processing individual rows
- Making per-record decisions
- Generating executable code
- Anything that touches the full dataset

## Database

| Technology | Purpose | Why this choice |
|-----------|---------|-----------------|
| **PostgreSQL 15+** | Primary database | Stores user accounts, cleaning recipes, audit logs, job metadata, billing state. JSONB columns for flexible transform spec storage. |
| **Redis** | Cache + sessions | Fast lookups for job status, parsed data cache, rate limiting counters. |

## Infrastructure

| Technology | Purpose | Why this choice |
|-----------|---------|-----------------|
| **Vercel** | Frontend hosting | Zero-config Next.js deployment. Global edge network. Free tier is generous. |
| **AWS ECS (Fargate)** | Backend containers | Serverless containers. Auto-scales. No EC2 management. |
| **AWS Lambda** | Light API endpoints | For simple endpoints (job status, webhook delivery). Pay-per-invocation. |
| **AWS S3** | File storage | Uploaded files, exported files, cleaning artifacts. Lifecycle policies for auto-deletion. |
| **AWS RDS** | Managed PostgreSQL | Automated backups, failover, scaling. |
| **AWS ElastiCache** | Managed Redis | For Celery broker and caching layer. |

## DevOps / Tooling

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization for backend services |
| **Terraform** | Infrastructure as code for AWS resources |
| **GitHub Actions** | CI/CD — lint, test, build, deploy on push to main |
| **Sentry** | Error tracking and performance monitoring |
| **PostHog** | Product analytics (funnel analysis, feature usage) |
| **Stripe** | Billing and subscription management |

## Third-party integrations (Pro tier)

| Integration | Method | Priority |
|------------|--------|----------|
| **Salesforce** | Bulk API v2 (REST) | P0 — launch integration |
| **HubSpot** | Batch import API | P0 — launch integration |
| **Google Sheets** | Sheets API v4 | P1 — month 2 |
| **Airtable** | REST API | P1 — month 2 |
| **Notion** | Database API | P2 — month 3 |
| **Zapier** | Zapier Platform (trigger + action) | P1 — month 2 |
| **Make** | Custom app module | P2 — month 3 |
| **n8n** | Custom node | P2 — month 3 |
| **PostgreSQL / MySQL** | Direct DB connection (write) | P2 — month 3 |
| **Webhooks** | POST to user-defined URL on completion | P0 — launch feature |

## Environment variables

```env
# App
APP_ENV=production
APP_SECRET_KEY=...
FRONTEND_URL=https://smelt.fyi

# Database
DATABASE_URL=postgresql://user:pass@host:5432/smelt

# Redis
REDIS_URL=redis://host:6379/0

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=smelt-uploads

# AI
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514
LLM_MAX_TOKENS=4096

# Integrations
SALESFORCE_CLIENT_ID=...
SALESFORCE_CLIENT_SECRET=...
HUBSPOT_API_KEY=...

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=...
POSTHOG_API_KEY=...
```
