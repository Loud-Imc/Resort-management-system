#!/bin/bash

# ==============================================================================
# Resort Management System - Monorepo Deployment Script
# ==============================================================================

# Exit on error
set -e

echo "🚀 Starting Deployment..."

# 1. Update Codebase
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Deploy Backend
echo "🏗️ Building Backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
echo "🔄 Restarting Backend Service..."
pm2 restart resort-api || pm2 start dist/main.js --name "resort-api"
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
