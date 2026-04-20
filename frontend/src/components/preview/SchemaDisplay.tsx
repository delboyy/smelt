"use client";

import { T } from "@/lib/constants";

type SchemaDisplayProps = {
  schema: Record<string, string>;
};

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
  if (!Object.keys(schema).length) return null;
  return (
    <div
      style={{
        background: T.surface,
        borderRadius: "10px",
        border: `1px solid ${T.border}`,
        padding: "16px 18px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: T.text3,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        Schema inference
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Object.entries(schema).map(([k, v]) => (
          <span
            key={k}
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: T.surfaceAlt,
              border: `1px solid ${T.border}`,
              color: T.text2,
            }}
          >
            <span style={{ color: T.text1, fontWeight: 600 }}>{k}</span>{" "}
            <span style={{ color: T.accent }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
