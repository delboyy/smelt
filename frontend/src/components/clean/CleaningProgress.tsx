"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/lib/constants";

const PHASES = [
  { label: "Sampling your dataset", sub: "Selecting 100 representative rows for AI analysis" },
  { label: "Generating transform spec", sub: "AI inferring schema and writing deterministic transforms" },
  { label: "Running Polars pipeline", sub: "Normalising fields, fixing dates, standardising formats" },
  { label: "Deduplicating records", sub: "Fingerprinting rows and removing exact matches" },
  { label: "Calculating quality score", sub: "Measuring completeness, consistency, uniqueness, conformity" },
];

export function CleaningProgress() {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const timings = [900, 2400, 1800, 1200, 900];
    let idx = 0;
    const tick = () => {
      idx++;
      if (idx < PHASES.length) {
        setPhaseIdx(idx);
        setTimeout(tick, timings[idx] ?? 1000);
      }
    };
    const t = setTimeout(tick, timings[0]);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: "center", padding: "80px 24px", maxWidth: "480px", margin: "0 auto" }}
    >
      {/* Animated ring */}
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
        {/* Inner pulse */}
        <div style={{ position: "absolute", inset: "12px", borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.accent }}
          />
        </div>
      </div>

      {/* Phase label with animated swap */}
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

      {/* Step dots */}
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
