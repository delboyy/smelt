# Project Overview

## Vision

Smelt is the fastest way to turn messy data into clean, usable data. No code, no consultants, no enterprise contracts. Drop a file, get clean data back.

## Problem statement

Dirty data costs the US economy approximately $3.1 trillion annually (IBM). Data professionals spend up to 80% of their time cleaning and organizing data rather than extracting insights. The tools that exist today fall into three buckets, all of which leave a gap:

- **Enterprise platforms** (Informatica, Talend, Alteryx) — $50k-500k/year, require consultants, 6-month implementation cycles. Overkill for 95% of use cases.
- **Developer tools** (dbt, Great Expectations, pandas) — Require engineering skills. Ops teams can't use them without filing an engineering ticket.
- **No-code workflow tools** (Zapier, Make, Parabola) — Can move data between apps but lack deep cleaning capabilities. Fall apart on messy, inconsistent data.

The gap: there is no self-service, AI-powered tool where a non-technical user can drop a messy file and get clean data back in under 60 seconds.

## Target users

### Primary: RevOps and Marketing Ops (the wedge)

- Receive messy vendor CSVs, event attendee lists, lead imports weekly
- Need to clean data before importing into Salesforce, HubSpot, or other CRM
- Currently spend hours in Excel manually fixing formatting, deduplicating, standardizing
- Not engineers — they can't write Python scripts
- Willing to pay $59/month for a tool that saves them 5+ hours per week

### Secondary: Data Analysts

- Comfortable with SQL but don't want to write pandas cleanup scripts for every new data source
- Need reproducible, auditable cleaning for compliance-sensitive datasets
- Value the schema inference and audit trail features

### Tertiary: SMB Owners

- Merging customer data from multiple systems (POS, email, spreadsheets)
- No technical staff to build data pipelines
- Need simple, affordable data hygiene

## Competitive positioning

### What exists (and why it's not enough)

| Tool | Type | Strengths | Weaknesses | Price |
|------|------|-----------|------------|-------|
| OpenRefine | Open source desktop | Free, powerful transformations | Steep learning curve, no collaboration, desktop-only | Free |
| Flatfile | Embeddable CSV importer | Good onboarding UX, AI-assisted | Only CSV, focused on import not general cleaning | $$$$ |
| Osmos | AI data engineering | Smart schema mapping | Acquired by Microsoft, locked into Fabric ecosystem | N/A |
| Trifacta/Alteryx | Enterprise data prep | Comprehensive, enterprise-grade | $50k+/year, complex, requires training | $$$$$ |
| Parabola | No-code workflow | Visual, drag-and-drop | Limited cleaning depth, no AI normalization | $$ |

### Smelt's position

Smelt sits in the gap between "too simple" (Zapier) and "too complex" (Informatica). It's the tool for the 90% of data cleaning jobs that don't need an enterprise platform but do need more than a spreadsheet.

**Key differentiators:**
1. **Any format in, any format out** — not just CSV. JSON, XML, Excel, TSV, and eventually EDI, fixed-width, Parquet.
2. **AI-powered schema inference** — the LLM understands that "signup_dt" is a date field and "amt" is currency, without configuration.
3. **Hybrid AI architecture** — LLM plans the cleaning, deterministic code executes it. Fast, cheap, reliable.
4. **Full audit trail** — every change is logged with before/after values. Enterprise-ready transparency.
5. **CRM-ready export** — don't just download a file. Push directly to Salesforce, HubSpot, Airtable with AI-powered field mapping.

## Market size

- **Data Wrangling Market:** $4.09B in 2025 → $11.49B by 2034 (CAGR 12.16%)
- **Data Integration Market:** $17.58B in 2025 → $33.24B by 2030 (CAGR 13.6%)

## Key risks

1. **Big tech feature replication** — Snowflake, Databricks, or Microsoft could add a native "magic clean" button. Mitigation: build deep workflow integrations that create switching costs.
2. **LLM hallucination** — the AI could suggest incorrect transformations. Mitigation: the hybrid architecture means the LLM only plans; deterministic code executes. The review step catches errors before they hit production.
3. **Data privacy** — sending customer data through LLM APIs raises GDPR/HIPAA concerns. Mitigation: PII redaction before LLM calls; self-hosted model option for Enterprise tier.

## Success metrics (first 6 months)

- 1,000 free-tier users
- 50 Pro subscribers ($59/mo = $2,950 MRR)
- < 60 second time-to-clean for a typical dataset
- < 2% error rate on AI-suggested transformations
- NPS > 50 among active users
