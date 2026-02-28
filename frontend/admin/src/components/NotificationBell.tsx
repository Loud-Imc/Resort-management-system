import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsService } from '../services/notifications';

export default function NotificationBell() {
    const { data: { count } = { count: 0 } } = useQuery({
        queryKey: ['admin-unread-notifications-count'],
        queryFn: () => notificationsService.getUnreadCount(),
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    return (
        <Link
            to="/notifications"
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            title="Notifications"
        >
            <Bell className="h-5 w-5" />
            {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}
