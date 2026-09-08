# RouteGuide Occupancy Renovation — Permanent Source of Truth
**Document Identifier**: `docs/occupancy-renovation/00-SOURCE-OF-TRUTH.md`  
**Status**: ACTIVE IMPLEMENTATION SOURCE OF TRUTH  
**Version**: `v1.1`  
**Last Updated**: September 2026  
**Latest Completed Task**: Combined Phase 2 (Phase 3 Pricing Integration + Phase 4 Availability/Search Integration)  
**Next Expected Task**: Combined Phase 3 (Phase 5 Booking Integration + Phase 6 V1 Compatibility/Migration)  

> [!IMPORTANT]
> **CRITICAL RECOVERY DIRECTIVE FOR FUTURE AGENTS / SESSIONS**:
> This document is the **single persistent source of truth** for all ongoing and future occupancy-renovation tasks in RouteGuide.
> Any future implementation or architectural session **MUST first read this document in full**.
> Future agents **MUST explicitly distinguish between APPROVED business decisions, PROPOSED technical representations, and OPEN business questions**.
> **DO NOT treat unapproved proposals as facts or approved requirements.**

---

## 1. Project Purpose & Scope

### 1.1 What RouteGuide Is
RouteGuide is an active, production-grade resort management platform, Property Management System (PMS), enterprise booking engine, channel distribution coordinator, and guest portal.

### 1.2 Why the Occupancy Subsystem is Being Renovated
The legacy occupancy model enforces separate demographic pairs (`baseAdults`, `baseChildren`, `maxAdults`, `maxChildren`) that artificially constrain room allocations. For example, a room with `baseAdults = 2` and `baseChildren = 1` ($2 + 1 = 3$ base headcount) currently omits valid combinations like $3A$ or $1A + 2C$ in discovery and pricing.

### 1.3 Core Renovation Principle
> **"We are not rebuilding RouteGuide. We are rebuilding the occupancy decision layer that the existing RouteGuide systems depend upon."**

Think of RouteGuide as an already constructed, functioning multi-story commercial building. We are renovating one critical foundation/subsystem (the occupancy & accommodation decision engine) while keeping the rest of the building stable, operational, and safe.

### 1.4 Production Safety Context
- Production currently contains approximately **300 properties**.
- Approximately **70 properties** have configured Room Types.
- A live subset of properties actively transacts bookings.
- The renovation **must protect existing production properties from configuration loss, price shifts, or service disruption**.

### 1.5 Explicitly Out of Scope
The following domains are strictly outside the occupancy renovation and must remain untouched:
- User authentication, JWT tokens, RBAC, and permissions (`backend/src/auth/`).
- Payment processing, Razorpay webhooks, and manual payment requests (`backend/src/payments/`).
- Financial settlements, commission calculation, and invoices (`backend/src/financials/`).
- Notifications (WhatsApp, MSG91, Twilio, Email, Push) (`backend/src/notifications/`, `mail/`).
- Reviews, guest ratings, and public feedback (`backend/src/reviews/`).
- Reports and GST analytics (`backend/src/reports/`).
- Housekeeping and room maintenance statuses (`backend/src/rooms/`).

---

## 2. Current Production Context

| Metric / Parameter | Live Production Audit Value | Architectural Implication |
| :--- | :--- | :--- |
| **Total Listed Properties** | **226 properties** | Database schema and migrations must maintain zero-downtime backward compatibility. |
| **Properties with RoomTypes** | **109 properties (48.2%)** (117 unconfigured shells) | Any data mapping must safely handle both populated and unpopulated/legacy property records. |
| **Total Room Types** | **266 RoomTypes** (avg 2.44 RT/property) | All 266 RoomTypes audited; candidate migration preserves 100% capacity with clamping formula. |
| **Total Confirmed Bookings** | **125 Bookings** | Real bookings are active; `extraAdultsCount` / `extraChildrenCount` are currently 0. |
| **Renovation Strategy** | Side-by-Side Dual Run | Old behavior remains intact initially; new engine is built alongside, validated on staging/shadow run, and cut over safely. |
| **Cleanup Policy** | Disable first, verify, then delete | Legacy fields/endpoints are marked deprecated, disabled only after confirmation, and deleted only after long-term stability. |

---

## 3. APPROVED Business Occupancy Model
*(DO NOT CHANGE WITHOUT EXPLICIT ROUTEGUIDE BUSINESS DECISION)*

The following concepts have been **formally approved** as the core business model:

### 3.1 Total Base Occupancy ($B$)
- **Definition**: The total number of standard guests (**Adults + Children**) covered by the room's base rate.
- **Dynamic Headcount**: It is **NOT** a fixed demographic composition.
- **Example ($B = 3$)**: Valid base compositions covered by the base price include:
  - $1A$ (1 Adult)
  - $2A$ (2 Adults)
  - $3A$ (3 Adults)
  - $1A + 1C$ (1 Adult + 1 Child)
  - $2A + 1C$ (2 Adults + 1 Child)
  - $1A + 2C$ (1 Adult + 2 Children)
- For $B = 4$, all valid $A+C$ combinations up to 4 must be recognized as covered by the base price (subject to physical limits).

### 3.2 Total Maximum Physical Occupancy ($M$)
- **Definition**: The hard physical and architectural ceiling of total standard guests (**Adults + Children**) permitted to occupy the room.

### 3.3 Physical Demographic Restrictions (Hard Limits)
A single-room allocation $(A, C)$ is **physically valid** if and only if all of the following conditions are met:
1. $A \ge 1$ (Every occupied room requires at least 1 adult; unaccompanied children are prohibited).
2. $C \ge 0$ (Children count is non-negative).
3. $A \le \text{maxPhysicalAdults}$ (Hard adult physical limit).
4. $C \le \text{maxPhysicalChildren}$ (Hard child physical limit).
5. $A + C \le \text{totalMaxOccupancy}$ (Hard total physical room limit).
6. $I \le \text{maxPhysicalInfants}$ (Hard infant cot limit).

### 3.4 Optional Base Demographic Restrictions (Pricing Rules Only)
The model supports optional base pricing restrictions:
- `baseMaxAdults?` (Maximum included adults under base rate)
- `baseMaxChildren?` (Maximum included children under base rate)

> [!IMPORTANT]
> **Base demographic restrictions are PRICING rules, NOT physical capacity limits.**
> Exceeding a base demographic restriction **does NOT make a room physically invalid**. If the guest count remains within `totalMaxOccupancy` and physical demographic limits, the room is **bookable**, and the applicable extra adult/child fee is charged.

### 3.5 Infants (Independent Dimension)
- Infants are captured as a **completely separate guest dimension**.
- Infants **do not consume $A + C$ capacity**.
- Infants **do not count toward `totalBaseOccupancy`**.
- Infants **do not count toward `totalMaxOccupancy`**.
- Infants have their own physical cot limit: `maxPhysicalInfants`.
- Infants are **free** with ₹0 occupancy surcharge.
- There is **no `extraInfantPrice`**.

---

## 4. Accommodation Solution Concept

The future discovery and search engine reasons about an **Accommodation Solution**, rather than simply asking *"Which individual RoomType is available?"*.

An **Accommodation Solution** represents a complete, physically valid, and priced fulfillment of the guest party:
- **Single Room**: 1 room fitting the entire party (with ₹0 extra or calculated extra guest fees).
- **Multiple Rooms of Same Type**: E.g., $3 \times \text{Standard Deluxe}$.
- **Mixed Room Types**: E.g., $1 \times \text{Family Suite} + 2 \times \text{Deluxe Room}$.
- **Uneven Guest Allocations**: Guests do not need to be split evenly across rooms (e.g., Room 1 gets $2A + 1C$, Room 2 gets $1A + 2C$).
- **Infant Cot Allocation**: Independent placement up to each room's cot limit.
- **Complete Solution Pricing**: Base total + extra adult fees + extra child fees + taxes.

### Requested Room Count is a Preference / Ranking Signal
- If a guest requests 1 room for 4 Adults + 2 Children, but no single room fits them, the system **must not drop the property**.
- It should discover valid 2-room solutions and present them, using the requested room count as a ranking signal (exact room count matches rank higher).

---

## 5. Current Codebase Implementation Audit

A deep inspection of the active codebase (`wip-rebuilding-occupancy-rule` branch) establishes the current state:

| Component / File | Current Responsibility | Current Occupancy Fields Used | Behavior & Limitations | Expected Future Change |
| :--- | :--- | :--- | :--- | :--- |
| **`backend/src/common/utils/occupancy.util.ts`** | Composition generator & room occupancy validator | `baseAdults`, `baseChildren`, `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants` | Generates compositions by looping $A \le \text{baseAdults}$ and $C \le \text{baseChildren}$, omitting $3A$ and $1A+2C$. | Will be updated to unconstrained headcount generator ($A+C \le N$). |
| **`backend/src/common/utils/occupancy-solver.util.ts`** | Pure combinatorial backtracking partition solver | `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalCapacity`, `maxPhysicalInfants`, `baseAdults`, `baseChildren`, `availableQuantity` | **Step 1 completed**. Contains candidate multiset generator, bounded backtracking partition, infant placement, and ranking metadata. | Contract will be extended to consume `totalBaseOccupancy` and new pricing rules. |
| **`backend/src/common/utils/occupancy-solver.util.spec.ts`** | Unit test suite for pure solver | Test room fixtures | **28 passing unit tests** verifying single room, multi-room, mixed room, infant limits, and asymmetric capacity counterexamples. | Will be extended with mixed base demographic test cases. |
| **`backend/src/bookings/availability.service.ts`** | Inventory check & public search | `maxAdults`, `maxChildren`, `groupMaxOccupancy` | Line 1059 executes SQL `WHERE maxAdults >= ceil(A/R) AND maxChildren >= ceil(C/R)`. Drops valid rooms prematurely. | Will be refactored to gather available quantities and invoke Solver. |
| **`backend/src/bookings/pricing.service.ts`** | Rate & surcharge calculation | `baseAdults`, `baseChildren`, `maxAdults`, `maxChildren`, `extraAdultPrice`, `extraChildPrice` | Lines 292 & 299 subtract `baseAdults` and `baseChildren` independently. Penalizes $1A+2C$ with extra child fee. | Will be updated to headcount-first base absorption pricing. |
| **`backend/src/bookings/bookings.service.ts`** | Booking creation & validation | `maxAdults`, `groupMaxOccupancy` | Line 195 validates `roomCount >= ceil(adults / maxAdults)`. Blocks valid bookings with extra occupancy. | Will validate against complete Accommodation Solution. |
| **`backend/src/rooms/rooms.service.ts`** | Physical room inventory & PMS assignment | `maxPhysicalAdults`, `maxAdults`, `maxPhysicalChildren`, `maxChildren` | Assigns physical rooms using consolidation sorting (booking density). | Retained; PMS assignment remains decoupled from solver partition. |
| **`backend/src/connectivity/services/connectivity-connection.service.ts`** | OTA partner JSON metadata export | `maxAdults`, `maxChildren`, `baseAdults`, `baseChildren` | Line 341 exports JSON payload `occupancy: { maxAdults, maxChildren, baseAdults, baseChildren }`. | Will additively expose `totalBaseOccupancy` while keeping legacy fields. |
| **`backend/src/channels/adapters/channex.adapter.ts`** | Channex Channel Manager sync | `maxAdults`, `maxChildren`, `freeChildrenCount`, `basePrice` | Maps `occ_adults: maxAdults`, `occ_children: maxChildren`, `occ_infants: freeChildrenCount`, `default_occupancy: maxAdults`. | Must remain backward-compatible; requires contract verification before changes. |
| **`frontend/property/src/pages/RoomTypes/CreateRoomType.tsx`** | Property portal Room Type editor | `baseAdults`, `baseChildren`, `maxPhysicalAdults`, `maxPhysicalChildren`, `maxPhysicalInfants`, `maxAdults`, `maxChildren` | Multi-field form syncing legacy and new fields with debounced preview. | Will be updated to Two-Tier layout (Total Occupancy + Advanced Restrictions). |
| **`frontend/ota-property-portal/src/pages/OtaRoomTypes.tsx`** | OTA partner Room Type editor | Same as property portal | Mirrored room type editor for OTA onboarders. | Will be updated to Two-Tier layout. |

---

## 6. Existing Occupancy Fields — Semantic Audit Status

| Field Name | Current Meaning in Code | Written In | Read In | Classification | Future Status | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`baseAdults`** | Base adults included in standard rate | `room-types.service.ts`, `CreateRoomType.tsx` | `pricing.service.ts:292`, `connectivity-connection.service.ts:344` | Pricing & External API | **Preserve** as fallback / demographic base field | 🟢 Verified in Code |
| **`baseChildren`** | Base children included in standard rate | `room-types.service.ts`, `CreateRoomType.tsx` | `pricing.service.ts:299`, `connectivity-connection.service.ts:345` | Pricing & External API | **Preserve** as fallback / demographic base field | 🟢 Verified in Code |
| **`maxPhysicalAdults`** | Hard physical limit for adults in room | `room-types.service.ts`, `CreateRoomType.tsx` | `occupancy.util.ts`, `occupancy-solver.util.ts`, `rooms.service.ts` | Physical Capacity | **Active Core Field** | 🟢 Verified in Code |
| **`maxPhysicalChildren`** | Hard physical limit for children in room | `room-types.service.ts`, `CreateRoomType.tsx` | `occupancy.util.ts`, `occupancy-solver.util.ts`, `rooms.service.ts` | Physical Capacity | **Active Core Field** | 🟢 Verified in Code |
| **`maxPhysicalInfants`** | Independent cot limit for infants | `room-types.service.ts`, `CreateRoomType.tsx` | `occupancy.util.ts`, `occupancy-solver.util.ts` | Physical Capacity | **Active Core Field** | 🟢 Verified in Code |
| **`maxAdults`** | Legacy field: previously represented max adults | `CreateRoomType.tsx` | `availability.service.ts:1059` (SQL search), `channex.adapter.ts:131`, UI cards | Search Filter & External Channex | **Preserve for Compatibility** (SQL filter to be removed later) | 🟢 Verified in Code |
| **`maxChildren`** | Legacy field: previously represented max children | `CreateRoomType.tsx` | `availability.service.ts:1060` (SQL search), `channex.adapter.ts:132`, UI cards | Search Filter & External Channex | **Preserve for Compatibility** (SQL filter to be removed later) | 🟢 Verified in Code |
| **`freeChildrenCount`** | Legacy free child counter | Schema definition | `channex.adapter.ts:133` (`occ_infants`) | External Channex Mapping | **Requires business/contract validation** | 🟡 Contract Unverified |
| **`groupMaxOccupancy`** | Whole-villa group capacity | Group settings UI | `availability.service.ts:85`, `bookings.service.ts:308` | Group Mode Only | **Preserve** (Independent domain) | 🟢 Verified in Code |
| **`extraAdultPrice`** | Price charged per extra adult/night | `CreateRoomType.tsx` | `pricing.service.ts:296`, `occupancy-solver.util.ts:37` | Pricing | **Active Core Field** | 🟢 Verified in Code |
| **`extraChildPrice`** | Price charged per extra child/night | `CreateRoomType.tsx` | `pricing.service.ts:303`, `occupancy-solver.util.ts:38` | Pricing | **Active Core Field** | 🟢 Verified in Code |

---

## 7. New Architecture — End-to-End Conceptual Flow

```
Guest Request (CheckIn, CheckOut, Adults, Children, Infants, RequestedRooms, Location)
     │
     ▼
Property Candidate Resolution (Geo, Radius, Category, Active Status)
     │
     ▼
Room Type Candidate Gathering
     │
     ▼
Availability & Inventory Engine (Night-by-night overlap query -> available room quantities)
     │
     ▼
Accommodation Solver (Combinatorial multiset generation + Bounded backtracking partition)
     │
     ▼
Central Pricing Engine (Headcount-first base absorption pricing + Extra guest surcharges)
     │
     ▼
Accommodation Solution Aggregator (Deduplicated, structured, priced solutions)
     │
     ▼
Ranking Engine (Requested room count match > Compactness > Lowest total price)
     │
     ▼
Search Presentation (Public UI renders solution cards with full room breakdown)
     │
     ▼
Booking Validation (Server-side re-validation of allocation, inventory, and rates)
     │
     ▼
Physical Room PMS Assignment (Consolidation sorting assigns physical room numbers)
     │
     ▼
Booking Persistence (Atomic transaction: Booking + BookingRooms + Held Inventory)
```

---

## 8. Proposed Normalized Occupancy Model (Conceptual vs Persistence)

### 8.1 Approved Business Concept:
- Primary Envelope: `Total Base Occupancy` ($B$) and `Total Max Occupancy` ($M$).
- Secondary Constraints: Optional `Base Max Adults`, optional `Base Max Children`, `Max Physical Adults`, `Max Physical Children`, `Max Physical Infants`.

### 8.2 Proposed Technical Representation (PROPOSAL — NOT YET APPROVED):
```typescript
export interface NormalizedOccupancyConfig {
  totalBaseOccupancy: number;
  totalMaxOccupancy: number;
  baseMaxAdults: number;
  baseMaxChildren: number;
  maxPhysicalAdults: number;
  maxPhysicalChildren: number;
  maxPhysicalInfants: number;
}
```

### 8.3 Persistence Schema Alternatives (STILL OPEN):
1. **Option A**: Add nullable fields (`totalBaseOccupancy`, `totalMaxOccupancy`, `baseMaxAdults`, `baseMaxChildren`) directly on `RoomType`.
2. **Option B**: Introduce a separate `OccupancyConfig` table.
3. **Option C**: Normalized domain service with dynamic in-memory adapter over existing `RoomType` columns.

---

## 9. Legacy Compatibility Strategy

### Conceptual Compatibility Adapter:
```
Existing Database Record (RoomType)
             │
             ▼
┌────────────────────────────────────────────────────────┐
│             LegacyCompatibilityAdapter                 │
│                                                        │
│  Translates legacy fields to NormalizedOccupancyConfig │
│  without modifying underlying production records.     │
└────────────────────────────────────────────────────────┘
             │
             ▼
Normalized Domain Engine (Solver, Pricing, Preview, Search)
```

> [!CAUTION]
> **UNVERIFIED PROPOSALS — DO NOT IMPLEMENT AS FINAL RULES**:
> The following fallback assumptions from previous blueprints are **PROPOSALS ONLY and ARE NOT YET APPROVED**:
> - `baseMaxAdults = totalBaseOccupancy`
> - `baseMaxChildren = totalBaseOccupancy - 1`
> - Automatically converting old `baseAdults` into `baseMaxAdults`
> - Automatically treating `freeChildrenCount` as `maxPhysicalInfants`
> 
> These rules require explicit business validation during the upcoming semantic audit.

---

## 10. Pricing — Approved Principles vs Open Decisions

### 10.1 Approved Pricing Principle:
- The base price covers guests up to `totalBaseOccupancy`.
- For $B = 3$, parties like $1A + 2C$ and $3A$ are fully covered under base price when no demographic restrictions are configured.
- When demographic restrictions exist (e.g., $B = 3$, `baseMaxAdults = 2`, `baseMaxChildren = 1`):
  - $1A, 2A, 1A + 1C, 2A + 1C \implies$ ₹0 extra charges.
  - $3A \implies$ 1 Extra Adult charge ($3 > 2$).
  - $1A + 2C \implies$ 1 Extra Child charge ($2 > 1$).

### 10.2 OPEN DECISION — Mixed-Excess Pricing Rule:
- When a party exceeds total base occupancy across both categories (e.g., $2A + 2C$ in a room with $B = 3$, `baseMaxAdults = 2`, `baseMaxChildren = 1`):
  - Headcount excess is $4 - 3 = 1$ guest.
  - **The deterministic rule to decide whether the excess guest is billed as an Extra Adult (₹300) or an Extra Child (₹150) IS NOT YET APPROVED.**
  - **Do NOT assume "adult-first absorption" is approved.** This remains an open business decision.

---

## 11. Pure Solver Status (`occupancy-solver.util.ts`)

- **Current State**: Implemented on branch `wip-rebuilding-occupancy-rule` as an isolated utility.
- **Test Status**: **28 unit tests passing** (`occupancy-solver.util.spec.ts`).
- **Proven Capabilities**:
  - Deterministic bounded backtracking partition.
  - Distinct multiset combination generation ($[A, B]$ evaluated once, no $[B, A]$ duplicates).
  - Heterogeneous / asymmetric capacity support.
  - Real inventory quantity bounding per room type.
  - Independent infant placement and cot limit enforcement.
  - Requested room count ranking metadata.
- **DO NOT MODIFY THE SOLVER** during documentation or audit phases.

---

## 12. Availability Architecture

- **Intended Role**: `AvailabilityService` must be strictly responsible for **physical inventory existence** (querying enabled rooms, subtracting active overlapping bookings, holds, and maintenance blocks across stay dates).
- **Decoupling**: The legacy SQL query filter (`WHERE maxAdults >= ceil(A/R)`) creates false negatives and will eventually be bypassed in favor of feeding available quantities to the Solver.

---

## 13. Search Architecture

- **Core Paradigm Shift**: Search returns **Accommodation Solutions** (which can be a single room, multiple rooms of the same type, or a mixed combination) with exact pricing and guest assignments.
- **Preference-Based Ranking**:
  1. Exact match with requested room count.
  2. Compactness (fewer rooms first).
  3. Total price per night (lowest first).

---

## 14. Booking Architecture

At booking checkout:
1. Client submits selected Accommodation Solution.
2. Server validates single-room physical bounds for every room in the allocation.
3. Server re-verifies real-time physical inventory availability.
4. Server recalculates and confirms pricing server-side.
5. Server assigns physical rooms using PMS Consolidation Sorting.
6. Server atomically commits `Booking` and `BookingRoom` records.

---

## 15. External Integrations & Contracts

| External Channel | Contractual Dependency | Current Mapping in Codebase | Renovation Safety Constraint |
| :--- | :--- | :--- | :--- |
| **Channex Channel Manager** | REST Room Type & Rate Plan APIs | `occ_adults: maxAdults`, `occ_children: maxChildren`, `occ_infants: freeChildrenCount`, `default_occupancy: maxAdults` | **DO NOT DELETE OR RENAME `maxAdults`, `maxChildren`, or `freeChildrenCount`**. Channex contract requires formal verification before any modification. |
| **Connectivity Partner APIs** | JSON Schema for external OTAs/PMSs | `occupancy: { maxAdults, maxChildren, baseAdults, baseChildren }` | Must maintain existing JSON response shape; new total occupancy fields will be additive. |
| **Channel Partner Portal** | Frontend Room Selection & Pricing | Reads `room.maxAdults`, `room.maxChildren` | Pricing will route through central server-side calculation. |

---

## 16. Production Migration Philosophy

- **No Immediate Destructive Rewrites**: Existing ~300 production property records must not be deleted, renamed, or modified destructively.
- **Conceptual Pipeline**:
  $$\text{Legacy Data} \longrightarrow \text{Compatibility Adapter} \longrightarrow \text{Normalized Domain Model} \longrightarrow \text{Shadow Run} \longrightarrow \text{Cutover}$$
- **Database Schema**: Any schema modifications must be additive (nullable columns with runtime fallbacks).
- **Migration SQL / Backfill Formulas**: **ARE NOT YET APPROVED** and must await semantic audit completion.

---

## 17. Shadow / Dual-Run Validation Strategy

```
Phase 1: Shadow Execution
├── Legacy search flow executes and returns live response to guest.
├── New solver flow executes asynchronously in the background on the same query.
└── Discrepancies in availability or pricing are logged for audit.

Phase 2: Staging Feature Flag
├── Enable solver via environment flag (ENABLE_OCCUPANCY_SOLVER=true) on staging.
└── Property owners and QA test complex mixed-room combinations.

Phase 3: Phased Production Cutover
├── Enable on property-direct booking pages first.
└── Enable on global search results.

Phase 4: Legacy Disablement
└── Disable legacy code paths only after 100% parity is verified in production.
```

---

## 18. Deprecation Candidates

| Existing Code / Field | Reason for Potential Deprecation | Dependent Subsystems | Status | Safety Condition for Deletion |
| :--- | :--- | :--- | :--- | :--- |
| `availability.service.ts:1059-1060` | SQL WHERE `maxAdults >= ceil(A/R)` drops valid rooms | Public Search | Active in Prod | Delete only after Solver search cutover is live. |
| `bookings.service.ts:195` | `Math.ceil(adults / maxAdults)` blocks multi-guest single rooms | Public Booking | Active in Prod | Delete only after Solution booking validator is live. |
| `pricing.service.ts:292-304` | Independent A/C base subtraction penalizes mixed guests | Central Pricing | Active in Prod | Replace only after headcount-first pricing engine is verified. |
| `freeChildrenCount` | Legacy free child counter | Channex sync | Active in Prod | Keep permanently if required by Channex contract. |

---

## 19. Safe & Low-Impact Subsystems

The following platform areas are architecturally decoupled from occupancy decision logic and must remain untouched:
- Authentication, Sessions, Password resets (`backend/src/auth/`).
- Razorpay payments, manual payment verification (`backend/src/payments/`).
- Property settlements, partner payouts, financial reconciliations (`backend/src/financials/`).
- WhatsApp notifications, SMS messaging, Email templates (`backend/src/notifications/`, `mail/`).
- Reviews, ratings, guest feedback (`backend/src/reviews/`).
- PMS room status transitions, housekeeping, key management (`backend/src/rooms/`).

---

## 20. APPROVED Decisions Checklist
*(Formally agreed — DO NOT ALTER without business approval)*

- [x] **[APPROVED]** Total Base Occupancy ($B$) is the total headcount of Adults + Children covered by the base room rate.
- [x] **[APPROVED]** Total Maximum Physical Occupancy ($M$) is the hard physical ceiling on Adults + Children in the room.
- [x] **[APPROVED]** Infants are an independent dimension (do not consume $A+C$ capacity, ₹0 price, bounded by `maxPhysicalInfants`).
- [x] **[APPROVED]** Physical adult and child limits (`maxPhysicalAdults`, `maxPhysicalChildren`) are hard physical boundaries.
- [x] **[APPROVED]** Base demographic restrictions (`baseMaxAdults?`, `baseMaxChildren?`) are pricing rules, not physical limits.
- [x] **[APPROVED]** Discovery and search must return complete **Accommodation Solutions** (single, multi-room, mixed).
- [x] **[APPROVED]** Requested room count is a preference / ranking signal, not an automatic hard filter.
- [x] **[APPROVED]** Existing production code and data must remain intact and protected during the renovation.
- [x] **[APPROVED]** Side-by-side / shadow validation is required before production cutover.
- [x] **[APPROVED]** Legacy fields must initially be preserved for backward compatibility.

---

## 21. UNAPPROVED Proposals & Technical Assumptions
*(Proposals from earlier blueprints requiring formal validation — DO NOT TREAT AS APPROVED FACTS)*

- [ ] **[NOT APPROVED]** Exact database schema design (direct on `RoomType` vs separate table vs in-memory adapter).
- [ ] **[NOT APPROVED]** Default fallback formulas (e.g. `baseMaxAdults = totalBaseOccupancy`).
- [ ] **[NOT APPROVED]** Automatic conversion of old `baseAdults`/`baseChildren` into new demographic restrictions.
- [ ] **[NOT APPROVED]** SQL migration and backfill scripts.
- [ ] **[NOT APPROVED]** Adult-first mixed excess pricing rule.
- [ ] **[NOT APPROVED]** Mapping `freeChildrenCount` to `maxPhysicalInfants` in Channex.
- [ ] **[NOT APPROVED]** Deprecation or removal of `freeChildrenCount`.
- [ ] **[NOT APPROVED]** Exact Accommodation Solution database persistence schema.
- [ ] **[NOT APPROVED]** Exact ranking algorithm weights.

---

## 22. Open Business Questions Requiring RouteGuide Decisions

1. **Mixed-Excess Pricing Allocation**:
   When guest headcount exceeds base occupancy across categories (e.g., $2A + 2C$ in a room with $B = 3, \text{BaseMaxA} = 2, \text{BaseMaxC} = 1$), which guest is billed as the extra guest? Adult or Child?
2. **Persistence Location of Occupancy Envelopes**:
   Should `totalBaseOccupancy` and `totalMaxOccupancy` be stored as new columns on `RoomType` or in a dedicated configuration model?
3. **Channex Channel Manager Contract Rules**:
   What exact fields does Channex require for OTA distribution, and can rate plans accept total occupancy rather than adult count?
4. **Search Lead Price Display Policy**:
   When a search query matches via 1 room + extra fee (e.g., ₹1300) vs 2 rooms (e.g., ₹2000), should the property card display the single-room inclusive rate as the starting price?

---

## 23. Renovation Task Roadmap & Status

1. **Task 1 [COMPLETED]**: Complete Semantic & Dependency Validation Audit across database schema, services, DTOs, frontend forms, pricing, search, booking, Channex, and connectivity.
   - **Report**: [`docs/occupancy-renovation/01-SEMANTIC-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/01-SEMANTIC-AUDIT.md)
   - **Key Confirmed Findings**: Search & booking false negatives stem from `WHERE maxAdults >= ceil(A/R)` legacy SQL filters (`availability.service.ts:1059`, `bookings.service.ts:195`). Pricing calculates adult/child surcharges independently (`pricing.service.ts:292, 299`). Frontend UIs auto-clone `baseAdults` into `maxAdults`.
2. **Task 2 [COMPLETED]**: Verification of Channex & Connectivity API Contractual Payloads.
   - **Report**: [`docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md)
   - **Key Confirmed Findings**: Channex `occ_infants` represents baby cots (not free children); `occ_adults` represents all adult sleeping spaces (convertible for children); Channex rate plan `occupancy` is an integer headcount tier; `freeChildrenCount` is completely unused internally and was only consumed by Channex sync; Connectivity API is safe for additive occupancy extensions.
3. **Task 3 [COMPLETED]**: Production Occupancy Data Audit & Migration Feasibility.
   - **Report**: [`docs/occupancy-renovation/03-PRODUCTION-DATA-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/03-PRODUCTION-DATA-AUDIT.md)
   - **Key Confirmed Findings**: Migration feasibility classified as **`SAFE WITH EXCEPTIONS (FEASIBLE WITH DUAL-RUN ADAPTER)`**; 100% of existing configurations map without data loss; Advanced demographic restrictions (`baseMaxAdults = baseAdults`, `baseMaxChildren = baseChildren`) guarantee exact historical price parity.
4. **Task 3 Follow-up [COMPLETED]**: Legacy Production Exception Audit & Field-Consumer Analysis.
   - **Report**: [`docs/occupancy-renovation/04-LEGACY-PRODUCTION-EXCEPTION-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/04-LEGACY-PRODUCTION-EXCEPTION-AUDIT.md)
   - **Key Confirmed Findings**:
     - Exactly **28 unique RoomTypes (10.5%)** have legacy exceptions across the 266 production catalog.
     - **119 out of 125 total platform bookings (95.2%)** were transacted against these exceptional room types (chiefly `WAYANAD VISTA PALM VIEW VILLA` and `New Serene Lake Resort`).
     - In early group/dorm inventory, `maxAdults` (e.g. 10, 20) was deliberately used to hold physical capacity. A naive migration that discards `maxAdults` in favor of unmanaged `maxPhysicalAdults` (4) would break capacity from 20 to 4.
     - In 11 recent double rooms, `maxPhysicalAdults = 1` was written due to a UI form counter starting at 1. `baseAdults = 2` holds the intended base capacity.
     - In adult-only rooms where `maxChildren = 0` and `freeChildrenCount = 0`, `baseChildren = 1` was an unintended Prisma schema default.
5. **Task 5 (Architecture Specification) [COMPLETED]**: Occupancy Versioning & Migration Architecture.
   - **Report**: [`docs/occupancy-renovation/05-OCCUPANCY-VERSIONING-AND-MIGRATION-ARCHITECTURE.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/05-OCCUPANCY-VERSIONING-AND-MIGRATION-ARCHITECTURE.md)
   - **Key Confirmed Findings**: ONE Canonical Engine; Direct Additive Columns (Option A); Property-Level Activation; Group Booking Isolated.
6. **Task 6 (Final Implementation Specification) [COMPLETED]**: Final Canonical Occupancy Model & Implementation Specification.
   - **Report**: [`docs/occupancy-renovation/06-FINAL-CANONICAL-OCCUPANCY-IMPLEMENTATION-SPEC.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/06-FINAL-CANONICAL-OCCUPANCY-IMPLEMENTATION-SPEC.md)
   - **Key Confirmed Findings**:
     - Complete mathematical definitions for 8-tuple $\langle B, M, P_A, P_C, P_I, bMA, bMC, FC \rangle$.
     - Exact deterministic surcharge algorithm with mixed excess charged as Extra Adult.
     - `freeChildrenCount` governs free children (ages 2–6); infants (ages 0–2) are $₹0$ and independent.
     - Multi-room accommodation solution ranking policy (cheapest highlighted with `isRecommended: true`).
     - Prisma search pre-filtering formula avoiding legacy false negatives.
     - Direct additive schema specification and Decision Verification Checklist.
7. **Combined Phase 1 [COMPLETED]**: Phase 1 (V2 Database/Foundation) + Phase 2 (Canonical Occupancy Engine).
   - **Schema Changes**: Added additive nullable V2 fields (`occupancyVersion`, `totalBaseOccupancy`, `totalMaxOccupancy`, `baseMaxAdults`, `baseMaxChildren`) to `RoomType` and `occupancyVersion` to `Property`. Legacy fields fully preserved.
   - **Migration**: Created [`backend/prisma/migrations/20260908150000_add_v2_canonical_occupancy_fields/migration.sql`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/prisma/migrations/20260908150000_add_v2_canonical_occupancy_fields/migration.sql).
   - **Canonical Engine**: Implemented pure canonical engine in [`backend/src/common/utils/occupancy-solver.util.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-solver.util.ts).
   - **Unit Tests**: 33 unit tests in [`backend/src/common/utils/occupancy-solver.util.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-solver.util.spec.ts) passing 100%.
8. **Combined Phase 2 [COMPLETED]**: Phase 3 (Pricing Integration) + Phase 4 (Availability/Search Integration).
   - **Property-Level Runtime Switch**: `Property.occupancyVersion` is the authoritative runtime activation switch. All RoomTypes under a V2 property execute the canonical V2 engine (with V2 readiness and non-null validation enforced). V1 properties remain 100% legacy even if individual RoomTypes have V2 fields.
   - **Pricing Integration**: Integrated `calculateCanonicalSurcharges` and `validatePhysicalFeasibility` into [`backend/src/bookings/pricing.service.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/pricing.service.ts). V2 pricing validates physical boundaries, enforces totalBaseOccupancy and base demographic caps, applies mixed excess rule (charged as Extra Adult), handles free children without expanding base, and prices infants at ₹0.
   - **Availability / Search Integration**: Integrated `solveAccommodationOptions` into [`backend/src/bookings/availability.service.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/availability.service.ts). Implemented non-lossy candidate prefilter based on property version. The canonical solver evaluates all valid solutions, supports repeated and mixed room types (Case J), unequal distributions (Case I), and treats requested room count as a ranking preference (Case K). The cheapest solution is tagged with `isRecommended: true` and `badge: "Best Value"` (Case L). `groupMaxOccupancy` is strictly isolated from standard search (Case M). Candidate prefilter is non-lossy (Case N). V1 search loop remains 100% isolated and unchanged (Case O).
   - **API DTOs**: Additively added optional `infantsCount` / `infants` to [`CalculatePriceDto`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/dto/calculate-price.dto.ts) and [`SearchRoomsDto`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/dto/search-rooms.dto.ts), and wired them through [`BookingsController`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/bookings.controller.ts).
   - **Tests**: Added comprehensive unit tests in [`backend/src/bookings/pricing.service.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/pricing.service.spec.ts) (Cases A–H) and [`backend/src/bookings/availability.service.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/availability.service.spec.ts) (Cases G, H, I, J, K, L, M, N, O). **70/70 total targeted tests passing**.
   - **Build**: `npm run build` succeeds with zero errors.
- **Current State**: Implemented on branch `wip-rebuilding-occupancy-rule` as an isolated utility.
- **Test Status**: **28 unit tests passing** (`occupancy-solver.util.spec.ts`).
- **Proven Capabilities**:
  - Deterministic bounded backtracking partition.
  - Distinct multiset combination generation ($[A, B]$ evaluated once, no $[B, A]$ duplicates).
  - Heterogeneous / asymmetric capacity support.
  - Real inventory quantity bounding per room type.
  - Independent infant placement and cot limit enforcement.
  - Requested room count ranking metadata.
- **DO NOT MODIFY THE SOLVER** during documentation or audit phases.

---

## 12. Availability Architecture

- **Intended Role**: `AvailabilityService` must be strictly responsible for **physical inventory existence** (querying enabled rooms, subtracting active overlapping bookings, holds, and maintenance blocks across stay dates).
- **Decoupling**: The legacy SQL query filter (`WHERE maxAdults >= ceil(A/R)`) creates false negatives and will eventually be bypassed in favor of feeding available quantities to the Solver.

---

## 13. Search Architecture

- **Core Paradigm Shift**: Search returns **Accommodation Solutions** (which can be a single room, multiple rooms of the same type, or a mixed combination) with exact pricing and guest assignments.
- **Preference-Based Ranking**:
  1. Exact match with requested room count.
  2. Compactness (fewer rooms first).
  3. Total price per night (lowest first).

---

## 14. Booking Architecture

At booking checkout:
1. Client submits selected Accommodation Solution.
2. Server validates single-room physical bounds for every room in the allocation.
3. Server re-verifies real-time physical inventory availability.
4. Server recalculates and confirms pricing server-side.
5. Server assigns physical rooms using PMS Consolidation Sorting.
6. Server atomically commits `Booking` and `BookingRoom` records.

---

## 15. External Integrations & Contracts

| External Channel | Contractual Dependency | Current Mapping in Codebase | Renovation Safety Constraint |
| :--- | :--- | :--- | :--- |
| **Channex Channel Manager** | REST Room Type & Rate Plan APIs | `occ_adults: maxAdults`, `occ_children: maxChildren`, `occ_infants: freeChildrenCount`, `default_occupancy: maxAdults` | **DO NOT DELETE OR RENAME `maxAdults`, `maxChildren`, or `freeChildrenCount`**. Channex contract requires formal verification before any modification. |
| **Connectivity Partner APIs** | JSON Schema for external OTAs/PMSs | `occupancy: { maxAdults, maxChildren, baseAdults, baseChildren }` | Must maintain existing JSON response shape; new total occupancy fields will be additive. |
| **Channel Partner Portal** | Frontend Room Selection & Pricing | Reads `room.maxAdults`, `room.maxChildren` | Pricing will route through central server-side calculation. |

---

## 16. Production Migration Philosophy

- **No Immediate Destructive Rewrites**: Existing ~300 production property records must not be deleted, renamed, or modified destructively.
- **Conceptual Pipeline**:
  $$\text{Legacy Data} \longrightarrow \text{Compatibility Adapter} \longrightarrow \text{Normalized Domain Model} \longrightarrow \text{Shadow Run} \longrightarrow \text{Cutover}$$
- **Database Schema**: Any schema modifications must be additive (nullable columns with runtime fallbacks).
- **Migration SQL / Backfill Formulas**: **ARE NOT YET APPROVED** and must await semantic audit completion.

---

## 17. Shadow / Dual-Run Validation Strategy

```
Phase 1: Shadow Execution
├── Legacy search flow executes and returns live response to guest.
├── New solver flow executes asynchronously in the background on the same query.
└── Discrepancies in availability or pricing are logged for audit.

Phase 2: Staging Feature Flag
├── Enable solver via environment flag (ENABLE_OCCUPANCY_SOLVER=true) on staging.
└── Property owners and QA test complex mixed-room combinations.

Phase 3: Phased Production Cutover
├── Enable on property-direct booking pages first.
└── Enable on global search results.

Phase 4: Legacy Disablement
└── Disable legacy code paths only after 100% parity is verified in production.
```

---

## 18. Deprecation Candidates

| Existing Code / Field | Reason for Potential Deprecation | Dependent Subsystems | Status | Safety Condition for Deletion |
| :--- | :--- | :--- | :--- | :--- |
| `availability.service.ts:1059-1060` | SQL WHERE `maxAdults >= ceil(A/R)` drops valid rooms | Public Search | Active in Prod | Delete only after Solver search cutover is live. |
| `bookings.service.ts:195` | `Math.ceil(adults / maxAdults)` blocks multi-guest single rooms | Public Booking | Active in Prod | Delete only after Solution booking validator is live. |
| `pricing.service.ts:292-304` | Independent A/C base subtraction penalizes mixed guests | Central Pricing | Active in Prod | Replace only after headcount-first pricing engine is verified. |
| `freeChildrenCount` | Legacy free child counter | Channex sync | Active in Prod | Keep permanently if required by Channex contract. |

---

## 19. Safe & Low-Impact Subsystems

The following platform areas are architecturally decoupled from occupancy decision logic and must remain untouched:
- Authentication, Sessions, Password resets (`backend/src/auth/`).
- Razorpay payments, manual payment verification (`backend/src/payments/`).
- Property settlements, partner payouts, financial reconciliations (`backend/src/financials/`).
- WhatsApp notifications, SMS messaging, Email templates (`backend/src/notifications/`, `mail/`).
- Reviews, ratings, guest feedback (`backend/src/reviews/`).
- PMS room status transitions, housekeeping, key management (`backend/src/rooms/`).

---

## 20. APPROVED Decisions Checklist
*(Formally agreed — DO NOT ALTER without business approval)*

- [x] **[APPROVED]** Total Base Occupancy ($B$) is the total headcount of Adults + Children covered by the base room rate.
- [x] **[APPROVED]** Total Maximum Physical Occupancy ($M$) is the hard physical ceiling on Adults + Children in the room.
- [x] **[APPROVED]** Infants are an independent dimension (do not consume $A+C$ capacity, ₹0 price, bounded by `maxPhysicalInfants`).
- [x] **[APPROVED]** Physical adult and child limits (`maxPhysicalAdults`, `maxPhysicalChildren`) are hard physical boundaries.
- [x] **[APPROVED]** Base demographic restrictions (`baseMaxAdults?`, `baseMaxChildren?`) are pricing rules, not physical limits.
- [x] **[APPROVED]** Discovery and search must return complete **Accommodation Solutions** (single, multi-room, mixed).
- [x] **[APPROVED]** Requested room count is a preference / ranking signal, not an automatic hard filter.
- [x] **[APPROVED]** Existing production code and data must remain intact and protected during the renovation.
- [x] **[APPROVED]** Side-by-side / shadow validation is required before production cutover.
- [x] **[APPROVED]** Legacy fields must initially be preserved for backward compatibility.

---

## 21. UNAPPROVED Proposals & Technical Assumptions
*(Proposals from earlier blueprints requiring formal validation — DO NOT TREAT AS APPROVED FACTS)*

- [ ] **[NOT APPROVED]** Exact database schema design (direct on `RoomType` vs separate table vs in-memory adapter).
- [ ] **[NOT APPROVED]** Default fallback formulas (e.g. `baseMaxAdults = totalBaseOccupancy`).
- [ ] **[NOT APPROVED]** Automatic conversion of old `baseAdults`/`baseChildren` into new demographic restrictions.
- [ ] **[NOT APPROVED]** SQL migration and backfill scripts.
- [ ] **[NOT APPROVED]** Adult-first mixed excess pricing rule.
- [ ] **[NOT APPROVED]** Mapping `freeChildrenCount` to `maxPhysicalInfants` in Channex.
- [ ] **[NOT APPROVED]** Deprecation or removal of `freeChildrenCount`.
- [ ] **[NOT APPROVED]** Exact Accommodation Solution database persistence schema.
- [ ] **[NOT APPROVED]** Exact ranking algorithm weights.

---

## 22. Open Business Questions Requiring RouteGuide Decisions

1. **Mixed-Excess Pricing Allocation**:
   When guest headcount exceeds base occupancy across categories (e.g., $2A + 2C$ in a room with $B = 3, \text{BaseMaxA} = 2, \text{BaseMaxC} = 1$), which guest is billed as the extra guest? Adult or Child?
2. **Persistence Location of Occupancy Envelopes**:
   Should `totalBaseOccupancy` and `totalMaxOccupancy` be stored as new columns on `RoomType` or in a dedicated configuration model?
3. **Channex Channel Manager Contract Rules**:
   What exact fields does Channex require for OTA distribution, and can rate plans accept total occupancy rather than adult count?
4. **Search Lead Price Display Policy**:
   When a search query matches via 1 room + extra fee (e.g., ₹1300) vs 2 rooms (e.g., ₹2000), should the property card display the single-room inclusive rate as the starting price?

---

## 23. Renovation Task Roadmap & Status

1. **Task 1 [COMPLETED]**: Complete Semantic & Dependency Validation Audit across database schema, services, DTOs, frontend forms, pricing, search, booking, Channex, and connectivity.
   - **Report**: [`docs/occupancy-renovation/01-SEMANTIC-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/01-SEMANTIC-AUDIT.md)
   - **Key Confirmed Findings**: Search & booking false negatives stem from `WHERE maxAdults >= ceil(A/R)` legacy SQL filters (`availability.service.ts:1059`, `bookings.service.ts:195`). Pricing calculates adult/child surcharges independently (`pricing.service.ts:292, 299`). Frontend UIs auto-clone `baseAdults` into `maxAdults`.
2. **Task 2 [COMPLETED]**: Verification of Channex & Connectivity API Contractual Payloads.
   - **Report**: [`docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md)
   - **Key Confirmed Findings**: Channex `occ_infants` represents baby cots (not free children); `occ_adults` represents all adult sleeping spaces (convertible for children); Channex rate plan `occupancy` is an integer headcount tier; `freeChildrenCount` is completely unused internally and was only consumed by Channex sync; Connectivity API is safe for additive occupancy extensions.
3. **Task 3 [COMPLETED]**: Production Occupancy Data Audit & Migration Feasibility.
   - **Report**: [`docs/occupancy-renovation/03-PRODUCTION-DATA-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/03-PRODUCTION-DATA-AUDIT.md)
   - **Key Confirmed Findings**: Migration feasibility classified as **`SAFE WITH EXCEPTIONS (FEASIBLE WITH DUAL-RUN ADAPTER)`**; 100% of existing configurations map without data loss; Advanced demographic restrictions (`baseMaxAdults = baseAdults`, `baseMaxChildren = baseChildren`) guarantee exact historical price parity.
4. **Task 3 Follow-up [COMPLETED]**: Legacy Production Exception Audit & Field-Consumer Analysis.
   - **Report**: [`docs/occupancy-renovation/04-LEGACY-PRODUCTION-EXCEPTION-AUDIT.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/04-LEGACY-PRODUCTION-EXCEPTION-AUDIT.md)
   - **Key Confirmed Findings**:
     - Exactly **28 unique RoomTypes (10.5%)** have legacy exceptions across the 266 production catalog.
     - **119 out of 125 total platform bookings (95.2%)** were transacted against these exceptional room types (chiefly `WAYANAD VISTA PALM VIEW VILLA` and `New Serene Lake Resort`).
     - In early group/dorm inventory, `maxAdults` (e.g. 10, 20) was deliberately used to hold physical capacity. A naive migration that discards `maxAdults` in favor of unmanaged `maxPhysicalAdults` (4) would break capacity from 20 to 4.
     - In 11 recent double rooms, `maxPhysicalAdults = 1` was written due to a UI form counter starting at 1. `baseAdults = 2` holds the intended base capacity.
     - In adult-only rooms where `maxChildren = 0` and `freeChildrenCount = 0`, `baseChildren = 1` was an unintended Prisma schema default.
5. **Task 5 (Architecture Specification) [COMPLETED]**: Occupancy Versioning & Migration Architecture.
   - **Report**: [`docs/occupancy-renovation/05-OCCUPANCY-VERSIONING-AND-MIGRATION-ARCHITECTURE.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/05-OCCUPANCY-VERSIONING-AND-MIGRATION-ARCHITECTURE.md)
   - **Key Confirmed Findings**: ONE Canonical Engine; Direct Additive Columns (Option A); Property-Level Activation; Group Booking Isolated.
6. **Task 6 (Final Implementation Specification) [COMPLETED]**: Final Canonical Occupancy Model & Implementation Specification.
   - **Report**: [`docs/occupancy-renovation/06-FINAL-CANONICAL-OCCUPANCY-IMPLEMENTATION-SPEC.md`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/docs/occupancy-renovation/06-FINAL-CANONICAL-OCCUPANCY-IMPLEMENTATION-SPEC.md)
   - **Key Confirmed Findings**:
     - Complete mathematical definitions for 8-tuple $\langle B, M, P_A, P_C, P_I, bMA, bMC, FC \rangle$.
     - Exact deterministic surcharge algorithm with mixed excess charged as Extra Adult.
     - `freeChildrenCount` governs free children (ages 2–6); infants (ages 0–2) are $₹0$ and independent.
     - Multi-room accommodation solution ranking policy (cheapest highlighted with `isRecommended: true`).
     - Prisma search pre-filtering formula avoiding legacy false negatives.
     - Direct additive schema specification and Decision Verification Checklist.
7. **Combined Phase 1 [COMPLETED]**: Phase 1 (V2 Database/Foundation) + Phase 2 (Canonical Occupancy Engine).
   - **Schema Changes**: Added additive nullable V2 fields (`occupancyVersion`, `totalBaseOccupancy`, `totalMaxOccupancy`, `baseMaxAdults`, `baseMaxChildren`) to `RoomType` and `occupancyVersion` to `Property`. Legacy fields fully preserved.
   - **Migration**: Created [`backend/prisma/migrations/20260908150000_add_v2_canonical_occupancy_fields/migration.sql`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/prisma/migrations/20260908150000_add_v2_canonical_occupancy_fields/migration.sql).
   - **Canonical Engine**: Implemented pure canonical engine in [`backend/src/common/utils/occupancy-solver.util.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-solver.util.ts).
   - **Unit Tests**: 33 unit tests in [`backend/src/common/utils/occupancy-solver.util.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-solver.util.spec.ts) passing 100%.
8. **Combined Phase 2 [COMPLETED]**: Phase 3 (Pricing Integration) + Phase 4 (Availability/Search Integration).
   - **Property-Level Runtime Switch**: `Property.occupancyVersion` is the authoritative runtime activation switch. All RoomTypes under a V2 property execute the canonical V2 engine (with V2 readiness and non-null validation enforced). V1 properties remain 100% legacy even if individual RoomTypes have V2 fields.
   - **Pricing Integration**: Integrated `calculateCanonicalSurcharges` and `validatePhysicalFeasibility` into [`backend/src/bookings/pricing.service.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/pricing.service.ts). V2 pricing validates physical boundaries, enforces totalBaseOccupancy and base demographic caps, applies mixed excess rule (charged as Extra Adult), handles free children without expanding base, and prices infants at ₹0.
   - **Availability / Search Integration**: Integrated `solveAccommodationOptions` into [`backend/src/bookings/availability.service.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/availability.service.ts). Implemented non-lossy candidate prefilter based on property version. The canonical solver evaluates all valid solutions, supports repeated and mixed room types (Case J), unequal distributions (Case I), and treats requested room count as a ranking preference (Case K). The cheapest solution is tagged with `isRecommended: true` and `badge: "Best Value"` (Case L). `groupMaxOccupancy` is strictly isolated from standard search (Case M). Candidate prefilter is non-lossy (Case N). V1 search loop remains 100% isolated and unchanged (Case O).
   - **API DTOs**: Additively added optional `infantsCount` / `infants` to [`CalculatePriceDto`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/dto/calculate-price.dto.ts) and [`SearchRoomsDto`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/dto/search-rooms.dto.ts), and wired them through [`BookingsController`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/bookings.controller.ts).
   - **Tests**: Added comprehensive unit tests in [`backend/src/bookings/pricing.service.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/pricing.service.spec.ts) (Cases A–H) and [`backend/src/bookings/availability.service.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/availability.service.spec.ts) (Cases G, H, I, J, K, L, M, N, O). **70/70 total targeted tests passing**.
   - **Build**: `npm run build` succeeds with zero errors.
9. **Combined Phase 3 [COMPLETED]**: Phase 5 (Booking Integration) + Phase 6 (V1 Compatibility/Migration).
   - **Booking Integration**: Integrated `validatePhysicalFeasibility` and authoritative server-side canonical pricing (`PricingService.calculatePrice`) into `BookingsService.create()` and `BookingsService.reschedule()`.
     - **Property-Level Boundary**: `Property.occupancyVersion === 'V2'` is the runtime activation boundary. Under a V2 property, all RoomTypes are verified for V2 readiness.
     - **Authoritative Server Pricing**: Client-supplied prices cannot manipulate or override authoritative backend price calculation for public/unauthorized guests.
     - **Availability & Physical Revalidation**: Revalidates real-time availability and physical boundaries ($A \le P_A, C \le P_C, A+C \le M, I \le P_I$) at booking and rescheduling time.
     - **Infant Handling**: Additively added `infantsCount` across `CreateBookingDto`, `RescheduleBookingDto`, and `Booking` schema. Infants are $₹0$ and decoupled from $A+C$ physical/base headcount.
     - **Historical Immutability**: Historical bookings remain immutable; existing financial snapshots are preserved.
     - **Group Booking Isolation**: Dedicated group booking remains isolated via `groupMaxOccupancy`.
   - **Migration & Compatibility Subsystem**: Implemented pure, non-mutating audit, readiness, and shadow validation in [`backend/src/common/utils/occupancy-migration.util.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-migration.util.ts).
     - **Classification**: Categorizes legacy RoomTypes into `SAFE`, `REVIEW_REQUIRED`, or `INVALID`.
     - **No Fabrication**: Strictly prevents fabricating arbitrary `totalBaseOccupancy` or `totalMaxOccupancy` for ambiguous/invalid legacy records.
     - **Property Readiness Audit**: Provides boolean eligibility for V2 activation only when 100% of RoomTypes are valid and V2-ready.
     - **Shadow Validation**: Read-only simulation comparing V1 vs V2 allowed combinations and price deltas.
     - **Readiness Endpoints**: Exposed read-only GET endpoints in `PropertiesController` (`:id/occupancy-readiness` and `:id/occupancy-shadow-validation`).
   - **Tests**: Comprehensive unit tests covering Booking Cases A–L and Migration Cases A–I across [`backend/src/bookings/bookings.service.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/bookings/bookings.service.spec.ts) and [`backend/src/common/utils/occupancy-migration.util.spec.ts`](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%20projects/ResortProject/backend/src/common/utils/occupancy-migration.util.spec.ts). **91/91 targeted tests passing**.
10. **Combined Phase 4 [COMPLETED & VERIFIED]**: Phase 7 (Channex Integration) + Phase 8 (Production Migration & Rollout).
    - **Channex Canonical Mapping**: `maxPhysicalAdults` $\to$ `occ_adults`, `maxPhysicalChildren` $\to$ `occ_children`, `freeChildrenCount` $\to$ `occ_infants`, `totalBaseOccupancy` $\to$ `default_occupancy`.
    - **Anti-Clamping Pre-Sync Validation**: Block sync if $B > P_A$ (`totalBaseOccupancy > maxPhysicalAdults`) or required canonical fields are missing. Values are never silently rewritten.
    - **Property Activation Mechanism**: Implemented `activateV2Occupancy` and `deactivateV2Occupancy` in `PropertiesService` and `PropertiesController`. Requires 100% V2 readiness and Channex compatibility.
    - **Tests**: 114/114 targeted tests passing across 7 suites. Full backend suite reports 352 passing tests. Production build succeeds cleanly.

---

## 24. Future Implementation Principles

- **Side-by-Side Construction**: New occupancy functionality must be built alongside legacy code paths.
- **Zero-Downtime Transition**: Legacy behavior remains active until the new path is validated through automated tests, staging, shadow comparison, and controlled production rollout.
- **Safe Lifecycle**: **Disable first, verify in production, then delete.**

---

## 25. Document Metadata & Recovery Notice

```yaml
Document: docs/occupancy-renovation/00-SOURCE-OF-TRUTH.md
Status: ACTIVE IMPLEMENTATION SOURCE OF TRUTH
Version: v1.3
Last Updated: September 2026
Latest Completed Task: Combined Phase 4 (Phase 7 Channex Integration + Phase 8 Production Migration/Rollout)
All 8 Phases Status: IMPLEMENTED & VERIFIED
```

> [!NOTE]
> This document is the persistent context for future occupancy-renovation tasks. Any future implementation or architectural session must first read this document and must distinguish approved decisions from proposals and open questions.
