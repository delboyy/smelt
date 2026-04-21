"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/constants";
import { fetchReport } from "@/lib/api";
import type { ReportData } from "@/lib/api";
import { QualityScore } from "@/components/ui/QualityScore";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: "10px",
        padding: "16px 20px",
        flex: 1,
        minWidth: "120px",
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700, color: T.text1, fontFamily: "'DM Mono', monospace" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: "11px", color: T.text3, marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: "11px", color: T.text2, marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchReport(token)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const logoBlock = (
    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: 800,
          color: T.bg,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        S
      </div>
      <span style={{ fontSize: "16px", fontWeight: 700, color: T.text1, letterSpacing: "-0.3px" }}>Smelt</span>
    </Link>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "smeltSpin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
        {logoBlock}
        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: "10px", padding: "20px 28px", color: T.red, fontSize: "14px", maxWidth: "400px", textAlign: "center" }}>
          {error}
        </div>
        <Link href="/" style={{ fontSize: "13px", color: T.text3, textDecoration: "none" }}>← Back to Smelt</Link>
      </div>
    );
  }

  if (!report) return null;

  const deltaRows = report.record_count_out != null ? report.record_count_in - report.record_count_out : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {logoBlock}
        <span style={{ fontSize: "11px", color: T.text3, textTransform: "uppercase", letterSpacing: "1px" }}>Cleaning Report</span>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
            {report.filename}
          </h1>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: "'DM Mono', monospace" }}>
              {report.format}
            </span>
            <span style={{ fontSize: "12px", color: T.text3 }}>
              Expires {new Date(report.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Quality scores */}
        {report.quality_before && report.quality_after && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            <QualityScore score={report.quality_before} label="Before" />
            <QualityScore score={report.quality_after} label="After" />
          </div>
        )}
        {report.quality_after && !report.quality_before && (
          <div style={{ marginBottom: "24px" }}>
            <QualityScore score={report.quality_after} label="Data quality after cleaning" />
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "32px" }}>
          <StatCard label="Records in" value={report.record_count_in} />
          {report.record_count_out != null && (
            <StatCard label="Records out" value={report.record_count_out} />
          )}
          {deltaRows > 0 && <StatCard label="Rows removed" value={deltaRows} sub="duplicates + empty" />}
          <StatCard label="Fields fixed" value={report.fields_normalized} />
          <StatCard label="Nulls set" value={report.nulls_set} />
        </div>

        {/* CTA */}
        <div
          style={{
            background: T.accentBg,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: "12px",
            padding: "24px 28px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: T.text1 }}>
            Clean your own data with Smelt
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: T.text3 }}>
            AI-powered data cleaning. CSV, JSON, XML, TSV. Free to start.
          </p>
          <Link
            href="/app"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: T.bg,
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Try Smelt free →
          </Link>
        </div>
      </div>
    </div>
  );
}
