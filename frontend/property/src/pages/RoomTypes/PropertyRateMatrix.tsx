import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Layers,
  Star,
  Globe,
  ShieldAlert,
  Edit2,
  CheckCircle,
} from 'lucide-react';
import {
  ratePlansService,
  type RatePlan,
  type CalendarEventMarker,
  type DailyInventoryData,
  type DailyRestrictionData,
} from '../../services/ratePlans';
import { channelsService } from '../../services/channels';
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
  const [inventoryMap, setInventoryMap] = useState<Record<string, Record<string, DailyInventoryData>>>({});
  const [restrictionsMap, setRestrictionsMap] = useState<Record<string, Record<string, DailyRestrictionData>>>({});
  const [eventMarkers, setEventMarkers] = useState<CalendarEventMarker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingOtas, setSyncingOtas] = useState<boolean>(false);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState<Record<string, boolean>>({});

  // Filter state & 10-Day Date Segment Switcher
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ALL');
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('ALL');
  const [dateChunk, setDateChunk] = useState<'PART1' | 'PART2' | 'PART3'>(() => getInitialDateChunk(new Date()));

  // Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [selectedRoomForBulk, setSelectedRoomForBulk] = useState<RoomType | undefined>(undefined);

  // Inline Price Editing
  const [editingCell, setEditingCell] = useState<{
    ratePlanId: string;
    roomTypeId: string;
    dateStr: string;
    currentPrice: number;
  } | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');
  const [savingInline, setSavingInline] = useState<boolean>(false);

  // Quick Restriction / Inventory Editing Cell
  const [quickEditInv, setQuickEditInv] = useState<{
    roomTypeId: string;
    dateStr: string;
    currentAvailable: number;
    totalRooms: number;
    isStopSell: boolean;
  } | null>(null);
  const [invOverrideInput, setInvOverrideInput] = useState<string>('');

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

      const matrixData = await ratePlansService.getPropertyRateMatrix(propertyId, startDate, endDate);

      setRatePlans(matrixData.ratePlans || []);
      setInventoryMap(matrixData.inventory || {});
      setRestrictionsMap(matrixData.restrictions || {});
      setEventMarkers(matrixData.eventMarkers || []);

      // Expand all room types by default
      const expanded: Record<string, boolean> = {};
      roomTypes.forEach((rt) => {
        expanded[rt.id] = true;
      });
      setExpandedRoomTypes(expanded);
    } catch (err) {
      console.error('Failed to load rate matrix data:', err);
      toast.error('Failed to load live rate matrix and inventory');
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
      const matchingRules = plan.pricingRules.filter((rule: any) => {
        const s = rule.startDate.split('T')[0];
        const e = rule.endDate.split('T')[0];
        if (dateStr < s || dateStr > e) return false;

        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          return rule.daysOfWeek.includes(dayOfWeek);
        }
        return true;
      });

      if (matchingRules.length > 0) {
        // Sort matching rules by specificity:
        // 1. Single-day rule (startDate === endDate) takes highest priority
        // 2. Narrower duration takes priority
        // 3. Festival rule
        // 4. Newest createdAt
        matchingRules.sort((a: any, b: any) => {
          const aS = a.startDate.split('T')[0];
          const aE = a.endDate.split('T')[0];
          const bS = b.startDate.split('T')[0];
          const bE = b.endDate.split('T')[0];
          const aSingle = aS === aE ? 1 : 0;
          const bSingle = bS === bE ? 1 : 0;
          if (aSingle !== bSingle) return bSingle - aSingle;

          const aDur = Math.abs(new Date(aE).getTime() - new Date(aS).getTime());
          const bDur = Math.abs(new Date(bE).getTime() - new Date(bS).getTime());
          if (aDur !== bDur) return aDur - bDur;

          if (a.isFestivalRule !== b.isFestivalRule) return a.isFestivalRule ? -1 : 1;

          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        return Number(matchingRules[0].adjustmentValue);
      }
    }

    return Number(plan.basePrice);
  };

  const handleSaveInlineCell = async () => {
    if (!editingCell || !inlinePriceInput) return;
    setSavingInline(true);
    try {
      await ratePlansService.applyBulkPricingRule({
        propertyId,
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

  const handleQuickToggleStopSell = async (roomTypeId: string, dateStr: string, currentStopSell: boolean) => {
    try {
      await ratePlansService.applyRestrictions({
        propertyId,
        roomTypeId,
        startDate: dateStr,
        endDate: dateStr,
        stopSell: !currentStopSell,
      });

      toast.success(!currentStopSell ? '🛑 Stop Sell applied' : '✅ Stop Sell removed');
      fetchMatrixData();
    } catch (err: any) {
      toast.error('Failed to update stop sell restriction');
    }
  };

  const handleSaveInventoryOverride = async () => {
    if (!quickEditInv || invOverrideInput === '') return;
    try {
      await ratePlansService.setInventoryOverride({
        propertyId,
        roomTypeId: quickEditInv.roomTypeId,
        date: quickEditInv.dateStr,
        allocatedQuantity: Number(invOverrideInput),
      });

      toast.success('Room inventory override saved');
      setQuickEditInv(null);
      fetchMatrixData();
    } catch (err: any) {
      toast.error('Failed to set room inventory');
    }
  };

  const handleFullSyncToOtas = async () => {
    setSyncingOtas(true);
    try {
      await channelsService.pushAri(propertyId, 365);
      toast.success('🚀 Full 365-day ARI synced to Channex and all connected OTAs!');
    } catch (err: any) {
      toast.error('Failed to push full sync to OTAs');
    } finally {
      setSyncingOtas(false);
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
              onClick={() => {
                setSelectedRoomForBulk(undefined);
                setIsBulkModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              ⚡ Bulk Rates & Rules
            </button>
          )}

          {/* Full Sync to OTAs Button */}
          <button
            onClick={handleFullSyncToOtas}
            disabled={syncingOtas}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Push 365-day full ARI update to Channex and all connected OTAs"
          >
            <Globe className={`h-3.5 w-3.5 ${syncingOtas ? 'animate-spin' : ''}`} />
            {syncingOtas ? 'Syncing...' : '🔄 Full Sync to OTAs'}
          </button>

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
            Loading property rate matrix, inventory & restrictions...
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
                  <col key={d.dateStr} className="w-[calc((100%-330px)/10)] min-w-[75px]" />
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

              {/* Table Body (Room Types, Inventory, Restrictions & Rate Plans) */}
              <tbody className="divide-y divide-border text-xs">
                {filteredRoomTypes.map((rt) => {
                  const plans = filteredRatePlans.filter((p) => p.roomTypeId === rt.id);
                  const isExpanded = expandedRoomTypes[rt.id] !== false;
                  const roomInv = inventoryMap[rt.id] || {};
                  const roomRestr = restrictionsMap[rt.id] || {};

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

                      {/* Expandable Rows: Inventory & Availability Row */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-border/40 text-[11px]">
                          <td className="p-2 pl-6 sticky left-0 z-10 bg-emerald-50/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-border">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                              <span className="font-black text-emerald-800 dark:text-emerald-300">
                                Free Inventory / Rooms Left
                              </span>
                            </div>
                          </td>

                          {visibleDaysArray.map((d) => {
                            const invData = roomInv[d.dateStr];
                            const available = invData ? invData.availableCount : 0;
                            const total = invData ? invData.totalRooms : 0;
                            const isStop = invData ? invData.isStopSell : false;
                            const isToday = d.dateStr === todayStr;

                            return (
                              <td
                                key={d.dateStr}
                                onClick={() => {
                                  setQuickEditInv({
                                    roomTypeId: rt.id,
                                    dateStr: d.dateStr,
                                    currentAvailable: available,
                                    totalRooms: total,
                                    isStopSell: isStop,
                                  });
                                  setInvOverrideInput(String(available));
                                }}
                                className={`p-1.5 text-center border-r border-border/40 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-colors ${
                                  isToday ? 'bg-primary/[0.08]' : ''
                                }`}
                                title="Click to override room allotment or stop sell"
                              >
                                {isStop ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    🛑 Closed
                                  </span>
                                ) : total === 0 ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25"
                                    title="No physical rooms configured under Room Setup"
                                  >
                                    0 Unassigned
                                  </span>
                                ) : available === 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    0 Sold Out
                                  </span>
                                ) : available <= 1 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                    {available} left
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                    {available} left
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Expandable Rows: Restrictions Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-amber-50/30 dark:bg-amber-950/10 border-b border-border/40 text-[10px]">
                          <td className="p-2 pl-6 sticky left-0 z-10 bg-amber-50/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-border">
                            <div className="flex items-center gap-1.5">
                              <ShieldAlert className="h-3 w-3 text-amber-600" />
                              <span className="font-extrabold text-amber-800 dark:text-amber-300">
                                Restrictions (Min Stay / CTA / CTD)
                              </span>
                            </div>
                          </td>

                          {visibleDaysArray.map((d) => {
                            const rData = roomRestr[d.dateStr];
                            const minStay = rData?.minStayArrival;
                            const isStop = rData?.stopSell;
                            const isToday = d.dateStr === todayStr;

                            return (
                              <td
                                key={d.dateStr}
                                onClick={() => handleQuickToggleStopSell(rt.id, d.dateStr, Boolean(isStop))}
                                className={`p-1.5 text-center border-r border-border/40 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/40 transition-colors ${
                                  isToday ? 'bg-primary/[0.08]' : ''
                                }`}
                                title="Click to toggle Stop Sell or edit restriction"
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  {minStay && minStay > 1 ? (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-300">
                                      {minStay}N Min
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground font-mono">1N</span>
                                  )}
                                  {rData?.closedToArrival && (
                                    <span className="text-[8px] font-bold text-amber-600">CTA</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}

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
                                          className="w-16 px-1.5 py-1 text-xs font-bold text-center rounded border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-xs"
                                        />
                                        <button
                                          onClick={handleSaveInlineCell}
                                          disabled={savingInline}
                                          className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer"
                                          title="Save Rate"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => {
                                          setEditingCell({
                                            ratePlanId: plan.id,
                                            roomTypeId: rt.id,
                                            dateStr: d.dateStr,
                                            currentPrice: calculatedPrice,
                                          });
                                          setInlinePriceInput(String(calculatedPrice));
                                        }}
                                        className="cursor-pointer py-1 px-1 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                                        title="Click to edit rate"
                                      >
                                        <span className="font-extrabold text-xs sm:text-sm text-foreground font-mono">
                                          ₹{calculatedPrice.toLocaleString()}
                                        </span>
                                        <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
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

      {/* Quick Inventory Override Modal */}
      {quickEditInv && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-foreground">
              Adjust Room Inventory ({quickEditInv.dateStr})
            </h4>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Sellable Rooms Limit (Max: {quickEditInv.totalRooms})
              </label>
              <input
                type="number"
                min={0}
                max={quickEditInv.totalRooms}
                value={invOverrideInput}
                onChange={(e) => setInvOverrideInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickEditInv(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInventoryOverride}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
              >
                Save Allotment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Pricing & Restrictions Modal */}
      <BulkPricingRuleModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        propertyId={propertyId}
        roomTypeId={selectedRoomForBulk?.id}
        roomTypeName={selectedRoomForBulk?.name || 'All Rooms'}
        roomTypes={roomTypes}
        ratePlans={ratePlans}
        onSuccess={() => {
          fetchMatrixData();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
