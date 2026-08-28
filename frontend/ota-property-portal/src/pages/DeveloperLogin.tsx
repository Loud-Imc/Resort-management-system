import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/connectivity/v1/developer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      localStorage.setItem('developer_token', data.accessToken);
      localStorage.setItem('developer_partner', JSON.stringify(data.partner));
      toast.success('Developer Sign In successful!');
      navigate('/developers/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Error signing in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-8 font-sans">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5" /> B2B Developer Portal
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Connectivity Developer Sign In
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Access your PMS / Channel Manager partner dashboard, API keys, and self-certification status.
        </p>
      </div>

      {/* Login Box */}
      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@acmepms.com"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            <span>Signing In...</span>
          ) : (
            <>
              Sign In to Developer Portal
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-center text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Need to integrate your PMS?{' '}
            <Link to="/developers/register" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
              Get Sandbox Access
            </Link>
          </p>
          <div className="pt-2">
            <Link to="/login" className="text-slate-400 hover:text-slate-300 text-[11px] underline">
              Are you a Hotel Property Owner? Click here for Property Listing Login.
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
