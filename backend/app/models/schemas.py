from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
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
    params: dict[str, Any] = {}
    null_handling: Optional[str] = None


class DedupConfig(BaseModel):
    enabled: bool = True
    strategy: Literal["exact", "fuzzy"] = "exact"
    keys: list[str] = []
    threshold: float = 0.85
    normalize_before_compare: bool = True


class TransformSpec(BaseModel):
    version: str = "1.0"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source_format: str = ""
    record_count: int = 0
    sample_size: int = 0
    schema_map: dict[str, FieldSchema] = Field(default_factory=dict, alias="schema")
    transforms: list[TransformAction] = []
    dedup: DedupConfig = Field(default_factory=DedupConfig)

    model_config = {"populate_by_name": True}


class CleaningStats(BaseModel):
    records_in: int
    records_out: int
    duplicates_removed: int
    fields_normalized: int
    nulls_set: int
    flagged_for_review: int = 0


class AuditEntry(BaseModel):
    row: int
    field: str
    original: Optional[str]
    cleaned: Optional[str]
    action: str
    confidence: float
    change_type: str


class CleaningResult(BaseModel):
    job_id: str
    status: str
    stats: CleaningStats
    transform_spec: Optional[TransformSpec] = None
    changes: list[AuditEntry] = []
    flagged: list[dict[str, Any]] = []
    cleaned_preview: list[dict[str, Any]] = []


class IngestRequest(BaseModel):
    data: Optional[str] = None
    format: str = "auto"
    encoding: str = "auto"


class IngestResponse(BaseModel):
    job_id: str
    status: str
    format: str
    encoding: str
    record_count: int
    field_count: int
    schema_map: dict[str, FieldSchema] = Field(alias="schema")
    preview: list[dict[str, Any]]
    issues_detected: dict[str, int]

    model_config = {"populate_by_name": True}


class CleanRequest(BaseModel):
    job_id: str
    options: dict[str, Any] = {}
    recipe_id: Optional[str] = None


class ExportRequest(BaseModel):
    job_id: str
    format: Optional[str] = "csv"
    destination: Optional[str] = None
    mapping: Optional[dict[str, str]] = None
    options: dict[str, Any] = {}


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail
