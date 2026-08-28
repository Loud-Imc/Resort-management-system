# ROUTEGUIDE OTA CONNECTIVITY PLATFORM
## DEVELOPER INTEGRATION & SELF-CERTIFICATION GUIDE (v1 API)

---

## 1. OVERVIEW

The RouteGuide OTA Connectivity Platform enables external Property Management Systems (PMS), Channel Managers, and Connectivity Providers to integrate directly with RouteGuide as a standard OTA distribution channel.

RouteGuide provides a standard, vendor-neutral B2B REST API boundary for:
- Property Listing Content
- RoomType Mapping
- Availability & Inventory Synchronization
- Rate & Pricing Synchronization
- Restriction Synchronization (StopSell, MinStay, MaxStay)
- Reservation Lifecycle Management (Ingestion, Read, Modification, Cancellation)
- Outbound Event Webhooks with HMAC-SHA256 Signatures

---

## 2. SANDBOX ENVIRONMENT

External partners are provided with a dedicated, isolated Sandbox testing environment.

- **Sandbox Property ID**: `TEST-PROP-001`
- **Sandbox Base URL Placeholder**: `https://api-sandbox.routeguide.com/api` (Local Dev: `http://127.0.0.1:3000/api`)
- **Production Base URL Placeholder**: `https://api.routeguide.com/api`

---

## 3. SANDBOX CREDENTIALS

To connect to Sandbox, request a Sandbox API key from your RouteGuide Partner Manager or issue one via the Partner Portal.

- **Key Format**: `rg_test_<random_hex>`
- **Key Prefix**: `rg_test_`
- **Environment Isolation**: Sandbox keys are strictly restricted to `TEST-PROP-001`. Attempting to access live properties with a `rg_test_` key will return `HTTP 403 Forbidden`.

---

## 4. AUTHENTICATION USING X-API-KEY

All API requests to RouteGuide Connectivity V1 endpoints must include the `x-api-key` header:

```http
GET /api/connectivity/v1/ping HTTP/1.1
Host: api-sandbox.routeguide.com
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json
```

**Response (`HTTP 200 OK`)**:
```json
{
  "status": "OK",
  "partner": {
    "id": "fce1d22e-04e6-462d-97bb-ec0fdd5cbf22",
    "name": "Acme PMS Platform",
    "code": "ACME_PMS"
  },
  "environment": "SANDBOX"
}
```

---

## 5. GET /CAPABILITIES

Query platform capability switches to discover which synchronization capabilities are enabled:

```http
GET /api/connectivity/v1/capabilities HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
```

**Response (`HTTP 200 OK`)**:
```json
{
  "propertyContentEditing": true,
  "availabilitySync": true,
  "rateSync": true,
  "restrictionSync": true,
  "reservationSync": true
}
```

---

## 6. CONTENT RETRIEVAL

Retrieve property details, amenities, photos, and RoomType listings to configure mapping:

```http
GET /api/connectivity/v1/content?propertyId=TEST-PROP-001 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
```

**Response (`HTTP 200 OK`)**:
```json
{
  "id": "TEST-PROP-001",
  "name": "RouteGuide Sandbox Resort",
  "city": "Kochi",
  "roomTypes": [
    {
      "id": "roomtype-dlx-uuid",
      "name": "Deluxe Sandbox Room",
      "basePrice": 4500.0,
      "maxAdults": 2
    }
  ]
}
```

---

## 7. ROOMTYPE MAPPING

Map an external PMS room code to a RouteGuide `roomTypeId`:

```http
POST /api/connectivity/v1/connections/TEST-PROP-001/mappings/room-types HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "externalRatePlanId": "STD-BAR"
}
```

**Response (`HTTP 201 Created`)**:
```json
{
  "id": "mapping-uuid-1",
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "externalRatePlanId": "STD-BAR"
}
```

---

## 8. AVAILABILITY

Query sellable quantity inventory grid for mapped RoomTypes:

```http
GET /api/connectivity/v1/availability?propertyId=TEST-PROP-001&startDate=2026-09-01&endDate=2026-09-05 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
```

---

## 9. RATES

Push daily rates or rate plans for a mapped RoomType:

```http
PUT /api/connectivity/v1/rates HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "price": 4999.0,
  "currency": "INR"
}
```

---

## 10. RESTRICTIONS

Push StopSell, Minimum Stay, or Maximum Stay restrictions:

```http
PUT /api/connectivity/v1/restrictions HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "stopSell": false,
  "minStay": 2
}
```

---

## 11. RESERVATIONS

Ingest, read, modify, or cancel reservations:

### Ingest Booking:
```http
POST /api/connectivity/v1/reservations HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "externalReservationId": "EXT-BOOKING-99",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "checkInDate": "2026-09-10",
  "checkOutDate": "2026-09-12",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "totalAmount": 9998.0,
  "currency": "INR"
}
```

**Response (`HTTP 201 Created`)**:
```json
{
  "status": "CONFIRMED",
  "bookingId": "rg-booking-uuid-101",
  "externalReservationId": "EXT-BOOKING-99"
}
```

---

## 12. RESERVATION IDEMPOTENCY

If an external network issue occurs and your PMS re-transmits a reservation request with the **same `externalReservationId`**, RouteGuide guarantees **idempotent processing**.

- RouteGuide will **not** create a second booking.
- RouteGuide will return the existing reservation details with `HTTP 200/201`.

---

## 13. OUTBOUND WEBHOOKS

RouteGuide dispatches real-time outbound webhooks for events (`RESERVATION.CREATED`, `RESERVATION.MODIFIED`, `RESERVATION.CANCELLED`, `AVAILABILITY.CHANGED`, `PING`).

---

## 14. HMAC-SHA256 SIGNATURE VERIFICATION

All outbound webhooks include a signature header:
`X-RouteGuide-Signature: t=<timestamp>,v1=<hex_digest>`

### How to verify:
1. Extract `timestamp` (`t`) and `transmittedDigest` (`v1`) from the header.
2. Verify timestamp freshness (within 300 seconds).
3. Construct the signed message: `${timestamp}.${rawHttpBody}`
4. Calculate HMAC-SHA256 using your partner `webhookSecret`:
   `crypto.createHmac('sha256', secret).update(signedMessage).digest('hex')`
5. Assert `calculatedDigest === transmittedDigest`.
6. Return `HTTP 200 OK` with JSON:
   `{ "received": true, "signatureVerified": true }`

---

## 15. EVENT HEADERS

Outbound HTTP POST requests contain:
- `Content-Type: application/json`
- `X-RouteGuide-Signature: t=1787894630,v1=3ad746430a14...`
- `X-RouteGuide-Event-Id: evt-2b62d7e6-8fa5-4a25...`
- `X-RouteGuide-Event-Type: PING`

---

## 16. RETRY BEHAVIOR

If your webhook receiver returns `HTTP 4xx/5xx` or times out (10s), RouteGuide retries automatically with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: +10 seconds
- Attempt 3: +60 seconds
- Attempt 4: +300 seconds (5 minutes)
- Attempt 5: +1800 seconds (30 minutes)
- Max 5 retries ➔ `FAILED_PERMANENT`.

---

## 17. EVENT ORDERING

Events on the same property/booking are assigned an autoincrementing `sequenceNumber` and dispatched sequentially to preserve strict event ordering.

---

## 18. SANDBOX RESET

Reset test mappings and test bookings on `TEST-PROP-001` to start testing cleanly:

```http
POST /api/connectivity/v1/sandbox/reset HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
```

---

## 19. CERTIFICATION WORKFLOW

```text
1. Issue Sandbox Credential (rg_test_...)
2. Connect to Sandbox Property TEST-PROP-001
3. Map RoomTypes
4. Execute Rate & Restriction Sync (PUT/GET)
5. Execute Reservation Lifecycle (Create, Read, Modify, Cancel)
6. Re-send Duplicate Reservation to prove Idempotency
7. Receive & verify PING Webhook (POST /sandbox/test-webhook)
8. Call POST /sandbox/certification/verify
9. Status transitions to PASSED
10. Obtain PRODUCTION Credential (rg_live_...)
```

---

## 20. CERTIFICATION CHECKLIST

| Milestone | Requirement |
| :--- | :--- |
| **Sandbox Connection** | Active connection to `TEST-PROP-001` |
| **RoomType Mapping** | At least 1 RoomType mapped |
| **Rates & Restrictions** | `PUT/GET /rates` and `PUT/GET /restrictions` logged |
| **Reservation Lifecycle** | Ingest, Read, Modify, and Cancel test booking |
| **Idempotency** | Duplicate ingestion returns existing booking |
| **Webhook & HMAC** | `POST /sandbox/test-webhook` received with `signatureVerified: true` |

---

## 21. PRODUCTION CREDENTIAL REQUIREMENTS

Production API keys (`rg_live_...`) allow access to live hotel properties. Issuance is strictly guarded and permitted ONLY when `certificationStatus === 'PASSED'` (or under explicit SuperAdmin manual override).

---

## 22. PRODUCTION ONBOARDING

Upon certification:
1. Issue Production API Key (`rg_live_<hex>`) via Partner Portal.
2. Configure live property connection via Admin or Connection API.
3. Begin live property distribution.
