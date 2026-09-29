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
  initialStartDate,
  initialEndDate,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'CLOSE' | 'REOPEN'>('CLOSE');

  // Close Sales state
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [channelScope, setChannelScope] = useState<'ALL' | 'OTAS_ONLY' | 'SPECIFIC'>('ALL');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [activeOtas, setActiveOtas] = useState<Array<{ id: string; title: string; otaName?: string }>>([]);

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
    if (propertyId && isOpen) {
      channelsService
        .getActiveOtas(propertyId)
        .then((data) => {
          if (Array.isArray(data)) {
            setActiveOtas(data);
            if (data.length > 0) setSelectedChannelId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [propertyId, isOpen]);

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

    setSubmitting(true);
    try {
      const targetRtId = selectedRoomTypeId === 'ALL' ? undefined : selectedRoomTypeId;

      let targetChannel: string | undefined = undefined;
      if (channelScope === 'OTAS_ONLY') {
        targetChannel = 'OTAS_ONLY';
      } else if (channelScope === 'SPECIFIC') {
        targetChannel = selectedChannelId || undefined;
      }

      await ratePlansService.applyBulkPricingRule({
        propertyId,
        roomTypeId: targetRtId,
        channelId: targetChannel,
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

            {/* Channel Scope Selector */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-primary" /> Affected Channels
              </label>
              <div className="space-y-2">
                <label
                  onClick={() => setChannelScope('ALL')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    channelScope === 'ALL'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="channelScope"
                    checked={channelScope === 'ALL'}
                    onChange={() => setChannelScope('ALL')}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-extrabold block text-foreground">
                      All Channels (Direct Website + OTAs)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Total Blackout: Completely blocks bookings everywhere for this period.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setChannelScope('OTAS_ONLY')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    channelScope === 'OTAS_ONLY'
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="channelScope"
                    checked={channelScope === 'OTAS_ONLY'}
                    onChange={() => setChannelScope('OTAS_ONLY')}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-extrabold block text-foreground">
                      External OTAs Only (Keep Direct Booking Open 🚀)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Commission Saver: Stops OTA sales (Booking.com, MMT, Agoda) while allowing direct bookings on your website.
                    </span>
                  </div>
                </label>

                {activeOtas.length > 0 && (
                  <label
                    onClick={() => setChannelScope('SPECIFIC')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      channelScope === 'SPECIFIC'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="channelScope"
                      checked={channelScope === 'SPECIFIC'}
                      onChange={() => setChannelScope('SPECIFIC')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-extrabold block text-foreground">
                        Specific OTA Only
                      </span>
                      {channelScope === 'SPECIFIC' && (
                        <select
                          value={selectedChannelId}
                          onChange={(e) => setSelectedChannelId(e.target.value)}
                          className="mt-2 w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          {activeOtas.map((ota) => (
                            <option key={ota.id} value={ota.id}>
                              {ota.title || ota.otaName || ota.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}
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
