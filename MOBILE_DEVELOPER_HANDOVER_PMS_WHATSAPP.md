# Mobile Developer Handover: Direct WhatsApp Messaging in PMS (Flutter)

## 1. Overview & Objectives
This specification provides complete technical documentation for integrating the **Direct Guest WhatsApp Messaging** feature in the Mobile (Flutter) PMS Property Management Application.

Property managers and staff can now send custom WhatsApp communications or quick templates to:
1. **An individual guest** (1-tap action directly from a guest card or profile screen).
2. **Selected guests** (via multi-select checkboxes in the guest list).
3. **All filtered guests** (broadcasting to all guests currently matching the search/status/date filters).

---

## 2. API Specification

### Endpoint: Send WhatsApp Messages to Guests
- **Method**: `POST`
- **URL**: `{{BASE_URL}}/users/guests/whatsapp`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`

### Request Payload (`SendGuestsWhatsappDto`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userIds` | `List<String>` | **Yes** | Array of Guest User IDs (UUIDs) |
| `message` | `String` | **Yes** | Text body of the WhatsApp message to be sent |
| `propertyId` | `String` | No | Optional property UUID context |

#### Example Request Body:
```json
{
  "userIds": [
    "b68a4421-50e5-4f32-84ec-6ca4c5bc4a11",
    "f29c118e-49b0-466d-8df4-26df494d6930"
  ],
  "message": "Dear Guest, greetings from Mountain View Resort! We are excited to host you. Please let us know if you need any assistance.",
  "propertyId": "prop_9981203"
}
```

### Response Payload (`200 OK`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `totalRequested` | `int` | Total number of user IDs passed in the request |
| `sentCount` | `int` | Number of messages successfully dispatched to WhatsApp gateway |
| `failedCount` | `int` | Number of messages that failed to deliver |
| `skippedNoPhoneCount` | `int` | Number of guest accounts skipped due to missing/invalid phone number |

#### Example Success Response:
```json
{
  "totalRequested": 2,
  "sentCount": 2,
  "failedCount": 0,
  "skippedNoPhoneCount": 0
}
```

#### Example Partial Delivery Response:
```json
{
  "totalRequested": 5,
  "sentCount": 3,
  "failedCount": 0,
  "skippedNoPhoneCount": 2
}
```

---

## 3. Dart Models & DTOs

### 3.1. Request DTO (`send_whatsapp_request_dto.dart`)
```dart
class SendWhatsappRequestDto {
  final List<String> userIds;
  final String message;
  final String? propertyId;

  SendWhatsappRequestDto({
    required this.userIds,
    required this.message,
    this.propertyId,
  });

  Map<String, dynamic> toJson() {
    return {
      'userIds': userIds,
      'message': message,
      if (propertyId != null) 'propertyId': propertyId,
    };
  }
}
```

### 3.2. Response DTO (`send_whatsapp_response_dto.dart`)
```dart
class SendWhatsappResponseDto {
  final int totalRequested;
  final int sentCount;
  final int failedCount;
  final int skippedNoPhoneCount;

  SendWhatsappResponseDto({
    required this.totalRequested,
    required this.sentCount,
    required this.failedCount,
    required this.skippedNoPhoneCount,
  });

  factory SendWhatsappResponseDto.fromJson(Map<String, dynamic> json) {
    return SendWhatsappResponseDto(
      totalRequested: json['totalRequested'] ?? 0,
      sentCount: json['sentCount'] ?? 0,
      failedCount: json['failedCount'] ?? 0,
      skippedNoPhoneCount: json['skippedNoPhoneCount'] ?? 0,
    );
  }
}
```

---

## 4. API Service Integration

### `guest_messaging_service.dart`
```dart
import 'package:dio/dio.dart';
import '../models/send_whatsapp_request_dto.dart';
import '../models/send_whatsapp_response_dto.dart';

class GuestMessagingService {
  final Dio dio;

  GuestMessagingService({required this.dio});

  Future<SendWhatsappResponseDto> sendGuestsWhatsapp(SendWhatsappRequestDto request) async {
    try {
      final response = await dio.post(
        '/users/guests/whatsapp',
        data: request.toJson(),
      );
      return SendWhatsappResponseDto.fromJson(response.data);
    } on DioException catch (e) {
      final errorMessage = e.response?.data?['message'] ?? 'Failed to send WhatsApp messages.';
      throw Exception(errorMessage);
    }
  }
}
```

---

## 5. UI/UX Guidelines for Flutter App

### 5.1. Guest Card UI Updates
1. **Checkbox / Selection Indicator**:
   - Each guest card should have a selection checkbox (top-right or leading).
   - In selection mode, tapping the card toggles the checkbox state.
2. **Direct WhatsApp Action Button**:
   - A green WhatsApp action icon button on each guest card.
   - Tapping it directly opens the **Send WhatsApp BottomSheet/Dialog** pre-configured for that single guest.

### 5.2. Multi-Select & Selection AppBar
- **Entering Selection Mode**:
  - Tap on any card's checkbox or long-press a card.
- **Top AppBar in Selection Mode**:
  - Shows `<Count> Selected`.
  - Action buttons:
    - **"Select All" / "Deselect All"** toggle.
    - **WhatsApp Action Icon**: Opens the modal with all selected guest IDs.
    - **Clear / Close (X)**: Exits selection mode.

### 5.3. Send WhatsApp BottomSheet / Modal Component
Design the bottom sheet with the following elements:
1. **Header**:
   - Green WhatsApp Icon + Title (`"Send WhatsApp Message"`).
   - Recipient Summary (e.g., *"To: John Doe (+91 9876543210)"* or *"Broadcasting to 12 selected guests"*).
2. **Quick Template Chips**:
   - Horizontal scrolling chips for 1-tap template insertion:
     - **Welcome & Greeting**: `"Dear Guest, greetings from [Property]! We are excited to have you with us. Please let us know if you need any assistance."`
     - **Special Promo Offer**: `"Exclusive Offer from [Property]! Enjoy special discounts on your upcoming stays. Book directly with us to claim your luxury getaway."`
     - **Feedback Request**: `"Dear Guest, thank you for staying at [Property]! We would love to hear about your experience."`
3. **Message Input Box**:
   - Multiline `TextField` (min 4 lines).
   - Character counter at bottom-right (`"X characters"`).
4. **Actions**:
   - `"Cancel"` button.
   - `"Send WhatsApp"` elevated button with green accent and loading spinner during API execution.
5. **Feedback SnackBar**:
   - On success: Show SnackBar:
     - *"WhatsApp dispatched to X guests (Y skipped due to missing phone)."*

---

## 6. Pre-Built Message Templates Reference
```dart
class WhatsAppTemplates {
  static String welcomeGreeting(String propertyName) =>
      "Dear Guest, greetings from $propertyName! We are excited to have you with us. Please let us know if you need any assistance.";

  static String specialOffer(String propertyName) =>
      "Exclusive Offer from $propertyName! Enjoy special discounts on your upcoming stays. Book directly with us to claim your luxury getaway.";

  static String feedbackRequest(String propertyName) =>
      "Dear Guest, thank you for staying at $propertyName! We would love to hear about your experience. Your feedback helps us serve you better.";
}
```

---

## 7. Edge Cases & Validation Checklist
- [x] **Empty Message**: Disable the Send button or show validation if message text is empty.
- [x] **Guests without Phone Numbers**: The backend safely counts and reports `skippedNoPhoneCount` without throwing an error for the entire batch.
- [x] **Country Code Handling**: The backend automatically formats 10-digit Indian numbers with `+91` standard prefix.
- [x] **Loading State**: Prevent double-tap by disabling the send button while `isSending` is true.
