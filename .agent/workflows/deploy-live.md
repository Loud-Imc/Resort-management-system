---
description: Deploy the entire monorepo to the live production server
---

// turbo-all
# Full Production Deployment Workflow

This workflow automates the deployment of the backend and both frontend applications (Admin & Public) on the Ubuntu live server.

### 1. Update Codebase
```bash
git pull origin main
```

### 2. Backend Deployment
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart all || pm2 start dist/main.js --name "resort-api"
cd ..
```

### 3. Frontend Admin Deployment
```bash
cd frontend/admin
npm install
npm run build
# Ensure the build output is in the correct Nginx root
# (Replace /var/www/routeguide-admin if different)
# sudo cp -r dist/* /var/www/routeguide-admin/
cd ../..
```

### 4. Frontend Public Deployment
```bash
cd frontend/public
npm install
npm run build
# Ensure the build output is in the correct Nginx root
# (Replace /var/www/routeguide-public if different)
# sudo cp -r dist/* /var/www/routeguide-public/
cd ../..
```

### 5. Finalize
```bash
# Optional: Reload Nginx if configurations changed
# sudo nginx -t && sudo systemctl reload nginx
echo "Deployment Complete!"
```
