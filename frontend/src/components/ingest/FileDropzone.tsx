"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { T } from "@/lib/constants";
import { useSmeltStore } from "@/lib/store";

const MONO = "'DM Mono', 'JetBrains Mono', monospace";
const FORMATS = [".csv", ".json", ".xml", ".tsv", ".xlsx"];

type FileDropzoneProps = {
  onFile: (file: File) => void;
};

export function FileDropzone({ onFile }: FileDropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { dragOver, setDragOver } = useSmeltStore();

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Upload a file by dropping it here or clicking to browse"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onClick={() => fileRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
      animate={{
        borderColor: dragOver ? T.accent : T.borderLight,
        background: dragOver ? T.accentBg : "transparent",
      }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: "20px",
        padding: "56px 32px",
        textAlign: "center",
        cursor: "pointer",
        border: `2px dashed ${T.borderLight}`,
        transition: "all 0.2s",
        outline: "none",
      }}
    >
      {/* Upload icon */}
      <motion.div
        animate={{ scale: dragOver ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}
      >
        <div style={{
          width: "52px", height: "52px", borderRadius: "50%",
          border: `1.5px solid ${dragOver ? T.accent : T.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color 0.2s",
          background: dragOver ? T.accentBg : "transparent",
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={dragOver ? T.accent : T.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 14V4M11 4L7 8M11 4L15 8" />
            <path d="M3 14v2a3 3 0 003 3h10a3 3 0 003-3v-2" />
          </svg>
        </div>
      </motion.div>

      {/* Text */}
      <div style={{ fontWeight: 600, fontSize: "15px", color: dragOver ? T.accent : T.text1, transition: "color 0.2s", marginBottom: "6px" }}>
        {dragOver ? "Drop to clean" : "Drop a file here or click to browse"}
      </div>
      <div style={{ fontSize: "13px", color: T.text2, marginBottom: "16px" }}>
        Any format, any encoding. Up to 50 MB.
      </div>

      {/* Format pills */}
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
        {FORMATS.map((fmt) => (
          <span key={fmt} style={{
            fontFamily: MONO, fontSize: "10px", padding: "3px 9px",
            borderRadius: "6px", border: `1px solid ${T.border}`,
            color: T.text3, background: T.surface,
          }}>
            {fmt}
          </span>
        ))}
      </div>

      {/* Alt actions */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "14px" }}>
        <span style={{ fontSize: "12px", color: T.text3 }}>
          or{" "}
          <span style={{ color: T.text2, fontWeight: 500 }}>paste raw data</span>
          {" "}·{" "}
          <span style={{ color: T.text2, fontWeight: 500 }}>enter a URL</span>
          {" "}below
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,.xml,.tsv,.txt,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        style={{ display: "none" }}
      />
    </motion.div>
  );
}
