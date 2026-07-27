# Reservation Lifecycle Architecture Investigation

This document outlines the ownership of the Reservation (Booking) lifecycle within the RouteGuide backend, identifying where core business logic is centralized and where it is bypassed or duplicated.

---

## 1. Reservation Creation
**Primary Owner:** `BookingsService.createBooking` (`backend/src/bookings/bookings.service.ts`)
- Responsible for generating booking numbers, resolving coupons, calculating totals, creating the `Booking` and `BookingRoom` records, and verifying availability.

**Bypasses & Duplications:**
- **ChannelsService:** (`backend/src/channels/channels.service.ts`) -> `handleIncomingReservation`
  - When receiving a webhook from an OTA (like Channex), it executes a raw `prisma.booking.create` transaction. It bypasses `BookingsService.createBooking` entirely. It handles guest creation, source mapping, and room assignment independently.

---

## 2. Reservation Modification
**Primary Owner:** `BookingsService.updateBooking` (`backend/src/bookings/bookings.service.ts`)
- Validates the booking exists, calculates any price differences if dates change, and updates the database.

**Bypasses & Duplications:**
- **ChannelsService:** (`backend/src/channels/channels.service.ts`) -> `handleIncomingReservation`
  - If a webhook indicates a modified reservation (changed dates or total amounts), it directly executes `prisma.booking.update` without passing through the pricing recalculations or validations of the `BookingsService`.
- **NotificationsService:** (`backend/src/notifications/notifications.service.ts`)
  - Directly executes `prisma.booking.update` to append metadata when notifications are sent (e.g., `abandonedCartSentAt`, `reviewRequestSentAt`). While not modifying core stay data, it alters the entity directly.

---

## 3. Reservation Cancellation
**Primary Owner:** `BookingsService.cancelBooking` (`backend/src/bookings/bookings.service.ts`)
- Manages the complex cancellation workflow. It calculates refund percentages based on policy, issues refunds (via Wallet, Razorpay, or Manual), updates payment statuses, decrements `paidAmount`, sets the booking to `CANCELLED`, and triggers a Channex sync.

**Bypasses & Duplications:**
- **ChannelsService:** (`backend/src/channels/channels.service.ts`) -> `handleIncomingReservation`
  - If a webhook payload has `status === 'CANCELLED'`, it directly executes `prisma.booking.update({ data: { status: 'CANCELLED', cancelledAt: new Date() } })`. It bypasses `BookingsService.cancelBooking` completely. (Note: This is likely because OTAs handle their own refunds, but architecturally, it completely detaches OTA cancellations from standard business logic pipelines).

---

## 4. Room Assignment
**Primary Owner:** `BookingsService.createBooking`
- Calls `AvailabilityService.getAvailableRooms()` and safely assigns available physical rooms to the booking.

**Bypasses & Duplications:**
- **ChannelsService:** (`backend/src/channels/channels.service.ts`)
  - Calls `AvailabilityService.getAvailableRooms()`, but if the result is empty (0 available rooms), it explicitly bypasses the capacity constraint. It runs `prisma.room.findFirst()` and forces the booking into an occupied room to prevent dropping the webhook payload.

---

## 5. Check-In & Check-Out
**Primary Owner:** `BookingsService.checkInBooking` & `BookingsService.checkOutBooking`
- **Check-In:** Verifies payment status, sets booking status to `CHECKED_IN`, sets the physical `Room` status to `OCCUPIED`, logs the audit event, and triggers channel partner commissions if applicable.
- **Check-Out:** Sets booking status to `CHECKED_OUT`, frees the physical `Room` status to `AVAILABLE`, and records the action.

**Bypasses & Duplications:**
- **None Identified.** Check-in and check-out logic appears fully centralized within `BookingsService`. No other service initiates check-ins or check-outs.

---

## 6. Status Changes (Confirmation)
**Primary Owner:** `BookingsService.updateStatus`
- Mostly utilized for confirming payment statuses (`CONFIRMED`).

**Bypasses & Duplications:**
- Payments and external webhooks (like OTA creation) manually set statuses during creation/update, rather than calling a state-machine method.

---

## Summary of Architectural Facts
1. The `BookingsService` acts as the primary API for PMS users and the direct booking engine.
2. The `ChannelsService` acts as an entirely parallel Reservation Engine for OTA bookings. It creates, modifies, and cancels reservations by interacting with the database directly rather than consuming `BookingsService`.
3. Notification state tracking is tightly coupled to the `Booking` table, causing the `NotificationsService` to perform direct database updates on reservations.
