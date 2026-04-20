import { describe, it, expect } from "vitest";
import { normalizers } from "@/lib/normalizers";

describe("name normalizer", () => {
  it("title-cases a lowercase name", () => {
    const r = normalizers.name("john doe");
    expect(r.val).toBe("John Doe");
    expect(r.changed).toBe(true);
    expect(r.type).toBe("normalized");
  });
  it("trims whitespace", () => {
    const r = normalizers.name("  Jane Smith  ");
    expect(r.val).toBe("Jane Smith");
    expect(r.changed).toBe(true);
  });
  it("collapses multiple spaces", () => {
    const r = normalizers.name("Bob   Wilson");
    expect(r.val).toBe("Bob Wilson");
  });
  it("returns null for empty string", () => {
    const r = normalizers.name("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for null-like string", () => {
    const r = normalizers.name("   ");
    expect(r.val).toBeNull();
  });
  it("handles unicode characters", () => {
    const r = normalizers.name("maría garcía");
    expect(r.val).toBe("María García");
  });
});

describe("email normalizer", () => {
  it("lowercases an uppercase email", () => {
    const r = normalizers.email("JOHN@GMAIL.COM");
    expect(r.val).toBe("john@gmail.com");
    expect(r.changed).toBe(true);
  });
  it("trims whitespace", () => {
    const r = normalizers.email("  user@example.com  ");
    expect(r.val).toBe("user@example.com");
  });
  it("returns null for empty string", () => {
    const r = normalizers.email("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for N/A", () => {
    const r = normalizers.email("N/A");
    expect(r.val).toBeNull();
    expect(r.type).toBe("invalid");
  });
  it("preserves already-lowercase email", () => {
    const r = normalizers.email("user@example.com");
    expect(r.val).toBe("user@example.com");
    expect(r.changed).toBe(false);
  });
});

describe("phone normalizer", () => {
  it("formats 10-digit number", () => {
    const r = normalizers.phone("5551234567");
    expect(r.val).toBe("(555) 123-4567");
  });
  it("strips non-digits and formats", () => {
    const r = normalizers.phone("555-123-4567");
    expect(r.val).toBe("(555) 123-4567");
  });
  it("handles +1 country code", () => {
    const r = normalizers.phone("+15551234567");
    expect(r.val).toBe("(555) 123-4567");
  });
  it("handles country code without plus", () => {
    const r = normalizers.phone("15551234567");
    expect(r.val).toBe("(555) 123-4567");
  });
  it("returns null for empty string", () => {
    const r = normalizers.phone("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for N/A", () => {
    const r = normalizers.phone("N/A");
    expect(r.val).toBeNull();
  });
  it("formats 7-digit number", () => {
    const r = normalizers.phone("5551234");
    expect(r.val).toBe("555-1234");
  });
});

describe("date normalizer", () => {
  it("normalizes YYYY/MM/DD to ISO", () => {
    const r = normalizers.date("2023/01/15");
    expect(r.val).toBe("2023-01-15");
    expect(r.changed).toBe(true);
  });
  it("normalizes MM-DD-YYYY to ISO", () => {
    const r = normalizers.date("01-20-2023");
    expect(r.val).toBe("2023-01-20");
  });
  it("normalizes DD/MM/YYYY when day > 12", () => {
    const r = normalizers.date("20/01/2023");
    expect(r.val).toBe("2023-01-20");
  });
  it("normalizes month-name format", () => {
    const r = normalizers.date("Feb 5 2023");
    expect(r.val).toBe("2023-02-05");
  });
  it("normalizes month-name with comma", () => {
    const r = normalizers.date("March 12, 2023");
    expect(r.val).toBe("2023-03-12");
  });
  it("normalizes YYYY.MM.DD", () => {
    const r = normalizers.date("2023.02.01");
    expect(r.val).toBe("2023-02-01");
  });
  it("returns null for empty", () => {
    const r = normalizers.date("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for N/A", () => {
    const r = normalizers.date("N/A");
    expect(r.val).toBeNull();
  });
  it("passes through already-ISO dates unchanged", () => {
    const r = normalizers.date("2023-01-15");
    expect(r.val).toBe("2023-01-15");
    expect(r.changed).toBe(false);
  });
});

describe("currency normalizer", () => {
  it("strips dollar sign and parses", () => {
    const r = normalizers.currency("$50000");
    expect(r.val).toBe(50000);
  });
  it("strips dollar sign with commas", () => {
    const r = normalizers.currency("$120,000");
    expect(r.val).toBe(120000);
  });
  it("handles plain number string", () => {
    const r = normalizers.currency("75000");
    expect(r.val).toBe(75000);
  });
  it("returns null for empty", () => {
    const r = normalizers.currency("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for N/A", () => {
    const r = normalizers.currency("N/A");
    expect(r.val).toBeNull();
  });
  it("returns null for non-numeric", () => {
    const r = normalizers.currency("abc");
    expect(r.val).toBeNull();
    expect(r.type).toBe("invalid");
  });
  it("handles USD suffix", () => {
    const r = normalizers.currency("14.99 USD");
    expect(r.val).toBe(14.99);
  });
});

describe("currency_code normalizer", () => {
  it("uppercases lowercase code", () => {
    const r = normalizers.currency_code("usd");
    expect(r.val).toBe("USD");
  });
  it("uppercases mixed case", () => {
    const r = normalizers.currency_code("Usd");
    expect(r.val).toBe("USD");
  });
  it("passes through already uppercase", () => {
    const r = normalizers.currency_code("USD");
    expect(r.val).toBe("USD");
    expect(r.changed).toBe(false);
  });
  it("returns null for empty", () => {
    const r = normalizers.currency_code("");
    expect(r.val).toBeNull();
  });
});

describe("status normalizer", () => {
  it("maps 'active' to 'Active'", () => {
    const r = normalizers.status("active");
    expect(r.val).toBe("Active");
  });
  it("maps typo 'actve' to 'Active'", () => {
    const r = normalizers.status("actve");
    expect(r.val).toBe("Active");
  });
  it("maps 'ACTIVE' to 'Active'", () => {
    const r = normalizers.status("ACTIVE");
    expect(r.val).toBe("Active");
  });
  it("maps 'paid' to 'Paid'", () => {
    const r = normalizers.status("paid");
    expect(r.val).toBe("Paid");
  });
  it("maps 'overdue' to 'Overdue'", () => {
    const r = normalizers.status("overdue");
    expect(r.val).toBe("Overdue");
  });
  it("returns null for empty", () => {
    const r = normalizers.status("");
    expect(r.val).toBeNull();
  });
  it("capitalizes unknown status", () => {
    const r = normalizers.status("unknown_status");
    expect(r.val).toBe("Unknown_status");
  });
});

describe("company normalizer", () => {
  it("normalizes 'acme corp' to 'Acme Corp'", () => {
    const r = normalizers.company("acme corp");
    expect(r.val).toBe("Acme Corp");
  });
  it("normalizes 'ACME CORP' to 'Acme Corp'", () => {
    const r = normalizers.company("ACME CORP");
    expect(r.val).toBe("Acme Corp");
  });
  it("uppercases LLC suffix", () => {
    const r = normalizers.company("bigco llc");
    expect(r.val).toBe("Bigco LLC");
  });
  it("normalizes Inc suffix", () => {
    const r = normalizers.company("widgets inc");
    expect(r.val).toBe("Widgets Inc");
  });
  it("returns null for empty", () => {
    const r = normalizers.company("");
    expect(r.val).toBeNull();
  });
});

describe("category normalizer", () => {
  it("title-cases category", () => {
    const r = normalizers.category("ELECTRONICS");
    expect(r.val).toBe("Electronics");
  });
  it("converts / to >", () => {
    const r = normalizers.category("Electronics/Accessories");
    expect(r.val).toBe("Electronics > Accessories");
  });
  it("converts & to >", () => {
    const r = normalizers.category("Food & Beverage");
    expect(r.val).toBe("Food > Beverage");
  });
  it("returns null for empty", () => {
    const r = normalizers.category("");
    expect(r.val).toBeNull();
  });
});

describe("number normalizer", () => {
  it("parses plain number string", () => {
    const r = normalizers.number("4.5");
    expect(r.val).toBe(4.5);
  });
  it("strips non-numeric suffix characters", () => {
    const r = normalizers.number("4.2 stars");
    expect(r.val).toBe(4.2);
  });
  it("parses plain decimal", () => {
    const r = normalizers.number("4.5");
    expect(r.val).toBe(4.5);
  });
  it("returns null for empty", () => {
    const r = normalizers.number("");
    expect(r.val).toBeNull();
    expect(r.type).toBe("missing");
  });
  it("returns null for N/A", () => {
    const r = normalizers.number("N/A");
    expect(r.val).toBeNull();
  });
  it("handles 500+ as 500", () => {
    const r = normalizers.number("500+");
    expect(r.val).toBe(500);
  });
});

describe("id normalizer", () => {
  it("trims whitespace", () => {
    const r = normalizers.id("  SKU-001  ");
    expect(r.val).toBe("SKU-001");
  });
  it("preserves case (IDs are case-sensitive)", () => {
    const r = normalizers.id("WBH-001");
    expect(r.val).toBe("WBH-001");
    expect(r.changed).toBe(false);
  });
  it("returns null for empty", () => {
    const r = normalizers.id("");
    expect(r.val).toBeNull();
  });
});

describe("text normalizer", () => {
  it("trims whitespace", () => {
    const r = normalizers.text("  hello world  ");
    expect(r.val).toBe("hello world");
  });
  it("collapses multiple spaces", () => {
    const r = normalizers.text("hello   world");
    expect(r.val).toBe("hello world");
  });
  it("returns empty string unchanged if already empty", () => {
    const r = normalizers.text("");
    expect(r.val).toBe("");
    expect(r.changed).toBe(false);
  });
  it("passes through clean text", () => {
    const r = normalizers.text("clean text");
    expect(r.val).toBe("clean text");
    expect(r.changed).toBe(false);
  });
});
