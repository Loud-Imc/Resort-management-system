import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Filter,
  RefreshCw,
  Calendar,
  Globe,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Ban,
  DollarSign,
  Sliders,
} from 'lucide-react';
import {
  ratePlansService,
  type RateRestrictionLog,
} from '../services/ratePlans';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface RateChangeLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypes?: RoomType[];
}

export const RateChangeLogDrawer: React.FC<RateChangeLogDrawerProps> = ({
  isOpen,
  onClose,
  propertyId,
  roomTypes = [],
}) => {
  const [logs, setLogs] = useState<RateRestrictionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  const fetchLogs = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const response = await ratePlansService.getRateRestrictionLogs(propertyId, {
        actionType: actionFilter === 'ALL' ? undefined : actionFilter,
        roomTypeId: roomTypeFilter === 'ALL' ? undefined : roomTypeFilter,
        limit: pageSize,
        page: page + 1,
      });

      if (response && Array.isArray(response.logs)) {
        setLogs(response.logs);
        setTotalCount(response.pagination?.total ?? response.logs.length);
      }
    } catch (err: any) {
      console.error('Failed to load rate change logs:', err);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, propertyId, actionFilter, roomTypeFilter, page]);

  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'RATE_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <DollarSign className="h-3 w-3" /> Rate Update
          </span>
        );
      case 'RESTRICTION_CHANGE':
      case 'RESTRICTION_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <ShieldAlert className="h-3 w-3" /> Restriction
          </span>
        );
      case 'STOP_SELL':
      case 'STOP_SELL_TOGGLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <Ban className="h-3 w-3" /> Stop Sell
          </span>
        );
      case 'STOP_SELL_REMOVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
            <CheckCircle2 className="h-3 w-3" /> Reopened
          </span>
        );
      case 'INVENTORY_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <Sliders className="h-3 w-3" /> Allotment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground border border-border">
            {action}
          </span>
        );
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const s = start.split('T')[0];
    const e = end.split('T')[0];
    if (s === e) return s;
    return `${s} → ${e}`;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Rate & Restriction Change Log
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/30">
                  Audit Trail
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Track who modified tariffs, stay restrictions & channel closeouts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border bg-card flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold mr-1">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filter:
          </div>

          {/* Action Type Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="RATE_UPDATE">💰 Rate Updates</option>
            <option value="RESTRICTION_UPDATE">🛡️ Stay Restrictions</option>
            <option value="STOP_SELL_TOGGLE">🛑 Stop Sells</option>
            <option value="INVENTORY_OVERRIDE">📊 Allotment Overrides</option>
          </select>

          {/* Room Type Filter */}
          <select
            value={roomTypeFilter}
            onChange={(e) => {
              setRoomTypeFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="ALL">🏨 All Room Types</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>

          <span className="ml-auto text-xs text-muted-foreground font-semibold">
            {totalCount} {totalCount === 1 ? 'event' : 'events'} recorded
          </span>
        </div>

        {/* Timeline Log Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              Loading activity timeline...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl flex flex-col items-center gap-2">
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-bold text-foreground">No rate or restriction changes found</p>
              <p className="text-[11px]">
                Any manual rate updates, seasonal rules, or stop-sells will appear here with full attribution.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const details = log.details || {};
              const hasDiff = details.oldPrice !== undefined && details.newPrice !== undefined;
              const hasOldInv = details.oldAvailable !== undefined && details.newAvailable !== undefined;

              return (
                <div
                  key={log.id}
                  className="p-3.5 bg-card hover:bg-muted/20 border border-border rounded-2xl shadow-xs transition-colors space-y-2"
                >
                  {/* Top metadata line */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.actionType)}
                      <span className="font-extrabold text-foreground text-xs">
                        {log.roomTypeName || 'All Room Types'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Summary Description */}
                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {log.summary}
                  </p>

                  {/* Diff / Value changes */}
                  {(hasDiff || hasOldInv || details.minStay !== undefined || details.stopSell !== undefined) && (
                    <div className="p-2.5 bg-muted/40 rounded-xl border border-border/60 text-xs flex flex-wrap items-center gap-3">
                      {hasDiff && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-muted-foreground line-through">
                            ₹{Number(details.oldPrice).toLocaleString()}
                          </span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            ₹{Number(details.newPrice).toLocaleString()}
                          </span>
                          {details.newPrice > details.oldPrice ? (
                            <span className="text-[10px] font-bold text-emerald-600">
                              (+₹{(details.newPrice - details.oldPrice).toLocaleString()})
                            </span>
                          ) : details.newPrice < details.oldPrice ? (
                            <span className="text-[10px] font-bold text-rose-600">
                              (-₹{(details.oldPrice - details.newPrice).toLocaleString()})
                            </span>
                          ) : null}
                        </div>
                      )}

                      {hasOldInv && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-muted-foreground">Allotment:</span>
                          <span className="line-through">{details.oldAvailable}</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="font-black text-blue-600 dark:text-blue-400">
                            {details.newAvailable} rooms
                          </span>
                        </div>
                      )}

                      {details.minStay && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                          Min Stay: {details.minStay} Nights
                        </span>
                      )}

                      {details.stopSell !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            details.stopSell
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {details.stopSell ? '🛑 Closed to booking' : '🟢 Reopened'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer metadata: Author, Dates & Channels */}
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {/* Author */}
                      <div className="flex items-center gap-1 font-bold text-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                          {(log.userName || 'S')[0].toUpperCase()}
                        </div>
                        <span>{log.userName || 'Staff Member'}</span>
                        {log.userRole && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-muted text-muted-foreground uppercase border border-border">
                            {log.userRole}
                          </span>
                        )}
                      </div>

                      {/* Affected Channel */}
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-primary" />
                        <span>{log.channelName || 'All Channels'}</span>
                      </div>
                    </div>

                    {/* Applicable Dates */}
                    <div className="flex items-center gap-1 font-mono text-[10px] bg-muted/50 px-2 py-0.5 rounded-md border border-border">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDateRange(log.startDate, log.endDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border bg-card flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
