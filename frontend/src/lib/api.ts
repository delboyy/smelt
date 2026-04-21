const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FieldSchemaResponse {
  detected_type: string;
  confidence: number;
  nullable: boolean;
  sample_values: string[];
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
