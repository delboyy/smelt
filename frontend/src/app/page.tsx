"use client";

import Link from "next/link";
import { T } from "@/lib/constants";

const S = {
  page: {
    minHeight: "100vh",
    background: T.bg,
    color: T.text1,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  } as React.CSSProperties,

  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 48px",
    borderBottom: `1px solid ${T.border}`,
    background: "rgba(9,9,11,0.85)",
    backdropFilter: "blur(12px)",
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
  } as React.CSSProperties,

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    color: T.text1,
  } as React.CSSProperties,

  logoMark: {
    width: "28px",
    height: "28px",
    borderRadius: "7px",
    background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 800,
    color: T.bg,
    fontFamily: "'DM Mono', monospace",
  } as React.CSSProperties,
} as const;

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{ color: T.text2, fontSize: "14px", textDecoration: "none" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = T.text1)}
      onMouseLeave={(e) => (e.currentTarget.style.color = T.text2)}
    >
      {children}
    </a>
  );
}

function PricingCard({
  plan,
  price,
  period,
  desc,
  features,
  cta,
  ctaHref,
  highlight,
}: {
  plan: string;
  price: string;
  period?: string;
  desc: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? `linear-gradient(135deg, rgba(217,119,6,0.06), rgba(194,133,90,0.04))` : T.surface,
        border: `1px solid ${highlight ? T.accentBorder : T.border}`,
        borderRadius: "12px",
        padding: "28px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
      }}
    >
      {highlight && (
        <div
          style={{
            position: "absolute",
            top: "-1px",
            left: "50%",
            transform: "translateX(-50%)",
            background: `linear-gradient(90deg, ${T.accent}, ${T.copper})`,
            color: T.bg,
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            padding: "3px 12px",
            borderRadius: "0 0 6px 6px",
            textTransform: "uppercase",
          }}
        >
          Most popular
        </div>
      )}
      <div>
        <div style={{ fontSize: "12px", color: T.text3, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>{plan}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1px", color: highlight ? T.accent : T.text1 }}>{price}</span>
          {period && <span style={{ fontSize: "13px", color: T.text3 }}>{period}</span>}
        </div>
        <div style={{ fontSize: "13px", color: T.text2, marginTop: "6px" }}>{desc}</div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: T.text2 }}>
            <span style={{ color: T.green, marginTop: "1px", flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        style={{
          display: "block",
          textAlign: "center",
          padding: "10px 20px",
          borderRadius: "7px",
          fontSize: "13px",
          fontWeight: 600,
          textDecoration: "none",
          marginTop: "auto",
          background: highlight
            ? `linear-gradient(135deg, ${T.accent}, ${T.copper})`
            : "transparent",
          color: highlight ? T.bg : T.text1,
          border: highlight ? "none" : `1px solid ${T.border}`,
        }}
      >
        {cta}
      </a>
    </div>
  );
}

const BEFORE = `full_name,email,phone,signup_date,deal_value
john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15,$50000
Jane Smith,jane@widgets.io,(555) 567-8901,01-20-2023,"$120,000"
bob wilson,BOB@ACMECORP.COM,5559876543,2023.02.01,50000
  charlie davis ,charlie@bigco.net,555 111 2222,Feb 10 2023,$30000
john doe,john@acmecorp.com,555-1234,15/01/2023,$50000`;

const AFTER = `full_name,email,phone,signup_date,deal_value
John Doe,john@acmecorp.com,(555) 123-4567,2023-01-15,50000.0
Jane Smith,jane@widgets.io,(555) 567-8901,2023-01-20,120000.0
Bob Wilson,bob@acmecorp.com,(555) 987-6543,2023-02-01,50000.0
Charlie Davis,charlie@bigco.net,(555) 111-2222,2023-02-10,30000.0`;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Drop your data",
    desc: "CSV, JSON, XML, or TSV — paste it in or upload a file. Any encoding, any format.",
  },
  {
    n: "02",
    title: "AI writes the spec",
    desc: "Claude analyzes a 100-row sample and generates a reusable JSON transform spec in ~2 seconds.",
  },
  {
    n: "03",
    title: "Polars executes",
    desc: "The deterministic pipeline runs on your full dataset. Scales to millions of rows in milliseconds.",
  },
  {
    n: "04",
    title: "Export clean data",
    desc: "Download as CSV, JSON, or XML. Or push directly to Salesforce or HubSpot (Pro).",
  },
];

const FIELD_TYPES = [
  ["name", "John Doe"],
  ["email", "user@domain.com"],
  ["phone", "(555) 123-4567"],
  ["date", "2024-01-15"],
  ["currency", "50000.00"],
  ["company", "Acme Corp LLC"],
  ["status", "active"],
  ["category", "Electronics"],
  ["number", "4.2"],
  ["id", "SKU-001"],
  ["text", "hello world"],
  ["currency_code", "USD"],
];

export default function LandingPage() {
  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <a href="/" style={S.logo}>
          <div style={S.logoMark}>S</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }}>Smelt</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="https://github.com/delboyy/smelt">GitHub</NavLink>
          <a
            href="/login"
            style={{ color: T.text2, fontSize: "14px", textDecoration: "none" }}
          >
            Log in
          </a>
          <Link
            href="/app"
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: T.bg,
              padding: "8px 16px",
              borderRadius: "7px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start free →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "96px 48px 72px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: T.accentBg,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: "99px",
            padding: "4px 12px 4px 8px",
            marginBottom: "32px",
          }}
        >
          <span style={{ fontSize: "11px", color: T.accent }}>●</span>
          <span style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>Live · Free tier · No credit card</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(48px, 7vw, 76px)",
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1.05,
            margin: "0 0 24px",
            color: T.text1,
          }}
        >
          Raw data in.{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Pure data out.
          </span>
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: T.text2,
            lineHeight: 1.6,
            maxWidth: "560px",
            margin: "0 auto 40px",
          }}
        >
          Drop any messy CSV, JSON, or XML. AI detects schema, fixes case, normalizes dates and
          phones, removes duplicates — in seconds. No code required.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/app"
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: T.bg,
              padding: "13px 28px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "-0.3px",
            }}
          >
            Clean your data free →
          </Link>
          <a
            href="#how-it-works"
            style={{
              background: "transparent",
              color: T.text1,
              padding: "13px 24px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              border: `1px solid ${T.border}`,
            }}
          >
            See how it works
          </a>
        </div>

        <p style={{ fontSize: "12px", color: T.text3, marginTop: "16px" }}>
          10,000 rows/month free · No signup to start · Works on any format
        </p>
      </section>

      {/* BEFORE / AFTER DEMO */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "0 48px 96px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* BEFORE */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.redBorder}`,
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderBottom: `1px solid ${T.border}`,
                background: "rgba(239,68,68,0.04)",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.red, opacity: 0.7 }} />
              <span style={{ fontSize: "11px", color: T.text3, fontFamily: "'DM Mono', monospace" }}>messy_contacts.csv</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "10px",
                  color: T.red,
                  background: T.redBg,
                  border: `1px solid ${T.redBorder}`,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px",
                }}
              >
                DIRTY
              </span>
            </div>
            <pre
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: T.text2,
                padding: "16px",
                margin: 0,
                overflowX: "auto",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {BEFORE.split("\n").map((line, i) => (
                <span key={i} style={{ display: "block", color: i === 0 ? T.text3 : T.text2 }}>
                  {i > 0 && (
                    <span style={{ color: T.red, marginRight: "4px", opacity: 0.5 }}>!</span>
                  )}
                  {line}
                </span>
              ))}
            </pre>
          </div>

          {/* ARROW */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              paddingTop: "48px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                color: T.bg,
                fontWeight: 700,
              }}
            >
              →
            </div>
            <span
              style={{
                fontSize: "10px",
                color: T.accent,
                letterSpacing: "0.5px",
                fontWeight: 600,
              }}
            >
              Smelt
            </span>
          </div>

          {/* AFTER */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.greenBorder}`,
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderBottom: `1px solid ${T.border}`,
                background: "rgba(34,197,94,0.04)",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.green, opacity: 0.7 }} />
              <span style={{ fontSize: "11px", color: T.text3, fontFamily: "'DM Mono', monospace" }}>smelted_contacts.csv</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "10px",
                  color: T.green,
                  background: T.greenBg,
                  border: `1px solid ${T.greenBorder}`,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px",
                }}
              >
                CLEAN
              </span>
            </div>
            <pre
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: T.text2,
                padding: "16px",
                margin: 0,
                overflowX: "auto",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {AFTER.split("\n").map((line, i) => (
                <span key={i} style={{ display: "block", color: i === 0 ? T.text3 : T.text2 }}>
                  {i > 0 && (
                    <span style={{ color: T.green, marginRight: "4px", opacity: 0.5 }}>✓</span>
                  )}
                  {line}
                </span>
              ))}
            </pre>
          </div>
        </div>

        {/* STATS ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1px",
            background: T.border,
            border: `1px solid ${T.border}`,
            borderRadius: "10px",
            overflow: "hidden",
            marginTop: "32px",
          }}
        >
          {[
            { v: "12", label: "field types detected" },
            { v: "1 duplicate", label: "removed automatically" },
            { v: "100ms", label: "avg. clean time" },
            { v: "0 rows", label: "sent to the LLM" },
          ].map(({ v, label }) => (
            <div
              key={label}
              style={{ background: T.surface, padding: "20px 24px", textAlign: "center" }}
            >
              <div style={{ fontSize: "20px", fontWeight: 700, color: T.accent, letterSpacing: "-0.5px" }}>{v}</div>
              <div style={{ fontSize: "12px", color: T.text3, marginTop: "4px" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link
            href="/app"
            style={{
              color: T.accent,
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Try it with your own data →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div
              style={{
                fontSize: "11px",
                color: T.accent,
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: 800,
                letterSpacing: "-1px",
                margin: "0 0 12px",
              }}
            >
              Clean to export in 4 steps
            </h2>
            <p style={{ color: T.text2, fontSize: "15px" }}>
              No configuration. No mapping. No code. Just drop and clean.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div
                key={n}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "10px",
                  padding: "24px",
                  display: "flex",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: T.accent,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.5px",
                    minWidth: "24px",
                    paddingTop: "2px",
                  }}
                >
                  {n}
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{title}</div>
                  <div style={{ fontSize: "13px", color: T.text2, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIELD TYPES */}
      <section style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                fontSize: "11px",
                color: T.accent,
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              What it normalizes
            </div>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-1px", margin: "0 0 12px" }}>
              12 field types, zero config
            </h2>
            <p style={{ color: T.text2, fontSize: "15px" }}>
              Schema is inferred automatically. You review, approve, and go.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
            }}
          >
            {FIELD_TYPES.map(([type, example]) => (
              <div
                key={type}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: T.accent,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {type}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: T.text2,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div
              style={{
                fontSize: "11px",
                color: T.accent,
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Pricing
            </div>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-1px", margin: "0 0 12px" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: T.text2, fontSize: "15px" }}>
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
            <PricingCard
              plan="Free"
              price="$0"
              desc="For individuals and small teams."
              features={[
                "10,000 rows / month",
                "All 12 field types",
                "CSV, JSON, XML export",
                "Deduplication",
                "Full audit log",
                "No credit card required",
              ]}
              cta="Start cleaning free"
              ctaHref="/app"
            />
            <PricingCard
              plan="Pro"
              price="$59"
              period="/ month"
              desc="For teams with serious data volume."
              features={[
                "250,000 rows / month",
                "Everything in Free",
                "Salesforce push (Bulk API)",
                "HubSpot push",
                "REST API access",
                "Webhooks on job complete",
                "Saved cleaning recipes",
              ]}
              cta="Upgrade to Pro"
              ctaHref="/login"
              highlight
            />
            <PricingCard
              plan="Enterprise"
              price="Custom"
              desc="For high-volume and compliance needs."
              features={[
                "Unlimited rows",
                "Everything in Pro",
                "SSO / SAML",
                "SLA + dedicated support",
                "On-prem deploy option",
                "Custom integrations",
              ]}
              cta="Contact us"
              ctaHref="mailto:hello@smelt.fyi"
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        style={{
          padding: "96px 48px",
          borderTop: `1px solid ${T.border}`,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "48px",
            fontWeight: 800,
            letterSpacing: "-2px",
            margin: "0 0 16px",
          }}
        >
          Your data is messy.{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Fix it now.
          </span>
        </h2>
        <p style={{ color: T.text2, fontSize: "16px", marginBottom: "36px" }}>
          No signup required. First clean is free. Takes 30 seconds.
        </p>
        <Link
          href="/app"
          style={{
            background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
            color: T.bg,
            padding: "14px 32px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "-0.3px",
          }}
        >
          Drop your file →
        </Link>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: "32px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={S.logoMark}>S</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: T.text1 }}>Smelt</div>
            <div style={{ fontSize: "11px", color: T.text3 }}>Raw data in. Pure data out.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[
            { label: "App", href: "/app" },
            { label: "GitHub", href: "https://github.com/delboyy/smelt" },
            { label: "Docs", href: "/docs" },
            { label: "Twitter", href: "https://twitter.com/smeltfyi" },
            { label: "Privacy", href: "/privacy" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{ fontSize: "13px", color: T.text3, textDecoration: "none" }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: "12px", color: T.text3 }}>
          © 2025 Smelt · smelt.fyi
        </div>
      </footer>
    </div>
  );
}
