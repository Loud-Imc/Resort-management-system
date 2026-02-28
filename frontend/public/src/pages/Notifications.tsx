import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications';
import { Bell, CheckCircle, Trash2, Clock, Info, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import Layout from '../components/layout/Layout';

export default function Notifications() {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['guest-notifications'],
        queryFn: () => notificationsService.getAll(),
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guest-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['guest-unread-notifications-count'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guest-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['guest-unread-notifications-count'] });
            toast.success('All marked as read');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guest-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['guest-unread-notifications-count'] });
            toast.success('Notification deleted');
        },
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'BOOKING_CREATED':
            case 'BOOKING_CONFIRMED':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'CP_REFERRAL_BOOKING':
                return <CheckSquare className="h-5 w-5 text-purple-500" />;
            case 'PAYOUT_CONFIRMED':
                return <Info className="h-5 w-5 text-amber-500" />;
            default:
                return <Bell className="h-5 w-5 text-primary-600" />;
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 font-serif">Your Notifications</h1>
                        <p className="text-gray-500 mt-1">Stay updated with your bookings and activities</p>
                    </div>
                    {notifications.length > 0 && notifications.some((n: any) => !n.isRead) && (
                        <button
                            onClick={() => markAllAsReadMutation.mutate()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-full transition-all shadow-sm"
                        >
                            <CheckSquare className="h-4 w-4" />
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <Bell className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-xl font-medium text-gray-900">All caught up!</p>
                            <p className="text-gray-500">You don't have any notifications right now.</p>
                        </div>
                    ) : (
                        notifications.map((notification: any) => (
                            <div
                                key={notification.id}
                                className={clsx(
                                    "group relative bg-white border rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md",
                                    notification.isRead ? "border-gray-100 bg-gray-50/30" : "border-primary-100 ring-1 ring-primary-50"
                                )}
                            >
                                <div className="flex gap-5">
                                    <div className={clsx(
                                        "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center",
                                        notification.isRead ? "bg-gray-100" : "bg-primary-50"
                                    )}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <h3 className={clsx(
                                                "text-lg font-bold transition-colors",
                                                notification.isRead ? "text-gray-600" : "text-gray-900"
                                            )}>
                                                {notification.title}
                                            </h3>
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={() => markAsReadMutation.mutate(notification.id)}
                                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteMutation.mutate(notification.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed mb-4">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                            {!notification.isRead && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider">
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
        </Layout>
    );
}
