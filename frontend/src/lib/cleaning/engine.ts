import { inferFieldType, type FieldType } from "../detection/schema";
import { normalizers } from "../normalizers";

export type Issue = {
  row: number;
  field: string;
  was: string;
  now: string | number | null;
  type: "normalized" | "missing" | "invalid" | "duplicate" | "unchanged";
  fieldType: FieldType;
};

export type CleaningStats = {
  total: number;
  clean: number;
  dupes: number;
  fixes: number;
  nulls: number;
};

export type CleaningResult = {
  cleaned: Record<string, unknown>[];
  issues: Issue[];
  schema: Record<string, FieldType>;
  stats: CleaningStats;
};

export function cleanRecords(records: Record<string, unknown>[]): CleaningResult {
  if (!records.length) {
    return { cleaned: [], issues: [], schema: {}, stats: { total: 0, clean: 0, dupes: 0, fixes: 0, nulls: 0 } };
  }

  const keys = Object.keys(records[0]);
  const schema: Record<string, FieldType> = {};
  keys.forEach((k) => {
    const vals = records.map((r) => r[k]);
    schema[k] = inferFieldType(k, vals);
  });

  const issues: Issue[] = [];
  const seen = new Set<string>();
  const cleaned: Record<string, unknown>[] = [];
  let dupeCount = 0;
  let fixCount = 0;
  let nullCount = 0;

  records.forEach((row, i) => {
    const newRow: Record<string, unknown> = {};
    Object.entries(row).forEach(([k, v]) => {
      const type = schema[k];
      const norm = (normalizers[type] ?? normalizers.text)(String(v ?? ""));
      newRow[k] = norm.val;
      if (norm.changed && v) {
        issues.push({
          row: i + 1,
          field: k,
          was: String(v),
          now: norm.val,
          type: norm.type === "unchanged" ? "unchanged" : norm.type,
          fieldType: type,
        });
        if (norm.type === "normalized") fixCount++;
        if (norm.type === "missing" || norm.type === "invalid") nullCount++;
      }
    });

    const fingerprint = keys.map((k) => String(newRow[k] ?? "").toLowerCase()).join("|");
    if (seen.has(fingerprint)) {
      dupeCount++;
      issues.push({
        row: i + 1,
        field: "*",
        was: "Duplicate row",
        now: "Removed",
        type: "duplicate",
        fieldType: "text",
      });
    } else {
      seen.add(fingerprint);
      cleaned.push(newRow);
    }
  });

  return {
    cleaned,
    issues,
    schema,
    stats: { total: records.length, clean: cleaned.length, dupes: dupeCount, fixes: fixCount, nulls: nullCount },
  };
}
