import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, RefreshCw, UserCheck, Key, Globe, Zap, Settings2,
  Plus, X, ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check,
  AlertCircle, CheckCircle2, XCircle, Clock, Cpu, PlugZap
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Credential {
  id: string;
  name: string;
  keyPrefix: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
}

interface Partner {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  certificationStatus: 'PASSED' | 'FAILED' | 'IN_PROGRESS' | 'NOT_STARTED';
  certifiedAt: string | null;
  webhookUrl: string | null;
  contactEmail: string;
  contactPhone?: string;
  createdAt: string;
  credentials?: Credential[];
}

interface GlobalSettings {
  reservationsEnabled: boolean;
  ratesEnabled: boolean;
  availabilityEnabled: boolean;
  webhooksEnabled: boolean;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function CertBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PASSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    FAILED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    NOT_STARTED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${map[status] ?? map.NOT_STARTED}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    SUSPENDED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    DEACTIVATED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${map[status] ?? map.DEACTIVATED}`}>
      {status}
    </span>
  );
}

function EnvBadge({ env }: { env: string }) {
  return env === 'PRODUCTION'
    ? <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">LIVE</span>
    : <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">SANDBOX</span>;
}

// ─── Partner Detail Drawer ─────────────────────────────────────────────────────

function PartnerDrawer({
  partner,
  onClose,
  onStatusChange,
  onCredentialRevoke,
  onCredentialIssue,
}: {
  partner: Partner;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onCredentialRevoke: (partnerId: string, credId: string) => void;
  onCredentialIssue: (partnerId: string, env: 'SANDBOX' | 'PRODUCTION') => void;
}) {
  const [showWebhook, setShowWebhook] = useState(false);
  const [newKey, setNewKey] = useState<{ plainApiKey: string; environment: string } | null>(null);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleIssue = async (env: 'SANDBOX' | 'PRODUCTION') => {
    setIssuing(env);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners/${partner.id}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ environment: env }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNewKey({ plainApiKey: data.plainApiKey, environment: env });
      toast.success(`${env} key issued!`);
      onCredentialIssue(partner.id, env);
    } catch (e: any) {
      toast.error(e.message || 'Failed to issue credential');
    } finally {
      setIssuing(null);
    }
  };

  const handleRevoke = async (credId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners/${partner.id}/credentials/${credId}/revoke`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke');
      toast.success('Credential revoked');
      onCredentialRevoke(partner.id, credId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke');
    }
  };

  const statusOptions = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].filter(s => s !== partner.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{partner.name}</h2>
              <StatusBadge status={partner.status} />
              <CertBadge status={partner.certificationStatus} />
            </div>
            <p className="text-xs text-slate-500 font-mono">{partner.code} · {partner.type}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* Contact Info */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contact</p>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">✉</span> {partner.contactEmail}
            </div>
            {partner.contactPhone && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">📞</span> {partner.contactPhone}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">📅</span> Registered {new Date(partner.createdAt).toLocaleDateString()}
            </div>
            {partner.webhookUrl && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                <button onClick={() => setShowWebhook(!showWebhook)} className="text-indigo-500 shrink-0">
                  {showWebhook ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {showWebhook ? partner.webhookUrl : '••••••••••••••••••'}
              </div>
            )}
          </div>

          {/* Status Management */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(partner.id, s)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    s === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700'
                      : s === 'SUSPENDED'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  Set {s}
                </button>
              ))}
            </div>
          </div>

          {/* New Key Alert */}
          {newKey && (
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/50 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-400">🎉 New {newKey.environment} API Key — Save now, shown once!</p>
                <button onClick={() => setNewKey(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-300 border border-slate-800">
                <span className="truncate flex-1">{newKey.plainApiKey}</span>
                <button onClick={() => copy(newKey.plainApiKey, 'newKey')} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
                  {copied === 'newKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* API Credentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">API Credentials</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleIssue('SANDBOX')}
                  disabled={!!issuing}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> Sandbox
                </button>
                {partner.certificationStatus === 'PASSED' && (
                  <button
                    onClick={() => handleIssue('PRODUCTION')}
                    disabled={!!issuing}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Production
                  </button>
                )}
              </div>
            </div>

            {(!partner.credentials || partner.credentials.length === 0) ? (
              <p className="text-xs text-slate-400 italic p-3">No credentials issued yet.</p>
            ) : (
              <div className="space-y-2">
                {partner.credentials.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.keyPrefix}...</span>
                        <EnvBadge env={c.environment} />
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 line-through'}`}>
                          {c.status}
                        </span>
                      </div>
                      <span className="text-slate-400">{c.name} · {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    {c.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Partners Tab ──────────────────────────────────────────────────────────────

function PartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPartners(data || []);
      }
    } catch {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Partner status set to ${status}`);
      await load();
      if (selected?.id === id) {
        const updated = await fetch(`${API_URL}/api/admin/connectivity/partners/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (updated.ok) setSelected(await updated.json());
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCredentialRevoke = () => load();
  const handleCredentialIssue = () => load();

  const sorted = [...partners]
    .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.code.toLowerCase().includes(filter.toLowerCase()) || p.contactEmail.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const av = sortField === 'name' ? a.name : a.createdAt;
      const bv = sortField === 'name' ? b.name : b.createdAt;
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggle = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />)
      : null;

  // Stats
  const total = partners.length;
  const active = partners.filter(p => p.status === 'ACTIVE').length;
  const certified = partners.filter(p => p.certificationStatus === 'PASSED').length;
  const suspended = partners.filter(p => p.status === 'SUSPENDED').length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Partners', value: total, color: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' },
          { label: 'Active', value: active, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
          { label: 'Certified', value: certified, color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
          { label: 'Suspended', value: suspended, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-2xl border ${s.bg}`}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, code, or email..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="p-4 cursor-pointer select-none" onClick={() => toggle('name')}>
                Partner <SortIcon field="name" />
              </th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">Certification</th>
              <th className="p-4">Contact</th>
              <th className="p-4 cursor-pointer select-none" onClick={() => toggle('createdAt')}>
                Registered <SortIcon field="createdAt" />
              </th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-slate-400">Loading partners...</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-slate-400">
                {filter ? `No partners match "${filter}"` : 'No external PMS/CM partners registered yet.'}
              </td></tr>
            ) : (
              sorted.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{p.code}</p>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{p.type.replace('_', ' ')}</td>
                  <td className="p-4"><StatusBadge status={p.status} /></td>
                  <td className="p-4"><CertBadge status={p.certificationStatus} /></td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{p.contactEmail}</td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelected(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <PartnerDrawer
          partner={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onCredentialRevoke={handleCredentialRevoke}
          onCredentialIssue={handleCredentialIssue}
        />
      )}
    </>
  );
}

// ─── Certification Tab ─────────────────────────────────────────────────────────

function CertificationTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [webhookTarget, setWebhookTarget] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPartners((await res.json()) || []);
    } catch {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOverride = async () => {
    if (!selected) return;
    if (!overrideReason.trim()) { toast.error('Override reason is required.'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/partners/${selected.id}/certification/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: overrideStatus, reason: overrideReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Certification set to ${overrideStatus}`);
      setSelected(null);
      setOverrideReason('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Override failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookTarget) { toast.error('Select a partner first.'); return; }
    setWebhookLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/sandbox/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partnerId: webhookTarget }),
      });
      const data = await res.json();
      if (res.ok) toast.success('Webhook PING dispatched successfully.');
      else toast.error(data.message || 'Webhook test failed');
    } catch {
      toast.error('Network error');
    } finally {
      setWebhookLoading(false);
    }
  };

  const CertIcon = ({ status }: { status: string }) => {
    if (status === 'PASSED') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'FAILED') return <XCircle className="w-5 h-5 text-rose-500" />;
    if (status === 'IN_PROGRESS') return <Clock className="w-5 h-5 text-amber-500" />;
    return <AlertCircle className="w-5 h-5 text-slate-400" />;
  };

  return (
    <>
      {/* Webhook Test Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" /> Admin Webhook Test Trigger
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch a signed PING webhook to a partner to test endpoint reachability and HMAC verification.</p>
        <div className="flex gap-3">
          <select
            value={webhookTarget}
            onChange={e => setWebhookTarget(e.target.value)}
            className="flex-1 px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          >
            <option value="">— Select Partner —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>
          <button
            onClick={handleTestWebhook}
            disabled={webhookLoading || !webhookTarget}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" /> {webhookLoading ? 'Sending...' : 'Send PING'}
          </button>
        </div>
      </div>

      {/* Certification Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Partner Certification Status
          </h2>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="p-4">Partner Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Type</th>
              <th className="p-4">Certification</th>
              <th className="p-4">Certified At</th>
              <th className="p-4 text-right">SuperAdmin Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center text-slate-400">Loading...</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-slate-400">No partners registered.</td></tr>
            ) : (
              partners.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-mono font-medium text-slate-900 dark:text-slate-200 text-xs">{p.code}</td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{p.type.replace('_', ' ')}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <CertIcon status={p.certificationStatus} />
                      <CertBadge status={p.certificationStatus} />
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                    {p.certifiedAt ? new Date(p.certifiedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => { setSelected(p); setOverrideStatus(p.certificationStatus === 'PASSED' ? 'FAILED' : 'PASSED'); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Override
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30"><ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">SuperAdmin Certification Override</h3>
                <p className="text-xs text-slate-500">{selected.name} · {selected.code}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Status</label>
                <select
                  value={overrideStatus}
                  onChange={e => setOverrideStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PASSED">PASSED — Grant Production Key Access</option>
                  <option value="FAILED">FAILED — Revoke/Deny Production Key Access</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mandatory Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="State the technical or business rationale..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => { setSelected(null); setOverrideReason(''); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
              <button
                onClick={handleOverride}
                disabled={submitting}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Apply Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSettings(await res.json());
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (key: keyof GlobalSettings) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/connectivity/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${key} ${updated[key] ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to save settings');
      setSettings(settings); // revert
    } finally {
      setSaving(false);
    }
  };

  const switches: { key: keyof GlobalSettings; label: string; description: string; icon: any; color: string }[] = [
    { key: 'reservationsEnabled', label: 'Reservation Ingestion', description: 'Allow external PMS/CM to push new reservation bookings into Oreedu.', icon: Cpu, color: 'emerald' },
    { key: 'ratesEnabled', label: 'Rates & Restrictions Push', description: 'Allow partners to update room rates, rate plans, and booking restrictions.', icon: Globe, color: 'indigo' },
    { key: 'availabilityEnabled', label: 'Availability Pull', description: 'Allow partners to query live room availability from Oreedu properties.', icon: PlugZap, color: 'teal' },
    { key: 'webhooksEnabled', label: 'Outbound Webhooks', description: 'Allow Oreedu to dispatch signed event notifications to partner webhook endpoints.', icon: Zap, color: 'purple' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>These are <strong>global platform-wide capability switches</strong>. Disabling any toggle will immediately block the corresponding action for ALL connectivity partners, regardless of their individual certification status.</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading platform settings...</div>
      ) : !settings ? (
        <div className="py-16 text-center text-slate-400">Could not load settings.</div>
      ) : (
        <div className="space-y-3">
          {switches.map(sw => {
            const Icon = sw.icon;
            const enabled = settings[sw.key];
            return (
              <div key={sw.key} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colorMap[sw.color]}/10 text-${sw.color}-600 dark:text-${sw.color}-400`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{sw.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{sw.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(sw.key)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'partners' | 'certification' | 'settings';

export default function ConnectivityPartnersAdmin() {
  const [tab, setTab] = useState<Tab>('partners');

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'partners', label: 'PMS / CM Partners', icon: Globe },
    { id: 'certification', label: 'Certification', icon: ShieldCheck },
    { id: 'settings', label: 'Platform Settings', icon: Settings2 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Connectivity Partners
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-9">
            Manage external PMS / Channel Manager integrations, API credentials, certification, and global platform switches.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-5">
        {tab === 'partners' && <PartnersTab />}
        {tab === 'certification' && <CertificationTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
