import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications';
import { Bell, CheckCircle, Trash2, Clock, Info, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8 px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">Recent referrals and account updates</p>
        </div>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={!notifications?.some(n => !n.isRead)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Mark all as read</span>
        </button>
      </div>

      <div className="space-y-4 px-4 md:px-0">
        {notifications?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border text-muted-foreground shadow-sm">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No alerts yet</p>
            <p className="text-sm">We'll notify you here when a booking is made using your code.</p>
          </div>
        ) : (
          notifications?.map((notification) => (
            <div
              key={notification.id}
              className={clsx(
                "group relative bg-card p-5 rounded-xl border transition-all duration-200",
                notification.isRead ? "border-border opacity-75" : "border-primary/20 shadow-sm ring-1 ring-primary/5"
              )}
            >
              <div className="flex gap-4">
                <div className={clsx(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                  notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                )}>
                  {notification.type === 'CP_REFERRAL_BOOKING' ? <CheckCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={clsx(
                      "text-sm font-bold truncate",
                      notification.isRead ? "text-foreground/70" : "text-foreground"
                    )}>
                      {notification.title}
                    </h3>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                </div>

                <div className="flex items-start gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notification.id)}
                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                    title="Delete"
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
  );
}
