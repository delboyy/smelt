"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { StepBar } from "@/components/layout/StepBar";
import { FileDropzone } from "@/components/ingest/FileDropzone";
import { PasteInput } from "@/components/ingest/PasteInput";
import { SampleButtons } from "@/components/ingest/SampleButtons";
import { FormatBadge } from "@/components/ingest/FormatBadge";
import { SchemaDisplay } from "@/components/preview/SchemaDisplay";
import { DataPreview } from "@/components/preview/DataPreview";
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
import { detectFormat } from "@/lib/detection/format";
import { inferFieldType, type FieldType } from "@/lib/detection/schema";
import { parseCSV } from "@/lib/parsers/csv";
import { parseJSON } from "@/lib/parsers/json";
import { parseXML } from "@/lib/parsers/xml";
import { parseTSV } from "@/lib/parsers/tsv";
import { cleanRecords } from "@/lib/cleaning/engine";
import { toCSV, toJSON, toXML } from "@/lib/export/formatters";
import { T } from "@/lib/constants";

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
  } = useSmeltStore();

  const [processingAnim, setProcessingAnim] = useState(false);
  const [copied, setCopied] = useState(false);

  const processRaw = useCallback(
    (text: string) => {
      setRawData(text);
      const fmt = detectFormat(text);
      setFormat(fmt);
      let records: Record<string, unknown>[] = [];
      try {
        if (fmt === "JSON") records = parseJSON(text);
        else if (fmt === "XML") records = parseXML(text) as Record<string, unknown>[];
        else if (fmt === "CSV") records = parseCSV(text);
        else if (fmt === "TSV") records = parseTSV(text);
      } catch {
        records = [];
      }
      if (records.length && typeof records[0] === "object") {
        const keys = Object.keys(records[0]);
        const s: Record<string, FieldType> = {};
        keys.forEach((k) => {
          s[k] = inferFieldType(k, records.map((r) => r[k]));
        });
        setSchema(s);
      }
      setParsed(records);
      setStep("Preview");
    },
    [setRawData, setFormat, setParsed, setSchema, setStep]
  );

  const runClean = () => {
    setProcessingAnim(true);
    setTimeout(() => {
      const r = cleanRecords(parsed);
      setResult(r);
      setStep("Review");
      setProcessingAnim(false);
    }, 1200);
  };

  const getExport = (): string => {
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

            <FileDropzone onData={processRaw} />

            <div style={dividerStyle}>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <span
                style={{
                  fontSize: "11px",
                  color: T.text3,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                or paste raw data
              </span>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
            </div>

            <PasteInput onProcess={() => rawData.trim() && processRaw(rawData)} />
            <SampleButtons onSelect={processRaw} />
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

            <SchemaDisplay schema={schema} />
            <DataPreview records={parsed} schema={schema} />

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <Button onClick={() => setStep("Ingest")}>← Back</Button>
              <Button primary onClick={runClean} style={{ flex: 1 }}>
                Smelt this data →
              </Button>
            </div>
          </div>
        )}

        {/* CLEANING ANIMATION */}
        {step === "Review" && processingAnim && <CleaningProgress />}

        {/* REVIEW */}
        {step === "Review" && !processingAnim && result && (
          <div className="animate-smelt-fade-in">
            <h1
              style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}
            >
              Cleaning report
            </h1>
            <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 20px" }}>
              {result.issues.length} changes made · {result.cleaned.length} clean records ready
            </p>

            <StatsDashboard stats={result.stats} cleanCount={result.cleaned.length} />
            <IssueFilters issues={result.issues} activeFilter={issueFilter} onFilter={setIssueFilter} />
            <ChangeLog issues={filteredIssues} />

            <div style={{ marginBottom: "18px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: T.text3,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                Cleaned data
              </div>
              <DataTable records={result.cleaned} highlightSchema={result.schema} />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={() => { setStep("Preview"); setResult(null); }}>← Back</Button>
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
              {result.cleaned.length} clean records ready to go.
            </p>

            <FormatPicker
              selected={exportFormat}
              onSelect={(f) => { setExportFormat(f); setCopied(false); }}
            />
            <ExportPreview
              content={getExport()}
              format={exportFormat}
              recordCount={result.cleaned.length}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <Button onClick={() => setStep("Review")}>← Back</Button>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(getExport());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  borderColor: copied ? T.green : T.border,
                  color: copied ? T.green : T.text2,
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
              <DownloadButton content={getExport()} format={exportFormat} />
            </div>

            <CRMPushTeaser exportFormat={exportFormat} />
          </div>
        )}
      </div>
    </div>
  );
}
