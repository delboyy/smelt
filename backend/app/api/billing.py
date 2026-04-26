"""Billing endpoints: Stripe Checkout, webhook, portal, and plan status."""

import os
import logging
from fastapi import APIRouter, HTTPException, Header, Request
from sqlalchemy import select

from app.api.auth import _get_current_user_id
import app.core.database as _db_module
from app.models.user import User
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

_FREE_ROW_LIMIT = 500
_PRO_ROW_LIMIT = 999_999


def _stripe():
    """Return configured stripe module or None if not set up."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        return None
    try:
        import stripe as _s
        _s.api_key = settings.stripe_secret_key
        return _s
    except ImportError:
        return None


async def _get_user(user_id: str) -> User | None:
    async with _db_module.AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


async def _update_user(user_id: str | None, customer_id: str | None = None, **kwargs) -> None:
    """Update user fields by id or stripe_customer_id."""
    async with _db_module.AsyncSessionLocal() as db:
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
        elif customer_id:
            result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
        else:
            return
        user = result.scalar_one_or_none()
        if not user:
            return
        for k, v in kwargs.items():
            setattr(user, k, v)
        await db.commit()


@router.get("/billing/status")
async def billing_status(authorization: str | None = Header(default=None)):
    """Return current plan, usage, and row limit for the authenticated user."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    user = await _get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    plan = user.tier if user.tier in ("free", "pro") else "free"
    row_limit = _PRO_ROW_LIMIT if plan == "pro" else _FREE_ROW_LIMIT

    return {
        "plan": plan,
        "rows_used_this_month": user.rows_used_this_month,
        "row_limit": row_limit,
    }


@router.post("/billing/checkout")
async def create_checkout(authorization: str | None = Header(default=None)):
    """Create a Stripe Checkout session for Pro plan subscription."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    stripe = _stripe()
    if not stripe:
        raise HTTPException(503, detail={"error": "Billing not configured"})

    settings = get_settings()
    if not settings.stripe_price_id:
        raise HTTPException(503, detail={"error": "Billing not configured"})

    user = await _get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    session_kwargs: dict = {
        "mode": "subscription",
        "line_items": [{"price": settings.stripe_price_id, "quantity": 1}],
        "success_url": f"{settings.frontend_url}/app/settings?billing=success",
        "cancel_url": f"{settings.frontend_url}/app/settings",
        "metadata": {"user_id": user_id, "email": user.email},
    }
    if user.email:
        session_kwargs["customer_email"] = user.email

    try:
        checkout = stripe.checkout.Session.create(**session_kwargs)
        return {"checkout_url": checkout.url}
    except Exception as e:
        logger.error("Stripe checkout error: %s", e)
        raise HTTPException(500, "Failed to create checkout session")


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events to update user tier."""
    settings = get_settings()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret:
        return {"received": True}

    stripe = _stripe()
    if not stripe:
        return {"received": True}

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {e}")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        user_id = (data.get("metadata") or {}).get("user_id")
        email = data.get("customer_email") or (data.get("metadata") or {}).get("email")

        if user_id:
            await _update_user(user_id, stripe_customer_id=customer_id, tier="pro")
        elif email:
            async with _db_module.AsyncSessionLocal() as db:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()
                if user:
                    user.tier = "pro"
                    if customer_id:
                        user.stripe_customer_id = customer_id
                    await db.commit()

    elif event_type == "customer.subscription.updated":
        customer_id = data.get("customer")
        status = data.get("status")
        if status != "active":
            await _update_user(None, customer_id=customer_id, tier="free")

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        await _update_user(None, customer_id=customer_id, tier="free")

    return {"received": True}


@router.get("/billing/portal")
async def billing_portal(authorization: str | None = Header(default=None)):
    """Create a Stripe Customer Portal session for subscription management."""
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    stripe = _stripe()
    if not stripe:
        raise HTTPException(503, detail={"error": "Billing not configured"})

    user = await _get_user(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if not getattr(user, "stripe_customer_id", None):
        raise HTTPException(503, detail={"error": "No billing account found"})

    settings = get_settings()
    try:
        portal = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{settings.frontend_url}/app/settings",
        )
        return {"portal_url": portal.url}
    except Exception as e:
        logger.error("Stripe portal error: %s", e)
        raise HTTPException(500, "Failed to create portal session")
