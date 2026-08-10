Pricing Architecture Specification
-----------------------------------

Principle 1

PricingService is the only service allowed to calculate published room prices.

Principle 2

Every module that needs room prices must consume the Published Pricing API.

Principle 3

Booking calculations must never duplicate published pricing logic.

Principle 4

Published pricing and checkout pricing are separate domains.

Principle 5

Channel Managers (Channex, STAAH, etc.) must never calculate prices.

They only consume published prices




Executive Dashboard, Platform Reports, All Properties, Property Requests, Property Categories, CP Onboarding, CP Redemptions, Settlements, Wallet Adjustments, Refund Requests, Reconciliation, Growth Dashboard, Coupons, Web Banners, Hero Content, Promotions Board, Broadcast Alerts, Platform Settings, Platform Users, System Roles, Notifications

