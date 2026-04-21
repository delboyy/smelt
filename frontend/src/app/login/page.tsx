"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/constants";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const res = await fetch(`${API_URL}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.detail || "Registration failed");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: "7px",
    padding: "10px 12px",
    fontSize: "14px",
    color: T.text1,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text1,
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 800,
              color: T.bg,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            S
          </div>
          <span style={{ fontSize: "18px", fontWeight: 700, color: T.text1, letterSpacing: "-0.3px" }}>
            Smelt
          </span>
        </div>
      </Link>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ color: T.text2, fontSize: "13px", margin: "0 0 24px" }}>
          {mode === "login"
            ? "Sign in to your Smelt account."
            : "Start cleaning data for free. No credit card required."}
        </p>

        {error && (
          <div
            style={{
              background: T.redBg,
              border: `1px solid ${T.redBorder}`,
              borderRadius: "7px",
              padding: "10px 12px",
              fontSize: "13px",
              color: T.red,
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <div>
              <label style={{ fontSize: "12px", color: T.text2, display: "block", marginBottom: "6px" }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: "12px", color: T.text2, display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: T.text2, display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "7px",
              border: "none",
              background: loading
                ? T.accentBg
                : `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: loading ? T.accent : T.bg,
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: "4px",
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* Google OAuth — shown only if configured */}
        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "16px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <span style={{ fontSize: "11px", color: T.text3 }}>or</span>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
            </div>
            <button
              onClick={() => signIn("google", { callbackUrl })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "7px",
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.text1,
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Continue with Google
            </button>
          </>
        )}

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: T.text3 }}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.accent,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  padding: 0,
                }}
              >
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.accent,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  padding: 0,
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: "24px", fontSize: "12px", color: T.text3, textAlign: "center" }}>
        Or{" "}
        <Link href="/app" style={{ color: T.accent, textDecoration: "none" }}>
          continue without an account →
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
