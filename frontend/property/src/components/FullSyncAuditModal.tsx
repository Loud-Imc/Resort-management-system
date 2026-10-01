import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Building2,
  Utensils,
  Sparkles,
  Zap,
} from 'lucide-react';
import { channelsService } from '../services/channels';
import toast from 'react-hot-toast';

interface FullSyncAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess?: () => void;
}

export const FullSyncAuditModal: React.FC<FullSyncAuditModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);

  // Sync settings
  const [syncDays, setSyncDays] = useState<number>(365);
  const [selectedChannelMode, setSelectedChannelMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const data = await channelsService.getRatePlanMappings(propertyId);
      setAuditData(data);
    } catch (err: any) {
      toast.error('Failed to load channel mapping audit details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && propertyId) {
      loadAuditData();
    }
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  const roomTypes: any[] = auditData?.roomTypes || [];
  const activeOtas: any[] = auditData?.activeOtas || [];

  // Summary counts
  let totalPlansCount = 0;
  let mappedPlansCount = 0;
  roomTypes.forEach((rt) => {
    (rt.ratePlans || []).forEach((rp: any) => {
      (rp.variants || []).forEach((v: any) => {
        totalPlansCount++;
        if (v.isMapped) mappedPlansCount++;
      });
    });
  });

  const unmappedPlansCount = totalPlansCount - mappedPlansCount;

  const handleToggleChannel = (id: string) => {
    if (selectedChannelIds.includes(id)) {
      setSelectedChannelIds(selectedChannelIds.filter((chId) => chId !== id));
    } else {
      setSelectedChannelIds([...selectedChannelIds, id]);
    }
  };

  const handleAutoProvision = async () => {
    setProvisioning(true);
    try {
      toast.loading('Auto-provisioning missing rate plans on Channex...', { id: 'prov' });
      const updated = await channelsService.autoProvisionRatePlans(propertyId);
      setAuditData(updated);
      toast.success('Successfully provisioned & mapped missing rate plans!', { id: 'prov' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to auto-provision rate plans', { id: 'prov' });
    } finally {
      setProvisioning(false);
    }
  };

  const handleExecuteFullSync = async () => {
    setSyncing(true);
    try {
      await channelsService.pushAri(propertyId, syncDays);
      toast.success(`🚀 Full ${syncDays}-day ARI successfully synced to Channex and OTAs!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch full sync');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-foreground">OTA Channel Synchronization & Audit</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Channex 2-Way
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review rate plan mapping health, connected booking channels, and trigger verified ARI distribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={syncing}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm font-bold text-muted-foreground">Auditing rate plans and OTA mappings...</p>
            </div>
          ) : (
            <>
              {/* Mapping Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Connected OTAs</span>
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-black text-foreground">{activeOtas.length}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {activeOtas.length > 0
                      ? activeOtas.map((o) => o.title || o.channel).join(', ')
                      : 'No active OTAs connected'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Mapped Plans</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {mappedPlansCount} <span className="text-xs font-semibold text-muted-foreground">/ {totalPlansCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Ready for live OTA broadcast
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  unmappedPlansCount > 0
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-muted/40 border-border/80'
                }`}>
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Unmapped Plans</span>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className={`text-2xl font-black ${unmappedPlansCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                    {unmappedPlansCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {unmappedPlansCount > 0 ? 'Missing on Channex (Will be skipped)' : 'All plans 100% mapped!'}
                  </div>
                </div>
              </div>

              {/* Unmapped Notice & Quick Fix Action */}
              {unmappedPlansCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {unmappedPlansCount} rate plan variant(s) are not yet created on Channex
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Click below to auto-provision them on Channex before pushing rates.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoProvision}
                    disabled={provisioning}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${provisioning ? 'animate-spin' : ''}`} />
                    {provisioning ? 'Provisioning...' : 'Auto-Provision on Channex'}
                  </button>
                </div>
              )}

              {/* Rate Plan & Variant Mapping Breakdown by Room Type */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Room Types & Meal Plans Audit
                </div>

                <div className="space-y-3">
                  {roomTypes.map((rt: any) => (
                    <div key={rt.id} className="border border-border/80 rounded-2xl overflow-hidden bg-card/50">
                      {/* Room Type Bar */}
                      <div className="px-4 py-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-extrabold text-sm text-foreground">{rt.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {rt.acOption === 'BOTH' ? 'Dual (AC & Non-AC)' : rt.acOption}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rt.isMapped ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Channex Room Mapped
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Room Not Mapped
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Plans & Variants Grid */}
                      <div className="p-3 divide-y divide-border/40">
                        {(rt.ratePlans || []).map((rp: any) => (
                          <div key={rp.id} className="py-2.5 first:pt-1 last:pb-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-bold text-foreground">{rp.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                  {rp.mealPlan}
                                </span>
                                {rp.isPrimary && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600">
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Variants List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {(rp.variants || []).map((v: any, vIdx: number) => (
                                <div
                                  key={vIdx}
                                  className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                                    v.isMapped
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                                      : 'bg-muted/30 border-dashed border-border text-muted-foreground'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold flex items-center gap-1.5">
                                      <span>{v.title}</span>
                                      <span className="font-mono text-[11px] font-extrabold text-foreground">
                                        ₹{v.basePrice?.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      {v.externalRatePlanId ? `Channex ID: ${v.externalRatePlanId.substring(0, 10)}...` : 'Not linked'}
                                    </div>
                                  </div>
                                  <div>
                                    {v.isMapped ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Configuration Controls */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Sync Horizon</label>
                  <div className="flex items-center gap-1.5">
                    {[30, 60, 90, 180, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSyncDays(days)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          syncDays === days
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Channels */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <label className="text-xs font-bold text-foreground">Distribution Scope</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedChannelMode === 'ALL'
                          ? 'bg-primary/10 border-primary text-foreground font-bold'
                          : 'bg-background hover:bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="channelMode"
                        checked={selectedChannelMode === 'ALL'}
                        onChange={() => setSelectedChannelMode('ALL')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-xs">All Connected OTAs (Default)</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedChannelMode === 'SPECIFIC'
                          ? 'bg-primary/10 border-primary text-foreground font-bold'
                          : 'bg-background hover:bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="channelMode"
                        checked={selectedChannelMode === 'SPECIFIC'}
                        onChange={() => setSelectedChannelMode('SPECIFIC')}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-xs">Selected OTAs Only</span>
                    </label>
                  </div>

                  {selectedChannelMode === 'SPECIFIC' && (
                    <div className="p-3 bg-background rounded-xl border border-border space-y-2 mt-2">
                      {activeOtas.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No active OTAs found.</p>
                      ) : (
                        activeOtas.map((ota: any) => (
                          <label key={ota.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedChannelIds.includes(ota.id)}
                              onChange={() => handleToggleChannel(ota.id)}
                              className="rounded text-primary focus:ring-primary"
                            />
                            <span className="font-bold text-foreground">{ota.title || ota.channel}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-border flex items-center justify-between bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={syncing}
            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteFullSync}
            disabled={loading || syncing}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing to OTAs...' : `Execute Full Sync (${syncDays} Days)`}
          </button>
        </div>
      </div>
    </div>
  );
};
