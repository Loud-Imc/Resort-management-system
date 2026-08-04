import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { channelsService, type ChannelPropertyMapping } from '../../services/channels';
import { propertiesService } from '../../services/properties';
import toast from 'react-hot-toast';
import {
  RefreshCw, Plus,
  CheckCircle2, AlertCircle, Loader2,
  Zap, Globe, ShieldCheck, Power, ArrowRight, Layers,
  BookOpen, X, Search, Check, TrendingUp, Users
} from 'lucide-react';
import clsx from 'clsx';
import { ChannexOtaModal } from '../../components/Channels/ChannexOtaModal';

export default function CalendarSync() {
  const { selectedProperty } = useProperty();
  
  // Channel Manager State
  const [mappings, setMappings] = useState<ChannelPropertyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingChannel, setEnablingChannel] = useState(false);
  const [pushingAri, setPushingAri] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<{
    hasCoordinates: boolean;
    hasImages: boolean;
    hasRoomTypes: boolean;
    hasRooms: boolean;
    hasPolicies: boolean;
  } | null>(null);

  // Dedicated Channel Configuration Modal state matching exact Channex schema
  const [activeOtaModal, setActiveOtaModal] = useState<{ open: boolean; otaKey: string; otaTitle: string } | null>(null);
  const [otaConfigs, setOtaConfigs] = useState<Record<string, any>>({});
  const [emergencyStopSell, setEmergencyStopSell] = useState(false);

  // Custom System Confirm Modal (`replacing window.confirm`)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Owner Guide & Benefits Modal (`Why Use Calendar Sync`)
  const [ownerGuideModal, setOwnerGuideModal] = useState(false);

  // Dynamic + Add Another OTA Channel state
  const [customOtaModal, setCustomOtaModal] = useState(false);
  const [customOtaSearch, setCustomOtaSearch] = useState('');
  const [customOtaList, setCustomOtaList] = useState<any[]>([]);
  const [availableCatalog, setAvailableCatalog] = useState<any[]>([]);
  const [directoryCategory, setDirectoryCategory] = useState<string>('All');

  // Actionable Setup Modal State when rooms or room types are missing
  const [setupModal, setSetupModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    setCatalogLoading(true);
    channelsService.getCatalog().then(data => {
      if (data && data.length > 0) setAvailableCatalog(data);
    })
    .catch(err => console.error("Failed to load Channex channel catalog from API:", err))
    .finally(() => setCatalogLoading(false));

    if (selectedProperty?.id) {
      loadMappings();
    }
  }, [selectedProperty?.id]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const [mappingsData, readinessData] = await Promise.all([
        channelsService.getMappings(selectedProperty!.id).catch(() => []),
        propertiesService.getReadiness(selectedProperty!.id).catch(() => null),
      ]);
      setMappings(mappingsData || []);
      setReadiness(readinessData);

      // Auto-load secure Channex iframe session link when active mapping exists
      const activeMapping = (mappingsData || []).find((m: any) => m.isActive);
      if (activeMapping) {
        channelsService.getIframeUrl(selectedProperty!.id)
          .then(res => setIframeUrl(res.url))
          .catch(err => {
            console.error("Auto loading iframe failed:", err);
            setIframeUrl(null);
          });
      } else {
        setIframeUrl(null);
      }

      // Parse and populate OTA channel connection statuses and settings dynamically
      const initialStatus: Record<string, { connected: boolean; hotelId?: string }> = {};
      const initialConfigs: Record<string, any> = {};

      (mappingsData || []).forEach((m: any) => {
        const otaKeyLower = m.channelName.toLowerCase();
        initialStatus[otaKeyLower] = {
          connected: m.isActive,
          hotelId: m.externalPropertyId,
        };
        if (m.apiKey) {
          try {
            initialConfigs[otaKeyLower] = JSON.parse(m.apiKey);
          } catch (e) {
            initialConfigs[otaKeyLower] = {};
          }
        } else {
          initialConfigs[otaKeyLower] = {};
        }
        initialConfigs[otaKeyLower].hotelId = m.externalPropertyId;
      });

      setConnectedOtaStatus(initialStatus);
      setOtaConfigs(initialConfigs);
    } catch (err) {
      toast.error('Failed to load sync settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableChannelSync = async (channelName = 'CHANNEX') => {
    if (!selectedProperty?.id) return;
    
    // Intercept if property profile readiness checklist is incomplete
    if (readiness) {
      const pending = [];
      if (!readiness.hasCoordinates) pending.push("Set Map Coordinates");
      if (!readiness.hasRoomTypes) pending.push("Create Room Types");
      if (!readiness.hasRooms) pending.push("Add Rooms");
      if (!readiness.hasImages) pending.push("Upload Property Images");
      if (!readiness.hasPolicies) pending.push("Set Cancellation Policies");

      if (pending.length > 0) {
        setSetupModal({
          open: true,
          title: "Property Readiness Checklist Incomplete",
          message: `Before enabling live 2-way channel synchronization, you must complete the Property Readiness Checklist on the Dashboard. Currently missing: ${pending.join(", ")}.`
        });
        return;
      }
    }

    try {
      setEnablingChannel(true);
      await channelsService.enableSync(selectedProperty.id, channelName);
      toast.success(`Automated 2-Way Channel Sync Enabled for ${selectedProperty.name}!`);
      await loadMappings();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.includes('SETUP_REQUIRED') || errMsg.includes('No physical room') || errMsg.includes('No Room Types')) {
        setSetupModal({
          open: true,
          title: 'Room Types & Inventory Setup Required',
          message: errMsg.replace('SETUP_REQUIRED: ', ''),
        });
      } else {
        toast.error(errMsg || 'Failed to enable channel sync. Check master credentials.');
      }
    } finally {
      setEnablingChannel(false);
    }
  };

  const handleDisableChannelSync = async (channelName = 'CHANNEX') => {
    if (!selectedProperty?.id) return;
    setConfirmModal({
      open: true,
      title: 'Pause Real-Time OTA Sync?',
      message: `Are you sure you want to pause live 2-way room and price synchronization with ${channelName}? Incoming reservations will no longer auto-lock physical rooms while paused.`,
      confirmLabel: 'Yes, Pause Sync',
      confirmColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        try {
          await channelsService.disableSync(selectedProperty.id, channelName);
          toast.success('Channel Sync Paused');
          await loadMappings();
        } catch (err: any) {
          toast.error('Failed to pause sync');
        }
      }
    });
  };

  const handlePushAri = async () => {
    if (!selectedProperty?.id) return;
    try {
      setPushingAri(true);
      await channelsService.pushAri(selectedProperty.id, 60);
      toast.success('⚡ Successfully pushed live rates & room availability across all connected OTAs!');
    } catch (err: any) {
      toast.error('Failed to push inventory.');
    } finally {
      setPushingAri(false);
    }
  };

  const handleConnectDirectOta = (otaKey: string, otaTitle: string) => {
    // Open dedicated channel connection modal matching Channex schema
    setActiveOtaModal({ open: true, otaKey, otaTitle });
  };

  const handleSaveOtaConfig = async (otaKey: string, otaTitle: string, passedConfig?: any) => {
    const config = passedConfig || otaConfigs[otaKey.toLowerCase()] || {};
    let newConfigs = { ...otaConfigs };
    if (passedConfig) {
      newConfigs[otaKey.toLowerCase()] = passedConfig;
      setOtaConfigs(newConfigs);
    }
    
    const primaryId = config.manualChannelId || config.hotelId || config.hotel_id || config.hotel_code || config.agent_id || 'OAuth-Connected';

    try {
      toast.loading(`Linking ${otaTitle} on Channex Staging...`, { id: 'ota-connect' });
      await channelsService.connectOta(selectedProperty!.id, otaKey, primaryId.trim(), config);
      toast.success(`Successfully configured & linked ${otaTitle} via 2-Way Channel Engine!`, { id: 'ota-connect' });
      setActiveOtaModal(null);
      await loadMappings();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to connect channel.';
      toast.error(errMsg, { id: 'ota-connect' });
    }
  };




  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading channel synchronization engine...</p>
      </div>
    );
  }

  const activeChannelMapping = mappings.find(m => m.isActive);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -m-8 p-16 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
              Channel Manager & Calendar Sync
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
              Prevent overbooking and maximize revenue by synchronizing your exact room availability across MakeMyTrip, Booking.com, Agoda etc.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Native OTA Directory button commented out to prioritize Channex iframe flow */}
            {/* <button
              onClick={() => { setCustomOtaSearch(''); setDirectoryCategory('All'); setCustomOtaModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              <span>🌐 Supported OTAs Directory (60+ Portals)</span>
            </button> */}
            <button
              onClick={() => setOwnerGuideModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>📖 Owner & Staff Guide (`Benefits & FAQ`)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {!activeChannelMapping ? (
            <div className="bg-gradient-to-br from-card to-muted/30 border-2 border-dashed border-primary/30 rounded-3xl p-8 sm:p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Globe className="h-10 w-10 animate-pulse" />
              </div>
              <div className="max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-foreground">
                  Automated 2-Way Channel Sync Engine
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Turn on headless synchronization. Our PMS will automatically create your property and room types inside the global Channel Manager engine right now, keeping MakeMyTrip, Agoda, and Booking.com etc. locked and synchronized in seconds whenever a reservation occurs.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Instant Overbooking Protection</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Zap className="h-4 w-4" />
                  <span>Live Daily Room Inventory (`Total Rooms - Bookings`)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-lg">
                  <Layers className="h-4 w-4" />
                  <span>Zero External Portal Logins Needed</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleEnableChannelSync('CHANNEX')}
                  disabled={enablingChannel}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-extrabold text-base shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                >
                  {enablingChannel ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Auto-creating Remote Property & Rooms...</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-5 w-5" />
                      <span>Enable 2-Way Channel Sync for {selectedProperty?.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Status Card */}
              <div className="bg-card border border-green-500/30 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-extrabold uppercase tracking-wider">
                        Active & Synchronized
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Partner: {activeChannelMapping.channelName}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedProperty?.name} — Live OTA Sync Connected
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Remote Property ID: {activeChannelMapping.externalPropertyId}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                    {/* Iframe loads automatically, manual button is hidden for streamlined flow */}
                    {/* <button
                      onClick={handleLoadIframe}
                      disabled={loadingIframe}
                      className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl font-extrabold text-xs transition-all shadow-sm cursor-pointer"
                    >
                      {loadingIframe ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      <span>{iframeUrl ? "Refresh Channel Portal" : "🌐 Open Channel Manager Portal"}</span>
                    </button> */}
                    <div className="flex flex-col items-end">
                      <button
                        onClick={handlePushAri}
                        disabled={pushingAri}
                        className="flex items-center gap-2 px-5 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl font-extrabold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        <RefreshCw className={clsx("h-4 w-4", pushingAri && "animate-spin")} />
                        <span>{pushingAri ? "Force Pushing..." : "⚡ Force Refresh All Channels (Manual Push)"}</span>
                      </button>
                      <span className="text-[10px] text-muted-foreground mt-1 max-w-[280px] text-right leading-tight">
                        Daily sync runs automatically 24/7. Click only for instant manual re-sync after changing room setups.
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisableChannelSync(activeChannelMapping.channelName)}
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-2xl transition-colors shrink-0 cursor-pointer"
                      title="Pause Sync"
                    >
                      <Power className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Mapped Room Types List */}
                <div className="mt-8 pt-6 border-t border-border">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Automated Room Type Mappings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeChannelMapping.roomMappings && activeChannelMapping.roomMappings.length > 0 ? (
                      activeChannelMapping.roomMappings.map((roomMap) => (
                        <div key={roomMap.id} className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-foreground block">
                              {roomMap.roomType?.name || 'Assigned Room Type'}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Channex Room ID: {roomMap.externalRoomTypeId}
                            </span>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
                        No individual room types mapped yet. Click "⚡ Force Refresh All Channels (Manual Push)" or ensure room types exist.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Channex Embedded Portal Iframe */}
              {iframeUrl && (
                <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground">Embedded Channel Manager Portal</h4>
                        <p className="text-[10px] text-muted-foreground">Manage all OTA bookings and mappings.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {/* <a
                        href={iframeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in New Tab
                      </a> */}
                      {/* Close button is commented out as the iframe remains open persistently */}
                      {/* <button
                        onClick={() => setIframeUrl(null)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl transition-all cursor-pointer"
                        title="Close Portal"
                      >
                        <X className="h-4 w-4" />
                      </button> */}
                    </div>
                  </div>
                  <div className="w-full relative bg-muted rounded-2xl overflow-hidden border border-border/70 animate-in fade-in" style={{ height: '700px' }}>
                    <iframe
                      src={iframeUrl}
                      title="Channex Portal"
                      className="w-full h-full border-none"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Direct 1-Click OTA Channel Connection Suite (PMS Native USP) - Commented out to prioritize Channex iframe flow
          {activeChannelMapping && (
            <div className="bg-card/90 border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-[11px] uppercase tracking-wider">
                      ✦ PMS Native Feature
                    </span>
                    <h3 className="text-xl font-extrabold text-foreground">Direct Online Travel Portal Suite</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                    Connect your active hotel profiles (`MakeMyTrip, Booking.com, Agoda, Airbnb`) directly inside your PMS without navigating external portals. Enter your OTA Hotel ID below to establish instant 2-way room and price synchronization.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl text-xs font-bold">
                    <span>Currency:</span>
                    <select
                      value={(selectedProperty as any)?.baseCurrency || 'INR'}
                      onChange={async (e) => {
                        const newCurrency = e.target.value;
                        if (!selectedProperty?.id) return;
                        try {
                          await channelsService.updateCurrency(selectedProperty.id, newCurrency);
                          toast.success(`Property base currency updated to ${newCurrency}!`);
                          setTimeout(() => window.location.reload(), 1000);
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || err?.message || 'Failed to update currency');
                        }
                      }}
                      className="bg-background border border-border rounded-lg px-1.5 py-0.5 text-xs text-foreground font-extrabold focus:outline-hidden cursor-pointer"
                    >
                      {['INR', 'USD', 'GBP', 'EUR', 'JPY'].map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => { setCustomOtaSearch(''); setDirectoryCategory('All'); setCustomOtaModal(true); }}
                    className="py-3 px-5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="h-4 w-4" />
                    <span>🌐 Browse All 60+ Supported OTAs</span>
                  </button>
                </div>
              </div>

              <div className={clsx(
                "mb-6 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all shadow-md",
                emergencyStopSell
                  ? "bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 animate-pulse"
                  : "bg-muted/40 border-border/80 text-foreground"
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx("p-2.5 rounded-xl shrink-0 font-extrabold", emergencyStopSell ? "bg-red-500 text-white" : "bg-primary/10 text-primary")}>
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm">
                        {emergencyStopSell ? "🛑 EMERGENCY STOP SELL ACTIVE — ALL ONLINE SALES CLOSED" : "Master Inventory Freeze (`Emergency Stop Sell`)"}
                      </h4>
                      {emergencyStopSell && <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">60-Day Lock Active</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {emergencyStopSell
                        ? "All connected OTAs (`MakeMyTrip, Booking.com, Agoda, Airbnb`) are currently blocked at 0 rooms to prevent overbooking during maintenance or emergencies."
                        : "Need to immediately block all online sales during an emergency, power outage, or hotel maintenance? Click to trigger a 60-day Stop Sell across all connected channels instantly."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleEmergencyStopSell}
                  className={clsx(
                    "px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md shrink-0 flex items-center gap-1.5 transition-all cursor-pointer",
                    emergencyStopSell
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  <Power className="h-4 w-4" />
                  {emergencyStopSell ? "🟢 Resume Online Sales (`Deactivate Stop Sell`)" : "🛑 Activate Emergency Stop Sell (`Freeze All OTAs`)"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {catalogLoading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-border/85 bg-card/60 animate-pulse space-y-4 min-h-[170px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-24 bg-muted rounded-md" />
                          <div className="h-4 w-12 bg-muted rounded-full" />
                        </div>
                        <div className="h-9 bg-muted/65 rounded-xl w-full mt-4" />
                      </div>
                      <div className="h-7 bg-muted/50 rounded-xl w-full mt-3" />
                    </div>
                  ))
                ) : (
                  <>
                    {gridOtas.map((ota) => {
                      const status = connectedOtaStatus[ota.key.toLowerCase()] || { connected: false };
                      const configuredMarkup = otaConfigs[ota.key.toLowerCase()]?.rateMarkup;
                      return (
                        <div key={ota.key} className={clsx("p-4 rounded-2xl border bg-gradient-to-br transition-all flex flex-col justify-between", ota.color)}>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                                <Globe className="h-4 w-4 text-primary shrink-0" />
                                {ota.title}
                              </span>
                              {status.connected ? (
                                <div className="flex items-center gap-1">
                                  {configuredMarkup && configuredMarkup !== '0%' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[9px]">
                                      {configuredMarkup}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Live
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[10px]">
                                  Not Linked
                                </span>
                              )}
                            </div>

                            {status.connected ? (
                              <div className="bg-background/80 rounded-xl p-2.5 border border-border flex items-center justify-between mt-2">
                                <div className="overflow-hidden">
                                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">Hotel ID</span>
                                  <span className="font-mono text-xs font-bold text-foreground truncate block">{status.hotelId || 'Linked Profile'}</span>
                                </div>
                                <button
                                  onClick={() => handleDisconnectDirectOta(ota.key, ota.title)}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-[11px] rounded-lg transition-colors shrink-0 cursor-pointer"
                                >
                                  Disconnect
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <button
                                  onClick={() => handleConnectDirectOta(ota.key, ota.title)}
                                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" /> Configure & Connect
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-border/50">
                            <button
                              onClick={() => handleSimulateBooking(ota.title)}
                              disabled={simulatingOta === ota.title}
                              className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors"
                              title="Generate a test booking right now for demo & staging"
                            >
                              <Zap className={clsx("h-3 w-3", simulatingOta === ota.title && "animate-spin")} />
                              <span>{simulatingOta === ota.title ? "Simulating..." : `⚡ Test ${ota.title} Booking`}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => { setCustomOtaSearch(''); setCustomOtaModal(true); }}
                      className="p-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[170px]"
                    >
                      <div className="p-3 bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary rounded-2xl transition-all mb-2.5 shadow-sm">
                        <PlusCircle className="h-6 w-6" />
                      </div>
                      <h4 className="font-extrabold text-sm text-foreground">Add Another OTA Channel</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 max-w-[190px]">
                        Connect Yatra, ClearTrip, VRBO, Google Hotels, or any of Channex's 60+ global portals directly inside PMS
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          */}

          {/* Sales & Operations Playbook Card - Commented out to simplify the dashboard view
          <div className="bg-gradient-to-br from-card to-muted/30 border border-primary/20 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>Sales & Operations Playbook: Connecting MakeMyTrip, Booking.com & Agoda etc.</span>
                
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Step-by-step procedure to link existing OTA hotel accounts to this real-time two-way synchronization engine.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Register Property & Rooms in PMS
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    First, create the property and its Room Types here inside our PMS. Click <strong className="text-foreground">"Enable 2-Way Channel Sync"</strong> above. Our system automatically configures the property and room structures inside the global Channel Manager engine and instantly synchronizes all room inventory and base rates.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Automated by PMS Cloud Engine
                </div>
              </div>

              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Link OTA Account & Map Room Types
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open your Channel Manager Portal &rarr; go to <strong className="text-foreground">Channels</strong> &rarr; click <strong className="text-foreground">Create Channel</strong> (e.g. MakeMyTrip, Booking.com, Agoda). Enter the property's existing OTA Hotel ID. The system will load their online room types—simply select our matching PMS Room Type from the dropdown and save!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Takes ~30 Seconds per OTA
                </div>
              </div>

              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    100% Hands-Free Live Sync Active
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once saved, the platform instantly synchronizes your live inventory across all connected booking channels. When a guest books on MMT or Booking.com, the reservation arrives directly in our PMS and blocks the physical room. When you create or cancel a booking locally, all OTAs update automatically!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Continuous 2-Way Automation
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 text-xs text-muted-foreground">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Important Note for Sales Team:</strong> Hotels must already have verified merchant listings with MakeMyTrip, Booking.com, or Agoda (with GST and bank verification done) etc. Once they provide their Hotel Property ID, connecting them to this live 2-way sync takes under 2 minutes.
                </span>
              </div>
            </div>
          </div>
          */}
        </div>


      {/* Dedicated Channel Configuration & Schema Modal (Separate Component) */}
      <ChannexOtaModal
        open={!!activeOtaModal?.open}
        otaKey={activeOtaModal?.otaKey || ''}
        otaTitle={activeOtaModal?.otaTitle || ''}
        initialConfig={activeOtaModal?.otaKey ? otaConfigs[activeOtaModal.otaKey] : {}}
        catalogItem={availableCatalog.find(ch => ch.key === activeOtaModal?.otaKey)}
        onClose={() => setActiveOtaModal(null)}
        onSave={(key, title, config) => handleSaveOtaConfig(key, title, config)}
      />

      {/* Actionable Setup Required Modal (Guides user to Rooms / Room Types) */}
      {setupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{setupModal.title}</h3>
                <p className="text-xs text-muted-foreground">Prerequisite missing before activating live OTA sync</p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs text-foreground leading-relaxed">
              {setupModal.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {setupModal.title.includes("Checklist") ? (
                <button
                  onClick={() => { window.location.href = '/'; }}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  Go to Dashboard Checklist <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { window.location.href = '/rooms'; }}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Go to Rooms Management <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { window.location.href = '/room-types'; }}
                    className="py-3 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all text-center"
                  >
                    Go to Room Types
                  </button>
                </>
              )}
              <button
                onClick={() => setSetupModal({ open: false, title: '', message: '' })}
                className="py-3 px-4 bg-transparent hover:bg-red-500/10 text-muted-foreground hover:text-red-500 font-bold text-xs rounded-xl transition-all text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom System Confirm Modal (`Replacing window.confirm`) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{confirmModal.title}</h3>
                <p className="text-xs text-muted-foreground">Action Confirmation Required</p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
              {confirmModal.message}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} })}
                className="py-2.5 px-5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} });
                  cb();
                }}
                className={clsx(
                  "py-2.5 px-6 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5",
                  confirmModal.confirmColor || "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                <Check className="h-4 w-4" />
                <span>{confirmModal.confirmLabel || 'Confirm Action'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner & Staff Guide Modal (`Why Use Channel Manager & Calendar Sync`) */}
      {ownerGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-card border border-primary/30 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setOwnerGuideModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b border-border">
              <div className="p-3.5 bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl shadow-md">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-extrabold text-[10px] uppercase tracking-wider">
                  ✦ Resort Owner & Staff Handbook
                </span>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">
                  Why Use Channel Manager & Calendar Sync?
                </h3>
                <p className="text-xs text-muted-foreground">
                  A simple, non-technical guide on how this real-time system protects revenue and simplifies daily operations.
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <h4 className="font-extrabold text-primary flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5" /> 1. Never Double-Book a Room Again (`Real-Time 2-Way Lock`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  When a guest books a room on <b>MakeMyTrip, Booking.com, or Agoda</b>, our system automatically locks that exact room across all other websites and your front desk within seconds. If a walk-in guest checks in at your front desk, that room instantly closes online across every connected travel portal so nobody else can book it.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-blue-500" /> 2. One Dashboard for Everything (`Zero Extranet Logins`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your front desk staff no longer needs to open 5 different browser tabs or remember passwords for MakeMyTrip, Agoda, Airbnb, and Booking.com every morning. Every reservation comes straight into your PMS Live Calendar with guest details, payment status, and commission rates automatically calculated.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-amber-500" /> 3. What is the "⚡ Force Refresh All Channels (Manual Push)" Button? (`Daily vs. Manual`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <b>Do you need to click this button every day, week, or month? NO!</b> Under normal daily resort operations, your room availability, rate updates, and reservations synchronize automatically 24/7 in the background across all connected OTAs without any human intervention.
                  <br /><br />
                  <b>When should you click this button?</b> Only as a <i>manual safety refresh</i>—for example, if you just added brand new physical rooms to your property settings, modified rate tiers, or if your resort's internet/power connection was down during a storm and you want to instantly trigger a manual double-check to push your exact local room availability across all OTAs right now.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Layers className="h-5 w-5 text-purple-500" /> 4. Protect Net Revenue (`Automatic Commission Markups`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Online travel portals charge 15% to 22% commissions on every booking. Inside the **Embedded Channel Manager Portal** below, you can configure a custom markup on your rate plans. Our system will automatically adjust your online room prices higher, ensuring you receive your exact required net room profit after their commission deduction.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Power className="h-5 w-5 text-red-500" /> 5. Instant Emergency Freeze (Master Stop Sell)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  If your resort faces a power outage, sudden maintenance, or water issue, you don't need to call OTA support. Simply open the **Embedded Channel Manager Portal** below, select the **Bulk Edit** option under your calendar or rate plans, and trigger a Stop Sell to immediately close online bookings across all connected websites.
                </p>
              </div>

              {/* Complete Directory of Supported Portals */}
              <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3.5">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-emerald-500" /> 6. Complete Directory of Supported Online Travel Portals (60+ Networks)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Our system supports instant connection to over 60 global, regional, and specialized booking networks. You can link any of the following platforms directly inside the Embedded Channel Manager Portal under the **Channels** tab:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Top Global & Regional Leaders
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      MakeMyTrip / Goibibo, Booking.com, Agoda, Airbnb, Expedia Group (Hotels.com / Vrbo / Orbitz), Trip.com / Ctrip, EaseMyTrip, VRBO / HomeAway, Yatra.com, ClearTrip, and Traveloka.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> B2B Wholesalers & Global Distribution
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Hotelbeds, WebBeds / JacTravel, DidaTravel, HyperGuest, OTS Globe, GoGlobal Travel, Travco, Bedsline, and Stuba.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> Metasearch, Hostels & Vacation Rentals
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Google Hotel Ads (Direct Search Bookings), Hostelworld, Agoda Homes, Mr & Mrs Smith (Luxury Collection), Tiketi.com, Despegar / Decolar, and Welcomebeds.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> 40+ Additional Specialized Networks
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ostrovok, TUI Musement, HRS Hotel Reservation Service, HotelSpecials, KeyTel Hotusa, Pegas Touristik, Smyrooms Logitravel, Sunweb Group, Roibos, Peakwork, Jumio, Wakanow, Hotelston, and Intui Travel.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-xs text-foreground flex items-center gap-2">
                  <span className="font-bold text-primary shrink-0">💡 How to Connect Any Portal:</span>
                  <span>Use the **Embedded Channel Manager Portal** below, go to **Channels** &rarr; **New Channel**, and select your target OTA from the available catalog list!</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={() => setOwnerGuideModal(false)}
                className="py-3 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-2xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Got It, Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Directory of Supported Online Travel Portals (60+ Networks) Modal */}
      {customOtaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">Supported Travel Portals Directory (60+ Networks)</h3>
                  <p className="text-xs text-muted-foreground">Select any booking channel or B2B distributor below to establish real-time 2-way sync</p>
                </div>
              </div>
              <button
                onClick={() => setCustomOtaModal(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {['All', 'Global Leaders', 'Wholesalers & B2B', 'European & Specialized', 'Vacation & Metasearch'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDirectoryCategory(cat)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition-all cursor-pointer",
                    directoryCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat === 'All' ? '🌟 All Channels (60+)' : cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={customOtaSearch}
                onChange={(e) => setCustomOtaSearch(e.target.value)}
                placeholder="Search portal name (e.g., Ostrovok, TUI, HRS, Hotelbeds, MakeMyTrip, Agoda, VRBO...)"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[400px] pr-1">
              {availableCatalog
                .filter(ch => {
                  const matchesSearch = ch.title.toLowerCase().includes(customOtaSearch.toLowerCase()) || ch.key.toLowerCase().includes(customOtaSearch.toLowerCase());
                  if (!matchesSearch) return false;
                  if (directoryCategory === 'All') return true;
                  if (directoryCategory === 'Global Leaders') return ['Global Leader', 'Regional Leader'].includes(ch.category);
                  if (directoryCategory === 'Wholesalers & B2B') return ['Wholesalers & B2B'].includes(ch.category);
                  if (directoryCategory === 'European & Specialized') return ['European & Specialized', 'Generic / Custom'].includes(ch.category);
                  if (directoryCategory === 'Vacation & Metasearch') return ['Vacation Rentals', 'Metasearch & Direct', 'Hostels & Budget', 'Luxury & Boutique'].includes(ch.category);
                  return true;
                })
                .map((ch) => {
                  const alreadyInGrid = ['makemytrip', 'bookingcom', 'agoda', 'airbnb', 'goibibo', 'expedia', 'tripcom', 'easemytrip'].includes(ch.key) ||
                    customOtaList.some(item => item.key === ch.key);

                  return (
                    <div
                      key={ch.key}
                      className={clsx(
                        "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
                        alreadyInGrid
                          ? "bg-muted/30 border-border/60 opacity-60"
                          : "bg-card hover:bg-primary/5 border-border hover:border-primary/40 cursor-pointer shadow-xs"
                      )}
                      onClick={() => {
                        if (!alreadyInGrid) {
                          setCustomOtaList(prev => [...prev, ch]);
                          setCustomOtaModal(false);
                          toast.success(`Added ${ch.title.split(' ')[0]} to your Direct Online Travel Portal Suite!`);
                          handleConnectDirectOta(ch.key, ch.title);
                        } else {
                          setCustomOtaModal(false);
                          handleConnectDirectOta(ch.key, ch.title);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground truncate block">{ch.title}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold text-[9px] uppercase tracking-wider shrink-0">
                              {ch.category || 'Travel Portal'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate block">2-Way Real-Time Rate & Inventory Automation</span>
                        </div>
                      </div>
                      {alreadyInGrid ? (
                        <button className="px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-muted text-foreground font-bold text-xs transition-all shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Configure
                        </button>
                      ) : (
                        <button className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 transition-all shrink-0 flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5" /> Connect Now
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-[11px] text-muted-foreground">
              <span>💡 Click any portal above to instantly open its non-technical connection form.</span>
              <button
                onClick={() => setCustomOtaModal(false)}
                className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
