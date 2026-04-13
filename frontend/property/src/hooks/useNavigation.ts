import { useAuth } from '../context/AuthContext';
import { useProperty } from '../context/PropertyContext';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../services/bookings';
import {
    LayoutDashboard,
    Calendar,
    BedDouble,
    Users,
    CreditCard,
    DollarSign,
    PieChart,
    Briefcase,
    Shield,
    Building2,
    RefreshCw
} from 'lucide-react';

export function useNavigation() {
    const { user, isAuthenticated } = useAuth();
    const { selectedProperty } = useProperty();

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['bookings', 'unread-count', selectedProperty?.id],
        queryFn: () => bookingsService.getUnreadCount(selectedProperty?.id),
        enabled: !!selectedProperty?.id && isAuthenticated,
        refetchInterval: 60000,
    });

    const hasPermission = (permission: string) => {
        return user?.permissions?.includes(permission) || user?.roles?.includes('SuperAdmin');
    };

    const navItems = [
        ...(hasPermission('reports.viewDashboard') ? [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/' }
        ] : []),

        ...(selectedProperty?.status === 'APPROVED' ? [
            ...(hasPermission('bookings.read') ? [
                {
                    icon: Calendar,
                    label: 'Bookings',
                    path: '/bookings',
                    badge: unreadCount > 0 ? unreadCount : undefined
                },
            ] : []),

            ...(hasPermission('users.read') ? [
                { icon: Users, label: 'Guests', path: '/guests' },
            ] : []),

            ...(hasPermission('rooms.read') ? [
                { icon: BedDouble, label: 'Rooms', path: '/rooms' },
            ] : []),

            ...(hasPermission('roomTypes.read') ? [
                { icon: BedDouble, label: 'Room Types', path: '/room-types' },
            ] : []),

            ...(hasPermission('payments.read') ? [
                { icon: CreditCard, label: 'Payments', path: '/payments' },
            ] : []),

            ...(hasPermission('reports.viewFinancial') ? [
                { icon: DollarSign, label: 'Financials', path: '/financials' },
            ] : []),

            ...(hasPermission('bookingSources.read') ? [
                { icon: Briefcase, label: 'Sources', path: '/booking-sources' },
            ] : []),

            ...(hasPermission('users.read') ? [
                { icon: Users, label: 'My Team', path: '/team' },
            ] : []),

            ...(hasPermission('roles.read') ? [
                { icon: Shield, label: 'Roles', path: '/roles' },
            ] : []),

            ...(hasPermission('reports.viewDashboard') ? [
                { icon: PieChart, label: 'Reports', path: '/reports' }
            ] : []),

            ...(hasPermission('settings.manage') ? [
                { icon: RefreshCw, label: 'Calendar Sync', path: '/calendar-sync' },
            ] : []),
        ] : []),

        ...(hasPermission('properties.read') ? [
            { icon: Building2, label: 'My Property', path: '/my-property' },
        ] : []),
    ];

    return {
        navItems,
        hasPermission,
        unreadCount
    };
}
