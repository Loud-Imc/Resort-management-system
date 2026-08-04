import React, { useState, useEffect } from 'react';
import { Globe, XCircle, CheckCircle2, ShieldCheck, Copy, Info, Key, Hash, DollarSign, Sliders } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

interface ChannexOtaModalProps {
  open: boolean;
  otaKey: string;
  otaTitle: string;
  onClose: () => void;
  onSave: (otaKey: string, otaTitle: string, config: any) => void;
  initialConfig?: any;
  catalogItem?: any;
}

export const ChannexOtaModal: React.FC<ChannexOtaModalProps> = ({
  open,
  otaKey,
  otaTitle,
  onClose,
  onSave,
  initialConfig = {},
  catalogItem,
}) => {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (open && catalogItem) {
      const initial: any = { rateMarkup: '0%', ...initialConfig };
      catalogItem.fields?.forEach((field: any) => {
        if (initial[field.key] === undefined) {
          initial[field.key] = field.default !== undefined ? field.default : '';
        }
      });
      setConfig(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otaKey]);

  if (!open) return null;

  const isOAuth = !!catalogItem?.payload;

  const handleSave = () => {
    if (config.isManualImport) {
      if (!config.manualChannelId || config.manualChannelId.trim() === '') {
        toast.error('Please enter the Channex Channel ID');
        return;
      }
      onSave(otaKey, otaTitle, { manualChannelId: config.manualChannelId.trim() });
      return;
    }

    // Validate required fields
    const missingField = catalogItem?.fields?.find(
      (f: any) => f.required && (config[f.key] === undefined || config[f.key] === null || config[f.key].toString().trim() === '')
    );

    if (missingField) {
      toast.error(`Please enter the required field: ${missingField.label}`);
      return;
    }

    onSave(otaKey, otaTitle, config);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/oauth/channex/connect/${otaKey}`;
    navigator.clipboard.writeText(link);
    toast.success(`Copied ${otaTitle} host onboarding link to clipboard!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0 border border-primary/20">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground">Configure {otaTitle}</h3>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase border border-emerald-500/20">
                  Live 2-Way Sync
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter your official portal account credentials below for automatic rate and reservation synchronization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* User-Friendly Direct Sync Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Verified Direct Connection:</span> Credentials saved here securely link your resort directly to this travel portal for automatic 24/7 calendar and price synchronization.
          </div>
        </div>

        {/* Form Fields by Channel Type */}
        <div className="space-y-4">
          {/* Manual ID Import Toggle */}
          <div className="p-3.5 bg-muted/30 border border-border/80 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5 pr-3">
              <span className="text-xs font-bold text-foreground block">Manual Channex Channel ID Import</span>
              <span className="text-[10px] text-muted-foreground block leading-relaxed">
                Enable this if you have already connected this channel inside your staging.channex.io dashboard.
              </span>
            </div>
            <input
              type="checkbox"
              checked={!!config.isManualImport}
              onChange={(e) => setConfig({ ...config, isManualImport: e.target.checked })}
              className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer shrink-0"
            />
          </div>

          {config.isManualImport ? (
            <div className="space-y-1.5 p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in duration-200">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-primary" />
                Channex Channel ID (UUID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.manualChannelId || ''}
                onChange={(e) => setConfig({ ...config, manualChannelId: e.target.value })}
                placeholder="e.g. 12345678-abcd-ef01-2345-6789abcdef01"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-mono shadow-inner animate-in fade-in"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">
                💡 <strong className="text-foreground">Where to find this:</strong> In your Channex Dashboard &rarr; select Serene Lake Homestay &rarr; go to Channels &rarr; click on the connected Booking.com channel. Copy the Channel ID from the URL or settings.
              </p>
            </div>
          ) : isOAuth ? (
            /* OAuth Authorization Flow */
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  OAuth 2.0 Secure Token Exchange
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unlike traditional OTAs, {otaTitle} connects securely via live OAuth authorization. No manual hotel ID or password required. Authorize directly below or copy the client onboarding link.
                </p>
              </div>

              {/* Render OAuth parameters dynamically */}
              {catalogItem?.fields?.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/85 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  {catalogItem.fields.map((field: any) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-bold text-foreground block">
                        {field.label} {field.required ? <span className="text-red-500">*</span> : <span className="text-[10px] text-muted-foreground font-normal ml-1">(Optional)</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={config[field.key] !== undefined ? config[field.key] : (field.default || '')}
                          onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-medium focus:ring-2 focus:ring-primary/40"
                        >
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={!!config[field.key]}
                            onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          {field.label}
                        </label>
                      ) : (
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={config[field.key] || ''}
                          onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                          placeholder={field.placeholder || `Enter ${field.label}`}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-mono shadow-inner"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3.5 bg-[#FF385C] hover:bg-[#E00B41] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-[#FF385C]/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <Globe className="h-4 w-4" /> Connect with {otaTitle} (OAuth Flow)
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border border-border flex items-center justify-center gap-2 transition-all"
                >
                  <Copy className="h-3.5 w-3.5 text-primary" /> Copy Shareable Client Onboarding Link
                </button>
              </div>
            </div>
          ) : (
            /* Traditional Parameters Input Flow */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {catalogItem?.fields?.map((field: any) => {
                const isCredentialField = ['hotel_id', 'hotel_code', 'access_token', 'api_key', 'station_code', 'agent_id'].includes(field.key);

                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {isCredentialField ? (
                        field.key.includes('token') || field.key.includes('key') ? (
                          <Key className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <Sliders className="h-3.5 w-3.5 text-primary" />
                      )}
                      {field.label} {field.required ? <span className="text-red-500">*</span> : <span className="text-[10px] text-muted-foreground font-normal ml-1">(Optional)</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={config[field.key] !== undefined ? config[field.key] : (field.default || '')}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-background font-medium focus:ring-2 focus:ring-primary/40 focus:outline-hidden"
                      >
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={!!config[field.key]}
                          onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{field.label}</span>
                      </label>
                    ) : field.type === 'hidden' ? (
                      <input
                        type="hidden"
                        value={config[field.key] || ''}
                      />
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={config[field.key] || ''}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        placeholder={field.placeholder || `Enter ${field.label}`}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-mono shadow-inner"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rate Markup & Commission Revenue Protection */}
          <div className="space-y-2.5 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent p-4 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Channel Rate Markup (`Revenue Protection`)
              </label>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-extrabold">
                {config.rateMarkup || '0%'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {['0%', '+10%', '+15%', '+18%', '+20%', '+25%'].map(markup => (
                <button
                  key={markup}
                  type="button"
                  onClick={() => setConfig({ ...config, rateMarkup: markup })}
                  className={clsx(
                    "px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all",
                    config.rateMarkup === markup
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  )}
                >
                  {markup}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
              💡 <strong className="text-foreground">Why set a Rate Markup?</strong> Every OTA charges different commission rates. Setting a markup automatically raises pushed rates higher (`e.g. $100 &rarr; $115 with +15%`) so your hotel net revenue stays 100% protected!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        {(!isOAuth || config.isManualImport) && (
          <div className="flex gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Save & Activate 2-Way Sync
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
