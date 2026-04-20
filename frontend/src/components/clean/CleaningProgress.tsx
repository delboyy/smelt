"use client";

import { T } from "@/lib/constants";

export function CleaningProgress() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 0",
        animation: "smeltFadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: `3px solid ${T.border}`,
          borderTopColor: T.accent,
          margin: "0 auto 24px",
          animation: "smeltSpin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: "18px", fontWeight: 600, color: T.text1, marginBottom: "6px" }}>
        Smelting your data...
      </div>
      <div style={{ fontSize: "13px", color: T.text3 }}>
        Inferring schema, normalizing fields, removing duplicates
      </div>
    </div>
  );
}
