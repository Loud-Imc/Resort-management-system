#!/bin/bash

# ==============================================================================
# Resort Management System - Monorepo Deployment Script
# ==============================================================================

# Exit on error
set -e

echo "🚀 Starting Deployment..."

# 1. Update Codebase
echo "📥 Syncing with GitHub (Hard Reset)..."
# Ensure we are in the project root
cd "$(dirname "$0")"
git fetch origin main
git reset --hard origin/main

# 2. Deploy Backend
echo "🏗️ Building Backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
echo "🔄 Restarting Backend Service..."
# Check if the process is already running
if pm2 describe resort-api > /dev/null; then
    echo "🔄 Reloading Backend Service (Zero Downtime)..."
    pm2 reload resort-api --update-env
else
    echo "🚀 Starting Backend Service..."
    NODE_ENV=production pm2 start dist/main.js --name "resort-api"
fi

# Save the process list to ensure it restarts on server reboot
pm2 save
cd ..

# 3. Deploy Frontends
# Map folder names to subdomain prefixes
FRONTENDS=("admin" "public" "channel-partner" "property")
# Mapping for folder -> subdomain/directory naming
declare -A APP_MAP
APP_MAP["admin"]="admin"
APP_MAP["public"]="public"
APP_MAP["channel-partner"]="channel-partner"
APP_MAP["property"]="property"

# Path on the server as seen in Nginx config
WEB_ROOT="/var/www/Resort-management-system"

for APP in "${FRONTENDS[@]}"; do
    echo "🏗️ Building $APP Frontend..."
    cd "frontend/$APP"
    npm install
    npm run build
    # No copy needed because Nginx points directly to the dist folders inside the repo
    cd ../..
done



echo "✅ Deployment Complete!"
