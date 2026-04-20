export type FieldType =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "date"
  | "currency"
  | "currency_code"
  | "status"
  | "category"
  | "number"
  | "id"
  | "text";

export function inferFieldType(key: string, values: unknown[]): FieldType {
  const kl = key.toLowerCase();
  const sample = values
    .filter((v) => v != null && v !== "")
    .slice(0, 20)
    .map(String);

  if (kl.includes("email")) return "email";
  if (kl.includes("phone") || kl.includes("mobile") || kl.includes("tel")) return "phone";
  if (
    kl.includes("date") ||
    kl.includes("signup") ||
    kl.includes("joined") ||
    kl.includes("created") ||
    kl.includes("updated") ||
    kl.includes("due")
  )
    return "date";
  if (kl.includes("name") || kl.includes("client") || kl.includes("contact")) return "name";
  if (kl.includes("company") || kl.includes("org") || kl.includes("employer")) return "company";
  if (kl.includes("status") || kl.includes("state") || kl.includes("stage")) return "status";
  if (
    kl.includes("amount") ||
    kl.includes("price") ||
    kl.includes("revenue") ||
    kl.includes("deal") ||
    kl.includes("cost") ||
    kl.includes("value") ||
    kl.includes("total")
  )
    return "currency";
  if (kl === "currency") return "currency_code";
  if (kl.includes("category") || kl.includes("type") || kl.includes("group")) return "category";
  if (kl.includes("rating") || kl.includes("score")) return "number";
  if (kl.includes("stock") || kl.includes("qty") || kl.includes("quantity") || kl.includes("count"))
    return "number";
  if (kl.includes("sku") || kl.includes("id") || kl.includes("code") || kl.includes("ref")) return "id";

  // Content heuristics
  if (sample.length > 0) {
    const datePattern = sample.filter((v) =>
      /\d{4}[\/\-\.]|[\/\-\.]\d{4}|^[A-Z][a-z]{2}\s/i.test(v)
    ).length;
    if (datePattern > sample.length * 0.5) return "date";

    const currencyPattern = sample.filter((v) => /^\$|USD|EUR|GBP/i.test(v)).length;
    if (currencyPattern > sample.length * 0.3) return "currency";
  }

  return "text";
}
