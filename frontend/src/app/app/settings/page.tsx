"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { T } from "@/lib/constants";
import { fetchApiKeys, createApiKey, revokeApiKey, fetchSlackStatus, connectSlack, disconnectSlack } from "@/lib/api";
import type { ApiKeyEntry, SlackStatus } from "@/lib/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        padding: "4px 10px",
        borderRadius: "5px",
        border: `1px solid ${T.border}`,
        background: "transparent",
        color: copied ? T.green : T.text2,
        fontSize: "11px",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        transition: "color 0.2s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Get JWT token from session
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/app/settings");
    if (status === "authenticated" && token) {
      setLoading(true);
      Promise.all([
        fetchApiKeys(token).then(setKeys),
        fetchSlackStatus(token).then(setSlackStatus).catch(() => {}),
      ])
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [status, token, router]);

  const handleCreate = async () => {
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createApiKey(token, newKeyName || "Default");
      setNewKeyValue(created.key);
      setNewKeyName("");
      // Refresh list
      const updated = await fetchApiKeys(token);
      setKeys(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!token) return;
    try {
      await revokeApiKey(token, id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif" }}>
        <Header />
        <div style={{ textAlign: "center", padding: "80px 0", color: T.text3 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif" }}>
      <Header />

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
            Settings
          </h1>
          <p style={{ color: T.text3, fontSize: "13px", margin: 0 }}>
            Manage your account and API access
          </p>
        </div>

        {/* Account info */}
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: T.text2, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Account
          </h2>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: T.text1 }}>{session?.user?.name}</div>
                <div style={{ fontSize: "12px", color: T.text3, marginTop: "2px" }}>{session?.user?.email}</div>
              </div>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: T.accentBg,
                  color: T.accent,
                  border: `1px solid ${T.accentBorder}`,
                }}
              >
                Free
              </span>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: T.text2, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Integrations
          </h2>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Slack logo */}
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#4A154B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                💬
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: T.text1 }}>Slack</div>
                <div style={{ fontSize: "12px", color: T.text3 }}>
                  {slackStatus?.connected
                    ? `Connected · posting to #${slackStatus.channel ?? "general"}`
                    : "Get notified when cleaning completes"}
                </div>
              </div>
            </div>
            {slackStatus?.connected ? (
              <button
                onClick={async () => {
                  await disconnectSlack(token);
                  setSlackStatus({ connected: false, channel: null });
                }}
                style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "transparent", color: T.text2, fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const { auth_url } = await connectSlack(token);
                    window.open(auth_url, "_blank");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Slack not configured");
                  }
                }}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: "#4A154B", color: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
              >
                Connect Slack
              </button>
            )}
          </div>
        </section>

        {/* API Keys */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: T.text2, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              API Keys
            </h2>
            <a
              href="https://smelt.fyi/docs"
              style={{ fontSize: "12px", color: T.accent, textDecoration: "none" }}
            >
              API docs →
            </a>
          </div>

          <p style={{ fontSize: "13px", color: T.text3, margin: "0 0 16px" }}>
            Use API keys to call Smelt programmatically. Keys are only shown once — save them securely.
          </p>

          {error && (
            <div
              style={{
                background: T.redBg,
                border: `1px solid ${T.redBorder}`,
                borderRadius: "7px",
                padding: "10px 14px",
                fontSize: "13px",
                color: T.red,
                marginBottom: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* New key revealed */}
          {newKeyValue && (
            <div
              style={{
                background: T.greenBg,
                border: `1px solid ${T.greenBorder}`,
                borderRadius: "8px",
                padding: "14px 16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "12px", color: T.green, fontWeight: 600, marginBottom: "8px" }}>
                ✓ Key created — copy it now, it won&apos;t be shown again
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <code
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    color: T.text1,
                    fontFamily: "'DM Mono', monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {newKeyValue}
                </code>
                <CopyButton text={newKeyValue} />
              </div>
              <button
                onClick={() => setNewKeyValue(null)}
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                  color: T.text3,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                I&apos;ve saved it — dismiss
              </button>
            </div>
          )}

          {/* Create form */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              style={{
                flex: 1,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "7px",
                padding: "9px 12px",
                fontSize: "13px",
                color: T.text1,
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                padding: "9px 16px",
                borderRadius: "7px",
                border: "none",
                background: creating ? T.accentBg : `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
                color: creating ? T.accent : T.bg,
                fontSize: "13px",
                fontWeight: 700,
                cursor: creating ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {creating ? "Creating…" : "Generate key"}
            </button>
          </div>

          {/* Key list */}
          {loading ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.text3, fontSize: "13px" }}>
              Loading keys…
            </div>
          ) : keys.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                border: `1px dashed ${T.border}`,
                borderRadius: "8px",
                color: T.text3,
                fontSize: "13px",
              }}
            >
              No API keys yet
            </div>
          ) : (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "10px", overflow: "hidden" }}>
              {keys.map((key, i) => (
                <div
                  key={key.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: i < keys.length - 1 ? `1px solid ${T.border}` : "none",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: T.text1 }}>{key.name}</div>
                    <div style={{ fontSize: "11px", color: T.text3, marginTop: "2px" }}>
                      Created {formatDate(key.created_at)}
                      {key.last_used && ` · Last used ${formatDate(key.last_used)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code
                      style={{
                        fontSize: "11px",
                        color: T.text3,
                        fontFamily: "'DM Mono', monospace",
                        background: T.bg,
                        padding: "3px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      sk_live_••••••••
                    </code>
                    <button
                      onClick={() => handleRevoke(key.id)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "5px",
                        border: `1px solid ${T.redBorder}`,
                        background: "transparent",
                        color: T.red,
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: "11px", color: T.text3, marginTop: "12px" }}>
            API access requires a Pro plan. Keys are hashed — we can&apos;t recover lost keys.
          </p>
        </section>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: `1px solid ${T.border}` }}>
          <Link href="/app" style={{ fontSize: "13px", color: T.text3, textDecoration: "none" }}>
            ← Back to app
          </Link>
        </div>
      </div>
    </div>
  );
}
