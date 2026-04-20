"use client";

import React from "react";
import { T } from "@/lib/constants";

type ButtonProps = {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
};

export function Button({ children, primary, onClick, disabled, style: s = {}, type = "button" }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: primary ? "11px 24px" : "9px 18px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        border: primary ? "none" : `1px solid ${T.border}`,
        background: primary ? `linear-gradient(135deg, ${T.accent}, ${T.copper})` : "transparent",
        color: primary ? T.bg : T.text2,
        opacity: disabled ? 0.4 : 1,
        letterSpacing: "0.2px",
        ...s,
      }}
    >
      {children}
    </button>
  );
}
