# Availability Architecture Investigation

## 1. Current Availability Flow
The complete lifecycle of room availability is dynamically calculated at query time based on overlapping dates rather than a rigid "inventory pool" counter.
- **Search:** When a guest searches the booking engine (or a PMS user queries dates), the system calls `searchAvailableRoomTypes`. This checks the property's pool of room types, calling `getAvailableRoomCount` for each type for the specified dates.
- **Reservation Creation:** During `createBooking`, the `BookingsService` calls `getAvailableRooms` to find physical units that have no overlapping `Booking` or `BookingRoom` records for the requested dates. It allocates exactly the required number of units.
- **Modification/Cancellation:** When a booking is modified or cancelled (e.g., via `ChannelsService`), the `Booking` state in the database is changed to `CANCELLED` or dates are shifted. Since availability is calculated dynamically via database overlap queries, freeing up those dates instantly makes the room available for new searches without manual counter increments.
- **Status Checks (Check-In/Out):** Check-in and check-out update the booking status. The availability calculation considers `CONFIRMED`, `CHECKED_IN`, `RESERVED`, and `PENDING_PAYMENT` (within a 30-min window) as occupying the inventory.

## 2. Availability Consumers
The following modules actively request room availability from the backend:

- **OTA / Guest Booking Engine (CP)**
  - Controller: `BookingsController`
  - Method: `searchAvailableRoomTypes`
- **PMS Frontend (Manual checks / Dashboard)**
  - Controller: `BookingsController`
  - Method: `checkAvailability`
- **Booking Creation Lifecycle**
  - Service: `BookingsService`
  - Method: `createBooking`
- **Channex / External OTA Synchronizer**
  - Service: `ChannelsService`
  - Methods: `pushAriForProperty`, `pushDeltaAri` (Calculates daily available count to push to OTAs)
  - Method: `handleIncomingReservation` (Finds a room to place an inbound OTA reservation)
- **Reporting Dashboard**
  - Service: `ReportsService`
  - Method: `getOccupancyReport` (Consumes it indirectly by reinventing the calculation)

## 3. Availability Providers
The calculation of availability is provided by the following services:

- **File:** `backend/src/bookings/availability.service.ts`
  - **Class:** `AvailabilityService`
  - **Methods:**
    - `isRoomAvailable` / `isRoomAvailableV2`: The core logic that checks a specific room against date overlaps and status constraints.
    - `getAvailableRooms`: Returns a list of room records available for a date range.
    - `getAvailableRoomCount`: Returns an integer count.
    - `searchAvailableRoomTypes`: Higher-level aggregation across properties.
  - **Purpose:** The intended core Single Source of Truth for resolving whether a room or room type is bookable.

- **File:** `backend/src/reports/reports.service.ts`
  - **Class:** `ReportsService`
  - **Method:** `getOccupancyReport`
  - **Purpose:** Manually calculates available counts using raw mathematical subtraction on database rows to generate the daily dashboard report.

## 4. Inventory Updates
Inventory is NOT a static number stored in a table; it is a calculated state. The "updates" occur when state-changing records are written to the database.

- **Booking Created / Cancelled:** 
  - **File:** `backend/src/bookings/bookings.service.ts` (`createBooking`, `cancelBooking`)
  - **Tables:** `Booking`, `BookingRoom`
- **Check-in / Check-out:**
  - **File:** `backend/src/bookings/bookings.service.ts` (`checkInBooking`, `checkOutBooking`)
  - **Tables:** `Booking` (status change), `Room` (`status` is also manually updated to 'OCCUPIED' or 'AVAILABLE').
- **Maintenance / Room Block:**
  - **File:** `backend/src/rooms/rooms.service.ts` (`updateStatus`)
  - **Tables:** `Room` (updates `status` to 'MAINTENANCE'). The availability service completely excludes these from searches.
- **OTA Booking Import:**
  - **File:** `backend/src/channels/channels.service.ts` (`handleIncomingReservation`)
  - **Tables:** `Booking`, `BookingRoom`

## 5. Occupancy
- **Stored or calculated?** Calculated dynamically.
- **Which services calculate it?** `ReportsService` (`getOccupancyReport`).
- **Are there duplicate implementations?** Yes. `ReportsService` computes occupancy completely independently of the `AvailabilityService`. It executes manual Prisma `.count()` queries against the `BookingRoom` table for `status: 'CHECKED_IN'`, and then calculates availability by subtracting `reservedCount` from `rawAvailableCount`.

## 6. Channex
- **Which service communicates with Channex?** `ChannelsService` (`channels.service.ts`) using `ChannexAdapter`.
- **Which availability calculation does it use?** It iterates day-by-day up to `daysToSync`, calling `AvailabilityService.getAvailableRooms().length` for each day to generate an inventory array, which is then pushed to Channex.
- **Does it bypass any existing logic?** Yes. Inside `handleIncomingReservation`, if an OTA sends a booking but `getAvailableRooms` returns 0 (an overbooking), the service logs a warning `[OVERBOOKING WARNING]`, bypasses the rejection, and falls back to `prisma.room.findFirst` to assign ANY room in that room type, just to ensure the OTA reservation record isn't lost.

## 7. Duplicate Logic
- **File A:** `backend/src/bookings/availability.service.ts` (`isRoomAvailableLegacy` vs `isRoomAvailableV2`)
  - **Difference:** The service is currently in a "Phase 4" transition. It executes the legacy overlap query against `Booking` and `RoomBlock` tables, and runs a V2 query against the `BookingRoom` table simultaneously (asynchronously) to log mismatches.
  - **Risk:** High database load due to parallel query execution on every search, and potential race conditions.
- **File A:** `backend/src/bookings/availability.service.ts` 
- **File B:** `backend/src/reports/reports.service.ts` (`getOccupancyReport`)
  - **Difference:** `ReportsService` uses mathematical subtraction (`availableCount = rawAvailableCount - reservedCount - occupiedFromBlocksCount`) instead of using `AvailabilityService`.
  - **Risk:** Discrepancies between the dashboard UI (what the manager sees) and the Channex outbound sync (what the OTA sees) because they use different mathematical models to determine how many rooms are left.

## 8. Potential SSOT
Based ONLY on the current implementation:
- **Is there already a central availability service?** Yes.
- **Identify it:** `AvailabilityService` (`src/bookings/availability.service.ts`). It is fully featured, time-aware, capable of group allocations, handles the 30-minute pending payment locks, and exposes the underlying interval overlap logic.
- **Explanation:** Although it is the designated central service used by the booking engine and channel manager, reporting services are currently bypassing it.

## 9. Sequence
Current sequence for an OTA lifecycle:
1. **OTA Search:** Guest searches on an OTA (e.g., Booking.com).
2. **Availability:** OTA checks Channex. Channex already has the inventory because `ChannelsService` pushed it previously using `AvailabilityService.getAvailableRooms()`.
3. **Reservation:** OTA creates reservation -> Channex Webhook -> `ChannelsService.handleIncomingReservation`.
4. **Inventory Update:** `ChannelsService` creates `Booking` and `BookingRoom` in the database.
5. **Channex Sync:** `ChannelsService` immediately calls `pushAriForProperty`, recalculating the new available counts via `AvailabilityService` and pushing the delta back to Channex to update all other OTAs.

## 10. Summary
- **Current owner:** `AvailabilityService` (`src/bookings/availability.service.ts`).
- **Duplicate implementations:** `ReportsService` calculates room status math independently. `AvailabilityService` is running dual V1/V2 overlap logic internally.
- **Architectural risks:** 
  1. The dual query execution in `AvailabilityService` (Phase 4 logging) adds unnecessary overhead. 
  2. The `ReportsService` bypass creates data inconsistency risks between the PMS dashboard and OTA inventory.
  3. `ChannelsService` bypassing the zero-availability constraint to save overbookings forces data integrity issues onto the property manager to resolve manually.
- **Files that require further investigation:** 
  - `src/reports/reports.service.ts` (To align its calculations with `AvailabilityService`)
  - `src/rooms/rooms.service.ts` (To understand how the physical `room.status` fields interact with the calculated `Booking` overlaps).
