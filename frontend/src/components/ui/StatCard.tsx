"use client";

import { T } from "@/lib/constants";

type StatCardProps = {
  value: number | string;
  label: string;
  color?: string;
};

export function StatCard({ value, label, color = T.text2 }: StatCardProps) {
  return (
    <div
      style={{
        background: T.surface,
        borderRadius: "10px",
        padding: "16px 18px",
        border: `1px solid ${T.border}`,
        flex: 1,
        minWidth: "100px",
      }}
    >
      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color,
          letterSpacing: "-1px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: T.text3,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginTop: "4px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
