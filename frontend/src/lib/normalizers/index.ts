import type { FieldType } from "../detection/schema";

export type NormalizeResult = {
  val: string | number | null;
  changed: boolean;
  type: "normalized" | "missing" | "invalid" | "unchanged";
};

export const normalizers: Record<FieldType, (v: string) => NormalizeResult> = {
  name: (v) => {
    if (!v || !v.trim()) return { val: null, changed: true, type: "missing" };
    const cleaned = v
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return { val: cleaned, changed: cleaned !== v, type: "normalized" };
  },

  company: (v) => {
    if (!v || !v.trim()) return { val: null, changed: true, type: "missing" };
    let c = v.trim().replace(/\s+/g, " ");
    c = c.replace(/\b(corp|corporation|incorporated|inc)\b\.?$/i, (m) => {
      const l = m.toLowerCase().replace(/\./g, "");
      if (l === "corp" || l === "corporation") return "Corp";
      if (l === "inc" || l === "incorporated") return "Inc";
      return m;
    });
    c = c
      .split(" ")
      .map((w) => {
        if (/^(llc|llp|ltd)$/i.test(w)) return w.toUpperCase();
        if (/^(inc|corp|co|plc)$/i.test(w)) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
    return { val: c, changed: c !== v, type: "normalized" };
  },

  email: (v) => {
    if (!v || !v.trim() || v.trim() === "N/A")
      return { val: null, changed: !!v && v.trim() !== "", type: v?.trim() ? "invalid" : "missing" };
    const e = v.trim().toLowerCase();
    return { val: e, changed: e !== v, type: "normalized" };
  },

  phone: (v) => {
    if (!v || !v.trim() || v === "N/A")
      return { val: null, changed: !!v && v.trim() !== "" && v !== "N/A", type: "missing" };
    let d = v.replace(/[^\d+]/g, "");
    if (d.startsWith("+1")) d = d.slice(2);
    if (d.startsWith("1") && d.length === 11) d = d.slice(1);
    if (d.length === 10) {
      const f = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      return { val: f, changed: f !== v, type: "normalized" };
    }
    if (d.length === 7) {
      const f = `${d.slice(0, 3)}-${d.slice(3)}`;
      return { val: f, changed: f !== v, type: "normalized" };
    }
    return { val: v.trim(), changed: v.trim() !== v, type: "normalized" };
  },

  date: (v) => {
    if (!v || !v.trim() || v === "N/A") return { val: null, changed: !!v, type: "missing" };
    const d = v.trim();
    const patterns: Array<{ re: RegExp; f: (m: RegExpMatchArray) => string }> = [
      {
        re: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
        f: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
      },
      {
        re: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
        f: (m) => {
          const a = parseInt(m[1]);
          return a > 12
            ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
            : `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        },
      },
      {
        re: /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/,
        f: (m) => {
          const months: Record<string, number> = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
          };
          const mo = months[m[1].toLowerCase().slice(0, 3)];
          return mo ? `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}` : d;
        },
      },
    ];
    for (const { re, f } of patterns) {
      const m = d.match(re);
      if (m) {
        const r = f(m);
        return { val: r, changed: r !== d, type: "normalized" };
      }
    }
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
    const map: Record<string, string> = {
      active: "Active",
      actve: "Active",
      inactive: "Inactive",
      paid: "Paid",
      pending: "Pending",
      overdue: "Overdue",
      cancelled: "Cancelled",
      canceled: "Cancelled",
    };
    const r = map[l] ?? v.trim().charAt(0).toUpperCase() + v.trim().slice(1).toLowerCase();
    return { val: r, changed: r !== v, type: "normalized" };
  },

  category: (v) => {
    if (!v) return { val: null, changed: false, type: "missing" };
    let c = v.trim().replace(/[\/&]+/g, " > ").replace(/\s+/g, " ");
    c = c
      .split(" ")
      .map((w) => (w === ">" ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ");
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
