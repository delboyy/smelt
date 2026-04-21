"use client";

import { T } from "@/lib/constants";
import type { Suggestion } from "@/lib/api";

type Props = {
  suggestions: Suggestion[];
  onToggle: (id: string) => void;
  loading: boolean;
};

const CATEGORY_COLOR: Record<string, string> = {
  dedup: T.red,
  nullify: T.copper,
  normalize: T.accent,
};

const CATEGORY_LABEL: Record<string, string> = {
  dedup: "Dedup",
  normalize: "Normalize",
  nullify: "Nullify",
};

export function SuggestionsPanel({ suggestions, onToggle, loading }: Props) {
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.text3, fontSize: "13px", padding: "12px 0" }}>
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: `2px solid ${T.border}`,
            borderTopColor: T.accent,
            animation: "smeltSpin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        Analysing data…
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: T.greenBg,
          border: `1px solid ${T.greenBorder}`,
          borderRadius: "8px",
          fontSize: "13px",
          color: T.green,
          marginBottom: "4px",
        }}
      >
        ✓ No obvious issues detected — Smelt will still apply standard normalizations
      </div>
    );
  }

  const enabled = suggestions.filter((s) => s.enabled).length;

  return (
    <div style={{ marginBottom: "4px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: T.text2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Suggested fixes
        </div>
        <div style={{ fontSize: "11px", color: T.text3 }}>
          {enabled} of {suggestions.length} selected
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              background: s.enabled ? T.accentBg : T.surface,
              border: `1px solid ${s.enabled ? T.accentBorder : T.border}`,
              borderRadius: "8px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
              width: "100%",
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                border: `2px solid ${s.enabled ? T.accent : T.borderLight}`,
                background: s.enabled ? T.accent : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.enabled && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke={T.bg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: T.text1 }}>{s.label}</div>
              <div style={{ fontSize: "11px", color: T.text3, marginTop: "1px" }}>{s.description}</div>
            </div>

            {/* Category + count */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "999px",
                  color: CATEGORY_COLOR[s.category] ?? T.text3,
                  background: `${CATEGORY_COLOR[s.category] ?? T.text3}15`,
                  border: `1px solid ${CATEGORY_COLOR[s.category] ?? T.text3}30`,
                }}
              >
                {CATEGORY_LABEL[s.category] ?? s.category}
              </span>
              <span style={{ fontSize: "11px", color: T.text3, fontFamily: "'DM Mono', monospace" }}>
                {s.affected_rows} row{s.affected_rows !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
