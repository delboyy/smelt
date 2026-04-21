"""Notification helpers — Slack, email (future)."""
import os
import httpx
from typing import Optional


async def notify_slack(
    token: str,
    channel: str,
    filename: str,
    records_in: int,
    records_out: int,
    duplicates_removed: int,
    fields_normalized: int,
    job_id: str,
    quality_before: Optional[dict] = None,
    quality_after: Optional[dict] = None,
) -> bool:
    """Post a cleaning summary to a Slack channel. Returns True on success."""
    base_url = os.environ.get("APP_URL", "https://smelt.fyi")

    score_text = ""
    if quality_before and quality_after:
        score_text = f"\n📊 Quality: {quality_before.get('score', '?')}/100 → {quality_after.get('score', '?')}/100"

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*Smelt cleaned your data* ✅\n"
                    f"📁 `{filename}`\n"
                    f"📊 {records_in:,} → {records_out:,} rows\n"
                    f"🔁 {duplicates_removed} duplicates removed\n"
                    f"🔧 {fields_normalized} fields normalized"
                    f"{score_text}"
                ),
            },
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Results →"},
                    "url": f"{base_url}/app",
                    "style": "primary",
                }
            ],
        },
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"channel": channel, "blocks": blocks, "text": f"Smelt cleaned {filename}"},
            )
            data = resp.json()
            return data.get("ok", False)
    except Exception:
        return False
