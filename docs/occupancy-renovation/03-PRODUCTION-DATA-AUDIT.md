# RouteGuide Occupancy Renovation — Production Occupancy Data Audit & Migration Feasibility
**Document Identifier**: `docs/occupancy-renovation/03-PRODUCTION-DATA-AUDIT.md`  
**Task Identifier**: TASK 3 (Source of Truth v0.4)  
**Status**: LIVE PRODUCTION DATABASE AUDIT COMPLETE (ACTUAL SERVER DATA)  
**Execution Date**: September 2026  
**Reference Documents**:
- `docs/occupancy-renovation/00-SOURCE-OF-TRUTH.md` (v0.4)
- `docs/occupancy-renovation/01-SEMANTIC-AUDIT.md` (Task 1 Audit)
- `docs/occupancy-renovation/02-EXTERNAL-CONTRACT-AUDIT.md` (Task 2 Audit)

---

## 1. Executive Summary

This document records the **actual live production database audit** executed directly against the RouteGuide production PostgreSQL database (`bizzatom-server`).

### 1.1 Live Platform Metrics (Production Truth)
- **Total Properties on Platform**: **226 Properties**
- **Properties with Configured RoomTypes**: **109 Properties (48.2%)**
- **Unconfigured Property Shells**: **117 Properties (51.8%)**
- **Total Production RoomTypes**: **266 RoomTypes**
- **Total Confirmed Bookings Analyzed**: **125 Bookings**

### 1.2 Top 5 Live Production Discoveries
1. **`maxPhysicalInfants` is NOT YET in Production DB**: The query failed on `column "maxPhysicalInfants" does not exist`, proving that infant cot capacity is purely in code/Prisma schema and has never been applied as a migration to production.
2. **`maxAdults` is 97.7% Synchronized**: In 260 out of 266 RoomTypes (97.7%), `maxAdults == baseAdults`. Only 6 RoomTypes (2.3%) diverge.
3. **`baseChildren` is 94.4% Synchronized**: In 251 out of 266 RoomTypes (94.4%), `maxChildren == baseChildren`. Only 15 RoomTypes (5.6%) diverge.
4. **`freeChildrenCount` is 94.0% Synchronized**: In 250 out of 266 RoomTypes (94.0%), `freeChildrenCount == baseChildren`. Only 16 RoomTypes (6.0%) diverge.
5. **Physical Limit Clamping Required (7.1% Inversion Anomaly)**: In 19 RoomTypes (7.1%), `baseAdults + baseChildren > maxPhysicalAdults + maxPhysicalChildren` (e.g. `baseAdults=2` but `maxPhysicalAdults=1` or large group villas). Backfill migration MUST apply $\max(\text{base}, \text{phys})$ clamping to avoid dropping room capacity.

---

## 2. Live Production Field Distributions ($N = 266$ RoomTypes)

### 2.1 Base Included Adults vs Legacy Max Adults

| Value | `baseAdults` Count | `baseAdults` % | `maxAdults` Count | `maxAdults` % | Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2** | **182** | **68.4%** | **176** | **66.2%** | Dominant standard double-occupancy room. |
| **4** | **23** | **8.6%** | **24** | **9.0%** | Quad rooms / 2-bedroom cottages. |
| **3** | **14** | **5.3%** | **16** | **6.0%** | Triple rooms. |
| **6** | **11** | **4.1%** | **11** | **4.1%** | Large family villas / dorms. |
| **10 – 12** | **12** | **4.5%** | **13** | **4.9%** | Whole-villa group buyouts. |
| **20+** | **7** | **2.6%** | **9** | **3.4%** | Estate buyouts (e.g. 70A, 25A, 20A). |
| **Other (1, 5, 7, 8, 13, 15, 18)** | **17** | **6.4%** | **17** | **6.4%** | Single rooms, small cottages. |
| **Total** | **266** | **100%** | **266** | **100%** | Divergence between `maxAdults` and `baseAdults`: **6 records (2.3%)**. |

### 2.2 Base Included Children vs Legacy Max Children

| Value | `baseChildren` Count | `baseChildren` % | `maxChildren` Count | `maxChildren` % | Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **174** | **65.4%** | **159** | **59.8%** | Dominant default child allowance. |
| **0** | **57** | **21.4%** | **65** | **24.4%** | Adult-only / strict couple rooms. |
| **2** | **24** | **9.0%** | **31** | **11.7%** | Family suites with 2 children included. |
| **3 – 5** | **11** | **4.1%** | **11** | **4.1%** | Multi-child villas. |
| **Total** | **266** | **100%** | **266** | **100%** | Divergence between `maxChildren` and `baseChildren`: **15 records (5.6%)**. |

### 2.3 Physical Limits & Free Children

| Value | `maxPhysicalAdults` Count | `maxPhysicalAdults` % | `maxPhysicalChildren` Count | `maxPhysicalChildren` % | `freeChildrenCount` Count | `freeChildrenCount` % |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | 0 | 0.0% | **61** | **22.9%** | **71** | **26.7%** |
| **1** | 14 | 5.3% | **99** | **37.2%** | **158** | **59.4%** |
| **2** | 24 | 9.0% | **93** | **35.0%** | **26** | **9.8%** |
| **3** | **107** | **40.2%** | 7 | 2.6% | 6 | 2.3% |
| **4** | **53** | **19.9%** | 2 | 0.8% | 2 | 0.8% |
| **5 – 6** | 27 | 10.2% | 4 | 1.5% | 3 | 1.1% |
| **8 – 15** | 28 | 10.5% | 0 | 0.0% | 0 | 0.0% |
| **18 – 48** | 13 | 4.9% | 0 | 0.0% | 0 | 0.0% |
| **Total** | **266** | **100%** | **266** | **100%** | **266** | **100%** |

---

## 3. Top 10 Joint Production Configurations ($N = 266$)

The top 10 configurations represent **174 out of 266 RoomTypes (65.4%)**:

| Rank | `baseAdults` | `baseChildren` | `maxAdults` | `maxChildren` | `maxPhysAdults` | `maxPhysChildren` | `freeChildren` | Count | % of Total | Archetype |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | `2` | `1` | `2` | `1` | `3` | `1` | `1` | **58** | **21.8%** | Standard Room + 1 Extra Bed |
| **#2** | `2` | `1` | `2` | `1` | `3` | `2` | `1` | **26** | **9.8%** | Standard Room + 1 Extra Bed + Child |
| **#3** | `2` | `1` | `2` | `1` | `4` | `2` | `1` | **20** | **7.5%** | Standard Room + 2 Extra Beds |
| **#4** | `2` | `1` | `2` | `1` | `2` | `1` | `1` | **16** | **6.0%** | Standard Room (Strict 2A Cap) |
| **#5** | `2` | `0` | `2` | `0` | `3` | `0` | `0` | **9** | **3.4%** | Adult-Only Room + 1 Extra Bed |
| **#6** | `2` | `1` | `2` | `1` | `1` | `1` | `1` | **6** | **2.3%** | *Anomaly*: $bA=2$ but $pA=1$ |
| **#7** | `3` | `0` | `3` | `0` | `3` | `0` | `0` | **5** | **1.9%** | Triple Adult Room |
| **#8** | `6` | `3` | `6` | `3` | `6` | `3` | `3` | **5** | **1.9%** | Family Cottage / Villa |
| **#9** | `2` | `1` | `2` | `0` | `4` | `2` | `0` | **5** | **1.9%** | Legacy Diverged Child Cap |
| **#10**| `2` | `0` | `2` | `0` | `2` | `0` | `0` | **4** | **1.5%** | Strict Couple Villa |

---

## 4. Live Conflict & Divergence Audit

| Anomaly / Check | Live Production Count | % of Catalog | Root Cause in Production Data | Migration Remedy Required |
| :--- | :--- | :--- | :--- | :--- |
| **`maxAdults != baseAdults`** | **6** | **2.3%** | Early properties manually configured before UI cloning was introduced. | Backfill preserves $\text{BaseMaxA} = \text{baseAdults}$ and $\text{PhysA} = \max(\text{maxAdults}, \text{maxPhysicalAdults})$. |
| **`maxChildren != baseChildren`** | **15** | **5.6%** | Early properties with asymmetric child pricing vs capacity. | Preserves $\text{BaseMaxC} = \text{baseChildren}$. |
| **`freeChildrenCount != baseChildren`** | **16** | **6.0%** | Legacy placeholder values before UI form sync. | Disconnected from Channex; mapped safely to 0-price infant cot dimension. |
| **`baseAdults > maxPhysicalAdults`** | **18** | **6.8%** | Corrupted inputs in portal or seed records where `maxPhysicalAdults` was set lower than `baseAdults` (e.g. $bA=2, pA=1$). | **CRITICAL BACKFILL RULE**: $\text{Candidate MaxPhysicalAdults} = \max(\text{baseAdults}, \text{maxPhysicalAdults}, \text{maxAdults})$. |
| **`baseChildren > maxPhysicalChildren`** | **13** | **4.9%** | Corrupted inputs where `maxPhysicalChildren` was set to 0 while `baseChildren` was 1. | **CRITICAL BACKFILL RULE**: $\text{Candidate MaxPhysicalChildren} = \max(\text{baseChildren}, \text{maxPhysicalChildren}, \text{maxChildren})$. |
| **Total Base > Total Physical Max** | **19** | **7.1%** | Direct consequence of the above inversions. | Resolved automatically by capacity clamp formula. |
| **`maxAdults > maxPhysicalAdults`** | **21** | **7.9%** | Early seed properties where `maxAdults=6` took default `maxPhysicalAdults=4`. | Resolved by $\max(\text{maxAdults}, \text{maxPhysicalAdults})$. |
| **`groupMaxOccupancy > 0`** | **71** | **26.7%** | 71 RoomTypes are part of whole-villa group buyout pools. | Preserved 100% in dedicated group booking engine. |
| **`extraAdultPrice > 0`** | **220** | **82.7%** | 82.7% of all room types actively charge extra adult fees. | Proves that extra adult pricing is the core commercial monetization model. |
| **`extraChildPrice > 0`** | **71** | **26.7%** | 26.7% of room types charge extra child fees; 73.3% allow included children at ₹0. | Preserved via `extraChildPrice`. |

---

## 5. Property-Level RoomType Catalog Distribution ($N = 109$ Configured Properties)

```
┌─────────────────────────────────────────────────────────────┐
│ ROOMTYPES PER CONFIGURED PROPERTY                           │
├──────────────────────┬─────────────────┬────────────────────┤
│ RoomTypes / Property │ Property Count  │ % of Active Resorts│
├──────────────────────┼─────────────────┼────────────────────┤
│ 1 RoomType           │ 35 properties   │ 32.1%              │
│ 2 RoomTypes          │ 27 properties   │ 24.8%              │
│ 3 RoomTypes          │ 25 properties   │ 22.9%              │
│ 4 RoomTypes          │ 14 properties   │ 12.8%              │
│ 5 RoomTypes          │ 3 properties    │ 2.8%               │
│ 6 RoomTypes          │ 4 properties    │ 3.7%               │
│ 7 RoomTypes          │ 1 property      │ 0.9%               │
├──────────────────────┴─────────────────┴────────────────────┤
│ Total: 109 Properties | 266 RoomTypes (Avg: 2.44 RT/Prop)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Live Production Booking Distribution ($N = 125$ Confirmed Bookings)

| Rank | Party Composition | Confirmed Bookings | % of Bookings | Observations & Commercial Insights |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | **2 Adults + 0 Children** | **22** | **17.6%** | Standard couple getaway. |
| **#2** | **4 Adults + 0 Children** | **7** | **5.6%** | Quad parties / 2 couples. |
| **#3** | **1 Adult + 0 Children** | **5** | **4.0%** | Solo travelers. |
| **#4** | **2 Adults + 2 Children** | **5** | **4.0%** | Standard 4-person family. |
| **#5** | **8 Adults + 2 Children** | **4** | **3.2%** | Large family group / villa buyout. |
| **#6** | **9 Adults + 0 Children** | **4** | **3.2%** | Group travel. |
| **#7** | **2 Adults + 1 Child** | **3** | **2.4%** | Couple + 1 child. |
| **#8** | **3 Adults + 0 Children** | **3** | **2.4%** | 3 adults traveling together. |
| **#9 – 15**| **5A, 6A, 8A+6C, 10A, 12A, 20A** | **17** | **13.6%** | Heavy concentration of large villa / homestay group buyouts in Kerala & Himachal. |
| **Remaining** | **Assorted Compositions** | **55** | **44.0%** | Long-tail bookings. |

### Infant Special Requests
- **6 confirmed bookings** explicitly contain `"infant"` or `"baby"` in `specialRequests`.
- Confirms that guests travel with infants and communicate it via notes because RouteGuide currently lacks a dedicated `infantsCount` column on `Booking`.

---

## 7. Migration Backfill Clamping Formula (Data-Driven Guarantee)

Based on the empirical discovery that 19 RoomTypes have inversion anomalies ($bA > pA$ or $bC > pC$), the **safe, non-destructive backfill transformation** is:

$$\text{Candidate } \text{TotalBaseOccupancy } (B) = \text{baseAdults} + \text{baseChildren}$$

$$\text{Candidate } \text{MaxPhysicalAdults} = \max(\text{maxPhysicalAdults}, \text{baseAdults}, \text{maxAdults})$$

$$\text{Candidate } \text{MaxPhysicalChildren} = \max(\text{maxPhysicalChildren}, \text{baseChildren}, \text{maxChildren})$$

$$\text{Candidate } \text{TotalMaxOccupancy } (M) = \max(\text{Candidate MaxPhysA} + \text{Candidate MaxPhysC}, \text{maxAdults} + \text{maxChildren})$$

$$\text{Candidate } \text{BaseMaxAdults} = \text{baseAdults}$$

$$\text{Candidate } \text{BaseMaxChildren} = \text{baseChildren}$$

This mathematical formula guarantees that:
1. **Zero RoomTypes lose capacity**: If a seed record had `maxAdults=6` and unpopulated `maxPhysicalAdults=4`, $M$ is computed as $\ge 6$.
2. **Zero Inversion Conflicts**: If a portal record had `baseAdults=2` and `maxPhysicalAdults=1`, $\text{MaxPhysicalAdults}$ is clamped to $2$, preventing impossible $B > M$ states.
3. **100% Price Parity**: `baseMaxAdults = baseAdults` and `baseMaxChildren = baseChildren` preserves the exact existing pricing ledger for all 109 configured properties.

---

## 8. Migration Feasibility Verdict

- **Final Classification**: **`SAFE WITH EXCEPTIONS (FEASIBLE WITH DUAL-RUN ADAPTER & CLAMP FORMULA)`**
- **Readiness**: With the capacity clamp formula above, 100% of the 266 production RoomTypes can be safely backfilled with zero data loss, zero price drift, and zero disruption to live booking operations.

---

## 9. Final Verification Confirmation

> **Formal Confirmation**:
> No application code, database schema, database data, API, UI, integration, or production behavior was modified during this audit.
