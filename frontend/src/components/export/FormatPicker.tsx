"use client";

import { EXPORT_FORMATS, T } from "@/lib/constants";

type FormatPickerProps = {
  selected: string;
  onSelect: (fmt: string) => void;
};

export function FormatPicker({ selected, onSelect }: FormatPickerProps) {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
      {EXPORT_FORMATS.map((f) => (
        <button
          key={f}
          onClick={() => onSelect(f)}
          style={{
            padding: "10px 22px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            transition: "all 0.15s",
            letterSpacing: "0.5px",
            border: `1px solid ${selected === f ? T.accent : T.border}`,
            background: selected === f ? T.accentBg : "transparent",
            color: selected === f ? T.accent : T.text3,
          }}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
