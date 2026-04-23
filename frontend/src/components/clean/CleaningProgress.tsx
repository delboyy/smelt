"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/lib/constants";

const PHASES = [
  { label: "Sampling your dataset", sub: "Selecting 100 representative rows for AI analysis" },
  { label: "Generating transform spec", sub: "AI inferring schema and writing deterministic transforms" },
  { label: "Running Polars pipeline", sub: "Normalising fields, fixing dates, standardising formats" },
  { label: "Deduplicating records", sub: "Fingerprinting rows and removing exact matches" },
  { label: "Calculating quality score", sub: "Measuring completeness, consistency, uniqueness, conformity" },
];

const PHASE_TIMINGS = [900, 2400, 1800, 1200, 900];

export function CleaningProgress() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  // Track all scheduled timeouts so every one is cleared on unmount
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: "center", padding: "80px 24px", maxWidth: "480px", margin: "0 auto" }}
    >
      <div style={{ position: "relative", width: "72px", height: "72px", margin: "0 auto 32px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${T.border}` }} />
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `3px solid ${T.accent}`,
            borderTopColor: "transparent",
            borderRightColor: "transparent",
            animation: "smeltSpin 0.9s linear infinite",
          }}
        />
        <div style={{ position: "absolute", inset: "12px", borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phaseIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ fontSize: "17px", fontWeight: 700, color: T.text1, marginBottom: "6px", letterSpacing: "-0.3px" }}>
            {PHASES[phaseIdx].label}
          </div>
          <div style={{ fontSize: "13px", color: T.text3, lineHeight: 1.5 }}>
            {PHASES[phaseIdx].sub}
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "36px" }}>
        {PHASES.map((_, i) => (
          <motion.div
            key={i}
            animate={{ background: i <= phaseIdx ? T.accent : T.border, scale: i === phaseIdx ? 1.25 : 1 }}
            transition={{ duration: 0.3 }}
            style={{ width: "7px", height: "7px", borderRadius: "50%", background: i <= phaseIdx ? T.accent : T.border }}
          />
        ))}
      </div>
    </motion.div>
  );
}
