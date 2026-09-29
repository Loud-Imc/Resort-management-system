import React, { useState, useEffect } from 'react';
import { X, Sparkles, DollarSign, Globe, Calendar, Layers } from 'lucide-react';
import { ratePlansService, type RatePlan } from '../services/ratePlans';
import { channelsService } from '../services/channels';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface BulkRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomTypes?: RoomType[];
  ratePlans?: RatePlan[];
  onSuccess: () => void;
}

export const BulkRatesModal: React.FC<BulkRatesModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypeId,
  roomTypes = [],
  // ratePlans = [],
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

  // Pricing inputs
  const [nonAcPrice, setNonAcPrice] = useState<number | ''>(3000);
  const [acPrice, setAcPrice] = useState<number | ''>(3500);

  // Festival surge
  const [isFestivalRule, setIsFestivalRule] = useState<boolean>(false);
  const [festivalName, setFestivalName] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (roomTypeId) {
      setSelectedRoomTypeId(roomTypeId);
    } else if (roomTypes.length > 0 && (!selectedRoomTypeId || selectedRoomTypeId === 'ALL')) {
      setSelectedRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypeId, isOpen, roomTypes]);

  // Update default prices based on selected room
  useEffect(() => {
    if (selectedRoomTypeId && selectedRoomTypeId !== 'ALL') {
      const rt = roomTypes.find((r) => r.id === selectedRoomTypeId);
      if (rt) {
        setNonAcPrice(Number(rt.basePrice) || 3000);
        setAcPrice(Number(rt.basePriceAc || rt.basePrice) || 3500);
      }
    }
  }, [selectedRoomTypeId, roomTypes]);

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

  const targetRoomType = roomTypes.find((r) => r.id === selectedRoomTypeId) || roomTypes[0];
  const isDualAc = targetRoomType ? targetRoomType.acOption === 'BOTH' : true;
  const isAcOnly = targetRoomType ? targetRoomType.acOption === 'AC_ONLY' : false;

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
    if (!selectedRoomTypeId || selectedRoomTypeId === 'ALL') {
      toast.error('Please select a specific room category.');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('Please select at least one day of the week.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date.');
      return;
    }

    if (!isAcOnly && (nonAcPrice === '' || Number(nonAcPrice) < 0)) {
      toast.error('Please enter a valid Non-AC price.');
      return;
    }

    if ((isDualAc || isAcOnly) && (acPrice === '' || Number(acPrice) < 0)) {
      toast.error('Please enter a valid AC price.');
      return;
    }

    setSubmitting(true);
    try {
      const targetRtId = selectedRoomTypeId;
      const targetChannel = selectedChannelId === 'ALL' ? undefined : selectedChannelId;

      // Primary tariff submission
      await ratePlansService.applyBulkPricingRule({
        propertyId,
        roomTypeId: targetRtId,
        channelId: targetChannel,
        startDate,
        endDate,
        daysOfWeek: selectedDays,
        price: isAcOnly ? Number(acPrice) : Number(nonAcPrice),
        isFestivalRule,
        festivalName: isFestivalRule ? festivalName : undefined,
      });

      toast.success('💰 Seasonal base rates applied & synced to channels!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply seasonal rates');
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
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Seasonal & Weekend Pricing
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {targetRoomType?.name || 'Room Category'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Set seasonal tariffs, weekend surge prices & festival rates for this room
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
                <Layers className="h-3.5 w-3.5" /> Target Room Category
              </label>
              {roomTypeId ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="truncate">🏨 {roomTypes.find((r) => r.id === roomTypeId)?.name || 'Selected Room'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-primary/20 text-primary shrink-0">Locked</span>
                </div>
              ) : (
                <select
                  value={selectedRoomTypeId}
                  onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      🏨 {rt.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-primary" /> Target Channels
              </label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌐 All Channels (Direct + OTAs)</option>
                <option value="PMS_ONLY">🔒 Direct Booking Only (PMS/Oreedu)</option>
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
              <Calendar className="h-3.5 w-3.5" /> Applicable Date Range
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
                📅 Mon–Thu (Weekdays)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKENDS')}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                🎉 Fri–Sun (Weekends)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('ALL')}
                className="py-1.5 px-2.5 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                ⚡ Everyday
              </button>
            </div>

            {/* Individual Day Toggles */}
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
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing Inputs */}
          <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
              💰 Nightly Room Tariffs (Base Price)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isAcOnly && (
                <div>
                  <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    🍃 Non-AC Base Rate (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={nonAcPrice}
                      onChange={(e) => setNonAcPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 2500"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-xs font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {(isDualAc || isAcOnly) && (
                <div>
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                    ❄️ AC Base Rate (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={acPrice}
                      onChange={(e) => setAcPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 3500"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-xs font-black font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              💡 Meal supplements (CP, MAP, AP) are added on top per guest automatically.
            </p>
          </div>

          {/* Festival Surge Label (Optional) */}
          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFestivalRule}
                  onChange={(e) => setIsFestivalRule(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Mark as Festival or Special Event Rate
                </span>
              </label>
            </div>

            {isFestivalRule && (
              <input
                type="text"
                value={festivalName}
                onChange={(e) => setFestivalName(e.target.value)}
                placeholder="e.g. Diwali Surge, New Year Weekend, Independence Day"
                className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            )}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Applying Rates...' : 'Apply Seasonal Rates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
