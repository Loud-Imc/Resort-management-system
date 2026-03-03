import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { icalService, type PropertyIcal } from '../../services/ical';
import { bookingSourcesService } from '../../services/bookingSources';
import toast from 'react-hot-toast';
import {
  Calendar, RefreshCw, Link as LinkIcon, Copy, Trash2, Plus,
  ExternalLink, CheckCircle2, AlertCircle, Loader2, Info, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

export default function CalendarSync() {
  const { selectedProperty } = useProperty();
  const [links, setLinks] = useState<PropertyIcal[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Form state
  const [platformName, setPlatformName] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [bookingSourceId, setBookingSourceId] = useState('');

  const exportUrl = `${window.location.origin.replace('5173', '3000')}/api/ical/export/${selectedProperty?.slug}.ics`;

  useEffect(() => {
    if (selectedProperty?.id) {
      loadLinks();
    }
  }, [selectedProperty?.id]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const [linksData, sourcesData] = await Promise.all([
        icalService.getLinks(selectedProperty!.id),
        bookingSourcesService.getAll()
      ]);
      setLinks(linksData);
      setSources(sourcesData.filter(s => s.isActive));
    } catch (err) {
      toast.error('Failed to load sync links');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty?.id || !platformName || !icalUrl) return;

    try {
      setAdding(true);
      await icalService.addLink(selectedProperty.id, { 
        platformName, 
        icalUrl,
        bookingSourceId: bookingSourceId || undefined
      });
      toast.success('Sync link added successfully');
      setPlatformName('');
      setIcalUrl('');
      setBookingSourceId('');
      loadLinks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add link');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this sync link? Associated blocks will be removed.')) return;
    try {
      await icalService.deleteLink(id);
      toast.success('Link removed');
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      toast.error('Failed to remove link');
    }
  };

  const handleManualSync = async (id: string) => {
    try {
      setSyncing(id);
      await icalService.triggerSync(id);
      toast.success('Synchronization complete');
      loadLinks();
    } catch (err) {
      toast.error('Sync failed. Please check the URL.');
    } finally {
      setSyncing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading sync settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -m-8 p-16 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
              Calendar Synchronization
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Sync your property availability with external platforms like Airbnb, Booking.com, and VRBO to prevent overbooking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Export Feed Section */}
        <div className="md:col-span-3 space-y-4">
          <div className="group bg-card border border-border rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                <ExternalLink className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Export Availability Feed</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Use this link to export your Route Guide calendar to other platforms. Copy this URL and paste it into the "Import Calendar" section of Airbnb or Booking.com.
            </p>

            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-2xl border border-border group-hover:border-primary/50 transition-colors">
              <code className="flex-1 text-xs font-mono truncate text-primary/80">
                {exportUrl}
              </code>
              <button
                onClick={() => copyToClipboard(exportUrl)}
                className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors shrink-0"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <span>This feed includes all confirmed bookings and manual blocks from your dashboard. It refreshes automatically whenever a change occurs.</span>
            </div>
          </div>
        </div>

        {/* Import Links Table */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Active Sync Connections
              </h3>
            </div>

            <div className="divide-y divide-border">
              {links.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No external calendars connected yet.</p>
                </div>
              ) : (
                links.map((link) => (
                  <div key={link.id} className="p-6 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{link.platformName}</span>
                          {(link as any).bookingSource && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md font-medium">
                              Linked to: {(link as any).bookingSource.name}
                            </span>
                          )}
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            link.status === 'ACTIVE'
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          )}>
                            {link.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-xs">
                          {link.icalUrl}
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {link.lastSyncedAt ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Last synced: {new Date(link.lastSyncedAt).toLocaleString()}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                Never synced
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleManualSync(link.id)}
                          disabled={syncing === link.id}
                          className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all hover:rotate-180 duration-500 disabled:opacity-50"
                          title="Sync Now"
                        >
                          <RefreshCw className={clsx("h-4 w-4", syncing === link.id && "animate-spin")} />
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors"
                          title="Delete Connection"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Link Form */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-8">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Add Connection</h3>
            </div>

            <form onSubmit={handleAddLink} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Platform Name
                </label>
                <input
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="e.g. Airbnb"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  iCal Feed URL
                </label>
                <div className="relative">
                  <input
                    required
                    type="url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://platform.com/calendar.ics"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-10"
                  />
                  <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Link to Booking Source (Optional)
                </label>
                <div className="relative">
                  <select 
                    value={bookingSourceId}
                    onChange={(e) => setBookingSourceId(e.target.value)}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="">No specific source</option>
                    {sources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[10px] text-muted-foreground italic px-1">
                  Linking a source helps in automated commission tracking and analysis.
                </p>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
              >
                {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Save Link
              </button>

              <p className="text-[10px] text-center text-muted-foreground px-2">
                By adding this link, you authorize our system to fetch availability data periodically.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-600/5 to-primary/5 border border-primary/10 rounded-3xl p-6 flex items-start gap-4">
        <div className="p-3 bg-blue-500/10 rounded-2xl">
          <AlertCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-foreground">Important: Instant Sync</h4>
          <p className="text-sm text-muted-foreground">
            While we export your data instantly, external platforms like Airbnb may only check our feed every 30-60 minutes. For imported calendars, we sync every hour. You can use the "Sync" button for manual refreshes.
          </p>
        </div>
      </div>
    </div>
  );
}
