import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Key,
  Cpu,
  Zap,
  Lock,
  RefreshCw,
  Copy,
  Check,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  Building2,
  Download,
  FileText,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MilestoneDetail {
  key: string;
  number: number;
  title: string;
  endpoint: string;
  passCondition: string;
  instructions: string;
}

const MILESTONES_DEFINITIONS: MilestoneDetail[] = [
  {
    key: 'sandboxConnection',
    number: 1,
    title: 'Sandbox Connection Setup',
    endpoint: 'POST /api/connectivity/v1/connections',
    passCondition: 'Valid ConnectivityPartnerConnection exists for partner and property TEST-PROP-001.',
    instructions: 'Connect your external property to TEST-PROP-001 by initializing a property connection.',
  },
  {
    key: 'roomTypeMapping',
    number: 2,
    title: 'RoomType Mapping Configuration',
    endpoint: 'POST /api/connectivity/v1/connections/TEST-PROP-001/mappings/room-types',
    passCondition: 'At least 1 external room code mapped to a RouteGuide RoomType on TEST-PROP-001.',
    instructions: 'Map your external room codes (e.g. DELUXE) to RouteGuide RoomType UUIDs.',
  },
  {
    key: 'ratesAndRestrictions',
    number: 3,
    title: 'Rates & Restrictions Push/Query',
    endpoint: 'PUT /api/connectivity/v1/rates & PUT /api/connectivity/v1/restrictions',
    passCondition: 'At least 1 successful rate sync (PUT/GET /rates) AND restriction sync (PUT/GET /restrictions).',
    instructions: 'Push date-range rates and restrictions (Min Stay, CTA, CTD) to TEST-PROP-001.',
  },
  {
    key: 'reservationLifecycle',
    number: 4,
    title: 'Full Reservation Lifecycle',
    endpoint: 'POST /reservations, GET, PUT, POST /cancel',
    passCondition: 'Ingest (POST), read (GET), modify (PUT), and cancel (POST /cancel) a reservation on TEST-PROP-001.',
    instructions: 'Execute full lifecycle of a booking from ingestion to cancellation.',
  },
  {
    key: 'idempotency',
    number: 5,
    title: 'Reservation Ingestion Idempotency',
    endpoint: 'POST /api/connectivity/v1/reservations (Duplicate payload)',
    passCondition: 'Send duplicate reservation requests with identical externalReservationId cleanly mapped without duplicate bookings.',
    instructions: 'Re-send an identical reservation payload to demonstrate idempotent handling.',
  },
  {
    key: 'webhookAndHmac',
    number: 6,
    title: 'Outbound Webhook Delivery & HMAC Verification',
    endpoint: 'POST /api/connectivity/v1/sandbox/test-webhook',
    passCondition: 'Outbound test webhook POST delivered with HTTP 200 OK and payload response containing signatureVerified: true or received: true.',
    instructions: 'Receive an outbound test webhook and return HTTP 200 with signature verification acknowledgment.',
  },
];

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active scroll-spy section state
  const [activeSection, setActiveSection] = useState('overview');

  // New Credential Modal State
  const [newKeyData, setNewKeyData] = useState<{ plainApiKey: string; environment: string } | null>(null);
  const [newKeyLoading, setNewKeyLoading] = useState(false);

  // Webhook Update State
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookSecretDisplay, setWebhookSecretDisplay] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  // Certification Audit State
  const [certChecklist, setCertChecklist] = useState<any>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Sandbox Tester State
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiTesting, setApiTesting] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem('developer_token');
    if (!token) {
      navigate('/developers/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('developer_token');
          navigate('/developers/login');
          return;
        }
        throw new Error('Failed to load profile.');
      }

      const data = await res.json();
      setProfile(data.partner);
      setWebhookUrlInput(data.partner.webhookUrl || '');
    } catch (err: any) {
      toast.error(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificationStatus = async () => {
    const token = localStorage.getItem('developer_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.partner?.certificationDetails) {
          setCertChecklist(data.partner.certificationDetails);
        }
      }
    } catch {
      // Ignore background refresh errors
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCertificationStatus();
  }, []);

  // Scroll Spy Observer logic
  useEffect(() => {
    const sections = ['overview', 'credentials', 'webhooks', 'sandbox', 'certification', 'production'];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('developer_token');
    localStorage.removeItem('developer_partner');
    toast.success('Signed out');
    navigate('/developers/login');
  };

  const handleGenerateCredential = async (environment: 'SANDBOX' | 'PRODUCTION') => {
    const token = localStorage.getItem('developer_token');
    setNewKeyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ environment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to issue credential.');
      }

      setNewKeyData({
        plainApiKey: data.plainApiKey,
        environment,
      });
      toast.success(`${environment} API Key generated!`);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Error generating credential.');
    } finally {
      setNewKeyLoading(false);
    }
  };

  const handleUpdateWebhook = async (rotateSecret = false) => {
    const token = localStorage.getItem('developer_token');
    setWebhookLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/webhook-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          webhookUrl: webhookUrlInput,
          rotateSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update webhook config.');
      }

      if (data.rotatedWebhookSecret) {
        setWebhookSecretDisplay(data.rotatedWebhookSecret);
        toast.success('HMAC Secret rotated! Save it immediately.');
      } else {
        toast.success('Webhook URL updated!');
      }
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Error updating webhook.');
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleRunCertification = async () => {
    const token = localStorage.getItem('developer_token');
    setCertLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/certification/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Certification audit failed.');
      }

      setCertChecklist(data.checklist);
      if (data.certificationStatus === 'PASSED') {
        toast.success('🎉 CERTIFICATION PASSED! Production credentials unlocked.');
      } else {
        toast.error('Certification incomplete. Check failing milestones below.');
      }
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Error running certification.');
    } finally {
      setCertLoading(false);
    }
  };

  const handleDownloadPostmanCollection = async () => {
    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/postman/collection`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RouteGuide_V1_Sandbox.postman_collection.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Postman Collection downloaded!');
    } catch {
      toast.error('Failed to download Postman collection.');
    }
  };

  const handleDownloadPostmanEnvironment = () => {
    const token = localStorage.getItem('developer_token');
    if (!token) return;

    fetch(`${API_URL}/api/connectivity/v1/developer/postman/environment`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((envData) => {
        const blob = new Blob([JSON.stringify(envData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'RouteGuide_V1_Sandbox.postman_environment.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Postman Environment template downloaded!');
      })
      .catch(() => toast.error('Failed to download environment template.'));
  };

  const handleTestApi = async (endpoint: string, method = 'GET') => {
    const activeSandboxKey = profile?.credentials?.find(
      (c: any) => c.environment === 'SANDBOX' && c.status === 'ACTIVE'
    )?.keyPrefix;

    setApiTesting(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'x-api-key': activeSandboxKey ? `${activeSandboxKey}...` : 'rg_test_sample',
        },
      });
      const data = await res.json();
      setApiResult({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setApiResult({ status: 'ERROR', ok: false, data: { message: err.message } });
    } finally {
      setApiTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isCertified = profile.certificationStatus === 'PASSED';
  const sandboxCredentials = profile.credentials?.filter((c: any) => c.environment === 'SANDBOX') || [];
  const productionCredentials = profile.credentials?.filter((c: any) => c.environment === 'PRODUCTION') || [];

  // Calculate milestone pass count
  const passedMilestoneCount = MILESTONES_DEFINITIONS.filter((m) => {
    if (!certChecklist) return false;
    const item = certChecklist[m.key];
    return item && item.status === 'PASSED';
  }).length;

  return (
    <div className="space-y-10 py-4 font-sans">
      {/* Top Profile Header Banner */}
      <div id="overview" className="p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 scroll-mt-24">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="System-generated RouteGuide Partner Code">
              Partner Code: {profile.code}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
              {profile.type}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">Contact Email: {profile.contactEmail}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Certification Status</span>
            <span
              className={`text-xs font-extrabold ${
                isCertified ? 'text-emerald-400' : profile.certificationStatus === 'FAILED' ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {profile.certificationStatus}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Sticky Dashboard Operational Sub-Navigation Bar with Scroll-Spy */}
      <div className="sticky top-20 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-md text-xs font-semibold">
        {[
          { id: 'overview', label: 'Partner Profile', icon: Building2, color: 'text-emerald-500' },
          { id: 'credentials', label: 'API Credentials', icon: Key, color: 'text-emerald-500' },
          { id: 'webhooks', label: 'Webhooks & HMAC', icon: Zap, color: 'text-indigo-500' },
          { id: 'sandbox', label: 'Sandbox Console', icon: Cpu, color: 'text-teal-500' },
          { id: 'certification', label: 'Self-Certification', icon: ShieldCheck, color: 'text-emerald-500' },
          { id: 'production', label: 'Production Gate', icon: Lock, color: 'text-purple-500' },
        ].map((nav) => {
          const isActive = activeSection === nav.id;
          return (
            <a
              key={nav.id}
              href={`#${nav.id}`}
              onClick={() => setActiveSection(nav.id)}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <nav.icon className={`w-3.5 h-3.5 ${nav.color}`} />
              {nav.label}
            </a>
          );
        })}
      </div>

      {/* New Key Generated Output Box */}
      {newKeyData && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/50 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              New {newKeyData.environment} API Key Issued!
            </h3>
            <button onClick={() => setNewKeyData(null)} className="text-xs text-slate-400 hover:text-white">Close</button>
          </div>
          <p className="text-xs text-amber-400">Save this key now. It will not be shown again.</p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
            <span className="truncate flex-1">{newKeyData.plainApiKey}</span>
            <button onClick={() => copyToClipboard(newKeyData.plainApiKey, 'newKey')} className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white">
              {copiedKey === 'newKey' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-8">

          {/* PART 4: Sandbox Integration Tools & Postman Suite */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Download className="w-5 h-5 text-teal-400" />
                  Sandbox Integration Tools & Postman Suite
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Use the official RouteGuide V1 Sandbox Postman collection to test your PMS/Channel Manager integration against <code className="text-teal-300 font-mono">TEST-PROP-001</code>.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={handleDownloadPostmanCollection}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download Collection (.json)
                </button>

                <button
                  onClick={handleDownloadPostmanEnvironment}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400" /> Download Environment
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4" /> Security Notice
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Downloaded environment files contain sandbox configuration placeholders. Replace <code className="text-emerald-400 font-mono">rg_test_...</code> with your active Sandbox API Key. Copy your HMAC Secret from the Webhooks console into <code className="text-indigo-400 font-mono">webhookSecret</code> manually. Never commit API keys or secrets to public repositories.
              </p>
            </div>
          </div>

          {/* Sandbox API Keys Section */}
          <div id="credentials" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm scroll-mt-36">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Sandbox Credentials (<code className="text-emerald-600 dark:text-emerald-400 font-mono">rg_test_...</code>)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Isolated testing keys restricted strictly to <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>.</p>
              </div>

              <button
                onClick={() => handleGenerateCredential('SANDBOX')}
                disabled={newKeyLoading}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center gap-1.5 transition-all"
              >
                + New Sandbox Key
              </button>
            </div>

            <div className="space-y-2">
              {sandboxCredentials.map((c: any) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                    <span className="block text-emerald-600 dark:text-emerald-400">{c.keyPrefix}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                      {c.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook & HMAC Signature Console & Explanation */}
          <div id="webhooks" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm scroll-mt-36">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Outbound Webhook & HMAC Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive real-time signed event notifications.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Destination Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://webhook.yourpms.com/events"
                    className="flex-1 px-4 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleUpdateWebhook(false)}
                    disabled={webhookLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-xs font-bold text-white border border-slate-700 transition-colors"
                  >
                    Save URL
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">HMAC-SHA256 Secret</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Used by RouteGuide to sign <code className="text-emerald-600 dark:text-emerald-400">X-RouteGuide-Signature</code> headers.</span>
                </div>
                <button
                  onClick={() => handleUpdateWebhook(true)}
                  disabled={webhookLoading}
                  className="px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-all"
                >
                  Rotate HMAC Secret
                </button>
              </div>

              {webhookSecretDisplay && (
                <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-1 font-mono text-xs">
                  <span className="text-amber-400 font-sans text-[11px] block">New Secret Rotated (Save now, hidden on refresh):</span>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <span className="truncate flex-1">{webhookSecretDisplay}</span>
                    <button onClick={() => copyToClipboard(webhookSecretDisplay, 'whSec')} className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white">
                      {copiedKey === 'whSec' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PART 9: 7-Step Webhook Explanation Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                How Milestone 6 Webhook Verification Works:
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <li>Configure your publicly reachable HTTPS Webhook URL (or temporary receiver e.g. <code className="text-indigo-400">webhook.site</code>).</li>
                <li>Trigger a test webhook using <code className="text-emerald-500">POST /api/connectivity/v1/sandbox/test-webhook</code> or the Sandbox console.</li>
                <li>RouteGuide signs the JSON payload using HMAC-SHA256 and dispatches an HTTP POST request.</li>
                <li>Your endpoint receives the request containing <code className="text-indigo-400 font-mono">X-RouteGuide-Signature: t=timestamp,v1=hash</code>.</li>
                <li>Your server verifies the signature using your HMAC secret.</li>
                <li>Your endpoint MUST return HTTP 200 OK with JSON payload: <code className="text-emerald-500 font-mono font-bold">{`{"signatureVerified": true}`}</code> or <code className="text-emerald-500 font-mono font-bold">{`{"received": true}`}</code>.</li>
                <li>RouteGuide logs your 200 OK acknowledgment, automatically marking Milestone 6 as <span className="text-emerald-500 font-bold">PASSED</span>.</li>
              </ol>
            </div>
          </div>

          {/* PART 8: Quick Sandbox Diagnostics */}
          <div id="sandbox" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm scroll-mt-36">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Quick Sandbox Diagnostics (<code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quick diagnostic tools for rapid ping checks. For full end-to-end certification testing, download the Postman Collection suite above.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTestApi(`${API_URL}/api/connectivity/v1/ping`)}
                disabled={apiTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" /> GET /ping
              </button>
              <button
                onClick={() => handleTestApi(`${API_URL}/api/connectivity/v1/content?propertyId=TEST-PROP-001`)}
                disabled={apiTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-teal-400" /> GET /content (TEST-PROP-001)
              </button>
              <button
                onClick={() => handleTestApi(`${API_URL}/api/connectivity/v1/sandbox/reset`, 'POST')}
                disabled={apiTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${apiTesting ? 'animate-spin' : ''}`} /> POST /sandbox/reset
              </button>
            </div>

            {apiResult && (
              <pre className="p-4 rounded-xl bg-slate-900 text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto max-h-60">
                {JSON.stringify(apiResult, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-8">

          {/* PART 5 & 6: 6-Milestone Live Certification Checklist */}
          <div id="certification" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm scroll-mt-36">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Self-Certification Checklist
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block mt-0.5">
                  {passedMilestoneCount} / 6 Milestones Completed
                </span>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isCertified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                {profile.certificationStatus}
              </span>
            </div>

            {/* Overall Certification Status Callout Banner */}
            {isCertified ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> CERTIFICATION PASSED
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Production API access is now available. Issue live credentials below to distribute live property rates & inventory.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Self-Certification In Progress
                </div>
                <p className="text-[11px] leading-relaxed">
                  Complete all 6 milestones using Postman against <code className="font-mono text-teal-600 dark:text-teal-400">TEST-PROP-001</code>.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={fetchCertificationStatus}
                className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Status
              </button>

              <button
                onClick={handleRunCertification}
                disabled={certLoading}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                {certLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Audit
              </button>
            </div>

            {/* 6 Individual Milestone Cards */}
            <div className="space-y-3">
              {MILESTONES_DEFINITIONS.map((m) => {
                const item = certChecklist ? certChecklist[m.key] : null;
                const status = item?.status || 'NOT_STARTED';
                const isPassed = status === 'PASSED';
                const isFailed = status === 'FAILED';

                return (
                  <div
                    key={m.key}
                    className={`p-4 rounded-2xl border transition-all space-y-2 ${
                      isPassed
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : isFailed
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                          {m.number}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{m.title}</h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase ${
                          isPassed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : isFailed
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {m.instructions}
                    </p>

                    <div className="pt-1 text-[10px] font-mono text-slate-500 dark:text-slate-500 space-y-0.5">
                      <div><span className="font-sans font-semibold text-slate-700 dark:text-slate-400">Endpoint:</span> {m.endpoint}</div>
                      <div><span className="font-sans font-semibold text-slate-700 dark:text-slate-400">Condition:</span> {m.passCondition}</div>
                    </div>

                    {item?.details && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        {item.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Production Credential Security Gate */}
          <div id="production" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-purple-500/30 space-y-4 shadow-xl scroll-mt-36">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Production Access Gate</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live property keys (<code className="text-purple-600 dark:text-purple-400 font-mono">rg_live_...</code>)</p>
              </div>
            </div>

            {!isCertified ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <AlertCircle className="w-4 h-4" /> Locked
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  Production API key issuance is strictly guarded. You must complete all 6 self-certification milestones on <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code> to achieve <span className="text-emerald-600 dark:text-emerald-400 font-bold">PASSED</span> status before unlocking live property distribution.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Certification PASSED! Production Unlocked.
                </div>

                <button
                  onClick={() => handleGenerateCredential('PRODUCTION')}
                  disabled={newKeyLoading}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Issue Production Key (rg_live_...)
                </button>

                <div className="space-y-2">
                  {productionCredentials.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">{c.keyPrefix}...</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
