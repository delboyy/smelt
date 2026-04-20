"use client";

import { T, ISSUE_TYPES } from "@/lib/constants";
import type { Issue } from "@/lib/cleaning/engine";

type IssueFiltersProps = {
  issues: Issue[];
  activeFilter: string;
  onFilter: (filter: string) => void;
};

export function IssueFilters({ issues, activeFilter, onFilter }: IssueFiltersProps) {
  return (
    <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
      {ISSUE_TYPES.map((f) => {
        const count = f === "all" ? issues.length : issues.filter((i) => i.type === f).length;
        if (count === 0 && f !== "all") return null;
        return (
          <button
            key={f}
            onClick={() => onFilter(f)}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              border: `1px solid ${activeFilter === f ? T.accent : T.border}`,
              letterSpacing: "0.3px",
              background: activeFilter === f ? T.accentBg : "transparent",
              color: activeFilter === f ? T.accent : T.text3,
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {f} ({count})
          </button>
        );
      })}
    </div>
  );
}
