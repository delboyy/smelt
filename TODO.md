# Smelt — Manual Setup Tasks

These require accounts, dashboards, or credentials that only you can configure.
Complete them in order — each section lists exactly where to go and what to do.

---

## 1. Domain: smelt.fyi

**Register the domain**
1. Go to → https://www.namecheap.com
2. Search for `smelt.fyi` (~$6.98/yr)
3. Purchase and enable WhoisGuard (free with Namecheap)

**Point DNS to Vercel**
1. In Namecheap Dashboard → Domain List → Manage → Advanced DNS
2. Add these records:
   ```
   Type  Host  Value              TTL
   A     @     76.76.21.21        Automatic
   CNAME www   cname.vercel-dns.com  Automatic
   ```
3. In Vercel dashboard → your `frontend` project → Settings → Domains
4. Add `smelt.fyi` and `www.smelt.fyi`
5. Vercel will verify DNS and issue SSL automatically (~15 min)

---

## 2. Google OAuth (for "Continue with Google" on login page)

1. Go to → https://console.cloud.google.com
2. Create a new project called "Smelt"
3. APIs & Services → OAuth consent screen
   - User type: External
   - App name: Smelt
   - Support email: your email
   - Add scopes: `email`, `profile`, `openid`
4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: Smelt Web
   - Authorized redirect URIs:
     - `http://localhost:3002/api/auth/callback/google` (local)
     - `https://smelt.fyi/api/auth/callback/google` (production)
5. Copy the **Client ID** and **Client Secret**

**Add to Vercel env vars** (see section 5 below):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_ENABLED=true
```

---

## 3. PostgreSQL Database (for production users table)

The backend uses SQLite locally (auto-created as `backend/smelt.db`).
For production on Render, set up a PostgreSQL database:

**Option A: Render PostgreSQL (recommended, free tier)**
1. Go to → https://dashboard.render.com
2. New → PostgreSQL
3. Name: `smelt-db`, Region: Virginia (same as your API)
4. Plan: Free
5. Create database → copy the **Internal Database URL**

**Add to Render backend env vars** (see section 4):
```
DATABASE_URL=postgresql+asyncpg://...  (use the Internal URL, replace postgres:// with postgresql+asyncpg://)
```

**Option B: Supabase (more generous free tier)**
1. Go to → https://supabase.com → New project
2. Settings → Database → Connection string → URI
3. Replace `postgres://` with `postgresql+asyncpg://`

---

## 4. Render Backend — Environment Variables

Go to → https://dashboard.render.com → smelt service → Environment

Add or update these variables:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` | From section 3 |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Already set ✓ |
| `APP_ENV` | `production` | Already set ✓ |
| `CORS_ORIGINS` | `https://smelt.fyi,https://www.smelt.fyi` | Update when domain live |
| `NEXTAUTH_SECRET` | (generate below) | Shared with frontend for JWT verification |

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output — use the exact same value in both Render and Vercel.

---

## 5. Vercel Frontend — Environment Variables

Go to → https://vercel.com → frontend project → Settings → Environment Variables

Add these (all environments: Production + Preview + Development):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://smelt-0vgv.onrender.com` (already set ✓) |
| `NEXTAUTH_SECRET` | Same value as Render (from section 4) |
| `NEXTAUTH_URL` | `https://smelt.fyi` (update when domain live) |
| `GOOGLE_CLIENT_ID` | From section 2 |
| `GOOGLE_CLIENT_SECRET` | From section 2 |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | `true` |

After adding env vars → **Redeploy** the frontend:
```bash
cd frontend && npx vercel --prod
```

---

## 6. Stripe Billing ✅ Backend built — needs Stripe account setup

The billing code is complete. Wire it up:

1. Go to → https://stripe.com → Create account
2. Create product: "Smelt Pro" → recurring monthly price
3. Dashboard → Developers → API keys
   - Copy **Secret key** (`sk_live_...`)
4. On the product's Price page → copy the **Price ID** (`price_...`)
5. Webhooks → Add endpoint:
   - URL: `https://smelt-0vgv.onrender.com/api/v1/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy **Webhook secret** (`whsec_...`)

**Add to Render env vars:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
FRONTEND_URL=https://smelt.fyi
```

Until these are set, billing endpoints return 503 gracefully and the UI hides the billing section.

---

## 7. Slack Integration (for "notify on clean complete" feature)

The Slack integration code is built. To activate it:

1. Go to → https://api.slack.com/apps → Create New App → From Scratch
2. App name: **Smelt**, workspace: your Slack workspace
3. OAuth & Permissions → Redirect URLs → Add:
   `https://smelt-0vgv.onrender.com/api/v1/integrations/slack/callback`
4. Scopes → Bot Token Scopes → Add: `chat:write`, `channels:read`, `groups:read`
5. Install to Workspace → copy **Bot User OAuth Token** (`xoxb-...`)
6. Basic Information → App Credentials → copy **Client ID** and **Client Secret**

**Add to Render:**
```
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=https://smelt-0vgv.onrender.com/api/v1/integrations/slack/callback
```

After setting env vars, users can connect Slack from `/app/settings`.

---

## 8. Twitter/X Account

1. Go to → https://x.com/i/flow/signup
2. Username: `@smeltfyi`
3. Post the before/after GIF when live

---

## 9. Custom Domain for Backend API (optional but cleaner)

Currently the backend is at `https://smelt-0vgv.onrender.com`.
If you want `https://api.smelt.fyi`:

1. In Render → smelt service → Settings → Custom Domain
2. Add `api.smelt.fyi`
3. In Namecheap DNS, add:
   ```
   CNAME  api  smelt-0vgv.onrender.com  Automatic
   ```
4. Update `NEXT_PUBLIC_API_URL` on Vercel to `https://api.smelt.fyi`

---

## Status Checklist

- [ ] Domain `smelt.fyi` registered
- [ ] DNS pointed to Vercel
- [ ] Google OAuth credentials created
- [ ] PostgreSQL database provisioned on Render
- [ ] `DATABASE_URL` set in Render env vars
- [ ] `NEXTAUTH_SECRET` generated and set in both Render + Vercel
- [ ] `NEXTAUTH_URL` set to `https://smelt.fyi` in Vercel
- [ ] Google OAuth env vars set in Vercel
- [ ] Frontend redeployed after env var changes
- [ ] Auth tested: register, login, logout
- [ ] Slack app created + `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` set in Render
- [ ] Stripe setup (when ready for billing)
