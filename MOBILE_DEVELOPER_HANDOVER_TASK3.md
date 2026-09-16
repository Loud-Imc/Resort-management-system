# Mobile Developer (Flutter) Handover Specification
## Branch: `feat/task-3-occupancy-and-ui-flow`
**Target Audience**: Flutter Mobile App Developers (Guest OTA App, Property PMS Staff App, Channel Partner App)  
**Last Updated**: September 2026  
**Status**: Production-Ready / Backend Verified

---

## 1. Executive Summary

This document specifies the frontend UI/UX requirements, API contracts, and data structures introduced in the `feat/task-3-occupancy-and-ui-flow` branch.

### What Changed?
* **Old Behavior**: The user guessed which rooms to pick. Children had no explicit ages, infants were either counted as adults or ignored, and room tariffs added tax inconsistently.
* **New Behavior**:
  1. **Age-Aware Guest Selection**: Adults (13+), Children (3–12 yrs) with mandatory individual ages, and Infants (0–2 yrs, zero bed impact).
  2. **Automated Accommodation Solutions**: The backend occupancy solver returns optimal single-room and multi-room combinations (`accommodationSolutions`) ready for 1-tap selection.
  3. **Custom Staff Allocations (PMS)**: Staff can build custom room combinations with specific physical room assignments and live price recalculation.
  4. **Strict GST Semantics**: Transparent support for both GST-inclusive and GST-exclusive tariffs using dynamic Admin `GST_TIERS`.

---

## 2. Core Domain & Age Rules

| Category | Age Range | Bed Capacity Consumption | UI Input Component |
| :--- | :--- | :--- | :--- |
| **Adult** | **13+ years** | Consumes 1 adult bed slot | Counter (Min: 1) |
| **Child** | **3–12 years** | Consumes child capacity (or adult slot if child slots full) | Counter + **Dynamic Age Dropdowns** (1 dropdown per child, range 3–12, default 6) |
| **Infant** | **0–2 years** | **0 bed slots** (Sleeps with parents or in cot). Bounded only by `maxPhysicalInfants`. | Counter (Min: 0, default 0) |

> [!IMPORTANT]
> **Infants rule**: An infant does NOT increase the room count required. For example, 2 Adults + 1 Infant fits into a room with Base Adult capacity = 2.
>
> **Child Ages rule**: When `childrenCount > 0`, the mobile app **must** collect `childAges` (e.g. `[6, 9]`). Individual child ages determine whether a child stays free or incurs extra child charges based on property rules.

---

## 3. UI / UX Requirements for Flutter

### 3.1. Guest Selector Widget (All Apps: OTA, PMS, CP)
```
┌─────────────────────────────────────────────────────────────┐
│ GUESTS & ROOMS                                              │
├─────────────────────────────────────────────────────────────┤
│ Adults (13+ yrs)                           [-]  2  [+]      │
│ Children (3–12 yrs)                        [-]  2  [+]      │
│   ├─ Child 1 Age:  [ 6 yrs ▼ ]                              │
│   └─ Child 2 Age:  [ 9 yrs ▼ ]                              │
│ Infants (0–2 yrs)                          [-]  1  [+]      │
└─────────────────────────────────────────────────────────────┘
```
* **State Management**:
  * Changing `childrenCount` from `1` to `2` appends a default age (`6`) to `childAges`.
  * Decreasing `childrenCount` slices `childAges`.
  * The search button must be enabled only if every child has a valid age (3–12).

---

### 3.2. Accommodation Solution Card (OTA & PMS)
Instead of returning just a list of raw room types, the availability API returns `accommodationSolutions: []`.

```
┌─────────────────────────────────────────────────────────────┐
│ ★ RECOMMENDED SOLUTION                            2 Rooms   │
│ Deluxe Lake View Suite + Family Garden Room                 │
│                                                             │
│  • Room 1: Deluxe Lake View (2 Adults, 1 Child age 6)       │
│  • Room 2: Family Garden Room (2 Adults, 1 Infant)          │
│                                                             │
│ Fits 4 Adults, 1 Child, 1 Infant comfortably               │
│                                                             │
│ ₹6,000 / night  •  Total ₹12,000 (2 Nights, Incl. GST)     │
│                                           [ SELECT PACKAGE ]│
└─────────────────────────────────────────────────────────────┘
```
* Each solution contains:
  * `solutionName`: Human-readable label (e.g., *"2-Room Family Accommodation Solution"*).
  * `totalRooms`: Total physical rooms required.
  * `isRecommended`: `true` if optimal fit.
  * `badge`: Optional string (e.g., *"Best Value"*, *"Whole Property"*).
  * `pricing`: Authoritative price object (see API section below).
  * `rooms`: List of room items with individual occupant assignments.

---

### 3.3. Custom Accommodation Modal (PMS Property App Only)
Allows hotel frontdesk staff to manually configure multi-room allocations:
* **Add Room / Remove Room**: Add 1 or more rooms to the reservation.
* **Room Type & Physical Room Dropdown**: Select `roomTypeId` and assigned `physicalRoomId` (e.g., `LVH101`).
* **Per-Room Guest Steppers**:
  * Adults in Room
  * Children in Room (with child age tags)
  * Infants in Room
* **Live Price Calculation**: While the modal is open, call `POST /api/bookings/calculate-price` to update the preview total with 100% backend financial authority.

---

## 4. API Specification

### 4.1. Search & Availability API

#### `GET /api/bookings/search-rooms` (OTA Global Search)
#### `GET /api/properties/:id/availability` (Property Detail Search)

#### Query Parameters:
| Parameter | Type | Required | Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `checkInDate` | String | Yes | `2026-10-10` | ISO Date `YYYY-MM-DD` |
| `checkOutDate` | String | Yes | `2026-10-12` | ISO Date `YYYY-MM-DD` |
| `adultsCount` | Integer | Yes | `4` | Adults (13+) |
| `childrenCount`| Integer | No | `1` | Children count (0+) |
| `childAges` | String/List | Conditional | `6` or `6,8` | Comma-separated ages if `childrenCount > 0` |
| `infantsCount` | Integer | No | `1` | Infants (0–2 yrs, default: 0) |
| `isGroupBooking`| Boolean | No | `false` | True for whole property group booking |

#### Response JSON Schema (`accommodationSolutions`):
```json
{
  "statusCode": 200,
  "data": {
    "propertyId": "8a2c4e12-...",
    "propertyName": "Serene Lake Homestay",
    "accommodationSolutions": [
      {
        "id": "sol_lakeview_2rooms",
        "solutionName": "Lake View Haven (2 Rooms)",
        "totalRooms": 2,
        "isRecommended": true,
        "badge": "Best Value",
        "numberOfNights": 2,
        "pricing": {
          "baseAmount": 11428.58,
          "extraAmount": 0.0,
          "taxAmount": 571.42,
          "taxRate": 5,
          "isGstInclusive": true,
          "totalPrice": 12000.0,
          "pricePerNight": 6000.0,
          "currency": "INR"
        },
        "rooms": [
          {
            "roomTypeId": "rt_lakeview_id",
            "roomTypeName": "Lake View Haven",
            "adults": 2,
            "children": 1,
            "childAges": [6],
            "infants": 0,
            "extraAdults": 0,
            "extraChildren": 0,
            "basePricePerNight": 3000.0,
            "totalPricePerNight": 3000.0,
            "maxPhysicalAdults": 3,
            "maxPhysicalChildren": 1,
            "maxPhysicalInfants": 1
          },
          {
            "roomTypeId": "rt_lakeview_id",
            "roomTypeName": "Lake View Haven",
            "adults": 2,
            "children": 0,
            "childAges": [],
            "infants": 1,
            "extraAdults": 0,
            "extraChildren": 0,
            "basePricePerNight": 3000.0,
            "totalPricePerNight": 3000.0,
            "maxPhysicalAdults": 3,
            "maxPhysicalChildren": 1,
            "maxPhysicalInfants": 1
          }
        ]
      }
    ]
  }
}
```

---

### 4.2. Live Price Calculation API

#### `POST /api/bookings/calculate-price`
Used by the mobile client when adjusting room allocations or custom solutions.

#### Request Body:
```json
{
  "roomTypeId": "8a2c4e12-...",
  "checkInDate": "2026-10-10",
  "checkOutDate": "2026-10-12",
  "adultsCount": 2,
  "childrenCount": 1,
  "childAges": [6],
  "infantsCount": 0,
  "roomCount": 1,
  "couponCode": "SUMMER10"
}
```

#### Response Body:
```json
{
  "baseAmount": 5714.29,
  "extraAdultAmount": 0.0,
  "extraChildAmount": 0.0,
  "taxAmount": 285.71,
  "taxRate": 5,
  "isGstInclusive": true,
  "offerDiscountAmount": 0.0,
  "totalAmount": 6000.0
}
```

---

### 4.3. Booking Creation API

#### `POST /api/bookings/public` (Guest OTA App)
#### `POST /api/bookings` (PMS Property Staff App)

#### Request Payload:
```json
{
  "propertyId": "8a2c4e12-0000-0000-0000-000000000000",
  "roomTypeId": "rt_primary_id",
  "checkInDate": "2026-10-10",
  "checkOutDate": "2026-10-12",
  "adultsCount": 4,
  "childrenCount": 1,
  "childAges": [6],
  "infantsCount": 1,
  "roomsCount": 2,
  "guestName": "Jane Doe",
  "guestEmail": "jane@example.com",
  "guestPhone": "+919876543210",
  "paymentMethod": "ONLINE",
  "paymentOption": "FULL",
  "roomAllocations": [
    {
      "roomTypeId": "rt_lakeview_id",
      "roomId": "room_phys_101_id",
      "adults": 2,
      "children": 1,
      "childAges": [6],
      "infants": 0
    },
    {
      "roomTypeId": "rt_lakeview_id",
      "roomId": "room_phys_505_id",
      "adults": 2,
      "children": 0,
      "childAges": [],
      "infants": 1
    }
  ],
  "guests": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "phone": "+919876543210"
    }
  ]
}
```

#### Response (HTTP 201 Created):
```json
{
  "statusCode": 201,
  "data": {
    "id": "4cf658b3-...",
    "bookingNumber": "BK-20261010-0001",
    "baseAmount": 11428.58,
    "taxAmount": 571.42,
    "totalAmount": 12000.0,
    "childAges": [6],
    "infantsCount": 1,
    "bookingRooms": [
      {
        "id": "br_1",
        "roomId": "room_phys_101_id",
        "roomTypeId": "rt_lakeview_id",
        "adultsCount": 2,
        "childrenCount": 1,
        "childAges": [6],
        "infantsCount": 0,
        "totalPricePerNight": 3000.0
      },
      {
        "id": "br_2",
        "roomId": "room_phys_505_id",
        "roomTypeId": "rt_lakeview_id",
        "adultsCount": 2,
        "childrenCount": 0,
        "childAges": [],
        "infantsCount": 1,
        "totalPricePerNight": 3000.0
      }
    ]
  }
}
```

---

## 5. Dart Data Models for Flutter

Below are production-ready Dart data models compatible with `json_serializable` or manual serialization:

### 5.1. Solution Pricing Model (`solution_pricing.dart`)
```dart
class SolutionPricing {
  final double baseAmount;
  final double extraAmount;
  final double taxAmount;
  final int taxRate;
  final bool isGstInclusive;
  final double totalPrice;
  final double pricePerNight;
  final String currency;

  SolutionPricing({
    required this.baseAmount,
    required this.extraAmount,
    required this.taxAmount,
    required this.taxRate,
    required this.isGstInclusive,
    required this.totalPrice,
    required this.pricePerNight,
    this.currency = 'INR',
  });

  factory SolutionPricing.fromJson(Map<String, dynamic> json) {
    return SolutionPricing(
      baseAmount: (json['baseAmount'] as num?)?.toDouble() ?? 0.0,
      extraAmount: (json['extraAmount'] as num?)?.toDouble() ?? 0.0,
      taxAmount: (json['taxAmount'] as num?)?.toDouble() ?? 0.0,
      taxRate: json['taxRate'] as int? ?? 0,
      isGstInclusive: json['isGstInclusive'] as bool? ?? false,
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0.0,
      pricePerNight: (json['pricePerNight'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'INR',
    );
  }

  Map<String, dynamic> toJson() => {
    'baseAmount': baseAmount,
    'extraAmount': extraAmount,
    'taxAmount': taxAmount,
    'taxRate': taxRate,
    'isGstInclusive': isGstInclusive,
    'totalPrice': totalPrice,
    'pricePerNight': pricePerNight,
    'currency': currency,
  };
}
```

### 5.2. Accommodation Solution Model (`accommodation_solution.dart`)
```dart
class AccommodationSolution {
  final String id;
  final String solutionName;
  final int totalRooms;
  final bool isRecommended;
  final String? badge;
  final int numberOfNights;
  final SolutionPricing pricing;
  final List<RoomAllocationItem> rooms;

  AccommodationSolution({
    required this.id,
    required this.solutionName,
    required this.totalRooms,
    required this.isRecommended,
    this.badge,
    required this.numberOfNights,
    required this.pricing,
    required this.rooms,
  });

  factory AccommodationSolution.fromJson(Map<String, dynamic> json) {
    return AccommodationSolution(
      id: json['id'] as String? ?? '',
      solutionName: json['solutionName'] as String? ?? '',
      totalRooms: json['totalRooms'] as int? ?? 1,
      isRecommended: json['isRecommended'] as bool? ?? false,
      badge: json['badge'] as String?,
      numberOfNights: json['numberOfNights'] as int? ?? 1,
      pricing: SolutionPricing.fromJson(json['pricing'] ?? {}),
      rooms: (json['rooms'] as List<dynamic>?)
              ?.map((r) => RoomAllocationItem.fromJson(r as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class RoomAllocationItem {
  final String roomTypeId;
  final String? roomId;
  final String? roomTypeName;
  final int adults;
  final int children;
  final List<int> childAges;
  final int infants;
  final double? totalPricePerNight;

  RoomAllocationItem({
    required this.roomTypeId,
    this.roomId,
    this.roomTypeName,
    required this.adults,
    required this.children,
    this.childAges = const [],
    this.infants = 0,
    this.totalPricePerNight,
  });

  factory RoomAllocationItem.fromJson(Map<String, dynamic> json) {
    return RoomAllocationItem(
      roomTypeId: json['roomTypeId'] as String? ?? '',
      roomId: json['roomId'] as String?,
      roomTypeName: json['roomTypeName'] as String?,
      adults: json['adults'] as int? ?? 1,
      children: json['children'] as int? ?? 0,
      childAges: (json['childAges'] as List<dynamic>?)
              ?.map((e) => e as int)
              .toList() ??
          [],
      infants: json['infants'] as int? ?? 0,
      totalPricePerNight: (json['totalPricePerNight'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'roomTypeId': roomTypeId,
    if (roomId != null) 'roomId': roomId,
    'adults': adults,
    'children': children,
    'childAges': childAges,
    'infants': infants,
  };
}
```

---

## 6. Edge Cases & Validation Checklist for Flutter

1. **Child Ages Synchronisation**:
   - `childAges.length` must strictly match `childrenCount`.
   - Every child age must satisfy: `3 <= age <= 12`.
2. **Zero Infant Penalty**:
   - Infants (`infantsCount`) must never be added to `adultsCount` or `childrenCount`.
   - Infant validation checks only `roomType.maxPhysicalInfants` (typically 1 to 2 infants per room).
3. **Price Display Formatting**:
   - If `pricing.isGstInclusive == true`: Display as `₹12,000 (Incl. ₹571.42 GST)`.
   - If `pricing.isGstInclusive == false`: Display as `₹12,000 + ₹600 GST = ₹12,600`.
4. **Room Allocations on Checkout**:
   - When the user selects a solution, pass its `solution.rooms` directly as `roomAllocations` in the booking payload.
   - Do **not** invent or compute your own totals on the client; always submit room allocations and let the backend return the authoritative final total.
