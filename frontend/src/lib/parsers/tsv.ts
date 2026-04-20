export function parseTSV(raw: string): Record<string, string>[] {
  const lines = raw
    .trim()
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] ?? "").trim();
    });
    return row;
  });
}
