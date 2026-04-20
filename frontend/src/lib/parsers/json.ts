export function parseJSON(raw: string): Record<string, unknown>[] {
  const obj = JSON.parse(raw.trim()) as unknown;
  if (Array.isArray(obj)) return obj as Record<string, unknown>[];
  if (typeof obj === "object" && obj !== null) {
    const arr = Object.values(obj as Record<string, unknown>).find(Array.isArray);
    if (arr) return arr as Record<string, unknown>[];
    return [obj as Record<string, unknown>];
  }
  return [];
}
