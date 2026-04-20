export function parseXML(raw: string): Record<string, string>[] {
  if (typeof window === "undefined") {
    // Server-side: basic regex extraction
    return parseXMLServer(raw);
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/xml");
  const root = doc.documentElement;
  const children = Array.from(root.children);
  return children.map((node) => {
    const obj: Record<string, string> = {};
    Array.from(node.children).forEach((c) => {
      obj[c.tagName] = c.textContent ?? "";
    });
    return obj;
  });
}

function parseXMLServer(raw: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  // Find top-level repeating elements
  const rootMatch = raw.match(/<([a-zA-Z_][a-zA-Z0-9_]*)[\s>]/);
  if (!rootMatch) return [];
  const rootTag = rootMatch[1];
  const childMatch = raw.match(new RegExp(`<${rootTag}[^>]*>([\\s\\S]*?)<\\/${rootTag}>`, "i"));
  if (!childMatch) return [];
  const content = childMatch[1];
  const childTagMatch = content.match(/<([a-zA-Z_][a-zA-Z0-9_]*)[\s>]/);
  if (!childTagMatch) return [];
  const childTag = childTagMatch[1];
  const childRe = new RegExp(`<${childTag}[^>]*>([\\s\\S]*?)<\\/${childTag}>`, "gi");
  let match;
  while ((match = childRe.exec(raw)) !== null) {
    const inner = match[1];
    const record: Record<string, string> = {};
    const fieldRe = /<([a-zA-Z_][a-zA-Z0-9_]*)>([^<]*)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRe.exec(inner)) !== null) {
      record[fieldMatch[1]] = fieldMatch[2].trim();
    }
    if (Object.keys(record).length > 0) records.push(record);
  }
  return records;
}
