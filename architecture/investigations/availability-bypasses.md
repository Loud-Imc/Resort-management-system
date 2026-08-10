# Availability Service Bypasses

This document outlines all identified locations in the codebase where room availability or occupancy is calculated or determined independently, bypassing the `AvailabilityService` (the intended Single Source of Truth).

---

## 1. Reporting Dashboard Occupancy Calculation

**File Path:** `backend/src/reports/reports.service.ts`
**Service/Class:** `ReportsService`
**Method:** `getOccupancyReport`

**What calculation is being performed:**
The method manually calculates the number of available and occupied rooms using raw mathematical subtraction on database rows. 
It calculates `availableCount = rawAvailableCount - reservedCount - occupiedFromBlocksCount` and determines `occupiedRooms` by running a direct `prisma.booking.count` for statuses `['CONFIRMED', 'CHECKED_IN']` matching the current day.

**Why it bypasses AvailabilityService:**
The code attempts to calculate aggregate property-wide statistics efficiently for the reporting dashboard. Instead of calling `isRoomAvailable` in a loop for every room, it performs top-down mathematical counts using raw Prisma queries to generate a snapshot.

**Logic Comparison:**
- **Different.** The logic is mathematically based (subtracting totals) rather than interval-based (checking date overlaps). 
- It does not properly respect the 30-minute `PENDING_PAYMENT` hold window.
- It calculates "today's" snapshot rather than the true span of time over which a room is booked.

---

## 2. Room Deletion Validation

**File Path:** `backend/src/rooms/rooms.service.ts`
**Service/Class:** `RoomsService`
**Method:** `remove`

**What calculation is being performed:**
Before allowing a room to be soft-deleted (status changed to `MAINTENANCE` and `isEnabled: false`), it checks if the room has any active occupancy. It does this by running `prisma.booking.count` for the `roomId` checking for statuses `['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'RESERVED']`.

**Why it bypasses AvailabilityService:**
This is a standard database integrity check to prevent deleting a room that has active foreign key relationships (bookings).

**Logic Comparison:**
- **Simplified.** It does not check dates or intervals. It simply asks: "Does this room have ANY active bookings attached to it, past, present, or future?" If yes, it blocks deletion. It also bypasses the V2 `BookingRoom` architecture entirely, relying solely on the legacy `roomId` column in the `Booking` table.

---

## 3. Room Block Conflict Validation

**File Path:** `backend/src/rooms/rooms.service.ts`
**Service/Class:** `RoomsService`
**Method:** `createBlock`

**What calculation is being performed:**
When a manager attempts to manually block a room for maintenance or administrative reasons, the method must ensure the room isn't already occupied during those dates. It manually executes the exact same 3-condition date overlap query (starts during, ends during, engulfs) against the `Booking` table using Prisma.

**Why it bypasses AvailabilityService:**
It appears the developer copied the date overlap logic directly from `AvailabilityService` into `RoomsService` to validate the block locally without injecting the dependency.

**Logic Comparison:**
- **Mostly Equivalent (to Legacy V1).** It perfectly mirrors the old V1 overlap logic.
- However, it misses the 30-minute `PENDING_PAYMENT` time limit (it just counts all pending payments regardless of when they were created).
- It completely misses the V2 architecture (`BookingRoom` table), checking only the legacy `roomId` on the `Booking` table.

---

## 4. OTA Overbooking Forced Allocation (Fallback)

**File Path:** `backend/src/channels/channels.service.ts`
**Service/Class:** `ChannelsService`
**Method:** `handleIncomingReservation`

**What calculation is being performed:**
When an OTA (like Booking.com) sends an inbound reservation webhook, the system attempts to assign it to a physical room. It *does* call `AvailabilityService.getAvailableRooms`. However, if the service returns `0` available rooms (an overbooking situation), this method bypasses the capacity limit and executes a raw `prisma.room.findFirst({ where: { roomTypeId, propertyId } })` to assign the guest to a physical room regardless of its actual availability.

**Why it bypasses AvailabilityService:**
The code includes a logged warning `[OVERBOOKING WARNING]`. The fallback exists to ensure that a confirmed OTA reservation isn't completely dropped or lost by the system just because the PMS doesn't have an empty room for it. It forces the booking into the system, leaving it up to the hotel manager to resolve the double-booking manually.

**Logic Comparison:**
- **Intentional Override.** It actively ignores the result of the `AvailabilityService` to preserve data integrity of the external channel.
