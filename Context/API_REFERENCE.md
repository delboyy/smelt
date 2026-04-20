# API Reference

Base URL: `https://api.smelt.fyi/v1`

Authentication: Bearer token in the `Authorization` header. Free-tier anonymous uploads use a session token.

## Endpoints

### POST /ingest

Upload a file or raw data for parsing and schema inference.

**Request (file upload):**
```
POST /v1/ingest
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
```

**Request (raw data):**
```json
POST /v1/ingest
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": "<raw CSV/JSON/XML string>",
  "format": "auto",
  "encoding": "auto"
}
```

**Response (200):**
```json
{
  "job_id": "smlt_abc123",
  "status": "parsed",
  "format": "CSV",
  "encoding": "UTF-8",
  "record_count": 2847,
  "field_count": 8,
  "schema": {
    "full_name": {"type": "name", "confidence": 0.95, "nullable": false, "sample": ["john doe", "Jane Smith"]},
    "email": {"type": "email", "confidence": 0.99, "nullable": true, "sample": ["JOHN@GMAIL.COM", "jane@yahoo.com"]},
    "signup_date": {"type": "date", "confidence": 0.92, "nullable": false, "sample": ["2023/01/15", "01-20-2023"]}
  },
  "preview": [
    {"full_name": "john doe", "email": "JOHN@GMAIL.COM", "signup_date": "2023/01/15"},
    {"full_name": "Jane Smith", "email": "jane@yahoo.com", "signup_date": "01-20-2023"}
  ],
  "issues_detected": {
    "inconsistent_dates": 5,
    "mixed_case": 12,
    "potential_duplicates": 3,
    "missing_values": 8
  }
}
```

### POST /clean

Run the cleaning pipeline on a previously ingested dataset.

**Request:**
```json
POST /v1/clean
Authorization: Bearer <token>

{
  "job_id": "smlt_abc123",
  "options": {
    "dedup": true,
    "dedup_strategy": "exact",
    "dedup_keys": ["full_name", "email"],
    "null_handling": "set_null",
    "date_format": "YYYY-MM-DD",
    "phone_format": "(XXX) XXX-XXXX"
  },
  "recipe_id": null
}
```

**Response (200):**
```json
{
  "job_id": "smlt_abc123",
  "status": "cleaned",
  "stats": {
    "records_in": 2847,
    "records_out": 2831,
    "duplicates_removed": 16,
    "fields_normalized": 1247,
    "nulls_set": 34,
    "flagged_for_review": 3
  },
  "transform_spec": { ... },
  "changes": [
    {
      "row": 1,
      "field": "full_name",
      "original": "john doe",
      "cleaned": "John Doe",
      "action": "title_case",
      "confidence": 0.98
    }
  ],
  "flagged": [
    {
      "row": 847,
      "field": "signup_date",
      "original": "next tuesday",
      "reason": "Cannot resolve relative date",
      "suggestions": ["Set manually", "Set null", "Keep as-is"]
    }
  ],
  "cleaned_preview": [ ... ]
}
```

### POST /export

Export cleaned data in a specified format, or push to a CRM.

**Request (download):**
```json
POST /v1/export
Authorization: Bearer <token>

{
  "job_id": "smlt_abc123",
  "format": "csv",
  "options": {
    "encoding": "utf-8",
    "delimiter": ",",
    "include_headers": true
  }
}
```

**Response (200):** Returns the file as a binary download with appropriate Content-Type.

**Request (CRM push — Pro tier):**
```json
POST /v1/export
Authorization: Bearer <token>

{
  "job_id": "smlt_abc123",
  "destination": "salesforce",
  "mapping": {
    "full_name": "Contact.Name",
    "email": "Contact.Email",
    "company": "Account.Name",
    "deal_value": "Opportunity.Amount"
  },
  "options": {
    "upsert_key": "email",
    "create_missing_accounts": true
  }
}
```

**Response (202 — async):**
```json
{
  "job_id": "smlt_abc123",
  "export_id": "exp_xyz789",
  "status": "pushing",
  "destination": "salesforce",
  "records_queued": 2831,
  "poll_url": "/v1/job/exp_xyz789"
}
```

### GET /job/:id

Check the status of an async job.

**Response:**
```json
{
  "job_id": "exp_xyz789",
  "status": "complete",
  "progress": 100,
  "result": {
    "records_pushed": 2831,
    "records_failed": 0,
    "errors": []
  },
  "completed_at": "2025-04-20T12:05:30Z"
}
```

### POST /webhook (outgoing)

When a job completes, Smelt sends a POST request to the user's configured webhook URL.

**Payload:**
```json
{
  "event": "job.complete",
  "job_id": "smlt_abc123",
  "status": "cleaned",
  "stats": { ... },
  "download_url": "https://api.smelt.fyi/v1/export/smlt_abc123?token=...",
  "expires_at": "2025-04-21T12:00:00Z"
}
```

## Rate limits

| Tier | Requests/min | Max file size | Rows/month |
|------|-------------|---------------|------------|
| Free | 10 | 100 MB | 10,000 |
| Pro | 100 | 1 GB | 250,000 |
| Enterprise | Custom | Unlimited | Unlimited |

## Error responses

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Could not detect a valid data format. Supported formats: CSV, JSON, XML, TSV.",
    "details": {"detected": "binary", "hint": "Try converting your file to CSV or JSON first."}
  }
}
```

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_FORMAT` | 400 | Unrecognized file format |
| `PARSE_ERROR` | 400 | File could be detected but not parsed |
| `FILE_TOO_LARGE` | 413 | Exceeds tier file size limit |
| `RATE_LIMITED` | 429 | Too many requests |
| `ROW_LIMIT_EXCEEDED` | 402 | Monthly row quota exceeded |
| `JOB_NOT_FOUND` | 404 | Invalid job ID |
| `INTEGRATION_ERROR` | 502 | CRM push failed (includes CRM error details) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
