const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FieldSchemaResponse {
  detected_type: string;
  confidence: number;
  nullable: boolean;
  sample_values: string[];
}

export interface QualityScore {
  score: number;
  completeness: number;
  consistency: number;
  uniqueness: number;
  conformity: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface IngestResponse {
  job_id: string;
  status: string;
  format: string;
  encoding: string;
  record_count: number;
  field_count: number;
  schema: Record<string, FieldSchemaResponse>;
  preview: Record<string, unknown>[];
  issues_detected: Record<string, number>;
  quality_score?: QualityScore;
}

export interface AuditEntry {
  row: number;
  field: string;
  original: string | null;
  cleaned: string | null;
  action: string;
  confidence: number;
  change_type: string;
}

export interface CleanResponse {
  job_id: string;
  status: string;
  stats: {
    records_in: number;
    records_out: number;
    duplicates_removed: number;
    fields_normalized: number;
    nulls_set: number;
    flagged_for_review: number;
  };
  changes: AuditEntry[];
  cleaned_preview: Record<string, unknown>[];
  validation_warnings: string[];
  quality_score?: QualityScore;
}

export interface JobIndexEntry {
  job_id: string;
  created_at: string;
  filename: string;
  format: string;
  record_count: number;
  quality_score_before?: QualityScore;
}

export interface JobsResponse {
  jobs: JobIndexEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface ApiKeyEntry {
  id: string;
  name: string;
  created_at: string;
  last_used: string | null;
}

export interface ApiKeyCreated extends ApiKeyEntry {
  key: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? err?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function ingestFile(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/ingest`, { method: "POST", body: formData });
  return handleResponse<IngestResponse>(res);
}

export async function ingestRaw(data: string): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/v1/ingest/raw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, format: "auto", encoding: "auto" }),
  });
  return handleResponse<IngestResponse>(res);
}

export async function ingestUrl(url: string): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/api/v1/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handleResponse<IngestResponse>(res);
}

export async function cleanJob(jobId: string, options = {}): Promise<CleanResponse> {
  const res = await fetch(`${API_URL}/api/v1/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, options }),
  });
  return handleResponse<CleanResponse>(res);
}

export async function downloadExport(jobId: string, format: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, format: format.toLowerCase() }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smelted_data.${format.toLowerCase()}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchJobs(page = 1, limit = 20): Promise<JobsResponse> {
  const res = await fetch(`${API_URL}/api/v1/jobs?page=${page}&limit=${limit}`);
  return handleResponse<JobsResponse>(res);
}

export async function fetchApiKeys(token: string): Promise<ApiKeyEntry[]> {
  const res = await fetch(`${API_URL}/api/v1/auth/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<ApiKeyEntry[]>(res);
}

export async function createApiKey(token: string, name: string): Promise<ApiKeyCreated> {
  const res = await fetch(`${API_URL}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  return handleResponse<ApiKeyCreated>(res);
}

export async function revokeApiKey(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/api-keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Revoke failed: ${res.status}`);
}
