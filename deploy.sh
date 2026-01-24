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

# 3. Deploy Admin Frontend
echo "🏗️ Building Admin Frontend..."
cd frontend/admin
npm install
npm run build
# Uncomment and update the path below if using Nginx to serve static files
# sudo cp -r dist/* /var/www/routeguide-admin/
cd ../..

# 4. Deploy Public Frontend
echo "🏗️ Building Public Frontend..."
cd frontend/public
npm install
npm run build
# Uncomment and update the path below if using Nginx to serve static files
# sudo cp -r dist/* /var/www/routeguide-public/
cd ../..

echo "✅ Deployment Complete!"
