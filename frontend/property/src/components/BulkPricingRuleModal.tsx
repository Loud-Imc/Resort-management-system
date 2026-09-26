import React, { useState, useEffect } from 'react';
import { X, Sparkles, Sliders, CheckCircle2, ShieldAlert, Ban, Globe, DollarSign, Layers } from 'lucide-react';
import { ratePlansService, type RatePlan } from '../services/ratePlans';
import { channelsService } from '../services/channels';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface BulkPricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomTypes?: RoomType[];
  ratePlans?: RatePlan[];
  onSuccess: () => void;
}

type UpdateMode = 'RATES' | 'RESTRICTIONS' | 'STOP_SELL' | 'ALLOTMENT';

export const BulkPricingRuleModal: React.FC<BulkPricingRuleModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypeId,
  roomTypes = [],
  ratePlans = [],
  onSuccess,
}) => {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ALL');
  const [activeOtas, setActiveOtas] = useState<Array<{ id: string; title: string; otaName?: string }>>([]);
  const [activeMode, setActiveMode] = useState<UpdateMode>('RATES');

  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // All days

  // Mode 1: Nightly Rates
  const [ratePlanId, setRatePlanId] = useState<string>('');
  const [price, setPrice] = useState<number>(3000);
  const [isFestivalRule, setIsFestivalRule] = useState<boolean>(false);
  const [festivalName, setFestivalName] = useState<string>('');

  // Mode 2: Stay Restrictions
  const [minStay, setMinStay] = useState<number | ''>('');
  const [maxStay, setMaxStay] = useState<number | ''>('');
  const [closedToArrival, setClosedToArrival] = useState<boolean>(false);
  const [closedToDeparture, setClosedToDeparture] = useState<boolean>(false);

  // Mode 3: Stop Sell
  const [isStopSellActive, setIsStopSellActive] = useState<boolean>(true);

  // Mode 4: Channel Allotment
  const [allottedQuantity, setAllottedQuantity] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Auto-select room type when modal opens or roomTypeId prop changes
  useEffect(() => {
    if (roomTypeId) {
      setSelectedRoomTypeId(roomTypeId);
    } else {
      setSelectedRoomTypeId('ALL');
    }
  }, [roomTypeId, isOpen]);

  // Dynamically fetch connected OTAs for this property
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

  const selectedTargetRt = selectedRoomTypeId !== 'ALL' ? roomTypes.find((r) => r.id === selectedRoomTypeId) : null;
  const maxPhysical = selectedTargetRt?.rooms
    ? selectedTargetRt.rooms.filter((r) => r.status !== 'MAINTENANCE').length
    : undefined;

  const handleSelectPresetDays = (preset: 'WEEKDAYS' | 'WEEKENDS' | 'ALL') => {
    if (preset === 'WEEKDAYS') {
      setSelectedDays([1, 2, 3, 4]); // Mon, Tue, Wed, Thu
    } else if (preset === 'WEEKENDS') {
      setSelectedDays([5, 6, 0]); // Fri, Sat, Sun
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day of the week.');
      return;
    }

    setSubmitting(true);
    try {
      const targetRoomType = selectedRoomTypeId === 'ALL' ? undefined : selectedRoomTypeId;

      if (activeMode === 'RATES') {
        await ratePlansService.applyBulkPricingRule({
          propertyId,
          roomTypeId: targetRoomType,
          ratePlanId: ratePlanId || undefined,
          channelId: selectedChannelId === 'ALL' ? undefined : selectedChannelId,
          startDate,
          endDate,
          daysOfWeek: selectedDays,
          price: Number(price),
          isFestivalRule,
          festivalName: isFestivalRule ? festivalName : undefined,
        });
        toast.success('Nightly rates applied & synced to channels!');
      } else if (activeMode === 'RESTRICTIONS') {
        await ratePlansService.applyBulkPricingRule({
          propertyId,
          roomTypeId: targetRoomType,
          channelId: selectedChannelId === 'ALL' ? undefined : selectedChannelId,
          startDate,
          endDate,
          daysOfWeek: selectedDays,
          minStayArrival: minStay !== '' ? Number(minStay) : undefined,
          maxStay: maxStay !== '' ? Number(maxStay) : undefined,
          closedToArrival,
          closedToDeparture,
        });
        toast.success('Stay restrictions applied & synced to channels!');
      } else if (activeMode === 'STOP_SELL') {
        await ratePlansService.applyBulkPricingRule({
          propertyId,
          roomTypeId: targetRoomType,
          channelId: selectedChannelId === 'ALL' ? undefined : selectedChannelId,
          startDate,
          endDate,
          daysOfWeek: selectedDays,
          stopSell: isStopSellActive,
        });
        toast.success(
          isStopSellActive
            ? '🛑 Stop Sell applied: Dates closed across channels!'
            : '✅ Stop Sell removed: Dates reopened across channels!'
        );
      } else if (activeMode === 'ALLOTMENT') {
        if (allottedQuantity === '') {
          toast.error('Please specify a valid allotted room quantity.');
          setSubmitting(false);
          return;
        }
        if (Number(allottedQuantity) < 0) {
          toast.error('Allotted rooms cannot be negative.');
          setSubmitting(false);
          return;
        }
        if (maxPhysical !== undefined && Number(allottedQuantity) > maxPhysical) {
          toast.error(`Cannot allocate more than ${maxPhysical} physical rooms for ${selectedTargetRt?.name || 'this room'}.`);
          setSubmitting(false);
          return;
        }
        await ratePlansService.applyBulkPricingRule({
          propertyId,
          roomTypeId: targetRoomType,
          channelId: selectedChannelId === 'ALL' ? undefined : selectedChannelId,
          startDate,
          endDate,
          daysOfWeek: selectedDays,
          allottedQuantity: Number(allottedQuantity),
        });
        toast.success('Channel allotment applied & synced!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply bulk updates');
    } finally {
      setSubmitting(false);
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

  // Resolve available rate plans for dropdown (rate plans are property-level)
  const availablePlans =
    ratePlans && ratePlans.length > 0
      ? ratePlans
      : roomTypes.flatMap((rt) => rt.ratePlans || []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Bulk Rates, Restrictions & Inventory Manager
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage nightly prices, minimum stays, close dates & channel allotments
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
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Target Room Type
              </label>
              <select
                value={selectedRoomTypeId}
                onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🏨 All Room Types ({roomTypes.length})</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-primary" /> Target OTA Channel
              </label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌐 All Channels (Default / Direct + OTAs)</option>
                {activeOtas.map((ota) => (
                  <option key={ota.id} value={ota.id}>
                    {ota.title || ota.otaName || ota.id}
                  </option>
                ))}
                {activeOtas.length === 0 && (
                  <>
                    <option value="MMT">MakeMyTrip (MMT / Goibibo)</option>
                    <option value="BOOKING_COM">Booking.com</option>
                    <option value="AGODA">Agoda</option>
                    <option value="EXPEDIA">Expedia</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Quick Day Presets */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
              Quick Day Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKDAYS')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                📅 Mon – Thu (Weekdays)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKENDS')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🎉 Fri – Sun (Weekends)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('ALL')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ⚡ Everyday
              </button>
            </div>
          </div>

          {/* Days Toggle */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
              Selected Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {dayLabels.map((d) => {
                const isSelected = selectedDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Operational Mode Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
              Select Action Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveMode('RATES')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'RATES'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/30'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Nightly Rates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('RESTRICTIONS')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'RESTRICTIONS'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/30'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Stay Limits</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('STOP_SELL')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'STOP_SELL'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-sm'
                    : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/30'
                }`}
              >
                <Ban className="h-4 w-4" />
                <span>Stop Sell</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('ALLOTMENT')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeMode === 'ALLOTMENT'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/30'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>OTA Allotment</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Nightly Rates Panel */}
          {activeMode === 'RATES' && (
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Target Rate Plan
                  </label>
                  <select
                    value={ratePlanId}
                    onChange={(e) => setRatePlanId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    <option value="">All Rate Plans (Primary EP Base)</option>
                    {availablePlans.map((rp) => (
                      <option key={rp.id} value={rp.id}>
                        {rp.name} ({rp.mealPlan})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Nightly Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Festival / Peak Season Toggle */}
              <div className="pt-2 border-t border-border/40">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <input
                    type="checkbox"
                    checked={isFestivalRule}
                    onChange={(e) => setIsFestivalRule(e.target.checked)}
                    className="rounded text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                  />
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Mark as Festival / High-Demand Peak Season Override
                </label>

                {isFestivalRule && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="e.g. Diwali Peak Season / New Year Special"
                      value={festivalName}
                      onChange={(e) => setFestivalName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-background text-xs font-semibold focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Stay Restrictions Panel */}
          {activeMode === 'RESTRICTIONS' && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                🛡️ Control guest booking behavior on high-demand dates. Set minimum stay requirements or restrict check-in and check-out.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                    Min Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    value={minStay}
                    onChange={(e) => setMinStay(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                    Max Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 14"
                    value={maxStay}
                    onChange={(e) => setMaxStay(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedToArrival}
                    onChange={(e) => setClosedToArrival(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Closed to Arrival (CTA)
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closedToDeparture}
                    onChange={(e) => setClosedToDeparture(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  Closed to Departure (CTD)
                </label>
              </div>
            </div>
          )}

          {/* Mode 3: Stop Sell Panel */}
          {activeMode === 'STOP_SELL' && (
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    🛑 Stop Sell (Date Closure)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instantly closes room availability on your website, CP portal, and external OTAs via Channex.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStopSellActive(true)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isStopSellActive
                      ? 'border-rose-500 bg-rose-500 text-white shadow-md'
                      : 'border-border bg-background text-muted-foreground hover:border-rose-300'
                  }`}
                >
                  <Ban className="h-4 w-4" />
                  Close Room (Stop Sell ON)
                </button>

                <button
                  type="button"
                  onClick={() => setIsStopSellActive(false)}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !isStopSellActive
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                      : 'border-border bg-background text-muted-foreground hover:border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Reopen Room (Stop Sell OFF)
                </button>
              </div>
            </div>
          )}

          {/* Mode 4: Channel Allotment Panel */}
          {activeMode === 'ALLOTMENT' && (
            <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    📦 Channel Inventory Allotment
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Limit the maximum number of physical rooms distributed to the target channel.
                  </p>
                </div>
              </div>

              <div className="pt-2 max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                    Max Allotted Rooms (Quantity)
                  </label>
                  {maxPhysical !== undefined && (
                    <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded">
                      Max Physical: {maxPhysical}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={maxPhysical}
                  placeholder="e.g. 2"
                  value={allottedQuantity}
                  onChange={(e) =>
                    setAllottedQuantity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-xs font-bold focus:outline-none transition-colors ${
                    maxPhysical !== undefined && allottedQuantity !== '' && Number(allottedQuantity) > maxPhysical
                      ? 'border-rose-500 text-rose-600 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-border'
                  }`}
                />
                {maxPhysical !== undefined && allottedQuantity !== '' && Number(allottedQuantity) > maxPhysical && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    ⚠️ Cannot exceed physical rooms ({maxPhysical})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Applying...' : 'Apply & Sync to Channels'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
