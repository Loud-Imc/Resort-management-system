# Flutter Mobile Developer Guide: Remote App Update Integration

**Document Version:** 1.0  
**Backend Environment:** Available on all environments (`dev`, `staging`, `production`)  
**Status:** Implemented & Ready for Mobile Client Integration  

---

## 1. Overview & Architecture

The backend and admin dashboard now support **Remote App Version & Update Management**. The backend acts as the single source of truth for update policies, while the Flutter app enforces the policy at startup and on resume.

```
                          ┌────────────────────────┐
                          │   Admin Web Portal     │
                          │ (/mobile-updates)      │
                          └───────────┬────────────┘
                                      │ (Sets Min/Latest Versions & Mode)
                                      ▼
                          ┌────────────────────────┐
                          │    Backend Server      │
                          └───────────┬────────────┘
                                      │
                         GET /api/v1/app/update-config
                          (?platform=android&version=x.y.z)
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      Flutter App Gate     │
                        └─────────────┬─────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
             [FORCE UPDATE]                     [ALLOWED / OPTIONAL]
                    │                                   │
                    ▼                                   ▼
         Show Non-Dismissible Screen             Normal App Launch /
         Redirect to Play / App Store            Optional Update Prompt
```

---

## 2. API Contract

### Public Endpoint (Unauthenticated)
```http
GET /api/v1/app/update-config
```
*(Alias also available at: `GET /api/app/update-config`)*

### Query Parameters
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `platform` | `string` | **Yes** | Client platform: `android` or `ios` (lowercase) | `android` |
| `version` | `string` | **Yes** | Installed Flutter app SemVer version (`major.minor.patch`) | `2.4.0` |
| `appId` | `string` | No | App flavor or bundle id | `com.oreedu.app` |

---

### Response Structure & Fields

```json
{
  "platform": "android",
  "currentVersion": "2.4.0",
  "minimumSupportedVersion": "2.5.0",
  "latestVersion": "2.6.0",
  "updateType": "force",
  "updateRequired": true,
  "title": "Update Required",
  "message": "A new version of the app is required to continue using the service.",
  "storeUrl": "https://play.google.com/store/apps/details?id=com.oreedu.app",
  "policyVersion": 2,
  "publishedAt": "2026-09-14T05:15:00.000Z"
}
```

#### Field Explanations:
* `updateType`:
  * `"none"`: Installed version is supported and up to date.
  * `"optional"`: Installed version is supported, but a newer version is available.
  * `"force"`: Installed version is below `minimumSupportedVersion`. User **must** update.
* `updateRequired`: Boolean flag (`true` when `updateType == 'force'`).
* `storeUrl`: The exact URL to open in Google Play Store or Apple App Store (configured by Admin).
* `title`: User-facing title for the update modal/screen.
* `message`: User-facing message explaining the update.
* `policyVersion`: Incrementing revision ID (useful for caching/debugging).

---

## 3. Flutter Client Implementation Requirements

### A. Application Startup Sequence
Perform the update check **before** showing the login screen or loading user-authenticated data:
1. Fetch installed app version using `package_info_plus` (e.g. `packageInfo.version`).
2. Call `GET /api/v1/app/update-config?platform=android&version=${currentVersion}`.
3. Handle the response based on `updateType`:
   - **`force`**: Block navigation and display `ForceUpdateScreen`.
   - **`optional`**: Show an optional update dialog (with **Update** and **Later** buttons) and allow entry.
   - **`none`**: Proceed directly to the normal flow.

### B. Force Update Screen Behavior
* **Strict Enforcement**: Disable the Android physical back button (using `WillPopScope` / `PopScope` with `canPop: false`).
* **No Bypass**: Do not provide a skip, close, or continue button.
* **Update Action**: Tapping **"Update Now"** must launch `storeUrl` using `url_launcher` with `LaunchMode.externalApplication`.

### C. App Resume Re-check
When the user taps **"Update Now"**, updates the app in Google Play / App Store, and switches back:
* Listen to Flutter's `WidgetsBindingObserver.didChangeAppLifecycleState`.
* When state changes to `AppLifecycleState.resumed`, re-run the update check.
* If the app was updated to a supported version, automatically dismiss the update screen and unlock the app.

### D. Offline / Network Fallback (Fail-Open Safety)
* **Never hang on a white splash screen**: Set a network timeout (e.g., 5 seconds) on the update request.
* If the update API call fails (network timeout, offline, 500 error):
  - Check if a cached policy exists in `SharedPreferences` (valid within 24 hours).
  - If no cache or network is down, **allow the user to continue into the app** (do not lock users out due to a temporary network blip).

---

## 4. Sample Dart Model & Service Snippet

### Data Model (`lib/core/app_update/app_update_config.dart`)
```dart
enum UpdateType { none, optional, force }

class AppUpdateConfig {
  final String platform;
  final String currentVersion;
  final String minimumSupportedVersion;
  final String latestVersion;
  final UpdateType updateType;
  final bool updateRequired;
  final String title;
  final String message;
  final String storeUrl;
  final int policyVersion;

  AppUpdateConfig({
    required this.platform,
    required this.currentVersion,
    required this.minimumSupportedVersion,
    required this.latestVersion,
    required this.updateType,
    required this.updateRequired,
    required this.title,
    required this.message,
    required this.storeUrl,
    required this.policyVersion,
  });

  factory AppUpdateConfig.fromJson(Map<String, dynamic> json) {
    UpdateType parseType(String? type) {
      switch (type?.toLowerCase()) {
        case 'force':
          return UpdateType.force;
        case 'optional':
          return UpdateType.optional;
        default:
          return UpdateType.none;
      }
    }

    return AppUpdateConfig(
      platform: json['platform'] ?? '',
      currentVersion: json['currentVersion'] ?? '',
      minimumSupportedVersion: json['minimumSupportedVersion'] ?? '1.0.0',
      latestVersion: json['latestVersion'] ?? '1.0.0',
      updateType: parseType(json['updateType']),
      updateRequired: json['updateRequired'] ?? false,
      title: json['title'] ?? 'Update Required',
      message: json['message'] ?? 'A new version of the app is available.',
      storeUrl: json['storeUrl'] ?? '',
      policyVersion: json['policyVersion'] ?? 1,
    );
  }
}
```

### Store Launcher Helper (`lib/core/app_update/store_launcher.dart`)
```dart
import 'package:url_launcher/url_launcher.dart';

Future<void> openStore(String url) async {
  if (url.isEmpty) return;
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
```

---

## 5. Admin Dashboard Controls

The operations/product team can manage these rules anytime without another release:
* **Location**: Admin Web Dashboard $\rightarrow$ **Platform Settings** $\rightarrow$ **App Updates** (`/mobile-updates`).
* **Controls**:
  - Independent tabs for **Android** and **iOS**.
  - Edit **Minimum Version**, **Latest Version**, **Update Type**, **Store URLs**, and **Custom text**.
  - Built-in **Interactive Version Tester**: Admins can test any version string to preview the exact live evaluation and phone screen mockup.
  - **Safety Confirmation Modal**: Ensures force updates are only published after store builds are live.

---

## 6. Integration Checklist for Mobile Dev

- [ ] Add `package_info_plus` and `url_launcher` to `pubspec.yaml`.
- [ ] Create `AppUpdateService` calling `GET /api/v1/app/update-config`.
- [ ] Implement `ForceUpdateScreen` (back-button disabled, "Update Now" button).
- [ ] Add lifecycle listener (`didChangeAppLifecycleState`) to recheck version on resume.
- [ ] Test with `?platform=android&version=0.9.0` (expect **Force Update**).
- [ ] Test with `?platform=android&version=1.0.0` (expect **Allowed**).
