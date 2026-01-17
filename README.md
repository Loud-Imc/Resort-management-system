# Resort Management System

A production-ready resort operating platform with internal ERP and public booking capabilities.

## 🏗️ Tech Stack

- **Backend**: NestJS, PostgreSQL, Prisma ORM
- **Frontend**: React (Vite), TypeScript
- **Authentication**: JWT with RBAC
- **Payments**: Razorpay
- **API Docs**: Swagger/OpenAPI

## 📁 Project Structure

```
ResortProject/
├── backend/          # NestJS API Server
├── frontend/
│   ├── admin/       # Admin Dashboard
│   └── public/      # Public Booking Site
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Setup

1. **Clone and install dependencies**

```bash
# Backend
cd backend
npm install

# Admin Frontend
cd ../frontend/admin
npm install

# Public Frontend
cd ../frontend/public
npm install
```

2. **Configure environment**

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/resort_management?schema=public"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
PORT=3000
ADMIN_URL="http://localhost:5173"
PUBLIC_URL="http://localhost:5174"
```

3. **Setup database**

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

4. **Run applications**

```bash
# Backend (Terminal 1)
cd backend
npm run start:dev

# Admin Frontend (Terminal 2)
cd frontend/admin
npm run dev

# Public Frontend (Terminal 3)
cd frontend/public
npm run dev
```

## 🔐 Default Credentials

- **Email**: admin@resort.com
- **Password**: admin123

## 📚 API Documentation

Once running, visit: **http://localhost:3000/api/docs**

## 🎯 Features

### Completed ✅

- JWT Authentication & Authorization
- Role-Based Access Control (RBAC)
- User Management
- Room Type Management with Pricing
- Audit Logging
- Database Schema & Migrations
- API Documentation (Swagger)

### In Progress ⚠️

- Room Inventory Management
- Booking System (Availability & Pricing)
- Razorpay Payment Integration
- Financial Tracking (Income/Expenses)
- Admin Dashboard UI
- Public Booking Website

## 📖 Documentation

See [walkthrough.md](file:///C:/Users/kamar/.gemini/antigravity/brain/5a359836-e06a-49b2-9920-ceb7ed397966/walkthrough.md) for detailed implementation guide.

## 🔧 Development Scripts

### Backend

```bash
npm run start:dev        # Start dev server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
npm run build            # Build for production
npm test                 # Run tests
```

### Frontend

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🏛️ Architecture

- **Monorepo**: Single repository for backend and frontends
- **Modular Backend**: Feature-based modules (Auth, Users, Rooms, Bookings, etc.)
- **Database-First**: Prisma schema drives the data model
- **API-First**: RESTful APIs with comprehensive documentation
- **Security-First**: JWT, RBAC, audit logs, input validation

## 📝 License

UNLICENSED - Private Project
