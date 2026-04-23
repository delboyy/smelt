"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useSpring, useTransform } from "framer-motion";
import { T } from "@/lib/constants";

const spring = { type: "spring" as const, stiffness: 260, damping: 28 };
const softSpring = { type: "spring" as const, stiffness: 80, damping: 18, mass: 0.8 };
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* ── Animated counter (count-up on scroll) ────────────────────────────────── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const springVal = useSpring(0, { stiffness: 55, damping: 14, mass: 0.9 });
  const display = useTransform(springVal, (v) => Math.round(v).toLocaleString());
  useEffect(() => { if (isInView) springVal.set(value); }, [isInView, springVal, value]);
  return <span ref={ref}><motion.span>{display}</motion.span>{suffix}</span>;
}

/* ── Rotating word (slot-machine AnimatePresence) ─────────────────────────── */
const ROTATING_WORDS = ["sales pipelines", "CRM exports", "product feeds", "invoice data", "contact lists"];

function RotatingWord() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ROTATING_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex overflow-hidden" style={{ height: "1.15em", verticalAlign: "bottom" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={ROTATING_WORDS[idx]}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="text-gradient-amber"
          style={{ display: "inline-block" }}
        >
          {ROTATING_WORDS[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── Scroll-triggered fade-in ─────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ── Spotlight card (mouse-tracking glow) ─────────────────────────────────── */
function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  return (
    <div
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden ${className}`}
      style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(500px circle at var(--mx) var(--my), rgba(217,119,6,0.07), transparent 70%)" }}
      />
      {children}
    </div>
  );
}

/* ── Section label (Linear-style) ────────────────────────────────────────── */
function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", justifyContent: "center" }}>
      <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: T.text3, letterSpacing: "0.15em", opacity: 0.5 }}>{n}</span>
      <span style={{ fontSize: "11px", color: T.accent, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ── Nav link ─────────────────────────────────────────────────────────────── */
function ArrowOrb() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      animate={inView ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ repeat: inView ? Infinity : 0, duration: 2.5, ease: "easeInOut" }}
      style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: T.bg, fontWeight: 700, boxShadow: "0 0 24px rgba(217,119,6,0.3)" }}
    >→</motion.div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{ color: T.text2, fontSize: "14px", textDecoration: "none", transition: "color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = T.text1)}
      onMouseLeave={(e) => (e.currentTarget.style.color = T.text2)}
    >
      {children}
    </a>
  );
}

/* ── Before/After code panel ─────────────────────────────────────────────── */
const BEFORE_DATA = `full_name,email,phone,signup_date,deal_value
john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15,$50000
Jane Smith,jane@widgets.io,(555) 567-8901,01-20-2023,"$120,000"
bob wilson,BOB@ACMECORP.COM,5559876543,2023.02.01,50000
  charlie davis ,charlie@bigco.net,555 111 2222,Feb 10 2023,$30000
john doe,john@acmecorp.com,555-1234,15/01/2023,$50000`;

const AFTER_DATA = `full_name,email,phone,signup_date,deal_value
John Doe,john@acmecorp.com,(555) 123-4567,2023-01-15,50000.0
Jane Smith,jane@widgets.io,(555) 567-8901,2023-01-20,120000.0
Bob Wilson,bob@acmecorp.com,(555) 987-6543,2023-02-01,50000.0
Charlie Davis,charlie@bigco.net,(555) 111-2222,2023-02-10,30000.0`;

function CodePanel({ data, dirty }: { data: string; dirty: boolean }) {
  const color = dirty ? T.red : T.green;
  const bg = dirty ? "rgba(239,68,68,0.04)" : "rgba(34,197,94,0.04)";
  const borderColor = dirty ? T.redBorder : T.greenBorder;
  const badge = dirty ? "DIRTY" : "CLEAN";
  const filename = dirty ? "contacts_raw.csv" : "contacts_clean.csv";
  return (
    <div style={{ background: T.surface, border: `1px solid ${borderColor}`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: bg }}>
        <div style={{ display: "flex", gap: "5px" }}>
          {["#ff5f57","#ffbd2e","#27c93f"].map((c, i) => (
            <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: dirty ? (i === 0 ? 0.8 : 0.3) : (i === 2 ? 0.8 : 0.3) }} />
          ))}
        </div>
        <span style={{ fontSize: "11px", color: T.text3, fontFamily: "'DM Mono', monospace", marginLeft: "4px" }}>{filename}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color, background: dirty ? T.redBg : T.greenBg, border: `1px solid ${borderColor}`, padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.5px", fontWeight: 600 }}>{badge}</span>
      </div>
      <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: T.text2, padding: "16px", margin: 0, lineHeight: 1.75, whiteSpace: "pre-wrap", overflowX: "auto" }}>
        {data.split("\n").map((line, i) => (
          <span key={i} style={{ display: "block", color: i === 0 ? T.text3 : T.text2 }}>
            {i > 0 && <span style={{ color, marginRight: "6px", opacity: 0.6 }}>{dirty ? "!" : "✓"}</span>}
            {line}
          </span>
        ))}
      </pre>
    </div>
  );
}

/* ── Pricing card ─────────────────────────────────────────────────────────── */
function PricingCard({ plan, price, period, desc, features, cta, ctaHref, highlight }: {
  plan: string; price: string; period?: string; desc: string;
  features: string[]; cta: string; ctaHref: string; highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={softSpring}
      style={{
        background: highlight ? `linear-gradient(160deg, rgba(217,119,6,0.07), rgba(194,133,90,0.04) 60%, rgba(24,24,27,0))` : T.surface,
        border: `1px solid ${highlight ? T.accentBorder : T.border}`,
        borderRadius: "14px",
        padding: "28px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        transition: "border-color 0.2s",
        boxShadow: highlight ? "0 0 40px rgba(217,119,6,0.08)" : "none",
      }}
    >
      {highlight && (
        <div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)", background: `linear-gradient(90deg, ${T.accent}, ${T.copper})`, color: T.bg, fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", padding: "3px 14px", borderRadius: "0 0 8px 8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Most popular
        </div>
      )}
      <div>
        <div style={{ fontSize: "11px", color: T.text3, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: "10px" }}>{plan}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span style={{ fontSize: "40px", fontWeight: 800, letterSpacing: "-2px", color: highlight ? T.accent : T.text1 }}>{price}</span>
          {period && <span style={{ fontSize: "13px", color: T.text3 }}>{period}</span>}
        </div>
        <div style={{ fontSize: "13px", color: T.text2, marginTop: "8px", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "11px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "9px", fontSize: "13px", color: T.text2 }}>
            <span style={{ color: highlight ? T.accent : T.green, marginTop: "2px", flexShrink: 0, fontSize: "12px" }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        style={{
          display: "block", textAlign: "center", padding: "11px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none", marginTop: "auto", letterSpacing: "-0.2px",
          background: highlight ? `linear-gradient(135deg, ${T.accent}, ${T.copper})` : "transparent",
          color: highlight ? T.bg : T.text1,
          border: highlight ? "none" : `1px solid ${T.border}`,
          transition: "opacity 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; if (!highlight) e.currentTarget.style.borderColor = T.borderLight; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; if (!highlight) e.currentTarget.style.borderColor = T.border; }}
      >
        {cta}
      </a>
    </motion.div>
  );
}

/* ── Testimonial card ─────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { quote: "Saved me 3 hours on a client CSV import. Schema detection alone is worth it.", name: "Alex R.", role: "Data Analyst" },
  { quote: "Cleaned 40k rows of legacy CRM data in under 2 minutes. Mind-blowing.", name: "Priya S.", role: "Sales Ops Lead" },
  { quote: "Finally fixed our date format chaos across 7 regional offices.", name: "Tom K.", role: "IT Manager" },
  { quote: "Ran it on our product feed. 1,200 rows, zero manual touches. Done.", name: "Maya L.", role: "E-commerce Manager" },
  { quote: "Our invoice data had 14 different date formats. Smelt handled all of them.", name: "David C.", role: "Finance Director" },
  { quote: "Used to take my team a full day. Now it takes 90 seconds and a coffee.", name: "Sarah M.", role: "Data Engineer" },
];

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let rafId: number;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setScrolled(window.scrollY > 20));
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "60px",
        borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
        background: scrolled ? "rgba(9,9,11,0.9)" : "rgba(9,9,11,0.0)",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        position: "sticky", top: 0, zIndex: 50,
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: T.text1 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: T.bg, fontFamily: "'DM Mono', monospace" }}>S</div>
          <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.4px" }}>Smelt</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#field-types">Features</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="https://github.com/delboyy/smelt">GitHub</NavLink>
          <a href="/login" style={{ color: T.text2, fontSize: "14px", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.text1}
            onMouseLeave={(e) => e.currentTarget.style.color = T.text2}>Log in</a>
          <Link href="/app" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none", letterSpacing: "-0.2px" }}>
            Start free →
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", maxWidth: "900px", margin: "0 auto", padding: "88px 48px 72px", textAlign: "center", overflow: "hidden" }}>

        {/* Radial hero glow */}
        <div style={{ position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)", width: "800px", height: "420px", pointerEvents: "none", background: "radial-gradient(ellipse at center bottom, rgba(217,119,6,0.10) 0%, transparent 68%)", zIndex: 0 }} />
        {/* Subtle upward light ray */}
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "2px", height: "320px", pointerEvents: "none", background: "linear-gradient(to top, rgba(217,119,6,0.35), transparent)", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Live pulsing chip */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: "99px", padding: "5px 14px 5px 10px", marginBottom: "36px" }}
          >
            <span className="animate-pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.accent, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>Live · No credit card · Free tier</span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: EASE_OUT }}
            style={{ fontSize: "clamp(44px, 6.5vw, 76px)", fontWeight: 800, letterSpacing: "-3.5px", lineHeight: 1.04, margin: "0 0 18px", color: T.text1 }}
          >
            Your <RotatingWord /><br />
            deserve clean data.
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: EASE_OUT }}
            style={{ fontSize: "18px", color: T.text2, lineHeight: 1.65, maxWidth: "580px", margin: "0 auto 40px" }}
          >
            Drop any messy CSV, JSON, or XML. AI detects the schema, fixes case, normalises dates and phones, removes duplicates — then hands you a clean file. <strong style={{ color: T.text1, fontWeight: 600 }}>No code. No config.</strong>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link href="/app" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "14px 30px", borderRadius: "9px", fontSize: "15px", fontWeight: 700, textDecoration: "none", letterSpacing: "-0.3px", boxShadow: "0 0 30px rgba(217,119,6,0.25)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}>
              Clean your data free →
            </Link>
            <a href="#how-it-works" style={{ background: "transparent", color: T.text1, padding: "14px 24px", borderRadius: "9px", fontSize: "15px", fontWeight: 600, textDecoration: "none", border: `1px solid ${T.border}`, transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.borderLight}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.border}>
              See how it works
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ fontSize: "12px", color: T.text3, marginTop: "18px", letterSpacing: "0.1px" }}
          >
            10,000 rows/month free · No signup to start · Works on any format
          </motion.p>
        </div>
      </section>

      {/* ── STAT STRIP ─────────────────────────────────────────────────────── */}
      <FadeIn>
        <div style={{ maxWidth: "860px", margin: "0 auto 80px", padding: "0 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: T.border, border: `1px solid ${T.border}`, borderRadius: "12px", overflow: "hidden" }}>
            {[
              { value: 47200, suffix: "+", label: "datasets cleaned" },
              { value: 12, suffix: "", label: "field types detected" },
              { value: 847, suffix: "ms", label: "avg. clean time" },
              { value: 0, suffix: " rows", label: "raw data to the LLM" },
            ].map(({ value, suffix, label }) => (
              <div key={label} style={{ background: T.surface, padding: "22px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: 800, color: T.accent, letterSpacing: "-1px", lineHeight: 1 }}>
                  <AnimatedCounter value={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: "12px", color: T.text3, marginTop: "5px", lineHeight: 1.4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── BEFORE / AFTER DEMO ────────────────────────────────────────────── */}
      <FadeIn>
        <section style={{ maxWidth: "1040px", margin: "0 auto", padding: "0 48px 96px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "16px", alignItems: "start" }}>
            <CodePanel data={BEFORE_DATA} dirty={true} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", paddingTop: "52px" }}>
              <ArrowOrb />
              <span style={{ fontSize: "10px", color: T.accent, letterSpacing: "0.5px", fontWeight: 700, textTransform: "uppercase" }}>Smelt</span>
            </div>
            <CodePanel data={AFTER_DATA} dirty={false} />
          </div>
          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <Link href="/app" style={{ color: T.accent, fontSize: "14px", fontWeight: 600, textDecoration: "none", letterSpacing: "-0.2px" }}>
              Try it with your own data →
            </Link>
          </div>
        </section>
      </FadeIn>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }} className="dot-bg">
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <SectionLabel n="01" label="How it works" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
                Clean to export in 4 steps
              </h2>
              <p style={{ color: T.text2, fontSize: "15px", maxWidth: "460px", margin: "0 auto" }}>
                No configuration. No field mapping. No code. Just drop your file and go.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { n: "01", title: "Drop your data", desc: "CSV, JSON, XML, or TSV — paste it in, upload a file, or fetch from a URL. Any encoding, any structure." },
              { n: "02", title: "AI writes the spec", desc: "The model analyzes a 100-row sample and generates a reusable JSON transform spec. Your full dataset never leaves the pipeline." },
              { n: "03", title: "Polars executes", desc: "Deterministic transforms run on your full dataset using Polars. Scales to millions of rows in milliseconds." },
              { n: "04", title: "Export & integrate", desc: "Download as CSV, JSON, or XML. Or push directly to Airtable, Notion, Salesforce, or HubSpot." },
            ].map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 0.08}>
                <SpotlightCard>
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "26px", display: "flex", gap: "18px", height: "100%", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = T.borderLight)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = T.border)}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: T.accent, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px", minWidth: "26px", paddingTop: "3px" }}>{n}</div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.3px" }}>{title}</div>
                      <div style={{ fontSize: "13px", color: T.text2, lineHeight: 1.65 }}>{desc}</div>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FIELD TYPES ────────────────────────────────────────────────────── */}
      <section id="field-types" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "44px" }}>
              <SectionLabel n="02" label="What it normalises" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
                12 field types, zero config
              </h2>
              <p style={{ color: T.text2, fontSize: "15px", maxWidth: "420px", margin: "0 auto" }}>
                Schema inferred automatically. You review, approve, and go.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {[
              ["name", "John Doe", T.accent],
              ["email", "user@domain.com", T.blue],
              ["phone", "(555) 123-4567", T.green],
              ["date", "2024-01-15", T.amber],
              ["currency", "50000.00", T.green],
              ["company", "Acme Corp LLC", T.accent],
              ["status", "active", T.blue],
              ["category", "Electronics", T.copper],
              ["number", "4.2", T.green],
              ["id", "SKU-001", T.text2],
              ["text", "hello world", T.text2],
              ["currency_code", "USD", T.amber],
            ].map(([type, example, color], i) => (
              <FadeIn key={type as string} delay={i * 0.04}>
                <div
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "9px", padding: "13px 15px", transition: "border-color 0.15s, transform 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.borderLight; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  <div style={{ fontSize: "10px", color: color as string, letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: 700, marginBottom: "5px" }}>{type}</div>
                  <div style={{ fontSize: "11px", color: T.text2, fontFamily: "'DM Mono', monospace" }}>{example}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIALS ────────────────────────────────────── */}
      <section style={{ padding: "80px 0", borderTop: `1px solid ${T.border}`, overflow: "hidden" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <SectionLabel n="03" label="What people are saving" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>
              Hours back every week.
            </h2>
          </div>
        </FadeIn>
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div className="animate-marquee" style={{ gap: "16px" }}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "22px 24px", minWidth: "300px", maxWidth: "320px", flexShrink: 0 }}>
                <p style={{ fontSize: "13px", color: T.text2, lineHeight: 1.65, marginBottom: "16px" }}>"{t.quote}"</p>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: T.text1 }}>{t.name}</div>
                  <div style={{ fontSize: "11px", color: T.text3, marginTop: "2px" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Fade edges */}
          <div style={{ position: "absolute", inset: "0 auto 0 0", width: "80px", background: `linear-gradient(to right, ${T.bg}, transparent)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: "0 0 0 auto", width: "80px", background: `linear-gradient(to left, ${T.bg}, transparent)`, pointerEvents: "none" }} />
        </div>
      </section>

      {/* ── WHY SMELT IS DIFFERENT (Trust section) ─────────────────────────── */}
      <section style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <SectionLabel n="04" label="Why Smelt" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
                Not another spreadsheet macro.
              </h2>
              <p style={{ color: T.text2, fontSize: "15px", maxWidth: "480px", margin: "0 auto" }}>
                Manual cleaning is slow, error-prone, and doesn't scale. Smelt handles the tedious parts so you can focus on actual work.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {[
              { icon: "⚡", title: "Sub-second on 50k rows", desc: "Polars vectorised executor — not pandas, not Python loops. Your data cleaned before your next coffee sip." },
              { icon: "🔒", title: "Your raw data stays yours", desc: "Only a 100-row sample goes to the AI for schema detection. Your full dataset never leaves the pipeline." },
              { icon: "🔁", title: "Reusable transform specs", desc: "Every clean produces a JSON spec you can save, share, and re-run. Build a library of cleaning recipes." },
              { icon: "📊", title: "Before/after quality score", desc: "4-dimension data quality scoring on every run. See exactly how much better your data got." },
              { icon: "🧩", title: "Push anywhere", desc: "CSV, JSON, XML export. Direct push to Airtable, Notion, Salesforce, or HubSpot." },
              { icon: "📝", title: "Natural language rules", desc: "Add custom instructions in plain English: 'Remove rows where status is deleted'. Smelt does the rest." },
            ].map(({ icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 0.07}>
                <SpotlightCard>
                  <div
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "24px", height: "100%", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.borderLight}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.border}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "12px" }}>{icon}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.2px" }}>{title}</div>
                    <div style={{ fontSize: "13px", color: T.text2, lineHeight: 1.65 }}>{desc}</div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }} className="dot-bg">
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <SectionLabel n="05" label="Pricing" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
                Start free. Upgrade when you need more.
              </h2>
              <p style={{ color: T.text2, fontSize: "15px", maxWidth: "400px", margin: "0 auto" }}>
                No long-term contracts. Cancel anytime. Your data is always exportable.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
            <PricingCard plan="Free" price="$0" desc="For individuals and small teams exploring clean data." features={["10,000 rows / month", "All 12 field types", "CSV, JSON, XML export", "Deduplication", "Full audit log", "No credit card required"]} cta="Start cleaning free" ctaHref="/app" />
            <PricingCard plan="Pro" price="$59" period="/ month" desc="For teams with serious data volume and integrations." features={["250,000 rows / month", "Everything in Free", "Airtable + Notion push", "Salesforce Bulk API", "HubSpot push", "REST API access", "Saved cleaning recipes"]} cta="Upgrade to Pro" ctaHref="/login" highlight />
            <PricingCard plan="Enterprise" price="Custom" desc="For high-volume workloads and compliance requirements." features={["Unlimited rows", "Everything in Pro", "SSO / SAML", "SLA + dedicated support", "On-prem deploy option", "Custom integrations"]} cta="Contact us" ctaHref="mailto:hello@smelt.fyi" />
          </div>

          {/* Social proof below pricing — commitment trigger */}
          <FadeIn>
            <div style={{ textAlign: "center", marginTop: "36px", display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap" }}>
              {["No lock-in", "Cancel anytime", "Data always yours", "GDPR friendly"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", color: T.text3 }}>
                  <span style={{ color: T.green, fontSize: "11px" }}>✓</span> {t}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA (loss aversion) ───────────────────────────────────────── */}
      <section style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "300px", background: "radial-gradient(ellipse, rgba(217,119,6,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <FadeIn>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: T.text3, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px", opacity: 0.6 }}>06 — Start now</p>
            <h2 style={{ fontSize: "clamp(36px, 5.5vw, 60px)", fontWeight: 800, letterSpacing: "-2.5px", margin: "0 0 18px", lineHeight: 1.05 }}>
              Every messy row is<br />
              <span className="text-gradient-amber">costing you time.</span>
            </h2>
            <p style={{ color: T.text2, fontSize: "17px", marginBottom: "40px", maxWidth: "440px", margin: "0 auto 40px", lineHeight: 1.6 }}>
              Drop your file right now. No signup. No setup. First clean is free — and takes 30 seconds.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={spring} style={{ display: "inline-block" }}>
              <Link href="/app" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "16px 36px", borderRadius: "10px", fontSize: "16px", fontWeight: 800, textDecoration: "none", letterSpacing: "-0.4px", boxShadow: "0 0 40px rgba(217,119,6,0.28), 0 4px 16px rgba(0,0,0,0.4)", display: "inline-block" }}>
                Drop your file →
              </Link>
            </motion.div>
            <p style={{ fontSize: "12px", color: T.text3, marginTop: "18px" }}>No account needed · Works on CSV, JSON, XML, TSV</p>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: T.bg, fontFamily: "'DM Mono', monospace" }}>S</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: T.text1 }}>Smelt</div>
            <div style={{ fontSize: "11px", color: T.text3 }}>Raw data in. Pure data out.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[{ label: "App", href: "/app" }, { label: "GitHub", href: "https://github.com/delboyy/smelt" }, { label: "Pricing", href: "#pricing" }, { label: "Twitter", href: "https://twitter.com/smeltfyi" }, { label: "Privacy", href: "/privacy" }].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: "13px", color: T.text3, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = T.text2}
              onMouseLeave={(e) => e.currentTarget.style.color = T.text3}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: "12px", color: T.text3 }}>© 2025 Smelt · smelt.fyi</div>
      </footer>
    </div>
  );
}
