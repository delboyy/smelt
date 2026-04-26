"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { T } from "@/lib/constants";
import { fetchRecipes, deleteRecipe, applyRecipe } from "@/lib/api";
import type { RecipeEntry } from "@/lib/api";

function FormatBadge({ format }: { format: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: T.accentBg,
        color: T.accent,
        border: `1px solid ${T.accentBorder}`,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {format || "—"}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function RecipeCard({
  recipe,
  token,
  onDeleted,
}: {
  recipe: RecipeEntry;
  token: string;
  onDeleted: (id: string) => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyJobId, setApplyJobId] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteRecipe(token, recipe.id);
      onDeleted(recipe.id);
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleApply = async () => {
    if (!applyJobId.trim()) return;
    setApplying(true);
    setApplyError(null);
    setApplyResult(null);
    try {
      const res = await applyRecipe(token, recipe.id, applyJobId.trim());
      const count = res.stats?.records_out ?? 0;
      setApplyResult(`Done — ${count.toLocaleString()} clean record${count !== 1 ? "s" : ""} ready`);
      setApplyJobId("");
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: "10px",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: T.text1,
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {recipe.name}
          </div>
          {recipe.description && (
            <div style={{ fontSize: "12px", color: T.text3, lineHeight: 1.5 }}>{recipe.description}</div>
          )}
        </div>
        <FormatBadge format={recipe.source_format} />
      </div>

      <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: T.text3 }}>
        <span style={{ fontFamily: "'DM Mono', monospace" }}>
          {recipe.field_count} field{recipe.field_count !== 1 ? "s" : ""}
        </span>
        <span>{formatDate(recipe.created_at)}</span>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => { setApplyOpen((v) => !v); setApplyError(null); setApplyResult(null); }}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: `1px solid ${T.accentBorder}`,
            background: T.accentBg,
            color: T.accent,
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Apply
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: `1px solid ${deleteConfirm ? T.redBorder : T.border}`,
            background: deleteConfirm ? T.redBg : "transparent",
            color: deleteConfirm ? T.red : T.text3,
            fontSize: "12px",
            fontWeight: deleteConfirm ? 700 : 400,
            cursor: deleting ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.15s",
          }}
          onBlur={() => setDeleteConfirm(false)}
        >
          {deleting ? "Deleting…" : deleteConfirm ? "Confirm delete?" : "Delete"}
        </button>
      </div>

      {applyOpen && (
        <div
          style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: "8px",
            padding: "14px",
          }}
        >
          <div style={{ fontSize: "11px", color: T.text3, marginBottom: "8px" }}>
            Enter a Job ID to apply this recipe to. Find Job IDs in{" "}
            <Link href="/app/history" style={{ color: T.accent, textDecoration: "none" }}>
              History
            </Link>
            .
          </div>
          <input
            type="text"
            value={applyJobId}
            onChange={(e) => setApplyJobId(e.target.value)}
            placeholder="Job ID (e.g. abc123…)"
            style={{
              width: "100%",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "6px",
              color: T.text1,
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              padding: "8px 10px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "8px",
            }}
            onFocus={(e) => { e.target.style.borderColor = T.accent; }}
            onBlur={(e) => { e.target.style.borderColor = T.border; }}
            onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
          />
          {applyError && (
            <div style={{ fontSize: "12px", color: T.red, marginBottom: "6px" }}>{applyError}</div>
          )}
          {applyResult && (
            <div
              style={{
                fontSize: "12px",
                color: T.green,
                background: T.greenBg,
                border: `1px solid ${T.greenBorder}`,
                borderRadius: "6px",
                padding: "8px 10px",
                marginBottom: "6px",
              }}
            >
              ✓ {applyResult}
            </div>
          )}
          <button
            onClick={handleApply}
            disabled={applying || !applyJobId.trim()}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              border: "none",
              background: applying || !applyJobId.trim()
                ? T.border
                : `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: applying || !applyJobId.trim() ? T.text3 : T.bg,
              fontSize: "12px",
              fontWeight: 700,
              cursor: applying || !applyJobId.trim() ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {applying ? "Applying…" : "Apply recipe"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sessionToken = (session as { accessToken?: string } | null)?.accessToken || undefined;

  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/app/recipes");
    }
  }, [status, router]);

  useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    fetchRecipes(sessionToken)
      .then((r) => setRecipes(r.recipes))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionToken]);

  const handleDeleted = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text1, fontFamily: "'DM Sans', sans-serif" }}>
      <Header />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 4px" }}>
              Recipes
            </h1>
            <p style={{ color: T.text3, fontSize: "13px", margin: 0 }}>
              {recipes.length} saved recipe{recipes.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/app"
            style={{
              padding: "8px 16px",
              borderRadius: "7px",
              background: `linear-gradient(135deg, ${T.accent}, ${T.copper})`,
              color: T.bg,
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            New smelt →
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0", color: T.text3, fontSize: "14px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: `2px solid ${T.border}`,
                borderTopColor: T.accent,
                margin: "0 auto 12px",
                animation: "smeltSpin 0.8s linear infinite",
              }}
            />
            Loading recipes…
          </div>
        )}

        {error && (
          <div
            style={{
              background: T.redBg,
              border: `1px solid ${T.redBorder}`,
              borderRadius: "8px",
              padding: "14px 16px",
              color: T.red,
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && recipes.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: T.text3,
              border: `1px dashed ${T.border}`,
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚗️</div>
            <p style={{ margin: "0 0 6px", fontSize: "15px", color: T.text2 }}>No recipes saved yet</p>
            <p style={{ margin: 0, fontSize: "13px", maxWidth: "320px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              After cleaning data, save the transform spec as a recipe from the Review step.
            </p>
            <Link
              href="/app"
              style={{
                display: "inline-block",
                marginTop: "20px",
                color: T.accent,
                textDecoration: "none",
                fontSize: "13px",
              }}
            >
              Start cleaning →
            </Link>
          </div>
        )}

        {!loading && recipes.length > 0 && sessionToken && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: "14px",
            }}
          >
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                token={sessionToken}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
