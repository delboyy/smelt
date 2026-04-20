"use client";

import { T } from "@/lib/constants";

type DataTableProps = {
  records: Record<string, unknown>[];
  maxRows?: number;
  highlightSchema?: Record<string, string>;
  onRowClick?: (index: number) => void;
};

export function DataTable({ records, maxRows = 50, highlightSchema, onRowClick }: DataTableProps) {
  if (!records.length) return null;
  const keys = Object.keys(records[0]);
  const rows = records.slice(0, maxRows);

  return (
    <div style={{ borderRadius: "10px", border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", maxHeight: "360px", overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
          }}
        >
          <thead>
            <tr style={{ background: T.surfaceAlt, position: "sticky", top: 0, zIndex: 2 }}>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  color: T.text3,
                  fontWeight: 600,
                  fontSize: "10px",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${T.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                #
              </th>
              {keys.map((k) => (
                <th
                  key={k}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    color: T.text3,
                    fontWeight: 600,
                    fontSize: "10px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${T.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {k}
                  {highlightSchema?.[k] && (
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "9px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: T.accentBg,
                        color: T.accent,
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      {highlightSchema[k]}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${T.border}`, cursor: onRowClick ? "pointer" : "default" }}
                onClick={() => onRowClick?.(i)}
              >
                <td style={{ padding: "8px 14px", color: T.text3, fontSize: "11px" }}>{i + 1}</td>
                {keys.map((k) => {
                  const v = row[k];
                  const empty = v == null || v === "" || v === "N/A";
                  return (
                    <td
                      key={k}
                      style={{
                        padding: "8px 14px",
                        color: empty ? T.text3 : T.text1,
                        whiteSpace: "nowrap",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontStyle: empty ? "italic" : "normal",
                      }}
                    >
                      {empty ? (v === null ? "null" : String(v) || "empty") : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length > maxRows && (
        <div
          style={{
            padding: "8px 14px",
            fontSize: "11px",
            color: T.text3,
            borderTop: `1px solid ${T.border}`,
            background: T.surfaceAlt,
          }}
        >
          Showing {maxRows} of {records.length} rows
        </div>
      )}
    </div>
  );
}
