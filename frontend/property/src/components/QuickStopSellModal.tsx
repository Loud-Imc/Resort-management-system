import React, { useState, useEffect } from 'react';
import {
  X,
  Ban,
  CheckCircle2,
  Globe,
  Calendar,
  Layers,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { ratePlansService, type RateRestrictionLog } from '../services/ratePlans';
import { channelsService } from '../services/channels';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface QuickStopSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomTypes?: RoomType[];
  activeOtas?: any[];
  initialStartDate?: string;
  initialEndDate?: string;
  onSuccess: () => void;
}

export const QuickStopSellModal: React.FC<QuickStopSellModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypeId,
  roomTypes = [],
  activeOtas = [],
  initialStartDate,
  initialEndDate,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'CLOSE' | 'REOPEN'>('CLOSE');

  // Close Sales state
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [loadedOtas, setLoadedOtas] = useState<Array<{ id: string; title: string; otaName?: string }>>([]);

  const resolvedOtas = (activeOtas && activeOtas.length > 0)
    ? activeOtas
    : loadedOtas;

  const [targetOreeduOta, setTargetOreeduOta] = useState<boolean>(true);
  const [targetOreeduCp, setTargetOreeduCp] = useState<boolean>(true);
  const [targetOreeduPms, setTargetOreeduPms] = useState<boolean>(false);
  const [selectedOtaIds, setSelectedOtaIds] = useState<string[]>([]);

  const [datePreset, setDatePreset] = useState<'TODAY' | 'WEEKEND' | '7DAYS' | '30DAYS' | 'CUSTOM'>('CUSTOM');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Active closeouts state for Re-open tab
  const [activeCloseouts, setActiveCloseouts] = useState<RateRestrictionLog[]>([]);
  const [loadingCloseouts, setLoadingCloseouts] = useState<boolean>(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (roomTypeId) {
      setSelectedRoomTypeId(roomTypeId);
    } else {
      setSelectedRoomTypeId('ALL');
    }

    if (initialStartDate) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate || initialStartDate);
      setDatePreset('CUSTOM');
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setEndDate(d.toISOString().split('T')[0]);
      setDatePreset('7DAYS');
    }
  }, [isOpen, roomTypeId, initialStartDate, initialEndDate]);

  useEffect(() => {
    if (propertyId && isOpen && (!activeOtas || activeOtas.length === 0)) {
      channelsService
        .getActiveOtas(propertyId)
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLoadedOtas(data);
          }
        })
        .catch(() => {});
    }
  }, [propertyId, isOpen, activeOtas]);

  useEffect(() => {
    if (isOpen) {
      setSelectedOtaIds(resolvedOtas.map((o) => o.id));
    }
  }, [isOpen, resolvedOtas.length]);

  const handleSelectAllChannels = () => {
    setTargetOreeduOta(true);
    setTargetOreeduCp(true);
    setTargetOreeduPms(true);
    setSelectedOtaIds(resolvedOtas.map((o) => o.id));
  };

  const handleDeselectAllChannels = () => {
    setTargetOreeduOta(false);
    setTargetOreeduCp(false);
    setTargetOreeduPms(false);
    setSelectedOtaIds([]);
  };

  const fetchActiveCloseouts = async () => {
    if (!propertyId) return;
    setLoadingCloseouts(true);
    try {
      const res = await ratePlansService.getRateRestrictionLogs(propertyId, {
        actionType: 'STOP_SELL',
        limit: 30,
      });
      if (res && Array.isArray(res.logs)) {
        setActiveCloseouts(res.logs);
      }
    } catch {
      // silently handle
    } finally {
      setLoadingCloseouts(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'REOPEN') {
      fetchActiveCloseouts();
    }
  }, [isOpen, activeTab, propertyId]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: 'TODAY' | 'WEEKEND' | '7DAYS' | '30DAYS') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEKEND') {
      const currentDay = today.getDay();
      const daysUntilFri = (5 - currentDay + 7) % 7;
      const fri = new Date(today);
      fri.setDate(today.getDate() + daysUntilFri);
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);
      setStartDate(fri.toISOString().split('T')[0]);
      setEndDate(sun.toISOString().split('T')[0]);
    } else if (preset === '7DAYS') {
      const d = new Date(today);
      d.setDate(today.getDate() + 6);
      setStartDate(todayStr);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (preset === '30DAYS') {
      const d = new Date(today);
      d.setDate(today.getDate() + 29);
      setStartDate(todayStr);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleCloseSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    const channelTargets: string[] = [];
    if (targetOreeduOta) channelTargets.push('OREEDU_OTA_PORTAL');
    if (targetOreeduCp) channelTargets.push('OREEDU_CP_PORTAL');
    if (targetOreeduPms) channelTargets.push('OREEDU_PMS');
    channelTargets.push(...selectedOtaIds);

    if (channelTargets.length === 0) {
      toast.error('Please select at least one channel to close.');
      return;
    }

    setSubmitting(true);
    try {
      const targetRtId = selectedRoomTypeId === 'ALL' ? undefined : selectedRoomTypeId;

      await ratePlansService.applyBulkPricingRule({
        propertyId,
        roomTypeId: targetRtId,
        channelTargets,
        startDate,
        endDate,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        stopSell: true,
      });

      toast.success('🛑 Stop Sell applied: Bookings closed successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply stop-sell');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenRecord = async (log: RateRestrictionLog) => {
    setReopeningId(log.id);
    try {
      await ratePlansService.applyBulkPricingRule({
        propertyId,
        roomTypeId: log.roomTypeId || undefined,
        channelId: log.channelId || undefined,
        startDate: log.startDate.split('T')[0],
        endDate: log.endDate.split('T')[0],
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        stopSell: false,
      });

      toast.success(`🟢 Sales reopened for ${log.roomTypeName || 'All Rooms'}!`);
      await fetchActiveCloseouts();
      onSuccess();
    } catch (err: any) {
      toast.error('Failed to reopen sales');
    } finally {
      setReopeningId(null);
    }
  };

  const selectedRtName =
    selectedRoomTypeId === 'ALL'
      ? 'Entire Resort (All Rooms)'
      : roomTypes.find((r) => r.id === selectedRoomTypeId)?.name || 'Selected Room';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className={`p-5 border-b border-border flex items-center justify-between transition-colors ${
            activeTab === 'CLOSE' ? 'bg-rose-500/10' : 'bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                activeTab === 'CLOSE'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {activeTab === 'CLOSE' ? <Ban className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                {activeTab === 'CLOSE' ? 'Quick Stop-Sell (Closeout)' : 'Re-open Booking Sales'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'CLOSE'
                  ? 'Instantly block bookings across OTA channels & PMS'
                  : 'View active closeouts and reopen sales with 1-click'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-border bg-card">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('CLOSE')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CLOSE'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ban className="h-4 w-4" /> 🛑 Close Sales (Stop Sell)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REOPEN')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'REOPEN'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" /> 🟢 Active Closeouts & Re-open
            </button>
          </div>
        </div>

        {/* TAB 1: CLOSE SALES */}
        {activeTab === 'CLOSE' && (
          <form onSubmit={handleCloseSalesSubmit} className="p-6 space-y-5">
            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> Target Inventory Scope
              </label>
              <select
                value={selectedRoomTypeId}
                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🏨 Entire Resort (All Room Types)</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    🛏️ {rt.name} ({rt.rooms?.length || 0} rooms)
                  </option>
                ))}
              </select>
            </div>

            {/* Channel Selection Multi-Checkboxes */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Globe className="h-4 w-4 text-rose-600" /> Target Channels to Close
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllChannels}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground/40">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllChannels}
                    className="text-[11px] font-bold text-muted-foreground hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Group 1: Oreedu Internal Platforms */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏨</span> Oreedu Platforms (Internal)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Oreedu Direct OTA */}
                  <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduOta ? 'border-rose-500/50 bg-rose-500/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={targetOreeduOta}
                        onChange={(e) => setTargetOreeduOta(e.target.checked)}
                        className="rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-foreground truncate">
                          🌐 Oreedu Direct
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Guest booking engine
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Oreedu CP */}
                  <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduCp ? 'border-rose-500/50 bg-rose-500/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={targetOreeduCp}
                        onChange={(e) => setTargetOreeduCp(e.target.checked)}
                        className="rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-foreground truncate">
                          🏢 Oreedu CP
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          B2B & corporate packages
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Oreedu PMS (Front Desk) */}
                  <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduPms ? 'border-rose-500/50 bg-rose-500/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={targetOreeduPms}
                        onChange={(e) => setTargetOreeduPms(e.target.checked)}
                        className="rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-foreground truncate">
                          🛎️ Front Desk PMS
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Staff walk-in desk
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Group 2: External OTAs Section */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌍</span> External OTAs (via Channex)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {resolvedOtas.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center flex flex-col items-center justify-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        🌐 No external OTAs connected
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        Connect external channels (like Booking.com, Agoda) in Channel Manager settings to apply stop-sell to them.
                      </span>
                    </div>
                  ) : (
                    resolvedOtas.map((ota) => {
                      const isChecked = selectedOtaIds.includes(ota.id);
                      return (
                        <label key={ota.id} className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${isChecked ? 'border-rose-500/50 bg-rose-500/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOtaIds([...selectedOtaIds, ota.id]);
                              } else {
                                setSelectedOtaIds(selectedOtaIds.filter((id) => id !== ota.id));
                              }
                            }}
                            className="rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-foreground flex items-center gap-1 truncate">
                              🌍 {ota.title || ota.otaName || ota.id}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Live OTA via Channex</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Date Selection
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('TODAY')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    datePreset === 'TODAY'
                      ? 'bg-primary text-primary-foreground border-primary font-black'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Today Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('WEEKEND')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    datePreset === 'WEEKEND'
                      ? 'bg-primary text-primary-foreground border-primary font-black'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  This Weekend
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('7DAYS')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    datePreset === '7DAYS'
                      ? 'bg-primary text-primary-foreground border-primary font-black'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Next 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('30DAYS')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    datePreset === '30DAYS'
                      ? 'bg-primary text-primary-foreground border-primary font-black'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Next 30 Days
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">From Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">To Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Impact Banner */}
            <div className="p-3 rounded-2xl border text-xs flex items-center gap-2.5 bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">
                  Closing sales for {selectedRtName} from {startDate} to {endDate}.
                </p>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-2 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Applying...' : '🛑 Confirm Stop Sell'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ACTIVE CLOSEOUTS & RE-OPEN */}
        {activeTab === 'REOPEN' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wide">
                  Active Closeouts for this Property
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Click Reopen on any period to restore booking sales across channels
                </p>
              </div>
              <button
                type="button"
                onClick={fetchActiveCloseouts}
                disabled={loadingCloseouts}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted cursor-pointer"
                title="Refresh closeouts"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCloseouts ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingCloseouts ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                Loading active closeouts...
              </div>
            ) : activeCloseouts.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl flex flex-col items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-emerald-500" />
                <p className="font-bold text-foreground">No Active Stop-Sells Found</p>
                <p className="text-[11px]">
                  All room types and dates are currently open for booking.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeCloseouts.map((item) => {
                  const s = item.startDate ? item.startDate.split('T')[0] : '';
                  const e = item.endDate ? item.endDate.split('T')[0] : '';
                  const isReopening = reopeningId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-foreground truncate">
                            {item.roomTypeName || 'All Room Types'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            🛑 Stop Sell
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {s === e ? s : `${s} → ${e}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-primary" />
                            {item.channelName || 'All Channels'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReopenRecord(item)}
                        disabled={isReopening}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isReopening ? 'Reopening...' : 'Re-open Sales'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
