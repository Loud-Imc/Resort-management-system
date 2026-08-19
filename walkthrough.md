# Walkthrough — Task 1: RouteGuide OTA Portal Adjustments (Updated)

We have updated the RouteGuide OTA Property Portal (OPP) and Admin panels to satisfy the new design guidelines and data partitioning rules.

---

## Changes Implemented

### 1. Rooms Grid Availability Array Format Fix
* **Integration Alignment**: Fixed a critical frontend runtime TypeError (`availability.map is not a function`) on the Rooms & Grid Availability page.
* **Backend Matrix Compilation**: Modified the backend handler `getAvailability` inside [ota-rooms.controller.ts](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/backend/src/ota-portal/ota-rooms.controller.ts) to query all property room types, map their day-by-day availability results (calculating `booked = total - available`), and output the resulting matrix as a structured array format rather than a single record object.

### 2. Rooms & Daily Grid Availability API Fix
* **Integration Alignment**: Fixed a critical frontend API service mismatch in [OtaRoomsAvailability.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaRoomsAvailability.tsx) by renaming the undefined API method call `otaService.getAvailability` to the correct method signature `otaService.getCalendarAvailability`.
* **Grid Rendering**: This resolves the runtime exception and successfully displays the daily availability count grid (available units, booked units, and total rooms capacity) for all room types in the selected date range.

### 3. Promotions & Booster Razorpay Workflow Fix
* **Integration Alignment**: Fixed a critical frontend-backend API mismatch in [OtaPromotionalBoosters.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaPromotionalBoosters.tsx) where it called non-existent helper methods.
* **Three-Step Order Activation**: Realigned `handleBoost` to execute:
  1. `otaService.requestPromotion({ tier, days })` to submit a campaign booster request.
  2. `otaService.initiatePromotionPayment(requestId)` to retrieve Razorpay keys and order arguments.
  3. `otaService.verifyPromotionPayment(requestId, signature)` to complete the payment confirmation on the NestJS backend.

### 4. Uploaded Documents & KYC Card (PMS Style)
* **compliance Section**: Rendered the **Uploaded Documents & KYC** panel at the bottom of the page in [OtaMyProperty.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaMyProperty.tsx), directly below the Cancellation Policies section.
* **KYC Previews**: Renders the property's GST numbers, Aadhaar numbers, and document previews (Business License, Aadhaar card front image, and Aadhaar card back image) with lightbox-style document view linkages.
* **Import Fix**: Resolved the runtime ReferenceError by importing the missing `FileText` icon from `lucide-react` at the top of [OtaMyProperty.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaMyProperty.tsx).

### 5. Max-w-4xl Layout and Stacked Policies Placement
* **PMS Layout Width**: Applied a `max-w-4xl mx-auto space-y-6 w-full` wrapper around [OtaMyProperty.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaMyProperty.tsx) to match the layout width of the PMS portal page.
* **Policies to Bottom**: Moved the **Cancellation Policies** card from the side column, placing it stacked at the bottom of the page in full width.

### 6. PMS-style Full-Width Banner & Property Name Overlay
* **Image Banner Header**: Added a wide cover banner header at the top of [OtaMyProperty.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaMyProperty.tsx) matching the PMS style.
* **Superimposed Property Name**: Removed the cover image URL input text box entirely. The property name is overlaid directly over the bottom of the cover image using a dark backdrop gradient, keeping it elegant.
* **Change Cover Button**: In edit mode, a file uploader button is absolutely positioned over the cover image banner, allowing direct file replacement without revealing image links.

### 7. PMS-style Read-only / Edit Toggle (My Property)
* **Default Read-Only Layout**: Modified the profile page to render in a clean, read-only view by default. Users cannot edit information unless they click the **Edit Details** action button at the top right.
* **Edit Action Controls**: Clicking **Edit Details** transitions the form inputs into an active editable state. If they click **Cancel**, the form values revert back to their original fetched state. Clicking **Save Changes** updates the backend profile details.

### 8. Multi-photo Gallery Grid and File Uploader
* **Gallery Photo List**: Created a dedicated **Property Photo Gallery** card to list the property's array of details photos (`images`).
* **Upload Support**: Added a photo uploader using the backend upload service. Clicking **Upload Photo** prompts a local file picker, uploads the file via API, and appends it to the property gallery state.
* **Manual URLs & Image Deletion**: Allows manually adding photo links, and provides inline red trash icon badges to delete photos in edit mode.

### 9. Fixed "My Property" Profile and Policies Loading in UI
* **Aligned API service calls**: Fixed multiple undefined function calls in [OtaMyProperty.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/OtaMyProperty.tsx) to match the correct names defined in `otaService.ts` (`getMyProperty`, `getMyPolicies`, `updateMyProperty`, `createMyPolicy`, `deleteMyPolicy`).

### 10. Centralized RouteGuide PMS Activation Modal
* **Custom React Confirmation Modal**: Removed the legacy browser-native `window.confirm` dialog from both upgrade buttons (the sidebar layout trigger and the dashboard home upgrade banner). Both trigger the exact same premium modal titled **"Activate RouteGuide PMS"**.

### 11. Custom Password Reset React Modal (Admin Dashboard)
* **Themed UI Modal**: Replaced browser `window.prompt` confirmation blocks inside the Admin panel [PropertiesList.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/admin/src/pages/Properties/PropertiesList.tsx) with a custom React modal.

### 12. PMS-styled Active Property Selector & Logos
* **PMS Trigger Alignment**: Designed the property selector in the sidebar to mirror the PMS sidebar (pulsing green status dot, city pins, and `ChevronsUpDown` icon).
* **RouteGuide Image Logo**: Replaced the custom text/div blocks in the desktop sidebar and mobile drawer with the official RouteGuide image logo (`logo.svg`).

### 13. OPP Login Page Style Sync
* **PMS Login Cloned**: Cloned the visual style, teal-tinted background gradient, rounded white card container, and app store download links/badges from the PMS login page into the OPP portal ([Login.tsx](file:///c:/Users/kamar/OneDrive/Desktop/Loud%20IMC%2520projects/ResortProject/frontend/ota-property-portal/src/pages/Login.tsx)).

### 14. RouteGuide Booking Data Filtering
* **Exclude Synced OTA Channels**: Configured all NestJS `ota-portal` controllers to retrieve RouteGuide channels and exclude external synchronized channels.

---

## How to Verify & Run

### 1. Start Dev Servers
```bash
# Start backend
cd backend
npm run dev

# Start the OPP portal
cd frontend/ota-property-portal
npm run dev

# Start the admin panel
cd frontend/admin
npm run dev
```

### 2. Test Verification
1. Log in to the OPP portal and navigate to **Rooms & Availability** from the sidebar.
2. Verify that the daily availability count matrix lists all room categories and day-by-day availability boxes without throwing any JavaScript errors.
3. Add a new physical room unit and check if it immediately increments the capacity of that category inside the availability grid dates cells.
