# Resort Management System - Mobile App API Mapping Guide

This document maps out the specific data and API calls required to build the mobile application screens for the Property side of the PMS. For each screen, it lists the data displayed, the APIs used to fetch the data, and the APIs used for user actions (mutations).

---

## 1. Property Dashboard (`DashboardHome.tsx`)

**Purpose:** Provides a high-level overview of today's metrics, occupancy calendar, and current room statuses.

### Screen Sections & API Mapping

#### A. Top Summary Metrics
- **Data Displayed:** Today's Bookings count, Today's Revenue, Occupancy Percentage, Total Occupied Rooms, Check-ins today, Check-outs today.
- **Fetch API:** `GET /reports/dashboard`
- **Query Params:** `?propertyId=<active_property_id>`
- **Response Structure:** Returns a `DashboardStats` object containing `checkIns`, `checkOuts`, `occupancy: { total, occupied, percentage }`, `revenue`, and `bookingsCreated`.

#### B. Occupancy Calendar
- **Data Displayed:** A horizontal calendar view showing dates. For each date, it shows the number of available rooms vs. booked rooms.
- **Fetch API:** `GET /bookings/dashboard-calendar`
- **Query Params:** `?propertyId=<id>&startDate=<ISO_DATE>&endDate=<ISO_DATE>` (Usually spans current month or current week).
- **Response Structure:** Returns an array of `Booking` objects that overlap the requested date range.
- **Logic:** To calculate daily occupancy, iterate over the bookings and count how many bookings fall on each day between their `checkInDate` and `checkOutDate` (excluding the checkout day itself for overnight stays).

#### C. Room Status Grid
- **Data Displayed:** A grid of cards representing physical rooms. Each card shows the Room Number, Room Type, and its current status (AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, etc.). If occupied/reserved, it shows the primary guest's name.
- **Fetch API:** `GET /rooms`
- **Query Params:** `?propertyId=<id>`
- **Response Structure:** Returns an array of `Room` objects. Each room includes its `roomType` and nested arrays for `bookingRooms` (to find the active booking) and `blocks` (to find active maintenance blocks).
- **Interactions:** Clicking a room either navigates to Create Booking (if available) or Booking Details (if occupied).

---

## 2. Property Booking List Page (`BookingsList.tsx`)

**Purpose:** A searchable and filterable table/list of all bookings.

### Screen Sections & API Mapping

#### A. The Bookings List
- **Data Displayed:** Booking Number, Guest Name & Contact, Room Number(s), Check-in/Check-out dates, Status (PENDING_PAYMENT, RESERVED, CHECKED_IN, CHECKED_OUT, CANCELLED), and Total Amount.
- **Fetch API:** `GET /bookings`
- **Query Params:** 
  - `propertyId=<id>`
  - `startDate=<ISO_DATE>` (optional filter)
  - `endDate=<ISO_DATE>` (optional filter)
  - `status=<BookingStatus>` (optional filter)
  - `roomTypeId=<id>` (optional filter)
- **Response Structure:** Array of `Booking` objects. Each booking contains `user`, `guests`, `bookingRooms` (with nested `room` and `roomType`), and `totalAmount`.

#### B. Quick Actions (Mutations)
- **Check-Out:** `POST /bookings/:id/check-out` (Payload: optional notes)
- **Cancel:** `POST /bookings/:id/cancel` (Payload: `{ reason: string }`)

---

## 3. Property Booking Details Page (`BookingDetails.tsx`)

**Purpose:** Comprehensive view of a single booking, including guest details, accommodation breakdown, financial summary, and transaction history.

### Screen Sections & API Mapping

#### A. Full Booking Details
- **Data Displayed:** Booking Status, Created At, Check-in/out times, Nights, Accommodation Breakdown (Room Types, Room Numbers assigned), Primary Booker info, Other Registered Guests, Payment Summary (Base Rate, Taxes, Total, Paid Amount, Balance Due).
- **Fetch API:** `GET /bookings/:id`
- **Path Params:** `id` (Booking UUID)
- **Response Structure:** Single `Booking` object including deeply nested relations: `user`, `guests`, `bookingRooms` (with `room` and `roomType`), and transactions/payments.

#### B. Actions (Mutations)
- **Record Manual Payment:** `POST /payments`
  - Payload: `{ bookingId, amount, paymentMethod (e.g., 'CASH', 'UPI'), transactionId, status: 'COMPLETED' }`
- **Check-In/Check-Out:** `POST /bookings/:id/check-in` or `POST /bookings/:id/check-out`
- **Cancel Booking:** `POST /bookings/:id/cancel`

---

## 4. Property Booking Edit Page (`EditBooking.tsx`)

**Purpose:** Modifying basic guest details, special requests, or administrative overrides on an existing booking.

### Screen Sections & API Mapping

#### A. Pre-filling the Form
- **Fetch API:** `GET /bookings/:id` (Same as Details page)
- **Fetch API (Room Types):** `GET /properties/:propertyId/room-types` (To allow changing the room type if necessary, though rescheduling is preferred for date/room changes).

#### B. Saving Changes (Mutation)
- **Update API:** `PATCH /bookings/:id`
- **Payload Data:**
  - `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone`, `whatsappNumber` (Updates the primary user/guest profile).
  - `adultsCount`, `childrenCount`
  - `specialRequests`
  - `overrideReason`

---

## 5. Property Booking Reschedule Page (`ReschedulePage.tsx`)

**Purpose:** Changing the dates, room types, or specific physical rooms for an existing booking, and recalculating the price difference.

### Screen Sections & API Mapping

#### A. Initial Data
- **Fetch API:** `GET /bookings/:id` (To know the current dates and paid amount).
- **Fetch API:** `GET /properties/:propertyId/room-types`

#### B. Checking Availability & Pricing
When the user selects new dates or a new room type, the app must verify availability and recalculate the price dynamically.
- **Check Availability API:** `POST /bookings/check-availability`
  - Payload: `{ propertyId, roomTypeId, checkInDate, checkOutDate }`
  - Response: `{ available: boolean, availableRooms: number, roomList: Room[] }` (Allows user to select specific physical rooms from `roomList`).
- **Calculate Price API:** `POST /bookings/calculate-price`
  - Payload: `{ roomTypeId, checkInDate, checkOutDate, adultsCount, childrenCount, isGroupBooking, roomCount }`
  - Response: `{ totalAmount, baseAmount, taxAmount, numberOfNights, ... }`

#### C. Submit Reschedule (Mutation)
- **Reschedule API:** `POST /bookings/:id/reschedule`
- **Payload:**
  - `checkInDate`, `checkOutDate`
  - `roomTypeId`
  - `selectedRoomIds` (Array of specific room UUIDs to allocate)
  - `overrideTotal` (If the admin manually overrides the new calculated price)
  - `overrideReason`

---

## 6. Property Room Page (`RoomsList.tsx`)

**Purpose:** Administrative view of all physical rooms, allowing staff to block rooms for maintenance or edit room notes.

### Screen Sections & API Mapping

#### A. Rooms Grid/List
- **Data Displayed:** Room Number, Floor, Room Type Name, Current Status (AVAILABLE, MAINTENANCE, BLOCKED), and any active block reasons.
- **Fetch API:** `GET /rooms`
- **Query Params:** `?propertyId=<id>`

#### B. Room Actions (Mutations)
- **Update Status (e.g., mark as Available):** `PATCH /rooms/:id/status`
  - Payload: `{ status: 'AVAILABLE' | 'MAINTENANCE' }`
- **Block Room (e.g., for repairs):** `POST /rooms/blocks`
  - Payload: `{ roomId, reason: string, startDate: ISO, endDate: ISO, notes: string }`
- **Unblock Room:** `DELETE /rooms/blocks/:blockId`

---

## 7. Property Create New Booking Page (`CreateBooking.tsx`)

**Purpose:** Walk-in or administrative manual booking creation.

### Screen Sections & API Mapping

#### A. Initial Form Data
- **Fetch API:** `GET /properties/:propertyId/room-types` (Populates the Room Type dropdown).

#### B. Availability & Pricing (Dynamic Checks)
- Just like the Reschedule page, when dates/room types are selected:
- **API:** `POST /bookings/check-availability` (Returns available physical rooms).
- **API:** `POST /bookings/calculate-price` (Returns the financial breakdown).

#### C. Submit New Booking (Mutation)
- **Create API:** `POST /bookings`
- **Payload Data (`CreateBookingDto`):**
  - `propertyId`, `roomTypeId`
  - `checkInDate`, `checkOutDate`
  - `adultsCount`, `childrenCount`
  - `selectedRoomIds` (Array of chosen physical rooms from the availability check)
  - `isManualBooking: true`
  - `paymentMethod` (e.g., 'CASH', 'UPI', 'CARD')
  - `paymentOption` (e.g., 'FULL', 'PARTIAL', 'PAY_AT_PROPERTY')
  - `paidAmount` (If they are paying an advance right now)
  - `guestFirstName`, `guestLastName`, `guestPhone`, `guestEmail`, `whatsappNumber`
  - `guests` (Array of objects representing actual occupants. If the primary booker is also staying, they should be `guests[0]`).
  - `isGroupBooking` (boolean) and `groupSize` (if applicable).
