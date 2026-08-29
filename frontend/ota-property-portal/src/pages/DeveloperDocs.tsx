import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Copy,
  Check,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  Cpu,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperDocs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyAll = () => {
    const el = document.getElementById('docs-main-content');
    if (el) {
      const text = el.innerText;
      navigator.clipboard.writeText(text);
      setCopiedAll(true);
      toast.success('Copied full V1 API Reference & Integration Guide to clipboard!');
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const sections = [
    { id: 'overview', title: '1. Overview & B2B Architecture' },
    { id: 'base-urls', title: '2. Environments & Base URLs' },
    { id: 'auth', title: '3. Authentication (x-api-key)' },
    { id: 'sandbox', title: '4. Sandbox Environment (TEST-PROP-001)' },
    { id: 'capabilities', title: '5. Capabilities Discovery' },
    { id: 'content', title: '6. Property Content & Listing' },
    { id: 'mapping', title: '7. RoomType & RatePlan Mapping' },
    { id: 'availability', title: '8. Availability Synchronization' },
    { id: 'rates', title: '9. Rate Plans & Pricing Sync' },
    { id: 'restrictions', title: '10. Restriction Synchronization' },
    { id: 'reservations', title: '11. Reservation Lifecycle (4 APIs)' },
    { id: 'idempotency', title: '12. Reservation Idempotency' },
    { id: 'webhook-config', title: '13. Webhook URL & Secret Setup' },
    { id: 'webhooks-outbox', title: '14. Outbound Event Delivery' },
    { id: 'hmac', title: '15. HMAC-SHA256 Verification' },
    { id: 'retries', title: '16. Retry Policies & Rate Limits' },
    { id: 'certification', title: '17. Self-Certification & Live Gate' },
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 font-sans">
      {/* Sidebar Table of Contents */}
      <aside className="lg:col-span-1 hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            API Guide Contents
          </div>
          <button
            onClick={handleCopyAll}
            title="Copy entire V1 API Reference & Integration Guide"
            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? 'Copied' : 'Copy All'}
          </button>
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-900 font-medium'
                }`}
              >
                <span className="truncate">{s.title}</span>
                {isActive && <ChevronRight className="w-3 h-3 shrink-0 text-emerald-500" />}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Call to Action Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 space-y-2">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Get Started</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Ready to start testing? Create your developer account now.</p>
          <Link
            to="/developers/register"
            className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            Get Sandbox Access <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* Documentation Main Column */}
      <div id="docs-main-content" className="lg:col-span-3 space-y-14 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        {/* Top Header Banner */}
        <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Terminal className="w-3.5 h-3.5" /> RouteGuide OTA Connectivity V1 Technical Specification
            </div>
            <button
              onClick={handleCopyAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-emerald-400 text-xs font-bold border border-slate-700 transition-all shadow-md shrink-0 cursor-pointer"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
              {copiedAll ? 'Copied Entire API Guide!' : 'Copy Entire V1 API Reference'}
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            V1 API Reference & Integration Guide
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
            The definitive technical guide for external Property Management Systems (PMS), Channel Managers, and Central Reservation Systems (CRS) integrating with RouteGuide.
          </p>

          {/* Quick Onboarding Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" /> Ready to Integrate?
              </div>
              <p className="text-xs text-slate-300">
                Register your PMS or Channel Manager to receive immediate Sandbox credentials (<code className="text-emerald-400 font-mono">rg_test_...</code>) for <code className="text-teal-300 font-mono">TEST-PROP-001</code>.
              </p>
            </div>
            <Link
              to="/developers/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center gap-1.5"
            >
              Get Sandbox Access <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Section 1: Overview */}
        <section id="overview" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            1. Overview & B2B Architecture
          </h2>
          <p>
            The RouteGuide OTA Connectivity Platform operates as a vendor-neutral, bi-directional REST boundary. External software systems can manage inventory distribution, rate plans, restrictions, bookings, and receive real-time webhook event notifications.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Inbound REST APIs</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">Push rates, restrictions, availability caps, and ingest/modify reservations.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">Outbound Webhooks</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">Receive HMAC-signed event notifications for new bookings, cancellations, and availability.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Sandbox Self-Cert</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">Complete 6 automated milestones on mock resort <code className="text-emerald-500 font-mono">TEST-PROP-001</code> to unlock live keys.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Base URLs */}
        <section id="base-urls" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            2. Environments & Base URLs
          </h2>
          <p>
            All RouteGuide Connectivity V1 API requests must target the full environment base URL corresponding to your issued credential environment:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Sandbox / Staging Environment (rg_test_...)
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">TEST-PROP-001 ONLY</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 flex items-center justify-between border border-slate-800">
                <span>https://staging-api.routeguide.in/api/connectivity/v1</span>
                <button onClick={() => copyToClipboard('https://staging-api.routeguide.in/api/connectivity/v1', 'url-sandbox')} className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white">
                  {copiedSection === 'url-sandbox' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Local development fallback: <code className="font-mono text-slate-600 dark:text-slate-300">http://localhost:3000/api/connectivity/v1</code></p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-500/30 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Live Production Environment (rg_live_...)
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">CERTIFIED PARTNERS ONLY</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-purple-300 flex items-center justify-between border border-slate-800">
                <span>https://api.routeguide.in/api/connectivity/v1</span>
                <button onClick={() => copyToClipboard('https://api.routeguide.in/api/connectivity/v1', 'url-prod')} className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white">
                  {copiedSection === 'url-prod' ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Requires <code className="text-emerald-500 font-mono">certificationStatus = 'PASSED'</code> to access live properties.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Authentication */}
        <section id="auth" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            3. Authentication (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">x-api-key</code>)
          </h2>
          <p>
            All Connectivity V1 API requests must supply the API key in the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-mono">x-api-key</code> header (or as <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>):
          </p>

          <div className="relative rounded-2xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200 shadow-sm">
            <button
              onClick={() => copyToClipboard('GET /api/connectivity/v1/ping HTTP/1.1\nHost: staging-api.routeguide.in\nx-api-key: rg_test_1234567890abcdef12345678\nContent-Type: application/json', 'auth-ping')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              {copiedSection === 'auth-ping' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre>{`GET /api/connectivity/v1/ping HTTP/1.1
Host: staging-api.routeguide.in
x-api-key: rg_test_1234567890abcdef12345678  # Example only — use your own Sandbox API key.
Content-Type: application/json`}</pre>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Actual Response (HTTP 200 OK):</span>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "status": "OK",
  "partnerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "partnerName": "Nexus PMS Systems",
  "partnerCode": "NEXUS_PMS",
  "environment": "SANDBOX",
  "timestamp": "2026-08-29T10:15:30.123Z"
}`}
            </pre>
          </div>
        </section>

        {/* Section 4: Sandbox */}
        <section id="sandbox" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            4. Sandbox Environment (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">TEST-PROP-001</code>)
          </h2>
          <p>
            RouteGuide provides an isolated Sandbox resort <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code> (RouteGuide Sandbox Resort) initialized with test RoomTypes and physical rooms.
          </p>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <AlertCircle className="w-4 h-4 text-emerald-500" /> Sandbox Isolation Guarantees
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-2">
              <li>Sandbox keys (<code className="text-emerald-600 dark:text-emerald-400 font-mono">rg_test_...</code>) can <strong>ONLY</strong> access property <code className="font-mono font-bold">TEST-PROP-001</code>.</li>
              <li>Attempting to query or modify a real production property ID with a Sandbox key returns <code className="text-rose-500 font-mono">HTTP 403 Forbidden</code>.</li>
              <li>Production keys (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>) cannot access <code className="font-mono">TEST-PROP-001</code>.</li>
            </ul>
          </div>
        </section>

        {/* Section 5: Capabilities */}
        <section id="capabilities" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            5. Capabilities Discovery (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">GET /capabilities</code>)
          </h2>
          <p>
            Query global connectivity synchronization feature switches to verify active modules:
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "propertyContentEditing": true,
  "availabilitySync": true,
  "rateSync": true,
  "restrictionSync": true,
  "reservationSync": true
}`}
          </pre>
        </section>

        {/* Section 6: Content */}
        <section id="content" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            6. Property Content & Listing (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">GET /content</code>)
          </h2>
          <p>
            Query listing metadata, available RoomTypes, and amenities for a property to initiate mapping:
          </p>
          <div className="relative rounded-2xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-slate-200">
            <pre>{`GET /api/connectivity/v1/content?propertyId=TEST-PROP-001 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only`}</pre>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`{
  "id": "c39b81f2-53a9-40ea-92b0-681b37b42021",
  "name": "RouteGuide Sandbox Resort",
  "slug": "test-prop-001",
  "city": "Kochi",
  "state": "Kerala",
  "roomTypes": [
    {
      "id": "roomtype-dlx-uuid",
      "name": "Deluxe Sandbox Room",
      "basePrice": 4500.0,
      "maxAdults": 2,
      "maxChildren": 1,
      "totalRoomsCount": 5
    }
  ]
}`}
          </pre>
        </section>

        {/* Section 7: RoomType & RatePlan Mapping */}
        <section id="mapping" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              7. Property Connection & Room Mapping
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Establish property connections and bind external PMS room/rate codes to RouteGuide entities.
            </p>
          </div>

          {/* 7.1 Initial Connection */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">POST</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">/api/connectivity/v1/connections</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Initializes an active connection between your developer partner account and a RouteGuide property (e.g. <code className="font-mono">TEST-PROP-001</code> in Sandbox).
            </p>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Request Body (CreateConnectionDto)</span>
              <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800">
{`{
  "propertyId": "TEST-PROP-001",              // Required: RouteGuide propertyId or Sandbox code
  "externalPropertyId": "PMS-HOTEL-101"       // Required: Your external PMS property code
}`}
              </pre>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Response (HTTP 201 Created)</span>
              <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
{`{
  "id": "conn-8f92a101-382a-4a25",
  "partnerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "propertyId": "c39b81f2-53a9-40ea-92b0-681b37b42021",
  "externalPropertyId": "PMS-HOTEL-101",
  "status": "ACTIVE",
  "createdAt": "2026-08-29T10:00:00.000Z"
}`}
              </pre>
            </div>
          </div>

          {/* 7.2 Mapping Flow */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">Identifier Mapping Architecture</span>
            <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 font-sans font-bold">
                <span>External PMS / Channel Manager</span>
                <span></span>
                <span>RouteGuide Platform Entity</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-400">externalRoomTypeId ("EXT-DLX-ROOM")</span>
                <span className="text-slate-500">─────►</span>
                <span className="text-emerald-400">roomTypeId ("roomtype-dlx-uuid")</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-400">externalRatePlanId ("STD-BAR")</span>
                <span className="text-slate-500">─────►</span>
                <span className="text-emerald-400">Rate Plan / Pricing Rule</span>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Register Room Mapping (POST /connections/:propertyId/mappings/room-types)</span>
              <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800">
{`POST /api/connectivity/v1/connections/TEST-PROP-001/mappings/room-types HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only
Content-Type: application/json

{
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "externalRatePlanId": "STD-BAR"
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 8: Availability */}
        <section id="availability" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            8. Availability Synchronization
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">A. Query Availability Grid (GET /availability)</span>
              <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 mt-1">
{`GET /api/connectivity/v1/availability?propertyId=TEST-PROP-001&startDate=2026-09-01&endDate=2026-09-03 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678`}
              </pre>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">B. Push External Availability Allocation Caps (PUT /availability)</span>
              <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-teal-400 border border-slate-800 mt-1">
{`PUT /api/connectivity/v1/availability HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "availableUnits": 5
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 9: Rates */}
        <section id="rates" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            9. Rate Plans & Daily Pricing (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">PUT /rates</code>)
          </h2>
          <p>
            Push date-range rates for mapped RoomTypes:
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`PUT /api/connectivity/v1/rates HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "price": 4999.0,
  "currency": "INR"
}`}
          </pre>
        </section>

        {/* Section 10: Restrictions */}
        <section id="restrictions" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            10. Restriction Synchronization (<code className="text-emerald-600 dark:text-emerald-400 font-mono text-base">PUT /restrictions</code>)
          </h2>
          <p>
            Configure StopSell, Minimum Stay, and Maximum Stay restriction controls:
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`PUT /api/connectivity/v1/restrictions HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only
Content-Type: application/json

{
  "propertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "stopSell": false,
  "minStay": 2,
  "maxStay": 14,
  "closedToArrival": false,
  "closedToDeparture": false
}`}
          </pre>
        </section>

        {/* Section 11: Reservation Lifecycle (4 APIs) */}
        <section id="reservations" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              11. Full Reservation Lifecycle (4 Core APIs)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              RouteGuide provides 4 distinct endpoints covering the complete reservation life-cycle from creation to cancellation.
            </p>
          </div>

          {/* 11.1 Ingest */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">POST</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">/api/connectivity/v1/reservations</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Ingests a new external PMS / Channel Manager booking into RouteGuide, validates restrictions, and allocates a physical room.</p>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Request Body Schema (CreateConnectivityReservationDto)</span>
              <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800">
{`{
  "propertyId": "TEST-PROP-001",              // Required: RouteGuide propertyId or externalPropertyId
  "externalReservationId": "EXT-RES-1001",     // Required: Unique ID in external PMS
  "externalRoomTypeId": "EXT-DLX-ROOM",        // Required: Mapped external RoomType code
  "externalRatePlanId": "STD-BAR",             // Optional: Mapped external RatePlan code
  "checkInDate": "2026-09-10",                 // Required: YYYY-MM-DD
  "checkOutDate": "2026-09-15",                // Required: YYYY-MM-DD (must be after checkInDate)
  "adultsCount": 2,                            // Required: Min 1
  "childrenCount": 0,                          // Optional: Min 0
  "totalAmount": 15000.0,                      // Required: Total monetary booking value
  "currency": "INR",                           // Optional: Default "INR"
  "guest": {                                   // Required: Primary guest info
    "firstName": "John",                       // Required
    "lastName": "Doe",                         // Required
    "email": "john.doe@example.com",           // Required: Valid email format
    "phone": "+919876543210",                  // Required
    "country": "IND"                           // Optional
  },
  "specialRequests": "High floor requested"    // Optional: Notes/Requests
}`}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Success Response (HTTP 201 Created)</span>
              <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
{`{
  "status": "SUCCESS",
  "isExisting": false,
  "message": "Reservation EXT-RES-1001 successfully created",
  "reservationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "bookingId": "c498ef01-382a-4a25-83e9-74d1297e59b2",
  "bookingNumber": "BK-20260829-001",
  "externalReservationId": "EXT-RES-1001",
  "propertyId": "c39b81f2-53a9-40ea-92b0-681b37b42021",
  "externalPropertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "assignedRoomNumber": "101",
  "checkInDate": "2026-09-10",
  "checkOutDate": "2026-09-15",
  "totalAmount": 15000,
  "currency": "INR",
  "bookingStatus": "CONFIRMED",
  "guest": {
    "id": "usr-8a213904-4901",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+919876543210"
  }
}`}
              </pre>
            </div>
          </div>

          {/* 11.2 Read */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold text-xs">GET</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">/api/connectivity/v1/reservations/:id</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Retrieves reservation details. The <code className="font-mono">:id</code> parameter can be the RouteGuide <code className="font-mono">reservationMappingId</code>, the RouteGuide <code className="font-mono">bookingId</code>, or your PMS <code className="font-mono">externalReservationId</code>.
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
{`{
  "reservationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "bookingId": "c498ef01-382a-4a25-83e9-74d1297e59b2",
  "bookingNumber": "BK-20260829-001",
  "externalReservationId": "EXT-RES-1001",
  "propertyId": "c39b81f2-53a9-40ea-92b0-681b37b42021",
  "externalPropertyId": "TEST-PROP-001",
  "roomTypeId": "roomtype-dlx-uuid",
  "externalRoomTypeId": "EXT-DLX-ROOM",
  "assignedRoomNumber": "101",
  "checkInDate": "2026-09-10",
  "checkOutDate": "2026-09-15",
  "adultsCount": 2,
  "childrenCount": 0,
  "totalAmount": 15000,
  "currency": "INR",
  "bookingStatus": "CONFIRMED",
  "specialRequests": "High floor requested",
  "createdAt": "2026-08-29T10:15:30.000Z",
  "guest": {
    "id": "usr-8a213904-4901",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+919876543210"
  }
}`}
            </pre>
          </div>

          {/* 11.3 Modify */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">PUT</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">/api/connectivity/v1/reservations/:id</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Modifies dates, guest info, or room type for an existing booking. Emits a <code className="font-mono text-emerald-500">RESERVATION.MODIFIED</code> event.
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800">
{`PUT /api/connectivity/v1/reservations/EXT-RES-1001 HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only
Content-Type: application/json

{
  "checkInDate": "2026-09-11",
  "checkOutDate": "2026-09-16",
  "totalAmount": 16000.0,
  "specialRequests": "Late check-in requested"
}`}
            </pre>
          </div>

          {/* 11.4 Cancel */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs">POST</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">/api/connectivity/v1/reservations/:id/cancel</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cancels the booking, releases room inventory back to available stock, and emits <code className="font-mono text-rose-500">RESERVATION.CANCELLED</code> and <code className="font-mono text-emerald-500">AVAILABILITY.CHANGED</code> events.
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800">
{`POST /api/connectivity/v1/reservations/EXT-RES-1001/cancel HTTP/1.1
x-api-key: rg_test_1234567890abcdef12345678  # Example only
Content-Type: application/json

{
  "reason": "Guest requested cancellation via PMS"
}`}
            </pre>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Response (HTTP 200 OK):</span>
            <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-rose-400 border border-slate-800">
{`{
  "status": "SUCCESS",
  "isExisting": false,
  "message": "Reservation EXT-RES-1001 successfully cancelled",
  "reservationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "bookingId": "c498ef01-382a-4a25-83e9-74d1297e59b2",
  "bookingNumber": "BK-20260829-001",
  "externalReservationId": "EXT-RES-1001",
  "bookingStatus": "CANCELLED"
}`}
            </pre>
          </div>
        </section>

        {/* Section 12: Idempotency */}
        <section id="idempotency" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            12. Reservation Idempotency Guarantees
          </h2>
          <p>
            If a network timeout occurs and your PMS re-transmits an ingestion request with the same <code className="text-emerald-600 dark:text-emerald-400 font-mono">externalReservationId</code>, RouteGuide guarantees strict idempotency:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
            <li>No duplicate booking records are created.</li>
            <li>No duplicate inventory deductions occur.</li>
            <li>RouteGuide returns the existing booking record with <code className="font-mono text-emerald-500">"isExisting": true</code>.</li>
          </ul>
        </section>

        {/* Section 13: Webhook Setup */}
        <section id="webhook-config" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            13. Webhook URL & Secret Management
          </h2>
          <p>
            Configure where RouteGuide dispatches outbound event webhooks:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" /> Option A: Developer Dashboard
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                Sign in to <Link to="/developers/dashboard" className="text-emerald-600 dark:text-emerald-400 font-bold underline">/developers/dashboard</Link>, input your destination Webhook URL, and click "Rotate HMAC Secret" when needed.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-500" /> Option B: Developer API Endpoint
              </span>
              <pre className="p-2 rounded bg-slate-950 font-mono text-[10px] text-teal-300 border border-slate-800">
{`PATCH /api/connectivity/v1/developer/webhook-config
Authorization: Bearer <developer_token>

{
  "webhookUrl": "https://pms.com/events",
  "rotateSecret": false
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 14: Outbound Events */}
        <section id="webhooks-outbox" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            14. Outbound Event Delivery & Payload Structure
          </h2>
          <p>
            All webhooks are delivered via HTTP POST with custom RouteGuide tracking headers:
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
{`POST https://webhook.yourpms.com/events HTTP/1.1
Host: webhook.yourpms.com
Content-Type: application/json
X-RouteGuide-Signature: t=1787894630,v1=3ad746430a149c71e285d89f029a8f4c2049e81d8975a2
X-RouteGuide-Event-Id: evt-2b62d7e6-8fa5-4a25-9a3b-0149e8a011ef
X-RouteGuide-Event-Type: RESERVATION.CREATED

{
  "eventId": "evt-2b62d7e6-8fa5-4a25-9a3b-0149e8a011ef",
  "eventType": "RESERVATION.CREATED",
  "timestamp": "2026-08-29T10:20:00.000Z",
  "partnerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "propertyId": "c39b81f2-53a9-40ea-92b0-681b37b42021",
  "externalPropertyId": "TEST-PROP-001",
  "data": {
    "bookingId": "c498ef01-382a-4a25-83e9-74d1297e59b2",
    "bookingNumber": "BK-20260829-001",
    "externalReservationId": "EXT-RES-1001",
    "externalRoomTypeId": "EXT-DLX-ROOM",
    "checkInDate": "2026-09-10",
    "checkOutDate": "2026-09-15",
    "status": "CONFIRMED"
  }
}`}
          </pre>
        </section>

        {/* Section 15: HMAC-SHA256 Verification */}
        <section id="hmac" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            15. HMAC-SHA256 Webhook Verification
          </h2>
          <p>
            As a <strong>partner receiver responsibility</strong>, you must verify the signature of every incoming webhook to prevent spoofing and replay attacks:
          </p>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Important Receiver Rule</span>
            <p>You must preserve the <strong>raw unparsed request body</strong> buffer/string. If your HTTP framework parses JSON into an object before signature verification, re-stringified JSON will cause signature mismatch.</p>
          </div>

          <div className="relative rounded-2xl bg-slate-900 p-4 border border-slate-800 font-mono text-xs text-emerald-300">
            <pre>{`const crypto = require('crypto');

/**
 * Validates incoming RouteGuide webhook signature with timing-safe comparison
 * @param {string|Buffer} rawBody - Raw HTTP body received from RouteGuide
 * @param {string} signatureHeader - Value of X-RouteGuide-Signature header
 * @param {string} secret - Partner Webhook HMAC secret
 * @param {number} toleranceSec - Max allowed timestamp age in seconds (default 300s)
 */
function verifyRouteGuideWebhook(rawBody, signatureHeader, secret, toleranceSec = 300) {
  if (!signatureHeader || !secret) return false;

  // 1. Extract t (timestamp) and v1 (signature hex)
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const transmittedDigest = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !transmittedDigest) return false;

  // 2. Enforce timestamp freshness (Partner receiver check)
  const currentTimeSec = Math.floor(Date.now() / 1000);
  const eventTimeSec = parseInt(timestamp, 10);
  if (Math.abs(currentTimeSec - eventTimeSec) > toleranceSec) {
    console.warn('Webhook timestamp outside tolerance window (replay protection)');
    return false;
  }

  // 3. Compute expected HMAC: HMAC-SHA256(timestamp + "." + rawBody, secret)
  const signedMessage = \`\${timestamp}.\${rawBody.toString('utf8')}\`;
  const calculatedDigest = crypto
    .createHmac('sha256', secret)
    .update(signedMessage)
    .digest('hex');

  // 4. Secure constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedDigest, 'hex'),
      Buffer.from(transmittedDigest, 'hex')
    );
  } catch (err) {
    return false;
  }
}`}</pre>
          </div>
        </section>

        {/* Section 16: Retries & Rate Limits */}
        <section id="retries" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            16. Retry Policies & Rate Limit Architecture
          </h2>
          <p>
            Retry mechanisms differ based on communication direction:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Inbound (PMS ➔ RouteGuide)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                The external PMS is responsible for client-side retries. If RouteGuide returns <code className="font-mono text-amber-500">HTTP 429 Too Many Requests</code>, inspect headers:
              </p>
              <ul className="font-mono text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                <li>X-RateLimit-Limit: 100</li>
                <li>X-RateLimit-Remaining: 0</li>
                <li>X-RateLimit-Reset: 1787895000</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <span className="font-bold text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-500" /> Outbound (RouteGuide ➔ PMS)
              </span>
              <p className="text-slate-600 dark:text-slate-400">
                RouteGuide automatically retries failed webhooks (HTTP 4xx/5xx/timeout) using 5-tier exponential backoff:
              </p>
              <ul className="font-mono text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                <li>Retry 1: +10 seconds</li>
                <li>Retry 2: +60 seconds (1m)</li>
                <li>Retry 3: +300 seconds (5m)</li>
                <li>Retry 4: +1800 seconds (30m)</li>
                <li>Retry 5: +7200 seconds (2h)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 17: Self-Certification & Production Gate */}
        <section id="certification" className="space-y-6 scroll-mt-24 pb-12">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              17. 6-Milestone Self-Certification & Production Security Gate
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Before issuing live production keys (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>), partners must pass all 6 automated milestones against <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>:
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <th className="p-3">#</th>
                  <th className="p-3">Milestone Category</th>
                  <th className="p-3">Required API Interaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-3 font-bold text-emerald-500">1</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">Sandbox Connection</td>
                  <td className="p-3 font-mono">GET /ping and GET /content on TEST-PROP-001</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-500">2</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">RoomType Mapping</td>
                  <td className="p-3 font-mono">POST /connections/TEST-PROP-001/mappings/room-types</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-500">3</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">Rates & Restrictions</td>
                  <td className="p-3 font-mono">PUT /rates and PUT /restrictions updates</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-500">4</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">Reservation Lifecycle</td>
                  <td className="p-3 font-mono">POST /reservations, GET /reservations/:id, PUT /reservations/:id, and cancel</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-500">5</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">Idempotency Validation</td>
                  <td className="p-3 font-mono">Duplicate POST /reservations returns existing booking</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-500">6</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">Webhook & HMAC Verification</td>
                  <td className="p-3 font-mono">POST /sandbox/test-webhook with valid HMAC receipt</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Onboarding CTA Banner */}
          <div className="p-8 rounded-3xl bg-slate-900 text-white border border-emerald-500/30 text-center space-y-4 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" /> Ready to Build Your Integration?
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight">
              Get Started with RouteGuide Sandbox Access Today
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Register your PMS, Channel Manager, or Central Reservation System. You will receive an active Sandbox API Key (<code className="text-emerald-400 font-mono">rg_test_...</code>) and Webhook secret immediately.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                to="/developers/register"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                Get Sandbox Access <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/developers/login"
                className="px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
              >
                Developer Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
