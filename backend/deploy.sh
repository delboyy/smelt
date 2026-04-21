#!/bin/bash
# Run this from backend/ to deploy to Railway.
# Requires: railway CLI (brew install railway)

set -e
cd "$(dirname "$0")"

echo "==> Step 1: Login to Railway"
railway login

echo ""
echo "==> Step 2: Create project and link"
railway init --name smelt-api

echo ""
echo "==> Step 3: Add Redis service"
railway add --service redis

echo ""
echo "==> Step 4: Set environment variables"
echo "  You'll need your ANTHROPIC_API_KEY:"
read -rp "  ANTHROPIC_API_KEY: " ANTHROPIC_KEY

railway variables set \
  ANTHROPIC_API_KEY="$ANTHROPIC_KEY" \
  REDIS_URL='${{Redis.REDIS_URL}}' \
  CORS_ORIGINS="https://smelt.fyi,https://frontend-m0lefzz6z-nathans-projects-6ed76785.vercel.app"

echo ""
echo "==> Step 5: Deploy"
railway up --detach

echo ""
echo "==> Step 6: Get your backend URL"
railway domain
