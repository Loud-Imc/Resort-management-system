import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications';
import { Bell, CheckCircle, Trash2, Clock, Info, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function Notifications() {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: () => notificationsService.getAll(),
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['admin-unread-notifications-count'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['admin-unread-notifications-count'] });
            toast.success('All marked as read');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['admin-unread-notifications-count'] });
            toast.success('Notification deleted');
        },
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'PROPERTY_REGISTRATION':
                return <Bell className="h-5 w-5 text-blue-500" />;
            case 'CP_REGISTRATION':
                return <CheckSquare className="h-5 w-5 text-purple-500" />;
            case 'BOOKING_CREATED':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'PAYOUT_CONFIRMED':
                return <Info className="h-5 w-5 text-amber-500" />;
            default:
                return <Bell className="h-5 w-5 text-primary" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                    <p className="text-muted-foreground mt-1">Manage system alerts and updates</p>
                </div>
                {notifications.length > 0 && notifications.some(n => !n.isRead) && (
                    <button
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                    >
                        <CheckSquare className="h-4 w-4" />
                        Mark all read
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
                        <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-lg font-medium text-foreground">No notifications yet</p>
                        <p className="text-muted-foreground">We'll notify you when something important happens.</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={clsx(
                                "group relative bg-card border rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-md",
                                notification.isRead ? "border-border opacity-75" : "border-primary/30 ring-1 ring-primary/10"
                            )}
                        >
                            <div className="flex gap-4">
                                <div className={clsx(
                                    "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center",
                                    notification.isRead ? "bg-muted" : "bg-primary/10"
                                )}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className={clsx(
                                            "text-base font-semibold transition-colors",
                                            notification.isRead ? "text-muted-foreground" : "text-foreground"
                                        )}>
                                            {notification.title}
                                        </h3>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteMutation.mutate(notification.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </span>
                                        {!notification.isRead && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                New
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
