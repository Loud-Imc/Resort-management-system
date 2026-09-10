import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsService } from '../../services/channels';
import {
  MessageSquare,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface OtaGuestMessagingSectionProps {
  bookingId: string;
  propertyId?: string;
  externalBookingId?: string | null;
  channelName?: string | null;
}

export const OtaGuestMessagingSection: React.FC<OtaGuestMessagingSectionProps> = ({
  bookingId,
  externalBookingId,
  channelName,
}) => {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});


  // Fetch threads and requests for this booking
  const { data: threads = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ota-booking-messages', bookingId],
    queryFn: () => channelsService.getBookingMessages(bookingId),
    enabled: !!bookingId,
    refetchInterval: 15000, // auto-refresh chat every 15 seconds
  });

  const activeThread = threads[0] || null;

  // Flatten all requests across threads
  const allRequests = threads.flatMap((t: any) => t.requests || []);
  const pendingRequests = allRequests.filter((r: any) => r.status === 'PENDING');
  const historyRequests = allRequests.filter((r: any) => r.status !== 'PENDING');

  // Mutation to respond to a change request
  const respondMutation = useMutation({
    mutationFn: ({ requestId, action, note }: { requestId: string; action: 'accept' | 'decline'; note?: string }) =>
      channelsService.respondToRequest(requestId, action, note),
    onSuccess: (_, variables) => {
      toast.success(`Request ${variables.action === 'accept' ? 'ACCEPTED' : 'DECLINED'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['ota-booking-messages', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to respond to request');
    },
  });

  // Mutation to send a message
  const sendMutation = useMutation({
    mutationFn: ({ threadId, message }: { threadId: string; message: string }) =>
      channelsService.sendMessage(threadId, message),
    onSuccess: () => {
      setReplyText('');
      toast.success('Message sent to OTA / Guest');
      queryClient.invalidateQueries({ queryKey: ['ota-booking-messages', bookingId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;
    sendMutation.mutate({ threadId: activeThread.id, message: replyText.trim() });
  };

  const handleRespond = (requestId: string, action: 'accept' | 'decline') => {
    const note = responseNotes[requestId];
    const confirmMsg =
      action === 'accept'
        ? 'Are you sure you want to ACCEPT this guest change request? This will automatically update the booking stay dates and sync availability.'
        : 'Are you sure you want to DECLINE this guest request?';

    if (window.confirm(confirmMsg)) {
      respondMutation.mutate({ requestId, action, note });
    }
  };

  // If this is not an OTA booking and no threads exist, show a minimal placeholder or return null
  const isOtaBooking = !!externalBookingId || (channelName && channelName !== 'DIRECT' && channelName !== 'OFFLINE_CP');

  if (!isOtaBooking && threads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. Pending OTA Guest Requests Alert Banner */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-500/30 rounded-[2.5rem] p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <ShieldAlert className="h-32 w-32 -rotate-12 text-amber-500" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full">
                  Action Required
                </span>
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" /> 48-Hour Response Window
                </span>
              </div>
              <h3 className="text-lg font-black text-foreground mt-0.5">
                Pending Guest Change Request from {channelName || 'OTA'}
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {pendingRequests.map((req: any) => {
              const details = req.requestedDetails || {};
              const isDateChange = req.requestType === 'DATE_CHANGE';

              return (
                <div
                  key={req.id}
                  className="bg-card/90 backdrop-blur border border-amber-500/20 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-wider rounded-xl">
                        {req.requestType.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-black text-foreground">{req.title}</h4>
                    </div>
                    {req.expiresAt && (
                      <span className="text-[11px] font-bold text-muted-foreground">
                        Expires: {format(new Date(req.expiresAt), 'MMM dd, yyyy hh:mm a')}
                      </span>
                    )}
                  </div>

                  {/* Date Change Comparison Details */}
                  {isDateChange && details.requestedCheckIn && details.requestedCheckOut ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/40">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Current Stay Dates
                        </span>
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {details.originalCheckIn || 'N/A'} &rarr; {details.originalCheckOut || 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-1 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Requested Stay Dates
                        </span>
                        <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-amber-600" />
                          {details.requestedCheckIn} &rarr; {details.requestedCheckOut}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border/40">
                      <p className="text-xs font-medium text-foreground whitespace-pre-line leading-relaxed">
                        {req.description}
                      </p>
                    </div>
                  )}

                  {/* Optional Staff Response Note */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Staff Reply / Internal Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Approved with pleasure / Fully booked for new requested dates..."
                      value={responseNotes[req.id] || ''}
                      onChange={(e) =>
                        setResponseNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => handleRespond(req.id, 'decline')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline Request
                    </button>

                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => handleRespond(req.id, 'accept')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept & Sync Dates
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Two-Way OTA Messages & Communication Thread */}
      <div className="bg-card border border-border/50 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                OTA Guest Messaging
                {activeThread?.channel && (
                  <span className="px-2.5 py-0.5 bg-muted rounded-full text-[10px] font-bold text-muted-foreground border border-border">
                    {activeThread.channel}
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                Live two-way communication synchronized directly with Booking.com / OTA portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all border border-border/50 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Chat History Container */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading messages...
            </div>
          ) : !activeThread || !activeThread.messages || activeThread.messages.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-border/40 rounded-3xl">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">No OTA messages yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Any inquiries, requests, or messages sent by the guest via Booking.com will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto space-y-3.5 pr-1 p-2 bg-muted/10 rounded-3xl border border-border/30">
              {activeThread.messages.map((msg: any) => {
                const isProperty = msg.senderType === 'PROPERTY';
                const isSystem = msg.senderType === 'OTA_SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-4 py-2 bg-muted/60 border border-border/60 rounded-2xl text-center max-w-md">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                          OTA System Notification
                        </span>
                        <p className="text-xs font-medium text-foreground">{msg.body}</p>
                        <span className="text-[9px] text-muted-foreground mt-1 block">
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
                    <div className="flex items-center gap-1.5 px-2 mb-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        {isProperty ? 'Property Staff' : msg.senderName || 'Guest'}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {format(new Date(msg.sentAt), 'MMM d, hh:mm a')}
                      </span>
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium shadow-sm ${
                        isProperty
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-card border border-border text-foreground rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply Form */}
          {activeThread && (
            <form onSubmit={handleSendReply} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Type a reply to guest / OTA..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={sendMutation.isPending}
                className="flex-1 px-4 py-3 text-xs bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendMutation.isPending}
                className="px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          )}
        </div>

        {/* Request History Summary */}
        {historyRequests.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">
              Request Decision History
            </h4>
            <div className="space-y-2">
              {historyRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/20 border border-border/40 rounded-2xl text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 font-black text-[9px] uppercase tracking-wider rounded-full ${
                        req.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="font-bold text-foreground">{req.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span>{req.responseNote || 'Processed'}</span>
                    {req.respondedAt && (
                      <span>&bull; {format(new Date(req.respondedAt), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
