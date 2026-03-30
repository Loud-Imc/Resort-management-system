import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Notification, notificationsService } from '../services/notifications';
import { Bell, CheckCircle, Trash2, Clock, Info, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll('ChannelPartner'),
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>Notifications</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.4rem' }}>Recent referrals and account updates</p>
        </div>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={!notifications?.some((n: Notification) => !n.isRead)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1.2rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--primary-teal)',
            background: 'var(--accent-white-glow)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-teal)',
            opacity: !notifications?.some((n: Notification) => !n.isRead) ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
          className="glass-pane-hover"
        >
          <CheckSquare size={16} />
          <span>Mark all as read</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications?.length === 0 ? (
          <div className="glass-pane" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-dim)' }}>
            <Bell size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>No alerts yet</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>We'll notify you here when a booking is made using your code.</p>
          </div>
        ) : (
          notifications?.map((notification: Notification) => (
            <div
              key={notification.id}
              className="glass-pane"
              style={{
                padding: '1.25rem',
                opacity: notification.isRead ? 0.7 : 1,
                borderLeft: notification.isRead ? '1px solid var(--border-glass)' : '4px solid var(--primary-teal)',
                display: 'flex',
                gap: '1.25rem'
              }}
            >
              <div style={{
                flexShrink: 0,
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: notification.isRead ? 'var(--bg-dark)' : 'var(--primary-teal-glow)',
                color: notification.isRead ? 'var(--text-dim)' : 'var(--primary-teal)'
              }}>
                {notification.type === 'CP_REFERRAL_BOOKING' ? <CheckCircle size={20} /> : <Info size={20} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '1rem' }}>
                  <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    margin: 0,
                    color: notification.isRead ? 'var(--text-dim)' : 'var(--text-main)'
                  }}>
                    {notification.title}
                  </h3>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Clock size={12} />
                    {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-dim)',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {notification.message}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                {!notification.isRead && (
                  <button
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    style={{
                      padding: '0.5rem',
                      color: 'var(--primary-teal)',
                      background: 'var(--primary-teal-glow)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as read"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(notification.id)}
                  style={{
                    padding: '0.5rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.2s'
                  }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
