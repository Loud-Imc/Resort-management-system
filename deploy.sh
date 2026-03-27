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

# Clear any failed migration records directly in the DB so deploy can proceed
echo "🔧 Clearing failed migration record from _prisma_migrations..."
node -e "
const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query(\"DELETE FROM _prisma_migrations WHERE migration_name = '20260326134500_sync_schema_and_payouts' AND finished_at IS NULL\"))
  .then(r => { console.log('Deleted ' + r.rowCount + ' failed migration record(s)'); })
  .catch(e => console.error('Could not clear migration record:', e.message))
  .finally(() => client.end());
"

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
