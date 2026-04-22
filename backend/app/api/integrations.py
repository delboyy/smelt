"""Integration endpoints — Slack OAuth, Google Drive (Phase 3)."""
import os
import secrets
import httpx
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from app.api.auth import _get_current_user_id

router = APIRouter()

# ── Slack ────────────────────────────────────────────────────────────────────

SLACK_CLIENT_ID = os.environ.get("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.environ.get("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.environ.get("SLACK_REDIRECT_URI", "https://smelt-0vgv.onrender.com/api/v1/integrations/slack/callback")

# In-memory store for Slack tokens (per user_id). In prod, store in DB.
_slack_tokens: dict[str, dict] = {}  # user_id → {token, channel_id, channel_name}

# CSRF state store: state → user_id (short-lived, cleared after use)
_oauth_states: dict[str, str] = {}


@router.get("/integrations/slack/connect")
async def slack_connect(authorization: str | None = Header(default=None)):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    if not SLACK_CLIENT_ID:
        raise HTTPException(503, "Slack integration not configured — set SLACK_CLIENT_ID env var")

    scopes = "chat:write,channels:read,groups:read"
    state = secrets.token_hex(16)
    _oauth_states[state] = user_id
    url = (
        f"https://slack.com/oauth/v2/authorize"
        f"?client_id={SLACK_CLIENT_ID}"
        f"&scope={scopes}"
        f"&redirect_uri={SLACK_REDIRECT_URI}"
        f"&state={state}"
    )
    return JSONResponse(content={"auth_url": url})


@router.get("/integrations/slack/callback")
async def slack_callback(code: str, state: str):
    if not SLACK_CLIENT_ID or not SLACK_CLIENT_SECRET:
        raise HTTPException(503, "Slack not configured")

    user_id = _oauth_states.pop(state, None)
    if not user_id:
        raise HTTPException(400, "Invalid or expired OAuth state — please try connecting again")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": SLACK_CLIENT_ID,
                "client_secret": SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": SLACK_REDIRECT_URI,
            },
        )
        data = resp.json()
    if not data.get("ok"):
        raise HTTPException(400, f"Slack OAuth failed: {data.get('error', 'unknown')}")

    token = data["access_token"]
    team = data.get("team", {}).get("name", "")
    _slack_tokens[user_id] = {"token": token, "channel_id": "general", "channel_name": "general"}
    return RedirectResponse(url=f"https://smelt.fyi/app/settings?slack=connected&team={team}")


class SlackChannelSet(BaseModel):
    channel_id: str
    channel_name: str

@router.post("/integrations/slack/channel")
async def set_slack_channel(
    body: SlackChannelSet,
    authorization: str | None = Header(default=None),
):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    if user_id not in _slack_tokens:
        raise HTTPException(400, "Slack not connected — connect first")
    _slack_tokens[user_id]["channel_id"] = body.channel_id
    _slack_tokens[user_id]["channel_name"] = body.channel_name
    return {"ok": True}


@router.get("/integrations/slack/status")
async def slack_status(authorization: str | None = Header(default=None)):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    data = _slack_tokens.get(user_id)
    return {"connected": bool(data), "channel": data.get("channel_name") if data else None}


@router.delete("/integrations/slack/disconnect")
async def slack_disconnect(authorization: str | None = Header(default=None)):
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    _slack_tokens.pop(user_id, None)
    return {"ok": True}
