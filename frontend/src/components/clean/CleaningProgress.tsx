"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/lib/constants";

const MONO = "'DM Mono', 'JetBrains Mono', monospace";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const PHASES = [
  { label: "Sampling dataset", sub: "Selecting 100 representative rows for AI analysis" },
  { label: "Generating transform spec", sub: "AI inferring schema and writing deterministic transforms" },
  { label: "Running Polars pipeline", sub: "Normalising fields, fixing dates, standardising formats" },
  { label: "Deduplicating records", sub: "Fingerprinting rows and removing exact matches" },
  { label: "Calculating quality score", sub: "Measuring completeness, consistency, uniqueness, conformity" },
];

const PHASE_TIMINGS = [900, 2400, 1800, 1200, 900];

export function CleaningProgress() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let idx = 0;
    const tick = () => {
      idx++;
      if (idx < PHASES.length) {
        setPhaseIdx(idx);
        const t = setTimeout(tick, PHASE_TIMINGS[idx] ?? 1000);
        timeoutRefs.current.push(t);
      }
    };
    const first = setTimeout(tick, PHASE_TIMINGS[0]);
    timeoutRefs.current.push(first);
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  const pct = Math.round((phaseIdx / (PHASES.length - 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      style={{ textAlign: "center", padding: "64px 24px", maxWidth: "520px", margin: "0 auto" }}
    >
      {/* Pipeline node visualization */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "36px" }}>
        {PHASES.map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative", width: "12px", height: "12px", flexShrink: 0 }}>
              <motion.div
                animate={{
                  background: i <= phaseIdx ? T.accent : T.border,
                  boxShadow: i === phaseIdx ? `0 0 14px ${T.accent}70` : "none",
                }}
                transition={{ duration: 0.3 }}
                style={{ width: "12px", height: "12px", borderRadius: "50%", position: "absolute", inset: 0 }}
              />
              {i === phaseIdx && (
                <motion.div
                  animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  style={{ width: "12px", height: "12px", borderRadius: "50%", background: T.accent, position: "absolute", inset: 0 }}
                />
              )}
            </div>
            {i < PHASES.length - 1 && (
              <div style={{
                width: "44px", height: "2px", flexShrink: 0,
                background: i < phaseIdx ? T.accent : T.border,
                transition: "background 0.5s ease",
                borderRadius: "1px",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <div style={{ fontSize: "17px", fontWeight: 700, color: T.text1, marginBottom: "6px", letterSpacing: "-0.3px" }}>
            {PHASES[phaseIdx].label}
          </div>
          <div style={{ fontSize: "13px", color: T.text3, lineHeight: 1.55 }}>
            {PHASES[phaseIdx].sub}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: T.text3, fontFamily: MONO }}>processing</span>
          <motion.span
            key={pct}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: "11px", color: T.accent, fontFamily: MONO, fontWeight: 700 }}
          >
            {pct}%
          </motion.span>
        </div>
        <div style={{ height: "3px", background: T.border, borderRadius: "2px", overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${T.accent}, ${T.copper})`, borderRadius: "2px" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
