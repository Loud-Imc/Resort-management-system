import React, { useState, useEffect } from 'react';
import { Globe, XCircle, CheckCircle2, ShieldCheck, Copy, Info, Key, Hash, DollarSign, Sliders, Mail } from 'lucide-react';
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
  const [config, setConfig] = useState<any>({
    hotelId: '',
    accessToken: '',
    pricingType: 'Standard',
    sendEmail: true,
    syncB2B: true,
    syncMyBiz: false,
    minStayType: 'Arrival',
    totalType: 'Payout Amount',
    ...initialConfig,
  });

  useEffect(() => {
    if (open && initialConfig) {
      setConfig({
        hotelId: '',
        accessToken: '',
        pricingType: 'Standard',
        sendEmail: true,
        syncB2B: true,
        syncMyBiz: false,
        minStayType: 'Arrival',
        totalType: 'Payout Amount',
        ...initialConfig,
      });
    }
  }, [open, initialConfig, otaKey]);

  if (!open) return null;

  const handleSave = () => {
    if (otaKey !== 'airbnb' && !config.hotelId?.trim()) {
      toast.error(`Please enter the ${otaTitle} Hotel Property ID.`);
      return;
    }
    if (otaKey !== 'bookingcom' && otaKey !== 'airbnb' && !config.accessToken?.trim()) {
      toast.error(`Please enter your ${otaTitle} Extranet Access Token / Secret API Key.`);
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
      <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
          {otaKey !== 'airbnb' ? (
            <>
              {/* Property / Hotel Account ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  {otaTitle} Property / Account ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.hotelId || ''}
                  onChange={(e) => setConfig({ ...config, hotelId: e.target.value })}
                  placeholder={
                    otaKey === 'bookingcom' ? 'e.g. 5868189, 6519420 (from Booking.com Account)' :
                    otaKey === 'makemytrip' ? 'e.g. MMT-109283 (from MakeMyTrip Dashboard)' :
                    `e.g. ${otaTitle.split(' ')[0].toUpperCase()}-10029`
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-mono shadow-inner"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Find this inside your official {otaTitle} portal dashboard under Property Settings or Account ID.
                </p>
              </div>

              {/* Connection Security Token / Key */}
              {otaKey !== 'bookingcom' && otaKey !== 'airbnb' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    Security / Connection Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={config.accessToken || ''}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••••••••••"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-mono shadow-inner"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Generate this security token from your {otaTitle} portal connectivity settings.
                  </p>
                </div>
              )}

              {/* Dynamic Catalog Fields (e.g. Travel Portal selection dropdown for Custom Connect, Currency for Google Hotels, etc.) */}
              {catalogItem?.fields?.filter((f: any) => f.key !== 'hotelId' && f.key !== 'accessToken' && f.key !== 'pricingType' && f.key !== 'syncB2B' && f.key !== 'totalType' && f.key !== 'sendEmail').map((field: any) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={config[field.key] || field.default || field.options?.[0] || ''}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-border bg-background font-medium focus:ring-2 focus:ring-primary/40"
                    >
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'info' ? (
                    <div className="p-3 bg-muted/40 rounded-xl text-[11px] text-muted-foreground border border-border/60">
                      {field.description}
                    </div>
                  ) : (
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary shadow-inner"
                    />
                  )}
                </div>
              ))}

              {/* Booking.com Specific Settings */}
              {otaKey === 'bookingcom' && (
                <div className="space-y-3.5 bg-muted/30 p-4 rounded-2xl border border-border/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-primary" />
                      Channex Pricing Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {['Standard', 'OBP (Occupancy Based)'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setConfig({ ...config, pricingType: type })}
                          className={clsx(
                            "py-2.5 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5",
                            config.pricingType === type
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                              : "bg-background text-foreground border-border hover:bg-muted"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {config.pricingType === 'Standard'
                        ? 'Standard rates send single room type prices per date.'
                        : 'OBP automatically calculates price tiers per adult/child occupancy limit.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.sendEmail !== false}
                        onChange={(e) => setConfig({ ...config, sendEmail: e.target.checked })}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Send Booking Notification Email to Property
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Rate Toggles & Total Type Calculation for direct Channex channels */}
              {otaKey !== 'bookingcom' && otaKey !== 'airbnb' && (
                <div className="space-y-3.5 bg-muted/30 p-4 rounded-2xl border border-border/80 text-xs">
                  <div className="space-y-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5 block">
                      <Sliders className="h-3.5 w-3.5 text-primary" /> Rate & Channel Options
                    </span>
                    <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.syncB2B !== false}
                        onChange={(e) => setConfig({ ...config, syncB2B: e.target.checked })}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                      Sync B2B Corporate Rate Type
                    </label>

                    {otaKey === 'makemytrip' && (
                      <label className="flex items-center gap-2.5 font-medium text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.syncMyBiz === true}
                          onChange={(e) => setConfig({ ...config, syncMyBiz: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Sync MyBiz Rate Type (Corporate Travel Suite)
                      </label>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <label className="font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-primary" /> Booking Total Type Calculation
                    </label>
                    <select
                      value={config.totalType || 'Payout Amount'}
                      onChange={(e) => setConfig({ ...config, totalType: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-medium"
                    >
                      <option value="Payout Amount">Payout Amount (Net after OTA commission)</option>
                      <option value="Gross Amount">Gross Amount (Total guest paid price)</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Airbnb OAuth 2.0 Flow & Specific Configuration */
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  OAuth 2.0 Secure Token Exchange
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unlike traditional OTAs, Airbnb connects securely via live OAuth authorization. No manual hotel ID or extranet password required. Authorize directly below or copy the client onboarding link.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3.5 rounded-2xl border border-border/80">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">Min Stay Restriction Type</label>
                  <select
                    value={config.minStayType || 'Arrival'}
                    onChange={(e) => setConfig({ ...config, minStayType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-medium"
                  >
                    <option value="Arrival">Arrival (Check-in date only)</option>
                    <option value="Through">Through (Every date in stay)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground block">Booking Total Calculation</label>
                  <select
                    value={config.totalType || 'Payout Amount'}
                    onChange={(e) => setConfig({ ...config, totalType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background font-medium"
                  >
                    <option value="Payout Amount">Net Host Payout</option>
                    <option value="Gross Amount">Gross Guest Paid</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3.5 bg-[#FF385C] hover:bg-[#E00B41] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-[#FF385C]/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <Globe className="h-4 w-4" /> Connect with Airbnb (Live OAuth)
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
          )}

          {/* Rate Markup & Commission Revenue Protection (Works across all channels) */}
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
              💡 <strong className="text-foreground">Why set a Rate Markup?</strong> Every OTA charges different commission rates (`e.g. {otaTitle} ~{otaKey === 'makemytrip' ? '18%' : otaKey === 'bookingcom' ? '15%' : otaKey === 'agoda' ? '20%' : '12%'}`). Setting a markup automatically raises pushed rates higher (`e.g. $100 &rarr; $115 with +15%`) so your hotel net revenue stays 100% protected!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        {otaKey !== 'airbnb' && (
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
