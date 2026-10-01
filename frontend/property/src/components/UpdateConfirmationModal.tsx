import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowRight, 
  Globe, 
  Building2, 
  Calendar, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Server,
  Layers
} from 'lucide-react';

export interface UpdateConfirmationDetails {
  type: 'PRICE' | 'INVENTORY';
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId?: string;
  ratePlanName?: string;
  dateStr: string;
  oldValue: number;
  newValue: number;
  currencySymbol?: string;
}

export interface TargetChannelItem {
  id: string;
  name: string;
  category: 'OREEDU' | 'OTA';
  channelCode?: string;
  description: string;
  isSimulated?: boolean;
  badge?: string;
}

export interface UpdateConfirmationConfirmPayload {
  syncMode: 'ALL' | 'SPECIFIC' | 'PMS_ONLY';
  selectedChannelIds: string[];
  selectedChannelDetails: {
    oreeduPms: boolean;
    oreeduOtaPortal: boolean;
    oreeduCpPortal: boolean;
    selectedOtas: Array<{ id: string; name: string; isSimulated?: boolean }>;
  };
}

interface UpdateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: UpdateConfirmationDetails | null;
  activeOtas: Array<{
    id: string;
    title: string;
    channel: string;
    isActive: boolean;
  }>;
  onConfirm: (target: UpdateConfirmationConfirmPayload) => Promise<void>;
}

// Fixed Oreedu Internal Channels
const OREEDU_INTERNAL_CHANNELS: TargetChannelItem[] = [
  {
    id: 'OREEDU_PMS',
    name: 'oreedu PMS',
    category: 'OREEDU',
    description: 'Core Property Management System & Front Desk Rate Engine',
    badge: 'PMS Core',
    isSimulated: false,
  },
  {
    id: 'OREEDU_OTA_PORTAL',
    name: 'oreedu OTA portal',
    category: 'OREEDU',
    description: 'Direct Guest Booking Engine (oreedu.com web/mobile guest portal)',
    badge: 'Guest Portal (Simulated)',
    isSimulated: true,
  },
  {
    id: 'OREEDU_CP_PORTAL',
    name: 'oreedu CP portal',
    category: 'OREEDU',
    description: 'Channel Partner & Travel Agent B2B portal rate distributor',
    badge: 'B2B Partner (Simulated)',
    isSimulated: true,
  },
];

// Fallback dummy OTAs if property does not have live Channex OTA links configured
const FALLBACK_DUMMY_OTAS: TargetChannelItem[] = [
  {
    id: 'DUMMY_OTA_1',
    name: 'Booking.com',
    category: 'OTA',
    channelCode: 'BOOKING_COM',
    description: 'Connected OTA 1 — Global hotel reservations',
    badge: 'OTA 1 (Simulated)',
    isSimulated: true,
  },
  {
    id: 'DUMMY_OTA_2',
    name: 'Agoda',
    category: 'OTA',
    channelCode: 'AGODA',
    description: 'Connected OTA 2 — Asia-Pacific booking network',
    badge: 'OTA 2 (Simulated)',
    isSimulated: true,
  },
  {
    id: 'DUMMY_OTA_3',
    name: 'MakeMyTrip',
    category: 'OTA',
    channelCode: 'MMT',
    description: 'Connected OTA 3 — India & domestic distribution',
    badge: 'OTA 3 (Simulated)',
    isSimulated: true,
  },
  {
    id: 'DUMMY_OTA_4',
    name: 'Expedia',
    category: 'OTA',
    channelCode: 'EXPEDIA',
    description: 'Connected OTA 4 — North America & international',
    badge: 'OTA 4 (Simulated)',
    isSimulated: true,
  },
];

export const UpdateConfirmationModal: React.FC<UpdateConfirmationModalProps> = ({
  isOpen,
  onClose,
  details,
  activeOtas,
  onConfirm,
}) => {
  // Construct the unified list of all available channels
  const allChannels: TargetChannelItem[] = React.useMemo(() => {
    const otaList: TargetChannelItem[] = 
      activeOtas && activeOtas.length > 0
        ? activeOtas.map((ota, idx) => ({
            id: ota.id,
            name: ota.title || `connected OTA ${idx + 1}`,
            category: 'OTA' as const,
            channelCode: ota.channel,
            description: `Live OTA sync via Channex (${ota.channel.toUpperCase()})`,
            badge: `Live OTA ${idx + 1}`,
            isSimulated: false,
          }))
        : FALLBACK_DUMMY_OTAS;

    return [...OREEDU_INTERNAL_CHANNELS, ...otaList];
  }, [activeOtas]);

  // Selected channel IDs state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Initialize all selected by default whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(allChannels.map((c) => c.id));
    }
  }, [isOpen, allChannels]);

  // Master checkbox states
  const isAllSelected = allChannels.length > 0 && selectedIds.length === allChannels.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < allChannels.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  if (!isOpen || !details) return null;

  const isPrice = details.type === 'PRICE';
  const currency = details.currencySymbol || '₹';

  // Format date nicely
  const formattedDate = (() => {
    try {
      const d = new Date(`${details.dateStr}T00:00:00.000Z`);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return details.dateStr;
    }
  })();

  const difference = details.newValue - details.oldValue;
  const percentChange = details.oldValue > 0 
    ? Math.round((difference / details.oldValue) * 100) 
    : 0;

  // Toggle master "All"
  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allChannels.map((c) => c.id));
    }
  };

  // Toggle individual channel
  const handleToggleChannel = (channelId: string) => {
    setSelectedIds((prev) => 
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleApply = async () => {
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const hasOreeduPms = selectedIds.includes('OREEDU_PMS');
      const hasOreeduOta = selectedIds.includes('OREEDU_OTA_PORTAL');
      const hasOreeduCp = selectedIds.includes('OREEDU_CP_PORTAL');

      // Separate OTA channel selections
      const otaChannels = allChannels.filter((c) => c.category === 'OTA');
      const selectedOtaItems = otaChannels.filter((c) => selectedIds.includes(c.id));
      const liveOtaIds = selectedOtaItems.map((c) => c.id);

      // Determine backward-compatible syncMode
      let syncMode: 'ALL' | 'SPECIFIC' | 'PMS_ONLY' = 'ALL';
      if (selectedOtaItems.length === 0) {
        syncMode = 'PMS_ONLY';
      } else if (selectedOtaItems.length === otaChannels.length && hasOreeduPms) {
        syncMode = 'ALL';
      } else {
        syncMode = 'SPECIFIC';
      }

      await onConfirm({
        syncMode,
        selectedChannelIds: liveOtaIds,
        selectedChannelDetails: {
          oreeduPms: hasOreeduPms,
          oreeduOtaPortal: hasOreeduOta,
          oreeduCpPortal: hasOreeduCp,
          selectedOtas: selectedOtaItems.map((o) => ({
            id: o.id,
            name: o.name,
            isSimulated: o.isSimulated,
          })),
        },
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isPrice 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {isPrice ? <Sparkles className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground leading-tight">
                {isPrice ? 'Confirm Rate Update' : 'Confirm Inventory Update'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span className="font-medium">{formattedDate}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Target Description */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Target Room & Plan</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground text-sm">
                {details.roomTypeName}
              </span>
              {details.ratePlanName && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {details.ratePlanName}
                </span>
              )}
            </div>
          </div>

          {/* Change Summary Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Proposed Change:</div>
            
            <div className="flex items-center justify-between gap-3">
              {/* Old Value */}
              <div className="flex-1 p-3 rounded-xl bg-background border border-border text-center">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Previous</span>
                <span className="text-base font-extrabold text-muted-foreground/90 font-mono">
                  {isPrice ? `${currency}${details.oldValue.toLocaleString()}` : `${details.oldValue} rooms`}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center text-primary">
                <ArrowRight className="h-5 w-5" />
                <span className={`text-[10px] font-bold font-mono mt-0.5 ${
                  difference > 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : difference < 0 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-muted-foreground'
                }`}>
                  {difference > 0 ? `+${difference}` : difference}
                  {isPrice && percentChange !== 0 ? ` (${percentChange > 0 ? '+' : ''}${percentChange}%)` : ''}
                </span>
              </div>

              {/* New Value */}
              <div className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/30 text-center">
                <span className="block text-[10px] font-bold text-primary uppercase">New Target</span>
                <span className="text-base font-black text-primary font-mono">
                  {isPrice ? `${currency}${details.newValue.toLocaleString()}` : `${details.newValue} rooms`}
                </span>
              </div>
            </div>
          </div>

          {/* Channel Checklist Target Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Select Distribution Targets
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                {selectedIds.length} of {allChannels.length} channels selected
              </span>
            </div>

            {/* Checklist Container */}
            <div className="rounded-2xl border border-border/80 bg-background overflow-hidden divide-y divide-border/60">
              
              {/* [ ] Master Checkbox: ALL */}
              <label 
                className={`flex items-center justify-between px-3.5 py-3 cursor-pointer transition-colors ${
                  isAllSelected 
                    ? 'bg-primary/10' 
                    : isPartiallySelected 
                    ? 'bg-primary/5' 
                    : 'hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      className="h-4.5 w-4.5 rounded-md border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-foreground tracking-wide uppercase">
                      All Channels & Portals
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  Master Toggle
                </span>
              </label>

              {/* Oreedu Internal Channels Section */}
              <div className="p-2 space-y-1.5 bg-muted/15">
                <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  Oreedu Portals & Core
                </div>

                {OREEDU_INTERNAL_CHANNELS.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-card border-primary/40 shadow-xs'
                          : 'bg-card/40 border-border/60 opacity-60 hover:opacity-100 hover:bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleChannel(item.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {item.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {item.badge && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                          item.isSimulated
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {/* External OTAs Section */}
              <div className="p-2 space-y-1.5 bg-background">
                <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  Connected OTAs (Channex)
                </div>

                {allChannels
                  .filter((c) => c.category === 'OTA')
                  .map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-card border-primary/40 shadow-xs'
                            : 'bg-card/40 border-border/60 opacity-60 hover:opacity-100 hover:bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChannel(item.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {item.name}
                              </span>
                              {item.channelCode && (
                                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">
                                  {item.channelCode}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {item.badge && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                            item.isSimulated
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2.5">
          <div className="text-[11px] text-muted-foreground">
            {selectedIds.length === 0 ? (
              <span className="text-rose-500 font-semibold">Select at least 1 target</span>
            ) : (
              <span>Ready to update <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'target' : 'targets'}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isSubmitting || selectedIds.length === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm & Apply ({selectedIds.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
