import { Link } from 'react-router-dom';
import { Cpu, Terminal, ArrowRight, ShieldCheck, RefreshCw, Key, Layers, Lock } from 'lucide-react';

export default function DeveloperSandboxDocs() {
  const isLoggedIn = !!localStorage.getItem('developer_token');

  return (
    <div className="space-y-12 py-4 font-sans">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20 uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" /> Isolated Testing Environment
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Sandbox Environment Guide (<code className="text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code>)
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-3xl leading-relaxed">
          The RouteGuide Sandbox is an isolated testing environment that mirrors production API contracts, allowing external Property Management Systems (PMS) and Channel Managers to test inventory sync, pricing, restrictions, and bookings safely.
        </p>
      </div>

      {/* Action CTA Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Terminal className="w-4 h-4" /> Ready to Run Live Tests?
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isLoggedIn
              ? 'You are signed in! Access the interactive Sandbox Console in your Developer Dashboard to issue test requests and reset mock data.'
              : 'Sign in to your Developer Dashboard to generate Sandbox API keys, run endpoint tests, and track self-certification milestones.'}
          </p>
        </div>

        {isLoggedIn ? (
          <Link
            to="/developers/dashboard#sandbox"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center gap-2"
          >
            Go to Sandbox Console
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/developers/login"
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Developer Sign In
            </Link>
            <Link
              to="/developers/register"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              Get Sandbox Access <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Sandbox Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Key className="w-4 h-4" /> Key Format
          </div>
          <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">rg_test_&lt;random_hex&gt;</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Issued upon registration or from your Developer Dashboard credentials panel.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" /> Dedicated Test Property
          </div>
          <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">TEST-PROP-001</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pre-configured test resort with Deluxe Room (<code className="font-mono text-teal-600 dark:text-teal-400">DELUXE</code>) and Executive Suite (<code className="font-mono text-teal-600 dark:text-teal-400">SUITE</code>).
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" /> Side-Effect Boundary
          </div>
          <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">ZERO Live Side-Effects</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Keys attempting live property access return HTTP 403 Forbidden automatically.
          </p>
        </div>
      </div>

      {/* Detailed Technical Specification Sections */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm text-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            1. Base URLs & Authentication
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            All Sandbox requests must include your issued Sandbox API key (<code className="font-mono text-emerald-600 dark:text-emerald-400">rg_test_...</code>) in the <code className="font-mono text-emerald-600 dark:text-emerald-400">x-api-key</code> HTTP request header.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 space-y-1">
            <div>Staging / Sandbox Base URL: https://staging-api.routeguide.in/api/connectivity/v1</div>
            <div>Local Development Base URL: http://localhost:3000/api/connectivity/v1</div>
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            2. Available Test Property Details (<code className="font-mono text-teal-600 dark:text-teal-400">TEST-PROP-001</code>)
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            The Sandbox environment provisions a standard resort instance for every partner with fixed room types and rate plans for deterministic testing:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-sans uppercase">
                  <th className="p-2.5">Room Code</th>
                  <th className="p-2.5">Room Name</th>
                  <th className="p-2.5">Max Occupancy</th>
                  <th className="p-2.5">Base Rate Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">DELUXE</td>
                  <td className="p-2.5 text-slate-900 dark:text-white font-sans">Deluxe Ocean Room</td>
                  <td className="p-2.5">2 Adults, 1 Child</td>
                  <td className="p-2.5 text-teal-600 dark:text-teal-400">BAR_EP (Room Only)</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">SUITE</td>
                  <td className="p-2.5 text-slate-900 dark:text-white font-sans">Executive Luxury Suite</td>
                  <td className="p-2.5">4 Adults, 2 Children</td>
                  <td className="p-2.5 text-teal-600 dark:text-teal-400">BAR_MAP (Breakfast & Dinner)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            3. Deterministic Sandbox Reset (`POST /sandbox/reset`)
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            During integration testing, partners can execute a reset call to restore <code className="font-mono text-teal-600 dark:text-teal-400">TEST-PROP-001</code> to its initial baseline state. This wipes test bookings, resets room availability caps to 10 rooms/day, and clears test rate overrides.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-800">
            POST /api/connectivity/v1/sandbox/reset HTTP/1.1
            <br />
            Host: staging-api.routeguide.in
            <br />
            x-api-key: rg_test_your_sandbox_key
          </div>
        </section>
      </div>
    </div>
  );
}
