"use client";

import { T } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import type { Issue } from "@/lib/cleaning/engine";

const issueTypeColors: Record<string, { c: string; bg: string; b: string }> = {
  normalized: { c: T.blue, bg: T.blueBg, b: T.blueBorder },
  duplicate: { c: T.amber, bg: T.amberBg, b: T.amberBorder },
  missing: { c: T.text3, bg: T.surface, b: T.border },
  invalid: { c: T.red, bg: T.redBg, b: T.redBorder },
};

type ChangeLogProps = {
  issues: Issue[];
};

export function ChangeLog({ issues }: ChangeLogProps) {
  if (!issues.length) return null;

  return (
    <div
      style={{
        borderRadius: "10px",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        maxHeight: "320px",
        overflowY: "auto",
        marginBottom: "20px",
      }}
    >
      {issues.slice(0, 100).map((issue, i) => {
        const tc = issueTypeColors[issue.type] ?? issueTypeColors.normalized;
        return (
          <div
            key={i}
            style={{
              padding: "9px 14px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              gap: "10px",
              alignItems: "center",
              fontSize: "12px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <span style={{ color: T.text3, minWidth: "48px", fontSize: "11px" }}>
              Row {issue.row}
            </span>
            <Badge color={tc.c} bg={tc.bg} border={tc.b}>
              {issue.type}
            </Badge>
            <span style={{ color: T.text3, minWidth: "80px", fontSize: "11px" }}>{issue.field}</span>
            <span
              style={{
                color: `${T.red}aa`,
                textDecoration: issue.type !== "duplicate" ? "line-through" : "none",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: 0.7,
                fontSize: "11px",
              }}
            >
              {String(issue.was)}
            </span>
            <span style={{ color: T.text3 }}>→</span>
            <span
              style={{
                color: T.green,
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "11px",
              }}
            >
              {issue.now === null ? "null" : String(issue.now)}
            </span>
          </div>
        );
      })}
      {issues.length > 100 && (
        <div
          style={{
            padding: "8px 14px",
            fontSize: "11px",
            color: T.text3,
            background: T.surfaceAlt,
          }}
        >
          + {issues.length - 100} more changes
        </div>
      )}
    </div>
  );
}
