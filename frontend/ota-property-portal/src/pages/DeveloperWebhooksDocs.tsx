import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Copy, Check, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeveloperWebhooksDocs() {
  const [copied, setCopied] = useState(false);
  const isLoggedIn = !!localStorage.getItem('developer_token');

  const nodeSnippet = `const crypto = require('crypto');

/**
 * Verify Oreedu Outbound Webhook HMAC-SHA256 Signature
 * @param {string} rawHttpBody - Exact unparsed UTF-8 request body string
 * @param {string} signatureHeader - Value of 'X-Oreedu-Signature' header (t=...,v1=...)
 * @param {string} partnerWebhookSecret - Partner secret key
 * @returns {boolean} True if signature is valid and fresh
 */
function verifyOreeduWebhook(rawHttpBody, signatureHeader, partnerWebhookSecret) {
  if (!signatureHeader || !partnerWebhookSecret) return false;

  const parts = signatureHeader.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const digestPart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !digestPart) return false;

  const timestamp = timestampPart.split('=')[1];
  const transmittedDigest = digestPart.split('=')[1];

  // 1. Verify Timestamp Freshness (within 300s / 5 minutes)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - parseInt(timestamp, 10)) > 300) {
    console.error('Webhook signature timestamp expired');
    return false;
  }

  // 2. Construct Signed Payload string
  const signedPayload = \`\${timestamp}.\${rawHttpBody}\`;

  // 3. Compute HMAC-SHA256 Digest
  const calculatedDigest = crypto
    .createHmac('sha256', partnerWebhookSecret)
    .update(signedPayload)
    .digest('hex');

  // 4. Constant-time Compare
  return crypto.timingSafeEqual(
    Buffer.from(calculatedDigest),
    Buffer.from(transmittedDigest)
  );
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(nodeSnippet);
    setCopied(true);
    toast.success('Copied Node.js verification snippet!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12 py-4">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20">
          <Zap className="w-3.5 h-3.5" /> Outbound Event System
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Webhooks & HMAC Signature Guide</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Receive real-time reservation and inventory event notifications with cryptographically signed HMAC-SHA256 headers.
        </p>
      </div>

      {/* Action CTA Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Zap className="w-4 h-4" /> Ready to Configure Your Endpoint?
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isLoggedIn
              ? 'Configure your live destination Webhook URL and rotate your HMAC-SHA256 signing secret inside your Developer Dashboard.'
              : 'Sign in to your Developer Dashboard to set your HTTPS Webhook URL, copy your secret, and test event deliveries.'}
          </p>
        </div>

        {isLoggedIn ? (
          <Link
            to="/developers/dashboard#webhooks"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all shrink-0 flex items-center gap-2"
          >
            Configure Webhooks in Dashboard
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

      {/* Signature Specification Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <code className="text-emerald-600 dark:text-emerald-400 font-mono">X-Oreedu-Signature</code> Header Format
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Every outbound HTTP POST payload sent by Oreedu contains the signature header:
        </p>

        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
          X-Oreedu-Signature: t=1787894630,v1=3ad746430a149c71e285d89f029...
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-400">t = Timestamp</span>
            <p className="text-slate-600 dark:text-slate-300">Unix epoch timestamp (seconds) when the signature was computed.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-400">v1 = HMAC Digest</span>
            <p className="text-slate-600 dark:text-slate-300">HMAC-SHA256 hex digest calculated over <code className="text-emerald-600 dark:text-emerald-400 font-mono">${`timestamp`}.${`rawBody`}</code>.</p>
          </div>
        </div>
      </div>

      {/* Verification Code Example */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Node.js HMAC-SHA256 Verification Implementation</h2>
          <button
            onClick={copyCode}
            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto shadow-sm">
          {nodeSnippet}
        </pre>
      </div>

      {/* Expected HTTP Response */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Receiver HTTP Response Requirement</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Your webhook receiver MUST return <code className="text-emerald-600 dark:text-emerald-400 font-mono">HTTP 200 OK</code> with JSON:
        </p>
        <pre className="p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
{`{
  "received": true,
  "signatureVerified": true
}`}
        </pre>
      </div>

      {/* Retry Schedule */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Exponential Backoff Retry Schedule
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          If your endpoint returns <code className="text-rose-600 dark:text-rose-400 font-mono">HTTP 4xx/5xx</code> or times out (10s), Oreedu retries automatically up to 5 times:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ATTEMPT 1</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Immediate</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ATTEMPT 2</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10s</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ATTEMPT 3</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+60s</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ATTEMPT 4</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+300s (5m)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ATTEMPT 5</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+1800s (30m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
