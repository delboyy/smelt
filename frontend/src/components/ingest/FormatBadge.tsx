"use client";

import { Badge } from "@/components/ui/Badge";
import { T } from "@/lib/constants";

type FormatBadgeProps = {
  format: string;
  recordCount?: number;
  fieldCount?: number;
};

export function FormatBadge({ format, recordCount, fieldCount }: FormatBadgeProps) {
  if (!format) return null;
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <Badge color={T.accent} bg={T.accentBg} border={T.accentBorder}>
        {format}
      </Badge>
      {recordCount != null && fieldCount != null && (
        <span style={{ fontSize: "13px", color: T.text2 }}>
          {recordCount} records · {fieldCount} fields
        </span>
      )}
    </div>
  );
}
