"use client";

import { T } from "@/lib/constants";

type ExportPreviewProps = {
  content: string;
  format: string;
  recordCount: number;
};

export function ExportPreview({ content, format, recordCount }: ExportPreviewProps) {
  return (
    <div
      style={{
        borderRadius: "10px",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.border}`,
          fontSize: "11px",
          color: T.text3,
          background: T.surfaceAlt,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        <span>Output · {format}</span>
        <span>{recordCount} records</span>
      </div>
      <pre
        style={{
          padding: "16px",
          margin: 0,
          fontSize: "11px",
          lineHeight: 1.7,
          color: T.text1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          maxHeight: "300px",
          overflowY: "auto",
          fontFamily: "'DM Mono', monospace",
          background: T.surface,
        }}
      >
        {content}
      </pre>
    </div>
  );
}
