import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Globe,
  ShieldAlert,
  Plus,
  X,
  DollarSign,
  Utensils,
  Ban,
  History,
  Edit2,
  BedDouble,
  CheckCircle,
  MoreVertical,
  Calendar,
  Layers,
  Star,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AddRoomModal from '../../components/Rooms/AddRoomModal';
import {
  ratePlansService,
  type RatePlan,
  type CalendarEventMarker,
  type DailyInventoryData,
  type DailyRestrictionData,
} from '../../services/ratePlans';
import { channelsService } from '../../services/channels';
import type { RoomType } from '../../types/room';
import { BulkRatesModal } from '../../components/BulkRatesModal';
import { StayRestrictionsModal } from '../../components/StayRestrictionsModal';
import { QuickStopSellModal } from '../../components/QuickStopSellModal';
import { RateChangeLogDrawer } from '../../components/RateChangeLogDrawer';
import { 
  UpdateConfirmationModal, 
  type UpdateConfirmationDetails,
  type UpdateConfirmationConfirmPayload 
} from '../../components/UpdateConfirmationModal';
import { FullSyncAuditModal } from '../../components/FullSyncAuditModal';
import { ChannelInventoryEditorModal } from '../../components/ChannelInventoryEditorModal';
import { ChannelPriceEditorModal } from '../../components/ChannelPriceEditorModal';
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
  const [expandedRoomTypes, setExpandedRoomTypes] = useState<Record<string, boolean>>({});

  // Connected OTAs list from Channex
  const [activeOtas, setActiveOtas] = useState<any[]>([]);

  // Update Confirmation & OTA Target Selection Modal
  const [confirmModalDetails, setConfirmModalDetails] = useState<UpdateConfirmationDetails | null>(null);

  // Add Physical Room Modal State
  const queryClient = useQueryClient();
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState<boolean>(false);
  const [selectedRoomTypeIdForAdd, setSelectedRoomTypeIdForAdd] = useState<string | undefined>(undefined);

  // Filter state & 10-Day Date Segment Switcher
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('ALL');
  const [showRatePlans, setShowRatePlans] = useState<boolean>(false);
  const [dateChunk, setDateChunk] = useState<'PART1' | 'PART2' | 'PART3'>(() => getInitialDateChunk(new Date()));

  // Focused Modal States
  const [isBulkRatesModalOpen, setIsBulkRatesModalOpen] = useState<boolean>(false);
  const [isRestrictionsModalOpen, setIsRestrictionsModalOpen] = useState<boolean>(false);
  const [isStopSellModalOpen, setIsStopSellModalOpen] = useState<boolean>(false);
  const [isChangeLogOpen, setIsChangeLogOpen] = useState<boolean>(false);
  const [isFullSyncModalOpen, setIsFullSyncModalOpen] = useState<boolean>(false);
  const [selectedRoomForBulk, setSelectedRoomForBulk] = useState<RoomType | undefined>(undefined);

  // Inline Price Editing
  const [editingCell, setEditingCell] = useState<{
    ratePlanId: string;
    roomTypeId: string;
    dateStr: string;
    currentPrice: number;
    isAc?: boolean;
  } | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');
  // const [savingInline, setSavingInline] = useState<boolean>(false);

  // Quick Restriction / Inventory Editing Cell
  const [quickEditInv, setQuickEditInv] = useState<{
    roomTypeId: string;
    dateStr: string;
    currentAvailable: number;
    totalRooms: number;
    isStopSell: boolean;
  } | null>(null);
  const [invOverrideInput, setInvOverrideInput] = useState<string>('');

  // 3-Stage Multi-Channel Inventory Allotment Modal State
  const [channelInvModalData, setChannelInvModalData] = useState<{
    roomType: RoomType;
    dateStr: string;
    totalRooms: number;
    bookedCount: number;
    availableCount: number;
    existingChannelOverrides: Record<string, number>;
  } | null>(null);

  // 3-Stage Multi-Channel Price / Tariff Allotment Modal State
  const [channelPriceModalData, setChannelPriceModalData] = useState<{
    roomType: RoomType;
    ratePlanId?: string;
    dateStr: string;
    isAc: boolean;
    currentPrice: number;
    existingChannelPrices: Record<string, number>;
  } | null>(null);

  // Quick Date Restriction Action Chooser State
  const [restrictionChooser, setRestrictionChooser] = useState<{
    roomTypeId: string;
    roomTypeName: string;
    dateStr: string;
    currentMinStay?: number | null;
    currentStopSell?: boolean;
    currentCta?: boolean;
    currentCtd?: boolean;
  } | null>(null);

  const [chosenRestrictionAction, setChosenRestrictionAction] = useState<
    'STOP_SELL' | 'CTA' | 'CTD' | 'MIN_STAY' | 'MAX_STAY'
  >('STOP_SELL');

  const [restrictionTargetConfig, setRestrictionTargetConfig] = useState<{
    startDate: string;
    endDate: string;
    action?: 'min_stay' | 'max_stay' | 'cta' | 'ctd';
  } | null>(null);

  const [stopSellTargetConfig, setStopSellTargetConfig] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  // 3-Dot Action Menu state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Channel view filter for rate matrix display
  const [selectedChannelView, setSelectedChannelView] = useState<string>('OREEDU_PMS');

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
      channelsService
        .getActiveOtas(propertyId)
        .then((data) => {
          if (Array.isArray(data)) setActiveOtas(data);
        })
        .catch(() => {});
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

      // Expand only the first room type by default; keep others closed
      const expanded: Record<string, boolean> = {};
      roomTypes.forEach((rt, idx) => {
        expanded[rt.id] = (idx === 0);
      });
      setExpandedRoomTypes(expanded);
    } catch (err) {
      console.error('Failed to load rate matrix data:', err);
      toast.error('Failed to load live rate matrix and inventory');
    } finally {
      setLoading(false);
    }
  };

  // Ensure default expansion is only first room type upon roomTypes load
  useEffect(() => {
    if (roomTypes.length > 0) {
      setExpandedRoomTypes((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, boolean> = {};
        roomTypes.forEach((rt, idx) => {
          initial[rt.id] = (idx === 0);
        });
        return initial;
      });
    }
  }, [roomTypes]);

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
    setExpandedRoomTypes((prev) => {
      const current = prev[roomTypeId] !== undefined 
        ? prev[roomTypeId] 
        : (filteredRoomTypes[0]?.id === roomTypeId);
      return {
        ...prev,
        [roomTypeId]: !current,
      };
    });
  };

  // Helper to find festival marker for a date
  const getFestivalForDate = (dateStr: string) => {
    return eventMarkers.find((marker) => {
      const s = marker.startDate.split('T')[0];
      const e = marker.endDate.split('T')[0];
      return dateStr >= s && dateStr <= e;
    });
  };

  // Helper to calculate rate for a plan on a date considering pricing rules, AC mode, and channel target
  const getRateForPlanAndDate = (
    plan: RatePlan, 
    dateStr: string, 
    rt?: RoomType, 
    isAc?: boolean,
    channelTarget?: string
  ) => {
    let base = Number(plan.basePrice);
    if (rt) {
      const rtp = plan.roomTypePrices?.find((p) => p.roomTypeId === rt.id);
      if (rtp) {
        base = isAc ? Number(rtp.basePriceAc ?? rtp.basePrice) : Number(rtp.basePrice);
      } else {
        base = isAc ? Number(rt.basePriceAc || rt.basePrice) : Number(rt.basePrice);
      }
    }

    const effectiveChannel = channelTarget || selectedChannelView;
    const dayDate = new Date(dateStr);
    const dayOfWeek = dayDate.getDay();

    if (plan.pricingRules && plan.pricingRules.length > 0) {
      const matchingRules = plan.pricingRules.filter((rule: any) => {
        // Channel filtering:
        // Must match effective channel view or 'ALL' fallback.
        // Legacy rules without channelTarget default to 'OREEDU_PMS'.
        const target = rule.channelTarget || 'OREEDU_PMS';
        if (target !== effectiveChannel && target !== 'ALL') return false;

        if (rule.roomTypeId && rt && rule.roomTypeId !== rt.id) return false;

        // Strict AC / Non-AC filtering:
        // If the rule explicitly specifies isAc (true/false), it must match the cell's isAc
        if (rule.isAc !== undefined && rule.isAc !== null && isAc !== undefined) {
          if (rule.isAc !== isAc) return false;
        }

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
        // 1. Exact channel target match over 'ALL' fallback rule
        // 2. Explicit isAc match over general fallback rule
        // 3. Single-day rule (startDate === endDate) takes highest priority
        // 4. Narrower duration takes priority
        // 5. Festival rule
        // 6. Newest createdAt
        matchingRules.sort((a: any, b: any) => {
          const aExactChannel = (a.channelTarget || 'OREEDU_PMS') === effectiveChannel ? 1 : 0;
          const bExactChannel = (b.channelTarget || 'OREEDU_PMS') === effectiveChannel ? 1 : 0;
          if (aExactChannel !== bExactChannel) return bExactChannel - aExactChannel;

          const aHasAc = a.isAc !== undefined && a.isAc !== null ? 1 : 0;
          const bHasAc = b.isAc !== undefined && b.isAc !== null ? 1 : 0;
          if (aHasAc !== bHasAc) return bHasAc - aHasAc;

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

    return Number(base);
  };

  const handleOpenPriceModal = (
    roomType: RoomType,
    dateStr: string,
    isAc: boolean,
    currentPrice: number,
    ratePlanId?: string,
  ) => {
    const primaryPlan = ratePlanId 
      ? ratePlans.find((p) => p.id === ratePlanId) 
      : ratePlans.find((p) => p.isPrimary) || ratePlans[0];
    const existingPrices: Record<string, number> = {};

    if (primaryPlan) {
      existingPrices['OREEDU_PMS'] = getRateForPlanAndDate(primaryPlan, dateStr, roomType, isAc, 'OREEDU_PMS');
      existingPrices['OREEDU_OTA_PORTAL'] = getRateForPlanAndDate(primaryPlan, dateStr, roomType, isAc, 'OREEDU_OTA_PORTAL');
      existingPrices['OREEDU_CP_PORTAL'] = getRateForPlanAndDate(primaryPlan, dateStr, roomType, isAc, 'OREEDU_CP_PORTAL');
      activeOtas.forEach((ota) => {
        const targetKey = ota.id || ota.channelId || ota.channelName;
        existingPrices[targetKey] = getRateForPlanAndDate(primaryPlan, dateStr, roomType, isAc, targetKey);
      });

      const allRule = primaryPlan.pricingRules?.find((r: any) => {
        const s = r.startDate.split('T')[0];
        const e = r.endDate.split('T')[0];
        return (
          r.channelTarget === 'ALL' &&
          r.roomTypeId === roomType.id &&
          dateStr >= s &&
          dateStr <= e &&
          (r.isAc === undefined || r.isAc === null || r.isAc === isAc)
        );
      });
      if (allRule) {
        existingPrices['ALL'] = Number(allRule.adjustmentValue);
      }
    }

    setChannelPriceModalData({
      roomType,
      ratePlanId: primaryPlan?.id,
      dateStr,
      isAc,
      currentPrice,
      existingChannelPrices: existingPrices,
    });
  };

  const handleRequestPriceChange = () => {
    if (!editingCell || !inlinePriceInput) return;
    const newPrice = Number(inlinePriceInput);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Please enter a valid price amount');
      return;
    }

    const targetPlan = ratePlans.find((p) => p.id === editingCell.ratePlanId);
    const targetRoom = roomTypes.find((r) => r.id === editingCell.roomTypeId);
    const planNameWithAc = targetPlan
      ? `${targetPlan.name}${editingCell.isAc ? ' (❄️ AC)' : ' (🍃 Non-AC)'}`
      : 'Selected Plan';

    setConfirmModalDetails({
      type: 'PRICE',
      roomTypeId: editingCell.roomTypeId,
      roomTypeName: targetRoom?.name || 'Selected Room',
      ratePlanId: editingCell.ratePlanId,
      ratePlanName: planNameWithAc,
      dateStr: editingCell.dateStr,
      oldValue: editingCell.currentPrice,
      newValue: newPrice,
    });
  };

  const handleContinueFromChooser = () => {
    if (!restrictionChooser) return;
    const targetRoom = roomTypes.find((r) => r.id === restrictionChooser.roomTypeId);
    setSelectedRoomForBulk(targetRoom || undefined);

    const dateStr = restrictionChooser.dateStr;
    setRestrictionChooser(null);

    if (chosenRestrictionAction === 'STOP_SELL') {
      setStopSellTargetConfig({ startDate: dateStr, endDate: dateStr });
      setIsStopSellModalOpen(true);
    } else {
      const actionMap: Record<string, 'min_stay' | 'max_stay' | 'cta' | 'ctd'> = {
        MIN_STAY: 'min_stay',
        MAX_STAY: 'max_stay',
        CTA: 'cta',
        CTD: 'ctd',
      };
      setRestrictionTargetConfig({
        startDate: dateStr,
        endDate: dateStr,
        action: actionMap[chosenRestrictionAction],
      });
      setIsRestrictionsModalOpen(true);
    }
  };

  const handleRequestInventoryChange = () => {
    if (!quickEditInv || invOverrideInput === '') return;
    const newQty = Number(invOverrideInput);
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Please enter a valid room count');
      return;
    }

    if (newQty > quickEditInv.totalRooms) {
      toast.error(`Cannot allocate more than ${quickEditInv.totalRooms} physical rooms.`);
      return;
    }

    const targetRoom = roomTypes.find((r) => r.id === quickEditInv.roomTypeId);

    setConfirmModalDetails({
      type: 'INVENTORY',
      roomTypeId: quickEditInv.roomTypeId,
      roomTypeName: targetRoom?.name || 'Selected Room',
      dateStr: quickEditInv.dateStr,
      oldValue: quickEditInv.currentAvailable,
      newValue: newQty,
    });
    setQuickEditInv(null);
  };

  const handleConfirmUpdate = async (target: UpdateConfirmationConfirmPayload) => {
    if (!confirmModalDetails) return;

    // Filter real OTAs vs simulated/dummy OTAs
    const realSelectedOtaIds = (target.selectedChannelDetails?.selectedOtas || [])
      .filter((o) => !o.isSimulated)
      .map((o) => o.id);

    const hasSimulatedOtas = (target.selectedChannelDetails?.selectedOtas || []).some(
      (o) => o.isSimulated
    );

    // Build explicit channel targets list
    const channelTargets: string[] = [];
    if (target.selectedChannelDetails?.oreeduPms) channelTargets.push('OREEDU_PMS');
    if (target.selectedChannelDetails?.oreeduOtaPortal) channelTargets.push('OREEDU_OTA_PORTAL');
    if (target.selectedChannelDetails?.oreeduCpPortal) channelTargets.push('OREEDU_CP_PORTAL');
    for (const otaId of realSelectedOtaIds) {
      channelTargets.push(otaId);
    }

    // Determine channel target for Channex/PMS:
    // If no real OTAs selected (e.g. only internal portals or simulated OTAs): PMS_ONLY
    const channelId = realSelectedOtaIds.length === 0
      ? 'PMS_ONLY' 
      : realSelectedOtaIds.length === 1
      ? realSelectedOtaIds[0]
      : 'ALL';

    try {
      if (confirmModalDetails.type === 'PRICE') {
        await ratePlansService.applyBulkPricingRule({
          propertyId,
          roomTypeId: confirmModalDetails.roomTypeId,
          ratePlanId: confirmModalDetails.ratePlanId,
          startDate: confirmModalDetails.dateStr,
          endDate: confirmModalDetails.dateStr,
          price: confirmModalDetails.newValue,
          channelId,
          channelTargets: channelTargets.length > 0 ? channelTargets : ['OREEDU_PMS'],
        });

        const channelNames: string[] = [];
        if (target.selectedChannelDetails?.oreeduPms) channelNames.push('Oreedu PMS');
        if (target.selectedChannelDetails?.oreeduOtaPortal) channelNames.push('Oreedu OTA portal');
        if (target.selectedChannelDetails?.oreeduCpPortal) channelNames.push('Oreedu CP portal');
        if (realSelectedOtaIds.length > 0) {
          channelNames.push(`${realSelectedOtaIds.length} live OTA(s)`);
        } else if (hasSimulatedOtas) {
          channelNames.push('Simulated OTAs');
        }

        toast.success(
          `Price updated for: ${channelNames.join(', ')}`
        );
      } else {
        await ratePlansService.setInventoryOverride({
          propertyId,
          roomTypeId: confirmModalDetails.roomTypeId,
          date: confirmModalDetails.dateStr,
          allocatedQuantity: confirmModalDetails.newValue,
          channelId,
        });

        toast.success(
          realSelectedOtaIds.length > 0
            ? `Inventory updated & synced to ${realSelectedOtaIds.length} OTA(s) and PMS!`
            : 'Inventory updated in PMS!'
        );
      }
      setEditingCell(null);
      fetchMatrixData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error(`Failed to apply ${confirmModalDetails.type === 'PRICE' ? 'price' : 'inventory'} update`);
    }
  };

  // Filtered Room Types and Rate Plans
  const filteredRoomTypes = roomTypes.filter((rt) => {
    if (selectedRoomTypeId === 'ALL') return true;
    return rt.id === selectedRoomTypeId;
  });

  const filteredRatePlans = ratePlans;

  return (
    <div className="space-y-4">
      {/* Rate Matrix Controls Bar - Unified Single Line */}
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 bg-card border border-border rounded-2xl p-2.5 shadow-sm">
        {/* Left Side: Month Navigator & Room Type Selector */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-background rounded-lg transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 text-xs font-black text-foreground min-w-[115px] text-center font-mono">
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

          {/* Room Type Selector */}
          <select
            value={selectedRoomTypeId}
            onChange={(e) => setSelectedRoomTypeId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer max-w-[190px] sm:max-w-[220px] truncate shadow-2xs"
          >
            <option value="ALL">🏨 All Room Types ({roomTypes.length})</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          {/* Channel View Filter Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border">
            <span className="text-[11px] font-extrabold text-muted-foreground whitespace-nowrap">Channel:</span>
            <select
              value={selectedChannelView}
              onChange={(e) => setSelectedChannelView(e.target.value)}
              className="bg-background text-xs font-bold rounded-lg px-2.5 py-1 border border-border focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer text-foreground max-w-[180px] truncate shadow-2xs"
              title="Filter matrix rates by platform or OTA channel"
            >
              <option value="OREEDU_PMS">🖥️ Oreedu PMS</option>
              <option value="OREEDU_OTA_PORTAL">🌐 Oreedu OTA Portal</option>
              <option value="OREEDU_CP_PORTAL">🤝 Oreedu CP Portal</option>
              {activeOtas.map((ota) => (
                <option key={ota.id} value={ota.id}>
                  📡 {ota.title || ota.channel}
                </option>
              ))}
            </select>
          </div>

          {showRatePlans && (
            <span className="hidden xl:flex px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 items-center gap-1 shrink-0">
              <Utensils className="h-3 w-3" /> Meals ON
            </span>
          )}
        </div>

        {/* Right Side: Day Set Selector, Sync Button, Refresh & 3-Dot More Actions Menu */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* 10-Day Date Segment Switcher (Decades) */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border shadow-inner">
            <button
              type="button"
              onClick={() => setDateChunk('PART1')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateChunk === 'PART3'
                  ? 'bg-primary text-primary-foreground shadow-sm font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              📅 Days 21 – {daysInMonth}
            </button>
          </div>

          {/* Full Sync to OTAs Button */}
          <button
            onClick={() => setIsFullSyncModalOpen(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
            title="Audit and push full ARI update to Channex and connected OTAs"
          >
            <Globe className="h-3.5 w-3.5" />
            🔄 Full Sync to OTAs
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchMatrixData}
            className="p-2 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors border border-border cursor-pointer shadow-2xs shrink-0"
            title="Refresh Matrix"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

            {/* 3-Dot Actions Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                  isMenuOpen
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card hover:bg-muted text-foreground border-border'
                }`}
                title="More Matrix Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider border-b border-border/60">
                      Matrix Actions
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowRatePlans((prev) => !prev);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-muted flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-primary" />
                        <span>Show Meal Packages</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${showRatePlans ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {showRatePlans ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomForBulk(undefined);
                        setIsBulkRatesModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span>💰 Bulk Rates</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomForBulk(undefined);
                        setIsRestrictionsModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span>🛡️ Restrictions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomForBulk(undefined);
                        setIsStopSellModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Ban className="h-4 w-4 text-rose-600" />
                      <span>🛑 Stop Sell</span>
                    </button>

                    <div className="my-1 border-t border-border/60" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsChangeLogOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <History className="h-4 w-4 text-indigo-600" />
                      <span>📜 Change Log</span>
                    </button>
                  </div>
                </>
              )}
            </div>
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
                {filteredRoomTypes.map((rt, idx) => {
                  const plans = filteredRatePlans;
                  const isExpanded = expandedRoomTypes[rt.id] !== undefined ? expandedRoomTypes[rt.id] : (idx === 0);
                  const roomInv = inventoryMap[rt.id] || {};
                  const roomRestr = restrictionsMap[rt.id] || {};

                  return (
                    <React.Fragment key={rt.id}>
                      {/* Master Room Type Row with 1-Click Interactive Price Editing */}
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
                            <div className="flex items-center gap-1 shrink-0">
                              {rt.acOption === 'BOTH' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                  ❄️/🍃 Dual
                                </span>
                              ) : rt.acOption === 'NON_AC_ONLY' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  🍃 Non-AC
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                  ❄️ AC
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground border border-border font-mono">
                                {rt.rooms?.length ?? 0} {(rt.rooms?.length ?? 0) === 1 ? 'room' : 'rooms'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Interactive Price Cells across days */}
                        {visibleDaysArray.map((d) => {
                          const primaryPlan = ratePlans.find((p) => p.isPrimary) || ratePlans[0];
                          const nonAcRate = primaryPlan ? getRateForPlanAndDate(primaryPlan, d.dateStr, rt, false) : Number(rt.basePrice);
                          const acRate = rt.acOption !== 'NON_AC_ONLY' 
                            ? (primaryPlan ? getRateForPlanAndDate(primaryPlan, d.dateStr, rt, true) : Number(rt.basePriceAc || rt.basePrice))
                            : null;
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
                              {rt.acOption === 'BOTH' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    onClick={() => handleOpenPriceModal(rt, d.dateStr, false, nonAcRate)}
                                    className="px-2 py-0.5 rounded-md text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer font-mono transition-colors shadow-2xs"
                                    title="Click to edit Non-AC tariff for this date"
                                  >
                                    🍃 ₹{nonAcRate.toLocaleString()}
                                  </span>
                                  <span
                                    onClick={() => handleOpenPriceModal(rt, d.dateStr, true, acRate!)}
                                    className="px-2 py-0.5 rounded-md text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer font-mono transition-colors shadow-2xs"
                                    title="Click to edit AC tariff for this date"
                                  >
                                    ❄️ ₹{acRate?.toLocaleString()}
                                  </span>
                                </div>
                              ) : rt.acOption === 'NON_AC_ONLY' ? (
                                <span
                                  onClick={() => handleOpenPriceModal(rt, d.dateStr, false, nonAcRate)}
                                  className="px-2.5 py-1 rounded-lg text-sm font-black text-foreground hover:bg-muted/80 hover:text-primary border border-transparent hover:border-border cursor-pointer font-mono transition-all shadow-2xs inline-block"
                                  title="Click to edit Non-AC tariff for this date"
                                >
                                  🍃 ₹{nonAcRate.toLocaleString()}
                                </span>
                              ) : (
                                <span
                                  onClick={() => handleOpenPriceModal(rt, d.dateStr, true, acRate!)}
                                  className="px-2.5 py-1 rounded-lg text-sm font-black text-foreground hover:bg-muted/80 hover:text-primary border border-transparent hover:border-border cursor-pointer font-mono transition-all shadow-2xs inline-block"
                                  title="Click to edit AC tariff for this date"
                                >
                                  ❄️ ₹{acRate?.toLocaleString()}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expandable Rows: Inventory & Availability Row */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-border/40 text-[11px]">
                          <td className="p-2 pl-6 sticky left-0 z-10 bg-emerald-50/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-border">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span className="font-black text-emerald-800 dark:text-emerald-300">
                                  Free Inventory / Rooms Left
                                </span>
                              </div>
                              {((rt.rooms?.length ?? 0) === 0 || (Object.values(roomInv)[0]?.totalRooms ?? 0) === 0) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRoomTypeIdForAdd(rt.id);
                                    setIsAddRoomModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                  title="No physical rooms configured. Click to add rooms."
                                >
                                  <Plus className="h-3 w-3" /> Add Room
                                </button>
                              )}
                            </div>
                          </td>

                          {visibleDaysArray.map((d) => {
                            const invData = roomInv[d.dateStr];
                            const total = invData ? invData.totalRooms : 0;
                            const isStop = invData ? invData.isStopSell : false;
                            const isToday = d.dateStr === todayStr;

                            // Dynamic inventory display according to selected channel filter
                            let available = invData ? invData.availableCount : 0;
                            if (invData && selectedChannelView !== 'OREEDU_PMS') {
                              const specificOverride = invData.channelOverrides?.[selectedChannelView];
                              const allOverride = invData.channelOverrides?.['ALL'];
                              const effectiveCap = specificOverride !== undefined ? specificOverride : allOverride;
                              if (effectiveCap !== undefined) {
                                available = Math.min(effectiveCap, invData.availableCount);
                              }
                            }

                            return (
                              <td
                                key={d.dateStr}
                                onClick={() => {
                                  if (total === 0) {
                                    setSelectedRoomTypeIdForAdd(rt.id);
                                    setIsAddRoomModalOpen(true);
                                    return;
                                  }
                                  setChannelInvModalData({
                                    roomType: rt,
                                    dateStr: d.dateStr,
                                    totalRooms: total,
                                    bookedCount: invData ? invData.bookedCount : 0,
                                    availableCount: invData ? invData.availableCount : 0,
                                    existingChannelOverrides: invData?.channelOverrides || {},
                                  });
                                }}
                                className={`p-1.5 text-center border-r border-border/40 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-colors ${
                                  isToday ? 'bg-primary/[0.08]' : ''
                                }`}
                                title="Click to adjust channel allotments & ceilings"
                              >
                                {isStop ? (
                                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                    🛑 Closed
                                  </span>
                                ) : total === 0 ? (
                                  <span
                                    className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors inline-flex items-center gap-1 font-mono"
                                    title="This room type has 0 physical rooms. Click to create a room."
                                  >
                                    <Plus className="h-3 w-3 inline" /> 0 Rooms
                                  </span>
                                ) : available === 0 ? (
                                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-mono">
                                    0 Sold Out
                                  </span>
                                ) : available <= 1 ? (
                                  <span className="px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-mono">
                                    {available}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                                    {available}
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
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <ShieldAlert className="h-3 w-3 text-amber-600" />
                                <span className="font-extrabold text-amber-800 dark:text-amber-300">
                                  Restrictions (Min Stay / CTA / CTD)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoomForBulk(rt);
                                  setIsRestrictionsModalOpen(true);
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                title="View & configure all stay restrictions across dates"
                              >
                                🛡️ Manage All
                              </button>
                            </div>
                          </td>

                          {visibleDaysArray.map((d) => {
                            const rData = roomRestr[d.dateStr];
                            const minStay = rData?.minStayArrival;
                            const isStop = rData?.stopSell;
                            const cta = rData?.closedToArrival;
                            const ctd = rData?.closedToDeparture;
                            const isToday = d.dateStr === todayStr;

                            return (
                              <td
                                key={d.dateStr}
                                onClick={() => {
                                  setRestrictionChooser({
                                    roomTypeId: rt.id,
                                    roomTypeName: rt.name,
                                    dateStr: d.dateStr,
                                    currentMinStay: minStay,
                                    currentStopSell: Boolean(isStop),
                                    currentCta: Boolean(cta),
                                    currentCtd: Boolean(ctd),
                                  });
                                  if (isStop) {
                                    setChosenRestrictionAction('STOP_SELL');
                                  } else if (cta) {
                                    setChosenRestrictionAction('CTA');
                                  } else if (ctd) {
                                    setChosenRestrictionAction('CTD');
                                  } else if (minStay && minStay > 1) {
                                    setChosenRestrictionAction('MIN_STAY');
                                  } else {
                                    setChosenRestrictionAction('STOP_SELL');
                                  }
                                }}
                                className={`p-1.5 text-center border-r border-border/40 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/40 transition-colors ${
                                  isToday ? 'bg-primary/[0.08]' : ''
                                }`}
                                title="Click to view and configure restrictions for this date"
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  {isStop ? (
                                    <span className="px-1.5 py-0.5 rounded text-xs font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                      🛑 Stop
                                    </span>
                                  ) : (
                                    <>
                                      {minStay && minStay > 1 ? (
                                        <span className="px-1.5 py-0.5 rounded text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-300 font-mono">
                                          {minStay}N Min
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground font-black font-mono">1N</span>
                                      )}
                                      {(cta || ctd) && (
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                          {cta && (
                                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-700 border border-amber-500/30">
                                              CTA
                                            </span>
                                          )}
                                          {ctd && (
                                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-purple-500/20 text-purple-700 border border-purple-500/30">
                                              CTD
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Optional Rate Plan Sub-Rows (Shown only when toggled ON) */}
                      {showRatePlans && isExpanded &&
                        plans.flatMap((plan) => {
                          const isPrimaryPlan = Boolean(plan.isPrimary);
                          const variants: Array<{ isAc: boolean; label: string; key: string }> =
                            rt.acOption === 'BOTH'
                              ? [
                                  { isAc: false, label: '🍃 Non-AC', key: `${plan.id}-nonac` },
                                  { isAc: true, label: '❄️ AC', key: `${plan.id}-ac` },
                                ]
                              : rt.acOption === 'NON_AC_ONLY'
                              ? [{ isAc: false, label: '🍃 Non-AC', key: `${plan.id}-nonac` }]
                              : [{ isAc: true, label: '❄️ AC', key: `${plan.id}-ac` }];

                          return variants.map((variant) => (
                            <tr
                              key={`${rt.id}-${variant.key}`}
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

                                    <span
                                      className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md border shadow-xs ${
                                        variant.isAc
                                          ? 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-200 dark:border-cyan-700'
                                          : 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-700'
                                      }`}
                                    >
                                      {variant.label}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Daily Rate Cells */}
                              {visibleDaysArray.map((d) => {
                                const calculatedPrice = getRateForPlanAndDate(plan, d.dateStr, rt, variant.isAc);
                                const isToday = d.dateStr === todayStr;
                                const isEditingThis =
                                  editingCell?.ratePlanId === plan.id &&
                                  editingCell?.roomTypeId === rt.id &&
                                  editingCell?.dateStr === d.dateStr &&
                                  Boolean(editingCell?.isAc) === Boolean(variant.isAc);

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
                                            if (e.key === 'Enter') handleRequestPriceChange();
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                          className="w-16 px-1.5 py-1 text-xs font-bold text-center rounded border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-xs"
                                        />
                                        <button
                                          onClick={handleRequestPriceChange}
                                          className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer"
                                          title="Apply Rate & Sync"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => handleOpenPriceModal(rt, d.dateStr, variant.isAc, calculatedPrice, plan.id)}
                                        className="cursor-pointer py-1 px-1 rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                                        title={`Click to edit ${variant.label} rate`}
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
                          ));
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
      {quickEditInv && (() => {
        const targetRoom = roomTypes.find((r) => r.id === quickEditInv.roomTypeId);

        // When room type has 0 physical rooms configured:
        if (quickEditInv.totalRooms === 0) {
          return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-amber-500" />
                    Physical Rooms Setup Required
                  </h4>
                  <button
                    type="button"
                    onClick={() => setQuickEditInv(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-foreground">
                      {targetRoom?.name || 'This Room Type'} has 0 Rooms
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      This room type currently has 0 physical rooms. Please create physical rooms under this room type to edit and manage daily inventory.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickEditInv(null)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rtId = quickEditInv.roomTypeId;
                      setQuickEditInv(null);
                      setSelectedRoomTypeIdForAdd(rtId);
                      setIsAddRoomModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm shadow-primary/20 cursor-pointer transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Physical Room
                  </button>
                </div>
              </div>
            </div>
          );
        }

        const inputNum = Number(invOverrideInput);
        const isExceeded = !isNaN(inputNum) && inputNum > quickEditInv.totalRooms;
        const isNegative = !isNaN(inputNum) && inputNum < 0;
        const isInvalid = invOverrideInput === '' || isNaN(inputNum) || isExceeded || isNegative;

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
              <h4 className="font-bold text-sm text-foreground">
                Adjust Room Inventory ({quickEditInv.dateStr})
              </h4>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Sellable Rooms Limit
                  </label>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Max Physical: {quickEditInv.totalRooms}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={quickEditInv.totalRooms}
                  value={invOverrideInput}
                  onChange={(e) => setInvOverrideInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-background text-sm font-bold focus:outline-none transition-colors ${
                    isExceeded || isNegative
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'border-border focus:border-primary'
                  }`}
                />
                {isExceeded && (
                  <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span>⚠️</span> Cannot exceed total physical rooms ({quickEditInv.totalRooms})
                  </p>
                )}
                {isNegative && (
                  <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span>⚠️</span> Inventory cannot be negative
                  </p>
                )}
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
                  onClick={handleRequestInventoryChange}
                  disabled={isInvalid}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Next: Confirm & Sync →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3-Stage Multi-Channel Price / Tariff Allotment Modal */}
      {channelPriceModalData && (
        <ChannelPriceEditorModal
          isOpen={Boolean(channelPriceModalData)}
          onClose={() => setChannelPriceModalData(null)}
          propertyId={propertyId}
          roomType={channelPriceModalData.roomType}
          ratePlanId={channelPriceModalData.ratePlanId}
          dateStr={channelPriceModalData.dateStr}
          isAc={channelPriceModalData.isAc}
          currentPrice={channelPriceModalData.currentPrice}
          existingChannelPrices={channelPriceModalData.existingChannelPrices}
          activeOtas={activeOtas}
          onSuccess={() => {
            fetchMatrixData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Quick Date Restriction Action Chooser Modal */}
      {restrictionChooser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-foreground flex items-center gap-2">
                    Manage Restriction
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-muted text-foreground">
                      {restrictionChooser.roomTypeName}
                    </span>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {restrictionChooser.dateStr}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestrictionChooser(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Prompt */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Select the restriction action you want to configure for this date:
              </p>
            </div>

            {/* Radio Selection Options */}
            <div className="space-y-2.5">
              {/* Option 1: Stop Sell */}
              <div
                onClick={() => setChosenRestrictionAction('STOP_SELL')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  chosenRestrictionAction === 'STOP_SELL'
                    ? 'border-rose-500 bg-rose-500/10 shadow-xs'
                    : 'border-border/60 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="mt-0.5">
                  <input
                    type="radio"
                    name="restriction_action"
                    checked={chosenRestrictionAction === 'STOP_SELL'}
                    onChange={() => setChosenRestrictionAction('STOP_SELL')}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      🛑 Stop Sell (Close Sales)
                    </span>
                    {restrictionChooser.currentStopSell ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        Active: Closed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        Open
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Completely close bookings for this date or re-open closed inventory.
                  </p>
                </div>
              </div>

              {/* Option 2: Closed to Arrival (CTA) */}
              <div
                onClick={() => setChosenRestrictionAction('CTA')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  chosenRestrictionAction === 'CTA'
                    ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                    : 'border-border/60 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="mt-0.5">
                  <input
                    type="radio"
                    name="restriction_action"
                    checked={chosenRestrictionAction === 'CTA'}
                    onChange={() => setChosenRestrictionAction('CTA')}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      🚫 Closed to Arrival (CTA)
                    </span>
                    {restrictionChooser.currentCta && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Disallow guest check-ins starting on this date (stay-throughs allowed).
                  </p>
                </div>
              </div>

              {/* Option 3: Closed to Departure (CTD) */}
              <div
                onClick={() => setChosenRestrictionAction('CTD')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  chosenRestrictionAction === 'CTD'
                    ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                    : 'border-border/60 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="mt-0.5">
                  <input
                    type="radio"
                    name="restriction_action"
                    checked={chosenRestrictionAction === 'CTD'}
                    onChange={() => setChosenRestrictionAction('CTD')}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      🛫 Closed to Departure (CTD)
                    </span>
                    {restrictionChooser.currentCtd && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Disallow guest check-outs on this date.
                  </p>
                </div>
              </div>

              {/* Option 4: Minimum Stay */}
              <div
                onClick={() => setChosenRestrictionAction('MIN_STAY')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  chosenRestrictionAction === 'MIN_STAY'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                    : 'border-border/60 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="mt-0.5">
                  <input
                    type="radio"
                    name="restriction_action"
                    checked={chosenRestrictionAction === 'MIN_STAY'}
                    onChange={() => setChosenRestrictionAction('MIN_STAY')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      ⏳ Minimum Stay Length
                    </span>
                    {restrictionChooser.currentMinStay && restrictionChooser.currentMinStay > 1 ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                        {restrictionChooser.currentMinStay}N Min
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        Default: 1N
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Require guests to stay at least a minimum number of nights.
                  </p>
                </div>
              </div>

              {/* Option 5: Maximum Stay */}
              <div
                onClick={() => setChosenRestrictionAction('MAX_STAY')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  chosenRestrictionAction === 'MAX_STAY'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                    : 'border-border/60 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="mt-0.5">
                  <input
                    type="radio"
                    name="restriction_action"
                    checked={chosenRestrictionAction === 'MAX_STAY'}
                    onChange={() => setChosenRestrictionAction('MAX_STAY')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      ⌛ Maximum Stay Length
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Set a maximum limit on consecutive nights for bookings across this date.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setRestrictionChooser(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinueFromChooser}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer transition-all"
              >
                Continue to Configure →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Confirmation & OTA Target Selection Modal */}
      <UpdateConfirmationModal
        isOpen={Boolean(confirmModalDetails)}
        onClose={() => setConfirmModalDetails(null)}
        details={confirmModalDetails}
        activeOtas={activeOtas}
        onConfirm={handleConfirmUpdate}
      />

      {/* 3-Stage Multi-Channel Inventory Allotment & Sync Modal */}
      {channelInvModalData && (
        <ChannelInventoryEditorModal
          isOpen={Boolean(channelInvModalData)}
          onClose={() => setChannelInvModalData(null)}
          propertyId={propertyId}
          roomType={channelInvModalData.roomType}
          dateStr={channelInvModalData.dateStr}
          totalRooms={channelInvModalData.totalRooms}
          bookedCount={channelInvModalData.bookedCount}
          availableCount={channelInvModalData.availableCount}
          existingChannelOverrides={channelInvModalData.existingChannelOverrides}
          activeOtas={activeOtas}
          onSuccess={() => {
            fetchMatrixData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* 3 Focused Modals */}
      <BulkRatesModal
        isOpen={isBulkRatesModalOpen}
        onClose={() => setIsBulkRatesModalOpen(false)}
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

      <StayRestrictionsModal
        isOpen={isRestrictionsModalOpen}
        onClose={() => {
          setIsRestrictionsModalOpen(false);
          setRestrictionTargetConfig(null);
        }}
        propertyId={propertyId}
        roomTypeId={selectedRoomForBulk?.id}
        roomTypeName={selectedRoomForBulk?.name || 'All Rooms'}
        roomTypes={roomTypes}
        initialStartDate={restrictionTargetConfig?.startDate}
        initialEndDate={restrictionTargetConfig?.endDate}
        initialAction={restrictionTargetConfig?.action}
        onSuccess={() => {
          fetchMatrixData();
          if (onRefresh) onRefresh();
        }}
      />

      <QuickStopSellModal
        isOpen={isStopSellModalOpen}
        onClose={() => {
          setIsStopSellModalOpen(false);
          setStopSellTargetConfig(null);
        }}
        propertyId={propertyId}
        roomTypeId={selectedRoomForBulk?.id}
        roomTypeName={selectedRoomForBulk?.name || 'All Rooms'}
        roomTypes={roomTypes}
        initialStartDate={stopSellTargetConfig?.startDate}
        initialEndDate={stopSellTargetConfig?.endDate}
        onSuccess={() => {
          fetchMatrixData();
          if (onRefresh) onRefresh();
        }}
      />

      {/* Rate & Restriction Change Log Drawer */}
      <RateChangeLogDrawer
        isOpen={isChangeLogOpen}
        onClose={() => setIsChangeLogOpen(false)}
        propertyId={propertyId}
        roomTypes={roomTypes}
      />

      {/* Full Sync Audit & Pre-Check Modal */}
      <FullSyncAuditModal
        isOpen={isFullSyncModalOpen}
        onClose={() => setIsFullSyncModalOpen(false)}
        propertyId={propertyId}
        onSuccess={() => {
          fetchMatrixData();
          if (onRefresh) onRefresh();
        }}
      />

      {/* Add Physical Room Modal */}
      {isAddRoomModalOpen && (
        <AddRoomModal
          isOpen={isAddRoomModalOpen}
          onClose={() => setIsAddRoomModalOpen(false)}
          propertyId={propertyId}
          roomTypes={roomTypes}
          defaultRoomTypeId={selectedRoomTypeIdForAdd}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            fetchMatrixData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
