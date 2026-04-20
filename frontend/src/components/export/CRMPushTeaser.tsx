"use client";

import { T } from "@/lib/constants";

type CRMPushTeaserProps = {
  exportFormat: string;
};

export function CRMPushTeaser({ exportFormat }: CRMPushTeaserProps) {
  return (
    <div
      style={{
        marginTop: "28px",
        borderRadius: "10px",
        border: `1px solid ${T.accentBorder}`,
        background: T.accentBg,
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, color: T.accent, marginBottom: "6px" }}>
        Push to CRM
      </div>
      <p
        style={{
          fontSize: "13px",
          color: T.text2,
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        Send clean data directly to Salesforce, HubSpot, or Airtable. Coming in Smelt Pro.
      </p>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          color: T.text3,
          background: T.surface,
          borderRadius: "8px",
          padding: "14px",
          border: `1px solid ${T.border}`,
          lineHeight: 1.7,
        }}
      >
        {`POST https://api.smelt.fyi/v1/clean
Content-Type: application/json
Authorization: Bearer sk_live_...

{
  "data": "<your_raw_data>",
  "output": "${exportFormat.toLowerCase()}",
  "push_to": "salesforce",
  "webhook": "https://your-app.com/callback"
}`}
      </div>
    </div>
  );
}
