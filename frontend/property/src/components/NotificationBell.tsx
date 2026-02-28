import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsService } from '../services/notifications';
import clsx from 'clsx';

export default function NotificationBell() {
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  const count = unreadData?.count || 0;

  return (
    <Link
      to="/notifications"
      className="relative p-2 rounded-lg hover:bg-muted text-foreground transition-colors"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className={clsx(
          "absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background",
          count > 9 && "w-5 h-4 px-1"
        )}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
