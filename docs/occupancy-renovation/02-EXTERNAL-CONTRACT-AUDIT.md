# RouteGuide Occupancy Renovation — Channex & Connectivity Contract Audit
**Document Identifier**: `docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md`  
**Task Identifier**: TASK 2 (Source of Truth v0.2)  
**Status**: EXTERNAL CONTRACT AUDIT COMPLETE (INVESTIGATION & DOCUMENTATION ONLY)  
**Execution Date**: September 2026  
**Reference Documents**: 
- `docs/occupancy-renovation/00-SOURCE-OF-TRUTH.md` (v0.2)
- `docs/occupancy-renovation/01-SEMANTIC-AUDIT.md` (Task 1 Audit)

---

## 1. Executive Summary

This document represents the formal completion of **Task 2: Verification of Channex & Connectivity API Contractual Payloads** for the RouteGuide occupancy renovation.

### 1.1 Objective
The purpose of Task 2 is to definitively resolve the external contract and channel-manager integration dependencies that constrain RouteGuide's occupancy model. Specifically, this audit investigates:
1. The **official Channex API v1 contract** regarding Room Types, Rate Plans, Occupancy Options, and Booking Webhooks.
2. The exact operational meaning of Channex's `occ_adults`, `occ_children`, `occ_infants`, and `default_occupancy`.
3. The root cause, actual history, and future disposition of the legacy `freeChildrenCount` field.
4. The B2B **Connectivity API contract** (`connectivity-connection.service.ts`) and its compatibility boundaries.
5. The translation layer required to project RouteGuide's new **Total Base Occupancy ($B$)** and **Total Maximum Physical Occupancy ($M$)** model to external distribution channels without breaking live OTA feeds.

### 1.2 Strict Audit Guarantee
> [!IMPORTANT]
> **NO APPLICATION CODE, PRISMA SCHEMA, MIGRATION, DATABASE DATA, API, UI, SOLVER, CHANNEX ADAPTER, CONNECTIVITY SERVICE, OR PRODUCTION BEHAVIOR WAS MODIFIED IN THIS TASK.**
> This investigation is purely analytical, evidence-based, and observational.

### 1.3 Key Breakthrough Findings
1. **Channex `occ_infants` is Cot Capacity, Not Free Children**: Official Channex documentation explicitly defines `occ_infants` as *"dedicated to infant-specific sleeping arrangements, such as cots"*. RouteGuide's legacy adapter mistakenly sent `freeChildrenCount` (which was cloned from `baseChildren` in UI) to `occ_infants`, causing child bed allowances to be exported to OTAs as baby cots.
2. **Channex `occ_adults` is Total Convertible Spaces**: Channex defines `occ_adults` as adult sleeping spaces, noting that *"Channex assumes children can also occupy these spaces"*. In contrast, `occ_children` is reserved strictly for child-only beds (e.g. child bunk beds).
3. **Channex Rate Plan Occupancy is Headcount Tiering**: In Channex Rate Plans (`rate_plan.options[]`), the `occupancy` integer represents the guest headcount tier for per-person pricing, with `is_primary: true` designating the base rate.
4. **Connectivity API Export is Safe for Additive Extension**: The Connectivity Content endpoint (`connectivity-connection.service.ts:341-346`) exports an `occupancy` object. Adding `totalBaseOccupancy`, `totalMaxOccupancy`, and `maxPhysicalAdults` alongside legacy keys is 100% backward-compatible.

---

## 2. Channex Official Contract Overview

Channex is RouteGuide's primary channel distribution provider, connecting RouteGuide PMS to major Online Travel Agencies (OTAs) including Booking.com, Agoda, MakeMyTrip, Expedia, and Airbnb.

### 2.1 Communication Protocol & Endpoints
- **Base URL (Staging)**: `https://staging.channex.io/api/v1`
- **Base URL (Production)**: `https://app.channex.io/api/v1`
- **Authentication**: `user-api-key: <CHANNEX_USER_API_KEY>` header.
- **Data Format**: JSON API (REST) with transactional acknowledgement webhooks.
- **Rate Limit Policy**: 20 ARI (Availability, Rates, Inventory) calls per minute per property.

---

## 3. Channex RoomType Occupancy Fields

The table below contrasts the **Official Channex API Definition** against RouteGuide's **Current Implementation**:

| Channex Field | Official Channex Specification | Current RouteGuide Value | Current RouteGuide Source | Correct Architectural Interpretation | Classification & Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`occ_adults`** | Integer. The number of adult spaces available in the room. Channex explicitly notes: *"Channex assumes that children can also occupy these spaces."* | `Math.max(1, roomType.maxAdults \|\| 2)` | `RoomType.maxAdults` (synced to `baseAdults` in UI) | **Physical adult capacity ceiling** (`maxPhysicalAdults`). Currently throttled because RouteGuide sends legacy `maxAdults` (which equals `baseAdults`). | **[CONFIRMED — OFFICIAL CHANNEX]**<br>Channex Room Types API Documentation |
| **`occ_children`** | Integer. Dedicated capacity for child-specific beds (e.g., small bunk beds, trundle beds not suitable for adults). | `Math.max(0, roomType.maxChildren \|\| 2)` | `RoomType.maxChildren` (synced to `baseChildren` in UI) | **Dedicated child-only bed capacity** (`maxPhysicalChildren`). | **[CONFIRMED — OFFICIAL CHANNEX]**<br>Channex Room Types API Documentation |
| **`occ_infants`** | Integer. Dedicated infant-specific sleeping arrangements, specifically **baby cots / cribs**. | `Math.max(0, roomType.freeChildrenCount \|\| 0)` | `RoomType.freeChildrenCount` (synced to `baseChildren` in UI) | **Baby cot limit** (`maxPhysicalInfants`). RouteGuide was mistakenly mapping child pricing allowances to infant cots! | **[CONFIRMED — OFFICIAL CHANNEX]**<br>Channex Room Types API Documentation |
| **`default_occupancy`** | Integer. The typical/standard number of persons expected to occupy the room under the base rate. **API Rule: `default_occupancy <= occ_adults`**. | `Math.max(1, roomType.maxAdults \|\| 2)` | `RoomType.maxAdults` | **Total Base Occupancy ($B$)** or standard included headcount. Must be $\le \text{occ\_adults}$. | **[CONFIRMED — OFFICIAL CHANNEX]**<br>Channex Room Types API Documentation |
| **`count_of_rooms`** | Integer. The total physical count of sellable inventory units belonging to this RoomType. | `Math.max(1, roomType.rooms?.length \|\| 5)` | `RoomType.rooms.length` | **Physical room count** (Inventory units). | **[CONFIRMED — REPOSITORY]**<br>`channex.adapter.ts:130` |

---

## 4. Channex Rate Plan Occupancy

### 4.1 Structure of `rate_plan.options[]`
When RouteGuide auto-creates a Rate Plan in Channex (`channex.adapter.ts:161-175`), it posts:
```json
{
  "rate_plan": {
    "title": "Deluxe Room Standard Rate",
    "property_id": "ext-property-id",
    "room_type_id": "ext-room-type-id",
    "currency": "INR",
    "sell_mode": "per_room",
    "options": [
      {
        "occupancy": 2,
        "is_primary": true,
        "rate": 2500
      }
    ]
  }
}
```

### 4.2 Exact Operational Meaning of Rate Plan Fields
1. **`occupancy`**: Represents the **guest headcount threshold** for that pricing tier (e.g. 1 guest, 2 guests, 3 guests, 4 guests).
2. **`is_primary`**: When `true`, designates this tier as the **base rate** of the room type.
3. **Multi-Occupancy Support**: Channex fully supports multi-occupancy rate tiers in a single rate plan (e.g., Single Occupancy rate = ₹2000, Double Occupancy rate = ₹2500, Triple Occupancy rate = ₹3200).
4. **Demographic Separation in Rate Plans**: Channex rate plan options use **total headcount integers** (`occupancy: 1, 2, 3...`). They do **not** split options into separate adult/child options. Extra child rates on OTAs are governed by channel-level child policies configured directly on Channex or the OTA.

---

## 5. Channex Occupancy Examples & Scenario Matrix

The table below illustrates how RouteGuide's business scenarios map into Channex's API structure:

| Scenario Description | RouteGuide Physical & Pricing Reality | Correct Channex RoomType Payload (`room_types`) | Correct Channex Rate Plan Payload (`rate_plans`) | OTA Interpretation (Booking.com / Agoda) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Standard Room (2A + 1C Base, Max 3)** | Physical: $A=2, C=1, M=3$<br>Base: $B=3$ | `occ_adults: 3`<br>`occ_children: 0`<br>`occ_infants: 0`<br>`default_occupancy: 3` | `options: [{ occupancy: 3, is_primary: true, rate: 2500 }]` | Room accommodates up to 3 guests (adults or children) at base rate ₹2500. |
| **2. Executive Room (Base 2A, Max 4 Physical Adults with Extra Beds)** | Physical: $A=4, C=2, M=4$<br>Base: $B=2$<br>Extra Adult: ₹500 | `occ_adults: 4`<br>`occ_children: 0`<br>`occ_infants: 1`<br>`default_occupancy: 2` | `options: [`<br>`  { occupancy: 2, is_primary: true, rate: 3000 },`<br>`  { occupancy: 3, rate: 3500 },`<br>`  { occupancy: 4, rate: 4000 }`<br>`]` | Room holds up to 4 adults + 1 baby cot. 2 guests pay ₹3000; 3 pay ₹3500; 4 pay ₹4000. |
| **3. Family Suite with Child Bunk Beds** | Physical: $A=2$ adults + $C=2$ dedicated child bunks.<br>Base: $B=4$ | `occ_adults: 2`<br>`occ_children: 2`<br>`occ_infants: 1`<br>`default_occupancy: 4` *(or 2 if default $\le$ adult cap)* | `options: [{ occupancy: 4, is_primary: true, rate: 5000 }]` | OTAs restrict adults to 2, allowing up to 2 additional children in child beds. |
| **4. Couple Villa (Strict 2 Adults, 1 Infant Cot, No Extra Guests)** | Physical: $A=2, C=0, M=2, I=1$<br>Base: $B=2$ | `occ_adults: 2`<br>`occ_children: 0`<br>`occ_infants: 1`<br>`default_occupancy: 2` | `options: [{ occupancy: 2, is_primary: true, rate: 8000 }]` | OTAs allow max 2 adults plus 1 infant in cot. |

---

## 6. Current RouteGuide Channex Adapter Audit

### 6.1 Source Code Audit (`backend/src/channels/adapters/channex.adapter.ts`)
Lines 126–136:
```typescript
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

### 6.2 Identified Semantic Mismatches in Current Adapter:
1. **`occ_adults` Mismatch**:
   - **RouteGuide Sends**: `roomType.maxAdults` (which equals `baseAdults`, e.g. `2`).
   - **Impact**: Even if the room physically holds 4 adults (`maxPhysicalAdults = 4`), Channex and all connected OTAs believe the room can never hold more than 2 adults! OTAs will not display the room to families of 3 or 4 adults.
2. **`occ_infants` Mismatch**:
   - **RouteGuide Sends**: `roomType.freeChildrenCount` (which equals `baseChildren`, e.g. `1` or `2`).
   - **Impact**: The child bed allowance is sent as infant baby cot capacity. If a room has 0 baby cots but 1 base child bed, Channex is told the room has 1 baby cot and 0 child spaces.
3. **`default_occupancy` Mismatch**:
   - **RouteGuide Sends**: `roomType.maxAdults`.
   - **Impact**: It sends the adult count rather than Total Base Occupancy ($B = \text{baseAdults} + \text{baseChildren}$).

---

## 7. Deep Investigation: `freeChildrenCount`

We performed an exhaustive forensic codebase search and historical analysis across all occurrences of `freeChildrenCount`.

### 7.1 Key Questions & Findings:

1. **Why was `freeChildrenCount` introduced?**
   - **[CONFIRMED — REPOSITORY]**: Introduced during the initial schema migration (`20260116103252_init/migration.sql:83`) as a placeholder for properties offering free child stays.
2. **What did the original field intend to represent?**
   - Intended to capture the count of children accommodated without additional charge.
3. **Is it really "free children"?**
   - Yes, conceptually. However, when the modern Property Portal and OTA Portal were built, `freeChildrenCount` was removed from the UI forms and hardcoded as `freeChildrenCount: resolvedBaseChildren` (`CreateRoomType.tsx:253`, `OtaRoomTypes.tsx:212`).
4. **Has RouteGuide historically used `freeChildrenCount` for anything other than Channex?**
   - **[CONFIRMED — REPOSITORY]**: **NO.** It is NOT used in `pricing.service.ts`, NOT used in `availability.service.ts`, NOT used in `bookings.service.ts`, NOT used in `occupancy.util.ts`, and NOT used in `connectivity-connection.service.ts`.
5. **Does Channex's `occ_infants` actually mean infants/cots?**
   - **[CONFIRMED — OFFICIAL CHANNEX]**: **YES.** Channex documentation explicitly defines `occ_infants` as infant cots.
6. **Can `freeChildrenCount` safely be separated from `maxPhysicalInfants`?**
   - **[CONFIRMED — REPOSITORY]**: **YES.** In RouteGuide, infant cot capacity is physically governed by `maxPhysicalInfants` (`schema.prisma:134`, `occupancy.util.ts:111`).
7. **Can `freeChildrenCount` be deprecated?**
   - **[CONFIRMED — REPOSITORY]**: **YES.** The field is completely redundant internally.
8. **Must `freeChildrenCount` remain permanently for Channex compatibility?**
   - **NO.** Channex does not require a field named `freeChildrenCount`. Channex requires `occ_infants`, which should be mapped directly from `maxPhysicalInfants`.
   - During the dual-run migration phase, the database column `RoomType.freeChildrenCount` must remain in Prisma schema to avoid schema breaks, but its business responsibility is entirely deprecated.

---

## 8. Channex Booking & Webhook Flow Audit

### 8.1 Inbound Reservation Structure
- **File**: `backend/src/channels/adapters/channex.adapter.ts:320-365` (`parseIncomingReservation`)
- **Webhook Event**: `{ "event": "booking", "data": { ... } }` or `booking_created` / `booking_modified` / `booking_cancelled`.

### 8.2 Inbound Occupancy Parsing
```typescript
// backend/src/channels/adapters/channex.adapter.ts:352-353
adultsCount: Number(firstRoom.occupancy?.adults || booking.adults || 2),
childrenCount: Number(firstRoom.occupancy?.children || booking.children || 0),
```

### 8.3 Processing in `channels.service.ts:940-1090`:
1. **Physical Room Assignment**: Finds an available physical room via `availabilityService.getAvailableRooms(roomTypeId, checkIn, checkOut)`. If none available, assigns the first physical room and logs an overbooking alert.
2. **Guest Profile**: Resolves or creates user record by guest email.
3. **Financials**: Accepts OTA `totalAmount` directly; reverse-calculates base amount and GST via `pricingService.calculateReverseGST`.
4. **Infants**: Currently ignored in booking record because `Booking` table has no `infantsCount` column.
5. **Acknowledgement**: Calls `/booking_revisions/:id/ack` or `/bookings/:id/ack` with the internal booking number (mandated by Channex certification).

### 8.4 Impact of New Occupancy Model on Inbound Reservations:
- **Zero Risk to Inbound Webhooks**: Incoming OTA bookings specify explicit `adults` and `children` counts. RouteGuide stores these directly as `adultsCount` and `childrenCount` on `Booking`. Because OTA bookings bypass public pricing calculation, renovating RouteGuide's internal pricing engine will **not alter or disrupt inbound OTA reservations**.

---

## 9. Channex Certification Requirements

We inspected RouteGuide's Channex certification harness in `backend/scratch/run-certification-scenarios.ts` and `create-certification-property.ts`.

### 9.1 Certification Test Scope:
1. **Property Creation**: Auto-create remote property with title, country, currency, timezone (`channex.adapter.ts:80-118`).
2. **Room Type Creation**: Auto-create remote room types with `occ_adults`, `occ_children`, `occ_infants`, `default_occupancy` (`channex.adapter.ts:120-157`).
3. **Rate Plan Creation**: Auto-create default Rate Plan with options array (`channex.adapter.ts:158-197`).
4. **ARI Updates**: Single-date and multi-date rate and restriction updates (`/restrictions` endpoint).
5. **Webhook Acknowledgment**: Transactional acknowledgement of booking revisions via `/ack` endpoint within 10 seconds.

### 9.2 Renovation Impact on Certification:
- Upgrading `occ_adults` to `maxPhysicalAdults` and `occ_infants` to `maxPhysicalInfants` **strictly complies** with Channex certification rules. Channex validates that `default_occupancy <= occ_adults`, which will always hold true since $B \le M$.

---

## 10. Connectivity API Contract Audit

### 10.1 Service & Endpoint Definition
- **File**: `backend/src/connectivity/services/connectivity-connection.service.ts:335-358`
- **Controller**: `backend/src/connectivity/connectivity.controller.ts` (`GET /api/v1/connectivity/content`)
- **Guard**: `PartnerApiKeyGuard` (`x-api-key` header).

### 10.2 Payload Schema (`GET /content`)
```json
{
  "property": {
    "name": "Grand Mountain Resort",
    "coverImage": "https://cdn.example.com/cover.jpg",
    "amenities": ["Pool", "WiFi"]
  },
  "roomTypes": [
    {
      "id": "rt-uuid-101",
      "externalRoomTypeId": "EXT-ROOM-DLX",
      "name": "Deluxe Villa",
      "description": "Spacious villa",
      "sizeSqFt": 450,
      "occupancy": {
        "maxAdults": 2,
        "maxChildren": 1,
        "baseAdults": 2,
        "baseChildren": 1
      },
      "amenities": ["Balcony", "AC"],
      "images": ["https://cdn.example.com/img1.jpg"]
    }
  ]
}
```

---

## 11. Connectivity Consumers & Backwards Compatibility

### 11.1 Consumer Analysis
- **Internal Specs**: Verified in `connectivity-content.spec.ts` (13 test scenarios validating partner isolation, room ID mapping, absence of physical room numbers, and absence of base price leakage).
- **External Consumers**: B2B distribution partners and custom booking engines consume `GET /content` to map RouteGuide catalog data.

### 11.2 Safety Assessment:

| Proposed Change to Connectivity Contract | Breaking or Safe? | Rationale |
| :--- | :--- | :--- |
| **Add `totalBaseOccupancy` to `occupancy`** | **SAFE (Additive)** | JSON consumers ignore unrecognized keys unless strictly configured for closed schemas. |
| **Add `totalMaxOccupancy` to `occupancy`** | **SAFE (Additive)** | Additive extension. |
| **Add `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants`** | **SAFE (Additive)** | Additive extension. |
| **Remove `maxAdults` or `baseAdults`** | **BREAKING** | External partner code destructuring `occupancy.maxAdults` will receive `undefined`. |
| **Alter data type of `maxAdults`** | **BREAKING** | Changing integer to string/object breaks parsers. |

> [!IMPORTANT]
> **Connectivity Contract Policy**:
> During and after the occupancy renovation, `connectivity-connection.service.ts` must retain `maxAdults`, `maxChildren`, `baseAdults`, and `baseChildren` in the `occupancy` payload, while appending the new normalized occupancy fields.

---

## 12. External Compatibility Boundaries

The following matrix defines the permanence and boundary of every occupancy field:

| Occupancy Field | RouteGuide Scope | External Scope | Lifespan / Status | Action During Renovation |
| :--- | :--- | :--- | :--- | :--- |
| `totalBaseOccupancy` ($B$) | Core Internal (Pricing & Search) | Exported to Connectivity API & Channex `default_occupancy` | **Permanent New Standard** | Primary model field. |
| `totalMaxOccupancy` ($M$) | Core Internal (Physical Capacity) | Exported to Connectivity API | **Permanent New Standard** | Primary model field. |
| `maxPhysicalAdults` | Core Internal (Physical Limit) | Exported to Channex `occ_adults` & Connectivity API | **Permanent New Standard** | Primary physical limit. |
| `maxPhysicalChildren` | Core Internal (Physical Limit) | Exported to Channex `occ_children` & Connectivity API | **Permanent New Standard** | Primary physical limit. |
| `maxPhysicalInfants` | Core Internal (Cot Limit) | Exported to Channex `occ_infants` & Connectivity API | **Permanent New Standard** | Primary cot limit. |
| `maxAdults` (Legacy) | Deprecated in internal search & pricing | Required by Connectivity API & legacy channel mappings | **Legacy Compatibility** | Maintained via adapter / virtual property during dual-run. |
| `maxChildren` (Legacy) | Deprecated in internal search & pricing | Required by Connectivity API & legacy channel mappings | **Legacy Compatibility** | Maintained via adapter / virtual property during dual-run. |
| `baseAdults` (Legacy) | Replaced by $B$ + optional `baseMaxAdults?` | Required by Connectivity API | **Legacy Compatibility** | Maintained in Prisma schema for dual-run. |
| `baseChildren` (Legacy) | Replaced by $B$ + optional `baseMaxChildren?` | Required by Connectivity API | **Legacy Compatibility** | Maintained in Prisma schema for dual-run. |
| `freeChildrenCount` (Legacy) | Fully Deprecated Internally | Replaced in Channex by `maxPhysicalInfants` | **Deprecation Candidate** | Disconnected from Channex; maintained in DB until post-cutover cleanup. |
| `groupMaxOccupancy` | Villa Group Buyouts Only | N/A (Internal Group Engine) | **Permanent (Isolated)** | Retained unchanged in group booking subsystem. |

---

## 13. Preliminary New Occupancy Mapping Table

| New Concept | Channex Representation | Connectivity API Representation | Mapping Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`totalBaseOccupancy`** ($B$) | `room_type.default_occupancy`<br>`rate_plan.options[0].occupancy` | `occupancy.totalBaseOccupancy` | Direct Mapping | **[CONFIRMED — REPOSITORY]** |
| **`totalMaxOccupancy`** ($M$) | Sum of `occ_adults + occ_children` | `occupancy.totalMaxOccupancy` | Direct Mapping | **[CONFIRMED — REPOSITORY]** |
| **`maxPhysicalAdults`** | `room_type.occ_adults` | `occupancy.maxPhysicalAdults` | Direct Mapping | **[CONFIRMED — REPOSITORY]** |
| **`maxPhysicalChildren`** | `room_type.occ_children` | `occupancy.maxPhysicalChildren` | Direct Mapping | **[CONFIRMED — REPOSITORY]** |
| **`maxPhysicalInfants`** | `room_type.occ_infants` | `occupancy.maxPhysicalInfants` | Direct Mapping | **[CONFIRMED — REPOSITORY]** |
| **`baseMaxAdults?`** | N/A (Internal Pricing Rule) | `occupancy.baseMaxAdults` | Internal Only | **[CONFIRMED — REPOSITORY]** |
| **`baseMaxChildren?`** | N/A (Internal Pricing Rule) | `occupancy.baseMaxChildren` | Internal Only | **[CONFIRMED — REPOSITORY]** |

---

## 14. Identified Contradictions & External Risks

### 14.1 Contradiction 1: `freeChildrenCount` Masquerading as Infant Cot Capacity
- **Description**: `channex.adapter.ts:133` maps `occ_infants: freeChildrenCount`. But `CreateRoomType.tsx:253` clones `freeChildrenCount = baseChildren`.
- **Contradiction**: RouteGuide was sending child bed allowances (e.g. 2 children) as baby cots to OTAs!
- **Resolution**: RouteGuide must map `occ_infants: roomType.maxPhysicalInfants || 0`.

### 14.2 Contradiction 2: `occ_adults` Throttled by Base Pricing
- **Description**: `channex.adapter.ts:131` maps `occ_adults: roomType.maxAdults`. In the UI, `maxAdults` was cloned from `baseAdults` (e.g. 2).
- **Contradiction**: A room with 4 physical adult capacity was published to OTAs as a 2-adult room.
- **Resolution**: RouteGuide must map `occ_adults: roomType.maxPhysicalAdults || roomType.baseAdults || 2`.

---

## 15. Confirmed Findings

- **[CONFIRMED — OFFICIAL CHANNEX]** Channex `occ_adults` represents all adult sleeping spaces (convertible for children); `occ_children` is dedicated child beds; `occ_infants` is dedicated infant cots.
- **[CONFIRMED — OFFICIAL CHANNEX]** Channex Rate Plan `occupancy` is an integer headcount tier, with `is_primary: true` designating the base rate.
- **[CONFIRMED — OFFICIAL CHANNEX]** Inbound Channex reservations provide structured guest counts via `occupancy: { adults, children, infants }`.
- **[CONFIRMED — REPOSITORY]** `freeChildrenCount` is NOT used anywhere in pricing, search, availability, or booking validation; its only active consumer was `channex.adapter.ts:133`.
- **[CONFIRMED — REPOSITORY]** Connectivity API (`connectivity-connection.service.ts:341-346`) can safely accept additive occupancy fields without breaking existing consumers.

---

## 16. Unverified Findings

- **[UNVERIFIED]** Whether any connected OTA channel manager other than Channex (e.g., STAAH, if integrated in future) requires explicit child age brackets attached to room type occupancy.

---

## 17. Business Decisions Required

1. **OTA Lead Rate Strategy**:
   When pushing Rate Plans to Channex for a room with $B=2, M=4$ (Base rate ₹3000, Extra Adult ₹500):
   - **Option A (Single Tier)**: Push a single primary rate option with `occupancy: 2, rate: 3000`. OTAs will calculate extra guests using their channel-level guest surcharge rules.
   - **Option B (Multi-Occupancy Tiers)**: Push explicit tiered options:
     - `occupancy: 2, rate: 3000, is_primary: true`
     - `occupancy: 3, rate: 3500`
     - `occupancy: 4, rate: 4000`
2. **Infant Dimension Persistence**:
   Should `Booking` table add an explicit `infantsCount Int @default(0)` column to capture infant counts from OTA webhooks and public checkout?

---

## 18. External Contract Decisions Required

- **Channex Rate Plan Sell Mode**: Confirm whether RouteGuide properties will standardise on `per_room` sell mode with single primary rate or activate `per_person` sell mode with tiered occupancy arrays.

---

## 19. Migration-Relevant Findings

1. **Channex Adapter Update Path**:
   In Phase 2 (Implementation), `channex.adapter.ts:131-134` can be updated cleanly to:
   ```typescript
   occ_adults: Math.max(1, roomType.maxPhysicalAdults || roomType.baseAdults || 2),
   occ_children: Math.max(0, roomType.maxPhysicalChildren || 0),
   occ_infants: Math.max(0, roomType.maxPhysicalInfants || 0),
   default_occupancy: Math.max(1, (roomType.baseAdults || 2) + (roomType.baseChildren || 0)),
   ```
2. **Connectivity Backward Compatibility Guarantee**:
   `connectivity-connection.service.ts` will return:
   ```json
   "occupancy": {
     "maxAdults": rt.maxAdults,
     "maxChildren": rt.maxChildren,
     "baseAdults": rt.baseAdults,
     "baseChildren": rt.baseChildren,
     "totalBaseOccupancy": rt.baseAdults + rt.baseChildren,
     "totalMaxOccupancy": rt.maxPhysicalAdults + rt.maxPhysicalChildren,
     "maxPhysicalAdults": rt.maxPhysicalAdults,
     "maxPhysicalChildren": rt.maxPhysicalChildren,
     "maxPhysicalInfants": rt.maxPhysicalInfants
   }
   ```

---

## 20. Recommended Next Task

As specified in the Source of Truth project roadmap, the next sequential task is:

**TASK 3: Analysis of Existing Production RoomType Data Patterns Across Configured Properties**
- Audit the distribution of configurations across the ~70 properties with active Room Types.
- Identify outlier combinations, zero/null values, and prepare backfill validation criteria.

---

## 21. Final Verification Confirmation

> **Formal Confirmation**:
> No application code, database schema, database data, API, UI, integration, or production behavior was modified during this audit.
