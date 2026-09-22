import React, { useState } from 'react';
import { X, Sparkles, Sliders, CheckCircle2 } from 'lucide-react';
import { ratePlansService, type RatePlan } from '../services/ratePlans';

interface BulkPricingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypeId: string;
  roomTypeName: string;
  ratePlans: RatePlan[];
  onSuccess: () => void;
}

export const BulkPricingRuleModal: React.FC<BulkPricingRuleModalProps> = ({
  isOpen,
  onClose,
  roomTypeId,
  roomTypeName,
  ratePlans,
  onSuccess,
}) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // All days by default
  const [ratePlanId, setRatePlanId] = useState<string>('');
  const [price, setPrice] = useState<number>(3000);
  const [isFestivalRule, setIsFestivalRule] = useState<boolean>(false);
  const [festivalName, setFestivalName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

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
      alert('Please select at least one day of the week.');
      return;
    }

    setSubmitting(true);
    try {
      await ratePlansService.applyBulkPricingRule({
        roomTypeId,
        ratePlanId: ratePlanId || undefined,
        startDate,
        endDate,
        daysOfWeek: selectedDays,
        price,
        isFestivalRule,
        festivalName: isFestivalRule ? festivalName : undefined,
      });

      alert('Bulk pricing rule applied successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to apply bulk pricing rule');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Bulk Weekend & Festival Price Updater</h3>
              <p className="text-xs text-muted-foreground">Automate day-of-week rates for {roomTypeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Quick Day Presets</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKDAYS')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
              >
                📅 Mon – Thu (Weekdays)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('WEEKENDS')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
              >
                🎉 Fri – Sun (Weekends)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('ALL')}
                className="py-2 px-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
              >
                ⚡ Everyday
              </button>
            </div>
          </div>

          {/* Days Toggle */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Selected Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {dayLabels.map((d) => {
                const isSelected = selectedDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
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
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Target Rate Plan & New Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Rate Plan</label>
              <select
                value={ratePlanId}
                onChange={(e) => setRatePlanId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">All Rate Plans (Primary EP Base)</option>
                {ratePlans.map((rp) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.name} ({rp.mealPlan})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nightly Price (₹)</label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Festival / Special Event Toggle */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-amber-600">
              <input
                type="checkbox"
                checked={isFestivalRule}
                onChange={(e) => setIsFestivalRule(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
              />
              <Sparkles className="h-4 w-4 text-amber-500" />
              Mark as Festival / High-Demand Peak Season Override
            </label>

            {isFestivalRule && (
              <div>
                <input
                  type="text"
                  placeholder="e.g. Diwali Peak Season / New Year Special"
                  value={festivalName}
                  onChange={(e) => setFestivalName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-background text-xs font-semibold focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Applying...' : 'Apply & Sync Rates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
