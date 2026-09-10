import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { channelsService } from '../../services/channels';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Building,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OtaMessagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProperty } = useProperty();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PENDING' | 'BOOKING_COM' | 'RESOLVED'>('ALL');
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [responseNote, setResponseNote] = useState('');

  // 1. Fetch all threads for current property
  const {
    data: threads = [],
    isLoading,
  } = useQuery({
    queryKey: ['property-ota-threads', selectedProperty?.id],
    queryFn: () => channelsService.getPropertyThreads(selectedProperty!.id),
    enabled: !!selectedProperty?.id,
    refetchInterval: 20000,
  });

  // 1.1 Fetch channel mappings to check if OTA sync is connected
  const { data: mappings = [] } = useQuery({
    queryKey: ['property-channel-mappings', selectedProperty?.id],
    queryFn: () => channelsService.getMappings(selectedProperty!.id),
    enabled: !!selectedProperty?.id,
  });

  const isChannelConnected = Boolean((selectedProperty as any)?.channexPropertyId || mappings.length > 0);

  // 2. Respond to Request mutation
  const respondMutation = useMutation({
    mutationFn: ({ requestId, action, note }: { requestId: string; action: 'accept' | 'decline'; note?: string }) =>
      channelsService.respondToRequest(requestId, action, note),
    onSuccess: (_, variables) => {
      toast.success(`Request ${variables.action === 'accept' ? 'ACCEPTED' : 'DECLINED'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['property-ota-threads', selectedProperty?.id] });
      setResponseNote('');
      setSelectedThread(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to respond to request');
    },
  });

  // 4. Send Message mutation
  const sendMutation = useMutation({
    mutationFn: ({ threadId, message }: { threadId: string; message: string }) =>
      channelsService.sendMessage(threadId, message),
    onSuccess: (newMsg) => {
      setReplyText('');
      toast.success('Message sent to OTA / Guest');
      queryClient.invalidateQueries({ queryKey: ['property-ota-threads', selectedProperty?.id] });
      if (selectedThread) {
        setSelectedThread((prev: any) => ({
          ...prev,
          messages: [...(prev.messages || []), newMsg],
        }));
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;
    sendMutation.mutate({ threadId: selectedThread.id, message: replyText.trim() });
  };

  const handleRespond = (requestId: string, action: 'accept' | 'decline') => {
    const confirmMsg =
      action === 'accept'
        ? 'Are you sure you want to ACCEPT this guest change request? This will automatically update the booking stay dates and sync availability outward.'
        : 'Are you sure you want to DECLINE this guest request?';

    if (window.confirm(confirmMsg)) {
      respondMutation.mutate({ requestId, action, note: responseNote });
    }
  };

  // Filter & Search Logic
  const filteredThreads = threads.filter((thread: any) => {
    const hasPending = thread.requests?.some((r: any) => r.status === 'PENDING');
    const hasResolved = thread.requests?.some((r: any) => r.status !== 'PENDING');
    const channelLower = (thread.channel || thread.channelName || '').toLowerCase();

    if (filterType === 'PENDING' && !hasPending) return false;
    if (filterType === 'BOOKING_COM' && !channelLower.includes('booking')) return false;
    if (filterType === 'RESOLVED' && !hasResolved) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const guestMatch = (thread.guestName || '').toLowerCase().includes(q);
      const bookingMatch = (thread.booking?.bookingNumber || thread.externalBookingId || '').toLowerCase().includes(q);
      const msgMatch = (thread.messages || []).some((m: any) => (m.body || '').toLowerCase().includes(q));
      return guestMatch || bookingMatch || msgMatch;
    }

    return true;
  });

  const totalPendingCount = threads.filter((t: any) => t.requests?.some((r: any) => r.status === 'PENDING')).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-xs rounded-full border border-sky-500/20">
              Channel Manager
            </span>
            {totalPendingCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-white font-semibold text-xs rounded-full animate-pulse shadow-sm">
                {totalPendingCount} Action Required
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1.5">
            OTA Messaging & Change Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time guest communication, date shift approvals, and modification requests from connected OTAs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/calendar-sync')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-xl shadow-sm transition-all active:scale-95"
          >
            <span>OTA Sync Settings</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Conversations</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{threads.length}</p>
          </div>
        </div>

        <div className="bg-card border border-amber-500/30 rounded-xl p-4 shadow-sm flex items-center gap-3.5 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending Guest Requests</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{totalPendingCount}</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/calendar-sync')}
          className="cursor-pointer bg-card border border-border hover:border-primary/50 rounded-xl p-4 shadow-sm flex items-center gap-3.5 transition-all"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isChannelConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'
          }`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Connected Channels</p>
            <p className="text-xs font-bold text-foreground mt-1 truncate">
              {isChannelConnected ? 'Active (e.g. Booking.com, Airbnb, Agoda)' : 'Not Connected (Click to Setup)'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Messages ({threads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterType === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Action Required ({totalPendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BOOKING_COM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'BOOKING_COM'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Booking.com
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by guest, booking #, or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Threads List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-medium">Loading OTA message threads...</p>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <h3 className="text-base font-bold text-foreground">No message threads found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'No conversations match your search query. Try clearing filters.'
              : 'Messages or change requests sent by guests from Booking.com or other OTAs will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredThreads.map((thread: any) => {
            const pendingRequest = thread.requests?.find((r: any) => r.status === 'PENDING');
            const latestMsg = thread.messages?.[thread.messages.length - 1];
            const booking = thread.booking;

            return (
              <div
                key={thread.id}
                className={`bg-card border rounded-xl p-4 shadow-sm transition-all hover:border-primary/40 ${
                  pendingRequest
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-transparent'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Guest & Channel Details */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-sm flex items-center justify-center shrink-0">
                      {thread.guestName ? thread.guestName[0].toUpperCase() : 'G'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{thread.guestName || 'OTA Guest'}</h4>
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-medium text-[11px] rounded-md">
                          {thread.channel || 'Booking.com'}
                        </span>
                        {pendingRequest && (
                          <span className="px-2 py-0.5 bg-amber-500 text-white font-semibold text-[11px] rounded-full animate-pulse flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {pendingRequest.title}
                          </span>
                        )}
                      </div>

                      {/* Associated Booking Info Badge */}
                      {booking ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" />
                            #{booking.bookingNumber}
                          </span>
                          <span>
                            {format(new Date(booking.checkInDate), 'dd MMM')} &rarr; {format(new Date(booking.checkOutDate), 'dd MMM yyyy')}
                          </span>
                          {booking.roomType && (
                            <span className="font-medium text-primary">&bull; {booking.roomType.name}</span>
                          )}
                        </div>
                      ) : thread.externalBookingId ? (
                        <p className="text-xs text-muted-foreground">
                          External Ref: #{thread.externalBookingId}
                        </p>
                      ) : null}

                      {/* Latest Message Snippet */}
                      {latestMsg && (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          "{latestMsg.body}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    {booking && (
                      <button
                        type="button"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted font-medium text-xs transition-all active:scale-95"
                      >
                        <span>View Booking</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThread(thread);
                        setReplyText('');
                        setResponseNote('');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all active:scale-95 shadow-sm ${
                        pendingRequest
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{pendingRequest ? 'Review Request' : 'Chat'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Thread Details & Live Chat Modal */}
      {selectedThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-base flex items-center justify-center shrink-0">
                  {selectedThread.guestName ? selectedThread.guestName[0].toUpperCase() : 'G'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{selectedThread.guestName || 'OTA Guest'}</h3>
                    <span className="px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium text-[10px] rounded-md border border-sky-500/20">
                      {selectedThread.channel || 'Booking.com'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Thread ID: #{selectedThread.externalThreadId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedThread(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Associated Booking Card Bar */}
            {selectedThread.booking && (
              <div className="px-4 md:px-5 py-2.5 bg-primary/5 border-b border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    Booking #{selectedThread.booking.bookingNumber}
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    {format(new Date(selectedThread.booking.checkInDate), 'dd MMM')} &rarr; {format(new Date(selectedThread.booking.checkOutDate), 'dd MMM yyyy')}
                  </span>
                  {selectedThread.booking.roomType && (
                    <span className="text-primary font-medium text-[11px]">&bull; {selectedThread.booking.roomType.name}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/bookings/${selectedThread.booking.id}`);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-xs text-primary hover:underline"
                >
                  <span>Open Booking</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Structured Request Section (if any pending) */}
              {selectedThread.requests?.map((req: any) => {
                if (req.status !== 'PENDING') return null;
                const details = req.requestedDetails || {};
                const isDateChange = req.requestType === 'DATE_CHANGE';

                return (
                  <div
                    key={req.id}
                    className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500 text-white font-semibold text-[10px] rounded-md uppercase">
                          {req.requestType.replace(/_/g, ' ')}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">{req.title}</h4>
                      </div>
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 48h Response SLA
                      </span>
                    </div>

                    {isDateChange && details.requestedCheckIn && details.requestedCheckOut ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-card/80 rounded-lg border border-amber-500/20 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            Current Stay Dates
                          </span>
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {details.originalCheckIn || 'N/A'} &rarr; {details.originalCheckOut || 'N/A'}
                          </p>
                        </div>

                        <div className="space-y-0.5 bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 uppercase">
                            <Sparkles className="h-3 w-3" /> Requested Dates
                          </span>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-amber-600" />
                            {details.requestedCheckIn} &rarr; {details.requestedCheckOut}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-card/80 rounded-lg border border-amber-500/20">
                        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                          {req.description}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Staff Reply Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dates confirmed / Unable to accommodate..."
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={respondMutation.isPending}
                        onClick={() => handleRespond(req.id, 'decline')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 font-semibold text-xs transition-all disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </button>

                      <button
                        type="button"
                        disabled={respondMutation.isPending}
                        onClick={() => handleRespond(req.id, 'accept')}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept & Update Dates
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Chat Messages */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 p-2 bg-muted/10 rounded-xl border border-border/30">
                {(!selectedThread.messages || selectedThread.messages.length === 0) ? (
                  <p className="text-xs text-center text-muted-foreground py-5">No message history yet.</p>
                ) : (
                  selectedThread.messages.map((msg: any) => {
                    const isProperty = msg.senderType === 'PROPERTY';
                    const isSystem = msg.senderType === 'OTA_SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1.5">
                          <div className="px-3 py-1.5 bg-muted/60 border border-border/60 rounded-xl text-center max-w-md text-xs">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                              OTA System Notification
                            </span>
                            <p className="text-xs text-foreground">{msg.body}</p>
                            <span className="text-[9px] text-muted-foreground mt-0.5 block">
                              {format(new Date(msg.sentAt), 'MMM d, hh:mm a')}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isProperty ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 px-1 mb-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {isProperty ? 'Property Staff' : msg.senderName || 'Guest'}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60">
                            {format(new Date(msg.sentAt), 'MMM d, hh:mm a')}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed font-normal shadow-sm ${
                            isProperty
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-card border border-border text-foreground rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer: Quick Reply Bar */}
            <div className="p-3 md:p-4 border-t border-border bg-muted/20">
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a response to the guest on Booking.com..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sendMutation.isPending}
                  className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendMutation.isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
