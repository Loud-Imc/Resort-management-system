import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  Globe, 
  SlidersHorizontal, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar,
  Sparkles,
  Loader2
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
  onConfirm: (target: {
    syncMode: 'ALL' | 'SPECIFIC' | 'PMS_ONLY';
    selectedChannelIds: string[];
  }) => Promise<void>;
}

export const UpdateConfirmationModal: React.FC<UpdateConfirmationModalProps> = ({
  isOpen,
  onClose,
  details,
  activeOtas,
  onConfirm,
}) => {
  const [syncMode, setSyncMode] = useState<'ALL' | 'SPECIFIC' | 'PMS_ONLY'>('ALL');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleToggleChannel = (channelId: string) => {
    if (selectedChannelIds.includes(channelId)) {
      setSelectedChannelIds(selectedChannelIds.filter((id) => id !== channelId));
    } else {
      setSelectedChannelIds([...selectedChannelIds, channelId]);
    }
  };

  const handleApply = async () => {
    if (syncMode === 'SPECIFIC' && selectedChannelIds.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm({
        syncMode,
        selectedChannelIds,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
        <div className="p-6 space-y-6 overflow-y-auto">
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

          {/* Channel / OTA Sync Target Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Sync to Channels & OTAs
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Connected via Channex
              </span>
            </div>

            <div className="space-y-2">
              {/* Option 1: All Connected OTAs */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  syncMode === 'ALL'
                    ? 'bg-primary/5 border-primary shadow-xs'
                    : 'bg-background hover:bg-muted/40 border-border/70'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="ALL"
                  checked={syncMode === 'ALL'}
                  onChange={() => setSyncMode('ALL')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">All Connected OTAs (Default)</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-primary/10 text-primary rounded-md">
                      Auto-broadcast
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Updates this room rate & availability across all connected booking channels via Channex.
                  </p>
                </div>
              </label>

              {/* Option 2: Specific OTAs */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  syncMode === 'SPECIFIC'
                    ? 'bg-primary/5 border-primary shadow-xs'
                    : 'bg-background hover:bg-muted/40 border-border/70'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="SPECIFIC"
                  checked={syncMode === 'SPECIFIC'}
                  onChange={() => setSyncMode('SPECIFIC')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Selected Connected OTA(s) Only</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Apply this override only to specific channels (e.g. Booking.com, Agoda, Expedia).
                  </p>

                  {/* Channel Checkbox Selector List */}
                  {syncMode === 'SPECIFIC' && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      {activeOtas.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>No active OTAs connected yet on Channex. Change will apply to PMS.</span>
                        </div>
                      ) : (
                        activeOtas.map((ota) => {
                          const isChecked = selectedChannelIds.includes(ota.id);
                          return (
                            <label
                              key={ota.id}
                              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-primary/10 border-primary/40 text-foreground'
                                  : 'bg-card border-border/60 hover:bg-muted/40 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleChannel(ota.id)}
                                  className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-xs font-bold text-foreground">{ota.title}</span>
                              </div>
                              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                                {ota.channel}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: PMS Only */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  syncMode === 'PMS_ONLY'
                    ? 'bg-amber-500/5 border-amber-500/50 shadow-xs'
                    : 'bg-background hover:bg-muted/40 border-border/70'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="PMS_ONLY"
                  checked={syncMode === 'PMS_ONLY'}
                  onChange={() => setSyncMode('PMS_ONLY')}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-foreground">PMS Only (Internal Direct Engine)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Save internally to your property PMS only. Do not push this update to external OTAs.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5">
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
            disabled={isSubmitting || (syncMode === 'SPECIFIC' && selectedChannelIds.length === 0 && activeOtas.length > 0)}
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
                Confirm & Apply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
