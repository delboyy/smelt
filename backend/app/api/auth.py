"""Auth endpoints: register + login + API key management."""

import os
import hashlib
import secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.user import User

router = APIRouter()

# JWT + password deps — only import if libs present
try:
    from jose import jwt
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _JWT_SECRET = os.environ.get("NEXTAUTH_SECRET") or ""
    _JWT_ALGO = "HS256"
    _JWT_EXPIRE_HOURS = 24 * 30  # 30 days
    _AUTH_AVAILABLE = True
except ImportError:
    _AUTH_AVAILABLE = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _make_token(user: User) -> str:
    if not _JWT_SECRET:
        raise HTTPException(503, "NEXTAUTH_SECRET env var must be set")
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "tier": user.tier,
        "exp": datetime.now(UTC) + timedelta(hours=_JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGO)


@router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not _AUTH_AVAILABLE:
        raise HTTPException(503, "Auth dependencies not installed (python-jose, passlib)")

    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(409, "Email already registered")

    user = User(
        email=body.email,
        name=body.name or body.email.split("@")[0],
        hashed_password=_pwd_ctx.hash(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        access_token=_make_token(user),
        user={"id": user.id, "email": user.email, "name": user.name, "tier": user.tier},
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    if not _AUTH_AVAILABLE:
        raise HTTPException(503, "Auth dependencies not installed (python-jose, passlib)")

    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not user.hashed_password:
        raise HTTPException(401, "Invalid credentials")
    if not _pwd_ctx.verify(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    return AuthResponse(
        access_token=_make_token(user),
        user={"id": user.id, "email": user.email, "name": user.name, "tier": user.tier},
    )


@router.get("/auth/me")
async def me(db: AsyncSession = Depends(get_db)):
    """Placeholder — real endpoint would decode JWT from Authorization header."""
    return {"message": "Add Authorization: Bearer <token> header"}


# ── API Key helpers ──────────────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    name: str = "Default"


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    created_at: str
    last_used: str | None = None


def _get_current_user_id(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    if not _AUTH_AVAILABLE or not _JWT_SECRET:
        return None
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
        return payload.get("sub")
    except Exception:
        return None


# ── API Key endpoints ────────────────────────────────────────────────────────

@router.post("/auth/api-keys")
async def create_api_key(
    body: ApiKeyCreate,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import ApiKey
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    plaintext = "sk_live_" + secrets.token_hex(24)
    key_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    key = ApiKey(user_id=user_id, key_hash=key_hash, name=body.name)
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return {"id": key.id, "key": plaintext, "name": key.name, "created_at": key.created_at.isoformat()}


@router.get("/auth/api-keys")
async def list_api_keys(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import ApiKey
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user_id, ApiKey.revoked_at == None).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "created_at": k.created_at.isoformat(),
            "last_used": k.last_used.isoformat() if k.last_used else None,
        }
        for k in keys
    ]


@router.delete("/auth/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import ApiKey
    user_id = _get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    key = await db.scalar(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id))
    if not key:
        raise HTTPException(404, "Key not found")
    key.revoked_at = datetime.utcnow()
    await db.commit()
