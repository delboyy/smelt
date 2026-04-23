"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { T } from "@/lib/constants";
import { fetchJobs } from "@/lib/api";
import type { JobIndexEntry } from "@/lib/api";

function GradeBadge({ grade }: { grade?: string }) {
  const colors: Record<string, string> = { A: T.green, B: "#22d3ee", C: T.accent, D: T.copper, F: T.red };
  const color = grade ? (colors[grade] ?? T.text3) : T.text3;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        borderRadius: "6px",
        border: `1px solid ${color}40`,
        background: `${color}10`,
        fontSize: "11px",
        fontWeight: 700,
        color,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {grade ?? "—"}
    </span>
  );
}

function FormatBadge({ format }: { format: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: T.accentBg,
        color: T.accent,
        border: `1px solid ${T.accentBorder}`,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {format}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const sessionToken = (session as { accessToken?: string } | null)?.accessToken || undefined;

  const [jobs, setJobs] = useState<JobIndexEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJobs(page, 20, sessionToken)
      .then((r) => {
        setJobs(r.jobs);
        setTotal(r.total);
        setPages(r.pages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, sessionToken]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif" }}>
      <Header />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
              Cleaning history
            </h1>
            <p style={{ color: T.text3, fontSize: "13px", margin: 0 }}>
              {total} job{total !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <Link
            href="/app"
            style={{
              padding: "8px 16px",
              borderRadius: "7px",
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: T.bg,
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            New smelt →
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0", color: T.text3, fontSize: "14px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: `2px solid ${T.border}`,
                borderTopColor: T.accent,
                margin: "0 auto 12px",
                animation: "smeltSpin 0.8s linear infinite",
              }}
            />
            Loading history…
          </div>
        )}

        {error && (
          <div
            style={{
              background: T.redBg,
              border: `1px solid ${T.redBorder}`,
              borderRadius: "8px",
              padding: "14px 16px",
              color: T.red,
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: T.text3,
              border: `1px dashed ${T.border}`,
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚗️</div>
            <p style={{ margin: "0 0 6px", fontSize: "15px", color: T.text2 }}>No jobs yet</p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Start by{" "}
              <Link href="/app" style={{ color: T.accent, textDecoration: "none" }}>
                uploading some data →
              </Link>
            </p>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <>
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 100px 80px 80px",
                  padding: "10px 16px",
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: "10px",
                  color: T.text3,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                }}
              >
                <span>File</span>
                <span>Format</span>
                <span>Records</span>
                <span>Quality</span>
                <span>Date</span>
              </div>

              {jobs.map((job, i) => (
                <div
                  key={job.job_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 100px 80px 80px",
                    padding: "12px 16px",
                    borderBottom: i < jobs.length - 1 ? `1px solid ${T.border}` : "none",
                    alignItems: "center",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <div style={{ color: T.text1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.filename || "Untitled"}
                    </div>
                    <div style={{ color: T.text3, fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
                      {job.job_id}
                    </div>
                  </div>
                  <div>
                    <FormatBadge format={job.format} />
                  </div>
                  <div style={{ color: T.text2, fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>
                    {job.record_count.toLocaleString()}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <GradeBadge grade={job.quality_score_before?.grade} />
                    {job.quality_score_before && (
                      <span style={{ fontSize: "11px", color: T.text3, fontFamily: "'DM Mono', monospace" }}>
                        {job.quality_score_before.score}
                      </span>
                    )}
                  </div>
                  <div style={{ color: T.text3, fontSize: "11px" }}>
                    {formatDate(job.created_at)}
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: page === 1 ? T.text3 : T.text1,
                    fontSize: "13px",
                    cursor: page === 1 ? "default" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: "13px", color: T.text3, alignSelf: "center" }}>
                  {page} / {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: page === pages ? T.text3 : T.text1,
                    fontSize: "13px",
                    cursor: page === pages ? "default" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
