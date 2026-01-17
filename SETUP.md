# Resort Management System - Setup Guide

## 🎉 What's Been Built

A production-ready Resort Management System with:
- ✅ **Complete Backend API** (NestJS + PostgreSQL + Prisma)
- ✅ **Authentication & RBAC** (JWT + Role/Permission based)
- ✅ **Room Management** (Types, Inventory, Pricing)
- ✅ **Booking Engine** (Availability, Pricing, Workflow)
- ✅ **Audit Logging** (Track all critical operations)
- ⚠️ **Payment Integration** (Structure ready for Razorpay)
- ⚠️ **Frontend Apps** (Basic setup, needs implementation)

---

## 🚀 Quick Setup

### 1. Install PostgreSQL

Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)

Create a database:
```sql
CREATE DATABASE resort_management;
```

### 2. Configure Environment

Update `backend/.env` with your database credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/resort_management?schema=public"
```

### 3. Install Dependencies & Setup Database

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with sample data
npm run prisma:seed
```

### 4. Start the Backend

```bash
cd backend
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs

### 5. Test the API

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@resort.com","password":"admin123"}'
```

Copy the `access_token` from the response.

**Get Room Types:**
```bash
curl http://localhost:3000/api/room-types
```

**Check Availability:**
```bash
curl -X POST http://localhost:3000/api/bookings/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "roomTypeId": "ROOM_TYPE_ID_FROM_PREVIOUS_CALL",
    "checkInDate": "2026-02-01",
    "checkOutDate": "2026-02-05"
  }'
```

**Calculate Price:**
```bash
curl -X POST http://localhost:3000/api/bookings/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "roomTypeId": "ROOM_TYPE_ID",
    "checkInDate": "2026-02-01",
    "checkOutDate": "2026-02-05",
    "adultsCount": 2,
    "childrenCount": 1
  }'
```

---

## 📚 API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/room-types` | List all room types |
| GET | `/api/room-types/:id` | Get room type details |
| POST | `/api/bookings/check-availability` | Check room availability |
| POST | `/api/bookings/calculate-price` | Calculate booking price |

### Protected Endpoints (Requires JWT)

#### Bookings
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/bookings` | All | Create booking |
| GET | `/api/bookings` | Staff+ | List all bookings |
| GET | `/api/bookings/:id` | All | Get booking details |
| POST | `/api/bookings/:id/check-in` | Staff+ | Check-in booking |
| POST | `/api/bookings/:id/check-out` | Staff+ | Check-out booking |
| POST | `/api/bookings/:id/cancel` | All | Cancel booking |
| PATCH | `/api/bookings/:id/status` | Admin+ | Update booking status |
| GET | `/api/bookings/today/check-ins` | Staff+ | Today's check-ins |
| GET | `/api/bookings/today/check-outs` | Staff+ | Today's check-outs |

#### Room Management
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/api/room-types` | Admin+ | Create room type |
| PATCH | `/api/room-types/:id` | Admin+ | Update room type |
| DELETE | `/api/room-types/:id` | Admin | Delete room type |

#### User Management
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/users` | Admin+ | List all users |
| GET | `/api/users/:id` | All | Get user details |
| POST | `/api/users/:userId/roles/:roleId` | Admin+ | Assign role to user |

---

## 🎯 Key Features Implemented

### 1. Availability Checking
- Checks for overlapping bookings
- Considers room blocks (maintenance/owner use)
- Returns available room count
- Prevents double-booking

### 2. Pricing Calculation (Backend-Driven)
- Base price per night
- Extra adult charges (beyond first adult)
- Extra child charges (beyond free children)
- Seasonal pricing rules support
- Tax calculation (18% GST)
- Coupon discount validation and application
- Detailed pricing breakdown

### 3. Booking Workflow
```
PENDING_PAYMENT → CONFIRMED → CHECKED_IN → CHECKED_OUT
       ↓              ↓
   CANCELLED      CANCELLED
       ↓              ↓
   REFUNDED       REFUNDED
```

### 4. Manual vs Online Bookings
- **Manual** (Staff): Immediately confirmed, supports price override
- **Online** (Customer): Starts as PENDING_PAYMENT, confirmed after payment

### 5. Audit Logging
- Tracks all booking operations
- Records user, timestamp, old/new values
- Supports compliance and debugging

---

## 🔐 Default Credentials

**Super Admin:**
- Email: `admin@resort.com`
- Password: `admin123`

**Roles Available:**
- SuperAdmin (full access)
- Admin
- Manager
- Staff
- Customer

---

## 📊 Sample Data Included

The seed script creates:
- ✅ 5 Roles with permissions
- ✅ 1 Super Admin user
- ✅ 5 Booking sources (Direct, Online, Booking.com, Agoda, Broker)
- ✅ 6 Expense categories
- ✅ 3 Room types (Standard, Deluxe, Pool Villa)
- ✅ 10 Rooms (5 Standard, 3 Deluxe, 2 Pool Villas)

---

## 🛠️ Next Steps

### Priority 1: Payment Integration (Razorpay)
1. Install Razorpay SDK: `npm install razorpay`
2. Implement payment order creation in `payments.service.ts`
3. Add payment verification endpoint
4. Set up webhook handler
5. Auto-confirm booking on successful payment

### Priority 2: Frontend Development

**Admin Dashboard:**
- Login page
- Dashboard (occupancy stats, today's check-ins/outs)
- Room management pages
- Booking management (create, view, check-in/out)
- Financial reports

**Public Booking Site:**
- Home page with booking widget
- Room selection with availability
- Booking form with guest details
- Payment integration
- Booking confirmation

### Priority 3: Additional Features
- Room blocking UI
- Income/Expense management
- Financial reports
- Email notifications
- Multi-resort support

---

## 🐛 Troubleshooting

**Prisma Client Errors:**
```bash
npx prisma generate
```

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists

**Port Already in Use:**
```bash
# Change PORT in .env
PORT=3001
```

---

## 📖 Documentation

- **API Docs**: http://localhost:3000/api/docs (Swagger UI)
- **Database Schema**: `backend/prisma/schema.prisma`
- **Walkthrough**: See `walkthrough.md` for detailed implementation guide

---

## 🎓 Architecture Highlights

1. **Backend-Driven Pricing**: All pricing logic in backend for security
2. **Comprehensive Availability**: Prevents conflicts with bookings and blocks
3. **Audit Trail**: Track all critical operations
4. **RBAC**: Granular permission-based access control
5. **Extensible**: Ready for multi-resort and channel manager integration

---

**Built with ❤️ for production-ready resort operations**
