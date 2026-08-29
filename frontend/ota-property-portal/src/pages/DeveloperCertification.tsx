import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, ArrowRight, Lock, Terminal, Cpu, Zap, Key } from 'lucide-react';

export default function DeveloperCertification() {
  const isLoggedIn = !!localStorage.getItem('developer_token');

  const staticMilestones = [
    {
      step: '01',
      title: '1. Sandbox Connection Setup',
      key: 'sandboxConnection',
      details: 'Connect partner account to test resort TEST-PROP-001 and perform initial HTTP GET /ping or GET /content request with valid x-api-key.',
      criteria: 'At least 1 successful HTTP 200 GET call recorded against TEST-PROP-001.',
    },
    {
      step: '02',
      title: '2. RoomType & RatePlan Mapping Configuration',
      key: 'roomTypeMapping',
      details: 'Map external PMS room code (e.g. DELUXE, SUITE) and rate plan code (e.g. BAR_EP) to RouteGuide internal entity IDs.',
      criteria: 'Valid active mapping record present in connectivity matrix for TEST-PROP-001.',
    },
    {
      step: '03',
      title: '3. Rates & Restrictions Push / Query',
      key: 'ratesAndRestrictions',
      details: 'Execute PUT/PATCH rate plan updates or restriction updates (MinLOS, ClosedToArrival, StopSell) for TEST-PROP-001.',
      criteria: 'At least 1 rate update and 1 restriction update successfully processed.',
    },
    {
      step: '04',
      title: '4. Full Reservation Lifecycle (4 APIs)',
      key: 'reservationLifecycle',
      details: 'Execute complete booking lifecycle on TEST-PROP-001: Create reservation (POST), Retrieve (GET), Modify (PUT), and Cancel (POST /cancel).',
      criteria: 'Successful creation, retrieval, modification, and cancellation of a test reservation.',
    },
    {
      step: '05',
      title: '5. Reservation Ingestion Idempotency',
      key: 'idempotency',
      details: 'Re-send identical reservation payload with duplicate externalReservationId / idempotency-key within short window.',
      criteria: 'Second duplicate request returns HTTP 200/209 with duplicateDetected: true without creating double booking.',
    },
    {
      step: '06',
      title: '6. Webhook Delivery & HMAC Verification',
      key: 'webhookAndHmac',
      details: 'Configure valid HTTPS destination webhook URL, receive RouteGuide signed PING webhook event, and verify X-RouteGuide-Signature header.',
      criteria: 'Outbound webhook request delivered with HTTP 200/204 response from partner receiver.',
    },
  ];

  return (
    <div className="space-y-12 py-4 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> Automated Security Gate
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Partner Self-Certification Guide
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-3xl leading-relaxed">
          Self-Certification is RouteGuide’s automated quality assurance process. Completing all 6 milestones on <code className="font-mono text-teal-600 dark:text-teal-400">TEST-PROP-001</code> verifies that your PMS or Channel Manager integration handles inventory sync, bookings, idempotency, and HMAC webhooks securely before unlocking Production access.
        </p>
      </div>

      {/* Action CTA Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> Ready to Run Certification Audit?
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isLoggedIn
              ? 'Access the Self-Certification Auditor inside your Developer Dashboard to run instant automated evaluation against your active Sandbox activity.'
              : 'Sign in to your Developer Dashboard to evaluate your 6 integration milestones and unlock live Production credentials.'}
          </p>
        </div>

        {isLoggedIn ? (
          <Link
            to="/developers/dashboard#certification"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0 flex items-center gap-2"
          >
            Go to Certification Auditor
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> Automated Audit
          </div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">Zero Manual Waiting</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            RouteGuide automatically records API traffic, idempotency checks, and webhook receipts in real time.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> 6 Core Milestones
          </div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">100% Pass Threshold</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All 6 milestones must evaluate to PASSED status to qualify for Production credential issuance.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-purple-500/30 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" /> Security Gate Rule
          </div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">Strict Security Gate</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Attempting to issue production keys (<code className="font-mono text-purple-600 dark:text-purple-400">rg_live_...</code>) before passing certification returns HTTP 403 Forbidden.
          </p>
        </div>
      </div>

      {/* 6 Milestone Specifications Grid */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            The Six Certification Milestones
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Detailed requirements for each milestone evaluated by the RouteGuide automated auditor:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staticMilestones.map((m) => (
            <div key={m.key} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  MILESTONE {m.step}
                </span>
                <span className="text-[11px] font-bold text-slate-400 font-mono">Status: Evaluated on Audit</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{m.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{m.details}</p>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Pass Criteria:</span>
                <span className="text-slate-500 dark:text-slate-400">{m.criteria}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
