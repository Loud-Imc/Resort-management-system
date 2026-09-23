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
    IndianRupee,
    PieChart,
    Briefcase,
    Shield,
    Building2,
    RefreshCw,
    Tag,
    Rocket,
    Plus,
    PackageSearch,
    MessageSquare,
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

    const isOwnerOrAdmin = user?.roles?.some(r => ['SuperAdmin', 'PropertyOwner', 'Admin'].includes(r)) ||
                           ['SuperAdmin', 'PropertyOwner', 'Admin'].includes(user?.role as string);

    const hasPermission = (permission: string) => {
        return isOwnerOrAdmin || user?.permissions?.includes(permission);
    };

    const navItems = [
        ...(hasPermission('reports.viewDashboard') || isOwnerOrAdmin ? [
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

            ...(hasPermission('otaMessaging.read') || user?.roles?.includes('PropertyOwner') || user?.roles?.includes('SuperAdmin') ? [
                {
                    icon: MessageSquare,
                    label: 'OTA Messaging',
                    path: '/ota-messages'
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
                { icon: CreditCard, label: 'Booking Revenue', path: '/payments' },
            ] : []),

            ...(hasPermission('reports.viewFinancial') ? [
                { icon: IndianRupee, label: 'Financials', path: '/financials' },
                { icon: Plus, label: 'Add Expenses', path: '/financials?action=add-expense' },
            ] : []),

            ...(hasPermission('marketing.read') ? [
                { icon: Tag, label: 'Offers & Marketing', path: '/marketing/offers' },
                { icon: Rocket, label: 'Promotional Boosters', path: '/marketing/boosters' },
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

            ...(hasPermission('properties.read') ? [
                { icon: PackageSearch, label: 'Assets', path: '/assets' },
            ] : []),

            ...(hasPermission('settings.manage') ? [
                { icon: RefreshCw, label: 'OTA Sync', path: '/calendar-sync' },
            ] : []),
        ] : []),

        // Always show My Property even if agreement or registration is pending approval
        ...(hasPermission('properties.read') || isOwnerOrAdmin || !!selectedProperty ? [
            { icon: Building2, label: 'My Property', path: '/my-property' },
        ] : []),
    ];

    return {
        navItems,
        hasPermission,
        unreadCount
    };
}
