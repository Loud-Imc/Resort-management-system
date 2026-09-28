import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Globe, Calendar, Layers, Clock, AlertTriangle } from 'lucide-react';
import { ratePlansService } from '../services/ratePlans';
import { channelsService } from '../services/channels';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface StayRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomTypes?: RoomType[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialAction?: 'min_stay' | 'max_stay' | 'cta' | 'ctd';
  onSuccess: () => void;
}

export const StayRestrictionsModal: React.FC<StayRestrictionsModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypeId,
  roomTypes = [],
  initialStartDate,
  initialEndDate,
  initialAction,
  onSuccess,
}) => {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ALL');
  const [activeOtas, setActiveOtas] = useState<Array<{ id: string; title: string; otaName?: string }>>([]);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Restriction Controls
  const [minStay, setMinStay] = useState<number | ''>('');
  const [maxStay, setMaxStay] = useState<number | ''>('');
  const [closedToArrival, setClosedToArrival] = useState<boolean>(false);
  const [closedToDeparture, setClosedToDeparture] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);

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
      const parts = initialStartDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        setSelectedDays([d.getDay()]);
      }
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setEndDate(d.toISOString().split('T')[0]);
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    }

    if (initialAction === 'cta') {
      setClosedToArrival(true);
      setClosedToDeparture(false);
      setMinStay('');
      setMaxStay('');
    } else if (initialAction === 'ctd') {
      setClosedToArrival(false);
      setClosedToDeparture(true);
      setMinStay('');
      setMaxStay('');
    } else if (initialAction === 'min_stay') {
      setMinStay(2);
      setMaxStay('');
      setClosedToArrival(false);
      setClosedToDeparture(false);
    } else if (initialAction === 'max_stay') {
      setMinStay('');
      setMaxStay(7);
      setClosedToArrival(false);
      setClosedToDeparture(false);
    } else {
      setMinStay('');
      setMaxStay('');
      setClosedToArrival(false);
      setClosedToDeparture(false);
    }
  }, [isOpen, roomTypeId, initialStartDate, initialEndDate, initialAction]);

  useEffect(() => {
    if (propertyId && isOpen) {
      channelsService
        .getActiveOtas(propertyId)
        .then((data) => {
          if (Array.isArray(data)) setActiveOtas(data);
        })
        .catch(() => {});
    }
  }, [propertyId, isOpen]);

  if (!isOpen) return null;

  const handleSelectPresetDays = (preset: 'WEEKDAYS' | 'WEEKENDS' | 'ALL') => {
    if (preset === 'WEEKDAYS') {
      setSelectedDays([1, 2, 3, 4]); // Mon-Thu
    } else if (preset === 'WEEKENDS') {
      setSelectedDays([5, 6, 0]); // Fri-Sun
    } else {
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const dayLabels = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 0, label: 'Sun' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day of the week.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    if (minStay === '' && maxStay === '' && !closedToArrival && !closedToDeparture) {
      toast.error('Please configure at least one restriction rule (Min Stay, Max Stay, CTA, or CTD).');
      return;
    }

    setSubmitting(true);
    try {
      const targetRtId = selectedRoomTypeId === 'ALL' ? undefined : selectedRoomTypeId;
      const targetChannel = selectedChannelId === 'ALL' ? undefined : selectedChannelId;

      await ratePlansService.applyBulkPricingRule({
        propertyId,
        roomTypeId: targetRtId,
        channelId: targetChannel,
        startDate,
        endDate,
        daysOfWeek: selectedDays,
        minStayArrival: minStay !== '' ? Number(minStay) : undefined,
        maxStay: maxStay !== '' ? Number(maxStay) : undefined,
        closedToArrival,
        closedToDeparture,
      });

      toast.success('🛡️ Stay restrictions saved & synced to channels!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply stay restrictions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Stay Restrictions Manager
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Rules & Controls
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure minimum stay lengths and check-in/check-out boundaries
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Target Room Type & Target Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> Scope
              </label>
              <select
                value={selectedRoomTypeId}
                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🏨 Entire Resort (All Room Types)</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-primary" /> Channels
              </label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌐 All Channels (Direct + OTAs)</option>
                <option value="PMS_ONLY">🔒 Direct Booking Only</option>
                {activeOtas.map((ota) => (
                  <option key={ota.id} value={ota.id}>
                    {ota.title || ota.otaName || ota.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground">From Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">To Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quick Day Presets */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
              Apply To Days of Week
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKDAYS')}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                📅 Weekdays (Mon–Thu)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKENDS')}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                🎉 Weekends (Fri–Sun)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('ALL')}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                ⚡ Everyday
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {dayLabels.map((d) => {
                const isSelected = selectedDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Length of Stay Controls */}
          <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Length of Stay (LOS)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Minimum Stay (Nights)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2 nights"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  e.g., Require 2+ nights for weekend bookings.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Maximum Stay (Nights)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={maxStay}
                  onChange={(e) => setMaxStay(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Optional (e.g. 14)"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Cap length of consecutive nights allowed.
                </span>
              </div>
            </div>
          </div>

          {/* Arrival / Departure Controls (CTA / CTD) */}
          <div className="p-4 bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Arrival & Departure Gates
            </h4>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={closedToArrival}
                  onChange={(e) => setClosedToArrival(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Closed to Arrival (CTA)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Guests cannot start their stay on these days (check-in forbidden), but guests staying through are allowed.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={closedToDeparture}
                  onChange={(e) => setClosedToDeparture(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Closed to Departure (CTD)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Guests cannot end their stay on these days (check-out forbidden). Often used on peak holiday nights.
                  </span>
                </div>
              </label>
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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Applying Restrictions...' : 'Save Stay Restrictions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
