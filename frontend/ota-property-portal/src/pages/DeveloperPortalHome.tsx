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
            Connect your PMS or Channel Manager to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">Oreedu</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Oreedu provides a standard, vendor-neutral REST API boundary for Property Content, Inventory Availability, Rate Sync, Restriction Management, and Real-Time Reservation Life-Cycle Webhooks.
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

      {/* 6-Step Onboarding Journey */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Six Steps to Live Production Integration</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Follow our transparent self-service developer workflow from registration to live certified distribution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Step 1 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-emerald-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/20">
                01
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Create Account</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Register your PMS company and get instant Sandbox access.
              </p>
            </div>
            <Link to="/developers/register" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 pt-2">
              Register <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-teal-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold text-xs flex items-center justify-center border border-teal-500/20">
                02
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sandbox Key</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive <code className="text-teal-600 dark:text-teal-400 font-mono">rg_test_...</code> for <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>.
              </p>
            </div>
            <Link to="/developers/sandbox" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-500 pt-2">
              Sandbox <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 3 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-sky-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-extrabold text-xs flex items-center justify-center border border-sky-500/20">
                03
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">API Reference</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect and sync availability, rates, restrictions, and bookings.
              </p>
            </div>
            <Link to="/developers/docs" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 pt-2">
              API Guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 4 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-indigo-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center border border-indigo-500/20">
                04
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Webhooks</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Configure receiver endpoint and verify HMAC signatures.
              </p>
            </div>
            <Link to="/developers/webhooks" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 pt-2">
              Webhooks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 5 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-amber-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-xs flex items-center justify-center border border-amber-500/20">
                05
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Certification</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Run automated 6-milestone audit to achieve PASSED status.
              </p>
            </div>
            <Link to="/developers/certification" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 pt-2">
              Certify <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Step 6 */}
          <div className="relative p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 hover:border-purple-500/40 shadow-sm transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-xs flex items-center justify-center border border-purple-500/20">
                06
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Go Live</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Unlock <code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code> keys for live hotel distribution.
              </p>
            </div>
            <Link to="/developers/production" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 pt-2">
              Production <ArrowRight className="w-3 h-3" />
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
            Create your Developer account, receive Sandbox credentials, complete certification, and unlock Production API access.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/developers/register"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            Get Sandbox Access <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/developers/login"
            className="px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
          >
            Developer Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}
