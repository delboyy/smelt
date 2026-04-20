"use client";

import { T } from "@/lib/constants";
import { useSmeltStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

type PasteInputProps = {
  onProcess: () => void;
};

export function PasteInput({ onProcess }: PasteInputProps) {
  const { rawData, setRawData } = useSmeltStore();

  return (
    <>
      <textarea
        value={rawData}
        onChange={(e) => setRawData(e.target.value)}
        placeholder="Paste JSON, CSV, XML, or any structured text..."
        style={{
          width: "100%",
          minHeight: "140px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: "10px",
          padding: "16px",
          color: T.text1,
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.7,
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = T.accent)}
        onBlur={(e) => (e.target.style.borderColor = T.border)}
      />
      <Button
        primary
        onClick={onProcess}
        disabled={!rawData.trim()}
        style={{ width: "100%", marginTop: "12px", padding: "13px" }}
      >
        Process data →
      </Button>
    </>
  );
}
