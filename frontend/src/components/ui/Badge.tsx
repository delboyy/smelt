"use client";

import React from "react";

type BadgeProps = {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
};

export function Badge({ children, color = "#22c55e", bg, border }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        borderRadius: "100px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.3px",
        background: bg ?? `${color}14`,
        color,
        border: `1px solid ${border ?? `${color}30`}`,
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      {children}
    </span>
  );
}
