import { useState } from 'react';
import { Cpu, Terminal, RefreshCw, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperSandboxDocs() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const executeApiTest = async (endpoint: string, method: string = 'GET', body?: any) => {
    if (!apiKey || apiKey.trim().length === 0) {
      toast.error('Please enter your Sandbox API Key (rg_test_...) to test.');
      return;
    }

    setLoading(true);
    setActiveEndpoint(endpoint);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(endpoint, options);
      const data = await res.json();
      setApiResult({ status: res.status, ok: res.ok, data });
      if (res.ok) {
        toast.success(`Request ${method} ${endpoint} succeeded!`);
      } else {
        toast.error(`Request returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      setApiResult({ error: 'Network failure or server un-reachable' });
      toast.error('Network failure executing API call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 py-4">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20">
          <Cpu className="w-3.5 h-3.5" /> Isolated Testing Environment
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sandbox Environment Guide (<code className="text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code>)</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Test all B2B connectivity features safely against a dedicated test resort without affecting live hotel inventory or production data.
        </p>
      </div>

      {/* Sandbox Specification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sandbox API Key Format</span>
          <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">rg_test_&lt;random_hex&gt;</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Issued via Partner Portal or Admin API.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dedicated Test Property</span>
          <p className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">TEST-PROP-001</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pre-configured with Deluxe Room & Executive Suite.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Side-Effect Boundary</span>
          <p className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">ZERO Production Side-Effects</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Keys attempting live property access receive HTTP 403.</p>
        </div>
      </div>

      {/* Interactive Sandbox API Tester Console */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Interactive Sandbox API Console
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your Sandbox API key to test live connectivity endpoints against <code className="text-emerald-600 dark:text-emerald-400 font-mono">TEST-PROP-001</code>.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Sandbox API Key (<code className="text-emerald-600 dark:text-emerald-400 font-mono">x-api-key</code>)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. rg_test_1234567890abcdef12345678"
              className="w-full px-4 py-3 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => executeApiTest('/api/connectivity/v1/ping')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 border border-slate-700 disabled:opacity-50 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Test GET /ping
            </button>

            <button
              onClick={() => executeApiTest('/api/connectivity/v1/content?propertyId=TEST-PROP-001')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 border border-slate-700 disabled:opacity-50 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-teal-400" /> Test GET /content (TEST-PROP-001)
            </button>

            <button
              onClick={() => executeApiTest('/api/connectivity/v1/sandbox/reset', 'POST')}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-2 border border-slate-700 disabled:opacity-50 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} /> Test POST /sandbox/reset
            </button>
          </div>
        </div>

        {/* API Result Display Box */}
        {apiResult && (
          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-400">Response Output ({activeEndpoint}):</span>
              <span className={apiResult.ok ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                HTTP {apiResult.status || 'ERROR'}
              </span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 shadow-sm">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
