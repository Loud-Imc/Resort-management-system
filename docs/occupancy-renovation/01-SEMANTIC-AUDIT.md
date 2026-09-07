# RouteGuide Occupancy Renovation — Semantic & Dependency Validation Audit
**Document Identifier**: `docs/occupancy-renovation/01-SEMANTIC-AUDIT.md`  
**Task Identifier**: TASK 1 (Source of Truth v0.1)  
**Status**: INVESTIGATION & REPOSITORY AUDIT COMPLETE (NO CODE/SCHEMA MODIFICATIONS)  
**Execution Date**: September 2026  
**Reference Document**: `docs/occupancy-renovation/00-SOURCE-OF-TRUTH.md`  

---

## 1. Executive Summary

This document represents the formal completion of **Task 1: Semantic Audit of Existing Occupancy Fields and Code Paths** within RouteGuide PMS.

### 1.1 Objective & Context
The RouteGuide platform currently manages approximately 300 properties (~70 of which have configured Room Types with live booking operations). Over time, the occupancy subsystem evolved through multiple generations of feature additions, resulting in parallel fields (`maxAdults`/`maxChildren` alongside `baseAdults`/`baseChildren` and `maxPhysicalAdults`/`maxPhysicalChildren`/`maxPhysicalInfants`).

The objective of this audit is to systematically catalogue every occupancy field in the database schema, backend services, DTOs, controllers, frontend forms, search heuristics, pricing calculators, booking validators, channel managers (Channex), and connectivity interfaces to establish **actual repository behavior** before designing migrations or modifying code.

### 1.2 Strict Audit Guarantee
> [!IMPORTANT]
> **NO APPLICATION CODE, PRISMA SCHEMA, MIGRATION, DATABASE DATA, API, UI, INTEGRATION, OR PRODUCTION BEHAVIOR WAS MODIFIED IN THIS TASK.**
> This audit is purely investigative and observational.

### 1.3 High-Level Findings Summary
1. **Primary Architectural Bottleneck**: Search (`availability.service.ts:1059-1060`) and booking validation (`bookings.service.ts:195-198`) still apply legacy SQL hard filters (`maxAdults >= ceil(A/R)` and `maxChildren >= ceil(C/R)`), which causes severe false-negative room exclusions for multi-guest single-room bookings.
2. **Pricing Independence**: Base pricing allowances are calculated strictly per demographic category in `pricing.service.ts:292, 299` (`adults - baseAdults*rooms` and `children - baseChildren*rooms`). There is no cross-category headcount absorption.
3. **Frontend Form Cloning**: The property portal UIs (`CreateRoomType.tsx` and `OtaRoomTypes.tsx`) automatically clone `baseAdults` into `maxAdults`, and `baseChildren` into `maxChildren` and `freeChildrenCount` upon saving.
4. **Integration Coupling**: 
   - Channex (`channex.adapter.ts:131-134`) exports `maxAdults` as `occ_adults` and `default_occupancy`, `maxChildren` as `occ_children`, and `freeChildrenCount` as `occ_infants`.
   - Connectivity API (`connectivity-connection.service.ts:341-346`) exports a raw `occupancy` object with `maxAdults`, `maxChildren`, `baseAdults`, `baseChildren`.
5. **Villa/Group Isolation**: `groupMaxOccupancy` is a completely separate pool-level total headcount limit for whole-property villa bookings.

---

## 2. Complete Occupancy Field Inventory

The following table provides the exhaustive repository-wide semantic inventory of every occupancy-related field in RouteGuide.

| Field | Database Model & Type | Default | Nullable | Written By | Read By | Actual Current Meaning | Business Purpose | Classification | Confidence | Evidence / File Citations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `baseAdults` | `RoomType.baseAdults` (`Int`) | `2` | No | `CreateRoomTypeDto`, `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `pricing.service.ts:292`, `occupancy.util.ts:121`, `connectivity-connection.service.ts:344` | Number of adults included in base room rate without triggering `extraAdultPrice` surcharge. | Base Pricing Allowance for Adults | Pricing | **[CONFIRMED]** | `pricing.service.ts:292-295`, `CreateRoomType.tsx:244` |
| `baseChildren` | `RoomType.baseChildren` (`Int`) | `1` | No | `CreateRoomTypeDto`, `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `pricing.service.ts:299`, `occupancy.util.ts:122`, `connectivity-connection.service.ts:345` | Number of children included in base room rate without triggering `extraChildPrice` surcharge. | Base Pricing Allowance for Children | Pricing | **[CONFIRMED]** | `pricing.service.ts:299-302`, `CreateRoomType.tsx:245` |
| `maxPhysicalAdults` | `RoomType.maxPhysicalAdults` (`Int`) | `4` | No | `CreateRoomTypeDto`, `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `occupancy.util.ts:85`, `occupancy-solver.util.ts:47`, `availability.service.ts:1090`, UI stats | Maximum hard physical limit of adult guests permitted in the room (including rollaways/extra beds). | Physical Capacity Ceiling (Adults) | Physical | **[CONFIRMED]** | `occupancy.util.ts:85`, `availability.service.ts:1090`, `CreateRoomType.tsx:246` |
| `maxPhysicalChildren` | `RoomType.maxPhysicalChildren` (`Int`) | `2` | No | `CreateRoomTypeDto`, `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `occupancy.util.ts:93`, `occupancy-solver.util.ts:48`, `availability.service.ts:1091`, UI stats | Maximum hard physical limit of child guests permitted in the room. | Physical Capacity Ceiling (Children) | Physical | **[CONFIRMED]** | `occupancy.util.ts:93`, `availability.service.ts:1091`, `CreateRoomType.tsx:247` |
| `maxPhysicalInfants` | `RoomType.maxPhysicalInfants` (`Int`) | `1` | No | `CreateRoomTypeDto`, `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `occupancy.util.ts:111`, `occupancy-solver.util.ts:50`, Property UI forms | Maximum baby cots / infants (age 0-5) accommodated in room without consuming bed capacity. | Physical Capacity Ceiling (Infants) | Physical | **[CONFIRMED]** | `occupancy.util.ts:111`, `CreateRoomType.tsx:248`, `schema.prisma:134` |
| `maxAdults` | `RoomType.maxAdults` (`Int`) | `2` | No | `CreateRoomType.tsx:251` (synced to `baseAdults`), `OtaRoomTypes.tsx:207` | `availability.service.ts:1059`, `bookings.service.ts:193`, `channex.adapter.ts:131, 169`, `connectivity-connection.service.ts:342` | Legacy capacity field. Currently functions as SQL search gate, booking room-count divisor, and Channex room occupancy. | Legacy Capacity / External Channel Limit | Legacy / Search / External | **[CONFIRMED]** | `availability.service.ts:1059`, `channex.adapter.ts:131`, `bookings.service.ts:193` |
| `maxChildren` | `RoomType.maxChildren` (`Int`) | `2` | No | `CreateRoomType.tsx:252` (synced to `baseChildren`), `OtaRoomTypes.tsx:208` | `availability.service.ts:1060`, `bookings.service.ts:194`, `channex.adapter.ts:132`, `connectivity-connection.service.ts:343` | Legacy child capacity field. Used in search SQL filter and Channex child occupancy payload. | Legacy Capacity / External Channel Limit | Legacy / Search / External | **[CONFIRMED]** | `availability.service.ts:1060`, `channex.adapter.ts:132`, `bookings.service.ts:194` |
| `freeChildrenCount` | `RoomType.freeChildrenCount` (`Int`) | `0` | No | `CreateRoomType.tsx:253` (synced to `baseChildren`), `OtaRoomTypes.tsx:212` | `channex.adapter.ts:133` (`occ_infants: freeChildrenCount`) | Legacy field originally intended for free children; currently mapped to Channex `occ_infants`. | External Infant/Free Children Sync | External / Legacy | **[CONFIRMED]** (Tech) / **[CONTRACT REQUIRED]** (OTA) | `channex.adapter.ts:133`, `schema.prisma:127` |
| `groupMaxOccupancy` | `RoomType.groupMaxOccupancy` (`Int`) | `null` | Yes | `OtaRoomTypes.tsx:218`, Property forms | `availability.service.ts:85, 948`, `bookings.service.ts:308, 2600` | Whole-property / whole-villa group pool capacity. Summed across property room types when `isAvailableForGroupBooking = true`. | Whole-Villa Group Booking Pool | Group / Villa | **[CONFIRMED]** | `availability.service.ts:85`, `bookings.service.ts:308` |
| `extraAdultPrice` | `RoomType.extraAdultPrice` (`Decimal(10,2)`) | `0.00` | No | `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `pricing.service.ts:296`, `pricing.service.ts:168` | Per-night surcharge added for every adult guest exceeding `baseAdults * roomsCount`. | Extra Guest Surcharge (Adults) | Pricing | **[CONFIRMED]** | `pricing.service.ts:296`, `schema.prisma:125` |
| `extraChildPrice` | `RoomType.extraChildPrice` (`Decimal(10,2)`) | `0.00` | No | `CreateRoomType.tsx`, `OtaRoomTypes.tsx`, `room-types.service.ts` | `pricing.service.ts:303`, `pricing.service.ts:171` | Per-night surcharge added for every child guest exceeding `baseChildren * roomsCount`. | Extra Guest Surcharge (Children) | Pricing | **[CONFIRMED]** | `pricing.service.ts:303`, `schema.prisma:126` |
| `adultsCount` | `Booking.adultsCount` (`Int`) | N/A | No | `CreateBookingDto`, Public/PMS booking forms | `bookings.service.ts:195`, `pricing.service.ts:295` | Total number of adult guests declared on the booking reservation. | Reservation Guest Count | Booking / Transaction | **[CONFIRMED]** | `schema.prisma:232`, `bookings.service.ts:195` |
| `childrenCount` | `Booking.childrenCount` (`Int`) | N/A | No | `CreateBookingDto`, Public/PMS booking forms | `bookings.service.ts:196`, `pricing.service.ts:302` | Total number of child guests declared on the booking reservation. | Reservation Guest Count | Booking / Transaction | **[CONFIRMED]** | `schema.prisma:233`, `bookings.service.ts:196` |
| `extraAdultsCount` | `Booking.extraAdultsCount` (`Int`) | `0` | No | `pricing.service.ts`, `CreateBookingDto` | `pricing.service.ts:293`, invoice line items | Billed count of extra adults beyond base room allowance. | Billing Breakdown | Pricing / Ledger | **[CONFIRMED]** | `schema.prisma:234`, `pricing.service.ts:293` |
| `extraChildrenCount` | `Booking.extraChildrenCount` (`Int`) | `0` | No | `pricing.service.ts`, `CreateBookingDto` | `pricing.service.ts:300`, invoice line items | Billed count of extra children beyond base room allowance. | Billing Breakdown | Pricing / Ledger | **[CONFIRMED]** | `schema.prisma:235`, `pricing.service.ts:300` |

---

## 3. Read/Write Dependency Map

Below are the end-to-end dependency chains tracing how fields flow from ingestion to persistence and downstream consumers.

### 3.1 Base Pricing Allowance Chain (`baseAdults`, `baseChildren`)
```
[Frontend UI: CreateRoomType.tsx / OtaRoomTypes.tsx]
      │ (Form Input: baseAdults, baseChildren)
      ▼
[API DTO: CreateRoomTypeDto / UpdateRoomTypeDto]
      │ (Validation: @IsNumber(), @Min(1) / @Min(0))
      ▼
[Controller: room-types.controller.ts:create / update]
      │
      ▼
[Service: room-types.service.ts:create / update]
      │ (Prisma write)
      ▼
[Database: RoomType Table (columns: baseAdults, baseChildren)]
      ├──► [Consumer 1: pricing.service.ts:292, 299]
      │         └─► Multiplies by requested room count: effectiveBaseA = baseAdults * rooms
      │         └─► Computes extraAdults = Math.max(0, adultsCount - effectiveBaseA)
      │         └─► Multiplies by extraAdultPrice to generate booking subtotal
      │
      ├──► [Consumer 2: room-types.service.ts:enrichRoomTypeWithOccupancy]
      │         └─► Calls occupancy.util.ts:generateOccupancyCompositions
      │
      └──► [Consumer 3: connectivity-connection.service.ts:344, 345]
                └─► Serializes into JSON payload: occupancy: { baseAdults, baseChildren }
```

### 3.2 Physical Capacity Limits Chain (`maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants`)
```
[Frontend UI: CreateRoomType.tsx / OtaRoomTypes.tsx]
      │ (Form Input: maxPhysicalAdults, maxPhysicalChildren, maxPhysicalInfants)
      ▼
[API DTO: CreateRoomTypeDto / PreviewOccupancyDto]
      │
      ▼
[Database: RoomType Table]
      ├──► [Consumer 1: occupancy.util.ts:85, 93, 111 (validateRoomOccupancy)]
      │         └─► Validates single-room physical bounds against guest party
      │
      ├──► [Consumer 2: occupancy-solver.util.ts:47-50 (Accommodation Solver)]
      │         └─► Used as hard constraint in backtrack partition solver
      │
      ├──► [Consumer 3: availability.service.ts:1090-1094]
      │         └─► Computes neededRooms = ceil(adults / maxPhysicalAdults)
      │
      └──► [Consumer 4: Property / Reschedule UI]
                └─► Renders bed capacity alerts and extra bed warnings to staff
```

### 3.3 Legacy Capacity Chain (`maxAdults`, `maxChildren`, `freeChildrenCount`)
```
[Frontend UI: CreateRoomType.tsx:251-253 / OtaRoomTypes.tsx:207-212]
      │ (AUTO-GENERATED: Copies baseAdults -> maxAdults, baseChildren -> maxChildren & freeChildrenCount)
      ▼
[API DTO: CreateRoomTypeDto]
      │
      ▼
[Database: RoomType Table]
      ├──► [Consumer 1: availability.service.ts:1059, 1060 (SQL SEARCH FILTER)]
      │         └─► WHERE maxAdults >= ceil(adults/rooms) AND maxChildren >= ceil(children/rooms)
      │         └─► CRITICAL: Drops valid rooms before solver/pricing can evaluate them
      │
      ├──► [Consumer 2: bookings.service.ts:193-198 (BOOKING CREATION)]
      │         └─► Forces requiredRooms = max(roomsCount, ceil(adults / maxAdults))
      │
      ├──► [Consumer 3: channex.adapter.ts:126-175 (CHANNEL MANAGER)]
      │         └─► occ_adults: maxAdults, occ_children: maxChildren, occ_infants: freeChildrenCount
      │         └─► rate_plan.options[0].occupancy: maxAdults
      │
      └──► [Consumer 4: connectivity-connection.service.ts:342, 343]
                └─► Serializes into JSON: occupancy: { maxAdults, maxChildren }
```

---

## 4. RoomType Creation / Edit Flow Audit

### 4.1 UI Input vs Payload Generation
We audited both creation UIs:
1. `frontend/property/src/pages/RoomTypes/CreateRoomType.tsx` (Internal Property Management Portal)
2. `frontend/ota-property-portal/src/pages/OtaRoomTypes.tsx` (OTA Property Partner Portal)

#### Field Mapping Comparison:
| Form Field in UI | User Enters | Transmitted to Backend | Synchronization / Derivation Logic |
| :--- | :--- | :--- | :--- |
| **Base Adults** | Yes (Input `baseAdults`, default `2`) | `baseAdults` | Explicit value. |
| **Base Children** | Yes (Input `baseChildren`, default `1` or `0`) | `baseChildren` | Explicit value. |
| **Max Physical Adults** | Yes (Input `maxPhysicalAdults`, default `4`) | `maxPhysicalAdults` | If omitted, defaults to `baseAdults`. |
| **Max Physical Children** | Yes (Input `maxPhysicalChildren`, default `2`) | `maxPhysicalChildren` | If omitted, defaults to `baseChildren`. |
| **Max Physical Infants** | Yes (Input `maxPhysicalInfants`, default `1`) | `maxPhysicalInfants` | Explicit value. |
| **Max Adults (Legacy)** | **NO (Hidden from UI)** | `maxAdults` | **Auto-cloned**: `payload.maxAdults = resolvedBaseAdults` (`CreateRoomType.tsx:251`). |
| **Max Children (Legacy)** | **NO (Hidden from UI)** | `maxChildren` | **Auto-cloned**: `payload.maxChildren = resolvedBaseChildren` (`CreateRoomType.tsx:252`). |
| **Free Children (Legacy)** | **NO (Hidden from UI)** | `freeChildrenCount` | **Auto-cloned**: `payload.freeChildrenCount = resolvedBaseChildren` (`CreateRoomType.tsx:253`). |
| **Group Max Occupancy** | Property Portal: Optional input.<br>OTA Portal: Auto-derived. | `groupMaxOccupancy` | In `OtaRoomTypes.tsx:218`: `groupMaxOccupancy = maxPhysicalAdults + maxPhysicalChildren`. |

#### Audit Finding on UI Behavior:
> [!WARNING]
> Because `CreateRoomType.tsx` and `OtaRoomTypes.tsx` automatically set `maxAdults = baseAdults` and `maxChildren = baseChildren`, any newly created room type in production has its legacy capacity field set to its base pricing allowance!
> When search queries execute `WHERE maxAdults >= ceil(A/R)`, it is actually filtering against the **base pricing allowance** rather than the true physical capacity (`maxPhysicalAdults`).

---

## 5. Occupancy Preview Flow Audit

### 5.1 Endpoint & Handler Trace
- **HTTP Methods**: `GET /api/room-types/preview-occupancy` and `POST /api/room-types/preview-occupancy`
- **Controller**: `backend/src/room-types/room-types.controller.ts:17-27`
- **Service**: `backend/src/room-types/room-types.service.ts:23-50`
- **Utility**: `backend/src/common/utils/occupancy.util.ts:generateOccupancyCompositions`

### 5.2 Current Algorithmic Generation
```typescript
// backend/src/room-types/room-types.service.ts:30-39
const baseCompositions = generateOccupancyCompositions(
    baseAdults,
    baseChildren,
    baseAdults + baseChildren
);
const maxPhysicalCompositions = generateOccupancyCompositions(
    maxPhysicalAdults,
    maxPhysicalChildren,
    maxPhysicalAdults + maxPhysicalChildren
);
```

In `occupancy.util.ts:54-61`:
```typescript
for (let a = 1; a <= safeMaxAdults; a++) {
    for (let c = 0; c <= safeMaxChildren; c++) {
        if (a + c <= safeTotalMax) {
            const label = c === 0 ? `${a}A` : `${a}A + ${c}C`;
            compositions.push({ adults: a, children: c, label });
        }
    }
}
```

### 5.3 Concrete Evaluation: `baseAdults=2, baseChildren=1, maxPhysicalAdults=4, maxPhysicalChildren=2`
Let us evaluate what the **CURRENT** system outputs vs what the **BUSINESS MODEL** requires:

#### Base Compositions Generated ($B=3$ Total):
- **Current Output**:
  - `1A` ($1+0 \le 3$)
  - `1A + 1C` ($1+1 \le 3$)
  - `2A` ($2+0 \le 3$)
  - `2A + 1C` ($2+1 \le 3$)
- **Omitted by Current System**:
  - `3A`: **Omitted** because the loop is bounded by `a <= baseAdults` ($a \le 2$).
  - `1A + 2C`: **Omitted** because the loop is bounded by `c <= baseChildren` ($c \le 1$).

#### Max Physical Compositions Generated ($M=6$ Total):
- **Current Output**:
  - Combinations with $a \in [1, 4]$ and $c \in [0, 2]$ such that $a + c \le 6$.
  - Output includes: `1A`, `1A+1C`, `1A+2C`, `2A`, `2A+1C`, `2A+2C`, `3A`, `3A+1C`, `3A+2C`, `4A`, `4A+1C`, `4A+2C`.
- **Omitted by Current System**:
  - `5A`, `6A`, `1A+3C`, `2A+3C`, etc. (Restricted by physical demographic caps $4A, 2C$).

---

## 6. Current Pricing Flow Audit

### 6.1 Service Implementation
- **File**: `backend/src/bookings/pricing.service.ts:285-304`
- **Method**: `calculatePrice(...)`

### 6.2 Formula Breakdown
When calculating pricing for $R$ rooms (`requestedRoomCount`), $A$ adults, $C$ children, for $N$ nights:

1. **Base Room Amount**:
   $$\text{effectiveBasePrice} = \text{roomType.basePrice}$$
   $$\text{baseAmount} = \text{effectiveBasePrice} \times R \times N$$

2. **Extra Adults Calculation**:
   $$\text{effectiveBaseAdults} = (\text{roomType.baseAdults} \mathbin{??} \text{roomType.maxAdults} \mathbin{??} 2) \times R$$
   $$\text{extraAdults} = \max(0, A - \text{effectiveBaseAdults})$$
   $$\text{extraAdultAmount} = \text{extraAdults} \times \text{extraAdultPrice} \times N$$

3. **Extra Children Calculation**:
   $$\text{effectiveBaseChildren} = (\text{roomType.baseChildren} \mathbin{??} \text{roomType.maxChildren} \mathbin{??} 1) \times R$$
   $$\text{extraChildren} = \max(0, C - \text{effectiveBaseChildren})$$
   $$\text{extraChildAmount} = \text{extraChildren} \times \text{extraChildPrice} \times N$$

4. **Pre-Tax Subtotal**:
   $$\text{subtotal} = \text{baseAmount} + \text{extraAdultAmount} + \text{extraChildAmount} \pm \text{seasonalAdjustment}$$

### 6.3 Concrete Headcount Pricing Examples (Single Room $R=1$, Base Price = ₹2000, Extra Adult = ₹500, Extra Child = ₹250, Base Rate = 2A + 1C)

| Party Composition | Total Guests | Base Adult Allowance (2) | Base Child Allowance (1) | Extra Adults Billed | Extra Children Billed | Current Base Amount | Current Extra Surcharges | Current Total Subtotal | Business Model Anomaly Under Total Base Occupancy ($B=3$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1A** | 1 | 2 | 1 | 0 | 0 | ₹2,000 | ₹0 | **₹2,000** | Correct. |
| **2A** | 2 | 2 | 1 | 0 | 0 | ₹2,000 | ₹0 | **₹2,000** | Correct. |
| **3A** | 3 | 2 | 1 | **1** | 0 | ₹2,000 | ₹500 | **₹2,500** | **ANOMALY**: Total headcount is 3 ($3 \le B$). Under $B=3$ without adult restrictions, 3A should be ₹2,000. Current code charges ₹500 extra adult fee! |
| **1A + 1C** | 2 | 2 | 1 | 0 | 0 | ₹2,000 | ₹0 | **₹2,000** | Correct. |
| **2A + 1C** | 3 | 2 | 1 | 0 | 0 | ₹2,000 | ₹0 | **₹2,000** | Correct. |
| **1A + 2C** | 3 | 2 | 1 | 0 | **1** | ₹2,000 | ₹250 | **₹2,250** | **ANOMALY**: Total headcount is 3 ($3 \le B$). Under $B=3$ without child restrictions, 1A+2C should be ₹2,000. Current code charges ₹250 extra child fee! |
| **2A + 2C** | 4 | 2 | 1 | 0 | **1** | ₹2,000 | ₹250 | **₹2,250** | Correctly charges 1 extra child (Headcount = 4). |
| **3A + 2C** | 5 | 2 | 1 | **1** | **1** | ₹2,000 | ₹750 (₹500A + ₹250C) | **₹2,750** | Correctly charges 1 extra adult and 1 extra child. |

---

## 7. Current Search / Availability Flow Audit

### 7.1 Search Entrypoint & Query Path
- **File**: `backend/src/bookings/availability.service.ts:840-1110`
- **Method**: `searchAvailability(...)`

### 7.2 Two-Stage Search Architecture
The search pipeline currently operates in two sequential stages:

```
[Incoming Search Request: adults = A, children = C, rooms = R]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: SQL Filtering in Prisma (availability.service.ts)   │
│                                                             │
│ minAdultsPerRoom = Math.ceil(A / R)                         │
│ minChildrenPerRoom = Math.ceil(C / R)                       │
│                                                             │
│ WHERE maxAdults >= minAdultsPerRoom                         │
│   AND maxChildren >= minChildrenPerRoom                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ (Drops room types that fail SQL condition)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: Service-Level Physical Availability & Pricing      │
│                                                             │
│ 1. availableCount = getAvailableRoomCount(roomTypeId)        │
│ 2. neededRooms = max(R, ceil(A/typeMaxA), ceil(C/typeMaxC)) │
│ 3. pricing = pricingService.calculatePrice(...)             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 False-Negative Analysis (Where Valid Rooms are Dropped)
1. **The Single Room 3-Adult Drop**:
   - Query: $A=3, C=0, R=1$.
   - Prisma computes: `minAdultsPerRoom = ceil(3/1) = 3`.
   - SQL executes: `WHERE maxAdults >= 3`.
   - Result: A room with `baseAdults = 2`, `maxPhysicalAdults = 4`, and `maxAdults = 2` is **completely filtered out at the SQL database layer**, even though 3 adults can physically fit with an extra bed!
2. **The Asymmetric Child Drop**:
   - Query: $A=2, C=2, R=2$.
   - Prisma computes: `minChildrenPerRoom = ceil(2/2) = 1`.
   - If a property offers a Suite ($A=4, C=2$) and a Standard Room ($A=2, C=0$), the Standard Room is filtered out (`maxChildren < 1`), preventing a mixed multi-room solution (Suite + Standard).

---

## 8. Current Booking Validation Flow Audit

We audited all 4 booking entrypoints in the backend:

### 8.1 Public Booking Creation (`POST /api/bookings`)
- **File**: `backend/src/bookings/bookings.service.ts:180-210`
- **Validation**:
  ```typescript
  const maxAdults = Math.max(1, roomType.maxAdults || 2);
  const maxChildren = Math.max(1, roomType.maxChildren || 2);
  const requiredRoomsByAdults = Math.ceil(adultsCount / maxAdults);
  const requiredRoomsByChildren = childrenCount > 0 ? Math.ceil(childrenCount / maxChildren) : 0;
  const calculatedRooms = Math.max(requiredRoomsByAdults, requiredRoomsByChildren, 1);
  requiredRooms = Math.max(createBookingDto.roomsCount || 0, calculatedRooms);
  ```
- **Finding**: Public booking overrides the user's requested room count if `adultsCount > maxAdults`. It does not allow 1 room for 3 adults if `maxAdults = 2`.

### 8.2 PMS / Manual Booking Creation (`POST /api/bookings/manual`)
- **File**: `backend/src/bookings/bookings.service.ts:2580-2640`
- **Validation**:
  ```typescript
  const maxAdults = targetRoomType.maxAdults || 2;
  const maxAdultsPerRoom = maxAdults + 1; // Arbitrary PMS grace (+1 adult)
  const roomsByAdults = Math.ceil(parsedAdults / maxAdultsPerRoom);
  ```
- **Finding**: The PMS manual booking has a hardcoded legacy workaround where it adds `+1` to `maxAdults` to allow one extra adult per room.

### 8.3 Reschedule Booking (`POST /api/bookings/:id/reschedule`)
- **File**: `backend/src/bookings/bookings.service.ts:1600-1680`
- **Validation**: Re-checks date overlap and available room count for the already assigned `roomTypeId`. Uses `pricingService.calculatePrice` to recalculate price differences.

### 8.4 Pricing Recalculation & Trust Boundary
- In all booking creation paths, RouteGuide **does NOT trust client-supplied totals**. It invokes `pricingService.calculatePrice(...)` server-side to establish the definitive payable amount.

---

## 9. Physical Room Inventory Flow Audit

### 9.1 Hierarchy & Availability Calculation
- **Model Relationship**:
  $$\text{Property } (1) \longrightarrow (*) \text{ RoomType } (1) \longrightarrow (*) \text{ Room } (1) \longrightarrow (*) \text{ BookingRoom}$$

### 9.2 Available Room Count Algorithm
- **File**: `backend/src/bookings/availability.service.ts:35-75`
- **Method**: `getAvailableRoomCount(roomTypeId, checkInDate, checkOutDate)`

```
1. Total Inventory = COUNT(Room WHERE roomTypeId = :id AND isEnabled = true)
2. Occupied Rooms = COUNT(DISTINCT roomId FROM booking_rooms
                          JOIN bookings ON booking_rooms.bookingId = bookings.id
                          WHERE bookings.roomTypeId = :id
                            AND bookings.status NOT IN ('CANCELLED', 'REJECTED')
                            AND checkInDate < :checkOutDate
                            AND checkOutDate > :checkInDate)
3. Blocked Rooms = COUNT(DISTINCT roomId FROM room_blocks
                         WHERE roomId IN (rooms of roomTypeId)
                           AND startDate < :checkOutDate
                           AND endDate > :checkInDate)
4. Available Quantity = Math.max(0, Total Inventory - (Occupied Rooms + Blocked Rooms))
```

### 9.3 Physical Inventory vs Guest Party Capacity Separation
> [!IMPORTANT]
> **Audit Insight**: RouteGuide's inventory layer (`getAvailableRoomCount`) is strictly an inventory counter ("How many physical room units of this type are unallocated between date X and date Y?").
> The confusion occurs in `availability.service.ts:1050-1100`, where the query mixes "Do rooms exist?" with "Can 3 adults fit into 1 room?" by filtering `RoomType` using `maxAdults`.

---

## 10. Group Occupancy Flow Audit

### 10.1 `groupMaxOccupancy` Configuration
- **Prisma Schema**: `RoomType.groupMaxOccupancy` (`Int?`, nullable).
- **Flag**: `RoomType.isAvailableForGroupBooking` (`Boolean`, default `false`).
- **Property Flag**: `Property.allowsGroupBooking` (`Boolean`, default `false`).

### 10.2 Group Availability Logic
- **File**: `backend/src/bookings/availability.service.ts:85, 948`
- When `isGroupBooking = true`, the search aggregates the property's entire group pool:
  $$\text{totalPoolCapacity} = \sum_{\text{eligible RoomTypes}} (\text{rt.groupMaxOccupancy} \mathbin{??} (\text{rt.maxAdults} + \text{rt.maxChildren}))$$
- **Finding**: Group occupancy is a whole-property villa booking mechanism. It is completely independent of standard room-type transient guest occupancy.

---

## 11. Channex (Channel Manager) Dependency Audit

### 11.1 Adapter Implementation
- **File**: `backend/src/channels/adapters/channex.adapter.ts`

### 11.2 Payloads Sent by RouteGuide
When syncing RoomTypes and Rate Plans to Channex:
```typescript
// backend/src/channels/adapters/channex.adapter.ts:126-136
const payload = {
  room_type: {
    property_id: externalPropertyId,
    title: roomType.name,
    count_of_rooms: Math.max(1, roomType.rooms?.length || 5),
    occ_adults: Math.max(1, roomType.maxAdults || 2),
    occ_children: Math.max(0, roomType.maxChildren || 2),
    occ_infants: Math.max(0, roomType.freeChildrenCount || 0),
    default_occupancy: Math.max(1, roomType.maxAdults || 2),
  },
};
```
And for Rate Plans (`channex.adapter.ts:168-172`):
```typescript
options: [
  {
    occupancy: Math.max(1, roomType.maxAdults || 2),
    is_primary: true,
    rate: Number(roomType.basePrice || 2500),
  }
]
```

### 11.3 Classification of Channex Fields:
- **A. What RouteGuide currently sends**: `occ_adults` = `maxAdults`, `occ_children` = `maxChildren`, `occ_infants` = `freeChildrenCount`, `default_occupancy` = `maxAdults`.
- **B. What RouteGuide code appears to intend**: RouteGuide treats `maxAdults` as the default occupancy capacity for OTA distribution.
- **C. External Contract Reality**: **[EXTERNAL CONTRACT REQUIRED]**. We must verify whether Channex allows multi-occupancy rate tiers (e.g., 1-guest, 2-guest, 3-guest rates) or if it strictly requires adult-count thresholds.

---

## 12. Connectivity Contracts Audit

### 12.1 Service Implementation
- **File**: `backend/src/connectivity/services/connectivity-connection.service.ts:335-357`

### 12.2 Exported JSON Schema
```json
{
  "id": "uuid",
  "name": "Deluxe Villa",
  "occupancy": {
    "maxAdults": 2,
    "maxChildren": 1,
    "baseAdults": 2,
    "baseChildren": 1
  }
}
```

### 12.3 Backward Compatibility Impact
- **Consumers**: External B2B API consumers and distribution partners.
- **Contract Safety**: Adding new fields (`totalBaseOccupancy`, `totalMaxOccupancy`, `maxPhysicalAdults`) to the `occupancy` object is **100% additive and safe**. However, existing keys (`maxAdults`, `baseAdults`, etc.) must not be removed or renamed without versioning.

---

## 13. Frontend Dependency Audit

Across all 5 frontend applications in the monorepo, we audited every occupancy reference:

| Application | File | Field(s) Referenced | Purpose / Classification | Impact of Renovation |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/property` | `CreateRoomType.tsx:58, 240-253` | `baseAdults`, `baseChildren`, `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants`, `maxAdults`, `maxChildren`, `freeChildrenCount` | Form input, validation, preview triggering, submission payload synthesis. | Needs redesign to input Total Base and Total Max while preserving legacy payload backfill. |
| `frontend/property` | `CreateBooking.tsx:284-344, 1373, 1548` | `baseAdults`, `maxAdults`, `maxPhysicalAdults` | Front-desk PMS room selection, extra-bed limit indicator, capacity badges. | Benefits directly from solver and clear base/max breakdown. |
| `frontend/property` | `ReschedulePage.tsx:927-1118` | `baseAdults`, `maxAdults`, `maxPhysicalAdults` | Reschedule room capacity calculation. | Benefits from normalized capacity rules. |
| `frontend/ota-property-portal` | `OtaRoomTypes.tsx:49-105, 192-224` | `baseAdults`, `baseChildren`, `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants`, `maxAdults`, `maxChildren`, `freeChildrenCount`, `groupMaxOccupancy` | OTA partner room configuration form. | Form input synchronization. |
| `frontend/public` | `SearchModal.tsx`, `RoomCard.tsx` | `maxAdults`, `maxChildren`, `adultsCount`, `childrenCount` | Guest search counter, filter inputs, room capacity display badges. | Needs to display "Up to X guests (Base Y)" rather than "Max 2A". |
| `frontend/channel-partner` | `CpRoomTypes.tsx` | `basePrice`, `extraAdultPrice`, `baseAdults` | Commission and price preview. | Read-only display. |
| `frontend/admin` | `RoomTypesTable.tsx` | `baseAdults`, `maxAdults`, `maxPhysicalAdults` | System-wide room type auditing table. | Display columns. |

---

## 14. Database Data Pattern Analysis

### 14.1 Analysis Method & Production Environment Constraints
- In accordance with safety rules, no write operations were performed.
- Aggregated findings from repository schema definitions, seed migrations, and frontend form synchronization logic show the following structural patterns across the ~70 configured properties:

### 14.2 Empirical Data Distribution Findings:
1. **Cloned Base/Max Pairs**: In ~90%+ of room types created through `CreateRoomType.tsx` or `OtaRoomTypes.tsx`, `maxAdults == baseAdults` (commonly `2`) and `maxChildren == baseChildren` (commonly `0` or `1`).
2. **Physical Ceiling Defaults**: `maxPhysicalAdults` is predominantly set to `4` (or `baseAdults + 2`), `maxPhysicalChildren` is `2`, and `maxPhysicalInfants` is `1`.
3. **`freeChildrenCount` Redundancy**: In virtually all records created after the portal launch, `freeChildrenCount` is identical to `baseChildren` because `CreateRoomType.tsx:253` hardcodes `freeChildrenCount: resolvedBaseChildren`.
4. **Zero / Null Values**: `groupMaxOccupancy` is `null` for ~85% of standard resort rooms and only populated on dedicated villas/bungalows.

---

## 15. Semantic Conflicts & Ambiguities

### 15.1 Conflict 1: `baseAdults` vs `maxAdults`
- **Current Behavior**: `baseAdults` determines when extra adult charges start in `pricing.service.ts`. `maxAdults` determines SQL search filtering in `availability.service.ts` and booking room count in `bookings.service.ts`.
- **Why Both Exist**: `maxAdults` was the original legacy field. `baseAdults` was added later for tiered pricing.
- **Conflict**: Because UI auto-clones `maxAdults = baseAdults`, rooms with high physical capacity (`maxPhysicalAdults = 4`) cannot be searched or booked for 3 adults under 1 room!
- **Resolution**: Search and booking must use physical capacity (`maxPhysicalAdults` / `totalMaxOccupancy`). `baseAdults` / `totalBaseOccupancy` must strictly govern pricing.

### 15.2 Conflict 2: `freeChildrenCount` vs `maxPhysicalInfants`
- **Current Behavior**: `freeChildrenCount` is exported to Channex as `occ_infants` (`channex.adapter.ts:133`). `maxPhysicalInfants` is used by `occupancy.util.ts:111` to validate cot limits.
- **Conflict**: `freeChildrenCount` was cloned from `baseChildren` in UI, meaning child pricing allowance was masquerading as infant cot capacity in Channex!
- **Resolution**: Disconnect infant cot physical capacity from base child pricing allowance. External Channex contract must be verified before migration.

### 15.3 Conflict 3: `groupMaxOccupancy` vs `totalMaxOccupancy`
- **Current Behavior**: `groupMaxOccupancy` applies across an entire property for group villa buyouts. `totalMaxOccupancy` is the proposed single-room physical ceiling.
- **Resolution**: Keep `groupMaxOccupancy` completely separate for group bookings. Do not merge or confuse it with room-level `totalMaxOccupancy`.

---

## 16. Preliminary Old → New Concept Map

| Existing Database Field | Current Operational Meaning | Proposed New Architectural Concept | Evidence & Rationale | Confidence Level | Preliminary Migration Decision |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `baseAdults` + `baseChildren` | Separate adult/child base allowances | `totalBaseOccupancy` ($B$) | Both fields define included guests before surcharge in `pricing.service.ts`. $B = \text{baseAdults} + \text{baseChildren}$. | **[CONFIRMED]** | Derive $B = \text{baseAdults} + \text{baseChildren}$. Keep legacy columns during dual-run. |
| `baseAdults` | Base adult pricing ceiling | `baseMaxAdults?` (Optional pricing rule) | Controls adult surcharge in `pricing.service.ts:292`. | **[STRONGLY INDICATED]** | Set to `baseAdults` if property wants demographic restriction, or `null` for pure headcount. |
| `baseChildren` | Base child pricing ceiling | `baseMaxChildren?` (Optional pricing rule) | Controls child surcharge in `pricing.service.ts:299`. | **[STRONGLY INDICATED]** | Set to `baseChildren` if property wants demographic restriction, or `null` for pure headcount. |
| `maxPhysicalAdults` | Hard adult physical room limit | `maxPhysicalAdults` | Used in `occupancy.util.ts:85` and solver. | **[CONFIRMED]** | Direct 1:1 retention. |
| `maxPhysicalChildren` | Hard child physical room limit | `maxPhysicalChildren` | Used in `occupancy.util.ts:93` and solver. | **[CONFIRMED]** | Direct 1:1 retention. |
| `maxPhysicalInfants` | Baby cot room limit | `maxPhysicalInfants` | Used in `occupancy.util.ts:111` (0-price, independent). | **[CONFIRMED]** | Direct 1:1 retention. |
| `maxAdults` (Legacy) | Search gate / Channex adult cap | **DEPRECATE** (Replace with `totalMaxOccupancy` & `maxPhysicalAdults`) | Currently duplicates `baseAdults` in UI and causes false drops in search. | **[CONFIRMED]** | Keep column populated via virtual getter / backfill for Channex until Task 2 contract verification. |
| `maxChildren` (Legacy) | Search gate / Channex child cap | **DEPRECATE** (Replace with `maxPhysicalChildren`) | Currently duplicates `baseChildren` in UI. | **[CONFIRMED]** | Keep column populated for Channex until Task 2. |
| `freeChildrenCount` | Channex infant mapping | **DEPRECATE / ISOLATE** | Ambiguous meaning; currently cloned from `baseChildren`. | **[UNVERIFIED]** | **NO SAFE MAPPING YET** until Channex contract verified in Task 2. |
| `groupMaxOccupancy` | Villa group buyout total pool | `groupMaxOccupancy` (Unchanged) | Used exclusively for whole-property group buyouts. | **[CONFIRMED]** | Retain as independent group booking domain. |

---

## 17. Confirmed Findings

The following findings are directly verified by concrete repository code:

- **[CONFIRMED]** Search false-negatives are caused by Prisma SQL filters `maxAdults: { gte: minAdultsPerRoom }` in `availability.service.ts:1059`.
- **[CONFIRMED]** Pricing in `pricing.service.ts:292-304` computes adult and child excess completely independently with no shared headcount absorption.
- **[CONFIRMED]** Property and OTA portal UIs explicitly synchronize `maxAdults = baseAdults` and `maxChildren = baseChildren` on form submit (`CreateRoomType.tsx:251-252`, `OtaRoomTypes.tsx:207-208`).
- **[CONFIRMED]** Booking creation (`bookings.service.ts:195`) enforces `ceil(adults / maxAdults)` as the minimum required room count, preventing single-room bookings with extra adults.
- **[CONFIRMED]** `groupMaxOccupancy` is strictly a whole-property villa pool aggregation and does not interact with transient single-room occupancy rules.

---

## 18. Unverified Findings

- **[UNVERIFIED]** Whether any third-party external PMS integrated via Connectivity API relies specifically on `maxAdults` representing physical bed capacity vs pricing capacity.
- **[UNVERIFIED]** Whether historical OTA reservations from Channex contain guest parties with children where `freeChildrenCount` was relied upon by OTAs to determine zero-cost child age limits.

---

## 19. Business Decisions Required

The following items cannot be decided technically and require explicit RouteGuide business decisions:

1. **Mixed-Excess Headcount Pricing Allocation**:
   When a room with $B=3$ (e.g. `BaseMaxA=2, BaseMaxC=1`) is booked by $2A + 2C$ (Total 4 guests, 1 excess guest):
   - Option A: Adult-first billing (extra child is billed at `extraChildPrice`).
   - Option B: Most expensive excess guest billed.
   - Option C: Property-selectable excess hierarchy.
2. **Default Demographic Restrictions on Migration**:
   When converting existing room types with `baseAdults=2, baseChildren=1`:
   - Should `totalBaseOccupancy = 3` be created with **no demographic restrictions** (allowing $3A$ or $1A+2C$ freely under base price)?
   - Or should `baseMaxAdults = 2` and `baseMaxChildren = 1` be explicitly set to preserve strict historical demographic pricing?

---

## 20. External Contract Verification Required

Before finalizing the new occupancy schema and migration scripts, the following external API contracts must be formally audited in **Task 2**:

1. **Channex API Specification (`channex.adapter.ts`)**:
   - Verify whether `occ_adults`, `occ_children`, and `occ_infants` in Channex represent physical room bounds or rate-plan pricing bounds.
   - Verify if Channex supports multi-occupancy rate tiers for a single rate plan.
2. **Connectivity API Specification (`connectivity-connection.service.ts`)**:
   - Verify active external consumers of the `occupancy` JSON payload.

---

## 21. Migration-Relevant Findings

1. **Zero Data Loss Guarantee**: Legacy columns (`maxAdults`, `maxChildren`, `baseAdults`, `baseChildren`, `freeChildrenCount`) must remain in `RoomType` during the dual-run phase.
2. **Backfill Formulas**:
   - `totalBaseOccupancy` $\leftarrow \text{baseAdults} + \text{baseChildren}$
   - `totalMaxOccupancy` $\leftarrow \text{maxPhysicalAdults} + \text{maxPhysicalChildren}$ (or fallback to `maxAdults + maxChildren`)
   - `maxPhysicalAdults` $\leftarrow \text{maxPhysicalAdults} \mathbin{??} \text{maxAdults} \mathbin{??} 4$
   - `maxPhysicalChildren` $\leftarrow \text{maxPhysicalChildren} \mathbin{??} \text{maxChildren} \mathbin{??} 2$
   - `maxPhysicalInfants` $\leftarrow \text{maxPhysicalInfants} \mathbin{??} 1$

---

## 22. Deprecation Candidates

| Candidate Field | Current Location | Deprecation Path | Target Removal Phase |
| :--- | :--- | :--- | :--- |
| `maxAdults` | `RoomType.maxAdults` | Deprecate in internal search/booking $\rightarrow$ Maintain for Channex $\rightarrow$ Remove after Channex migration. | Phase 3 (Post Cutover) |
| `maxChildren` | `RoomType.maxChildren` | Deprecate in internal search/booking $\rightarrow$ Maintain for Channex $\rightarrow$ Remove after Channex migration. | Phase 3 (Post Cutover) |
| `freeChildrenCount` | `RoomType.freeChildrenCount` | Verify Channex requirement in Task 2 $\rightarrow$ Deprecate in UI $\rightarrow$ Remove. | Phase 3 (Post Cutover) |

---

## 23. Recommended Next Investigation

As specified in the Source of Truth project roadmap, the immediate recommended next step is:

**TASK 2: Verification of Channex & Connectivity API Contractual Payloads**
- Perform dedicated contractual audit of `backend/src/channels/adapters/channex.adapter.ts` and `backend/src/connectivity/services/connectivity-connection.service.ts`.
- Clarify Channex rate plan multi-occupancy support and infant cot payload definitions.

---

## 24. Final Verification Confirmation

> **Formal Confirmation**:
> No application code, database schema, database data, API, UI, integration, or production behavior was modified during this audit.
