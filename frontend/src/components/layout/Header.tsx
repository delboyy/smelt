"use client";

import { T } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSmeltStore } from "@/lib/store";

export function Header() {
  const { step, reset } = useSmeltStore();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "7px",
            background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: T.bg,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            S
          </span>
        </div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px", color: T.text1 }}>
            Smelt
          </div>
          <div
            style={{
              fontSize: "9px",
              color: T.text3,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Raw data in. Pure data out.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {step !== "Ingest" && <Button onClick={reset}>New smelt</Button>}
        <Badge color={T.accent} bg={T.accentBg} border={T.accentBorder}>
          MVP
        </Badge>
      </div>
    </div>
  );
}
