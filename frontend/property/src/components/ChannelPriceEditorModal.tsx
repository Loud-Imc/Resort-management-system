import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ratePlansService,
  type ChannelPriceItem,
  type MultiChannelPriceOverrideResponse,
} from '../services/ratePlans';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface ChannelRowState {
  enabled: boolean;
  price: string;
}

export interface ChannelPriceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomType: RoomType;
  ratePlanId?: string;
  dateStr: string;
  isAc: boolean;
  currentPrice: number;
  existingChannelPrices?: Record<string, number>;
  activeOtas: any[];
  onSuccess: () => void;
}

type ModalStage = 'EDIT' | 'CONFIRM' | 'VERIFIED_SUCCESS';

export const ChannelPriceEditorModal: React.FC<ChannelPriceEditorModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomType,
  ratePlanId,
  dateStr,
  isAc,
  currentPrice,
  existingChannelPrices = {},
  activeOtas = [],
  onSuccess,
}) => {
  const [stage, setStage] = useState<ModalStage>('EDIT');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Channel row states
  const [allMaster, setAllMaster] = useState<ChannelRowState>({
    enabled: true,
    price: String(existingChannelPrices['ALL'] ?? currentPrice),
  });

  const [oreeduPms, setOreeduPms] = useState<ChannelRowState>({
    enabled: true,
    price: String(existingChannelPrices['OREEDU_PMS'] ?? currentPrice),
  });

  const [oreeduOta, setOreeduOta] = useState<ChannelRowState>({
    enabled: true,
    price: String(existingChannelPrices['OREEDU_OTA_PORTAL'] ?? currentPrice),
  });

  const [oreeduCp, setOreeduCp] = useState<ChannelRowState>({
    enabled: true,
    price: String(existingChannelPrices['OREEDU_CP_PORTAL'] ?? currentPrice),
  });

  const [externalOtasState, setExternalOtasState] = useState<Record<string, ChannelRowState>>({});
  const [verifiedResponse, setVerifiedResponse] = useState<MultiChannelPriceOverrideResponse | null>(null);

  // Initialize form when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setStage('EDIT');
      setIsSubmitting(false);
      setVerifiedResponse(null);

      const initialPrice = String(existingChannelPrices['ALL'] ?? currentPrice);

      const pmsVal = String(existingChannelPrices['OREEDU_PMS'] ?? initialPrice);
      const otaVal = String(existingChannelPrices['OREEDU_OTA_PORTAL'] ?? initialPrice);
      const cpVal = String(existingChannelPrices['OREEDU_CP_PORTAL'] ?? initialPrice);

      const initialExt: Record<string, ChannelRowState> = {};
      const extVals: string[] = [];
      activeOtas.forEach((ota) => {
        const targetKey = ota.id || ota.channelId || ota.channelName;
        const existingVal = existingChannelPrices[targetKey];
        const val = String(existingVal !== undefined ? existingVal : initialPrice);
        extVals.push(val);
        initialExt[targetKey] = {
          enabled: true,
          price: val,
        };
      });
      setExternalOtasState(initialExt);

      const allPrices = [pmsVal, otaVal, cpVal, ...extVals];
      const allIdentical = allPrices.length > 0 && allPrices.every(p => p === allPrices[0]);

      setAllMaster({
        enabled: allIdentical,
        price: allIdentical ? allPrices[0] : initialPrice,
      });

      setOreeduPms({
        enabled: true,
        price: pmsVal,
      });

      setOreeduOta({
        enabled: true,
        price: otaVal,
      });

      setOreeduCp({
        enabled: true,
        price: cpVal,
      });
    }
  }, [isOpen, dateStr, roomType?.id, isAc, currentPrice, activeOtas, existingChannelPrices]);

  if (!isOpen) return null;

  // Rule 1: Master Toggle
  const handleToggleAllMaster = (checked: boolean) => {
    setAllMaster(prev => ({ ...prev, enabled: checked }));
    const priceVal = allMaster.price;

    setOreeduPms(prev => ({ ...prev, enabled: checked, price: checked ? priceVal : prev.price }));
    setOreeduOta(prev => ({ ...prev, enabled: checked, price: checked ? priceVal : prev.price }));
    setOreeduCp(prev => ({ ...prev, enabled: checked, price: checked ? priceVal : prev.price }));
    setExternalOtasState(prev => {
      const next: Record<string, ChannelRowState> = {};
      for (const k of Object.keys(prev)) {
        next[k] = { ...prev[k], enabled: checked, price: checked ? priceVal : prev[k].price };
      }
      return next;
    });
  };

  // Rule 1b: Typing into ALL CHANNELS field propagates to all other channel fields
  const handleMasterPriceChange = (val: string) => {
    setAllMaster(prev => ({ ...prev, price: val }));
    setOreeduPms(prev => ({ ...prev, price: val }));
    setOreeduOta(prev => ({ ...prev, price: val }));
    setOreeduCp(prev => ({ ...prev, price: val }));
    setExternalOtasState(prev => {
      const next: Record<string, ChannelRowState> = {};
      for (const k of Object.keys(prev)) {
        next[k] = { ...prev[k], price: val };
      }
      return next;
    });
  };

  // Rule 2: Unchecking any channel unchecks ALL CHANNELS.
  const handleToggleOreeduPms = (checked: boolean) => {
    setOreeduPms(prev => ({ ...prev, enabled: checked }));
    if (!checked) {
      setAllMaster(prev => ({ ...prev, enabled: false }));
    } else {
      const allExtChecked = Object.values(externalOtasState).every(s => s.enabled);
      if (oreeduOta.enabled && oreeduCp.enabled && allExtChecked) {
        setAllMaster(prev => ({ ...prev, enabled: true }));
      }
    }
  };

  const handleToggleOreeduOta = (checked: boolean) => {
    setOreeduOta(prev => ({ ...prev, enabled: checked }));
    if (!checked) {
      setAllMaster(prev => ({ ...prev, enabled: false }));
    } else {
      const allExtChecked = Object.values(externalOtasState).every(s => s.enabled);
      if (oreeduPms.enabled && oreeduCp.enabled && allExtChecked) {
        setAllMaster(prev => ({ ...prev, enabled: true }));
      }
    }
  };

  const handleToggleOreeduCp = (checked: boolean) => {
    setOreeduCp(prev => ({ ...prev, enabled: checked }));
    if (!checked) {
      setAllMaster(prev => ({ ...prev, enabled: false }));
    } else {
      const allExtChecked = Object.values(externalOtasState).every(s => s.enabled);
      if (oreeduPms.enabled && oreeduOta.enabled && allExtChecked) {
        setAllMaster(prev => ({ ...prev, enabled: true }));
      }
    }
  };

  const handleToggleExternalOta = (targetKey: string, checked: boolean) => {
    setExternalOtasState(prev => {
      const next = {
        ...prev,
        [targetKey]: { ...prev[targetKey], enabled: checked },
      };
      if (!checked) {
        setAllMaster(m => ({ ...m, enabled: false }));
      } else {
        const allExtChecked = Object.values(next).every(s => s.enabled);
        if (oreeduPms.enabled && oreeduOta.enabled && oreeduCp.enabled && allExtChecked) {
          setAllMaster(m => ({ ...m, enabled: true }));
        }
      }
      return next;
    });
  };

  // Validation checks
  const validatePrice = (valStr: string): { isValid: boolean; error?: string } => {
    if (valStr.trim() === '') return { isValid: false, error: 'Required' };
    const num = Number(valStr);
    if (isNaN(num)) return { isValid: false, error: 'Must be a number' };
    if (num < 0) return { isValid: false, error: 'Cannot be negative' };
    return { isValid: true };
  };

  const hasValidationErrors = (): boolean => {
    if (allMaster.enabled) {
      if (!validatePrice(allMaster.price).isValid) return true;
    }
    if (oreeduPms.enabled && !validatePrice(oreeduPms.price).isValid) return true;
    if (oreeduOta.enabled && !validatePrice(oreeduOta.price).isValid) return true;
    if (oreeduCp.enabled && !validatePrice(oreeduCp.price).isValid) return true;
    for (const state of Object.values(externalOtasState)) {
      if (state.enabled && !validatePrice(state.price).isValid) return true;
    }
    const anyEnabled =
      allMaster.enabled ||
      oreeduPms.enabled ||
      oreeduOta.enabled ||
      oreeduCp.enabled ||
      Object.values(externalOtasState).some(s => s.enabled);
    return !anyEnabled;
  };

  // Build the list of changes for confirmation
  const getChangesList = () => {
    const list: Array<{ channelKey: string; channelName: string; oldPrice: number; newPrice: number }> = [];

    if (allMaster.enabled) {
      list.push({
        channelKey: 'ALL',
        channelName: 'All Channels (Master Base)',
        oldPrice: currentPrice,
        newPrice: Number(allMaster.price),
      });
    }

    if (oreeduPms.enabled) {
      list.push({
        channelKey: 'OREEDU_PMS',
        channelName: 'Oreedu Front-Desk PMS',
        oldPrice: existingChannelPrices['OREEDU_PMS'] ?? currentPrice,
        newPrice: Number(oreeduPms.price),
      });
    }

    if (oreeduOta.enabled) {
      list.push({
        channelKey: 'OREEDU_OTA_PORTAL',
        channelName: 'Oreedu Direct OTA (Portal)',
        oldPrice: existingChannelPrices['OREEDU_OTA_PORTAL'] ?? currentPrice,
        newPrice: Number(oreeduOta.price),
      });
    }

    if (oreeduCp.enabled) {
      list.push({
        channelKey: 'OREEDU_CP_PORTAL',
        channelName: 'Oreedu Channel Partner (CP)',
        oldPrice: existingChannelPrices['OREEDU_CP_PORTAL'] ?? currentPrice,
        newPrice: Number(oreeduCp.price),
      });
    }

    activeOtas.forEach((ota) => {
      const targetKey = ota.id || ota.channelId || ota.channelName;
      const state = externalOtasState[targetKey];
      if (state && state.enabled) {
        list.push({
          channelKey: targetKey,
          channelName: ota.title || ota.channelName || 'Connected OTA',
          oldPrice: existingChannelPrices[targetKey] ?? currentPrice,
          newPrice: Number(state.price),
        });
      }
    });

    return list;
  };

  // Submit to backend
  const handleConfirmAndPush = async () => {
    setIsSubmitting(true);
    try {
      const prices: ChannelPriceItem[] = [];

      if (allMaster.enabled) {
        prices.push({ channelTarget: 'ALL', price: Number(allMaster.price) });
      }
      if (oreeduPms.enabled) {
        prices.push({ channelTarget: 'OREEDU_PMS', price: Number(oreeduPms.price) });
      }
      if (oreeduOta.enabled) {
        prices.push({ channelTarget: 'OREEDU_OTA_PORTAL', price: Number(oreeduOta.price) });
      }
      if (oreeduCp.enabled) {
        prices.push({ channelTarget: 'OREEDU_CP_PORTAL', price: Number(oreeduCp.price) });
      }

      for (const [key, state] of Object.entries(externalOtasState)) {
        if (state.enabled) {
          prices.push({ channelTarget: key, price: Number(state.price) });
        }
      }

      const res = await ratePlansService.setMultiChannelPriceOverride({
        propertyId,
        roomTypeId: roomType.id,
        ratePlanId,
        date: dateStr,
        isAc,
        prices,
      });

      setVerifiedResponse(res);
      setStage('VERIFIED_SUCCESS');
      toast.success('Tariffs successfully updated!');
    } catch (err: any) {
      console.error('Multi-channel tariff override failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update channel tariffs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                Channel Tariff Allotment
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isAc 
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' 
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {isAc ? '❄️ AC Tariff' : '🍃 Non-AC Tariff'}
                </span>
              </h4>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                {dateStr} · {roomType.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STAGE 1: EDIT MODAL */}
        {stage === 'EDIT' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Quick Context Summary Card */}
            <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Current Tariff for this Date
                </span>
                <span className="font-mono font-black text-sm text-foreground">
                  ₹{currentPrice.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Room Configuration
                </span>
                <span className="font-bold text-foreground">
                  {isAc ? '❄️ Air Conditioned' : '🍃 Standard Non-AC'}
                </span>
              </div>
            </div>

            {/* Master Option: ALL CHANNELS */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allMaster.enabled}
                    onChange={(e) => handleToggleAllMaster(e.target.checked)}
                    className="h-4 w-4 rounded-md text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-xs text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      ALL CHANNELS
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Master tariff synced to all internal channels and OTAs
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={allMaster.price}
                    onChange={(e) => handleMasterPriceChange(e.target.value)}
                    disabled={!allMaster.enabled}
                    className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-black font-mono text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                      !allMaster.enabled
                        ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                        : !validatePrice(allMaster.price).isValid
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                        : 'bg-background border-border text-foreground shadow-2xs'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Oreedu Channels Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Oreedu Internal Channels
              </div>

              {/* Oreedu PMS */}
              <div className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={oreeduPms.enabled}
                    onChange={(e) => handleToggleOreeduPms(e.target.checked)}
                    className="h-4 w-4 rounded-md text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Oreedu Front-Desk PMS
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Direct walk-ins, phone reservations & desk bookings
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={oreeduPms.price}
                    onChange={(e) => setOreeduPms({ ...oreeduPms, price: e.target.value })}
                    disabled={!oreeduPms.enabled}
                    className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-black font-mono text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                      !oreeduPms.enabled
                        ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                        : !validatePrice(oreeduPms.price).isValid
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                        : 'bg-background border-border text-foreground shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Oreedu Direct OTA */}
              <div className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={oreeduOta.enabled}
                    onChange={(e) => handleToggleOreeduOta(e.target.checked)}
                    className="h-4 w-4 rounded-md text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Oreedu Direct OTA
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Public booking engine & brand portal
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={oreeduOta.price}
                    onChange={(e) => setOreeduOta({ ...oreeduOta, price: e.target.value })}
                    disabled={!oreeduOta.enabled}
                    className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-black font-mono text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                      !oreeduOta.enabled
                        ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                        : !validatePrice(oreeduOta.price).isValid
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                        : 'bg-background border-border text-foreground shadow-2xs'
                    }`}
                  />
                </div>
              </div>

              {/* Oreedu CP */}
              <div className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={oreeduCp.enabled}
                    onChange={(e) => handleToggleOreeduCp(e.target.checked)}
                    className="h-4 w-4 rounded-md text-primary border-border focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Oreedu Channel Partner (CP)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      B2B travel agents & corporate booking desk
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={oreeduCp.price}
                    onChange={(e) => setOreeduCp({ ...oreeduCp, price: e.target.value })}
                    disabled={!oreeduCp.enabled}
                    className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-black font-mono text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                      !oreeduCp.enabled
                        ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                        : !validatePrice(oreeduCp.price).isValid
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                        : 'bg-background border-border text-foreground shadow-2xs'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* External Connected OTAs Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  External Connected OTAs (Channex Sync)
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {activeOtas.length} connected
                </span>
              </div>

              {activeOtas.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  No external OTAs connected yet. Connect channels via Channel Manager settings.
                </div>
              ) : (
                activeOtas.map((ota) => {
                  const targetKey = ota.id || ota.channelId || ota.channelName;
                  const row = externalOtasState[targetKey] || { enabled: true, price: String(currentPrice) };
                  const otaName = ota.title || ota.channelName || 'OTA Channel';

                  return (
                    <div
                      key={targetKey}
                      className="p-3 rounded-2xl border border-border/80 bg-background/50 hover:bg-muted/30 transition-all flex items-center justify-between gap-3"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => handleToggleExternalOta(targetKey, e.target.checked)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-black text-foreground flex items-center gap-1.5 truncate">
                            <Globe className="h-3.5 w-3.5 text-amber-500" />
                            {otaName}
                          </span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            External OTA (Live 2-way sync)
                          </span>
                        </div>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={row.price}
                          onChange={(e) =>
                            setExternalOtasState({
                              ...externalOtasState,
                              [targetKey]: { ...row, price: e.target.value },
                            })
                          }
                          disabled={!row.enabled}
                          className={`w-28 px-3 py-1.5 rounded-xl border text-sm font-black font-mono text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                            !row.enabled
                              ? 'bg-muted/50 border-border text-muted-foreground opacity-60 cursor-not-allowed'
                              : !validatePrice(row.price).isValid
                              ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                              : 'bg-background border-border text-foreground shadow-2xs'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STAGE 2: CONFIRMATION DIFF MODAL */}
        {stage === 'CONFIRM' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block">Review Tariff Adjustments Before Applying</span>
                The following price changes will be dispatched to selected channels for{' '}
                <strong>{dateStr}</strong>.
              </div>
            </div>

            {/* Changes Breakdown Table */}
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-2">
                <span className="col-span-6">Channel</span>
                <span className="col-span-3 text-right">Old Tariff</span>
                <span className="col-span-3 text-right">New Tariff</span>
              </div>
              <div className="divide-y divide-border/60">
                {getChangesList().map((item, idx) => {
                  const diff = item.newPrice - item.oldPrice;
                  return (
                    <div key={idx} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-6">
                        <span className="font-bold text-foreground block">{item.channelName}</span>
                        {diff !== 0 && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {diff > 0 ? `+₹${diff.toLocaleString()}` : `-₹${Math.abs(diff).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                      <span className="col-span-3 text-right font-mono text-muted-foreground">
                        ₹{item.oldPrice.toLocaleString()}
                      </span>
                      <span className="col-span-3 text-right font-mono font-black text-foreground">
                        ₹{item.newPrice.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>
                External connected OTAs will receive an automated Channex Delta ARI update upon confirmation.
              </span>
            </div>
          </div>
        )}

        {/* STAGE 3: POST-SYNC VERIFIED SUCCESS MODAL */}
        {stage === 'VERIFIED_SUCCESS' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-black text-sm">Tariffs Synchronized Successfully</h5>
                <p className="text-xs mt-0.5 leading-snug">
                  All channel price rules have been written to the database with active {isAc ? '❄️ AC' : '🍃 Non-AC'} segregation.
                </p>
              </div>
            </div>

            {/* Overrides Table */}
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Database Rules Applied
              </div>
              <div className="divide-y divide-border/60">
                {verifiedResponse?.appliedPrices?.map((rule, idx) => {
                  let label = rule.channelTarget;
                  if (rule.channelTarget === 'OREEDU_PMS') label = 'Oreedu Front-Desk PMS';
                  else if (rule.channelTarget === 'OREEDU_OTA_PORTAL') label = 'Oreedu Direct OTA';
                  else if (rule.channelTarget === 'OREEDU_CP_PORTAL') label = 'Oreedu CP Portal';
                  else if (rule.channelTarget === 'ALL') label = 'All Channels (Master)';
                  else {
                    const matchedOta = activeOtas.find(o => (o.id || o.channelId || o.channelName) === rule.channelTarget);
                    if (matchedOta) label = matchedOta.title || matchedOta.channelName;
                  }

                  return (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        {label}
                      </span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(rule.adjustmentValue).toLocaleString()} active
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channex Sync Feedback */}
            {verifiedResponse?.channexSync?.details && verifiedResponse.channexSync.details.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Channex Live OTA Feedback</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Delta ARI</span>
                </div>
                <div className="divide-y divide-border/60">
                  {verifiedResponse.channexSync.details.map((sync, idx) => (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {sync.channelName || `Channel ${sync.channelId}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {sync.status} (₹{sync.price.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
          {stage === 'EDIT' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStage('CONFIRM')}
                disabled={hasValidationErrors()}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Review Changes →
              </button>
            </>
          )}

          {stage === 'CONFIRM' && (
            <>
              <button
                type="button"
                onClick={() => setStage('EDIT')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmAndPush}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Pushing to Channels...
                  </>
                ) : (
                  <>
                    Confirm & Apply Tariffs Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </>
          )}

          {stage === 'VERIFIED_SUCCESS' && (
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer transition-all"
            >
              Done & Refresh Matrix
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
