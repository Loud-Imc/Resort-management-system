import { Key, ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeveloperProductionDocs() {
  const isLoggedIn = !!localStorage.getItem('developer_token');

  return (
    <div className="space-y-12 py-4">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
          <Key className="w-3.5 h-3.5" /> Production Credential Security Gate
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Production Access & Security Gate Guide</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Production API credentials (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>) allow live hotel property distribution and are issued strictly after completing automated self-certification.
        </p>
      </div>

      {/* Action CTA Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
            <Lock className="w-4 h-4" /> Ready for Live Production Key Issuance?
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isLoggedIn
              ? 'Check your partner certification status and issue live production keys (rg_live_...) inside your Developer Dashboard once certified.'
              : 'Complete your 6 self-certification milestones on TEST-PROP-001 to unlock live Production credentials.'}
          </p>
        </div>

        {isLoggedIn ? (
          <Link
            to="/developers/dashboard#production"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all shrink-0 flex items-center gap-2"
          >
            Go to Production Gate
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

      {/* Security Gate Enforcement Box */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-purple-500/30 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Strict Security Rule: <code className="text-purple-600 dark:text-purple-400 font-mono">certificationStatus === PASSED</code></h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated backend security gate enforced on credential issuance APIs.</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Oreedu enforces an automated security gate: attempting to issue or request a Production API key (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>) before achieving <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PASSED</span> certification status returns <code className="text-rose-600 dark:text-rose-400 font-mono">HTTP 403 Forbidden</code>.
        </p>

        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 shadow-sm">
          POST /api/connectivity/v1/partners/:id/credentials
          <br />
          Payload: {"{ \"environment\": \"PRODUCTION\" }"}
          <br />
          Result: Evaluates partner.certificationStatus ➔ If != PASSED ➔ Throws HTTP 403 Forbidden
        </div>
      </div>

      {/* Environment Transition Matrix */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sandbox vs Production Comparison</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-3">Parameter</th>
                <th className="p-3">Sandbox Testing</th>
                <th className="p-3">Live Production</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              <tr>
                <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">API Key Format</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">rg_test_&lt;hex&gt;</td>
                <td className="p-3 text-purple-600 dark:text-purple-400">rg_live_&lt;hex&gt;</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Base URL</td>
                <td className="p-3">/api/connectivity/v1</td>
                <td className="p-3 text-slate-900 dark:text-white">https://api.oreedu.com/api</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Target Property ID</td>
                <td className="p-3 text-teal-600 dark:text-teal-400">TEST-PROP-001</td>
                <td className="p-3 text-slate-900 dark:text-white">Live Hotel Property UUIDs</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Side-Effect Risk</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Zero Side-Effects</td>
                <td className="p-3 text-amber-600 dark:text-amber-400">Real Hotel Bookings & Inventory</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Safety Checklist */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Production Go-Live Safety Checklist
        </h2>

        <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Passed all 6 self-certification milestones on <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>.</span>
          </li>
          <li className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Implemented HMAC-SHA256 signature verification for outbound webhooks.</span>
          </li>
          <li className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Implemented exponential backoff retries for HTTP 429 and rate-limiting responses.</span>
          </li>
          <li className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Stored Production API key (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>) securely in server environment variables.</span>
          </li>
        </ul>

        <div className="pt-4 flex items-center gap-4">
          <Link
            to="/developers/certification"
            className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all inline-flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Start Self-Certification Console
          </Link>
        </div>
      </div>
    </div>
  );
}
