import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface Partner {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  certificationStatus: 'PASSED' | 'FAILED' | 'IN_PROGRESS' | 'NOT_STARTED';
  certifiedAt: string | null;
  webhookUrl: string | null;
}

export default function PartnerCertificationAdmin() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/connectivity/partners', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPartners(data || []);
      }
    } catch (e) {
      console.error('Failed to load connectivity partners:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!selectedPartner) return;
    if (!overrideReason || overrideReason.trim().length === 0) {
      toast.error('SuperAdmin override reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/connectivity/partners/${selectedPartner.id}/certification/override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: overrideStatus,
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Partner certification updated to ${overrideStatus}`);
        setIsOverrideModalOpen(false);
        setOverrideReason('');
        await loadPartners();
      } else {
        toast.error(data.message || 'Failed to update certification override');
      }
    } catch (e) {
      toast.error('Network error during override submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">PASSED</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">FAILED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">IN PROGRESS</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">NOT STARTED</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            OTA Connectivity Partner Certification Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor partner sandbox self-certification milestones and enforce Production credential security gates.
          </p>
        </div>
        <button
          onClick={loadPartners}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="p-4">Partner Code</th>
              <th className="p-4">Partner Name</th>
              <th className="p-4">Type</th>
              <th className="p-4">Certification Status</th>
              <th className="p-4">Certified At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Loading partners...</td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No connectivity partners registered.</td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-mono font-medium text-slate-900 dark:text-white">{p.code}</td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{p.type}</td>
                  <td className="p-4">{getBadge(p.certificationStatus)}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    {p.certifiedAt ? new Date(p.certifiedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedPartner(p);
                        setOverrideStatus(p.certificationStatus === 'PASSED' ? 'FAILED' : 'PASSED');
                        setIsOverrideModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> SuperAdmin Override
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SuperAdmin Override Modal */}
      {isOverrideModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              SuperAdmin Certification Override
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Override certification status for <strong className="text-slate-900 dark:text-white">{selectedPartner.name}</strong> ({selectedPartner.code}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PASSED">PASSED — Grant Production Key Access</option>
                  <option value="FAILED">FAILED — Revoke/Deny Production Key Access</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mandatory Override Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the technical or business rationale for this manual override..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Apply SuperAdmin Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
