"use client";

import { useState, useCallback } from "react";
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
import { ingestFile, ingestRaw, ingestUrl, cleanJob, downloadExport, fetchPreviewPlan, createShareLink } from "@/lib/api";
import type { IngestResponse, CleanResponse, Suggestion } from "@/lib/api";
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

  return { issues, stats, cleaned: data.cleaned_preview, schema: {} as Record<string, FieldType> };
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

  const [copied, setCopied] = useState(false);
  const [cleanedRecordCount, setCleanedRecordCount] = useState(0);
  const [ingestTab, setIngestTab] = useState<"file" | "paste" | "url">("file");

  const {
    qualityScoreBefore, qualityScoreAfter, setQualityScoreBefore, setQualityScoreAfter,
    suggestions, setSuggestions, originalRecords, setOriginalRecords,
  } = useSmeltStore();

  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [compareMode, setCompareMode] = useState<"cleaned" | "original">("cleaned");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const applyIngestResponse = useCallback(
    async (data: IngestResponse) => {
      const { schema: s, parsed: p, format: f } = mapIngestResponse(data);
      setJobId(data.job_id);
      setFormat(f);
      setParsed(p);
      setSchema(s);
      setOriginalRecords(p);
      if (data.quality_score) setQualityScoreBefore(data.quality_score);
      setQualityScoreAfter(null);
      setSuggestions([]);
      setStep("Preview");
      // Fetch suggestions in background
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
        const data = await ingestFile(file);
        await applyIngestResponse(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setLoading(false);
      }
    },
    [applyIngestResponse, setError, setLoading]
  );

  const processRaw = useCallback(
    async (text: string) => {
      setRawData(text);
      setError(null);
      setLoading(true);
      try {
        const data = await ingestRaw(text);
        await applyIngestResponse(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Processing failed");
      } finally {
        setLoading(false);
      }
    },
    [setRawData, applyIngestResponse, setError, setLoading]
  );

  const processUrl = useCallback(
    async (url: string) => {
      setError(null);
      setLoading(true);
      try {
        const data = await ingestUrl(url);
        await applyIngestResponse(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "URL fetch failed");
      } finally {
        setLoading(false);
      }
    },
    [applyIngestResponse, setError, setLoading]
  );

  const runClean = useCallback(async () => {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    setStep("Review");
    try {
      const data = await cleanJob(jobId);
      const { issues, stats, cleaned, schema: s } = mapCleanResponse(data);
      setCleanedRecordCount(data.stats.records_out);
      setResult({ cleaned, issues, schema: s, stats });
      if (data.quality_score) setQualityScoreAfter(data.quality_score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cleaning failed");
      setStep("Preview");
    } finally {
      setLoading(false);
    }
  }, [jobId, setError, setLoading, setStep, setResult]);

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

  const toggleSuggestion = useCallback((id: string) => {
    setSuggestions(suggestions.map((s: Suggestion) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }, [suggestions, setSuggestions]);

  const handleDownload = useCallback(async () => {
    if (jobId) {
      await downloadExport(jobId, exportFormat);
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
  }, [jobId, exportFormat, result]);

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

  const dividerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
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

      <div style={containerStyle}>
        {/* INGEST */}
        {step === "Ingest" && (
          <div className="animate-smelt-fade-in">
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
                {/* Tabs */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: T.surface, borderRadius: "8px", padding: "4px", border: `1px solid ${T.border}` }}>
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

        {/* PREVIEW */}
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
            <DataPreview records={parsed} schema={schema} />

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <Button onClick={() => { setStep("Ingest"); setError(null); }}>← Back</Button>
              <Button primary onClick={runClean} style={{ flex: 1 }}>
                Smelt this data →
              </Button>
            </div>
          </div>
        )}

        {/* CLEANING ANIMATION */}
        {step === "Review" && isLoading && <CleaningProgress />}

        {/* REVIEW ERROR */}
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

        {/* REVIEW */}
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

            {/* Before / After toggle */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {compareMode === "cleaned" ? "Cleaned data" : "Original data"} (first 10 records)
                </div>
                {originalRecords.length > 0 && (
                  <div style={{ display: "flex", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "2px" }}>
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

            {/* Share report */}
            {shareUrl ? (
              <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                <span style={{ color: T.green, flex: 1, fontFamily: "'DM Mono', monospace", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>
                <button onClick={() => setShareUrl(null)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>✕</button>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={() => { setStep("Preview"); setResult(null); }}>← Back</Button>
              <Button onClick={handleShare} disabled={sharing} style={{ whiteSpace: "nowrap" }}>
                {sharing ? "Sharing…" : shareUrl ? "Link copied!" : "Share report"}
              </Button>
              <Button primary onClick={() => setStep("Export")} style={{ flex: 1 }}>
                Export clean data →
              </Button>
            </div>
          </div>
        )}

        {/* EXPORT */}
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

            <CRMPushTeaser exportFormat={exportFormat} />
          </div>
        )}
      </div>
    </div>
  );
}
