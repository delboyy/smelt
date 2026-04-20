import { describe, it, expect } from "vitest";
import { detectFormat } from "@/lib/detection/format";
import { inferFieldType } from "@/lib/detection/schema";

describe("detectFormat", () => {
  it("detects JSON array", () => {
    expect(detectFormat('[{"key": "val"}]')).toBe("JSON");
  });
  it("detects JSON object", () => {
    expect(detectFormat('{"key": "val"}')).toBe("JSON");
  });
  it("detects XML with declaration", () => {
    expect(detectFormat('<?xml version="1.0"?><root></root>')).toBe("XML");
  });
  it("detects XML without declaration", () => {
    expect(detectFormat("<records><record><id>1</id></record></records>")).toBe("XML");
  });
  it("detects CSV", () => {
    expect(detectFormat("name,email,phone\njohn,j@x.com,555-1234")).toBe("CSV");
  });
  it("detects TSV", () => {
    expect(detectFormat("name\temail\tphone\njohn\tj@x.com\t555")).toBe("TSV");
  });
  it("falls back to TXT", () => {
    expect(detectFormat("just some plain text")).toBe("TXT");
  });
  it("handles leading whitespace", () => {
    expect(detectFormat("  [1, 2, 3]")).toBe("JSON");
  });
});

describe("inferFieldType", () => {
  it("detects email from column name", () => {
    expect(inferFieldType("email", ["john@x.com"])).toBe("email");
  });
  it("detects email with 'Email' casing", () => {
    expect(inferFieldType("Email", ["john@x.com"])).toBe("email");
  });
  it("detects phone from column name", () => {
    expect(inferFieldType("phone", ["555-1234"])).toBe("phone");
  });
  it("detects phone from 'mobile'", () => {
    expect(inferFieldType("mobile", ["555-1234"])).toBe("phone");
  });
  it("detects date from column name", () => {
    expect(inferFieldType("signup_date", ["2023/01/15"])).toBe("date");
  });
  it("detects name from column name", () => {
    expect(inferFieldType("full_name", ["john doe"])).toBe("name");
  });
  it("detects company from column name", () => {
    expect(inferFieldType("company", ["Acme Corp"])).toBe("company");
  });
  it("detects status from column name", () => {
    expect(inferFieldType("status", ["active"])).toBe("status");
  });
  it("detects currency from 'deal_value'", () => {
    expect(inferFieldType("deal_value", ["$50000"])).toBe("currency");
  });
  it("detects currency_code from 'currency'", () => {
    expect(inferFieldType("currency", ["USD"])).toBe("currency_code");
  });
  it("detects category from column name", () => {
    expect(inferFieldType("category", ["Electronics"])).toBe("category");
  });
  it("detects number from 'rating'", () => {
    expect(inferFieldType("rating", ["4.5"])).toBe("number");
  });
  it("detects number from 'stock'", () => {
    expect(inferFieldType("stock", ["150"])).toBe("number");
  });
  it("detects id from 'sku'", () => {
    expect(inferFieldType("sku", ["WBH-001"])).toBe("id");
  });
  it("detects date from content patterns", () => {
    const vals = Array(10).fill("2023/01/15");
    expect(inferFieldType("ts", vals)).toBe("date");
  });
  it("detects currency from content $ prefix", () => {
    const vals = Array(10).fill("$50.00");
    expect(inferFieldType("amount_paid", vals)).toBe("currency");
  });
  it("falls back to text", () => {
    expect(inferFieldType("notes", ["some text"])).toBe("text");
  });
});
