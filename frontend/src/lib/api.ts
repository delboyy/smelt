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

export async function cleanJob(jobId: string, params?: { instructions?: string }): Promise<CleanResponse> {
  const body: Record<string, unknown> = { job_id: jobId };
  if (params?.instructions) body.instructions = params.instructions;
  const res = await fetch(`${API_URL}/api/v1/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export interface Suggestion {
  id: string;
  action: string;
  field?: string;
  label: string;
  description: string;
  affected_rows: number;
  enabled: boolean;
  category: "dedup" | "nullify" | "normalize";
}

export interface PlanResponse {
  job_id: string;
  suggestions: Suggestion[];
  total: number;
}

export interface ReportData {
  job_id: string;
  filename: string;
  format: string;
  record_count_in: number;
  record_count_out: number | null;
  duplicates_removed: number;
  fields_normalized: number;
  nulls_set: number;
  quality_before?: QualityScore;
  quality_after?: QualityScore;
  expires_at: string;
}

export interface SlackStatus {
  connected: boolean;
  channel: string | null;
}

export async function fetchPreviewPlan(jobId: string): Promise<PlanResponse> {
  const res = await fetch(`${API_URL}/api/v1/preview-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });
  return handleResponse<PlanResponse>(res);
}

export async function createShareLink(jobId: string): Promise<{ token: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}/share`, { method: "POST" });
  return handleResponse(res);
}

export async function fetchReport(token: string): Promise<ReportData> {
  const res = await fetch(`${API_URL}/api/v1/reports/${token}`);
  return handleResponse<ReportData>(res);
}

export async function fetchSlackStatus(token: string): Promise<SlackStatus> {
  const res = await fetch(`${API_URL}/api/v1/integrations/slack/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<SlackStatus>(res);
}

export async function connectSlack(token: string): Promise<{ auth_url: string }> {
  const res = await fetch(`${API_URL}/api/v1/integrations/slack/connect`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function disconnectSlack(token: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/integrations/slack/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
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

export interface AirtableExportRequest {
  job_id: string;
  personal_access_token: string;
  base_id: string;
  table_name: string;
}

export interface NotionExportRequest {
  job_id: string;
  integration_token: string;
  parent_page_id: string;
  database_title: string;
}

export interface IntegrationExportResult {
  records_pushed: number;
  truncated?: boolean;
}

export async function exportToAirtable(token: string, req: AirtableExportRequest): Promise<IntegrationExportResult> {
  const res = await fetch(`${API_URL}/api/v1/export/airtable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(req),
  });
  return handleResponse<IntegrationExportResult>(res);
}

export async function exportToNotion(token: string, req: NotionExportRequest): Promise<IntegrationExportResult> {
  const res = await fetch(`${API_URL}/api/v1/export/notion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(req),
  });
  return handleResponse<IntegrationExportResult>(res);
}
