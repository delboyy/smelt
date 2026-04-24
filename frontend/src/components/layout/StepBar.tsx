"use client";

import { motion } from "framer-motion";
import { STEPS, T } from "@/lib/constants";
import type { Step } from "@/lib/constants";

const MONO = "'DM Mono', 'JetBrains Mono', monospace";

type StepBarProps = { current: Step };

export function StepBar({ current }: StepBarProps) {
  const ci = STEPS.indexOf(current);
  return (
    <nav
      aria-label="Wizard steps"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        height: "52px",
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(9,9,11,0.92)",
        backdropFilter: "blur(20px)",
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
                padding: "0 14px",
                height: "52px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                whiteSpace: "nowrap",
              }}
            >
              {/* Active gradient underline */}
              {isCurrent && (
                <motion.div
                  layoutId="step-indicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: `linear-gradient(90deg, ${T.accent}, ${T.copper})`,
                    borderRadius: "1px",
                  }}
                />
              )}

              {/* Step circle */}
              <motion.div
                animate={{
                  background: isCurrent ? T.accent : done ? T.accentBg : "transparent",
                  borderColor: isCurrent ? T.accent : done ? T.accentBorder : T.border,
                  scale: isCurrent ? 1.12 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: MONO,
                  color: isCurrent ? T.bg : active ? T.accent : T.text3,
                  border: "1.5px solid",
                  flexShrink: 0,
                }}
                aria-current={isCurrent ? "step" : undefined}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </motion.div>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? T.text1 : active ? T.text2 : T.text3,
                  letterSpacing: "0.15px",
                  transition: "color 0.2s",
                }}
              >
                {s}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div style={{
                width: "32px",
                height: "1px",
                background: done
                  ? `linear-gradient(90deg, ${T.accent}60, ${T.accent}20)`
                  : T.border,
                flexShrink: 0,
                transition: "background 0.5s",
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
