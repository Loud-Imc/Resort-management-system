import { useState, useEffect } from 'react';
import { appUpdateService, AppUpdatePolicy } from '../../services/appUpdate';
import {
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Save,
  RefreshCw,
  ExternalLink,
  Info,
  Sliders,
  Sparkles,
  DownloadCloud,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Semver comparator for client-side live preview simulator
function compareSemver(v1: string, v2: string): number {
  const parseParts = (v: string): number[] => {
    const clean = (v || '').trim().replace(/^v/i, '').split('-')[0].split('+')[0];
    const segments = clean.split('.').map((p) => {
      const parsed = parseInt(p, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
    while (segments.length < 3) segments.push(0);
    return segments;
  };

  const p1 = parseParts(v1);
  const p2 = parseParts(v2);
  const length = Math.max(p1.length, p2.length);
  for (let i = 0; i < length; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

export default function AppUpdateSettings() {
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios'>('android');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Form states
  const [policies, setPolicies] = useState<{
    android: AppUpdatePolicy;
    ios: AppUpdatePolicy;
  }>({
    android: {
      platform: 'android',
      minimumSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      updateType: 'none',
      title: 'Update Required',
      message: 'A new version of the app is available. Please update to continue.',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.oreedu.app',
      enabled: true,
      rolloutPercentage: 100,
      policyVersion: 1,
      publishedAt: new Date().toISOString(),
    },
    ios: {
      platform: 'ios',
      minimumSupportedVersion: '1.0.0',
      latestVersion: '1.0.0',
      updateType: 'none',
      title: 'Update Required',
      message: 'A new version of the app is available. Please update to continue.',
      storeUrl: 'https://apps.apple.com/app/id6740000000',
      enabled: true,
      rolloutPercentage: 100,
      policyVersion: 1,
      publishedAt: new Date().toISOString(),
    },
  });

  // Simulator test version
  const [testVersion, setTestVersion] = useState('1.0.0');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await appUpdateService.getPolicies();
      setPolicies((prev) => ({
        android: data.android || prev.android,
        ios: data.ios || prev.ios,
      }));
    } catch (err: any) {
      toast.error('Failed to load app update policies');
    } finally {
      setLoading(false);
    }
  };

  const currentPolicy = policies[activePlatform];

  const handleFieldChange = (field: keyof AppUpdatePolicy, value: any) => {
    setPolicies((prev) => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        [field]: value,
      },
    }));
  };

  const handleSaveClick = () => {
    // If setting to force update, prompt confirmation to avoid accidental user lockout
    if (currentPolicy.updateType === 'force') {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setShowConfirmModal(false);
    try {
      setSaving(true);
      const updated = await appUpdateService.updatePolicy(activePlatform, currentPolicy);
      setPolicies((prev) => ({
        ...prev,
        [activePlatform]: updated,
      }));
      toast.success(`${activePlatform.toUpperCase()} update policy published successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save update policy');
    } finally {
      setSaving(false);
    }
  };

  // Live Simulator Evaluation Calculation
  const simulateResult = () => {
    if (!currentPolicy.enabled) {
      return {
        status: 'ALLOWED',
        type: 'none',
        description: 'Policy disabled. All app versions are allowed.',
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      };
    }

    const isBelowMin = compareSemver(testVersion, currentPolicy.minimumSupportedVersion) < 0;
    const isBelowLatest = compareSemver(testVersion, currentPolicy.latestVersion) < 0;

    if (isBelowMin) {
      return {
        status: 'FORCE UPDATE (BLOCKED)',
        type: 'force',
        description: `Version ${testVersion} is below minimum required (${currentPolicy.minimumSupportedVersion}). User CANNOT proceed.`,
        color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
      };
    } else if (isBelowLatest) {
      return {
        status: currentPolicy.updateType === 'force' ? 'OPTIONAL UPDATE' : currentPolicy.updateType.toUpperCase() + ' UPDATE',
        type: 'optional',
        description: `Version ${testVersion} is supported, but newer version (${currentPolicy.latestVersion}) exists. User can update or skip.`,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      };
    } else {
      return {
        status: 'ALLOWED (LATEST)',
        type: 'none',
        description: `Version ${testVersion} is up to date. App launches directly.`,
        color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      };
    }
  };

  const simulation = simulateResult();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Mobile App Update Engine
              </h1>
              <p className="text-sm text-muted-foreground">
                Remotely control mandatory & optional app updates for Flutter Android & iOS apps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSaveClick}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Publishing...' : 'Publish Policy'}
          </button>
        </div>
      </div>

      {/* Platform Switcher Tabs */}
      <div className="flex gap-4 border-b border-border pb-1">
        <button
          onClick={() => setActivePlatform('android')}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
            activePlatform === 'android'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Android (Google Play)</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
            v{policies.android.latestVersion}
          </span>
        </button>

        <button
          onClick={() => setActivePlatform('ios')}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
            activePlatform === 'ios'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span>iOS (Apple App Store)</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
            v{policies.ios.latestVersion}
          </span>
        </button>
      </div>

      {/* Main Grid: Settings & Live Preview Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Policy Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Policy Overview Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  {activePlatform.toUpperCase()} Version Rules
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Policy revision #{currentPolicy.policyVersion} • Last published{' '}
                  {new Date(currentPolicy.publishedAt).toLocaleString()}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-muted-foreground">Enforcement</span>
                <input
                  type="checkbox"
                  checked={currentPolicy.enabled}
                  onChange={(e) => handleFieldChange('enabled', e.target.checked)}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Version Numbers Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Minimum Supported Version</span>
                  <span className="text-[11px] text-red-500 font-normal">Blocks older builds</span>
                </label>
                <input
                  type="text"
                  value={currentPolicy.minimumSupportedVersion}
                  onChange={(e) => handleFieldChange('minimumSupportedVersion', e.target.value)}
                  placeholder="e.g. 1.0.0"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Users below this version will be <strong>forced</strong> to update.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Latest Released Version</span>
                  <span className="text-[11px] text-emerald-500 font-normal">Store live build</span>
                </label>
                <input
                  type="text"
                  value={currentPolicy.latestVersion}
                  onChange={(e) => handleFieldChange('latestVersion', e.target.value)}
                  placeholder="e.g. 1.1.0"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The latest version currently downloadable in store.
                </p>
              </div>
            </div>

            {/* Update Type Selector Cards */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Default Update Policy
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* NONE */}
                <div
                  onClick={() => handleFieldChange('updateType', 'none')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    currentPolicy.updateType === 'none'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-foreground">None</span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        currentPolicy.updateType === 'none' ? 'text-emerald-500' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No prompt for supported users. Seamless app entry.
                  </p>
                </div>

                {/* OPTIONAL */}
                <div
                  onClick={() => handleFieldChange('updateType', 'optional')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    currentPolicy.updateType === 'optional'
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-foreground">Optional</span>
                    <Info
                      className={`w-4 h-4 ${
                        currentPolicy.updateType === 'optional' ? 'text-amber-500' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Displays non-blocking popup: "Update" or "Later".
                  </p>
                </div>

                {/* FORCE */}
                <div
                  onClick={() => handleFieldChange('updateType', 'force')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    currentPolicy.updateType === 'force'
                      ? 'border-red-500 bg-red-500/10 shadow-sm'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-foreground">Force Update</span>
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        currentPolicy.updateType === 'force' ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Blocks app for versions below minimum. No skip button.
                  </p>
                </div>
              </div>
            </div>

            {/* Store URL */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                {activePlatform === 'android' ? 'Google Play Store URL' : 'Apple App Store URL'}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={currentPolicy.storeUrl}
                  onChange={(e) => handleFieldChange('storeUrl', e.target.value)}
                  placeholder={
                    activePlatform === 'android'
                      ? 'https://play.google.com/store/apps/details?id=...'
                      : 'https://apps.apple.com/app/id...'
                  }
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                {currentPolicy.storeUrl && (
                  <a
                    href={currentPolicy.storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Test Link
                  </a>
                )}
              </div>
            </div>

            {/* Modal Title & Message */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Update Dialog Title
                </label>
                <input
                  type="text"
                  value={currentPolicy.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="e.g. Update Required"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Update Dialog Message
                </label>
                <textarea
                  rows={2}
                  value={currentPolicy.message}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="e.g. A newer version of the app is required to continue using our services."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Rollout Percentage Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Rollout Percentage
                </label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {currentPolicy.rolloutPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={currentPolicy.rolloutPercentage}
                onChange={(e) => handleFieldChange('rolloutPercentage', parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>0% (Disabled)</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% (All Users)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulator & Phone Mockup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulator Box */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Interactive Version Tester</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Simulate Installed Mobile App Version:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testVersion}
                  onChange={(e) => setTestVersion(e.target.value)}
                  placeholder="e.g. 0.9.0 or 1.0.5"
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setTestVersion(currentPolicy.minimumSupportedVersion)}
                  className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg"
                  title="Test Minimum Version"
                >
                  Set Min
                </button>
                <button
                  type="button"
                  onClick={() => setTestVersion(currentPolicy.latestVersion)}
                  className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg"
                  title="Test Latest Version"
                >
                  Set Latest
                </button>
              </div>
            </div>

            {/* Evaluation Result Badge */}
            <div className={`p-4 rounded-xl border ${simulation.color} transition-all`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">{simulation.status}</span>
                <span className="text-[10px] font-mono opacity-80">
                  {activePlatform} @ v{testVersion}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{simulation.description}</p>
            </div>

            {/* Mobile Mockup Preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Mobile Screen Preview
              </p>
              <div className="relative mx-auto w-full max-w-[280px] bg-slate-900 text-white rounded-[2.5rem] p-4 shadow-xl border-4 border-slate-800">
                {/* Speaker notch */}
                <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

                {/* Mobile Content Screen */}
                <div className="bg-slate-950 rounded-2xl p-4 min-h-[300px] flex flex-col justify-between text-center">
                  {simulation.type === 'force' ? (
                    <div className="my-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                        <DownloadCloud className="w-6 h-6 animate-bounce" />
                      </div>
                      <h3 className="font-bold text-base text-white">{currentPolicy.title || 'Update Required'}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {currentPolicy.message || 'Please update the app to continue.'}
                      </p>
                      <button className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-lg mt-2">
                        Update Now
                      </button>
                      <p className="text-[10px] text-slate-500">Back button disabled</p>
                    </div>
                  ) : simulation.type === 'optional' ? (
                    <div className="my-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-base text-white">New Version Available</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {currentPolicy.message || 'A newer version is ready with improvements.'}
                      </p>
                      <div className="space-y-2 mt-2">
                        <button className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl">
                          Update
                        </button>
                        <button className="w-full py-2 text-slate-400 font-medium text-xs hover:text-white">
                          Maybe Later
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-base text-white">Welcome Back!</h3>
                      <p className="text-xs text-slate-400">
                        App is up to date (v{testVersion}). Normal application unlocked.
                      </p>
                    </div>
                  )}

                  {/* Home bar */}
                  <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal for Force Update */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Confirm Mandatory Force Update</h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              You are about to activate a <strong>Mandatory Force Update</strong> on{' '}
              <span className="font-semibold text-foreground">{activePlatform.toUpperCase()}</span> for all
              users running versions below{' '}
              <span className="font-mono font-semibold text-red-500">
                v{currentPolicy.minimumSupportedVersion}
              </span>
              .
            </p>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Golden Rule Verification:
              </p>
              <p>
                Ensure version <strong>{currentPolicy.latestVersion}</strong> is <em>already approved and live</em>{' '}
                on {activePlatform === 'android' ? 'Google Play Store' : 'Apple App Store'}. Otherwise, users will be
                locked out without being able to download the new version.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all"
              >
                Yes, Publish Force Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
