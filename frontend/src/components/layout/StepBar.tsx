"use client";

import { STEPS, T } from "@/lib/constants";
import type { Step } from "@/lib/constants";

type StepBarProps = { current: Step };

export function StepBar({ current }: StepBarProps) {
  const ci = STEPS.indexOf(current);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderBottom: `1px solid ${T.border}`,
        background: `${T.surface}80`,
        backdropFilter: "blur(12px)",
        overflowX: "auto",
      }}
    >
      {STEPS.map((s, i) => {
        const active = i <= ci;
        const isCurrent = i === ci;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: isCurrent ? `2px solid ${T.accent}` : "2px solid transparent",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: isCurrent ? T.accent : active ? T.accentBg : "transparent",
                  color: isCurrent ? T.bg : active ? T.accent : T.text3,
                  border: isCurrent ? "none" : `1px solid ${active ? T.accentBorder : T.border}`,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? T.text1 : active ? T.text2 : T.text3,
                  letterSpacing: "0.3px",
                }}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: "20px",
                  height: "1px",
                  background: active && i < ci ? `${T.accent}40` : T.border,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
