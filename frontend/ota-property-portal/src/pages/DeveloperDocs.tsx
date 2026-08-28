import { useState, useEffect } from 'react';
import { BookOpen, Copy, Check, Terminal, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperDocs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    { id: 'overview', title: '1. Overview & B2B Model' },
    { id: 'auth', title: '2. Authentication (x-api-key)' },
    { id: 'sandbox', title: '3. Sandbox Environment (TEST-PROP-001)' },
    { id: 'capabilities', title: '4. Capabilities Discovery' },
    { id: 'content', title: '5. Property Content & Listing' },
    { id: 'mapping', title: '6. RoomType & RatePlan Mapping' },
    { id: 'availability', title: '7. Inventory Availability Grid' },
    { id: 'rates', title: '8. Daily Rates Synchronization' },
    { id: 'restrictions', title: '9. Restriction Synchronization' },
    { id: 'reservations', title: '10. Reservation Lifecycle' },
    { id: 'idempotency', title: '11. Reservation Idempotency' },
    { id: 'webhooks', title: '12. Outbound Webhook Delivery' },
    { id: 'hmac', title: '13. HMAC-SHA256 Signatures' },
    { id: 'retries', title: '14. Retry Policies & Rate Limits' },
    { id: 'reset', title: '15. Sandbox Data Reset' },
    { id: 'certification', title: '16. Self-Certification Checklist' },
    { id: 'production', title: '17. Production Credentials Security Gate' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Table of Contents */}
      <aside className="lg:col-span-1 hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2 space-y-4 font-sans text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-200 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          API Guide Contents
        </div>

        <nav className="space-y-1">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 font-bold bg-slate-100 dark:bg-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 font-medium'
                }`}
              >
                <span className="truncate">{s.title}</span>
                {isActive && <ChevronRight className="w-3 h-3 shrink-0 text-emerald-500" />}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Documentation Main Column */}
      <div className="lg:col-span-3 space-y-12 text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-sans">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <Terminal className="w-3.5 h-3.5" /> RouteGuide OTA Connectivity V1 API Reference
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Developer Integration Guide</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Complete technical specification for external Property Management Systems (PMS), Channel Managers, and Connectivity Providers integrating with RouteGuide.
          </p>
        </div>

        {/* Section 1 */}
        <section id="overview" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            1. Overview & B2B Model
          </h2>
          <p>
            The RouteGuide OTA Connectivity Platform enables external systems to integrate directly as standard distribution channels. RouteGuide provides a vendor-neutral B2B REST API for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-2">
            <li>Property Listing Content & Amenities</li>
            <li>RoomType & RatePlan Mapping</li>
            <li>Sellable Quantity Inventory Synchronization</li>
            <li>Daily Pricing & Rate Plan Updates</li>
            <li>Restrictions (StopSell, MinStay, MaxStay)</li>
            <li>Full Reservation Lifecycle (Ingest, Read, Modify, Cancel)</li>
            <li>Outbound Event Webhooks with HMAC-SHA256 Signatures</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section id="auth" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            2. Authentication (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">x-api-key</code>)
          </h2>
          <p>
            All API requests to RouteGuide Connectivity V1 endpoints must include the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">x-api-key</code> header:
          </p>

          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('GET /api/connectivity/v1/ping HTTP/1.1\nHost: api-sandbox.routeguide.com\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json', 'auth')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'auth' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`GET /api/connectivity/v1/ping HTTP/1.1
Host: api-sandbox.routeguide.com
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json`}</pre>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Response output (HTTP 200 OK):</p>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "status": "OK",
  "partner": {
    "id": "fce1d22e-04e6-462d-97bb-ec0fdd5cbf22",
    "name": "Acme PMS Platform",
    "code": "ACME_PMS"
  },
  "environment": "SANDBOX"
}`}
          </pre>
        </section>

        {/* Section 3 */}
        <section id="sandbox" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            3. Sandbox Testing Environment (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">TEST-PROP-001</code>)
          </h2>
          <p>
            External partners test on an isolated test resort without impacting live production data:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sandbox Base URL</span>
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">/api/connectivity/v1</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dedicated Property Code</span>
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">TEST-PROP-001</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="capabilities" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            4. Capabilities Discovery (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">GET /capabilities</code>)
          </h2>
          <p>
            Query platform capability switches to discover which synchronization features are currently active for your partner account:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('GET /api/connectivity/v1/capabilities HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678', 'capabilities')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'capabilities' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`GET /api/connectivity/v1/capabilities HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678`}</pre>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "propertyContentEditing": true,
  "availabilitySync": true,
  "rateSync": true,
  "restrictionSync": true,
  "reservationSync": true
}`}
          </pre>
        </section>

        {/* Section 5 */}
        <section id="content" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            5. Property Content & Listing (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">GET /content</code>)
          </h2>
          <p>
            Retrieve property details, amenities, photos, and RoomType listings to configure room mapping:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('GET /api/connectivity/v1/content?propertyId=TEST-PROP-001 HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678', 'content')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`GET /api/connectivity/v1/content?propertyId=TEST-PROP-001 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678`}</pre>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
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
}`}
          </pre>
        </section>

        {/* Section 6 */}
        <section id="mapping" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            6. RoomType & RatePlan Mapping
          </h2>
          <p>
            Map an external PMS room code to a RouteGuide <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">roomTypeId</code>:
          </p>

          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('POST /api/connectivity/v1/connections/TEST-PROP-001/mappings/room-types HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json\n\n{\n  "roomTypeId": "roomtype-dlx-uuid",\n  "externalRoomTypeId": "EXT-DLX-ROOM",\n  "externalRatePlanId": "STD-BAR"\n}', 'mapping')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'mapping' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`POST /api/connectivity/v1/connections/TEST-PROP-001/mappings/room-types HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "externalRatePlanId": "STD-BAR"
}`}</pre>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "id": "mapping-uuid-1",
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "externalRatePlanId": "STD-BAR"
}`}
          </pre>
        </section>

        {/* Section 7 */}
        <section id="availability" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            7. Inventory Availability Grid (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">GET /availability</code>)
          </h2>
          <p>
            Query sellable quantity inventory grid for mapped RoomTypes across a date range:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('GET /api/connectivity/v1/availability?propertyId=TEST-PROP-001&startDate=2026-09-01&endDate=2026-09-05 HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678', 'availability')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'availability' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`GET /api/connectivity/v1/availability?propertyId=TEST-PROP-001&startDate=2026-09-01&endDate=2026-09-05 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678`}</pre>
          </div>
        </section>

        {/* Section 8 */}
        <section id="rates" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            8. Daily Rates Synchronization (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">PUT /rates</code>)
          </h2>
          <p>
            Push daily rates or rate plans for a mapped RoomType across a date range:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('PUT /api/connectivity/v1/rates HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json\n\n{\n  "propertyId": "TEST-PROP-001",\n  "roomTypeId": "roomtype-dlx-uuid",\n  "startDate": "2026-09-01",\n  "endDate": "2026-09-05",\n  "price": 4999.0,\n  "currency": "INR"\n}', 'rates')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'rates' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`PUT /api/connectivity/v1/rates HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "price": 4999.0,
  "currency": "INR"
}`}</pre>
          </div>
        </section>

        {/* Section 9 */}
        <section id="restrictions" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            9. Restriction Synchronization (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">PUT /restrictions</code>)
          </h2>
          <p>
            Push StopSell, Minimum Stay, or Maximum Stay restrictions for a RoomType:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('PUT /api/connectivity/v1/restrictions HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json\n\n{\n  "propertyId": "TEST-PROP-001",\n  "roomTypeId": "roomtype-dlx-uuid",\n  "startDate": "2026-09-01",\n  "endDate": "2026-09-05",\n  "stopSell": false,\n  "minStay": 2\n}', 'restrictions')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'restrictions' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`PUT /api/connectivity/v1/restrictions HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "stopSell": false,
  "minStay": 2
}`}</pre>
          </div>
        </section>

        {/* Section 10 */}
        <section id="reservations" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            10. Reservation Lifecycle (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">POST /reservations</code>)
          </h2>
          <p>
            Ingest new bookings from your PMS engine:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('POST /api/connectivity/v1/reservations HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json\n\n{\n  "propertyId": "TEST-PROP-001",\n  "externalReservationId": "EXT-BOOKING-99",\n  "externalRoomTypeId": "EXT-DLX-ROOM",\n  "checkInDate": "2026-09-10",\n  "checkOutDate": "2026-09-12",\n  "guestName": "John Doe",\n  "guestEmail": "john@example.com",\n  "totalAmount": 9998.0,\n  "currency": "INR"\n}', 'reservations')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'reservations' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`POST /api/connectivity/v1/reservations HTTP/1.1
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
}`}</pre>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "status": "CONFIRMED",
  "bookingId": "rg-booking-uuid-101",
  "externalReservationId": "EXT-BOOKING-99"
}`}
          </pre>
        </section>

        {/* Section 11 */}
        <section id="idempotency" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            11. Reservation Idempotency
          </h2>
          <p>
            If an external network issue occurs and your PMS re-transmits a reservation request with the <strong>same <code className="text-emerald-600 dark:text-emerald-400 font-mono">externalReservationId</code></strong>, RouteGuide guarantees <strong>idempotent processing</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-2">
            <li>RouteGuide will <strong>not</strong> create duplicate bookings or double-deduct inventory.</li>
            <li>RouteGuide returns the existing reservation details with <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">HTTP 200/201</code>.</li>
          </ul>
        </section>

        {/* Section 12 */}
        <section id="webhooks" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            12. Outbound Webhook Delivery
          </h2>
          <p>
            RouteGuide dispatches real-time outbound webhooks for system events (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">RESERVATION.CREATED</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">RESERVATION.MODIFIED</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">RESERVATION.CANCELLED</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">AVAILABILITY.CHANGED</code>, <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">PING</code>).
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Outbound Event Headers sent by RouteGuide:</p>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400">
{`Content-Type: application/json
X-RouteGuide-Signature: t=1787894630,v1=3ad746430a149c71e285d89f029...
X-RouteGuide-Event-Id: evt-2b62d7e6-8fa5-4a25...
X-RouteGuide-Event-Type: RESERVATION.CREATED`}
          </pre>
        </section>

        {/* Section 13 */}
        <section id="hmac" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            13. HMAC-SHA256 Webhook Signatures
          </h2>
          <p>
            All outbound webhooks include signature header: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">X-RouteGuide-Signature: t=1787894630,v1=3ad746...</code>.
          </p>
          <p>
            Verify signature freshness (within 300s) and compute HMAC-SHA256 using your partner secret:
          </p>
          <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-emerald-300 shadow-sm">
            <pre>{`const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secret) {
  const [tPart, v1Part] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const transmittedDigest = v1Part.split('=')[1];

  const signedPayload = \`\${timestamp}.\${rawBody}\`;
  const calculatedDigest = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return calculatedDigest === transmittedDigest;
}`}</pre>
          </div>
        </section>

        {/* Section 14 */}
        <section id="retries" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            14. Retry Policies & Rate Limits
          </h2>
          <p>
            If your webhook receiver returns <code className="text-rose-600 dark:text-rose-400 font-mono">HTTP 4xx/5xx</code> or times out (10s), RouteGuide retries automatically with exponential backoff up to 5 times (Immediate, +10s, +60s, +300s, +1800s).
          </p>
        </section>

        {/* Section 15 */}
        <section id="reset" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            15. Sandbox Data Reset (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">POST /sandbox/reset</code>)
          </h2>
          <p>
            Reset test mappings and test bookings on <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code> to restart testing cleanly:
          </p>
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('POST /api/connectivity/v1/sandbox/reset HTTP/1.1\nx-api-key: rg_test_1234567890abcdef12345678', 'reset')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'reset' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`POST /api/connectivity/v1/sandbox/reset HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678`}</pre>
          </div>
        </section>

        {/* Section 16 */}
        <section id="certification" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            16. Self-Certification Checklist
          </h2>
          <p>
            Complete all 6 automated milestones on <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code> to achieve certified status:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-3">Milestone</th>
                  <th className="p-3">Requirement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">1. Sandbox Connection</td>
                  <td className="p-3">Active API key connection to TEST-PROP-001</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">2. RoomType Mapping</td>
                  <td className="p-3">At least 1 RoomType mapped via POST /mappings/room-types</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">3. Rates & Restrictions</td>
                  <td className="p-3">PUT /rates and PUT /restrictions updates logged</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">4. Reservation Lifecycle</td>
                  <td className="p-3">Ingest, Read, Modify, and Cancel test booking</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">5. Idempotency</td>
                  <td className="p-3">Duplicate ingestion returns existing booking</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">6. Webhook & HMAC</td>
                  <td className="p-3">POST /sandbox/test-webhook received with signatureVerified: true</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 17 */}
        <section id="production" className="space-y-4 scroll-mt-24 pb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            17. Production Credentials Security Gate
          </h2>
          <p>
            Production API keys (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">rg_live_...</code>) allow live hotel property distribution. Key issuance is strictly guarded and permitted ONLY when <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">certificationStatus === 'PASSED'</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
