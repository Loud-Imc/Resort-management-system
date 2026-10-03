import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Globe,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { ratePlansService } from '../services/ratePlans';
import { channelsService } from '../services/channels';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface BulkInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypeId?: string;
  roomTypes?: RoomType[];
  onSuccess: () => void;
}

export const BulkInventoryModal: React.FC<BulkInventoryModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypeId,
  roomTypes = [],
  onSuccess,
}) => {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(roomTypeId || 'ALL');
  const [activeOtas, setActiveOtas] = useState<Array<{ id: string; title: string; otaName?: string; channel?: string }>>([]);

  // Date range
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Days of week
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Inventory Allotment Count
  const [allocatedQuantity, setAllocatedQuantity] = useState<number | ''>(5);

  // Multi-Channel Checkboxes
  const [targetOreeduOta, setTargetOreeduOta] = useState<boolean>(true);
  const [targetOreeduCp, setTargetOreeduCp] = useState<boolean>(true);
  const [targetOreeduPms, setTargetOreeduPms] = useState<boolean>(true);
  const [selectedOtaIds, setSelectedOtaIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  useEffect(() => {
    if (roomTypeId) {
      setSelectedRoomTypeId(roomTypeId);
    } else if (roomTypes.length > 0 && (!selectedRoomTypeId || selectedRoomTypeId === 'ALL')) {
      setSelectedRoomTypeId('ALL');
    }
  }, [roomTypeId, isOpen, roomTypes]);

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

  const targetRoomType = roomTypes.find((r) => r.id === selectedRoomTypeId);

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

  const handleSelectAllChannels = () => {
    setTargetOreeduOta(true);
    setTargetOreeduCp(true);
    setTargetOreeduPms(true);
    setSelectedOtaIds(activeOtas.map((o) => o.id));
  };

  const handleDeselectAllChannels = () => {
    setTargetOreeduOta(false);
    setTargetOreeduCp(false);
    setTargetOreeduPms(false);
    setSelectedOtaIds([]);
  };

  const getTargetChannelsArray = (): string[] => {
    const targets: string[] = [];
    if (targetOreeduOta) targets.push('OREEDU_OTA_PORTAL');
    if (targetOreeduCp) targets.push('OREEDU_CP_PORTAL');
    if (targetOreeduPms) targets.push('OREEDU_PMS');
    targets.push(...selectedOtaIds);
    return targets;
  };

  const getTargetChannelDisplayNames = () => {
    const names: string[] = [];
    if (targetOreeduOta) names.push('Oreedu Direct');
    if (targetOreeduCp) names.push('Oreedu CP');
    if (targetOreeduPms) names.push('Front Desk PMS');
    selectedOtaIds.forEach((id) => {
      const ota = activeOtas.find((o) => o.id === id);
      names.push(ota?.title || ota?.otaName || id);
    });
    return names;
  };

  const handleCloseModal = () => {
    setIsConfirming(false);
    onClose();
  };

  const handleValidateAndReview = (e: React.FormEvent) => {
    e.preventDefault();

    const channels = getTargetChannelsArray();
    if (channels.length === 0) {
      toast.error('Please select at least one target channel.');
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

    if (allocatedQuantity === '' || Number(allocatedQuantity) < 0) {
      toast.error('Please enter a valid allocated room count (0 or greater).');
      return;
    }

    setIsConfirming(true);
  };

  const handleExecuteSubmit = async () => {
    setSubmitting(true);
    try {
      const channelTargets = getTargetChannelsArray();

      await ratePlansService.applyBulkInventoryOverride({
        propertyId,
        roomTypeId: selectedRoomTypeId,
        channelTargets,
        startDate,
        endDate,
        daysOfWeek: selectedDays,
        allocatedQuantity: Number(allocatedQuantity),
      });

      toast.success('📦 Bulk inventory updated & synced across channels!');
      setIsConfirming(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply bulk inventory');
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
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Bulk Update Inventory
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  {selectedRoomTypeId === 'ALL' ? 'All Room Types' : targetRoomType?.name || 'Selected Room'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Allot room quotas across date horizons, weekdays, and distribution portals
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confirmation Review View */}
        {isConfirming ? (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-extrabold text-sm">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span>Confirm Bulk Inventory Allotment & Sync</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                Review the inventory allotments and target channels below. Overrides will directly update the availability grid.
              </p>
            </div>

            <div className="space-y-3 text-xs bg-muted/40 p-4 rounded-2xl border border-border">
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Target Scope:</span>
                <span className="font-extrabold text-foreground">
                  🏨 {selectedRoomTypeId === 'ALL' ? 'All Room Types' : targetRoomType?.name}
                </span>
              </div>
              <div className="flex justify-between items-start py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Target Channels:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[280px]">
                  {getTargetChannelDisplayNames().map((name) => (
                    <span
                      key={name}
                      className="font-extrabold px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Date Horizon:</span>
                <span className="font-bold text-foreground">
                  {startDate} to {endDate} ({selectedDays.length} days/week)
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Allocated Rooms:</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                  📦 {allocatedQuantity} Rooms / night
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteSubmit}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Applying & Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Confirm & Apply Overrides</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleValidateAndReview} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Target Room Type */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> Room Category Scope
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
                  <option value="ALL">🏨 Entire Resort (All Room Types)</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      🛏️ {rt.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Multi-Channel Checkboxes */}
            <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Globe className="h-4 w-4 text-primary" /> Target Channels (Where Inventory Applies)
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

              {/* Oreedu Internal Channels */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-primary" />
                  Oreedu Internal Channels
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
                          Guest booking portal
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
                          🤝 Oreedu CP
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          B2B & corporate agents
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Oreedu PMS */}
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
                          🖥️ Front Desk PMS
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Walk-ins & desk bookings
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* External OTAs */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>🌍</span> External Connected OTAs (via Channex)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeOtas.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center flex flex-col items-center justify-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        🌐 No external OTAs connected
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        Connect external channels (like Booking.com, Agoda) in Channel Manager to push inventory quotas to them.
                      </span>
                    </div>
                  ) : (
                    activeOtas.map((ota) => {
                      const isChecked = selectedOtaIds.includes(ota.id);
                      return (
                        <label
                          key={ota.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-primary/50 bg-primary/10 shadow-xs'
                              : 'border-border bg-card hover:bg-muted/40'
                          }`}
                        >
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
                              🌍 {ota.title || ota.otaName || ota.channel || ota.id}
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

            {/* Applicable Date Range */}
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

            {/* Days of Week Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  Days of the Week
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDays('WEEKDAYS')}
                    className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Weekdays
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDays('WEEKENDS')}
                    className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Weekends
                  </button>
                  <span className="text-muted-foreground/30">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetDays('ALL')}
                    className="text-[10px] font-bold text-primary hover:underline transition-colors cursor-pointer"
                  >
                    All 7 Days
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {dayLabels.map((d) => {
                  const isSelected = selectedDays.includes(d.num);
                  return (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => toggleDay(d.num)}
                      className={`py-2 text-center rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allocated Rooms Input */}
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
              <label className="block text-xs font-extrabold text-foreground mb-1 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-blue-600" /> Allocated Room Count Per Night
              </label>
              <p className="text-[11px] text-muted-foreground mb-3">
                This exact number of rooms will be allotted to the selected channels on each active date.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={allocatedQuantity}
                  onChange={(e) => setAllocatedQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 5"
                  className="w-36 px-4 py-2.5 rounded-xl border border-border bg-background text-base font-mono font-black text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <span className="text-xs font-bold text-muted-foreground">Rooms per night</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md cursor-pointer"
              >
                Review & Confirm →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
