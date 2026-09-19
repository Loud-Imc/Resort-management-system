# Mobile Developer Handover: Calculate Price API & Multi-Room Payload (Flutter)

## 1. Overview & Objective
This document provides the essential API specifications and rules for calling the **Price Calculation API (`POST /api/bookings/calculate-price`)** in the Flutter mobile application (e.g., when calculating stay pricing, applying promo/coupon codes, or applying referral codes).

---

## 2. Core Rule: Multi-Room vs. Single-Room Payloads

When calling the price calculation endpoint, the payload structure depends on whether the user selected a **Single Room** or a **Multi-Room Accommodation Solution**:

| Scenario | `roomAllocations` | `roomTypeId` |
|---|---|---|
| **Multi-Room Package / Solution** (Multiple rooms or multiple room types) | **Mandatory** array containing all allocated rooms | **Omit or `null`** (Do NOT send a single `roomTypeId`) |
| **Single Room Direct Booking** (Direct single room selection) | **Omit or `null`** | **Mandatory** (`roomTypeId` string) |

> ⚠️ **Important:** When booking a multi-room package, sending a single `roomTypeId` instead of `roomAllocations` will cause incorrect pricing and single-room GST calculation. Never fall back to a single `roomTypeId` when a package with multiple rooms is selected.

---

## 3. API Endpoint Specification

- **HTTP Method**: `POST`
- **Path**: `/api/bookings/calculate-price`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` *(Optional if public/guest checkout, required if partner/authenticated)*

---

## 4. Request Payload Examples

### Scenario A: Multi-Room Accommodation Package (e.g. 2 Rooms / Solution)
Used when a user selects a solution containing multiple rooms (e.g. 1 Heritage Villa + 1 Lake Suite):

```json
{
  "propertyId": "51878f7b-35cb-4018-ab5b-7f4919888080",
  "roomAllocations": [
    {
      "roomTypeId": "673cb083-778a-4802-86e1-07b93fe3af81",
      "adults": 2,
      "children": 1,
      "infants": 0,
      "childAges": [6]
    },
    {
      "roomTypeId": "892fb124-112c-4991-912a-88f912891289",
      "adults": 2,
      "children": 0,
      "infants": 0
    }
  ],
  "checkInDate": "2026-09-19",
  "checkOutDate": "2026-09-20",
  "adultsCount": 4,
  "childrenCount": 1,
  "childAges": [6],
  "generalCode": "OFFER10",
  "roomCount": 2,
  "currency": "INR"
}
```

---

### Scenario B: Single Room Booking
Used when a single room is booked directly:

```json
{
  "propertyId": "51878f7b-35cb-4018-ab5b-7f4919888080",
  "roomTypeId": "673cb083-778a-4802-86e1-07b93fe3af81",
  "checkInDate": "2026-09-19",
  "checkOutDate": "2026-09-20",
  "adultsCount": 2,
  "childrenCount": 0,
  "generalCode": "OFFER10",
  "roomCount": 1,
  "currency": "INR"
}
```

---

## 5. Request Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `propertyId` | `String` | Recommended | Property UUID |
| `roomAllocations` | `List<RoomAllocationItem>` | Conditional | **Required** for multi-room packages. Must contain `{ roomTypeId, adults, children, childAges, infants }` for each room. |
| `roomTypeId` | `String?` | Conditional | **Required** for direct single room booking. Set to `null` if `roomAllocations` is provided. |
| `checkInDate` | `String` | Yes | Format: `YYYY-MM-DD` |
| `checkOutDate` | `String` | Yes | Format: `YYYY-MM-DD` |
| `adultsCount` | `int` | Yes | Total adults across the booking |
| `childrenCount` | `int` | No | Total children count (default `0`) |
| `childAges` | `List<int>?` | No | Ages of children (e.g. `[5, 8]`) |
| `infantsCount` | `int?` | No | Infants count (under 3 years old) |
| `generalCode` | `String?` | No | Coupon code or Referral promo code to apply |
| `roomCount` | `int?` | No | Total number of rooms |
| `currency` | `String?` | No | Defaults to `"INR"` |

---

## 6. Response Payload (`200 OK`)

The backend performs aggregate coupon discounts and dynamic per-room GST calculations ($\le ₹7,500 \rightarrow 5\%$, $> ₹7,500 \rightarrow 18\%$) and returns the complete authoritative price details:

```json
{
  "baseAmount": 10857.14,
  "extraAdultAmount": 0.0,
  "extraChildAmount": 0.0,
  "taxAmount": 542.86,
  "taxRate": 5,
  "offerDiscountAmount": 0.0,
  "couponDiscountAmount": 500.0,
  "referralDiscountAmount": 0.0,
  "discountAmount": 500.0,
  "totalAmount": 10900.0,
  "numberOfNights": 1,
  "pricePerNight": 10900.0,
  "isGstInclusive": false,
  "appliedCodeType": "COUPON"
}
```

### UI Price Summary Guideline:
- **Do not perform client-side arithmetic.**
- Render summary rows directly from the API response fields:
  - **Base Tariff**: `response.baseAmount`
  - **Taxes & GST**: `response.taxAmount` (with `response.taxRate%` badge)
  - **Coupon Discount**: `response.couponDiscountAmount`
  - **Referral Discount**: `response.referralDiscountAmount`
  - **Final Total Amount to Pay**: `response.totalAmount`

---

## 7. Flutter Dart Models & Implementation Snippet

### Data Models (`calculate_price_dto.dart`)
```dart
class RoomAllocationItem {
  final String roomTypeId;
  final int adults;
  final int children;
  final int infants;
  final List<int>? childAges;

  RoomAllocationItem({
    required this.roomTypeId,
    required this.adults,
    this.children = 0,
    this.infants = 0,
    this.childAges,
  });

  Map<String, dynamic> toJson() => {
    'roomTypeId': roomTypeId,
    'adults': adults,
    'children': children,
    'infants': infants,
    if (childAges != null && childAges!.isNotEmpty) 'childAges': childAges,
  };
}

class CalculatePriceRequest {
  final String? propertyId;
  final String? roomTypeId;
  final List<RoomAllocationItem>? roomAllocations;
  final String checkInDate;
  final String checkOutDate;
  final int adultsCount;
  final int childrenCount;
  final List<int>? childAges;
  final int? infantsCount;
  final String? generalCode;
  final int roomCount;
  final String currency;

  CalculatePriceRequest({
    this.propertyId,
    this.roomTypeId,
    this.roomAllocations,
    required this.checkInDate,
    required this.checkOutDate,
    required this.adultsCount,
    this.childrenCount = 0,
    this.childAges,
    this.infantsCount,
    this.generalCode,
    this.roomCount = 1,
    this.currency = 'INR',
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'checkInDate': checkInDate,
      'checkOutDate': checkOutDate,
      'adultsCount': adultsCount,
      'childrenCount': childrenCount,
      'roomCount': roomCount,
      'currency': currency,
    };

    if (propertyId != null) map['propertyId'] = propertyId;
    if (generalCode != null && generalCode!.trim().isNotEmpty) {
      map['generalCode'] = generalCode!.trim();
    }
    if (childAges != null && childAges!.isNotEmpty) map['childAges'] = childAges;
    if (infantsCount != null && infantsCount! > 0) map['infantsCount'] = infantsCount;

    // Strict rule: If multi-room allocations exist, send roomAllocations and omit roomTypeId
    if (roomAllocations != null && roomAllocations!.isNotEmpty) {
      map['roomAllocations'] = roomAllocations!.map((e) => e.toJson()).toList();
    } else if (roomTypeId != null) {
      map['roomTypeId'] = roomTypeId;
    }

    return map;
  }
}
```

### Price Calculation Service Method
```dart
Future<PriceCalculationResult> calculatePrice({
  required String propertyId,
  String? roomTypeId,
  List<RoomAllocationItem>? roomAllocations,
  required String checkInDate,
  required String checkOutDate,
  required int adultsCount,
  int childrenCount = 0,
  List<int>? childAges,
  String? promoCode,
}) async {
  final request = CalculatePriceRequest(
    propertyId: propertyId,
    roomTypeId: (roomAllocations != null && roomAllocations.isNotEmpty) ? null : roomTypeId,
    roomAllocations: roomAllocations,
    checkInDate: checkInDate,
    checkOutDate: checkOutDate,
    adultsCount: adultsCount,
    childrenCount: childrenCount,
    childAges: childAges,
    generalCode: promoCode,
    roomCount: roomAllocations?.length ?? 1,
  );

  final response = await dio.post('/api/bookings/calculate-price', data: request.toJson());
  return PriceCalculationResult.fromJson(response.data);
}
```
