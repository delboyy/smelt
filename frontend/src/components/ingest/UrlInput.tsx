"use client";

import { useState } from "react";
import { T } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

type UrlInputProps = {
  onFetch: (url: string) => void;
  loading?: boolean;
};

export function UrlInput({ onFetch, loading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onFetch(trimmed);
  };

  return (
    <>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="https://example.com/data.csv"
          style={{
            flex: 1,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: "7px",
            padding: "10px 14px",
            fontSize: "13px",
            color: T.text1,
            outline: "none",
            fontFamily: "'DM Mono', monospace",
          }}
          onFocus={(e) => (e.target.style.borderColor = T.accent)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />
        <Button primary onClick={handleSubmit} disabled={!url.trim() || loading}>
          {loading ? "Fetching…" : "Fetch →"}
        </Button>
      </div>
      <p style={{ fontSize: "11px", color: T.text3, marginTop: "8px" }}>
        Supports CSV, JSON, XML, TSV from any public URL (S3, GitHub raw, data.gov, etc.)
      </p>
    </>
  );
}
