import { describe, it, expect } from "vitest";
import { cleanRecords } from "@/lib/cleaning/engine";

const crmSample = [
  { full_name: "john doe", email: "JOHN@ACMECORP.COM", phone: "555-1234", signup_date: "2023/01/15", company: "Acme Corp", deal_value: "$50000", status: "active" },
  { full_name: "Jane Smith", email: "jane.smith@widgets.io", phone: "(555) 567-8901", signup_date: "01-20-2023", company: "Widgets Inc", deal_value: "$120,000", status: "Active" },
  { full_name: "john doe", email: "john@acmecorp.com", phone: "555-1234", signup_date: "15/01/2023", company: "Acme Corp", deal_value: "$50000", status: "active" },
];

describe("cleanRecords", () => {
  it("returns empty result for empty input", () => {
    const r = cleanRecords([]);
    expect(r.cleaned).toHaveLength(0);
    expect(r.issues).toHaveLength(0);
  });

  it("removes duplicate rows", () => {
    const r = cleanRecords(crmSample);
    expect(r.stats.dupes).toBeGreaterThan(0);
    expect(r.cleaned.length).toBeLessThan(crmSample.length);
  });

  it("normalizes email to lowercase", () => {
    const records = [{ email: "JOHN@EXAMPLE.COM" }];
    const r = cleanRecords(records);
    expect(r.cleaned[0].email).toBe("john@example.com");
  });

  it("normalizes names to title case", () => {
    const records = [{ full_name: "john doe" }];
    const r = cleanRecords(records);
    expect(r.cleaned[0].full_name).toBe("John Doe");
  });

  it("generates issues for changed fields", () => {
    const records = [{ email: "JOHN@EXAMPLE.COM" }];
    const r = cleanRecords(records);
    expect(r.issues.length).toBeGreaterThan(0);
    const emailIssue = r.issues.find((i) => i.field === "email");
    expect(emailIssue).toBeDefined();
    expect(emailIssue?.was).toBe("JOHN@EXAMPLE.COM");
    expect(emailIssue?.now).toBe("john@example.com");
  });

  it("infers schema for each field", () => {
    const records = [{ email: "john@example.com", full_name: "John", signup_date: "2023/01/15" }];
    const r = cleanRecords(records);
    expect(r.schema.email).toBe("email");
    expect(r.schema.full_name).toBe("name");
    expect(r.schema.signup_date).toBe("date");
  });

  it("tracks stats correctly", () => {
    const r = cleanRecords(crmSample);
    expect(r.stats.total).toBe(3);
    expect(r.stats.fixes).toBeGreaterThan(0);
  });

  it("handles single record", () => {
    const r = cleanRecords([{ name: "john", email: "JOHN@X.COM" }]);
    expect(r.cleaned).toHaveLength(1);
    expect(r.stats.dupes).toBe(0);
  });

  it("sets null for empty currency values", () => {
    const records = [{ deal_value: "" }];
    const r = cleanRecords(records);
    expect(r.cleaned[0].deal_value).toBeNull();
  });

  it("normalizes status values", () => {
    const records = [{ status: "actve" }];
    const r = cleanRecords(records);
    expect(r.cleaned[0].status).toBe("Active");
  });

  it("deduplicates after normalization", () => {
    const records = [
      { email: "JOHN@X.COM", name: "john" },
      { email: "john@x.com", name: "John" },
    ];
    const r = cleanRecords(records);
    expect(r.stats.dupes).toBe(1);
    expect(r.cleaned).toHaveLength(1);
  });
});
