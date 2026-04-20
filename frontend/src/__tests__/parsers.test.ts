import { describe, it, expect } from "vitest";
import { parseCSV } from "@/lib/parsers/csv";
import { parseJSON } from "@/lib/parsers/json";
import { parseTSV } from "@/lib/parsers/tsv";

describe("CSV parser", () => {
  it("parses basic CSV", () => {
    const csv = "name,email\njohn,john@example.com\njane,jane@example.com";
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "john", email: "john@example.com" });
  });

  it("handles quoted fields with commas", () => {
    const csv = 'name,value\njohn,"$120,000"';
    const result = parseCSV(csv);
    expect(result[0].value).toBe("$120,000");
  });

  it("trims whitespace from values", () => {
    const csv = "name,email\n  john  ,  john@example.com  ";
    const result = parseCSV(csv);
    expect(result[0].name).toBe("john");
  });

  it("returns empty array for single-line input", () => {
    const result = parseCSV("name,email");
    expect(result).toHaveLength(0);
  });

  it("handles empty fields", () => {
    const csv = "name,email\njohn,";
    const result = parseCSV(csv);
    expect(result[0].email).toBe("");
  });

  it("handles trailing whitespace on lines", () => {
    const csv = "name,email  \njohn,j@example.com  ";
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });

  it("ignores blank lines", () => {
    const csv = "name,email\n\njohn,john@example.com\n\n";
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });
});

describe("JSON parser", () => {
  it("parses array of objects", () => {
    const json = '[{"name": "John"}, {"name": "Jane"}]';
    const result = parseJSON(json);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "John" });
  });

  it("parses object with array value", () => {
    const json = '{"records": [{"id": 1}, {"id": 2}]}';
    const result = parseJSON(json);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1 });
  });

  it("wraps single object in array", () => {
    const json = '{"name": "John", "email": "john@example.com"}';
    const result = parseJSON(json);
    expect(result).toHaveLength(1);
  });

  it("handles leading/trailing whitespace", () => {
    const json = '  [{"name": "John"}]  ';
    const result = parseJSON(json);
    expect(result).toHaveLength(1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJSON("{invalid}")).toThrow();
  });
});

describe("TSV parser", () => {
  it("parses tab-separated data", () => {
    const tsv = "name\temail\njohn\tjohn@example.com";
    const result = parseTSV(tsv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "john", email: "john@example.com" });
  });

  it("trims values", () => {
    const tsv = "name\temail\n  john  \t  j@x.com  ";
    const result = parseTSV(tsv);
    expect(result[0].name).toBe("john");
  });

  it("returns empty array for header-only TSV", () => {
    const result = parseTSV("name\temail");
    expect(result).toHaveLength(0);
  });

  it("handles missing fields", () => {
    const tsv = "name\temail\tphone\njohn\tj@x.com";
    const result = parseTSV(tsv);
    expect(result[0].phone).toBe("");
  });
});
