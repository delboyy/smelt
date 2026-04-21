"use client";

import { T } from "@/lib/constants";
import type { QualityScore as QualityScoreType } from "@/lib/api";

type Props = {
  score: QualityScoreType;
  label?: string;
  compact?: boolean;
};

const GRADE_COLOR: Record<string, string> = {
  A: T.green,
  B: "#22d3ee",
  C: T.accent,
  D: T.copper,
  F: T.red,
};

function Ring({ score, grade }: { score: number; grade: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = GRADE_COLOR[grade] ?? T.accent;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke={T.border} strokeWidth="7" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="48" y="44" textAnchor="middle" fill={T.text1} fontSize="20" fontWeight="700" fontFamily="DM Sans, sans-serif">
        {score}
      </text>
      <text x="48" y="60" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">
        {grade}
      </text>
    </svg>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? T.green : value >= 70 ? T.accent : value >= 50 ? T.copper : T.red;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "16px", fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: T.text3, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}

export function QualityScore({ score, label, compact }: Props) {
  if (compact) {
    const color = GRADE_COLOR[score.grade] ?? T.accent;
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "999px",
          border: `1px solid ${color}30`,
          background: `${color}10`,
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
          {score.score}
        </span>
        <span style={{ fontSize: "11px", color: T.text3 }}>Quality</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{score.grade}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: "10px",
        padding: "20px 24px",
        marginBottom: "16px",
      }}
    >
      {label && (
        <div style={{ fontSize: "11px", color: T.text3, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
        <Ring score={score.score} grade={score.grade} />
        <div style={{ display: "flex", gap: "24px", flex: 1, flexWrap: "wrap" }}>
          <SubScore label="Complete" value={score.completeness} />
          <SubScore label="Consistent" value={score.consistency} />
          <SubScore label="Unique" value={score.uniqueness} />
          <SubScore label="Conformed" value={score.conformity} />
        </div>
      </div>
    </div>
  );
}
