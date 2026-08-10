# Availability Service Business Rules Investigation

## 1. Business Rules Implemented

The `AvailabilityService` determines whether a room or property has capacity based on a dynamic overlap calculation. The following business rules govern this logic:

### Overlapping Bookings
- **Rule:** A room is unavailable if a requested date range overlaps with an existing booking.
- **Logic:** Checks if the new booking starts during, ends during, or completely engulfs an existing booking.

### Booking Statuses Considered Occupied
- **Rule:** Not all bookings consume inventory. Only firm commitments do.
- **Statuses Included:** `CONFIRMED`, `CHECKED_IN`, and `RESERVED`. 
- **Statuses Excluded:** `CANCELLED`, `COMPLETED`, `NO_SHOW` (implicitly excluded from the query constraints).

### Pending Payment Timeout (Hold Periods)
- **Rule:** When a guest begins checkout, inventory is held temporarily.
- **Logic:** Bookings with the `PENDING_PAYMENT` status consume inventory **only if** they were created within the last 30 minutes. If older than 30 minutes, they are ignored by the availability check, freeing up the room.

### Maintenance & Room Blocks
- **Rule:** Rooms physically out of service cannot be booked.
- **Logic:** If a physical room's status is exactly `MAINTENANCE` or `BLOCKED`, `isRoomAvailable` immediately returns `false` before checking dates.
- **Legacy Room Blocks:** Additionally, it checks the `RoomBlock` table for administrative blocks (e.g., deep cleaning dates).

### Time-Aware Overstays (Late Check-out)
- **Rule:** A room currently occupied today can still be booked by a new guest checking in today, provided the current guest checks out on time.
- **Logic:** The "Smart Today Check" compares the current time against the property's `defaultCheckOutTime`. It grants a **60-minute grace period**. If the current time is past this threshold, the system assumes the guest has overstayed and blocks the room for any new same-day arrivals.

### Same-Day Bookings
- **Rule:** A booking checking in and out on the exact same date.
- **Logic:** If `checkInDate === checkOutDate`, the system artificially extends the `checkOutDate` internally to `23:59:59` to ensure the overlap query catches conflicts for that specific day.

### Group Bookings & Multi-Room Allocation
- **Rule:** Group bookings don't care about specific room types; they care about aggregate capacity across the property.
- **Logic:** 
  1. Identifies the property's "Group Pool" (Room Types with `isAvailableForGroupBooking: true`).
  2. Aggregates all available rooms in this pool.
  3. Uses a **greedy algorithm**, sorting rooms by `capacity` descending (filling largest rooms first).
  4. Allocates rooms until the required `groupSize` headcount is satisfied. If it runs out of rooms before headcount is 0, availability fails.

---

## 2. Implementation Details

- **Date Normalization:** All input dates (`checkIn` and `checkOut`) are forced to midnight (`00:00:00`) before running overlap queries. This confirms the system operates on a "per-night" inventory model, not an hourly one.
- **Dual Query Strategy (Phase 4):** The `isRoomAvailable` method currently executes two queries in parallel. 
  - **Legacy:** Queries the `Booking` and `RoomBlock` tables using `roomId`.
  - **V2:** Queries the intermediate `BookingRoom` table to handle multi-room bookings correctly.
  - The system returns the Legacy result but logs mismatches against the V2 result for safety.
- **Geo-Spatial Search:** `searchAvailableRoomTypes` implements the Haversine formula directly in raw SQL (`acos(cos(radians...)) * 6371`) to find properties within a `SEARCH_RADIUS` if coordinates are provided.

---

## 3. Assumptions Made by the Code

- **Midnight Normalization Assumption:** By forcing check-in/out times to `00:00:00`, the code assumes all bookings follow standard overnight stays. It cannot easily handle day-use rooms or hourly bookings.
- **Group Splitting Assumption:** The greedy algorithm for group bookings assumes a group of 10 people is perfectly happy being split into one 4-person room and three 2-person rooms, regardless of family units or relationship dynamics.
- **Overstay Assumption:** If a guest overstays by 61 minutes past the default checkout time, the system assumes the room is lost for the entire night and blocks same-day walk-ins or OTAs from booking it.
- **Pending Payment Assumption:** Assumes 30 minutes is universally sufficient for payment gateways to callback. If a payment gateway is slow and callbacks at minute 31, the room might have been double-booked by someone else.

---

## 4. Missing Business Rules

Based on standard Hospitality / PMS architecture, the following availability rules appear to be missing from the core logic:

- **Minimum / Maximum Length of Stay (MinLOS / MaxLOS):** There is no logic checking if the date range satisfies property-defined minimum or maximum night restrictions.
- **Closed to Arrival / Closed to Departure (CTA / CTD):** Standard yield management restrictions preventing guests from checking in or out on specific dates (e.g., major holidays) are not checked.
- **Early Check-in Inventory Blocking:** If a guest requests guaranteed early check-in (e.g., 6 AM), standard PMS systems block the *previous night's* availability to ensure the room is empty. This logic is missing.
- **Release Times / Cut-off Times:** No logic prevents a same-day booking from occurring at 11:30 PM for that same night.
- **Out of Order (OOO) vs Out of Service (OOS):** The system uses a generic `MAINTENANCE` status. It does not differentiate between OOO (deducted from total inventory, impacting occupancy %) and OOS (room is down but still counts toward total inventory).
