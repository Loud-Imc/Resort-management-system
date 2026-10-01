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
} from 'lucide-react';
import {
  ratePlansService,
  type ChannelAllotmentItem,
  type MultiChannelInventoryOverrideResponse,
} from '../services/ratePlans';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface ChannelRowState {
  enabled: boolean;
  quantity: string;
}

export interface ChannelInventoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomType: RoomType;
  dateStr: string;
  totalRooms: number;
  bookedCount: number;
  availableCount: number;
  existingChannelOverrides?: Record<string, number>;
  activeOtas: any[];
  onSuccess: () => void;
}

type ModalStage = 'EDIT' | 'CONFIRM' | 'VERIFIED_SUCCESS';

export const ChannelInventoryEditorModal: React.FC<ChannelInventoryEditorModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomType,
  dateStr,
  totalRooms,
  bookedCount,
  availableCount,
  existingChannelOverrides = {},
  activeOtas = [],
  onSuccess,
}) => {
  const [stage, setStage] = useState<ModalStage>('EDIT');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Channel row states
  const [allMaster, setAllMaster] = useState<ChannelRowState>({
    enabled: false,
    quantity: String(existingChannelOverrides['ALL'] ?? availableCount),
  });

  const [oreeduOta, setOreeduOta] = useState<ChannelRowState>({
    enabled: true,
    quantity: String(existingChannelOverrides['OREEDU_OTA_PORTAL'] ?? availableCount),
  });

  const [oreeduCp, setOreeduCp] = useState<ChannelRowState>({
    enabled: true,
    quantity: String(existingChannelOverrides['OREEDU_CP_PORTAL'] ?? availableCount),
  });

  const [externalOtasState, setExternalOtasState] = useState<Record<string, ChannelRowState>>({});
  const [verifiedResponse, setVerifiedResponse] = useState<MultiChannelInventoryOverrideResponse | null>(null);

  // Initialize form when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setStage('EDIT');
      setIsSubmitting(false);
      setVerifiedResponse(null);

      const initialQty = String(existingChannelOverrides['ALL'] ?? availableCount);

      const otaVal = String(existingChannelOverrides['OREEDU_OTA_PORTAL'] ?? initialQty);
      const cpVal = String(existingChannelOverrides['OREEDU_CP_PORTAL'] ?? initialQty);

      const initialExt: Record<string, ChannelRowState> = {};
      const extVals: string[] = [];
      activeOtas.forEach((ota) => {
        const targetKey = ota.id || ota.channelId || ota.channelName;
        const existingVal = existingChannelOverrides[targetKey];
        const val = String(existingVal !== undefined ? existingVal : initialQty);
        extVals.push(val);
        initialExt[targetKey] = {
          enabled: true,
          quantity: val,
        };
      });
      setExternalOtasState(initialExt);

      const allQuantities = [otaVal, cpVal, ...extVals];
      const allIdentical = allQuantities.length > 0 && allQuantities.every(q => q === allQuantities[0]);

      setAllMaster({
        enabled: allIdentical,
        quantity: allIdentical ? allQuantities[0] : initialQty,
      });

      setOreeduOta({
        enabled: true,
        quantity: otaVal,
      });

      setOreeduCp({
        enabled: true,
        quantity: cpVal,
      });
    }
  }, [isOpen, dateStr, roomType?.id, availableCount, totalRooms, activeOtas, existingChannelOverrides]);

  if (!isOpen) return null;

  // Rule 1: When user toggles ALL CHANNELS, all other channels are automatically toggled
  // and the inventory count in ALL is automatically propagated to all other channels
  const handleToggleAllMaster = (checked: boolean) => {
    setAllMaster(prev => ({ ...prev, enabled: checked }));
    const qty = allMaster.quantity;

    setOreeduOta(prev => ({ ...prev, enabled: checked, quantity: checked ? qty : prev.quantity }));
    setOreeduCp(prev => ({ ...prev, enabled: checked, quantity: checked ? qty : prev.quantity }));
    setExternalOtasState(prev => {
      const next: Record<string, ChannelRowState> = {};
      for (const k of Object.keys(prev)) {
        next[k] = { ...prev[k], enabled: checked, quantity: checked ? qty : prev[k].quantity };
      }
      return next;
    });
  };

  // Rule 1b: When typing into ALL CHANNELS field, automatically apply to all other channel fields
  const handleMasterQuantityChange = (val: string) => {
    setAllMaster(prev => ({ ...prev, quantity: val }));
    setOreeduOta(prev => ({ ...prev, quantity: val }));
    setOreeduCp(prev => ({ ...prev, quantity: val }));
    setExternalOtasState(prev => {
      const next: Record<string, ChannelRowState> = {};
      for (const k of Object.keys(prev)) {
        next[k] = { ...prev[k], quantity: val };
      }
      return next;
    });
  };

  // Rule 2: If any one channel is unticked, ALL CHANNELS must automatically be unticked.
  // If all channels become ticked, ALL CHANNELS becomes ticked.
  const handleToggleOreeduOta = (checked: boolean) => {
    setOreeduOta(prev => ({ ...prev, enabled: checked }));
    if (!checked) {
      setAllMaster(prev => ({ ...prev, enabled: false }));
    } else {
      const allExtChecked = Object.values(externalOtasState).every(s => s.enabled);
      if (oreeduCp.enabled && allExtChecked) {
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
      if (oreeduOta.enabled && allExtChecked) {
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
        if (oreeduOta.enabled && oreeduCp.enabled && allExtChecked) {
          setAllMaster(m => ({ ...m, enabled: true }));
        }
      }
      return next;
    });
  };

  // Validation checks
  const validateQuantity = (valStr: string): { isValid: boolean; error?: string } => {
    if (valStr.trim() === '') return { isValid: false, error: 'Required' };
    const num = Number(valStr);
    if (isNaN(num)) return { isValid: false, error: 'Must be a number' };
    if (num < 0) return { isValid: false, error: 'Cannot be negative' };
    if (num > totalRooms) return { isValid: false, error: `Exceeds max physical capacity (${totalRooms})` };
    return { isValid: true };
  };

  // Collect planned allocations
  const getPlannedAllocations = (): ChannelAllotmentItem[] => {
    const allocations: ChannelAllotmentItem[] = [];

    if (allMaster.enabled) {
      allocations.push({
        channelTarget: 'ALL',
        allocatedQuantity: Number(allMaster.quantity),
      });
    }

    if (oreeduOta.enabled) {
      allocations.push({
        channelTarget: 'OREEDU_OTA_PORTAL',
        allocatedQuantity: Number(oreeduOta.quantity),
      });
    }

    if (oreeduCp.enabled) {
      allocations.push({
        channelTarget: 'OREEDU_CP_PORTAL',
        allocatedQuantity: Number(oreeduCp.quantity),
      });
    }

    for (const [key, state] of Object.entries(externalOtasState)) {
      if (state.enabled) {
        allocations.push({
          channelTarget: key,
          allocatedQuantity: Number(state.quantity),
        });
      }
    }

    return allocations;
  };

  // Check if form is valid to proceed to Stage 2
  const hasValidationErrors = (): boolean => {
    if (allMaster.enabled && !validateQuantity(allMaster.quantity).isValid) return true;
    if (oreeduOta.enabled && !validateQuantity(oreeduOta.quantity).isValid) return true;
    if (oreeduCp.enabled && !validateQuantity(oreeduCp.quantity).isValid) return true;

    for (const state of Object.values(externalOtasState)) {
      if (state.enabled && !validateQuantity(state.quantity).isValid) return true;
    }

    const planned = getPlannedAllocations();
    return planned.length === 0;
  };

  // Handle Submit to Backend in Stage 2
  const handleConfirmAndPush = async () => {
    setIsSubmitting(true);
    try {
      const allocations = getPlannedAllocations();
      const response = await ratePlansService.setMultiChannelInventoryOverride({
        propertyId,
        roomTypeId: roomType.id,
        date: dateStr,
        allocations,
      });

      setVerifiedResponse(response);
      setStage('VERIFIED_SUCCESS');
      toast.success('Channel inventory updated & synchronized!');
    } catch (err: any) {
      console.error('Failed to set multi-channel inventory override:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to update channel inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
                Channel Inventory Allotment
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-muted text-foreground">
                  {roomType.name}
                </span>
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {dateStr}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Capacity Context Pill */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-muted/50 border border-border/60 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Physical Capacity:</span>
            <span className="font-black text-foreground">{totalRooms} Rooms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Booked / Blocked:</span>
            <span className="font-black text-amber-600 dark:text-amber-400">{bookedCount} Rooms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Currently Unbooked:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">{availableCount} Rooms</span>
          </div>
        </div>

        {/* STAGE 1: MULTI-CHANNEL INVENTORY EDITOR */}
        {stage === 'EDIT' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Master All Channels Row */}
            <div className="p-3.5 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allMaster.enabled}
                    onChange={(e) => handleToggleAllMaster(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      ALL CHANNELS (Master Fill / House Allotment)
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Quick-fill or set global ceiling across every channel
                    </span>
                  </div>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totalRooms}
                    disabled={!allMaster.enabled}
                    value={allMaster.quantity}
                    onChange={(e) => handleMasterQuantityChange(e.target.value)}
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-sm font-black text-center focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder="Cap"
                  />
                  <span className="text-xs font-bold text-muted-foreground">rooms</span>
                </div>
              </div>
            </div>

            {/* Oreedu Internal Channels Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Oreedu Internal Platforms
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Direct Ecosystem
                </span>
              </div>

              {/* Oreedu Direct OTA Portal */}
              <div className="p-3 rounded-2xl border border-border/80 bg-background/50 hover:bg-muted/30 transition-all flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={oreeduOta.enabled}
                    onChange={(e) => handleToggleOreeduOta(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      Oreedu Direct OTA Portal (Direct Website)
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Guests booking directly on oreedu.com
                    </span>
                  </div>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totalRooms}
                    disabled={!oreeduOta.enabled}
                    value={oreeduOta.quantity}
                    onChange={(e) => setOreeduOta(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-sm font-black text-center focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs font-bold text-muted-foreground">rooms</span>
                </div>
              </div>

              {/* Oreedu CP Partner Portal */}
              <div className="p-3 rounded-2xl border border-border/80 bg-background/50 hover:bg-muted/30 transition-all flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={oreeduCp.enabled}
                    onChange={(e) => handleToggleOreeduCp(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                      Oreedu CP Portal (Channel Partner / Agents)
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      B2B travel agents & corporate partners
                    </span>
                  </div>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totalRooms}
                    disabled={!oreeduCp.enabled}
                    value={oreeduCp.quantity}
                    onChange={(e) => setOreeduCp(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-sm font-black text-center focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs font-bold text-muted-foreground">rooms</span>
                </div>
              </div>

              {/* Note on PMS Master Access */}
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Oreedu PMS Front Desk:</strong> Unrestricted Master Access. Staff always have access to 100% of remaining unbooked rooms ({availableCount} rooms available).
                </span>
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
                  const row = externalOtasState[targetKey] || { enabled: true, quantity: String(availableCount) };
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
                        <input
                          type="number"
                          min={0}
                          max={totalRooms}
                          disabled={!row.enabled}
                          value={row.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExternalOtasState(prev => ({
                              ...prev,
                              [targetKey]: { ...row, quantity: val },
                            }));
                          }}
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-border bg-background text-sm font-black text-center focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs font-bold text-muted-foreground">rooms</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STAGE 2: PRE-COMMIT CONFIRMATION & DIFF MODAL */}
        {stage === 'CONFIRM' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Review Inventory Allocations:</strong>
                <p className="mt-0.5 leading-snug">
                  Please verify the proposed channel limits before pushing updates to the database and external OTAs.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground grid grid-cols-2">
                <span>Channel Target</span>
                <span className="text-right">Allotted Inventory</span>
              </div>
              <div className="divide-y divide-border/60">
                {allMaster.enabled && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs bg-primary/5">
                    <span className="font-black text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      All Channels (Master)
                    </span>
                    <span className="font-mono font-black text-primary px-2.5 py-0.5 rounded-md bg-primary/10">
                      {allMaster.quantity} rooms
                    </span>
                  </div>
                )}

                {oreeduOta.enabled && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      Oreedu Direct OTA
                    </span>
                    <span className="font-mono font-black text-foreground px-2.5 py-0.5 rounded-md bg-muted">
                      {oreeduOta.quantity} rooms
                    </span>
                  </div>
                )}

                {oreeduCp.enabled && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                      Oreedu CP Portal
                    </span>
                    <span className="font-mono font-black text-foreground px-2.5 py-0.5 rounded-md bg-muted">
                      {oreeduCp.quantity} rooms
                    </span>
                  </div>
                )}

                {activeOtas.map((ota) => {
                  const targetKey = ota.id || ota.channelId || ota.channelName;
                  const row = externalOtasState[targetKey];
                  if (!row || !row.enabled) return null;
                  return (
                    <div key={targetKey} className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-amber-500" />
                        {ota.title || ota.channelName}
                      </span>
                      <span className="font-mono font-black text-foreground px-2.5 py-0.5 rounded-md bg-muted">
                        {row.quantity} rooms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/60 text-[11px] text-muted-foreground space-y-1">
              <p>
                🔒 <strong>Hard Capacity Rule:</strong> Total bookings can never exceed {totalRooms} physical rooms.
              </p>
              <p>
                ⚡ <strong>Sync Note:</strong> External channels will receive an immediate Channex ARI push upon confirmation.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 3: POST-SYNC VERIFIED SUCCESS MODAL */}
        {stage === 'VERIFIED_SUCCESS' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-black text-sm">Inventory Synchronized Successfully</h5>
                <p className="text-xs mt-0.5 leading-snug">
                  All channel allotment caps have been written to the database and verified.
                </p>
              </div>
            </div>

            {/* Overrides Table */}
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Database Overrides Applied
              </div>
              <div className="divide-y divide-border/60">
                {verifiedResponse?.appliedAllocations?.map((alloc, idx) => {
                  let label = alloc.channelTarget;
                  if (alloc.channelTarget === 'OREEDU_OTA_PORTAL') label = 'Oreedu Direct OTA';
                  else if (alloc.channelTarget === 'OREEDU_CP_PORTAL') label = 'Oreedu CP Portal';
                  else if (alloc.channelTarget === 'ALL') label = 'All Channels (Master)';
                  else {
                    const matchedOta = activeOtas.find(o => (o.id || o.channelId || o.channelName) === alloc.channelTarget);
                    if (matchedOta) label = matchedOta.title || matchedOta.channelName;
                  }

                  return (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        {label}
                      </span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {alloc.allocatedQuantity} rooms active
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channex Sync Feedback */}
            {verifiedResponse?.channexSyncResults && verifiedResponse.channexSyncResults.length > 0 && (
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Channex Live OTA Feedback</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">2-Way Sync</span>
                </div>
                <div className="divide-y divide-border/60">
                  {verifiedResponse.channexSyncResults.map((sync, idx) => (
                    <div key={idx} className="px-4 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {sync.channelName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {sync.success ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Ack 200 OK
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                            Sync Warning
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-center text-muted-foreground">
              Sync Completed At: {verifiedResponse?.timestamp ? new Date(verifiedResponse.timestamp).toLocaleString() : new Date().toLocaleString()}
            </p>
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
                Apply Changes →
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
                    Confirm & Push to Channels
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
