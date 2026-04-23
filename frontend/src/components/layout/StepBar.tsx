"use client";

import { motion } from "framer-motion";
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
        background: `${T.surface}99`,
        backdropFilter: "blur(16px)",
        overflowX: "auto",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {STEPS.map((s, i) => {
        const done = i < ci;
        const isCurrent = i === ci;
        const active = i <= ci;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                padding: "13px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: isCurrent ? `2px solid ${T.accent}` : "2px solid transparent",
                transition: "all 0.25s",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {/* Step circle */}
              <motion.div
                animate={{
                  background: isCurrent ? T.accent : done ? T.accentBg : "transparent",
                  borderColor: isCurrent ? T.accent : done ? T.accentBorder : T.border,
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: isCurrent ? T.bg : active ? T.accent : T.text3,
                  border: `1.5px solid`,
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : i + 1}
              </motion.div>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? T.text1 : active ? T.text2 : T.text3,
                  letterSpacing: "0.2px",
                  transition: "color 0.2s",
                }}
              >
                {s}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div style={{ width: "20px", height: "1px", background: done ? `${T.accent}50` : T.border, flexShrink: 0, transition: "background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
