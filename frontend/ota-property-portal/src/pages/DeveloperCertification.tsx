import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

interface Milestone {
  key: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'NOT_STARTED';
  details: string;
}

interface Checklist {
  sandboxConnection: Milestone;
  roomTypeMapping: Milestone;
  ratesAndRestrictions: Milestone;
  reservationLifecycle: Milestone;
  idempotency: Milestone;
  webhookAndHmac: Milestone;
}

export default function DeveloperCertification() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [certificationStatus, setCertificationStatus] = useState<string>('NOT_STARTED');
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState<string>('');
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  const getHeaders = () => {
    const key = customKey.trim() || localStorage.getItem('ota_partner_api_key') || '';
    return {
      'Content-Type': 'application/json',
      'x-api-key': key,
    };
  };

  const fetchStatus = async () => {
    const key = customKey.trim() || localStorage.getItem('ota_partner_api_key');
    if (!key) return;

    setLoading(true);
    try {
      const res = await fetch('/api/connectivity/v1/sandbox/certification/status', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCertificationStatus(data.certificationStatus || 'NOT_STARTED');
        setCertifiedAt(data.certifiedAt || null);
        setPartnerCode(data.partnerCode || '');
        setChecklist(data.checklist || null);
      }
    } catch (e) {
      console.error('Error fetching certification status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('ota_partner_api_key')) {
      fetchStatus();
    }
  }, []);

  const handleVerify = async () => {
    const key = customKey.trim() || localStorage.getItem('ota_partner_api_key');
    if (!key) {
      toast.error('Please enter your Sandbox API Key (rg_test_...) to evaluate certification.');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/connectivity/v1/sandbox/certification/verify', {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setCertificationStatus(data.certificationStatus);
        setCertifiedAt(data.certifiedAt);
        setChecklist(data.checklist);
        if (data.certificationStatus === 'PASSED') {
          toast.success('🎉 Partner Certification PASSED! Production credential access authorized.');
        } else {
          toast.error('Certification evaluation failed. Please review missing milestones.');
        }
      } else {
        toast.error(data.message || 'Certification verification failed');
      }
    } catch (e: any) {
      toast.error('Network error during verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = async () => {
    const key = customKey.trim() || localStorage.getItem('ota_partner_api_key');
    if (!key) {
      toast.error('Please enter your Sandbox API Key (rg_test_...) to reset sandbox data.');
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/connectivity/v1/sandbox/reset', {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        toast.success('Sandbox test data reset cleanly on TEST-PROP-001');
        await fetchStatus();
      } else {
        toast.error('Failed to reset sandbox data');
      }
    } catch (e) {
      toast.error('Error resetting sandbox');
    } finally {
      setResetting(false);
    }
  };

  const milestonesList: Milestone[] = checklist
    ? Object.values(checklist)
    : [
        { key: 'sandboxConnection', title: '1. Sandbox Connection Setup', status: 'NOT_STARTED', details: 'Connect partner to TEST-PROP-001' },
        { key: 'roomTypeMapping', title: '2. RoomType Mapping Configuration', status: 'NOT_STARTED', details: 'Map external room code to RouteGuide RoomType' },
        { key: 'ratesAndRestrictions', title: '3. Rates & Restrictions Push/Query', status: 'NOT_STARTED', details: 'Execute PUT/GET rates and restrictions' },
        { key: 'reservationLifecycle', title: '4. Full Reservation Lifecycle', status: 'NOT_STARTED', details: 'Create, Read, Modify, and Cancel test booking' },
        { key: 'idempotency', title: '5. Reservation Ingestion Idempotency', status: 'NOT_STARTED', details: 'Re-send duplicate reservation request' },
        { key: 'webhookAndHmac', title: '6. Webhook Delivery & HMAC Verification', status: 'NOT_STARTED', details: 'Receive PING webhook and return signatureVerified: true' },
      ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> PASSED — CERTIFIED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> FAILED — INCOMPLETE
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> IN PROGRESS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Clock className="w-3.5 h-3.5" /> NOT STARTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Partner Self-Certification Console</h1>
            {getStatusBadge(certificationStatus)}
            {partnerCode && (
              <span className="px-2 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Partner: {partnerCode}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Complete the 6-milestone integration checklist on Sandbox property <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-emerald-600 dark:text-emerald-400">TEST-PROP-001</code> to unlock Production credentials.
            {certifiedAt && <span className="ml-2 text-emerald-500 font-medium">(Certified on {new Date(certifiedAt).toLocaleDateString()})</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            Reset Sandbox
          </button>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {verifying ? 'Evaluating...' : 'Verify Certification'}
          </button>
        </div>
      </div>

      {/* Optional API Key Input for Unauthenticated Visitors */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-500" /> Enter Partner Sandbox API Key (<code className="text-emerald-500 font-mono">x-api-key</code>)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="e.g. rg_test_1234567890abcdef12345678"
            className="flex-1 px-4 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Check Checklist Status
          </button>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Six-Milestone Certification Checklist</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            RouteGuide automatically observes API calls, mappings, and webhook signatures recorded for your partner account.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading certification checklist...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {milestonesList.map((m) => (
              <div
                key={m.key}
                className={`p-4 rounded-xl border transition-all ${
                  m.status === 'PASSED'
                    ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : m.status === 'FAILED'
                    ? 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{m.title}</h3>
                  {m.status === 'PASSED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : m.status === 'FAILED' ? (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
