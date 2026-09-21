import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Save,
  Layers,
  Star,
} from 'lucide-react';
import {
  ratePlansService,
  type RatePlan,
  type CalendarEventMarker
} from '../../services/ratePlans';
import type { RoomType } from '../../types/room';
import { BulkPricingRuleModal } from '../../components/BulkPricingRuleModal';
import toast from 'react-hot-toast';

interface PropertyRateMatrixProps {
  propertyId: string;
  roomTypes: RoomType[];
  onRefresh?: () => void;
}

export const PropertyRateMatrix: React.FC<PropertyRateMatrixProps> = ({
  propertyId,
  roomTypes,
  onRefresh,
}) => {
  // Helper to determine initial chunk based on today's date (1-10, 11-20, 21-30/31)
  const getInitialDateChunk = (date: Date = new Date()): 'PART1' | 'PART2' | 'PART3' => {
    const today = new Date();
    if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()) {
      const d = today.getDate();
      if (d <= 10) return 'PART1';
      if (d <= 20) return 'PART2';
      return 'PART3';
    }
    return 'PART1';
  };

  // Current Month/Year Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [eventMarkers, setEventMarkers] = useState<CalendarEventMarker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState<Record<string, boolean>>({});

  // Filter state & 10-Day Date Segment Switcher
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ALL');
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('ALL');
  const [dateChunk, setDateChunk] = useState<'PART1' | 'PART2' | 'PART3'>(() => getInitialDateChunk(new Date()));

  // Modal State
  const [selectedRoomForBulk, setSelectedRoomForBulk] = useState<RoomType | null>(null);
  const [editingCell, setEditingCell] = useState<{
    ratePlanId: string;
    roomTypeId: string;
    dateStr: string;
    currentPrice: number;
  } | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');
  const [savingInline, setSavingInline] = useState<boolean>(false);

  // Today's date string for highlight matching (YYYY-MM-DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Generate days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const dayDate = new Date(year, month, i + 1);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const dayOfWeek = dayDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
    return {
      dayNumber: i + 1,
      dateStr,
      dateObj: dayDate,
      dayOfWeek,
      isWeekend,
      dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });

  // Slice for 10-day pagination (Days 1–10, Days 11–20, Days 21–30/31)
  const visibleDaysArray = dateChunk === 'PART1' 
    ? daysArray.slice(0, 10) 
    : dateChunk === 'PART2'
    ? daysArray.slice(10, 20)
    : daysArray.slice(20);

  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (propertyId) {
      fetchMatrixData();
    }
  }, [propertyId, year, month]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const [plansData, markersData] = await Promise.all([
        ratePlansService.getRatePlansForProperty(propertyId),
        ratePlansService.getCalendarEventMarkers(propertyId, startDate, endDate),
      ]);

      setRatePlans(plansData);
      setEventMarkers(markersData);

      // Expand all room types by default
      const expanded: Record<string, boolean> = {};
      roomTypes.forEach((rt) => {
        expanded[rt.id] = true;
      });
      setExpandedRoomTypes(expanded);
    } catch (err) {
      console.error('Failed to load rate matrix data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    setDateChunk(getInitialDateChunk(newDate));
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    setDateChunk(getInitialDateChunk(newDate));
  };

  const toggleExpandRoomType = (roomTypeId: string) => {
    setExpandedRoomTypes((prev) => ({
      ...prev,
      [roomTypeId]: !prev[roomTypeId],
    }));
  };

  // Helper to find festival marker for a date
  const getFestivalForDate = (dateStr: string) => {
    return eventMarkers.find((marker) => {
      const s = marker.startDate.split('T')[0];
      const e = marker.endDate.split('T')[0];
      return dateStr >= s && dateStr <= e;
    });
  };

  // Helper to calculate rate for a plan on a date considering pricing rules
  const getRateForPlanAndDate = (plan: RatePlan, dateStr: string) => {
    const dayDate = new Date(dateStr);
    const dayOfWeek = dayDate.getDay();

    if (plan.pricingRules && plan.pricingRules.length > 0) {
      // Find matching rule
      const applicableRule = plan.pricingRules.find((rule: any) => {
        const s = rule.startDate.split('T')[0];
        const e = rule.endDate.split('T')[0];
        if (dateStr < s || dateStr > e) return false;

        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          return rule.daysOfWeek.includes(dayOfWeek);
        }
        return true;
      });

      if (applicableRule) {
        return Number(applicableRule.adjustmentValue);
      }
    }

    return Number(plan.basePrice);
  };

  const handleSaveInlineCell = async () => {
    if (!editingCell || !inlinePriceInput) return;
    setSavingInline(true);
    try {
      await ratePlansService.applyBulkPricingRule({
        roomTypeId: editingCell.roomTypeId,
        ratePlanId: editingCell.ratePlanId,
        startDate: editingCell.dateStr,
        endDate: editingCell.dateStr,
        price: Number(inlinePriceInput),
      });

      toast.success('Price updated & synced');
      setEditingCell(null);
      fetchMatrixData();
    } catch (err: any) {
      toast.error('Failed to update price');
    } finally {
      setSavingInline(false);
    }
  };

  // Filtered Room Types and Rate Plans
  const filteredRoomTypes = roomTypes.filter((rt) => {
    if (selectedRoomTypeId === 'ALL') return true;
    return rt.id === selectedRoomTypeId;
  });

  const filteredRatePlans = ratePlans.filter((plan) => {
    if (selectedMealPlan === 'ALL') return true;
    return plan.mealPlan === selectedMealPlan;
  });

  return (
    <div className="space-y-4">
      {/* Rate Matrix Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-2xl p-2.5 shadow-sm">
        {/* Month Navigator */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-xs font-black text-foreground min-w-[125px] text-center font-mono">
            {monthLabel}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 10-Day Date Segment Switcher (Decades) */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border shadow-inner">
          <button
            type="button"
            onClick={() => setDateChunk('PART1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateChunk === 'PART1'
                ? 'bg-primary text-primary-foreground shadow-sm font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📅 Days 1 – 10
          </button>
          <button
            type="button"
            onClick={() => setDateChunk('PART2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateChunk === 'PART2'
                ? 'bg-primary text-primary-foreground shadow-sm font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📅 Days 11 – 20
          </button>
          <button
            type="button"
            onClick={() => setDateChunk('PART3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateChunk === 'PART3'
                ? 'bg-primary text-primary-foreground shadow-sm font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📅 Days 21 – {daysInMonth}
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Room Type Filter */}
          <select
            value={selectedRoomTypeId}
            onChange={(e) => setSelectedRoomTypeId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="ALL">🏨 All Room Types ({roomTypes.length})</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          {/* Meal Plan Filter */}
          <select
            value={selectedMealPlan}
            onChange={(e) => setSelectedMealPlan(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
          >
            <option value="ALL">🍽️ All Meal Plans</option>
            <option value="EP">EP (Room Only)</option>
            <option value="CP">CP (With Breakfast)</option>
            <option value="MAP">MAP (Half Board)</option>
            <option value="AP">AP (Full Board)</option>
          </select>

          {/* Bulk Update All Rooms Button */}
          {roomTypes.length > 0 && (
            <button
              onClick={() => setSelectedRoomForBulk(roomTypes[0])}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              ⚡ Bulk Update All Rooms
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchMatrixData}
            className="p-1.5 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors border border-border cursor-pointer"
            title="Refresh Matrix"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Rate Matrix Data Grid Table (Fit to Screen) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm font-semibold text-muted-foreground">
            Loading property rate matrix...
          </div>
        ) : filteredRoomTypes.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            No room types match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse table-fixed">
              {/* Column Width definitions for 100% fit to screen (10 days) */}
              <colgroup>
                <col className="w-[280px] md:w-[310px] lg:w-[330px]" />
                {visibleDaysArray.map((d) => (
                  <col key={d.dateStr} className="w-[calc((100%-330px)/10)] min-w-[70px]" />
                ))}
              </colgroup>

              {/* Themed Column Headers (Days of Month) */}
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b-2 border-primary/20">
                  {/* Sticky First Column: Room Type / Rate Plan */}
                  <th className="p-2.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 backdrop-blur-md border-r border-border shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-black uppercase tracking-wide">Room Type & Rate Plan</span>
                    </div>
                  </th>

                  {visibleDaysArray.map((day) => {
                    const festival = getFestivalForDate(day.dateStr);
                    const isToday = day.dateStr === todayStr;

                    return (
                      <th
                        key={day.dateStr}
                        className={`p-2.5 text-center border-r border-border/60 transition-colors relative ${
                          isToday
                            ? 'bg-primary/20 text-primary font-black'
                            : day.isWeekend
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-black'
                            : ''
                        }`}
                      >
                        {isToday && (
                          <div className="mb-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground mx-auto shadow-xs inline-block">
                            Today
                          </div>
                        )}
                        <div className="font-black text-lg text-foreground leading-tight">{day.dayNumber}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider opacity-85">{day.dayName}</div>

                        {/* Festival Badge Tag */}
                        {festival && (
                          <div
                            className="mt-1 px-1 py-0.5 rounded text-[8px] font-black text-white truncate max-w-full mx-auto shadow-sm"
                            style={{ backgroundColor: festival.colorTag || '#EF4444' }}
                            title={festival.title}
                          >
                            🎉 {festival.title}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body (Room Types & Rate Plans) */}
              <tbody className="divide-y divide-border text-xs">
                {filteredRoomTypes.map((rt) => {
                  const plans = filteredRatePlans.filter((p) => p.roomTypeId === rt.id);
                  const isExpanded = expandedRoomTypes[rt.id] !== false;

                  return (
                    <React.Fragment key={rt.id}>
                      {/* Themed Master Room Type Category Header Row */}
                      <tr className="bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 transition-colors font-bold text-foreground border-y-2 border-primary/20">
                        <td className="p-2.5 sticky left-0 z-10 bg-primary/10 dark:bg-primary/20 backdrop-blur-md border-r border-border">
                          <div className="flex items-center justify-between gap-2">
                            <div
                              onClick={() => toggleExpandRoomType(rt.id)}
                              className="flex items-center gap-1.5 cursor-pointer select-none truncate"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">{rt.name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/20 text-primary border border-primary/30 shrink-0">
                              {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
                            </span>
                          </div>
                        </td>

                        {/* Master rack price reference cells across days */}
                        {visibleDaysArray.map((d) => {
                          const isToday = d.dateStr === todayStr;

                          return (
                            <td
                              key={d.dateStr}
                              className={`p-2 text-center border-r border-border/40 transition-colors ${
                                isToday
                                  ? 'bg-primary/[0.12] dark:bg-primary/[0.2] font-black'
                                  : d.isWeekend
                                  ? 'bg-indigo-500/5'
                                  : ''
                              }`}
                            >
                              <span className="text-xs sm:text-sm text-muted-foreground font-black font-mono">
                                ₹{Number(rt.basePrice).toLocaleString()}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Rate Plan Sub-Rows */}
                      {isExpanded &&
                        plans.map((plan) => {
                          const isPrimaryPlan = Boolean(plan.isPrimary);

                          return (
                            <tr
                              key={plan.id}
                              className={`transition-colors border-b border-border/50 ${
                                isPrimaryPlan
                                  ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                                  : 'hover:bg-muted/40'
                              }`}
                            >
                              {/* Sticky Rate Plan Name & Badges Column */}
                              <td
                                className={`p-2 pl-6 sticky left-0 z-10 border-r border-border ${
                                  isPrimaryPlan
                                    ? 'bg-blue-50/90 dark:bg-slate-900/90 backdrop-blur-md'
                                    : 'bg-card/95 backdrop-blur-md'
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-foreground text-xs leading-snug" title={plan.name}>
                                      {plan.name}
                                    </span>
                                    {isPrimaryPlan && (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                        <Star className="h-2 w-2 fill-current" /> Primary
                                      </span>
                                    )}
                                  </div>

                                  {/* Meal Plan & AC Badges */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border shadow-xs tracking-wide uppercase ${
                                        plan.mealPlan === 'EP'
                                          ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700'
                                          : plan.mealPlan === 'CP'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700'
                                          : plan.mealPlan === 'MAP'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700'
                                          : 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700'
                                      }`}
                                    >
                                      {plan.mealPlan}
                                    </span>

                                    {plan.acType === 'AC' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md border bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-200 dark:border-cyan-700 shadow-xs">
                                        ❄️ AC
                                      </span>
                                    )}
                                    {plan.acType === 'NON_AC' && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md border bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-700 shadow-xs">
                                        🍃 Non-AC
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Daily Rate Cells */}
                              {visibleDaysArray.map((d) => {
                                const calculatedPrice = getRateForPlanAndDate(plan, d.dateStr);
                                const isToday = d.dateStr === todayStr;
                                const isEditingThis =
                                  editingCell?.ratePlanId === plan.id &&
                                  editingCell?.dateStr === d.dateStr;

                                return (
                                  <td
                                    key={d.dateStr}
                                    className={`p-2 text-center border-r border-border/40 relative group transition-colors ${
                                      isToday
                                        ? 'bg-primary/[0.08] dark:bg-primary/[0.14] font-black'
                                        : d.isWeekend
                                        ? 'bg-indigo-500/5'
                                        : ''
                                    }`}
                                  >
                                    {isEditingThis ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          autoFocus
                                          value={inlinePriceInput}
                                          onChange={(e) => setInlinePriceInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveInlineCell();
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          className="w-20 px-1.5 py-1 rounded border-2 border-primary text-center font-black text-sm bg-background shadow-md"
                                        />
                                        <button
                                          onClick={handleSaveInlineCell}
                                          disabled={savingInline}
                                          className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-sm"
                                          title="Save (Enter)"
                                        >
                                          <Save className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => {
                                          setEditingCell({
                                            ratePlanId: plan.id,
                                            roomTypeId: plan.roomTypeId,
                                            dateStr: d.dateStr,
                                            currentPrice: calculatedPrice,
                                          });
                                          setInlinePriceInput(String(calculatedPrice));
                                        }}
                                        className={`py-2 px-2.5 rounded-lg hover:bg-primary/20 cursor-pointer font-black text-[15px] font-mono transition-all ${
                                          isToday
                                            ? 'text-primary font-black'
                                            : isPrimaryPlan
                                            ? 'text-foreground font-black'
                                            : 'text-foreground/95'
                                        }`}
                                        title="Click to edit rate for this date"
                                      >
                                        ₹{calculatedPrice.toLocaleString()}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Pricing Modal */}
      {selectedRoomForBulk && (
        <BulkPricingRuleModal
          isOpen={!!selectedRoomForBulk}
          onClose={() => setSelectedRoomForBulk(null)}
          roomTypeId={selectedRoomForBulk.id}
          roomTypeName={selectedRoomForBulk.name}
          ratePlans={ratePlans.filter((p) => p.roomTypeId === selectedRoomForBulk.id)}
          onSuccess={() => {
            fetchMatrixData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
