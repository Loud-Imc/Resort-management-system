import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsService } from '../services/notifications';

export default function NotificationBell() {
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount('ChannelPartner'),
    refetchInterval: 60000,
  });

  const count = unreadData?.count || 0;

  return (
    <Link
      to="/notifications"
      style={{
        position: 'relative',
        padding: '0.5rem',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
      }}
      className="glass-pane-hover"
      title="Notifications"
    >
      <Bell size={20} />
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          display: 'flex',
          height: count > 9 ? '18px' : '16px',
          minWidth: count > 9 ? '18px' : '16px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          backgroundColor: '#ef4444',
          fontSize: '10px',
          fontWeight: 700,
          color: '#ffffff',
          padding: count > 9 ? '0 4px' : '0',
          border: '2px solid #ffffff',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
