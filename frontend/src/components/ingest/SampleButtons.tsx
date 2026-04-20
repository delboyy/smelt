"use client";

import { SAMPLES, T } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

type SampleButtonsProps = {
  onSelect: (data: string) => void;
};

export function SampleButtons({ onSelect }: SampleButtonsProps) {
  return (
    <div style={{ marginTop: "28px" }}>
      <div
        style={{
          fontSize: "11px",
          color: T.text3,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        Try a sample
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {Object.keys(SAMPLES).map((k) => (
          <Button key={k} onClick={() => onSelect(SAMPLES[k])}>
            {k}
          </Button>
        ))}
      </div>
    </div>
  );
}
