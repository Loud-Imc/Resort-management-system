# Mobile Developer Handover: Enhanced Search & Autocomplete (Flutter)

## 1. Overview & Objectives
The search system across the platform (OTA and Channel Partner) has been upgraded to support **unified searching by Property Name, Location/City, Street Address, State, and Pincode**.

Additionally, the **Autocomplete API** now returns **both direct Property/Resort matches and Cities/Geographic locations** in parallel with ultra-fast response times (< 20ms).

This document outlines the API specifications, data models, UI guidelines, and Flutter implementation code for the mobile developer.

---

## 2. API Endpoints & Payload Specifications

### 2.1. Hybrid Autocomplete Endpoint
Provides instant real-time suggestions as the user types.

- **HTTP Method**: `GET`
- **Path**: `/api/properties/autocomplete`
- **Query Parameters**:
  - `input` (string, required): The search text entered by the user (minimum 2 characters).
- **Example Request**:
  ```http
  GET /api/properties/autocomplete?input=tea
  ```

#### Response Payload (`200 OK`)
Returns an array of suggestion objects containing both matching **Properties** and **Locations**:

```json
[
  {
    "placeId": "prop_a7d8e234-91b3-4f90-8888-123456789abc",
    "mainText": "Munnar Tea Haven Resort",
    "secondaryText": "Munnar, Kerala",
    "description": "Munnar Tea Haven Resort, Munnar, Kerala",
    "type": "property",
    "propertyId": "a7d8e234-91b3-4f90-8888-123456789abc",
    "slug": "munnar-tea-haven-resort",
    "lat": 10.088933,
    "lng": 77.059525
  },
  {
    "placeId": "ChIJc_K6f3g9CDsRG6f9d-e4x_w",
    "mainText": "Tea County Road",
    "secondaryText": "Munnar, Kerala, India",
    "description": "Tea County Road, Munnar, Kerala, India",
    "type": "location"
  }
]
```

#### Field Explanations
| Field | Type | Description |
|---|---|---|
| `placeId` | `string` | Unique identifier (`prop_<id>` for database properties, Google place ID for locations) |
| `mainText` | `string` | Primary title to display (Resort Name or City/Place name) |
| `secondaryText`| `string` | Subtitle/location context (e.g. "Kalpetta, Kerala") |
| `description` | `string` | Full readable description |
| `type` | `string` | `'property'` for resorts/properties, `'location'` for cities/regions |
| `propertyId` | `string?` | Property UUID (present only when `type == 'property'`) |
| `slug` | `string?` | Property URL slug (present only when `type == 'property'`) |
| `lat` / `lng` | `double?` | GPS coordinates (available directly for properties with saved coordinates) |

---

### 2.2. Availability Search Endpoint
Searches for available rooms/properties matching the search criteria.

- **HTTP Method**: `POST`
- **Path**: `/api/bookings/search`
- **Request Body**:
```json
{
  "checkInDate": "2026-10-01",
  "checkOutDate": "2026-10-03",
  "adults": 2,
  "children": 0,
  "rooms": 1,
  "location": "Munnar Tea Haven Resort", 
  "latitude": 10.088933,
  "longitude": 77.059525,
  "currency": "INR",
  "isGroupBooking": false
}
```

> **Note on `location` field**:
> The `location` parameter now intelligently searches across:
> 1. Property Name (`name`)
> 2. City / Town (`city`)
> 3. Street Address / Landmark (`address`)
> 4. State (`state`)
> 5. Postal Code (`pincode`)
> 6. Keywords / multi-word combinations (e.g., *"Bypass Road, Kalpetta"* or *"Green Villa Wayanad"*)

---

## 3. UI/UX Design Guidelines for Flutter

1. **Debounce User Input**: Wait `250ms - 300ms` after typing before triggering the autocomplete API call to conserve bandwidth.
2. **Visual Differentiation**:
   - **For Properties (`type == 'property'`)**:
     - Display a Resort/Hotel icon (e.g. `Icons.hotel_rounded` or `Icons.domain_rounded`) with brand accent color.
     - Show a small pill badge: **`RESORT`** or **`PROPERTY`**.
   - **For Locations (`type == 'location'`)**:
     - Display a Location Pin icon (e.g. `Icons.location_on_outlined`).
3. **On Item Selection**:
   - Set the text input value to `suggestion.mainText`.
   - If `type == 'property'` and `lat`/`lng` exist, store them in the search state.
   - Auto-close the suggestion dropdown.

---

## 4. Flutter / Dart Implementation Reference

### 4.1. Dart Models (`autocomplete_suggestion.dart`)

```dart
enum SuggestionType { property, location }

class AutocompleteSuggestion {
  final String placeId;
  final String mainText;
  final String secondaryText;
  final String description;
  final SuggestionType type;
  final String? propertyId;
  final String? slug;
  final double? lat;
  final double? lng;

  AutocompleteSuggestion({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
    required this.description,
    required this.type,
    this.propertyId,
    this.slug,
    this.lat,
    this.lng,
  });

  factory AutocompleteSuggestion.fromJson(Map<String, dynamic> json) {
    return AutocompleteSuggestion(
      placeId: json['placeId'] ?? '',
      mainText: json['mainText'] ?? '',
      secondaryText: json['secondaryText'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] == 'property' 
          ? SuggestionType.property 
          : SuggestionType.location,
      propertyId: json['propertyId'],
      slug: json['slug'],
      lat: json['lat'] != null ? (json['lat'] as num).toDouble() : null,
      lng: json['lng'] != null ? (json['lng'] as num).toDouble() : null,
    );
  }
}
```

---

### 4.2. Repository / API Service

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class PropertySearchService {
  final String baseUrl;

  PropertySearchService({required this.baseUrl});

  Future<List<AutocompleteSuggestion>> fetchSuggestions(String input) async {
    if (input.trim().length < 2) return [];

    final uri = Uri.parse('$baseUrl/api/properties/autocomplete')
        .replace(queryParameters: {'input': input.trim()});

    try {
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => AutocompleteSuggestion.fromJson(item)).toList();
      }
    } catch (e) {
      print('Autocomplete error: $e');
    }
    return [];
  }
}
```

---

### 4.3. UI Autocomplete Widget Item Builder

```dart
Widget buildSuggestionItem(
  BuildContext context, 
  AutocompleteSuggestion suggestion, 
  VoidCallback onTap
) {
  final isProperty = suggestion.type == SuggestionType.property;
  final primaryColor = Theme.of(context).primaryColor;

  return ListTile(
    onTap: onTap,
    leading: Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: isProperty ? primaryColor.withOpacity(0.12) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        isProperty ? Icons.domain_rounded : Icons.location_on_outlined,
        color: isProperty ? primaryColor : Colors.grey.shade600,
        size: 20,
      ),
    ),
    title: Row(
      children: [
        Expanded(
          child: Text(
            suggestion.mainText,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (isProperty) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: primaryColor.withOpacity(0.2)),
            ),
            child: Text(
              'RESORT',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: primaryColor,
              ),
            ),
          ),
        ],
      ],
    ),
    subtitle: suggestion.secondaryText.isNotEmpty
        ? Text(
            suggestion.secondaryText,
            style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            overflow: TextOverflow.ellipsis,
          )
        : null,
  );
}
```

---

## 5. Summary Checklist for Flutter Developer
- [x] Update autocomplete service to point to `/api/properties/autocomplete?input={query}`.
- [x] Parse `type: 'property' | 'location'` from the response.
- [x] Render property suggestions with Hotel/Resort icon + `RESORT` badge.
- [x] Render location suggestions with MapPin icon.
- [x] Pass the selected title or search string directly to the `location` field in `/api/bookings/search`.
