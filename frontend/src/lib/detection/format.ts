export type DataFormat = "JSON" | "XML" | "CSV" | "TSV" | "TXT";

export function detectFormat(raw: string): DataFormat {
  const t = raw.trim();
  if (t.startsWith("{") || t.startsWith("[")) return "JSON";
  if (t.startsWith("<?xml") || (t.startsWith("<") && t.includes("</"))) return "XML";
  const lines = t.split("\n").filter(Boolean);
  if (lines.length > 1) {
    const tabs = (lines[0].match(/\t/g) ?? []).length;
    const commas = (lines[0].match(/,/g) ?? []).length;
    if (tabs > commas && tabs >= 1) return "TSV";
    if (commas >= 1) return "CSV";
  }
  return "TXT";
}
