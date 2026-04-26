"use client";

import { T } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSmeltStore } from "@/lib/store";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { step, reset } = useSmeltStore();
  const { data: session } = useSession();

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
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
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
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {step !== "Ingest" && <Button onClick={reset}>New smelt</Button>}
        <Link href="/app/history" style={{ fontSize: "12px", color: T.text3, textDecoration: "none" }}>
          History
        </Link>
        <Link href="/app/recipes" style={{ fontSize: "12px", color: T.text3, textDecoration: "none" }}>
          Recipes
        </Link>
        <Badge color={T.accent} bg={T.accentBg} border={T.accentBorder}>
          MVP
        </Badge>
        {session ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link href="/app/settings" style={{ fontSize: "12px", color: T.text3, textDecoration: "none" }}>
              {session.user?.email}
            </Link>
            <Button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              fontSize: "13px",
              color: T.text2,
              textDecoration: "none",
              padding: "5px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: "6px",
            }}
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  );
}
