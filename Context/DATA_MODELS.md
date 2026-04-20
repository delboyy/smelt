# Data Models

## Database schema (PostgreSQL)

### users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    password_hash   VARCHAR(255),
    tier            VARCHAR(20) DEFAULT 'free',  -- free, pro, enterprise
    stripe_customer_id VARCHAR(255),
    rows_used_this_month INTEGER DEFAULT 0,
    row_limit       INTEGER DEFAULT 10000,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### jobs

```sql
CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    session_id      VARCHAR(255),  -- for anonymous free-tier users
    status          VARCHAR(20) NOT NULL,  -- uploading, parsed, cleaning, cleaned, exporting, complete, failed
    source_format   VARCHAR(10),   -- CSV, JSON, XML, TSV
    source_encoding VARCHAR(20),
    source_filename VARCHAR(255),
    record_count    INTEGER,
    field_count     INTEGER,
    s3_key_source   VARCHAR(500),  -- uploaded file location
    s3_key_cleaned  VARCHAR(500),  -- cleaned file location
    schema          JSONB,         -- inferred schema
    transform_spec  JSONB,         -- the cleaning plan
    stats           JSONB,         -- cleaning statistics
    error           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_session_id ON jobs(session_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

### audit_log

```sql
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    job_id          UUID REFERENCES jobs(id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL,
    field_name      VARCHAR(255) NOT NULL,
    original_value  TEXT,
    cleaned_value   TEXT,
    action          VARCHAR(50) NOT NULL,
    confidence      FLOAT,
    change_type     VARCHAR(20),  -- normalized, duplicate, missing, invalid, flagged
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_job_id ON audit_log(job_id);
CREATE INDEX idx_audit_change_type ON audit_log(change_type);
```

### recipes

```sql
CREATE TABLE recipes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    source_type     VARCHAR(100),  -- e.g., "Salesforce contact export", "Shopify product feed"
    schema          JSONB NOT NULL,
    transform_spec  JSONB NOT NULL,
    usage_count     INTEGER DEFAULT 0,
    is_public       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
```

### integrations

```sql
CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    provider        VARCHAR(50) NOT NULL,  -- salesforce, hubspot, airtable, webhook
    credentials     JSONB NOT NULL,        -- encrypted OAuth tokens or API keys
    config          JSONB,                 -- provider-specific settings
    field_mappings  JSONB,                 -- saved column → CRM field mappings
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### scheduled_pipelines (Enterprise)

```sql
CREATE TABLE scheduled_pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    source_type     VARCHAR(50),   -- s3, sftp, url, email
    source_config   JSONB NOT NULL,
    recipe_id       UUID REFERENCES recipes(id),
    destination     JSONB,         -- export config (format, CRM, webhook)
    schedule        VARCHAR(100),  -- cron expression
    is_active       BOOLEAN DEFAULT TRUE,
    last_run_at     TIMESTAMPTZ,
    last_run_status VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## Pydantic models (Python)

### Core models

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID

class FieldSchema(BaseModel):
    detected_type: str
    confidence: float = Field(ge=0, le=1)
    nullable: bool = False
    sample_values: list[str] = []

class TransformAction(BaseModel):
    field: str
    actions: list[str]
    priority: int = 1
    params: dict = {}
    null_handling: Optional[str] = None

class DedupConfig(BaseModel):
    enabled: bool = True
    strategy: Literal["exact", "fuzzy"] = "exact"
    keys: list[str] = []
    threshold: float = 0.85
    normalize_before_compare: bool = True

class TransformSpec(BaseModel):
    version: str = "1.0"
    schema: dict[str, FieldSchema]
    transforms: list[TransformAction]
    dedup: DedupConfig

class CleaningStats(BaseModel):
    records_in: int
    records_out: int
    duplicates_removed: int
    fields_normalized: int
    nulls_set: int
    flagged_for_review: int

class AuditEntry(BaseModel):
    row: int
    field: str
    original: Optional[str]
    cleaned: Optional[str]
    action: str
    confidence: float
    change_type: str

class CleaningResult(BaseModel):
    job_id: UUID
    status: str
    stats: CleaningStats
    transform_spec: TransformSpec
    changes: list[AuditEntry]
    flagged: list[dict] = []
    cleaned_preview: list[dict] = []
```

### API request/response models

```python
class IngestRequest(BaseModel):
    data: Optional[str] = None
    format: str = "auto"
    encoding: str = "auto"

class IngestResponse(BaseModel):
    job_id: UUID
    status: str
    format: str
    encoding: str
    record_count: int
    field_count: int
    schema: dict[str, FieldSchema]
    preview: list[dict]
    issues_detected: dict

class CleanRequest(BaseModel):
    job_id: UUID
    options: dict = {}
    recipe_id: Optional[UUID] = None

class ExportRequest(BaseModel):
    job_id: UUID
    format: Optional[str] = "csv"
    destination: Optional[str] = None  # salesforce, hubspot, airtable, webhook
    mapping: Optional[dict] = None
    options: dict = {}
```
