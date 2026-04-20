# Go-to-Market & Business Strategy

## Pricing

| | Free | Pro | Enterprise |
|--|------|-----|-----------|
| **Price** | $0 | $59/mo ($49/mo annual) | Custom |
| **Rows/month** | 10,000 | 250,000 | Unlimited |
| **Max file size** | 100 MB | 1 GB | Unlimited |
| **Formats** | All (CSV, JSON, XML, TSV, Excel) | All + Parquet, fixed-width | All + EDI, COBOL copybook |
| **Cleaning** | AI-powered, full engine | AI-powered, full engine | AI-powered, full engine |
| **Export** | Download only | Download + CRM push + API | Download + CRM push + API + scheduled pipelines |
| **Integrations** | None | Salesforce, HubSpot, Airtable, Google Sheets, webhooks | All Pro + custom integrations |
| **Team** | 1 user | 5 users | Unlimited |
| **Support** | Community | Priority email | Dedicated + SLA |
| **Compliance** | — | — | SOC2, HIPAA, VPC deployment |
| **Account required** | No (first use) | Yes | Yes |

### Pricing rationale

- Free tier is genuinely useful (10k rows handles most one-off jobs) — this drives PLG adoption
- Pro at $59/mo is priced to be an easy expense report, not a procurement decision
- Enterprise is custom because those customers need security reviews, BAAs, and procurement calls anyway
- Usage-based overage on Pro: $5 per additional 50k rows

### Unit economics

- LLM cost per clean: ~$0.002 (100-row sample, Claude Sonnet)
- Compute cost per clean: ~$0.01 per 100k rows (Polars on Fargate)
- Total COGS per Pro user/month: ~$2-5
- Pro gross margin: ~92-96%

## Go-to-market strategy

### Phase 1: Launch (Weeks 1-3)

**Goal:** Ship MVP, get first 100 users.

1. Ship the web app MVP: upload → clean → download. No login required for first use.
2. Register smelt.fyi domain.
3. Create landing page with clear value prop: "Drop your messy CSV. Get clean data in 60 seconds."
4. Launch on Product Hunt, Hacker News ("Show HN"), and Reddit:
   - r/dataengineering
   - r/salesforce
   - r/hubspot
   - r/analytics
   - r/smallbusiness
5. Post on Twitter/X, LinkedIn (target data and ops professionals).

### Phase 2: Content + SEO (Weeks 3-6)

**Goal:** Build organic acquisition engine.

**High-intent keywords to target:**
- "how to clean CSV data" (1.2k searches/mo, low competition)
- "fix messy Excel file" (800 searches/mo)
- "Salesforce import errors" (2.1k searches/mo)
- "HubSpot CSV import format" (900 searches/mo)
- "normalize phone numbers in spreadsheet" (400 searches/mo)
- "remove duplicates from CSV" (3.5k searches/mo)
- "convert XML to CSV" (1.8k searches/mo)
- "data cleaning tool" (2.4k searches/mo)

**Content plan:**
- Write 10 SEO blog posts targeting these keywords
- Each post includes a "try it yourself" CTA linking to the free tool
- Create comparison pages: "Smelt vs OpenRefine", "Smelt vs Trifacta"

### Phase 3: Pro Tier + Integrations (Weeks 6-10)

**Goal:** First paying customers.

1. Add Salesforce and HubSpot push integrations.
2. Launch Pro tier with Stripe billing.
3. Add API access and webhooks.
4. Build Zapier integration (trigger: "new file cleaned", action: "clean data").
5. Email free-tier users who've cleaned 3+ datasets — offer Pro trial.

### Phase 4: Growth (Months 3-6)

**Goal:** 50 Pro subscribers, $2,950 MRR.

1. Open-source the format parser library (builds trust, backlinks, community).
2. Publish "State of Dirty Data" annual report (free PR, brand building).
3. Partner with CRM consultants and Salesforce implementation agencies.
4. Add Google Sheets and Airtable integrations.
5. Launch the recipe marketplace — users can share/sell cleaning templates.

### Phase 5: Enterprise (Month 6+)

**Goal:** First enterprise deal.

1. SOC2 Type II certification.
2. Self-hosted deployment option (Docker + Terraform).
3. HIPAA compliance (for healthcare vertical).
4. Scheduled pipeline feature (watch S3/SFTP, clean on arrival).
5. Outbound sales to companies using legacy data formats (finance, logistics, healthcare).

## Growth channels (ranked by priority)

1. **SEO** — High-intent, low-competition keywords. Compounding returns. Free tool = natural backlinks.
2. **Product Hunt / Hacker News** — One-time launch spike, but drives initial user base and press.
3. **Integration marketplaces** — Zapier, Make app directories. Users discover Smelt while building workflows.
4. **Open-source library** — Format parsers as an npm/pip package. Community contributions, trust, backlinks.
5. **Content marketing** — Blog posts, comparison pages, "State of Dirty Data" report.
6. **Partnerships** — CRM consultants, Salesforce agencies, data migration firms.
7. **Referral program** — "Give a friend 50k free rows, get 50k free rows." Viral loop for Pro users.

## Key metrics to track

| Metric | Tool | Target (6 months) |
|--------|------|-------------------|
| Monthly active users | PostHog | 1,000 |
| Free → Pro conversion rate | Stripe + PostHog | 5% |
| Monthly recurring revenue | Stripe | $2,950 |
| Time to first clean | PostHog | < 60 seconds |
| Cleaning error rate | Internal | < 2% |
| NPS | Survey | > 50 |
| Churn rate (Pro) | Stripe | < 5% monthly |
| SEO organic traffic | Google Search Console | 5,000 visits/mo |

## Competitive moat strategy

1. **Workflow lock-in** — When Smelt becomes the bridge between a vendor feed and a CRM, ripping it out is risky.
2. **Recipe flywheel** — Every cleaning job produces metadata that improves future schema inference and transform suggestions.
3. **Integration depth** — Deep, reliable CRM connectors (not just generic API wrappers) that handle field mapping, upserts, and error recovery.
4. **Community recipes** — A marketplace of cleaning templates created by users, making Smelt more valuable as the library grows.
