import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Copy, Check, Lock, Sparkles, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function DeveloperRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    type: 'PMS',
    contactEmail: '',
    contactPhone: '',
    webhookUrl: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<{ apiKey: string; secret: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.contactEmail || !formData.password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/connectivity/v1/developer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      localStorage.setItem('developer_token', data.accessToken);
      localStorage.setItem('developer_partner', JSON.stringify(data.partner));
      toast.success('Registration successful! Sandbox credentials generated.');

      setInitialData({
        apiKey: data.initialApiKey,
        secret: data.webhookSecret,
      });
    } catch (err: any) {
      toast.error(err.message || 'Error registering developer account.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, type: 'key' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5" /> B2B Partner Onboarding
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Register your PMS / Channel Manager
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          Create a Oreedu Connectivity Partner account to receive immediate Sandbox credentials (<code className="text-emerald-600 dark:text-emerald-400 font-mono">rg_test_...</code>) for <code className="text-teal-600 dark:text-teal-400 font-mono">TEST-PROP-001</code>.
        </p>
      </div>

      {/* Registration Form Box */}
      {!initialData ? (
        <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Company & Integration Profile
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company / Partner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Acme PMS Systems"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Integration Partner Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PMS">PMS (Property Management System)</option>
                <option value="CHANNEL_MANAGER">Channel Manager</option>
                <option value="CONNECTIVITY_PROVIDER">Connectivity Provider / CRS</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Contact Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="developer@acmepms.com"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Outbound Webhook URL (Optional)
              </label>
              <input
                type="url"
                name="webhookUrl"
                value={formData.webhookUrl}
                onChange={handleChange}
                placeholder="https://webhook.acmepms.com/events"
                className="w-full px-4 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                The HTTPS URL of your system where Oreedu will send real-time events such as reservation and availability updates. You can configure this later from the Developer Dashboard before certification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Developer Portal Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Registering Account...</span>
            ) : (
              <>
                Create Developer Account & Get Sandbox Key
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Already registered?{' '}
            <Link to="/developers/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              Developer Sign In
            </Link>
          </p>
        </form>
      ) : (
        /* Successful Registration Key Modal Box */
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/40 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Created Successfully!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Save your initial Sandbox API Key and HMAC Webhook Secret below.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>These credentials are shown ONLY once. Copy and store them securely before entering your dashboard.</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <span className="block text-slate-500 dark:text-slate-400 mb-1 font-sans font-semibold">INITIAL SANDBOX API KEY (x-api-key):</span>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800">
                <span className="truncate flex-1">{initialData.apiKey}</span>
                <button
                  onClick={() => copyText(initialData.apiKey, 'key')}
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <span className="block text-slate-500 dark:text-slate-400 mb-1 font-sans font-semibold">HMAC-SHA256 WEBHOOK SECRET:</span>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 text-teal-400 border border-slate-800">
                <span className="truncate flex-1">{initialData.secret}</span>
                <button
                  onClick={() => copyText(initialData.secret, 'secret')}
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  {copiedSecret ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/developers/dashboard')}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            Go to Developer Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
