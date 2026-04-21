# Smelt — Feature Implementation Analysis

This document breaks down every proposed feature beyond the Phase 2 MVP. For each feature: what it does, how it works technically, what's involved to build it, dependencies, risks, and when to ship it.

---

## 1. Public API with API Key Auth

### What it does
Developers send raw data via `POST api.smelt.fyi/v1/clean` and get clean data back programmatically. No UI involved. Smelt becomes infrastructure, not just a tool.

### How it works technically

The backend endpoints already exist (`/ingest`, `/clean`, `/export`). The API feature is really just an auth + metering layer on top.

**API key flow:**
1. User goes to smelt.fyi/settings/api and clicks "Generate API Key"
2. Backend generates a key: `sk_live_` + 32 random hex chars. Hashes it (SHA-256) and stores the hash in Postgres. The plaintext is shown once and never stored.
3. User includes it in requests: `Authorization: Bearer sk_live_abc123...`
4. Backend middleware: hash the incoming key, look up in the `api_keys` table, attach the user to the request. Check tier (Pro/Enterprise only). Increment usage counter.

**New database table:**
```sql
CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash    VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of the plaintext key
    name        VARCHAR(100),                  -- "Production", "Staging", etc.
    last_used   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ                    -- soft delete
);
```

**Rate limiting:**
- Free: no API access (returns 403)
- Pro: 100 requests/minute, tracked per key via Redis `INCR` with 60s TTL
- Enterprise: custom limits

**Response format stays the same** — the existing `/clean` response already returns JSON with stats, changes, and cleaned data. No new serialization needed.

### Complexity
Low-medium. The hard part (the cleaning pipeline) already exists. This is auth middleware + a settings page + a database table.

### What to build
- `api_keys` table + Alembic migration
- FastAPI middleware: extract Bearer token → hash → lookup → attach user
- Rate limiting middleware: Redis `INCR` with sliding window
- Settings page: generate key, list keys, revoke key
- API docs page (auto-generated from FastAPI's OpenAPI, just style it)

### Effort: 1.5 days

### Dependencies
- User auth (Day 3 of Phase 2)
- Stripe billing / tier gating (Day 4 of Phase 2)

### Risks
- Key leakage: users paste keys in public repos. Mitigation: key prefix (`sk_live_`) makes it scannable by GitHub secret scanning. Add a warning in the UI.
- Abuse: someone uses the free trial to hammer the API. Mitigation: rate limiting + require Pro tier for API access.

### When to ship: Phase 3, Week 1
Ship immediately after Phase 2 is done. It's the highest-leverage feature because it unlocks programmatic usage and makes Smelt embeddable in existing workflows. Also the foundation for Zapier/Make integrations.

---

## 2. Google Drive / Sheets Import

### What it does
User connects their Google account, browses their Drive, picks a file (CSV, Excel, JSON) or a Google Sheet, and Smelt ingests it directly. No downloading and re-uploading.

### How it works technically

**OAuth2 flow:**
1. User clicks "Connect Google Drive" → redirected to Google's OAuth consent screen
2. Scopes needed: `https://www.googleapis.com/auth/drive.readonly` (read files) + `https://www.googleapis.com/auth/spreadsheets.readonly` (read Sheets)
3. Google redirects back with an auth code → backend exchanges for access + refresh tokens
4. Store tokens (encrypted) in the `integrations` table

**File picker:**
Two options for the UI:
- **Option A: Google Picker API** — Google provides an embeddable file picker widget. User sees their Drive in a familiar UI, picks a file, and you get a file ID back. This is the fastest to implement but requires loading Google's JavaScript SDK on the frontend.
- **Option B: Custom Drive browser** — Call the Drive API (`GET /drive/v3/files`) from the backend, render a custom file list in the Smelt UI. More control over UX but more work.

Recommendation: **Option A (Google Picker)** for speed. Swap to custom UI later if needed.

**Ingestion:**
- For CSV/Excel/JSON files: `GET /drive/v3/files/{fileId}?alt=media` downloads the file content. Pass it to the existing parser pipeline.
- For Google Sheets: `GET /spreadsheets/v4/spreadsheets/{spreadsheetId}/values/{range}` returns cell data as a 2D array. Convert to records (first row = headers) and pass to the cleaning pipeline.

**Token refresh:**
Google access tokens expire after 1 hour. Use the refresh token to get a new access token before each request. Store the refresh token permanently (encrypted); store the access token in Redis with 50-minute TTL.

### Complexity
Medium. The OAuth flow and token management are the tricky parts. The actual file reading is straightforward once you have a valid token.

### What to build
- Google OAuth2 flow (backend: token exchange endpoint, frontend: "Connect Google" button)
- Google Picker integration (frontend: load Google JS SDK, mount picker)
- Backend endpoint: `POST /api/v1/ingest/google-drive` — accepts a file ID + user's stored credentials, fetches the file, passes to existing parser
- Google Sheets parser: convert 2D array response to records
- Token storage in `integrations` table (encrypted with Fernet or similar)
- Token refresh middleware

### Tech additions
- `google-api-python-client` and `google-auth-oauthlib` in backend
- Google Picker API script tag in frontend (loaded dynamically, not bundled)
- Encryption library for token storage (Python `cryptography` package — Fernet symmetric encryption)

### Effort: 2-3 days

### Dependencies
- User auth
- `integrations` table (already in the DATA_MODELS spec)

### Risks
- Google OAuth review: if you request sensitive scopes (like Drive), Google requires app verification which can take weeks. Mitigation: `drive.readonly` is a "restricted" scope — you'll need to submit a privacy policy and go through verification before launching publicly. Start this process early.
- Token expiry edge cases: user's refresh token can be revoked if they remove the app from Google settings. Handle gracefully — show "Reconnect Google Drive" prompt.

### When to ship: Phase 3, Week 2
After the API key feature. The Google OAuth verification process should be started during Phase 2 so it's approved by the time you ship this.

---

## 3. Fetch from URL

### What it does
User pastes a URL pointing to a CSV/JSON/XML file (S3 presigned URL, GitHub raw file, public API endpoint, data.gov feed) and Smelt fetches and cleans it.

### How it works technically

Dead simple. New backend endpoint:

```python
@router.post("/api/v1/ingest/url")
async def ingest_from_url(request: UrlIngestRequest):
    # 1. Fetch the URL
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(request.url)
        response.raise_for_status()

    # 2. Detect format from Content-Type header + content sniffing
    content_type = response.headers.get("content-type", "")
    raw_data = response.text

    # 3. Pass to existing parser pipeline
    return await ingest_raw_data(raw_data, source_url=request.url)
```

**Safety considerations:**
- Timeout: 30 seconds max
- Max response size: 100MB (free) / 1GB (Pro) — stream the response and check `Content-Length` before downloading fully
- Block internal/private IPs: prevent SSRF attacks. Don't allow `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `169.254.x.x` (AWS metadata endpoint)
- Block non-HTTP schemes: only allow `http://` and `https://`
- User-Agent header: `Smelt/1.0 (https://smelt.fyi)`

**Frontend:**
Add a third input method to the Ingest step alongside "Drop file" and "Paste data": a URL input field with a "Fetch" button. Show a loading spinner while fetching.

### Complexity
Low. This is genuinely a 2-hour feature if you skip the SSRF protection, half a day if you do it properly (which you should).

### What to build
- Backend endpoint: `POST /api/v1/ingest/url`
- SSRF protection: IP blocklist, scheme validation, response size limit
- Frontend: URL input field in the Ingest step
- Error handling: URL unreachable, timeout, invalid content, too large

### Tech additions
- `httpx` (async HTTP client — probably already in the project for other things)
- `ipaddress` (Python stdlib — for SSRF IP validation)

### Effort: 0.5 days

### Dependencies
None beyond the existing backend.

### Risks
Minimal. The SSRF protection is the only thing that matters security-wise.

### When to ship: Phase 3, Week 1
Ship alongside or immediately after the API key feature. It's trivial to build and makes the product feel more capable.

---

## 4. Email-in (Forward to Clean)

### What it does
Each user gets a unique email address like `nathan@data.smelt.fyi` or `abc123@in.smelt.fyi`. They forward a vendor email with a CSV attachment. Smelt auto-cleans it and either emails back the cleaned file, pushes to their CRM, or holds it in the dashboard for review.

### How it works technically

**Email receiving — three approaches:**

**Option A: Mailgun Inbound Routes (recommended)**
- Set up a Mailgun account. Configure an inbound route: all emails to `*@in.smelt.fyi` are forwarded as a webhook POST to `https://api.smelt.fyi/api/v1/ingest/email`
- Mailgun sends: sender, subject, body-plain, attachments (as multipart form data)
- Cost: Mailgun's free tier gives 5,000 emails/month. More than enough for launch.

**Option B: SendGrid Inbound Parse**
- Similar to Mailgun. Set up an MX record for `in.smelt.fyi` pointing to SendGrid's servers.
- SendGrid POSTs parsed email data to your webhook.

**Option C: Self-hosted (Postal or Haraka)**
- Run your own mail server. Maximum control but significant ops overhead. Not worth it at this stage.

**Processing flow:**
1. Webhook receives the email
2. Extract sender email → look up user by email in the database
3. Extract attachments → filter to supported formats (CSV, JSON, XML, Excel)
4. For each attachment: run through the existing ingest → clean pipeline
5. Decide what to do with the result:
   - If user has a default recipe configured: auto-apply it
   - If user has a CRM push configured: auto-push
   - Otherwise: hold in dashboard and send a notification ("Your data is cleaned — review it at smelt.fyi/jobs/abc123")
6. Send an email reply with: summary stats, a link to the dashboard, and optionally the cleaned file attached

**User-unique addresses:**
- Simple approach: `{user_id_prefix}@in.smelt.fyi` (e.g., `n7x3k@in.smelt.fyi`)
- Better approach: let users pick an alias: `nathan@in.smelt.fyi`
- Store the mapping in a `user_email_aliases` table

### Complexity
Medium-high. The email ingestion itself is straightforward (Mailgun does the heavy lifting), but the edge cases are numerous: what if there's no attachment? Multiple attachments? Attachment is too large? Sender isn't a registered user? The email is spam?

### What to build
- Mailgun account + DNS setup (MX record for `in.smelt.fyi`)
- Webhook endpoint: `POST /api/v1/ingest/email`
- Email parser: extract sender, attachments
- User lookup by sender email
- Notification system (email reply with results + dashboard link)
- Settings UI: "Your Smelt email address is nathan@in.smelt.fyi"
- Error handling: unknown sender, no attachment, unsupported format

### Tech additions
- Mailgun API (or SendGrid) — for receiving inbound email
- Email sending library for reply emails (`python-mailgun2` or Mailgun's REST API)
- DNS: MX record for `in.smelt.fyi`

### Effort: 2-3 days

### Dependencies
- User auth
- Notification system (email sending)
- Recipes (optional — for auto-apply on receipt)

### Risks
- Spam: people will send junk to `*@in.smelt.fyi`. Mitigation: only process emails from registered user addresses. Everything else gets a "Sign up at smelt.fyi to use this feature" auto-reply.
- Large attachments: Mailgun has a 25MB inbound limit. Mitigation: return an error email saying "File too large — upload directly at smelt.fyi."
- Security: an attacker could forge the "From" header to impersonate a user. Mitigation: verify SPF/DKIM on inbound emails (Mailgun does this). For high-security use cases (Enterprise), require a unique token in the subject line.

### When to ship: Phase 4, Week 1
This is a "delight" feature, not a launch-critical one. Ship it after the core integrations (API, Google Drive, CRM push) are solid. It's the kind of feature that makes a great Product Hunt update post: "New: just forward your messy data to Smelt by email."

---

## 5. Write Back to Google Sheets

### What it does
After cleaning, one click creates a new Google Sheet with the cleaned data, or appends to an existing Sheet. The user never touches a file.

### How it works technically

If Google Drive import is already built (Feature #2), this is the reverse direction using the same OAuth credentials.

**Write flow:**
1. User clicks "Export to Google Sheets" on the export step
2. If not connected: trigger Google OAuth flow (same as import, but add `spreadsheets` write scope)
3. If creating a new Sheet:
   ```python
   service.spreadsheets().create(body={
       "properties": {"title": f"Smelted - {original_filename}"},
       "sheets": [{"properties": {"title": "Cleaned Data"}}]
   })
   ```
4. Write the data:
   ```python
   service.spreadsheets().values().update(
       spreadsheetId=sheet_id,
       range="A1",
       valueInputOption="USER_ENTERED",
       body={"values": [headers] + rows}
   )
   ```
5. Return the Sheet URL to the frontend. Show a "Open in Google Sheets" link.

**If appending to existing Sheet:**
- Use the Google Picker (same as import) to let the user select a Sheet
- Append to the next empty row: `service.spreadsheets().values().append()`

### Complexity
Low — if Google Drive import is already built. The OAuth tokens and API client are reusable. This is just calling a different API method.

### What to build
- Add `spreadsheets` write scope to the OAuth flow
- Backend endpoint: `POST /api/v1/export/google-sheets`
- Frontend: "Export to Google Sheets" button on the export step
- Sheet creation + data writing logic
- Return the Sheet URL for a "View in Sheets" link

### Effort: 0.5-1 day (after Google Drive import exists)

### Dependencies
- Google Drive import (Feature #2) — shares the same OAuth flow and credentials

### When to ship: Phase 3, Week 2
Ship the same week as Google Drive import. They share 90% of the infrastructure.

---

## 6. Slack Notification on Clean Complete

### What it does
When a cleaning job finishes, post a summary message to a Slack channel: "Smelt cleaned 2,847 rows from contacts.csv. 14 duplicates removed. 0 errors. [View results →]"

### How it works technically

**Slack integration flow:**
1. User clicks "Connect Slack" → redirected to Slack OAuth
2. Scopes: `chat:write` (post messages) + `channels:read` (list channels for picker)
3. User picks a channel from a dropdown
4. Store the bot token + channel ID in `integrations` table

**Notification:**
When a cleaning job completes, check if the user has a Slack integration. If yes, POST to Slack's `chat.postMessage` API:

```python
import httpx

async def notify_slack(token: str, channel: str, job: Job):
    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Smelt cleaned your data* ✅\n"
                        f"📁 {job.source_filename}\n"
                        f"📊 {job.stats['records_in']} → {job.stats['records_out']} rows\n"
                        f"🔁 {job.stats['duplicates_removed']} duplicates removed\n"
                        f"🔧 {job.stats['fields_normalized']} fields normalized"
            }
        },
        {
            "type": "actions",
            "elements": [{
                "type": "button",
                "text": {"type": "plain_text", "text": "View Results"},
                "url": f"https://smelt.fyi/jobs/{job.id}"
            }]
        }
    ]
    await httpx.AsyncClient().post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}"},
        json={"channel": channel, "blocks": blocks}
    )
```

### Complexity
Low. Slack's OAuth is well-documented and the `chat.postMessage` API is trivial.

### What to build
- Slack OAuth flow (backend: token exchange, frontend: "Connect Slack" button)
- Channel picker (fetch channels list, let user select)
- Notification function: construct Slack Block Kit message, POST to API
- Hook into the cleaning pipeline completion: if Slack is connected, fire notification
- Settings UI: connected channel, test notification button, disconnect

### Tech additions
- Slack Web API (`slack_sdk` Python package, or just raw `httpx` calls — the API is simple enough)

### Effort: 1 day

### Dependencies
- User auth
- `integrations` table

### Risks
Minimal. Slack OAuth is straightforward. The only edge case is channel permissions — the Smelt bot needs to be invited to the channel to post. Show a clear error if posting fails.

### When to ship: Phase 3, Week 2
Quick win that makes the product feel alive in a team context. Ship alongside Google Drive/Sheets.

---

## 7. Data Quality Score

### What it does
Before cleaning: show a 0-100 "data health" score with a breakdown. After cleaning: show the improved score. The delta is the wow moment.

### How it works technically

The score is calculated from metrics you already have. No new infrastructure needed.

**Scoring model (weighted average):**

```python
def calculate_data_quality_score(records: list[dict], schema: dict) -> dict:
    fields = list(records[0].keys()) if records else []
    n = len(records)

    # 1. Completeness (30% weight)
    # What % of cells have non-null, non-empty values?
    total_cells = n * len(fields)
    filled_cells = sum(
        1 for r in records for f in fields
        if r.get(f) is not None and str(r.get(f)).strip() not in ("", "N/A", "n/a", "null", "None")
    )
    completeness = filled_cells / total_cells if total_cells > 0 else 0

    # 2. Consistency (25% weight)
    # For each field, what % of values match the expected format?
    # e.g., if the field is "date", how many values are valid dates?
    consistency_scores = []
    for field in fields:
        field_type = schema.get(field, "text")
        values = [r.get(field) for r in records if r.get(field)]
        if not values:
            continue
        valid = sum(1 for v in values if is_valid_for_type(v, field_type))
        consistency_scores.append(valid / len(values))
    consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0

    # 3. Uniqueness (25% weight)
    # What % of rows are unique (not duplicates)?
    fingerprints = set()
    unique_count = 0
    for r in records:
        fp = "|".join(str(r.get(f, "")).lower().strip() for f in fields)
        if fp not in fingerprints:
            fingerprints.add(fp)
            unique_count += 1
    uniqueness = unique_count / n if n > 0 else 1.0

    # 4. Conformity (20% weight)
    # Are values in standard formats? (emails lowercase, phones formatted, dates ISO)
    conformity_scores = []
    for field in fields:
        field_type = schema.get(field, "text")
        values = [r.get(field) for r in records if r.get(field)]
        if not values or field_type == "text":
            continue
        conformed = sum(1 for v in values if is_conformed(v, field_type))
        conformity_scores.append(conformed / len(values))
    conformity = sum(conformity_scores) / len(conformity_scores) if conformity_scores else 1.0

    # Weighted total
    score = round(
        completeness * 30 +
        consistency * 25 +
        uniqueness * 25 +
        conformity * 20
    )

    return {
        "score": score,
        "completeness": round(completeness * 100),
        "consistency": round(consistency * 100),
        "uniqueness": round(uniqueness * 100),
        "conformity": round(conformity * 100),
        "grade": "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"
    }
```

**UI:**
- Show the score as a large number with a circular progress ring (SVG arc) in amber
- Below: four sub-scores as small stat cards (completeness, consistency, uniqueness, conformity)
- After cleaning: animate the score transitioning from the "before" value to the "after" value
- Add a letter grade: A (90+), B (75+), C (60+), D (40+), F (below 40)

**Where it appears:**
- Preview step: "Your data health: 34/100 (Grade F)" — creates urgency to clean
- Review step: "After smelting: 97/100 (Grade A)" — creates satisfaction
- Cleaning history: each job shows the before/after score

### Complexity
Low. This is pure calculation from data you already have. No external APIs, no new infrastructure.

### What to build
- `calculate_data_quality_score()` function in the backend
- Add `score_before` and `score_after` fields to the job model
- Call the function before cleaning (on the parsed data) and after cleaning (on the cleaned data)
- Frontend: score display component with animated ring
- Include the score in API responses and Slack notifications

### Effort: 1 day

### Dependencies
None beyond the existing cleaning pipeline.

### When to ship: Phase 3, Week 1
Ship with the first batch of wow features. High impact, low effort. Makes every cleaning job feel more tangible.

---

## 8. Smart Suggestions Before Cleaning

### What it does
After schema inference but before cleaning, show a checklist of what Smelt plans to do: "We found 14 potential duplicates. Normalize 23 inconsistent dates? Fix 12 mixed-case emails? Remove 8 empty phone numbers?" User toggles each category on/off.

### How it works technically

This is really just exposing the transform spec to the user in a friendly way before executing it.

**Flow:**
1. After `/ingest` returns the schema, the frontend calls a new endpoint: `POST /api/v1/preview-plan`
2. Backend runs the LLM planning step (or rule-based fallback) but doesn't execute
3. Returns the plan as a list of suggested actions with counts:
   ```json
   {
     "suggestions": [
       {"action": "normalize_dates", "field": "signup_date", "affected_rows": 23, "enabled": true},
       {"action": "lowercase_emails", "field": "email", "affected_rows": 12, "enabled": true},
       {"action": "remove_duplicates", "count": 14, "enabled": true},
       {"action": "fill_missing", "field": "phone", "count": 8, "enabled": true, "strategy": "set_null"}
     ]
   }
   ```
4. Frontend shows each suggestion as a toggle card
5. User toggles what they want, clicks "Smelt"
6. The `/clean` endpoint receives the modified plan and only executes enabled actions

### Complexity
Low-medium. The planning step already exists — you're just splitting it from the execution step and adding a UI layer.

### What to build
- Backend: `POST /api/v1/preview-plan` — runs sampling + LLM/rule-based planning, returns suggestions
- Backend: modify `/clean` to accept an `enabled_actions` list
- Frontend: suggestions panel with toggle cards between Preview and Clean steps
- Count calculation: for each proposed action, scan the data to count how many rows would be affected

### Effort: 1.5 days

### Dependencies
- The existing planning pipeline

### When to ship: Phase 3, Week 2
Ship after the data quality score. Together, these two features make the pre-cleaning experience feel intelligent and transparent.

---

## 9. Natural Language Cleaning Instructions

### What it does
A text field where users type custom instructions in plain English: "Merge first_name and last_name into full_name, remove anyone with a gmail address, convert all dates to European format DD/MM/YYYY." The LLM translates this into transform actions.

### How it works technically

This extends the existing LLM planning step. Currently, the LLM sees a data sample and autonomously decides what to clean. With natural language instructions, the user provides additional guidance.

**Implementation:**

The prompt to the LLM changes from:

```
Here is a sample of the data. Infer the schema and generate a transform spec.
```

To:

```
Here is a sample of the data. The user has requested the following transformations:
"{user_instructions}"

Generate a transform spec that:
1. Applies the user's requested transformations
2. Also applies any standard cleaning (trim, normalize) that wasn't explicitly mentioned
3. For each action, indicate whether it was "user_requested" or "auto_detected"
```

**New transform actions needed:**
The user might request things the current engine can't do:
- "Merge columns" → new action: `merge_columns` (concat with separator)
- "Remove rows where X = Y" → new action: `filter_rows`
- "Rename column X to Y" → new action: `rename_column`
- "Split column X into Y and Z" → new action: `split_column`
- "Add a column with value X" → new action: `add_column`

Each new action needs a corresponding Polars executor function.

**Safety:**
The LLM might generate actions that are destructive (delete all rows, drop all columns). The validation step catches this — if the transform spec would result in zero rows or zero columns, it's flagged.

**UI:**
- Add a text area to the Preview step (or a new "Instructions" sub-step): "Anything else you want us to do?"
- Show the generated plan (from Feature #8) including both auto-detected and user-requested actions
- User-requested actions get a distinct badge so it's clear what came from their instructions

### Complexity
Medium-high. The LLM prompt engineering is the easy part. The hard part is expanding the transform action vocabulary (merge, filter, rename, split, add) and building the corresponding Polars executors. Each new action needs parsing, validation, execution, and audit logging.

### What to build
- Expanded LLM prompt that accepts user instructions
- New transform actions: `merge_columns`, `filter_rows`, `rename_column`, `split_column`, `add_column`
- Polars executor functions for each new action
- Validation for destructive operations
- Frontend: instruction text area
- "User requested" vs "auto detected" badges in the suggestions UI

### Effort: 3-4 days

### Dependencies
- Smart suggestions (Feature #8) — they share the same UI pattern
- LLM integration must be working (not just rule-based fallback)

### Risks
- LLM misunderstanding instructions: "Remove duplicates" could mean "deduplicate" or "delete all rows that appear more than once." Mitigation: always show the plan before executing. User confirms.
- Scope creep: users will type increasingly complex instructions that push beyond what Smelt can do. Mitigation: clearly communicate what's supported. If the LLM can't translate an instruction, say so: "I couldn't understand 'pivot the table by quarter' — here's what I can do: [list of supported actions]."

### When to ship: Phase 4, Week 1
This is a powerful feature but not launch-critical. Ship it after the first wave of integrations are solid. It's the feature that makes Smelt feel genuinely AI-powered rather than just a fancy parser.

---

## 10. Airtable / Notion Database Sync

### What it does
Push cleaned data directly into an Airtable base or Notion database. Auto-create the table/database if it doesn't exist. Map fields intelligently.

### How it works technically

**Airtable:**
- Auth: Personal access token (simplest) or OAuth2
- API: REST API — create records with `POST /v0/{baseId}/{tableName}`
- Batch: up to 10 records per request (Airtable's limit)
- Rate limit: 5 requests per second
- Field mapping: fetch the base schema with `GET /v0/meta/bases/{baseId}/tables`, map Smelt fields to Airtable fields by name/type
- Auto-create table: `POST /v0/meta/bases/{baseId}/tables` with field definitions inferred from the cleaned data schema

**Notion:**
- Auth: OAuth2 (internal integration or public integration)
- API: `POST /v1/pages` to create records in a database
- Batch: no native batch endpoint — must create one page per record (slow for large datasets)
- Rate limit: 3 requests per second
- Field mapping: fetch database schema with `GET /v1/databases/{database_id}`, map fields by name
- Auto-create database: `POST /v1/databases` under a parent page

**The Notion bottleneck:** Notion's API has no batch insert. For 1,000 records at 3 req/sec, that's ~5.5 minutes. This needs to be an async Celery job with a progress indicator. Airtable is faster (10 records/batch at 5 req/sec = 1,000 records in ~20 seconds) but still needs async for large datasets.

### Complexity
Medium. Both APIs are well-documented. The main challenge is the field mapping UI (same pattern as Salesforce/HubSpot) and handling rate limits gracefully.

### What to build
- Airtable: OAuth or token auth, base/table browser, field mapping UI, batch record creation, async job
- Notion: OAuth, database picker, field mapping, page-by-page creation, async job
- Rate limit handling: backoff + retry with exponential delay
- Progress indicator: "Pushing record 847 of 2,831..."

### Effort: 2 days (Airtable), 2 days (Notion)

### Dependencies
- User auth
- Async workers (Celery)
- `integrations` table
- Field mapping UI component (shared with Salesforce/HubSpot)

### When to ship: Phase 3, Week 3
After Salesforce and HubSpot. The field mapping UI can be reused across all CRM integrations.

---

## 11. Cleaning History Dashboard

### What it does
Show all past cleaning jobs: source file, date, stats (rows in/out, duplicates removed), data quality score before/after, and a "re-run" button.

### How it works technically

This is mostly a frontend feature. The `jobs` table already stores all the metadata.

**Backend:**
- `GET /api/v1/jobs` — returns paginated list of user's jobs, sorted by `created_at` desc
- Each job includes: id, source_filename, source_format, record_count, stats, score_before, score_after, status, created_at
- Filter by status, date range, format

**Frontend:**
- New page: `/dashboard` or `/history`
- Table or card list of past jobs
- Each row shows: filename, format badge, row count, score delta (34 → 97), date, status badge
- Click a job to see its full review (same review UI, loaded from stored results)
- "Re-run" button: re-ingests the same source file (if still stored) with the same recipe
- "Download again" button: re-exports the cleaned data

### Complexity
Low. This is standard CRUD with pagination.

### What to build
- Backend: `GET /api/v1/jobs` with pagination + filters
- Frontend: history page with job list
- Job detail view (reuse the existing review components)
- Re-run and re-download buttons

### Effort: 1 day

### Dependencies
- User auth (to show only the user's jobs)
- Persistent job store (Redis or Postgres — already done)

### When to ship: Phase 3, Week 1
Ship with the first wave of post-Phase-2 features. Users need to see their history as soon as they have accounts.

---

## 12. Before/After Comparison Mode

### What it does
A split-screen or toggle view showing the original data next to the cleaned data, with changes highlighted. More visceral than the change log.

### How it works technically

**Two UI approaches:**

**Option A: Side-by-side tables**
- Two DataTable components next to each other: left = original, right = cleaned
- Changed cells get a subtle amber highlight in the cleaned table
- Synced scrolling: scroll one table, the other scrolls to match
- Problem: 680px viewport is too narrow for two full tables. Only works if you can show a subset of columns.

**Option B: Toggle with cell-level highlighting (recommended)**
- Single table with a "Show original / Show cleaned" toggle
- In "cleaned" mode: cells that were changed have a colored background (amber for normalized, red for removed, green for added)
- Click a cell to see a tooltip: "Was: 01-20-2023 → Now: 2023-01-20 (date normalized)"
- This works at any viewport width

**Implementation:**
Both the original and cleaned datasets need to be stored and aligned by row index. The audit log already tracks which rows/fields changed — use it to drive the highlighting.

### Complexity
Low-medium. The data is already available. The challenge is the cell-level highlighting UI and tooltip interaction.

### What to build
- Store original records alongside cleaned records in the job data
- Frontend: toggle between "Original" and "Cleaned" views
- Cell highlighting based on audit log entries
- Click-to-see-change tooltip or inline detail

### Effort: 1-1.5 days

### Dependencies
- Original data must be preserved in the job store (currently only cleaned data is stored — need to also store the pre-cleaning snapshot)

### When to ship: Phase 3, Week 2

---

## 13. Shareable Clean Report

### What it does
Generate a public URL showing the cleaning summary: stats, issues found, score improvement, before/after sample. Users share it with their team or manager.

### How it works technically

**Backend:**
- `POST /api/v1/jobs/{id}/share` — generates a unique token and stores it
- `GET /api/v1/reports/{token}` — returns the report data (stats, score, sample changes — NOT the actual data)
- Token expires after 30 days

**Frontend:**
- New public page: `/report/{token}` — no auth required
- Shows: data quality score (before → after), stat cards, sample of changes (first 10), cleaning duration, format detected
- Explicitly does NOT include the actual data — only metadata and samples. This is a privacy requirement.
- "Cleaned with Smelt — try it free" CTA at the bottom (growth loop)

**Why it matters for growth:**
This is a word-of-mouth multiplier. User sends the report link to their boss → boss sees the value → boss signs off on the Pro subscription. The CTA at the bottom drives organic signups.

### Complexity
Low. It's a public page rendering data you already have.

### What to build
- Share token generation + storage
- Public report API endpoint
- Public report page (no auth, branded, with CTA)
- "Share report" button in the review step
- Copy-link interaction

### Effort: 1 day

### Dependencies
- Data quality score (Feature #7)
- User auth

### When to ship: Phase 3, Week 2

---

## Sequencing Summary

### Phase 3, Week 1 (highest impact, lowest effort)
1. Public API with API keys (1.5 days)
2. Fetch from URL (0.5 days)
3. Data quality score (1 day)
4. Cleaning history dashboard (1 day)

### Phase 3, Week 2 (integrations + polish)
5. Google Drive / Sheets import + export (2.5 days)
6. Slack notification (1 day)
7. Smart suggestions before cleaning (1.5 days)
8. Before/after comparison mode (1 day)
9. Shareable clean report (1 day)

### Phase 3, Week 3 (deeper integrations)
10. Airtable sync (2 days)
11. Notion sync (2 days)

### Phase 4 (differentiation features)
12. Natural language cleaning instructions (3-4 days)
13. Email-in (2-3 days)
14. Recipe marketplace (3 days)
15. Scheduled pipelines — Enterprise (5 days)
