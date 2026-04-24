"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useSpring, useTransform } from "framer-motion";
import { T } from "@/lib/constants";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 260, damping: 28 };
const softSpring = { type: "spring" as const, stiffness: 80, damping: 18, mass: 0.8 };
const MONO = "'DM Mono', 'JetBrains Mono', monospace";
const SANS = "'DM Sans', system-ui, sans-serif";

/* ── Animated counter ─────────────────────────────────────────────────────── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const springVal = useSpring(0, { stiffness: 55, damping: 14, mass: 0.9 });
  const display = useTransform(springVal, (v) => Math.round(v).toString());
  useEffect(() => { if (isInView) springVal.set(value); }, [isInView, springVal, value]);
  return <span ref={ref}><motion.span>{display}</motion.span>{suffix}</span>;
}

/* ── Scroll-triggered fade-in with blur ───────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
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

/* ── Spotlight card ───────────────────────────────────────────────────────── */
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
        style={{ background: "radial-gradient(500px circle at var(--mx) var(--my), rgba(217,119,6,0.06), transparent 70%)" }}
      />
      {children}
    </div>
  );
}

/* ── Hero compact panels ──────────────────────────────────────────────────── */
const HERO_DIRTY = [
  "john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15",
  "  Jane Smith  ,jane@widgets,(555) 567-8901,01-20-23",
  "john doe,john@acmecorp.com,555-1234,15/01/2023",
  "BOB WILSON,BOB@ACMECORP.COM,5559876543,2023.02.01",
];
const HERO_CLEAN = [
  "John Doe,john@acmecorp.com,(555) 123-4567,2023-01-15",
  "Jane Smith,jane@widgets.io,(555) 567-8901,2023-01-20",
  "Bob Wilson,bob@acmecorp.com,(555) 987-6543,2023-02-01",
];

function HeroPanel({ dirty }: { dirty: boolean }) {
  const color = dirty ? T.red : T.green;
  const borderColor = dirty ? T.redBorder : T.greenBorder;
  const headerBg = dirty ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.04)";
  const filename = dirty ? "contacts_raw.csv" : "contacts_clean.csv";
  const badge = dirty ? "DIRTY" : "CLEAN";
  const rows = dirty ? HERO_DIRTY : HERO_CLEAN;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${borderColor}`,
      borderLeft: `2px solid ${dirty ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`,
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "9px 14px", borderBottom: `1px solid ${borderColor}`,
        background: headerBg,
      }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { c: "#ff5f57", op: dirty ? 0.9 : 0.25 },
            { c: "#febc2e", op: 0.25 },
            { c: "#28c840", op: dirty ? 0.25 : 0.9 },
          ].map(({ c, op }) => (
            <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, opacity: op }} />
          ))}
        </div>
        <span style={{ fontSize: "11px", color: T.text3, fontFamily: MONO, marginLeft: "4px", flex: 1 }}>{filename}</span>
        <span style={{ fontSize: "9px", color, background: dirty ? T.redBg : T.greenBg, border: `1px solid ${borderColor}`, padding: "2px 7px", borderRadius: "4px", fontWeight: 700, letterSpacing: "0.5px", fontFamily: MONO }}>{badge}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: "10px", padding: "12px 14px", lineHeight: 1.85 }}>
        <div style={{ color: T.text3, marginBottom: "2px" }}>full_name,email,phone,date</div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", color: T.text2 }}>
            <span style={{ color, opacity: 0.6, flexShrink: 0 }}>{dirty ? "!" : "✓"}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row}</span>
          </div>
        ))}
        <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color, fontSize: "9px", opacity: 0.5 }}>{dirty ? "⊘" : "✓"}</span>
          <span style={{ color: T.text3, fontSize: "9px" }}>
            {dirty ? "1 duplicate detected" : "1 duplicate removed · 3 rows clean"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Section label ────────────────────────────────────────────────────────── */
function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", justifyContent: "center" }}>
      <span style={{ fontSize: "10px", fontFamily: MONO, color: T.text3, letterSpacing: "0.15em", opacity: 0.5 }}>{n}</span>
      <span style={{ fontSize: "11px", color: T.accent, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ── Nav link ─────────────────────────────────────────────────────────────── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: T.text2, fontSize: "14px", textDecoration: "none", transition: "color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = T.text1)}
      onMouseLeave={(e) => (e.currentTarget.style.color = T.text2)}>
      {children}
    </a>
  );
}

/* ── Testimonials data ────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { quote: "I was handed a 6,000-row client CSV with five different phone formats and inconsistent headers. Smelt cleaned it in under a minute. That's three hours I'd have spent in Excel.", name: "Jamie R.", role: "Data Analyst", company: "E-commerce agency" },
  { quote: "40,000 rows of legacy CRM data — duplicates, broken postcodes, four date locales. Smelt handled the whole thing in under 2 minutes. Our last migration took a contractor 3 days.", name: "Priya S.", role: "Revenue Ops Lead", company: "B2B SaaS, Series B" },
  { quote: "Date format chaos across 7 regional offices. I set up one Smelt transform spec and ran it across every file in an afternoon. First consistent data we'd had in two years.", name: "Tom H.", role: "BI Manager", company: "Logistics firm" },
  { quote: "Product feed — 1,200 rows, broken category names, missing SKUs. Zero manual touches. Exported straight to our CMS. I don't know what I was doing before.", name: "Cleo M.", role: "E-commerce Ops", company: "DTC fashion brand" },
  { quote: "Invoice data from 14 suppliers, 14 different date formats. I'd been building a normalisation script for 3 months. Smelt handled all 14 correctly on the first run.", name: "Ben O.", role: "Data Engineer", company: "Fintech startup" },
  { quote: "Monthly reporting reconciliation used to take the whole team a full day. Now I run it through Smelt. 90 seconds. I've stopped explaining where the day went.", name: "Alicia T.", role: "Head of Analytics", company: "Series A SaaS" },
];

/* ── Pricing card ─────────────────────────────────────────────────────────── */
function PricingCard({ plan, price, priceSub, desc, features, cta, ctaHref, highlight, muted }: {
  plan: string; price: string; priceSub?: string; desc: string;
  features: string[]; cta: string; ctaHref: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <motion.div
      whileHover={!muted ? { y: -3 } : {}}
      transition={softSpring}
      style={{
        background: highlight
          ? `linear-gradient(160deg, rgba(217,119,6,0.09) 0%, rgba(194,133,90,0.04) 50%, ${T.surface} 100%)`
          : muted ? "transparent" : T.surface,
        border: `1px solid ${highlight ? T.accentBorder : T.border}`,
        borderRadius: "14px",
        padding: highlight ? "36px 28px 28px" : "28px",
        flex: highlight ? "1.4" : muted ? "0.85" : "1",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        boxShadow: highlight ? "0 0 40px rgba(217,119,6,0.1), 0 4px 16px rgba(0,0,0,0.3)" : "none",
        opacity: muted ? 0.85 : 1,
      }}
    >
      {highlight && (
        <div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)", background: `linear-gradient(90deg, ${T.accent}, ${T.copper})`, color: T.bg, fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", padding: "3px 14px", borderRadius: "0 0 8px 8px", whiteSpace: "nowrap", fontFamily: MONO }}>
          MOST POPULAR
        </div>
      )}
      <div>
        <div style={{ fontSize: "10px", color: T.text3, letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px", fontFamily: MONO }}>{plan}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ fontSize: highlight ? "44px" : "36px", fontWeight: 800, letterSpacing: "-2px", color: highlight ? T.accent : T.text1, fontFamily: MONO, lineHeight: 1 }}>{price}</span>
          {priceSub && <span style={{ fontSize: "13px", color: T.text3 }}>{priceSub}</span>}
        </div>
        <div style={{ fontSize: "13px", color: muted ? T.text3 : T.text2, marginTop: "10px", lineHeight: 1.6 }}>{desc}</div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "9px", fontSize: "13px", color: muted ? T.text3 : T.text2 }}>
            <span style={{ color: highlight ? T.accent : T.green, marginTop: "2px", flexShrink: 0, fontSize: "11px" }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      {muted ? (
        <a href={ctaHref} style={{ color: T.accent, fontSize: "13px", fontWeight: 600, textDecoration: "none", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
          {cta} →
        </a>
      ) : (
        <a href={ctaHref} style={{
          display: "block", textAlign: "center", padding: "11px 20px", borderRadius: "8px",
          fontSize: "13px", fontWeight: 700, textDecoration: "none",
          background: highlight ? `linear-gradient(135deg, ${T.accent}, ${T.copper})` : "transparent",
          color: highlight ? T.bg : T.text1,
          border: highlight ? "none" : `1px solid ${T.border}`,
          boxShadow: highlight ? "0 0 20px rgba(217,119,6,0.2)" : "none",
          transition: "opacity 0.15s, border-color 0.15s",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; if (!highlight) (e.currentTarget as HTMLElement).style.borderColor = T.borderLight; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; if (!highlight) (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
          {cta}
        </a>
      )}
    </motion.div>
  );
}

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
    return () => { window.removeEventListener("scroll", handler); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: SANS }}>

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav aria-label="Site navigation" className="section-pad" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "60px",
        borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
        background: scrolled ? "rgba(9,9,11,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        position: "sticky", top: 0, zIndex: 50,
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <a href="/" aria-label="Smelt home" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: T.text1 }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: T.bg, fontFamily: MONO }}>S</div>
          <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.4px" }}>Smelt</span>
        </a>
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#why-smelt">Why Smelt</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
          <NavLink href="https://github.com/delboyy/smelt">GitHub</NavLink>
          <a href="/login" style={{ color: T.text2, fontSize: "14px", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.text1)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.text2)}>Log in</a>
          <Link href="/app" aria-label="Start cleaning data free" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            Start free
          </Link>
        </div>
        <Link href="/app" className="nav-mobile-cta" style={{ display: "none", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "7px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
          Free →
        </Link>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="hero-section dot-bg" style={{ position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", bottom: 0, left: "10%", width: "600px", height: "360px", pointerEvents: "none", background: "radial-gradient(ellipse at center bottom, rgba(217,119,6,0.10) 0%, transparent 68%)", zIndex: 0 }} />
        <div aria-hidden style={{ position: "absolute", bottom: 0, left: "25%", width: "2px", height: "260px", pointerEvents: "none", background: "linear-gradient(to top, rgba(217,119,6,0.3), transparent)", zIndex: 0 }} />

        <div className="hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "88px 48px 80px", display: "grid", gridTemplateColumns: "55fr 45fr", gap: "64px", alignItems: "center" }}>

          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: "99px", padding: "5px 14px 5px 10px", marginBottom: "28px" }}
            >
              <span className="animate-pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.accent, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: T.accent, fontWeight: 600 }}>Used by 2,400+ analysts this month</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: EASE_OUT }}
              style={{ fontSize: "clamp(40px, 5.5vw, 64px)", fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.05, margin: "0 0 18px", color: T.text1 }}
            >
              Your data is a mess.<br />
              <span style={{ color: T.accent }}>Fix it in 30 seconds.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: EASE_OUT }}
              style={{ fontSize: "17px", color: T.text2, lineHeight: 1.7, maxWidth: "460px", margin: "0 0 10px" }}
            >
              Paste a CSV, JSON, or XML. Smelt fixes formatting, removes duplicates, and hands you a clean export. No scripts. No Stack Overflow.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              style={{ fontSize: "13px", color: T.text3, marginBottom: "32px", fontFamily: MONO }}
            >
              80% of analyst time goes to cleaning data. That ends here.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.42 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring} style={{ display: "inline-block" }}>
                <Link href="/app" aria-label="Start cleaning data for free" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "14px 32px", borderRadius: "9px", fontSize: "15px", fontWeight: 700, textDecoration: "none", letterSpacing: "-0.3px", boxShadow: "0 0 30px rgba(217,119,6,0.25), 0 4px 16px rgba(0,0,0,0.3)", display: "inline-block" }}>
                  Clean My Data Free
                </Link>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58 }}
              style={{ fontSize: "12px", color: T.text3, marginTop: "14px", fontFamily: MONO }}
            >
              No signup required · First 5 files free · CSV, JSON, XML, TSV
            </motion.p>
          </div>

          {/* Right: hero panels */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: EASE_OUT }}
            className="hero-panels"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <HeroPanel dirty={true} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 4px" }}>
              <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${T.accentBorder})` }} />
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: T.bg, fontFamily: MONO, boxShadow: "0 0 16px rgba(217,119,6,0.25)", flexShrink: 0 }}>S</div>
              <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${T.accentBorder})` }} />
            </div>
            <HeroPanel dirty={false} />
            <div style={{ textAlign: "right", marginTop: "2px" }}>
              <Link href="/app" style={{ fontSize: "12px", color: T.text3, textDecoration: "none", fontFamily: MONO, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = T.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.color = T.text3)}>
                try with your own data →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="stat-strip-wrap section-pad" style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 48px 80px" }}>
          <div className="stat-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: T.border, border: `1px solid ${T.border}`, borderRadius: "14px", overflow: "hidden" }}>
            {[
              { value: 80, suffix: "%", label: "of analyst time spent cleaning data, not analysing it" },
              { value: 30, suffix: "s", label: "average clean time for a 10,000-row file" },
              { value: 0, suffix: " rows", label: "raw records ever sent to the AI model" },
              { value: 200, suffix: " hrs", label: "reclaimed per analyst per year" },
            ].map(({ value, suffix, label }) => (
              <div key={label} style={{ background: T.surface, padding: "24px 20px", textAlign: "left" }}>
                <div style={{ fontSize: "clamp(22px, 2.8vw, 32px)", fontWeight: 800, color: T.accent, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: MONO }}>
                  <AnimatedCounter value={value} suffix={suffix} />
                </div>
                <div style={{ fontSize: "11px", color: T.text3, marginTop: "7px", lineHeight: 1.45, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="section-pad" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <SectionLabel n="01" label="How it works" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
                Four steps. No learning curve.
              </h2>
              <p style={{ color: T.text2, fontSize: "15px", maxWidth: "400px", margin: "0 auto" }}>
                No configuration. No field mapping. Drop your file and go.
              </p>
            </div>
          </FadeIn>

          {/* Editorial timeline */}
          <div style={{ position: "relative" }}>
            <div aria-hidden style={{ position: "absolute", left: "19px", top: "20px", bottom: "20px", width: "2px", background: `linear-gradient(to bottom, ${T.accent}, rgba(217,119,6,0.08))`, borderRadius: "1px" }} />

            {[
              { n: "01", title: "Drop your data", desc: "Paste raw data or upload a file — CSV, JSON, XML, or TSV, up to 50MB. Nothing is stored.", detail: ".csv · .json · .xml · .tsv · .xlsx" },
              { n: "02", title: "Smelt reads the damage", desc: "The AI scans a 100-row sample for duplicates, broken dates, inconsistent formats, and null patterns. Your full dataset never leaves the pipeline.", detail: "12 field types · schema auto-detected" },
              { n: "03", title: "Choose your fixes", desc: "Approve the suggested changes or add plain-English rules: \"standardise dates to ISO 8601\" or \"merge these two address columns.\"", detail: "Natural language · reusable JSON spec" },
              { n: "04", title: "Export clean data", desc: "Download as CSV, JSON, or XML, or push directly to Airtable or Notion. Your transform spec is saved to rerun on the next batch.", detail: "CSV · JSON · XML · Airtable · Notion" },
            ].map(({ n, title, desc, detail }, i) => (
              <FadeIn key={n} delay={i * 0.07}>
                <div style={{ display: "flex", gap: "28px", marginBottom: i < 3 ? "40px" : "0" }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.surface, border: `2px solid ${T.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: T.accent, fontFamily: MONO, letterSpacing: "0.05em", position: "relative", zIndex: 1 }}>{n}</div>
                  </div>
                  <div style={{ paddingTop: "8px" }}>
                    <div style={{ fontSize: "clamp(16px, 2vw, 20px)", fontWeight: 700, letterSpacing: "-0.4px", marginBottom: "8px", color: T.text1 }}>{title}</div>
                    <div style={{ fontSize: "14px", color: T.text2, lineHeight: 1.75, marginBottom: "10px" }}>{desc}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: "6px", padding: "3px 10px" }}>
                      <span style={{ fontSize: "10px", fontFamily: MONO, color: T.accent, letterSpacing: "0.04em" }}>{detail}</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", borderTop: `1px solid ${T.border}`, overflow: "hidden" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <SectionLabel n="02" label="What analysts are saving" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>Hours back every week.</h2>
            <p style={{ color: T.text2, fontSize: "14px", marginTop: "10px" }}>
              Average: <span style={{ color: T.accent, fontWeight: 700, fontFamily: MONO }}>3.2 hrs</span> saved per analyst per week
            </p>
          </div>
        </FadeIn>
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div className="animate-marquee" style={{ gap: "14px" }}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="testimonial-card" style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: "12px", padding: "22px 24px",
                minWidth: i % 2 === 0 ? "300px" : "340px",
                maxWidth: i % 2 === 0 ? "300px" : "340px",
                flexShrink: 0,
              }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: "6px", padding: "3px 10px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "10px", fontFamily: MONO, color: T.accent, fontWeight: 700 }}>{t.role}</span>
                  <span style={{ fontSize: "10px", color: T.border }}>·</span>
                  <span style={{ fontSize: "10px", color: T.text3 }}>{t.company}</span>
                </div>
                <div style={{ fontSize: "40px", lineHeight: 1, color: T.accentBorder, marginBottom: "-8px", marginLeft: "-3px", userSelect: "none", fontFamily: SANS }}>"</div>
                <p style={{ fontSize: "13px", color: T.text2, lineHeight: 1.7, marginBottom: "16px" }}>{t.quote}</p>
                <div style={{ fontSize: "12px", fontWeight: 700, color: T.text1, fontFamily: MONO }}>— {t.name}</div>
              </div>
            ))}
          </div>
          <div aria-hidden style={{ position: "absolute", inset: "0 auto 0 0", width: "120px", background: `linear-gradient(to right, ${T.bg} 20%, transparent)`, pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", inset: "0 0 0 auto", width: "120px", background: `linear-gradient(to left, ${T.bg} 20%, transparent)`, pointerEvents: "none" }} />
        </div>
      </section>

      {/* ── WHY SMELT — 3 differentiators ──────────────────────────────────── */}
      <section id="why-smelt" className="section-pad" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <SectionLabel n="03" label="Why Smelt" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>
                Built for people who care about the details.
              </h2>
            </div>
          </FadeIn>
          <div className="why-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {[
              { anchor: "< 1s", title: "Fast because it has to be", desc: "Smelt runs on Polars, a DataFrame engine written in Rust. A 50,000-row file processes in under a second — not because we cached a demo, but because the underlying tool is genuinely that fast. When you're iterating on messy data at 4pm on a deadline, that difference is felt." },
              { anchor: "100", title: "Your data doesn't leave your control", desc: "Smelt sends only a 100-row sample to the AI model to infer structure. The rest of your file is processed on our servers and discarded after export. No training on your data. No retention. Nothing you wouldn't want your compliance team to see." },
              { anchor: "{ }", title: "One clean job, infinite reuse", desc: "Every transform Smelt performs is saved as a JSON specification you own and can export. Rerun the same logic on next month's extract, hand it to a colleague, or version-control it alongside your pipeline. The work compounds." },
            ].map(({ anchor, title, desc }, i) => (
              <FadeIn key={title} delay={i * 0.08}>
                <SpotlightCard>
                  <div
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "14px", padding: "32px", height: "100%", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.borderLight}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = T.border}
                  >
                    <div style={{ fontSize: "28px", fontWeight: 800, color: T.accentDim, fontFamily: MONO, letterSpacing: "-2px", marginBottom: "18px", opacity: 0.7, lineHeight: 1 }}>{anchor}</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", letterSpacing: "-0.3px" }}>{title}</div>
                    <div style={{ fontSize: "13px", color: T.text2, lineHeight: 1.75 }}>{desc}</div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="section-pad dot-bg" style={{ padding: "80px 48px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <SectionLabel n="04" label="Pricing" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px", margin: "0 0 16px" }}>
                One analyst hour costs more than a month of Pro.
              </h2>
              <div style={{ display: "inline-grid", gridTemplateColumns: "auto auto", gap: "4px 24px", alignItems: "baseline", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "12px 20px" }}>
                <span style={{ fontSize: "12px", color: T.text3 }}>Manual cleaning cost</span>
                <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: MONO, color: T.red }}>~$23/hr × 4 hrs/wk</span>
                <span style={{ fontSize: "12px", color: T.text3 }}>Smelt Pro</span>
                <span style={{ fontSize: "14px", fontWeight: 800, fontFamily: MONO, color: T.accent }}>$59 / month flat</span>
              </div>
            </div>
          </FadeIn>

          <div className="pricing-flex" style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
            <PricingCard plan="Free" price="$0" desc="For analysts who want to see if it actually works before committing. It does." features={["5 cleaning jobs / month", "Files up to 10 MB", "CSV and JSON export", "Deduplication", "Full audit log", "No credit card"]} cta="Start cleaning free" ctaHref="/app" />
            <PricingCard plan="Pro" price="$59" priceSub="/ month" desc="For anyone who handles data more than twice a week. This pays for itself on the first job." features={["Unlimited cleaning jobs", "Files up to 50 MB", "All export formats", "Airtable + Notion push", "REST API access", "Saved transform specs", "Full cleaning history"]} cta="Upgrade to Pro" ctaHref="/login" highlight />
            <PricingCard plan="Enterprise" price="Custom" desc="Volume limits, team seats, SSO, and private deployment if your compliance team needs it." features={["Unlimited everything", "Team seats + SSO / SAML", "Dedicated support + SLA", "On-prem deploy option", "Custom integrations"]} cta="Talk to us" ctaHref="mailto:hello@smelt.fyi" muted />
          </div>

          <FadeIn>
            <div style={{ textAlign: "center", marginTop: "32px", display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap" }}>
              {["No lock-in", "Cancel anytime", "Data always yours", "GDPR friendly"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", color: T.text3 }}>
                  <span style={{ color: T.green, fontSize: "11px" }}>✓</span> {t}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="section-pad" style={{ padding: "100px 48px", borderTop: `1px solid ${T.border}`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "300px", background: "radial-gradient(ellipse, rgba(217,119,6,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <FadeIn>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "11px", fontFamily: MONO, color: T.text3, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "20px", opacity: 0.5 }}>05 — Stop wasting time</p>
            <h2 style={{ fontSize: "clamp(34px, 5.5vw, 58px)", fontWeight: 800, letterSpacing: "-2.5px", margin: "0 0 18px", lineHeight: 1.05 }}>
              200 hours of your year are going<br />
              <span className="text-gradient-amber">to data cleaning.</span>
            </h2>
            <p style={{ color: T.text2, fontSize: "16px", maxWidth: "480px", margin: "0 auto 10px", lineHeight: 1.7 }}>
              The 80% figure isn't a vendor stat — it's from IBM, IDC, and a decade of analyst surveys. Eight out of every ten hours you spend touching data is prep work, not analysis.
            </p>
            <p style={{ color: T.text3, fontSize: "14px", maxWidth: "400px", margin: "0 auto 36px", lineHeight: 1.6 }}>
              First 5 jobs are free. No account required. The file you're staring at right now is a good place to start.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={spring} style={{ display: "inline-block" }}>
              <Link href="/app" aria-label="Start cleaning your data free" style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, color: T.bg, padding: "16px 36px", borderRadius: "10px", fontSize: "16px", fontWeight: 800, textDecoration: "none", letterSpacing: "-0.4px", boxShadow: "0 0 40px rgba(217,119,6,0.28), 0 4px 16px rgba(0,0,0,0.4)", display: "inline-block" }}>
                Clean My First File — It's Free
              </Link>
            </motion.div>
            <p style={{ fontSize: "12px", color: T.text3, marginTop: "18px", fontFamily: MONO }}>
              Joins 2,400+ analysts already cleaning in seconds, not hours
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="footer-flex section-pad" style={{ borderTop: `1px solid ${T.border}`, padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: T.bg, fontFamily: MONO }}>S</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: T.text1 }}>Smelt</div>
            <div style={{ fontSize: "11px", color: T.text3, fontFamily: MONO }}>Raw data in. Pure data out.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[{ label: "App", href: "/app" }, { label: "GitHub", href: "https://github.com/delboyy/smelt" }, { label: "Pricing", href: "#pricing" }, { label: "Twitter", href: "https://twitter.com/smeltfyi" }, { label: "Privacy", href: "/privacy" }].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: "13px", color: T.text3, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.text2)}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.text3)}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: "12px", color: T.text3, fontFamily: MONO }}>© 2025 Smelt · smelt.fyi</div>
      </footer>
    </div>
  );
}
