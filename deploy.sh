#!/bin/bash

# ==============================================================================
# Resort Management System - Optimized Monorepo Deployment Script
# ==============================================================================

# Exit on error
set -e

echo "🚀 Starting Optimized Deployment..."
START_TIME=$(date +%s)

# Increase Node.js memory limit for build processes
export NODE_OPTIONS="--max-old-space-size=4096"

# Ensure we are in the project root
cd "$(dirname "$0")"

# 1. Capture current state for change detection
PREV_COMMIT=$(git rev-parse HEAD)

echo "📥 Syncing with GitHub (Hard Reset)..."
git fetch origin main
git reset --hard origin/main

CURRENT_COMMIT=$(git rev-parse HEAD)

# Helper function to check for changes in a directory
has_changes() {
    local dir=$1
    if [ "$PREV_COMMIT" == "$CURRENT_COMMIT" ]; then
        return 1 # No changes if commits are same
    fi
    git diff --name-only "$PREV_COMMIT" "$CURRENT_COMMIT" | grep -q "^$dir"
}

# 2. Deploy Backend
if has_changes "backend/"; then
    echo "🏗️ Backend changes detected. Building Backend..."
    cd backend
    npm install
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    
    echo "🔄 Restarting Backend Service..."
    if pm2 describe resort-api > /dev/null; then
        echo "🔄 Reloading Backend Service (Zero Downtime)..."
        pm2 reload resort-api --update-env
    else
        echo "🚀 Starting Backend Service..."
        NODE_ENV=production pm2 start dist/main.js --name "resort-api"
    fi
    pm2 save
    cd ..
else
    echo "⏭️ No changes in backend. Skipping backend build."
fi

# 3. Deploy Frontends in Parallel
FRONTENDS=("admin" "public" "channel-partner" "property")
BUILD_PIDS=()
CHANGED_FRONTENDS=()

echo "🔍 Checking for frontend changes..."
for APP in "${FRONTENDS[@]}"; do
    if has_changes "frontend/$APP"; then
        echo "✅ Changes detected in $APP. Adding to build queue..."
        CHANGED_FRONTENDS+=("$APP")
    else
        echo "⏭️ No changes in $APP. Skipping."
    fi
done

if [ ${#CHANGED_FRONTENDS[@]} -gt 0 ]; then
    echo "🏗️ Building changed frontends in parallel: ${CHANGED_FRONTENDS[*]}"
    for APP in "${CHANGED_FRONTENDS[@]}"; do
        (
            echo "  🛠️ Building $APP..."
            cd "frontend/$APP"
            npm install > /dev/null 2>&1
            npm run build > /dev/null 2>&1
            echo "  ✨ $APP build complete."
        ) &
        BUILD_PIDS+=($!)
    done

    # Wait for all background builds to finish
    for pid in "${BUILD_PIDS[@]}"; do
        wait "$pid" || { echo "❌ A frontend build failed!"; exit 1; }
    done
else
    echo "⏭️ No frontend changes detected. Skipping all frontend builds."
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "✅ Deployment Complete in ${DURATION}s!"
