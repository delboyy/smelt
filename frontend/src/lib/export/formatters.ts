export function toJSON(records: Record<string, unknown>[]): string {
  return JSON.stringify(records, null, 2);
}

export function toCSV(records: Record<string, unknown>[]): string {
  if (!records.length) return "";
  const h = Object.keys(records[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [h.join(","), ...records.map((r) => h.map((k) => escape(r[k])).join(","))].join("\n");
}

export function toXML(records: Record<string, unknown>[]): string {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
  records.forEach((r) => {
    x += "  <record>\n";
    Object.entries(r).forEach(([k, v]) => {
      const tag = k.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      x += `    <${tag}>${v == null ? "" : String(v)}</${tag}>\n`;
    });
    x += "  </record>\n";
  });
  return x + "</records>";
}
