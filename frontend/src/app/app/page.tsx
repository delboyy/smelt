"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { StepBar } from "@/components/layout/StepBar";
import { FileDropzone } from "@/components/ingest/FileDropzone";
import { PasteInput } from "@/components/ingest/PasteInput";
import { UrlInput } from "@/components/ingest/UrlInput";
import { SampleButtons } from "@/components/ingest/SampleButtons";
import { FormatBadge } from "@/components/ingest/FormatBadge";
import { QualityScore } from "@/components/ui/QualityScore";
import { SchemaDisplay } from "@/components/preview/SchemaDisplay";
import { DataPreview } from "@/components/preview/DataPreview";
import { SuggestionsPanel } from "@/components/preview/SuggestionsPanel";
import { CleaningProgress } from "@/components/clean/CleaningProgress";
import { StatsDashboard } from "@/components/review/StatsDashboard";
import { IssueFilters } from "@/components/review/IssueFilters";
import { ChangeLog } from "@/components/review/ChangeLog";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { FormatPicker } from "@/components/export/FormatPicker";
import { ExportPreview } from "@/components/export/ExportPreview";
import { DownloadButton } from "@/components/export/DownloadButton";
import { CRMPushTeaser } from "@/components/export/CRMPushTeaser";
import { useSmeltStore } from "@/lib/store";
import type { FieldType } from "@/lib/detection/schema";
import type { Issue, CleaningStats } from "@/lib/cleaning/engine";
import { toCSV, toJSON, toXML } from "@/lib/export/formatters";
import {
  ingestFile,
  ingestRaw,
  ingestUrl,
  cleanJob,
  downloadExport,
  fetchPreviewPlan,
  createShareLink,
  exportToAirtable,
  exportToNotion,
} from "@/lib/api";
import type { IngestResponse, CleanResponse, Suggestion } from "@/lib/api";
import { useSession } from "next-auth/react";
import { T } from "@/lib/constants";

const CHANGE_TYPE_MAP: Record<string, Issue["type"]> = {
  normalized: "normalized",
  duplicate: "duplicate",
  missing: "missing",
  invalid: "invalid",
};

function mapIngestResponse(data: IngestResponse) {
  const schema: Record<string, FieldType> = {};
  for (const [field, info] of Object.entries(data.schema)) {
    schema[field] = info.detected_type as FieldType;
  }
  return { schema, parsed: data.preview, format: data.format };
}

function mapCleanResponse(data: CleanResponse) {
  const issues: Issue[] = data.changes.map((c) => ({
    row: c.row,
    field: c.field,
    was: c.original ?? "",
    now: c.cleaned,
    type: CHANGE_TYPE_MAP[c.change_type] ?? "normalized",
    fieldType: "text" as FieldType,
  }));

  const stats: CleaningStats = {
    total: data.stats.records_in,
    clean: data.stats.records_out,
    dupes: data.stats.duplicates_removed,
    fixes: data.stats.fields_normalized,
    nulls: data.stats.nulls_set,
  };

  return { issues, stats, cleaned: data.cleaned_preview, schema: {} as Record<string, FieldType>, warnings: data.validation_warnings ?? [] };
}

export default function SmeltApp() {
  const {
    step,
    rawData,
    setRawData,
    format,
    setFormat,
    parsed,
    setParsed,
    schema,
    setSchema,
    result,
    setResult,
    exportFormat,
    setExportFormat,
    issueFilter,
    setIssueFilter,
    setStep,
    jobId,
    setJobId,
    isLoading,
    setLoading,
    error,
    setError,
  } = useSmeltStore();

  const { data: session } = useSession();
  const sessionToken = (session as { accessToken?: string } | null)?.accessToken || undefined;

  const [copied, setCopied] = useState(false);
  const [cleanedRecordCount, setCleanedRecordCount] = useState(0);
  const [ingestTab, setIngestTab] = useState<"file" | "paste" | "url">("file");
  const [instructions, setInstructions] = useState("");
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const [airtableOpen, setAirtableOpen] = useState(false);
  const [notionOpen, setNotionOpen] = useState(false);
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [airtableTable, setAirtableTable] = useState("Cleaned Data");
  const [notionToken, setNotionToken] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [notionTitle, setNotionTitle] = useState("Cleaned Data");
  const [integrationResult, setIntegrationResult] = useState<string | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);

  const {
    qualityScoreBefore,
    qualityScoreAfter,
    setQualityScoreBefore,
    setQualityScoreAfter,
    suggestions,
    setSuggestions,
    originalRecords,
    setOriginalRecords,
  } = useSmeltStore();

  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [compareMode, setCompareMode] = useState<"cleaned" | "original">("cleaned");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const applyIngestResponse = useCallback(
    async (data: IngestResponse, token?: string) => {
      const { schema: s, parsed: p, format: f } = mapIngestResponse(data);
      setJobId(data.job_id);
      setFormat(f);
      setParsed(p);
      setSchema(s);
      setOriginalRecords(p);
      setInstructions("");
      setValidationWarnings([]);
      if (data.quality_score) setQualityScoreBefore(data.quality_score);
      setQualityScoreAfter(null);
      setSuggestions([]);
      setStep("Preview");
      setSuggestionsLoading(true);
      try {
        const plan = await fetchPreviewPlan(data.job_id);
        setSuggestions(plan.suggestions);
      } catch {
        // suggestions are informational — don't surface errors
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [setJobId, setFormat, setParsed, setSchema, setStep, setQualityScoreBefore, setQualityScoreAfter, setSuggestions, setOriginalRecords]
  );

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const data = await ingestFile(file, sessionToken);
        await applyIngestResponse(data, sessionToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [applyIngestResponse, setError, setLoading, sessionToken]
  );

  const processRaw = useCallback(
    async (text: string) => {
      setRawData(text);
      setError(null);
      setLoading(true);
      try {
        const data = await ingestRaw(text, sessionToken);
        await applyIngestResponse(data, sessionToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Processing failed");
      } finally {
        setLoading(false);
      }
    },
    [setRawData, applyIngestResponse, setError, setLoading, sessionToken]
  );

  const processUrl = useCallback(
    async (url: string) => {
      setError(null);
      setLoading(true);
      try {
        const data = await ingestUrl(url, sessionToken);
        await applyIngestResponse(data, sessionToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : "URL fetch failed");
      } finally {
        setLoading(false);
      }
    },
    [applyIngestResponse, setError, setLoading, sessionToken]
  );

  const runClean = useCallback(async () => {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    setStep("Review");
    try {
      const data = await cleanJob(jobId, { instructions: instructions || undefined, token: sessionToken });
      const { issues, stats, cleaned, schema: s, warnings } = mapCleanResponse(data);
      setCleanedRecordCount(data.stats.records_out);
      setResult({ cleaned, issues, schema: s, stats });
      setValidationWarnings(warnings);
      if (data.quality_score) setQualityScoreAfter(data.quality_score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cleaning failed");
      setStep("Preview");
    } finally {
      setLoading(false);
    }
  }, [jobId, instructions, sessionToken, setError, setLoading, setStep, setResult, setQualityScoreAfter]);

  const handleShare = useCallback(async () => {
    if (!jobId) return;
    setSharing(true);
    try {
      const { token } = await createShareLink(jobId);
      const url = `${window.location.origin}/report/${token}`;
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
    } catch {
      // ignore
    } finally {
      setSharing(false);
    }
  }, [jobId]);

  const toggleSuggestion = useCallback(
    (id: string) => {
      setSuggestions(suggestions.map((s: Suggestion) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    },
    [suggestions, setSuggestions]
  );

  const { reset } = useSmeltStore();

  const handleStartNew = useCallback(() => {
    reset();
    setInstructions("");
    setValidationWarnings([]);
    setIntegrationResult(null);
    setIntegrationError(null);
    setShareUrl(null);
    setCleanedRecordCount(0);
  }, [reset]);

  const downloadAuditCsv = useCallback(() => {
    if (!result?.issues?.length) return;
    const header = "row,field,original,cleaned,type\n";
    const rows = result.issues
      .map(
        (i) =>
          `${i.row},"${String(i.field).replace(/"/g, '""')}","${String(i.was ?? "").replace(/"/g, '""')}","${String(i.now ?? "").replace(/"/g, '""')}",${i.type}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smelt_audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleDownload = useCallback(async () => {
    if (jobId) {
      await downloadExport(jobId, exportFormat, sessionToken);
    } else if (result) {
      const content =
        exportFormat === "JSON" ? toJSON(result.cleaned) :
        exportFormat === "XML" ? toXML(result.cleaned) :
        toCSV(result.cleaned);
      const ext = exportFormat.toLowerCase();
      const mime = ext === "json" ? "application/json" : ext === "xml" ? "application/xml" : "text/csv";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smelted_data.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [jobId, exportFormat, result, sessionToken]);

  const getExportPreview = (): string => {
    if (!result) return "";
    if (exportFormat === "JSON") return toJSON(result.cleaned);
    if (exportFormat === "CSV") return toCSV(result.cleaned);
    if (exportFormat === "XML") return toXML(result.cleaned);
    return toJSON(result.cleaned);
  };

  const filteredIssues =
    result?.issues?.filter((i) => issueFilter === "all" || i.type === issueFilter) ?? [];

  const containerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "28px 24px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text1,
        fontFamily: "'DM Sans', 'Instrument Sans', system-ui, sans-serif",
      }}
    >
      <Header />
      <StepBar current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={containerStyle}>

            {/* ── INGEST ─────────────────────────────────────────────────────── */}
            {step === "Ingest" && (
              <div>
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    letterSpacing: "-1px",
                    margin: "0 0 6px",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Drop your messy data
                </h1>
                <p style={{ color: T.text2, fontSize: "14px", margin: "0 0 28px", lineHeight: 1.6 }}>
                  Any format. We&apos;ll detect it, clean it, and hand it back pure.
                </p>

                {error && (
                  <div
                    style={{
                      background: T.redBg,
                      border: `1px solid ${T.redBorder}`,
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      fontSize: "13px",
                      color: T.red,
                    }}
                  >
                    {error}
                  </div>
                )}

                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: T.text3, fontSize: "14px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: `2px solid ${T.border}`,
                        borderTopColor: T.accent,
                        margin: "0 auto 12px",
                        animation: "smeltSpin 0.8s linear infinite",
                      }}
                    />
                    {ingestTab === "url" ? "Fetching URL…" : "Uploading…"}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginBottom: "20px",
                        background: T.surface,
                        borderRadius: "8px",
                        padding: "4px",
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      {(["file", "paste", "url"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setIngestTab(tab)}
                          style={{
                            flex: 1,
                            padding: "7px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: ingestTab === tab ? T.accentBg : "transparent",
                            color: ingestTab === tab ? T.accent : T.text3,
                            fontSize: "12px",
                            fontWeight: ingestTab === tab ? 700 : 400,
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.15s",
                          }}
                        >
                          {tab === "file" ? "Drop file" : tab === "paste" ? "Paste data" : "Fetch URL"}
                        </button>
                      ))}
                    </div>

                    {ingestTab === "file" && <FileDropzone onFile={processFile} />}
                    {ingestTab === "paste" && (
                      <>
                        <PasteInput onProcess={() => rawData.trim() && processRaw(rawData)} />
                        <SampleButtons onSelect={processRaw} />
                      </>
                    )}
                    {ingestTab === "url" && <UrlInput onFetch={processUrl} loading={isLoading} />}
                  </>
                )}
              </div>
            )}

            {/* ── PREVIEW ────────────────────────────────────────────────────── */}
            {step === "Preview" && (
              <div className="animate-smelt-fade-in">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        letterSpacing: "-0.5px",
                        margin: "0 0 8px",
                      }}
                    >
                      Data detected
                    </h1>
                    <FormatBadge
                      format={format}
                      recordCount={parsed.length}
                      fieldCount={parsed.length > 0 ? Object.keys(parsed[0]).length : 0}
                    />
                  </div>
                </div>

                {qualityScoreBefore && (
                  <QualityScore score={qualityScoreBefore} label="Data health — before cleaning" />
                )}
                <SchemaDisplay schema={schema} />
                <SuggestionsPanel
                  suggestions={suggestions}
                  onToggle={toggleSuggestion}
                  loading={suggestionsLoading}
                />

                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: T.text3,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    Custom Instructions{" "}
                    <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </div>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Merge first_name and last_name into full_name, remove rows with missing email, rename deal_value to revenue…"
                    rows={3}
                    style={{
                      width: "100%",
                      minHeight: "80px",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px",
                      color: T.text1,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      padding: "10px 12px",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = T.accent; }}
                    onBlur={(e) => { e.target.style.borderColor = T.border; }}
                  />
                  {instructions.trim() && (
                    <div style={{ fontSize: "11px", color: T.text3, marginTop: "4px" }}>
                      These instructions will be passed to the AI alongside standard cleaning rules.
                    </div>
                  )}
                </div>

                <DataPreview records={parsed} schema={schema} />

                <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                  <Button onClick={() => { setStep("Ingest"); setError(null); }}>← Back</Button>
                  <Button primary onClick={runClean} style={{ flex: 1 }}>
                    Smelt this data →
                  </Button>
                </div>
              </div>
            )}

            {/* ── CLEANING ANIMATION ─────────────────────────────────────────── */}
            {step === "Review" && isLoading && <CleaningProgress />}

            {/* ── REVIEW ERROR ───────────────────────────────────────────────── */}
            {step === "Review" && !isLoading && error && (
              <div className="animate-smelt-fade-in">
                <div
                  style={{
                    background: T.redBg,
                    border: `1px solid ${T.redBorder}`,
                    borderRadius: "8px",
                    padding: "16px",
                    fontSize: "13px",
                    color: T.red,
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </div>
                <Button onClick={() => { setStep("Preview"); setError(null); }}>← Back</Button>
              </div>
            )}

            {/* ── REVIEW ─────────────────────────────────────────────────────── */}
            {step === "Review" && !isLoading && !error && result && (
              <div className="animate-smelt-fade-in">
                <h1
                  style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}
                >
                  Cleaning report
                </h1>
                <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 20px" }}>
                  {result.issues.length} changes made · {cleanedRecordCount || result.cleaned.length} clean records ready
                </p>

                {/* Quality score: before vs after */}
                {qualityScoreAfter && qualityScoreBefore && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <QualityScore score={qualityScoreBefore} label="Before" />
                    <QualityScore score={qualityScoreAfter} label="After" />
                  </div>
                )}
                {qualityScoreAfter && !qualityScoreBefore && (
                  <QualityScore score={qualityScoreAfter} label="Data health — after cleaning" />
                )}

                <StatsDashboard stats={result.stats} cleanCount={cleanedRecordCount || result.cleaned.length} />
                <IssueFilters issues={result.issues} activeFilter={issueFilter} onFilter={setIssueFilter} />
                <ChangeLog issues={filteredIssues} />

                {/* Validation warnings from backend */}
                {validationWarnings.length > 0 && (
                  <div
                    style={{
                      background: T.amberBg,
                      border: `1px solid ${T.amberBorder}`,
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "18px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: T.amber,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Validation warnings
                    </div>
                    {validationWarnings.map((w, i) => (
                      <div key={i} style={{ fontSize: "12px", color: T.text2, lineHeight: 1.6 }}>
                        · {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Before / After toggle */}
                <div style={{ marginBottom: "18px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: T.text3,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      {compareMode === "cleaned" ? "Cleaned data" : "Original data"} (first 10 records)
                    </div>
                    {originalRecords.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          borderRadius: "6px",
                          padding: "2px",
                        }}
                      >
                        {(["cleaned", "original"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setCompareMode(mode)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "5px",
                              border: "none",
                              background: compareMode === mode ? T.accentBg : "transparent",
                              color: compareMode === mode ? T.accent : T.text3,
                              fontSize: "11px",
                              fontWeight: compareMode === mode ? 700 : 400,
                              cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {mode === "cleaned" ? "Cleaned" : "Original"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <DataTable
                    records={compareMode === "cleaned" ? result.cleaned : originalRecords.slice(0, 10)}
                    highlightSchema={result.schema}
                  />
                </div>

                {/* Share report link */}
                {shareUrl && (
                  <div
                    style={{
                      background: T.greenBg,
                      border: `1px solid ${T.greenBorder}`,
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      style={{
                        color: T.green,
                        flex: 1,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {shareUrl}
                    </span>
                    <button
                      onClick={() => setShareUrl(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: T.text3,
                        cursor: "pointer",
                        fontSize: "11px",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <Button onClick={() => { setStep("Preview"); setResult(null); }}>← Back</Button>
                  <Button onClick={handleShare} disabled={sharing} style={{ whiteSpace: "nowrap" }}>
                    {sharing ? "Sharing…" : shareUrl ? "Link copied!" : "Share report"}
                  </Button>
                  {result.issues.length > 0 && (
                    <Button onClick={downloadAuditCsv} style={{ whiteSpace: "nowrap" }}>
                      ↓ Audit CSV
                    </Button>
                  )}
                  <Button primary onClick={() => setStep("Export")} style={{ flex: 1 }}>
                    Export clean data →
                  </Button>
                </div>
              </div>
            )}

            {/* ── EXPORT ─────────────────────────────────────────────────────── */}
            {step === "Export" && result && (
              <div className="animate-smelt-fade-in">
                <h1
                  style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}
                >
                  Export
                </h1>
                <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 24px" }}>
                  {cleanedRecordCount || result.cleaned.length} clean records ready to go.
                </p>

                <FormatPicker
                  selected={exportFormat}
                  onSelect={(f) => { setExportFormat(f); setCopied(false); }}
                />
                <ExportPreview
                  content={getExportPreview()}
                  format={exportFormat}
                  recordCount={cleanedRecordCount || result.cleaned.length}
                />

                <div style={{ display: "flex", gap: "10px" }}>
                  <Button onClick={() => setStep("Review")}>← Back</Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard?.writeText(getExportPreview());
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{
                      borderColor: copied ? T.green : T.border,
                      color: copied ? T.green : T.text2,
                    }}
                  >
                    {copied ? "Copied!" : "Copy preview"}
                  </Button>
                  <DownloadButton format={exportFormat} onDownload={handleDownload} />
                </div>

                <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 4px" }}>
                  <button
                    onClick={handleStartNew}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.text3,
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      textDecoration: "underline",
                      textDecorationColor: T.border,
                      textUnderlineOffset: "3px",
                    }}
                  >
                    Start new smelt →
                  </button>
                </div>

                <CRMPushTeaser exportFormat={exportFormat} />

                {/* ── Integration push ────────────────────────────────────── */}
                <div style={{ marginTop: "24px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: T.text3,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                    }}
                  >
                    Push to Integration
                  </div>

                  {!sessionToken && (
                    <div
                      style={{
                        background: T.amberBg,
                        border: `1px solid ${T.amberBorder}`,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginBottom: "12px",
                        fontSize: "12px",
                        color: T.amber,
                      }}
                    >
                      Sign in to push data to Airtable or Notion.
                    </div>
                  )}

                  {integrationResult && (
                    <div
                      style={{
                        background: T.greenBg,
                        border: `1px solid ${T.greenBorder}`,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginBottom: "12px",
                        fontSize: "13px",
                        color: T.green,
                      }}
                    >
                      {integrationResult}
                    </div>
                  )}
                  {integrationError && (
                    <div
                      style={{
                        background: T.redBg,
                        border: `1px solid ${T.redBorder}`,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginBottom: "12px",
                        fontSize: "13px",
                        color: T.red,
                      }}
                    >
                      {integrationError}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {/* Airtable card */}
                    <div
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: "10px",
                        padding: "16px 20px",
                        opacity: sessionToken ? 1 : 0.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            background: "#FF6E3C",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "11px",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            AT
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text1 }}>Airtable</div>
                          <div style={{ fontSize: "11px", color: T.text3 }}>Push to a base</div>
                        </div>
                        <button
                          disabled={!sessionToken}
                          onClick={() => { setAirtableOpen(!airtableOpen); setNotionOpen(false); setIntegrationResult(null); setIntegrationError(null); }}
                          style={{
                            marginLeft: "auto",
                            background: "none",
                            border: `1px solid ${T.border}`,
                            borderRadius: "6px",
                            color: T.text2,
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            cursor: sessionToken ? "pointer" : "not-allowed",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {airtableOpen ? "Cancel" : "Connect"}
                        </button>
                      </div>

                      {airtableOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input
                            type="password"
                            value={airtableToken}
                            onChange={(e) => setAirtableToken(e.target.value)}
                            placeholder="Personal Access Token"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <input
                            type="text"
                            value={airtableBaseId}
                            onChange={(e) => setAirtableBaseId(e.target.value)}
                            placeholder="Base ID (appXXXXXX)"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <input
                            type="text"
                            value={airtableTable}
                            onChange={(e) => setAirtableTable(e.target.value)}
                            placeholder="Table Name"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <button
                            disabled={integrationLoading || !airtableToken || !airtableBaseId}
                            onClick={async () => {
                              if (!jobId || !sessionToken) return;
                              setIntegrationLoading(true);
                              setIntegrationResult(null);
                              setIntegrationError(null);
                              try {
                                const r = await exportToAirtable(sessionToken, {
                                  job_id: jobId,
                                  personal_access_token: airtableToken,
                                  base_id: airtableBaseId,
                                  table_name: airtableTable || "Cleaned Data",
                                });
                                setIntegrationResult(
                                  `✓ ${r.records_pushed} records pushed to Airtable${r.truncated ? " (first 100 — dataset was truncated)" : ""}`
                                );
                                setAirtableOpen(false);
                              } catch (e) {
                                setIntegrationError(e instanceof Error ? e.message : "Airtable push failed");
                              } finally {
                                setIntegrationLoading(false);
                              }
                            }}
                            style={{
                              background: T.accentBg,
                              border: `1px solid ${T.accentBorder}`,
                              borderRadius: "6px",
                              color: T.accent,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "7px 10px",
                              cursor:
                                integrationLoading || !airtableToken || !airtableBaseId
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                integrationLoading || !airtableToken || !airtableBaseId ? 0.5 : 1,
                            }}
                          >
                            {integrationLoading ? "Pushing…" : "Push to Airtable"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notion card */}
                    <div
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: "10px",
                        padding: "16px 20px",
                        opacity: sessionToken ? 1 : 0.5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            background: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          <span
                            style={{ color: "#fff", fontWeight: 700, fontSize: "14px", fontFamily: "serif" }}
                          >
                            N
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text1 }}>Notion</div>
                          <div style={{ fontSize: "11px", color: T.text3 }}>Create a database</div>
                        </div>
                        <button
                          disabled={!sessionToken}
                          onClick={() => { setNotionOpen(!notionOpen); setAirtableOpen(false); setIntegrationResult(null); setIntegrationError(null); }}
                          style={{
                            marginLeft: "auto",
                            background: "none",
                            border: `1px solid ${T.border}`,
                            borderRadius: "6px",
                            color: T.text2,
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 10px",
                            cursor: sessionToken ? "pointer" : "not-allowed",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {notionOpen ? "Cancel" : "Connect"}
                        </button>
                      </div>

                      {notionOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input
                            type="password"
                            value={notionToken}
                            onChange={(e) => setNotionToken(e.target.value)}
                            placeholder="Integration Token (secret_…)"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <input
                            type="text"
                            value={notionPageId}
                            onChange={(e) => setNotionPageId(e.target.value)}
                            placeholder="Parent Page ID (from URL)"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <input
                            type="text"
                            value={notionTitle}
                            onChange={(e) => setNotionTitle(e.target.value)}
                            placeholder="Database Title"
                            style={{
                              background: T.bg,
                              border: `1px solid ${T.border}`,
                              borderRadius: "6px",
                              color: T.text1,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              padding: "7px 10px",
                              outline: "none",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          />
                          <button
                            disabled={integrationLoading || !notionToken || !notionPageId}
                            onClick={async () => {
                              if (!jobId || !sessionToken) return;
                              setIntegrationLoading(true);
                              setIntegrationResult(null);
                              setIntegrationError(null);
                              try {
                                const r = await exportToNotion(sessionToken, {
                                  job_id: jobId,
                                  integration_token: notionToken,
                                  parent_page_id: notionPageId,
                                  database_title: notionTitle || "Cleaned Data",
                                });
                                setIntegrationResult(
                                  `✓ ${r.records_pushed} records pushed to Notion${r.truncated ? " (first 100 — dataset was truncated)" : ""}`
                                );
                                setNotionOpen(false);
                              } catch (e) {
                                setIntegrationError(e instanceof Error ? e.message : "Notion push failed");
                              } finally {
                                setIntegrationLoading(false);
                              }
                            }}
                            style={{
                              background: T.accentBg,
                              border: `1px solid ${T.accentBorder}`,
                              borderRadius: "6px",
                              color: T.accent,
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "7px 10px",
                              cursor:
                                integrationLoading || !notionToken || !notionPageId
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                integrationLoading || !notionToken || !notionPageId ? 0.5 : 1,
                            }}
                          >
                            {integrationLoading ? "Pushing…" : "Push to Notion"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
