import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Code2, Layers, Sparkles, Building2 } from 'lucide-react';

export default function DeveloperPortalHome() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> B2B Connectivity Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Connect your PMS or Channel Manager to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">RouteGuide</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            RouteGuide provides a standard, vendor-neutral REST API boundary for Property Content, Inventory Availability, Rate Sync, Restriction Management, and Real-Time Reservation Life-Cycle Webhooks.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/developers/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02]"
            >
              Get Sandbox Access
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/developers/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm transition-all"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              Developer Sign In
            </Link>

            <Link
              to="/developers/docs"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-800 hover:bg-slate-800/50 text-slate-300 font-semibold text-sm transition-all"
            >
              Explore API Reference
            </Link>
          </div>
        </div>
      </section>

      {/* 4-Step Onboarding Journey */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Four Steps to Live Production Integration</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Follow our self-service developer workflow from Sandbox testing to certified distribution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4 hover:border-emerald-500/40 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center border border-emerald-500/20">
              01
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Read Documentation</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Explore vendor-neutral REST API endpoints, request schemas, rate-limiting rules, and HMAC webhook algorithms.
            </p>
            <Link to="/developers/docs" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
              Read API Guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4 hover:border-emerald-500/40 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold text-sm flex items-center justify-center border border-teal-500/20">
              02
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Test on Sandbox</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect your system to dedicated test resort <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code> using a Sandbox API key.
            </p>
            <Link to="/developers/sandbox" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-500">
              Sandbox Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 3 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4 hover:border-emerald-500/40 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm flex items-center justify-center border border-indigo-500/20">
              03
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">6-Milestone Certification</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Execute automated checks for Room Mapping, Rates, Restrictions, Reservation Ingestion, Idempotency, and HMAC Webhooks.
            </p>
            <Link to="/developers/certification" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              Self-Certification <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 4 */}
          <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-4 hover:border-emerald-500/40 shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-sm flex items-center justify-center border border-purple-500/20">
              04
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Unlock Production Access</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upon achieving <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASSED</span> status, obtain production credentials (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>) for live hotel distribution.
            </p>
            <Link to="/developers/production" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500">
              Production Security Gate <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core API Capabilities Matrix */}
      <section className="space-y-6 bg-slate-100/60 dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Core V1 API Capabilities</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">High-performance B2B REST endpoints supporting complete connectivity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Property Content & Mapping</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Retrieve property metadata, RoomTypes, amenities, and map external PMS codes via <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">POST /mappings/room-types</code>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Inventory, Rates & Restrictions</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Synchronize sellable inventory quantity grids, daily rate plans (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-mono">PUT /rates</code>), and StopSell/MinStay restrictions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Reservations & HMAC Webhooks</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ingest, read, modify, and cancel reservations with guaranteed idempotency. Receive real-time outbox webhooks signed with HMAC-SHA256.
            </p>
          </div>
        </div>
      </section>

      {/* Ready to Integrate CTA Card */}
      <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-900/30 via-slate-900 to-indigo-900/30 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <h2 className="text-2xl font-extrabold text-white">Ready to integrate your system?</h2>
          <p className="text-sm text-slate-300">
            Sign in to your RouteGuide Partner Portal to issue Sandbox credentials, track your certification progress, and unlock live Production API access.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Link
            to="/login"
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            Partner Sign In
          </Link>
          <Link
            to="/developers/sandbox"
            className="px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
          >
            Explore Sandbox
          </Link>
        </div>
      </section>
    </div>
  );
}
