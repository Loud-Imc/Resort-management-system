#!/bin/bash

# ==============================================================================
# Resort Management System - Staging Deployment Script
# ==============================================================================

set -e

echo "🚀 Starting Staging Deployment..."

# 1. Update Codebase from dev branch
echo "📥 Syncing with GitHub (dev branch)..."
cd "$(dirname "$0")"
git fetch origin dev
git reset --hard origin/dev

# 2. Deploy Backend
echo "🏗️ Building Backend..."
cd backend
npm install

npx prisma generate
npx prisma migrate deploy
NODE_OPTIONS="--max-old-space-size=1536" npm run build
echo "🔄 Restarting Backend Service..."
if pm2 describe resort-api-staging > /dev/null 2>&1; then
    echo "🔄 Reloading Backend Service..."
    pm2 reload resort-api-staging --update-env
else
    echo "🚀 Starting Backend Service..."
    NODE_ENV=staging pm2 start dist/main.js --name "resort-api-staging"
fi
pm2 save
cd ..

# 3. Deploy Frontends
FRONTENDS=("admin" "public" "channel-partner" "property")
WEB_ROOT="/var/www/Resort-management-system"

for APP in "${FRONTENDS[@]}"; do
    echo "🏗️ Building $APP Frontend..."
    cd "frontend/$APP"
    npm install
    npm run build
    cd ../..
done

echo "✅ Staging Deployment Complete!"
