#!/bin/bash

# ==============================================================================
# Resort Management System - Optimized Staging Deployment Script
# ==============================================================================

set -e

echo "🚀 Starting Optimized Staging Deployment..."

# Increase Node.js memory limit for build processes
export NODE_OPTIONS="--max-old-space-size=4096"

cd "$(dirname "$0")"

# 1. Capture current state for change detection
OLD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "initial")
echo "📥 Syncing with GitHub (dev branch)..."
git fetch origin dev
git reset --hard origin/dev
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$OLD_COMMIT" == "initial" ] || [ "$OLD_COMMIT" == "$NEW_COMMIT" ]; then
    echo "ℹ️ No previous commit found or no changes detected. Checking all services..."
    CHANGED_FILES=""
    FORCE_BUILD=true
else
    echo "🔍 Detecting changes between $OLD_COMMIT and $NEW_COMMIT..."
    CHANGED_FILES=$(git diff --name-only $OLD_COMMIT $NEW_COMMIT)
    FORCE_BUILD=false
fi

# Helper function to check if a path has changed
has_changes() {
    local path=$1
    if [ "$FORCE_BUILD" = true ]; then return 0; fi
    echo "$CHANGED_FILES" | grep -q "^$path" && return 0 || return 1
}

# 2. Deploy Backend
if has_changes "backend/"; then
    echo "🏗️ Changes detected in Backend. Building..."
    cd backend
    
    if has_changes "backend/package" || [ "$FORCE_BUILD" = true ]; then
        echo "📦 Package changes detected. Running npm install..."
        npm install
    fi

    if has_changes "backend/prisma/" || [ "$FORCE_BUILD" = true ]; then
        echo "🗄️ Database schema changes detected..."
        npx prisma generate
        npx prisma migrate deploy
    fi

    echo "⚙️ Building Backend..."
    NODE_OPTIONS="--max-old-space-size=1536" npm run build
    
    echo "🔄 Restarting Backend Service..."
    if pm2 describe resort-api-staging > /dev/null 2>&1; then
        pm2 reload resort-api-staging --update-env
    else
        NODE_ENV=staging pm2 start dist/main.js --name "resort-api-staging"
    fi
    pm2 save
    cd ..
else
    echo "⏩ No changes in Backend. Skipping."
fi

# 3. Deploy Frontends
FRONTENDS=("admin" "public" "channel-partner" "property")

for APP in "${FRONTENDS[@]}"; do
    if has_changes "frontend/$APP/"; then
        echo "🏗️ Changes detected in $APP Frontend. Building..."
        cd "frontend/$APP"
        
        if has_changes "frontend/$APP/package" || [ "$FORCE_BUILD" = true ]; then
            echo "📦 Package changes for $APP. Running npm install..."
            npm install
        fi
        
        echo "⚙️ Building $APP..."
        npm run build
        cd ../..
    else
        echo "⏩ No changes in $APP Frontend. Skipping."
    fi
done

echo "✅ Optimized Staging Deployment Complete!"
