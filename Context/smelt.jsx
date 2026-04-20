import { useState, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// SMELT — Raw data in. Pure data out.
// MVP: Upload → Detect → Clean → Review → Export
// ═══════════════════════════════════════════════════════════════

// ── Sample datasets ───────────────────────────────────────────
const SAMPLES = {
  "CRM Contacts (CSV)": `full_name,email,phone,signup_date,company,deal_value,status
john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15,Acme Corp,$50000,active
Jane Smith,jane.smith@widgets.io,(555) 567-8901,01-20-2023,Widgets Inc,"$120,000",Active
bob wilson,BOB@ACMECORP.COM,5559876543,2023.02.01,acme corp,50000,ACTIVE
Alice Brown,,N/A,Feb 5 2023,Acme Corporation,$75000,active
  charlie davis ,charlie@bigco.net,555 111 2222,2023-02-10,BigCo LLC,$30000,actve
john doe,john@acmecorp.com,555-1234,15/01/2023,Acme Corp,$50000,active
María García,maria@widgets.io,+1-555-333-4444,March 12 2023,Widgets Inc,$95000,Active
  Bob Wilson ,bob@acmecorp.com,(555) 987-6543,2023-02-01,ACME CORP,$50000,active`,

  "Product Feed (JSON)": `[
  {"product_name": "wireless bluetooth headphones", "price": "$79.99", "category": "ELECTRONICS", "sku": "WBH-001", "stock": "150", "rating": "4.5", "last_updated": "2024/03/15"},
  {"product_name": "Wireless Bluetooth Headphones", "price": "79.99", "category": "electronics", "sku": "WBH-001", "stock": "150", "rating": "4.5/5", "last_updated": "03-15-2024"},
  {"product_name": "organic green tea - 50 bags", "price": "$12.50", "category": "Food & Beverage", "sku": "OGT-050", "stock": "N/A", "rating": "4.8", "last_updated": "Jan 20, 2024"},
  {"product_name": "ERGONOMIC OFFICE CHAIR", "price": "$349", "category": "furniture", "sku": "EOC-200", "stock": "23", "rating": "4.2 stars", "last_updated": "2024.02.28"},
  {"product_name": "usb-c charging cable 6ft", "price": "14.99 USD", "category": "Electronics/Accessories", "sku": "", "stock": "500+", "rating": "", "last_updated": "2024-01-10"},
  {"product_name": "Organic Green Tea  -  50 Bags", "price": "12.50", "category": "food", "sku": "OGT-050", "stock": "89", "rating": "4.8", "last_updated": "2024/01/20"}
]`,

  "Invoices (XML)": `<?xml version="1.0"?>
<invoices>
  <invoice>
    <id>INV-001</id>
    <client>john doe</client>
    <email>JOHN@EXAMPLE.COM</email>
    <amount>$1,500.00</amount>
    <currency>USD</currency>
    <date>2024/01/15</date>
    <status>paid</status>
    <due_date>2024/02/15</due_date>
  </invoice>
  <invoice>
    <id>INV-002</id>
    <client>Jane Smith</client>
    <email>jane@example.com</email>
    <amount>2500</amount>
    <currency>usd</currency>
    <date>01-20-2024</date>
    <status>PAID</status>
    <due_date>02-20-2024</due_date>
  </invoice>
  <invoice>
    <id>INV-003</id>
    <client>  Bob Wilson </client>
    <email>BOB@EXAMPLE.COM</email>
    <amount>$3,200</amount>
    <currency>USD</currency>
    <date>2024.02.01</date>
    <status>overdue</status>
    <due_date>2024.03.01</due_date>
  </invoice>
  <invoice>
    <id>INV-004</id>
    <client>Alice Brown</client>
    <email></email>
    <amount>1800.50</amount>
    <currency>Usd</currency>
    <date>Feb 5, 2024</date>
    <status>Pending</status>
    <due_date>Mar 5, 2024</due_date>
  </invoice>
  <invoice>
    <id>INV-001</id>
    <client>John Doe</client>
    <email>john@example.com</email>
    <amount>$1,500.00</amount>
    <currency>USD</currency>
    <date>2024-01-15</date>
    <status>paid</status>
    <due_date>2024-02-15</due_date>
  </invoice>
</invoices>`,
};

// ── Cleaning Engine ───────────────────────────────────────────
function detectFormat(raw) {
  const t = raw.trim();
  if (t.startsWith("{") || t.startsWith("[")) return "JSON";
  if (t.startsWith("<?xml") || (t.startsWith("<") && t.includes("</"))) return "XML";
  const lines = t.split("\n").filter(Boolean);
  if (lines.length > 1) {
    const tabs = (lines[0].match(/\t/g) || []).length;
    const commas = (lines[0].match(/,/g) || []).length;
    if (tabs > commas && tabs >= 1) return "TSV";
    if (commas >= 1) return "CSV";
  }
  return "TXT";
}

function parseCSV(raw) {
  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const vals = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return vals;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

function parseJSON(raw) {
  const obj = JSON.parse(raw.trim());
  if (Array.isArray(obj)) return obj;
  const arr = Object.values(obj).find(Array.isArray);
  return arr || [obj];
}

function parseXML(raw) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/xml");
  const root = doc.documentElement;
  const children = Array.from(root.children);
  return children.map((node) => {
    const obj = {};
    Array.from(node.children).forEach((c) => { obj[c.tagName] = c.textContent || ""; });
    return obj;
  });
}

function inferFieldType(key, values) {
  const kl = key.toLowerCase();
  const sample = values.filter(Boolean).slice(0, 20);
  if (kl.includes("email")) return "email";
  if (kl.includes("phone") || kl.includes("mobile") || kl.includes("tel")) return "phone";
  if (kl.includes("date") || kl.includes("signup") || kl.includes("joined") || kl.includes("created") || kl.includes("updated") || kl.includes("due")) return "date";
  if (kl.includes("name") || kl.includes("client") || kl.includes("contact")) return "name";
  if (kl.includes("company") || kl.includes("org") || kl.includes("employer")) return "company";
  if (kl.includes("status") || kl.includes("state") || kl.includes("stage")) return "status";
  if (kl.includes("amount") || kl.includes("price") || kl.includes("revenue") || kl.includes("deal") || kl.includes("cost") || kl.includes("value") || kl.includes("total")) return "currency";
  if (kl.includes("currency")) return "currency_code";
  if (kl.includes("category") || kl.includes("type") || kl.includes("group")) return "category";
  if (kl.includes("rating") || kl.includes("score")) return "number";
  if (kl.includes("stock") || kl.includes("qty") || kl.includes("quantity") || kl.includes("count")) return "number";
  if (kl.includes("sku") || kl.includes("id") || kl.includes("code") || kl.includes("ref")) return "id";
  // Content heuristic
  const datePattern = sample.filter((v) => /\d{4}[\/\-\.]|[\/\-\.]\d{4}|^[A-Z][a-z]{2}\s/i.test(v)).length;
  if (datePattern > sample.length * 0.5) return "date";
  const currencyPattern = sample.filter((v) => /^\$|USD|EUR|GBP/i.test(v)).length;
  if (currencyPattern > sample.length * 0.3) return "currency";
  return "text";
}

// Normalizers
const normalizers = {
  name: (v) => {
    if (!v || !v.trim()) return { val: null, changed: true, type: "missing" };
    const cleaned = v.trim().replace(/\s+/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return { val: cleaned, changed: cleaned !== v, type: "normalized" };
  },
  company: (v) => {
    if (!v || !v.trim()) return { val: null, changed: true, type: "missing" };
    let c = v.trim().replace(/\s+/g, " ");
    // Normalize common company suffixes
    c = c.replace(/\b(corp|corporation|incorporated|inc)\b\.?$/i, (m) => {
      const l = m.toLowerCase().replace(/\./g, "");
      if (l === "corp" || l === "corporation") return "Corp";
      if (l === "inc" || l === "incorporated") return "Inc";
      return m;
    });
    c = c.split(" ").map((w) => {
      if (/^(llc|llp|ltd|inc|corp|co|plc)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(" ");
    return { val: c, changed: c !== v, type: "normalized" };
  },
  email: (v) => {
    if (!v || !v.trim() || v.trim() === "N/A") return { val: null, changed: !!v && v.trim() !== "", type: v && v.trim() ? "invalid" : "missing" };
    const e = v.trim().toLowerCase();
    return { val: e, changed: e !== v, type: "normalized" };
  },
  phone: (v) => {
    if (!v || !v.trim() || v === "N/A") return { val: null, changed: !!v && v.trim() !== "" && v !== "N/A", type: "missing" };
    let d = v.replace(/[^\d+]/g, "");
    if (d.startsWith("+1")) d = d.slice(2);
    if (d.startsWith("1") && d.length === 11) d = d.slice(1);
    if (d.length === 10) { const f = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; return { val: f, changed: f !== v, type: "normalized" }; }
    if (d.length === 7) { const f = `${d.slice(0, 3)}-${d.slice(3)}`; return { val: f, changed: f !== v, type: "normalized" }; }
    return { val: v.trim(), changed: v.trim() !== v, type: "normalized" };
  },
  date: (v) => {
    if (!v || !v.trim() || v === "N/A") return { val: null, changed: !!v, type: "missing" };
    const d = v.trim();
    const patterns = [
      { re: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, f: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` },
      { re: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, f: (m) => {
        const a = parseInt(m[1]); return a > 12 ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
      }},
      { re: /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/, f: (m) => {
        const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
        const mo = months[m[1].toLowerCase().slice(0, 3)];
        return mo ? `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}` : d;
      }},
    ];
    for (const { re, f } of patterns) { const m = d.match(re); if (m) { const r = f(m); return { val: r, changed: r !== d, type: "normalized" }; } }
    return { val: d, changed: false, type: "unchanged" };
  },
  currency: (v) => {
    if (!v || !v.trim() || v === "N/A") return { val: null, changed: !!v, type: "missing" };
    const n = parseFloat(String(v).replace(/[$,\s]|USD|EUR|GBP/gi, ""));
    if (isNaN(n)) return { val: null, changed: true, type: "invalid" };
    return { val: n, changed: String(n) !== v, type: "normalized" };
  },
  currency_code: (v) => {
    if (!v) return { val: null, changed: false, type: "missing" };
    const u = v.trim().toUpperCase();
    return { val: u, changed: u !== v, type: "normalized" };
  },
  status: (v) => {
    if (!v) return { val: null, changed: false, type: "missing" };
    const l = v.trim().toLowerCase();
    const map = { active: "Active", actve: "Active", inactive: "Inactive", paid: "Paid", pending: "Pending", overdue: "Overdue", cancelled: "Cancelled", canceled: "Cancelled" };
    const r = map[l] || v.trim().charAt(0).toUpperCase() + v.trim().slice(1).toLowerCase();
    return { val: r, changed: r !== v, type: "normalized" };
  },
  category: (v) => {
    if (!v) return { val: null, changed: false, type: "missing" };
    let c = v.trim().replace(/[\/&]+/g, " > ").replace(/\s+/g, " ");
    c = c.split(" ").map((w) => w === ">" ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return { val: c, changed: c !== v, type: "normalized" };
  },
  number: (v) => {
    if (!v || v === "N/A" || v === "") return { val: null, changed: !!v && v !== "", type: "missing" };
    const cleaned = String(v).replace(/[^\d.\-]/g, "");
    const n = parseFloat(cleaned);
    if (isNaN(n)) return { val: null, changed: true, type: "invalid" };
    return { val: n, changed: String(n) !== v, type: "normalized" };
  },
  id: (v) => {
    if (!v || !v.trim()) return { val: null, changed: !!v, type: "missing" };
    return { val: v.trim(), changed: v.trim() !== v, type: "normalized" };
  },
  text: (v) => {
    if (!v) return { val: v, changed: false, type: "unchanged" };
    const t = v.trim().replace(/\s+/g, " ");
    return { val: t, changed: t !== v, type: "normalized" };
  },
};

function cleanRecords(records) {
  if (!records.length) return { cleaned: [], issues: [], schema: {}, stats: {} };
  const keys = Object.keys(records[0]);
  const schema = {};
  keys.forEach((k) => {
    const vals = records.map((r) => r[k]);
    schema[k] = inferFieldType(k, vals);
  });

  const issues = [];
  const seen = new Set();
  const cleaned = [];
  let dupeCount = 0, fixCount = 0, nullCount = 0;

  records.forEach((row, i) => {
    const newRow = {};
    Object.entries(row).forEach(([k, v]) => {
      const type = schema[k];
      const norm = (normalizers[type] || normalizers.text)(v);
      newRow[k] = norm.val;
      if (norm.changed && v) {
        issues.push({ row: i + 1, field: k, was: v, now: norm.val, type: norm.type, fieldType: type });
        if (norm.type === "normalized") fixCount++;
        if (norm.type === "missing" || norm.type === "invalid") nullCount++;
      }
    });
    const fingerprint = keys.map((k) => String(newRow[k] || "").toLowerCase()).join("|");
    if (seen.has(fingerprint)) {
      dupeCount++;
      issues.push({ row: i + 1, field: "*", was: "Duplicate row", now: "Removed", type: "duplicate" });
    } else {
      seen.add(fingerprint);
      cleaned.push(newRow);
    }
  });

  return { cleaned, issues, schema, stats: { total: records.length, clean: cleaned.length, dupes: dupeCount, fixes: fixCount, nulls: nullCount } };
}

// ── Export Formatters ─────────────────────────────────────────
function toJSON(records) { return JSON.stringify(records, null, 2); }
function toCSV(records) {
  if (!records.length) return "";
  const h = Object.keys(records[0]);
  return [h.join(","), ...records.map((r) => h.map((k) => { const v = r[k] == null ? "" : String(r[k]); return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v; }).join(","))].join("\n");
}
function toXML(records) {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
  records.forEach((r) => { x += "  <record>\n"; Object.entries(r).forEach(([k, v]) => { const t = k.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(); x += `    <${t}>${v == null ? "" : v}</${t}>\n`; }); x += "  </record>\n"; });
  return x + "</records>";
}

// ── Theme ─────────────────────────────────────────────────────
const T = {
  bg: "#09090b", surface: "#18181b", surfaceAlt: "#1c1c20",
  border: "#27272a", borderLight: "#3f3f46",
  accent: "#d97706", accentDim: "#b45309", accentBg: "rgba(217,119,6,0.08)",
  accentBorder: "rgba(217,119,6,0.2)",
  copper: "#c2855a", copperDim: "#a06b3f",
  text1: "#fafafa", text2: "#a1a1aa", text3: "#71717a",
  green: "#22c55e", greenBg: "rgba(34,197,94,0.08)", greenBorder: "rgba(34,197,94,0.2)",
  red: "#ef4444", redBg: "rgba(239,68,68,0.08)", redBorder: "rgba(239,68,68,0.2)",
  blue: "#3b82f6", blueBg: "rgba(59,130,246,0.08)", blueBorder: "rgba(59,130,246,0.2)",
  amber: "#f59e0b", amberBg: "rgba(245,158,11,0.08)", amberBorder: "rgba(245,158,11,0.2)",
};

// ── Reusable Components ───────────────────────────────────────
const Badge = ({ children, color = T.green, bg, border }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px", background: bg || color + "14", color, border: `1px solid ${border || color + "30"}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);

const StatCard = ({ value, label, color = T.text2 }) => (
  <div style={{ background: T.surface, borderRadius: "10px", padding: "16px 18px", border: `1px solid ${T.border}`, flex: 1, minWidth: "100px" }}>
    <div style={{ fontSize: "26px", fontWeight: 700, color, letterSpacing: "-1px", fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
    <div style={{ fontSize: "11px", color: T.text3, textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>{label}</div>
  </div>
);

const Btn = ({ children, primary, onClick, disabled, style: s = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: primary ? "11px 24px" : "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s",
    border: primary ? "none" : `1px solid ${T.border}`,
    background: primary ? `linear-gradient(135deg, ${T.accent}, ${T.copper})` : "transparent",
    color: primary ? T.bg : T.text2, opacity: disabled ? 0.4 : 1, letterSpacing: "0.2px", ...s,
  }}>{children}</button>
);

// ── Steps ─────────────────────────────────────────────────────
const STEPS = ["Ingest", "Preview", "Clean", "Review", "Export"];

function StepBar({ current }) {
  const ci = STEPS.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", padding: "0 24px", borderBottom: `1px solid ${T.border}`, background: T.surface + "80", backdropFilter: "blur(12px)" }}>
      {STEPS.map((s, i) => {
        const active = i <= ci;
        const isCurrent = i === ci;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: isCurrent ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.2s" }}>
              <div style={{
                width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                background: isCurrent ? T.accent : active ? T.accentBg : "transparent",
                color: isCurrent ? T.bg : active ? T.accent : T.text3,
                border: isCurrent ? "none" : `1px solid ${active ? T.accentBorder : T.border}`,
              }}>{i + 1}</div>
              <span style={{ fontSize: "12px", fontWeight: isCurrent ? 700 : 500, color: isCurrent ? T.text1 : active ? T.text2 : T.text3, letterSpacing: "0.3px" }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: "20px", height: "1px", background: active && i < ci ? T.accent + "40" : T.border }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────
function DataTable({ records, maxRows = 50, highlightSchema, onRowClick }) {
  if (!records.length) return null;
  const keys = Object.keys(records[0]);
  const rows = records.slice(0, maxRows);
  return (
    <div style={{ borderRadius: "10px", border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", maxHeight: "360px", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'DM Mono', 'JetBrains Mono', monospace" }}>
          <thead>
            <tr style={{ background: T.surfaceAlt, position: "sticky", top: 0, zIndex: 2 }}>
              <th style={{ padding: "10px 14px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>#</th>
              {keys.map((k) => (
                <th key={k} style={{ padding: "10px 14px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                  {k}
                  {highlightSchema && highlightSchema[k] && <span style={{ marginLeft: "6px", fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>{highlightSchema[k]}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, cursor: onRowClick ? "pointer" : "default" }} onClick={() => onRowClick?.(i)}>
                <td style={{ padding: "8px 14px", color: T.text3, fontSize: "11px" }}>{i + 1}</td>
                {keys.map((k) => {
                  const v = row[k];
                  const empty = v == null || v === "" || v === "N/A";
                  return (
                    <td key={k} style={{ padding: "8px 14px", color: empty ? T.text3 : T.text1, whiteSpace: "nowrap", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", fontStyle: empty ? "italic" : "normal" }}>
                      {empty ? (v === null ? "null" : v || "empty") : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length > maxRows && (
        <div style={{ padding: "8px 14px", fontSize: "11px", color: T.text3, borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}>
          Showing {maxRows} of {records.length} rows
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function Smelt() {
  const [step, setStep] = useState("Ingest");
  const [rawData, setRawData] = useState("");
  const [format, setFormat] = useState("");
  const [parsed, setParsed] = useState([]);
  const [schema, setSchema] = useState({});
  const [result, setResult] = useState(null);
  const [exportFmt, setExportFmt] = useState("CSV");
  const [copied, setCopied] = useState(false);
  const [processingAnim, setProcessingAnim] = useState(false);
  const [issueFilter, setIssueFilter] = useState("all");
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const processRaw = useCallback((text) => {
    const fmt = detectFormat(text);
    setFormat(fmt);
    let records = [];
    try {
      if (fmt === "JSON") records = parseJSON(text);
      else if (fmt === "XML") records = parseXML(text);
      else if (fmt === "CSV" || fmt === "TSV") records = parseCSV(text);
    } catch (e) { records = []; }
    if (records.length && typeof records[0] === "object") {
      const keys = Object.keys(records[0]);
      const s = {};
      keys.forEach((k) => { s[k] = inferFieldType(k, records.map((r) => r[k])); });
      setSchema(s);
    }
    setParsed(records);
    setStep("Preview");
  }, []);

  const handleFile = (e) => {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setRawData(ev.target.result); processRaw(ev.target.result); };
    reader.readAsText(file);
  };

  const runClean = () => {
    setProcessingAnim(true);
    setTimeout(() => {
      const r = cleanRecords(parsed);
      setResult(r);
      setStep("Review");
      setProcessingAnim(false);
    }, 1200);
  };

  const getExport = () => {
    if (!result) return "";
    if (exportFmt === "JSON") return toJSON(result.cleaned);
    if (exportFmt === "CSV") return toCSV(result.cleaned);
    if (exportFmt === "XML") return toXML(result.cleaned);
    return toJSON(result.cleaned);
  };

  const download = () => {
    const data = getExport();
    const ext = exportFmt.toLowerCase();
    const mime = ext === "json" ? "application/json" : ext === "xml" ? "application/xml" : "text/csv";
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `smelted_data.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => { setStep("Ingest"); setRawData(""); setFormat(""); setParsed([]); setResult(null); setSchema({}); setIssueFilter("all"); };

  const issueTypeColors = { normalized: { c: T.blue, bg: T.blueBg, b: T.blueBorder }, duplicate: { c: T.amber, bg: T.amberBg, b: T.amberBorder }, missing: { c: T.text3, bg: T.surface, b: T.border }, invalid: { c: T.red, bg: T.redBg, b: T.redBorder } };

  const filteredIssues = result?.issues?.filter((i) => issueFilter === "all" || i.type === issueFilter) || [];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', 'Instrument Sans', system-ui, sans-serif", margin: 0, padding: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: T.bg, fontFamily: "'DM Mono', monospace" }}>S</span>
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px", color: T.text1 }}>Smelt</div>
            <div style={{ fontSize: "9px", color: T.text3, letterSpacing: "1.5px", textTransform: "uppercase" }}>Raw data in. Pure data out.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {step !== "Ingest" && <Btn onClick={reset}>New smelt</Btn>}
          <Badge color={T.accent} bg={T.accentBg} border={T.accentBorder}>MVP</Badge>
        </div>
      </div>

      <StepBar current={step} />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "28px 24px" }}>

        {/* ── INGEST ──────────────────────────── */}
        {step === "Ingest" && (
          <div style={{ animation: "smeltFadeIn 0.35s ease" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 6px", fontFamily: "'DM Sans', sans-serif" }}>Drop your messy data</h1>
            <p style={{ color: T.text2, fontSize: "14px", margin: "0 0 28px", lineHeight: 1.6 }}>Any format. We'll detect it, clean it, and hand it back pure.</p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e); }}
              onClick={() => fileRef.current?.click()}
              style={{
                borderRadius: "12px", padding: "48px 24px", textAlign: "center", cursor: "pointer",
                border: `2px dashed ${dragOver ? T.accent : T.borderLight}`, background: dragOver ? T.accentBg : "transparent",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "10px", opacity: 0.7 }}>&#8593;</div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: T.text1 }}>Drag a file here or click to browse</div>
              <div style={{ fontSize: "12px", color: T.text3, marginTop: "6px" }}>.csv · .json · .xml · .tsv · .xlsx · .txt</div>
              <input ref={fileRef} type="file" accept=".json,.csv,.xml,.tsv,.txt,.xlsx" onChange={handleFile} style={{ display: "none" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <span style={{ fontSize: "11px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase" }}>or paste raw data</span>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
            </div>

            <textarea
              value={rawData} onChange={(e) => setRawData(e.target.value)}
              placeholder="Paste JSON, CSV, XML, or any structured text..."
              style={{
                width: "100%", minHeight: "140px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px",
                padding: "16px", color: T.text1, fontFamily: "'DM Mono', monospace", fontSize: "12px", resize: "vertical",
                outline: "none", boxSizing: "border-box", lineHeight: 1.7, transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = T.accent}
              onBlur={(e) => e.target.style.borderColor = T.border}
            />
            <Btn primary onClick={() => rawData.trim() && processRaw(rawData)} disabled={!rawData.trim()} style={{ width: "100%", marginTop: "12px", padding: "13px" }}>
              Process data &#8594;
            </Btn>

            <div style={{ marginTop: "28px" }}>
              <div style={{ fontSize: "11px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Try a sample</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.keys(SAMPLES).map((k) => (
                  <Btn key={k} onClick={() => { setRawData(SAMPLES[k]); processRaw(SAMPLES[k]); }}>{k}</Btn>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW ─────────────────────────── */}
        {step === "Preview" && (
          <div style={{ animation: "smeltFadeIn 0.35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 8px" }}>Data detected</h1>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <Badge color={T.accent} bg={T.accentBg} border={T.accentBorder}>{format}</Badge>
                  <span style={{ fontSize: "13px", color: T.text2 }}>{parsed.length} records · {parsed.length > 0 ? Object.keys(parsed[0]).length : 0} fields</span>
                </div>
              </div>
            </div>

            {/* Schema inference */}
            {Object.keys(schema).length > 0 && (
              <div style={{ background: T.surface, borderRadius: "10px", border: `1px solid ${T.border}`, padding: "16px 18px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Schema inference</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {Object.entries(schema).map(([k, v]) => (
                    <span key={k} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.text2 }}>
                      <span style={{ color: T.text1, fontWeight: 600 }}>{k}</span> <span style={{ color: T.accent }}>{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <DataTable records={parsed} highlightSchema={schema} />

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <Btn onClick={() => setStep("Ingest")}>&#8592; Back</Btn>
              <Btn primary onClick={runClean} style={{ flex: 1 }}>Smelt this data &#8594;</Btn>
            </div>
          </div>
        )}

        {/* ── CLEANING ANIMATION ──────────────── */}
        {step === "Review" && processingAnim && (
          <div style={{ textAlign: "center", padding: "80px 0", animation: "smeltFadeIn 0.3s ease" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, margin: "0 auto 24px", animation: "smeltSpin 0.8s linear infinite" }} />
            <div style={{ fontSize: "18px", fontWeight: 600, color: T.text1, marginBottom: "6px" }}>Smelting your data...</div>
            <div style={{ fontSize: "13px", color: T.text3 }}>Inferring schema, normalizing fields, removing duplicates</div>
          </div>
        )}

        {/* ── REVIEW ──────────────────────────── */}
        {step === "Review" && !processingAnim && result && (
          <div style={{ animation: "smeltFadeIn 0.35s ease" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}>Cleaning report</h1>
            <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 20px" }}>
              {result.issues.length} changes made · {result.cleaned.length} clean records ready
            </p>

            {/* Stats */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <StatCard value={result.stats.total} label="Records in" color={T.text2} />
              <StatCard value={result.cleaned.length} label="Records out" color={T.green} />
              <StatCard value={result.stats.dupes} label="Duplicates" color={T.amber} />
              <StatCard value={result.stats.fixes} label="Normalized" color={T.blue} />
              <StatCard value={result.stats.nulls} label="Nulled" color={T.text3} />
            </div>

            {/* Issue filters */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
              {["all", "normalized", "duplicate", "missing", "invalid"].map((f) => {
                const count = f === "all" ? result.issues.length : result.issues.filter((i) => i.type === f).length;
                if (count === 0 && f !== "all") return null;
                return (
                  <button key={f} onClick={() => setIssueFilter(f)} style={{
                    padding: "5px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", border: `1px solid ${issueFilter === f ? T.accent : T.border}`, letterSpacing: "0.3px",
                    background: issueFilter === f ? T.accentBg : "transparent", color: issueFilter === f ? T.accent : T.text3,
                    textTransform: "uppercase", transition: "all 0.15s",
                  }}>{f} ({count})</button>
                );
              })}
            </div>

            {/* Change log */}
            {filteredIssues.length > 0 && (
              <div style={{ borderRadius: "10px", border: `1px solid ${T.border}`, overflow: "hidden", maxHeight: "320px", overflowY: "auto", marginBottom: "20px" }}>
                {filteredIssues.slice(0, 100).map((issue, i) => {
                  const tc = issueTypeColors[issue.type] || issueTypeColors.normalized;
                  return (
                    <div key={i} style={{ padding: "9px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: "10px", alignItems: "center", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
                      <span style={{ color: T.text3, minWidth: "48px", fontSize: "11px" }}>Row {issue.row}</span>
                      <Badge color={tc.c} bg={tc.bg} border={tc.b}>{issue.type}</Badge>
                      <span style={{ color: T.text3, minWidth: "80px", fontSize: "11px" }}>{issue.field}</span>
                      <span style={{ color: T.red + "aa", textDecoration: issue.type !== "duplicate" ? "line-through" : "none", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.7, fontSize: "11px" }}>{String(issue.was)}</span>
                      <span style={{ color: T.text3 }}>&#8594;</span>
                      <span style={{ color: T.green, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px" }}>{String(issue.now)}</span>
                    </div>
                  );
                })}
                {filteredIssues.length > 100 && (
                  <div style={{ padding: "8px 14px", fontSize: "11px", color: T.text3, background: T.surfaceAlt }}>+ {filteredIssues.length - 100} more changes</div>
                )}
              </div>
            )}

            {/* Clean data preview */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Cleaned data</div>
              <DataTable records={result.cleaned} highlightSchema={result.schema} />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Btn onClick={() => { setStep("Preview"); setResult(null); }}>&#8592; Back</Btn>
              <Btn primary onClick={() => setStep("Export")} style={{ flex: 1 }}>Export clean data &#8594;</Btn>
            </div>
          </div>
        )}

        {/* ── EXPORT ──────────────────────────── */}
        {step === "Export" && result && (
          <div style={{ animation: "smeltFadeIn 0.35s ease" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}>Export</h1>
            <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 24px" }}>{result.cleaned.length} clean records ready to go.</p>

            {/* Format picker */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
              {["CSV", "JSON", "XML"].map((f) => (
                <button key={f} onClick={() => { setExportFmt(f); setCopied(false); }} style={{
                  padding: "10px 22px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", transition: "all 0.15s", letterSpacing: "0.5px",
                  border: `1px solid ${exportFmt === f ? T.accent : T.border}`,
                  background: exportFmt === f ? T.accentBg : "transparent",
                  color: exportFmt === f ? T.accent : T.text3,
                }}>{f}</button>
              ))}
            </div>

            {/* Preview */}
            <div style={{ borderRadius: "10px", border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: "18px" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, fontSize: "11px", color: T.text3, background: T.surfaceAlt, display: "flex", justifyContent: "space-between", alignItems: "center", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                <span>Output · {exportFmt}</span>
                <span>{result.cleaned.length} records</span>
              </div>
              <pre style={{ padding: "16px", margin: 0, fontSize: "11px", lineHeight: 1.7, color: T.text1, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "300px", overflowY: "auto", fontFamily: "'DM Mono', monospace", background: T.surface }}>
                {getExport()}
              </pre>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Btn onClick={() => setStep("Review")}>&#8592; Back</Btn>
              <Btn onClick={() => { navigator.clipboard?.writeText(getExport()); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ borderColor: copied ? T.green : T.border, color: copied ? T.green : T.text2 }}>
                {copied ? "Copied!" : "Copy"}
              </Btn>
              <Btn primary onClick={download} style={{ flex: 1 }}>Download .{exportFmt.toLowerCase()}</Btn>
            </div>

            {/* CRM Push teaser */}
            <div style={{ marginTop: "28px", borderRadius: "10px", border: `1px solid ${T.accentBorder}`, background: T.accentBg, padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: T.accent, marginBottom: "6px" }}>Push to CRM</div>
              <p style={{ fontSize: "13px", color: T.text2, margin: "0 0 14px", lineHeight: 1.6 }}>
                Send clean data directly to Salesforce, HubSpot, or Airtable. Coming in Smelt Pro.
              </p>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: T.text3, background: T.surface, borderRadius: "8px", padding: "14px", border: `1px solid ${T.border}`, lineHeight: 1.7 }}>
{`POST https://api.smelt.fyi/v1/clean
Content-Type: application/json
Authorization: Bearer sk_live_...

{
  "data": "<your_raw_data>",
  "output": "${exportFmt.toLowerCase()}",
  "push_to": "salesforce",
  "webhook": "https://your-app.com/callback"
}`}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes smeltFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes smeltSpin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        button:hover:not(:disabled) { opacity: 0.88; }
      `}</style>
    </div>
  );
}
