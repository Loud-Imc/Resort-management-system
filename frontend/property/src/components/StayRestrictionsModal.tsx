import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Globe, Calendar, Layers, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ratePlansService, type ActiveRestrictionRule } from '../services/ratePlans';
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
  activeOtas?: any[];
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
  activeOtas = [],
  initialStartDate,
  initialEndDate,
  initialAction,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'SET' | 'ACTIVE'>('SET');
  const [activeRestrictions, setActiveRestrictions] = useState<ActiveRestrictionRule[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [loadedOtas, setLoadedOtas] = useState<Array<{ id: string; title: string; otaName?: string }>>([]);

  const resolvedOtas = (activeOtas && activeOtas.length > 0)
    ? activeOtas
    : loadedOtas;

  // Multi-Channel Target Selection State
  const [targetOreeduOta, setTargetOreeduOta] = useState<boolean>(true);
  const [targetOreeduCp, setTargetOreeduCp] = useState<boolean>(true);
  const [targetOreeduPms, setTargetOreeduPms] = useState<boolean>(false);
  const [selectedOtaIds, setSelectedOtaIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Restriction Controls (Min Stay, Max Stay, CTA, CTD)
  const [minStay, setMinStay] = useState<number | ''>('');
  const [maxStay, setMaxStay] = useState<number | ''>('');
  const [closedToArrival, setClosedToArrival] = useState<boolean>(false);
  const [closedToDeparture, setClosedToDeparture] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('SET');
    fetchActiveRestrictions();

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

  const fetchActiveRestrictions = async () => {
    if (!propertyId) return;
    setLoadingActive(true);
    try {
      const rules = await ratePlansService.getActiveRestrictionRules(
        propertyId,
        selectedRoomTypeId === 'ALL' ? undefined : selectedRoomTypeId
      );
      if (Array.isArray(rules)) {
        setActiveRestrictions(rules);
      }
    } catch {
      // silently handle
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'ACTIVE') {
      fetchActiveRestrictions();
    }
  }, [isOpen, activeTab, propertyId, selectedRoomTypeId]);

  const handleClearRule = async (ruleId: string) => {
    setClearingId(ruleId);
    try {
      await ratePlansService.clearRestrictionRule(ruleId);
      toast.success('🟢 Stay restriction cleared & synced across channels!');
      await fetchActiveRestrictions();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear stay restriction');
    } finally {
      setClearingId(null);
    }
  };

  const getChannelLabel = (target: string) => {
    if (target === 'ALL') return 'All Channels';
    if (target === 'OREEDU_OTA_PORTAL') return 'Oreedu Direct OTA';
    if (target === 'OREEDU_CP_PORTAL') return 'Oreedu CP Portal';
    if (target === 'OREEDU_PMS') return 'Oreedu PMS (Front Desk)';
    const foundOta = resolvedOtas.find((o) => o.id === target);
    if (foundOta) return foundOta.title || foundOta.otaName || target;
    return target;
  };

  const getDaysOfWeekLabel = (days: number[]) => {
    if (!days || days.length === 0 || days.length === 7) return 'Everyday';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((d) => dayNames[d]).join(', ');
  };

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

    const channelTargets: string[] = [];
    if (targetOreeduOta) channelTargets.push('OREEDU_OTA_PORTAL');
    if (targetOreeduCp) channelTargets.push('OREEDU_CP_PORTAL');
    if (targetOreeduPms) channelTargets.push('OREEDU_PMS');
    channelTargets.push(...selectedOtaIds);

    if (channelTargets.length === 0) {
      toast.error('Please select at least one channel to apply restrictions.');
      return;
    }

    if (minStay === '' && maxStay === '' && !closedToArrival && !closedToDeparture) {
      toast.error('Please configure at least one restriction rule (Min Stay, Max Stay, CTA, or CTD).');
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
        daysOfWeek: selectedDays,
        minStayArrival: minStay !== '' ? Number(minStay) : undefined,
        maxStay: maxStay !== '' ? Number(maxStay) : undefined,
        closedToArrival,
        closedToDeparture,
      });

      toast.success(`🛡️ Stay restrictions saved & synced to ${channelTargets.length} channel(s)!`);
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
        <div
          className={`p-5 border-b border-border flex items-center justify-between transition-colors ${
            activeTab === 'SET' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                activeTab === 'SET'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {activeTab === 'SET' ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                {activeTab === 'SET' ? 'Stay Restrictions Manager' : 'Active Stay Restrictions'}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'SET'
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {activeTab === 'SET' ? 'Rules & Controls' : 'Active Rules & Clear'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'SET'
                  ? 'Configure minimum stay lengths and check-in/check-out boundaries'
                  : 'View active restriction rules and clear them with 1-click'}
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

        {/* Switcher Tab */}
        <div className="p-4 pb-0 bg-background">
          <div className="flex rounded-2xl bg-muted/60 p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('SET')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'SET'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Set Restrictions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Active Restrictions & Clear
              {activeRestrictions.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {activeRestrictions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'SET' ? (
        /* Form */
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Target Room Type Scope */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Room Type Scope
            </label>
            <select
              value={selectedRoomTypeId}
              onChange={(e) => setSelectedRoomTypeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">🏨 Entire Resort (All Room Types)</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  🛏️ {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-Channel Checkboxes */}
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Globe className="h-4 w-4 text-primary" /> Target Channels (Where Restrictions Apply)
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
                <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduOta ? 'border-primary/50 bg-primary/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={targetOreeduOta}
                      onChange={(e) => setTargetOreeduOta(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer shrink-0"
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
                <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduCp ? 'border-primary/50 bg-primary/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={targetOreeduCp}
                      onChange={(e) => setTargetOreeduCp(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground truncate">
                        🏢 Oreedu CP
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        B2B & corporate agents
                      </div>
                    </div>
                  </div>
                </label>

                {/* Oreedu PMS (Front Desk) */}
                <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${targetOreeduPms ? 'border-amber-500/50 bg-amber-500/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={targetOreeduPms}
                      onChange={(e) => setTargetOreeduPms(e.target.checked)}
                      className="rounded border-border text-amber-600 focus:ring-amber-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground truncate">
                        🛎️ Front Desk PMS
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Staff direct walk-ins
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
                      Connect external channels (like Booking.com, Agoda) in Channel Manager settings to distribute restrictions to them.
                    </span>
                  </div>
                ) : (
                  resolvedOtas.map((ota) => {
                    const isChecked = selectedOtaIds.includes(ota.id);
                    return (
                      <label key={ota.id} className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${isChecked ? 'border-primary/50 bg-primary/10 shadow-xs' : 'border-border bg-card hover:bg-muted/40'}`}>
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
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-foreground flex items-center gap-1 truncate">
                            🌍 {ota.title || ota.otaName || ota.id}
                          </div>
                          <div className="text-[10px] text-muted-foreground">External OTA via Channex</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
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
        ) : (
          /* Active Restrictions & Clear Tab */
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Filter and Refresh Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border/80">
              <div className="flex items-center gap-2 flex-1">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedRoomTypeId}
                  onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="ALL">🏨 Entire Resort (All Rooms)</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      🛏️ {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchActiveRestrictions}
                disabled={loadingActive}
                className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 self-end sm:self-auto"
                title="Refresh active restrictions"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingActive ? 'animate-spin' : ''}`} />
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>

            {/* List */}
            {loadingActive ? (
              <div className="p-12 text-center text-muted-foreground text-xs font-bold animate-pulse space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                <div>Loading active restrictions...</div>
              </div>
            ) : activeRestrictions.length === 0 ? (
              <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-2xl bg-muted/20 my-2">
                <div className="text-3xl">🛡️</div>
                <div className="text-sm font-black text-foreground">No Active Stay Restrictions</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  There are currently no active stay rules (Min Stay, Max Stay, CTA, CTD) active for this property. Switch to "Set Restrictions" to configure new rules.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Active Restriction Rules ({activeRestrictions.length})
                </div>

                {activeRestrictions.map((rule) => {
                  const isClearing = clearingId === rule.id;
                  const channelLabel = getChannelLabel(rule.channelTarget);
                  const daysLabel = getDaysOfWeekLabel(rule.daysOfWeek);

                  return (
                    <div
                      key={rule.id}
                      className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-foreground">
                            {rule.roomType?.name || '🏨 All Room Types'}
                          </span>

                          {rule.minStayArrival && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              Min {rule.minStayArrival}N
                            </span>
                          )}

                          {rule.maxStay && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                              Max {rule.maxStay}N
                            </span>
                          )}

                          {rule.closedToArrival && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                              CTA
                            </span>
                          )}

                          {rule.closedToDeparture && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              CTD
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                            {rule.startDate.split('T')[0]} to {rule.endDate.split('T')[0]}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                            {daysLabel}
                          </span>

                          <span className="flex items-center gap-1 font-medium">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/80" />
                            {channelLabel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleClearRule(rule.id)}
                        disabled={isClearing}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isClearing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Clear Rule
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Done Action */}
            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
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
