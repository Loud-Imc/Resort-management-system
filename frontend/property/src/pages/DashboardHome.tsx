import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../context/PropertyContext';
import { reportsService } from '../services/reports';
import { Loader2, IndianRupee, Users, BedDouble, Plus, Clock, Calendar, TrendingUp, ArrowRight, MoreVertical, Lock, CalendarDays, AlertTriangle, CheckSquare, Check, CheckCircle2, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '../types/room';
import clsx from 'clsx';
import GuestDetailsModal from '../components/Rooms/GuestDetailsModal';
import FinancialDetailsModal from '../components/Reports/FinancialDetailsModal';
import BlockRoomModal from '../components/Rooms/BlockRoomModal';
import RoomScheduleModal from '../components/Rooms/RoomScheduleModal';
import PropertyAgreementModal, { type AgreementAcceptancePayload } from '../components/PropertyAgreementModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { useNavigation } from '../hooks/useNavigation';
import PropertyReadiness from '../components/PropertyReadiness';
import BookingsCalendarWidget from '../components/Dashboard/BookingsCalendarWidget';
import HistoricalGuestDetailsModal from '../components/Rooms/HistoricalGuestDetailsModal';
import { addDays } from 'date-fns';
import type { Booking } from '../types/booking';
function formatTime12Hour(time24?: string | null): string {
    if (!time24) return '';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minuteStr = m.toString().padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
}

export default function DashboardHome() {
    const { selectedProperty, refreshProperties } = useProperty();
    const navigate = useNavigate();
    const { navItems, hasPermission } = useNavigation();

    // Redirect to first available tab if no dashboard permission
    useEffect(() => {
        if (!hasPermission('reports.viewDashboard')) {
            const firstAllowed = navItems.find(item => item.path !== '/');
            if (firstAllowed) {
                navigate(firstAllowed.path, { replace: true });
            }
        }
    }, [hasPermission, navItems, navigate]);

    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    
    // New Historical Modal state
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
    const [historicalRoomId, setHistoricalRoomId] = useState<string>('');
    const [historicalRoomNumber, setHistoricalRoomNumber] = useState('');

    // PMS Agreement Modal states
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
    const [isSigningAgreement, setIsSigningAgreement] = useState(false);

    const details = (selectedProperty as any)?.details || (selectedProperty as any)?.documentDetails || {};
    const isAgreementAccepted = details?.agreementAccepted === true;

    const handlePmsAcceptAgreement = async (payload: AgreementAcceptancePayload) => {
        setIsSigningAgreement(true);
        try {
            if (selectedProperty?.id) {
                try {
                    await api.post(`/properties/requests/${selectedProperty.id}/accept-agreement`, payload);
                } catch {
                    try {
                        await api.post(`/properties/${selectedProperty.id}/accept-agreement`, payload);
                    } catch {
                        await api.patch(`/properties/requests/${selectedProperty.id}/my`, {
                            agreementAccepted: payload.agreementAccepted,
                            agreementAcceptedAt: payload.agreementAcceptedAt,
                            agreementVersion: payload.agreementVersion,
                            agreementDesignation: payload.agreementDesignation,
                            agreementSignatureName: payload.agreementSignatureName,
                            agreementAuditId: payload.agreementAuditId
                        });
                    }
                }
            }
            toast.success('Agreement successfully accepted! Your property can now be approved by the admin.');
            setIsAgreementModalOpen(false);
            if (refreshProperties) await refreshProperties();
        } catch (error: any) {
            console.error('Failed to accept agreement:', error);
            toast.error(error.response?.data?.message || 'Failed to submit agreement acceptance');
        } finally {
            setIsSigningAgreement(false);
        }
    };

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'REVENUE' | 'BOOKINGS' | null>(null);

    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [blockingRoom, setBlockingRoom] = useState<any>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // Multi-Room Selection State for Booking Creation
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);

    // Fetch unified dashboard statistics (single API call with server-calculated date-aware room statuses)
    const { data: stats, isLoading: statsLoading, isFetching } = useQuery<any>({
        queryKey: ['dashboard-unified', selectedProperty?.id, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'today'],
        queryFn: () => reportsService.getDashboardUnified({
            propertyId: selectedProperty?.id,
            date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        }),
        enabled: !!selectedProperty?.id && hasPermission('reports.viewDashboard'),
        placeholderData: (previousData: any) => previousData,
    });

    const displayRooms = stats?.roomsList || [];

    // Clear room selection when selected date changes
    useEffect(() => {
        setSelectedRoomIds([]);
    }, [selectedDate]);

    const toggleRoomSelection = (roomId: string) => {
        setSelectedRoomIds(prev => {
            const next = prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId];
            if (next.length > 0 && !isSelectionMode) {
                setIsSelectionMode(true);
            }
            return next;
        });
    };

    const handleSelectAllAvailable = () => {
        const availableIds = displayRooms
            .filter((r: any) => r.status === 'AVAILABLE' || r.status === 'OUT_TODAY')
            .map((r: any) => r.id);
        setSelectedRoomIds(availableIds);
        setIsSelectionMode(true);
    };

    const handleClearSelection = () => {
        setSelectedRoomIds([]);
        setIsSelectionMode(false);
    };

    const handleCreateBookingForSelectedRooms = () => {
        if (selectedRoomIds.length === 0) return;
        const selectedRooms = displayRooms.filter((r: any) => selectedRoomIds.includes(r.id));
        const roomTypeIds = Array.from(new Set(selectedRooms.map((r: any) => r.roomTypeId).filter(Boolean))) as string[];
        const targetDate = selectedDate || new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');

        navigate('/bookings/create', {
            state: {
                roomIds: selectedRoomIds,
                roomId: selectedRoomIds[0],
                roomTypeIds,
                roomTypeId: selectedRooms[0]?.roomTypeId,
                startDate: dateStr,
                endDate: format(addDays(targetDate, 1), 'yyyy-MM-dd'),
                roomsCount: selectedRoomIds.length,
                adultsCount: Math.max(2, selectedRoomIds.length * 2),
            }
        });
    };
    const statusSummary = stats?.statusSummary || {
        AVAILABLE: 0,
        OUT_TODAY: 0,
        RESERVED: 0,
        OCCUPIED: 0,
        MAINTENANCE: 0,
        BLOCKED: 0,
        TOTAL: 0,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700';
            case 'OUT_TODAY': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700';
            case 'OCCUPIED': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
            case 'RESERVED': return 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700';
            case 'MAINTENANCE': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
            case 'CLEANING': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
            case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
            default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
        }
    };

    const handleRoomClick = (room: any) => {
        if (isSelectionMode || selectedRoomIds.length > 0) {
            if (room.status === 'AVAILABLE' || room.status === 'OUT_TODAY') {
                toggleRoomSelection(room.id);
                return;
            }
        }
        if (room.status === 'AVAILABLE') {
            handleBookClick(room);
        } else if (room._activeBooking) {
            setSelectedBooking(room._activeBooking);
            setHistoricalRoomId(room.id);
            setHistoricalRoomNumber(room.roomNumber);
            setIsHistoricalModalOpen(true);
        } else if (room.status === 'OUT_TODAY' && room._checkoutBooking) {
            setSelectedBooking(room._checkoutBooking);
            setHistoricalRoomId(room.id);
            setHistoricalRoomNumber(room.roomNumber);
            setIsHistoricalModalOpen(true);
        } else if (room.status === 'OCCUPIED' || room.status === 'RESERVED') {
            setSelectedRoomId(room.id);
            setIsGuestModalOpen(true);
        } else if (room.status === 'BLOCKED' || room.status === 'MAINTENANCE') {
            setSelectedRoomId(room.id);
            setIsScheduleModalOpen(true);
        }
    };

    const handleBookClick = (room: any) => {
        const targetDate = selectedDate || new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        navigate('/bookings/create', { 
            state: { 
                roomId: room.id,
                roomIds: [room.id],
                roomTypeId: room.roomTypeId,
                roomTypeIds: room.roomTypeId ? [room.roomTypeId] : [],
                roomNumber: room.roomNumber,
                startDate: dateStr,
                endDate: format(addDays(targetDate, 1), 'yyyy-MM-dd'),
                roomsCount: 1,
                adultsCount: 2,
            } 
        });
    };

    // Full-screen spinner only on initial load when no data exists yet
    if (!stats && statsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (selectedProperty && selectedProperty.status !== 'APPROVED') {
        const propDetails = (selectedProperty as any)?.details || (selectedProperty as any)?.documentDetails || {};
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-xl w-full">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {selectedProperty.status === 'PENDING' ? 'Registration Pending' : 'Property Inactive'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed mb-6">
                        {selectedProperty.status === 'PENDING'
                            ? "Your property registration is currently under review by our admin team. You'll be able to manage your rooms and bookings once it's approved."
                            : "This property is currently inactive. Please contact the administrator to re-enable it."}
                    </p>

                    <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 font-bold text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Status: {selectedProperty.status}
                    </div>

                    {/* Agreement Status Action Box */}
                    {selectedProperty.status === 'PENDING' && (
                        <div className="mt-8">
                            {!isAgreementAccepted ? (
                                <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border-2 border-amber-300 dark:border-amber-800 rounded-2xl text-left space-y-3 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                                Action Required: Sign Listing Agreement
                                            </h3>
                                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                                                The Oreedu Property Listing & Platform Services Agreement has not been accepted yet. Platform administrators require your electronic acceptance before approving and activating your listing.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-amber-200 dark:border-amber-800/60">
                                        <button
                                            type="button"
                                            onClick={() => setIsAgreementModalOpen(true)}
                                            className="px-4 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md shadow-primary-600/20 flex items-center gap-2 cursor-pointer"
                                        >
                                            <FileText className="h-4 w-4" /> Review &amp; Sign Agreement Now
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-left">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                            ✓ Agreement Accepted ({propDetails.agreementVersion || 'v1.0'})
                                        </p>
                                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                                            Signed by {propDetails.agreementSignatureName || 'Authorized Signatory'} ({propDetails.agreementDesignation || 'Owner'}). Your property is ready for final Admin Approval.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Agreement Modal in PMS Mode */}
                <PropertyAgreementModal
                    isOpen={isAgreementModalOpen}
                    onClose={() => setIsAgreementModalOpen(false)}
                    mode="pms"
                    data={{
                        propertyName: selectedProperty.name,
                        propertyType: selectedProperty.type || propDetails.propertyType,
                        categoryName: (selectedProperty as any).category?.name || propDetails.categoryName,
                        address: selectedProperty.address || propDetails.address || '',
                        city: selectedProperty.city || propDetails.city || '',
                        state: selectedProperty.state || propDetails.state || '',
                        country: selectedProperty.country || propDetails.country || 'India',
                        pincode: selectedProperty.pincode || propDetails.pincode || '',
                        propertyEmail: selectedProperty.email || propDetails.propertyEmail || '',
                        propertyPhone: selectedProperty.phone || propDetails.propertyPhone || '',
                        ownerFirstName: propDetails.ownerFirstName || selectedProperty.name,
                        ownerLastName: propDetails.ownerLastName || '',
                        ownerEmail: propDetails.ownerEmail || selectedProperty.email || '',
                        ownerPhone: propDetails.ownerPhone || selectedProperty.phone || '',
                        platformCommission: propDetails.platformCommission || (selectedProperty as any).platformCommission || 10,
                        gstNumber: selectedProperty.gstNumber || propDetails.gstNumber,
                        isGstApplicable: selectedProperty.isGstApplicable || propDetails.isGstApplicable,
                        ownerAadhaarNumber: (selectedProperty as any).ownerAadhaarNumber || propDetails.ownerAadhaarNumber,
                        requestId: selectedProperty.id
                    }}
                    onAgree={handlePmsAcceptAgreement}
                    isSubmitting={isSigningAgreement}
                />
            </div>
        );
    }

    // Document expiry alerts
    const docAlerts = (() => {
        const details = (selectedProperty as any)?.documentDetails;
        if (!details || typeof details !== 'object') return [];
        const now = new Date();
        const in30 = new Date();
        in30.setDate(in30.getDate() + 30);

        // Keys to skip — these are not document expiry dates
        const NON_EXPIRY_KEYS = new Set([
            'agreementAccepted', 'agreementAcceptedAt', 'agreementVersion',
            'agreementDesignation', 'agreementSignatureName', 'agreementAuditId',
            'isPmsActive', 'platformCommission', 'isGstApplicable',
        ]);

        return Object.entries(details as Record<string, string>).map(([key, dateStr]) => {
            // Skip non-expiry fields and any field whose value is not a non-empty string
            if (NON_EXPIRY_KEYS.has(key)) return null;
            if (!dateStr || typeof dateStr !== 'string') return null;
            // Must look like a date string (contains digits and separators)
            if (!/\d{4}/.test(dateStr)) return null;
            const expiry = new Date(dateStr);
            if (isNaN(expiry.getTime())) return null;
            const label = key === 'licenceImage' ? 'Property Licence' : key.startsWith('document_') ? `Additional Document ${parseInt(key.replace('document_', '')) + 1}` : key;
            if (expiry < now) return { label, dateStr: dateStr as string, type: 'expired' as const };
            if (expiry <= in30) return { label, dateStr: dateStr as string, type: 'expiring' as const };
            return null;
        }).filter(Boolean) as { label: string; dateStr: string; type: 'expired' | 'expiring' }[];
    })();

    const availableRoomsCount = displayRooms.filter((r: any) => r.status === 'AVAILABLE' || r.status === 'OUT_TODAY').length;

    return (
        <div className="space-y-6">
            {!isAgreementAccepted && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border-2 border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                Action Required: Sign Platform Listing Agreement
                            </h3>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                                Your property is approved, but the electronic listing agreement is pending your signature. Please complete signing to maintain active listing status.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAgreementModalOpen(true)}
                        className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                        <FileText className="h-4 w-4" /> Review &amp; Sign Agreement
                    </button>
                </div>
            )}

            <PropertyReadiness />

            {/* Document Expiry Alerts */}
            {docAlerts.length > 0 && (
                <div className="space-y-2">
                    {docAlerts.map((alert, i) => (
                        <div
                            key={i}
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                                alert.type === 'expired'
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                            }`}
                        >
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                                {alert.type === 'expired'
                                    ? <><strong>{alert.label}</strong> has <strong>expired</strong> on {new Date(alert.dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}. Please update this document. </>
                                    : <><strong>{alert.label}</strong> is expiring on <strong>{new Date(alert.dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>. Please renew it soon. </>
                                }
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedProperty?.name || 'Dashboard'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Welcome back! Here's today's overview.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/bookings/create')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Walk-in Booking
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'New Booking', icon: Plus, path: '/bookings/create', color: 'bg-primary hover:bg-primary/90 text-primary-foreground' },
                    { label: 'View Bookings', icon: Calendar, path: '/bookings', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                    { label: 'Manage Rooms', icon: BedDouble, path: '/rooms', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                    { label: 'My Property', icon: TrendingUp, path: '/my-property', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                ].map((action) => (
                    <button
                        key={action.label}
                        onClick={() => navigate(action.path)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${action.color}`}
                    >
                        <action.icon className="h-4 w-4" />
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => { setDetailsType('BOOKINGS'); setDetailsModalOpen(true); }}
                    className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Bookings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.bookingsCreated || 0}</p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => { setDetailsType('REVENUE'); setDetailsModalOpen(true); }}
                    className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                            <IndianRupee className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{(stats?.revenue || 0).toLocaleString()}
                            </p>
                            {Number(stats?.todayFees) > 0 && (
                                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                                    Incl. ₹{stats?.todayFees} platform fee
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Occupancy</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.occupancy?.percentage || 0}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <Users className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check-Ins / Outs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats?.checkIns || 0} <span className="text-sm text-gray-400 font-normal">/ {stats?.checkOuts || 0}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Status Overview — Quick Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    {[
                        { label: 'Available', count: statusSummary.AVAILABLE, color: 'bg-emerald-500' },
                        { label: 'Out Today', count: statusSummary.OUT_TODAY, color: 'bg-orange-500' },
                        { label: 'Reserved', count: statusSummary.RESERVED, color: 'bg-indigo-500' },
                        { label: 'Occupied', count: statusSummary.OCCUPIED, color: 'bg-blue-500' },
                        { label: 'Maintenance', count: statusSummary.MAINTENANCE, color: 'bg-amber-500' },
                        { label: 'Blocked', count: statusSummary.BLOCKED, color: 'bg-red-500' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${s.color}`} />
                            <span className="text-gray-600 dark:text-gray-300">{s.label}:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{s.count}</span>
                        </div>
                    ))}
                    <div className="ml-auto text-gray-500 dark:text-gray-400 font-medium">
                        Total: <span className="text-gray-900 dark:text-white font-bold">{stats?.occupancy?.total || displayRooms.length}</span>
                    </div>
                </div>
            </div>

            {/* Split Grid for Room Status and Calendar */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Room Status Grid */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 h-full space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <BedDouble className="h-5 w-5 text-primary" />
                                    {selectedDate ? `Room Status for ${format(selectedDate, 'MMM d, yyyy')}` : 'Room Status'}
                                    {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary ml-1" />}
                                </h2>
                                {selectedProperty && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Check-in: <strong>{formatTime12Hour(selectedProperty.defaultCheckInTime || '14:00')}</strong></span>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <span>Check-out: <strong>{formatTime12Hour(selectedProperty.defaultCheckOutTime || '11:00')}</strong></span>
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Reset to Today
                                    </button>
                                )}

                                {/* Multi-Selection Toggle Button */}
                                {availableRoomsCount > 0 && (
                                    <button
                                        onClick={() => {
                                            if (isSelectionMode && selectedRoomIds.length === 0) {
                                                setIsSelectionMode(false);
                                            } else if (isSelectionMode && selectedRoomIds.length > 0) {
                                                handleClearSelection();
                                            } else {
                                                setIsSelectionMode(true);
                                            }
                                        }}
                                        className={clsx(
                                            "text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                                            isSelectionMode || selectedRoomIds.length > 0
                                                ? "bg-primary/10 text-primary border-primary/30"
                                                : "bg-muted/50 hover:bg-muted text-muted-foreground border-border hover:text-foreground"
                                        )}
                                    >
                                        <CheckSquare className="h-3.5 w-3.5" />
                                        {isSelectionMode ? 'Cancel Selection' : 'Select Multiple Rooms'}
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate('/rooms')}
                                    className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                                >
                                    All Rooms <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Multi-Room Selection Floating / Sticky Bar */}
                        {(isSelectionMode || selectedRoomIds.length > 0) && (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        {selectedRoomIds.length} Room{selectedRoomIds.length === 1 ? '' : 's'} Selected
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        (for {selectedDate ? format(selectedDate, 'MMM d') : 'Today'})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {availableRoomsCount > selectedRoomIds.length && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAllAvailable}
                                            className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded cursor-pointer"
                                        >
                                            Select All ({availableRoomsCount})
                                        </button>
                                    )}
                                    {selectedRoomIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleClearSelection}
                                            className="text-xs font-bold text-muted-foreground hover:text-rose-600 px-2 py-1 rounded cursor-pointer"
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={selectedRoomIds.length === 0}
                                        onClick={handleCreateBookingForSelectedRooms}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Create Booking ({selectedRoomIds.length})
                                    </button>
                                </div>
                            </div>
                        )}

                        {displayRooms.length === 0 ? (
                            <div className="text-center py-12">
                                <BedDouble className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No rooms found.</p>
                                <button onClick={() => navigate('/rooms/create')}
                                    className="mt-3 text-sm text-primary hover:underline font-medium cursor-pointer">
                                    + Add your first room
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {displayRooms.map((room: any) => {
                                    const isAvailableOrOutToday = room.status === 'AVAILABLE' || room.status === 'OUT_TODAY';
                                    const isSelected = selectedRoomIds.includes(room.id);

                                    return (
                                        <div
                                            key={room.id}
                                            onClick={() => handleRoomClick(room as Room & { _activeBooking?: Booking | null, _checkoutBooking?: Booking | null })}
                                            title={
                                                (room as any)._checkoutBooking && room.status !== 'OUT_TODAY'
                                                    ? "This room has a check out today, but also has a booking today"
                                                    : room.status === 'AVAILABLE' 
                                                        ? (isSelectionMode ? `Select Room ${room.roomNumber}` : `Book Room ${room.roomNumber}`)
                                                        : `${room.roomNumber} — ${room.status}`
                                            }
                                            className={clsx(
                                                `p-3 rounded-2xl border text-center font-medium transition-all flex flex-col justify-center items-center h-full min-h-[6.5rem] relative group cursor-pointer hover:shadow-lg hover:-translate-y-1 select-none`,
                                                activeMenuId === room.id ? 'z-30' : 'z-10',
                                                isSelected
                                                    ? 'ring-2 ring-primary border-primary bg-primary/10 dark:bg-primary/20 shadow-md transform scale-[1.02]'
                                                    : getStatusColor(room.status as string)
                                            )}
                                        >
                                            {/* Checkbox for Available / Out Today rooms */}
                                            {isAvailableOrOutToday && (
                                                <div 
                                                    className={clsx(
                                                        "absolute top-2 left-2 z-20 transition-all",
                                                        isSelectionMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleRoomSelection(room.id);
                                                    }}
                                                >
                                                    <div className={clsx(
                                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shadow-xs",
                                                        isSelected
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "bg-white/80 dark:bg-gray-800/80 border-gray-400 dark:border-gray-500 hover:border-primary text-transparent"
                                                    )}>
                                                        <Check className={clsx("w-3.5 h-3.5 stroke-[3]", isSelected ? "block" : "hidden")} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Three-dot dropdown menu trigger */}
                                            {room.status !== 'BLOCKED' && room.status !== 'MAINTENANCE' && (
                                                <div className="absolute top-1.5 right-1.5 z-30">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuId(activeMenuId === room.id ? null : room.id);
                                                        }}
                                                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>

                                                    {activeMenuId === room.id && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden text-left py-1"
                                                        >
                                                            {room.status === 'AVAILABLE' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setBlockingRoom(room);
                                                                        setIsBlockModalOpen(true);
                                                                        setActiveMenuId(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                >
                                                                    <Lock className="h-3.5 w-3.5 text-amber-500" /> Block Room
                                                                </button>
                                                            )}
                                                            {(room.status === 'OCCUPIED' || room.status === 'RESERVED') && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRoomId(room.id);
                                                                            setIsGuestModalOpen(true);
                                                                            setActiveMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                    >
                                                                        <Users className="h-3.5 w-3.5 text-primary" /> Guest Details
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRoomId(room.id);
                                                                            setIsScheduleModalOpen(true);
                                                                            setActiveMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                    >
                                                                        <CalendarDays className="h-3.5 w-3.5 text-amber-500" /> View Schedule
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status edge badge: If there's a checkout today but the room is already booked for tonight */}
                                            {(room as any)._checkoutBooking && room.status !== 'OUT_TODAY' && (
                                                <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tr-2xl rounded-bl-lg shadow-sm z-10" title="This room has a check out today, but also has a booking today">
                                                    OUT TODAY
                                                </span>
                                            )}

                                            <div className="font-bold text-lg">{room.roomNumber}</div>
                                            <div className="mt-1 flex flex-col items-center w-full">
                                                {(room as any)._guestName && (
                                                    <span className="font-semibold text-xs truncate w-full px-1 text-center">
                                                        {(room as any)._guestName}
                                                    </span>
                                                )}
                                                <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-80">
                                                    {room.status?.replace('_', ' ')}
                                                </span>
                                            </div>

                                            {room.status === 'OUT_TODAY' && !isSelectionMode && selectedRoomIds.length === 0 && (
                                                <div 
                                                    className="absolute bottom-0 left-0 w-full bg-primary/10 text-primary dark:text-primary-foreground dark:bg-primary/20 text-[10px] font-bold py-2 border-t border-primary/20 dark:border-primary/30 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary transition-all cursor-pointer z-20 flex items-center justify-center gap-1 backdrop-blur-sm rounded-b-[15px]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBookClick(room as Room);
                                                    }}
                                                >
                                                    <Plus className="w-3 h-3" /> BOOK
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {displayRooms.some((r: any) => r.status === 'AVAILABLE') && (
                            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
                                💡 Click any available room to book individually, or use checkboxes to book multiple rooms together.
                            </p>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <BookingsCalendarWidget 
                        totalRooms={displayRooms.length}
                        selectedDate={selectedDate || undefined}
                        onDateSelect={setSelectedDate}
                        currentMonth={calendarMonth}
                        onMonthChange={setCalendarMonth}
                    />
                </div>
            </div>


            {/* Click outside to close active dropdown menu */}
            {activeMenuId && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => setActiveMenuId(null)}
                    style={{ background: 'transparent' }}
                />
            )}

            {/* Guest Details Modal */}
            <GuestDetailsModal
                roomId={selectedRoomId || ''}
                isOpen={isGuestModalOpen}
                onClose={() => setIsGuestModalOpen(false)}
            />

            <HistoricalGuestDetailsModal
                booking={selectedBooking}
                roomId={historicalRoomId}
                roomNumber={historicalRoomNumber}
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
            />

            <FinancialDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                type={detailsType}
                dateRange={{
                    startDate: format(new Date(), 'yyyy-MM-dd'),
                    endDate: format(new Date(), 'yyyy-MM-dd')
                }}
                propertyId={selectedProperty?.id}
            />

            {/* Block Room Modal */}
            {isBlockModalOpen && blockingRoom && (
                <BlockRoomModal
                    room={blockingRoom}
                    onClose={() => {
                        setIsBlockModalOpen(false);
                        setBlockingRoom(null);
                    }}
                    onSuccess={() => {
                        setIsBlockModalOpen(false);
                        setBlockingRoom(null);
                    }}
                />
            )}

            {/* Room Schedule Modal */}
            <RoomScheduleModal
                roomId={selectedRoomId || ''}
                selectedDate={selectedDate || new Date()}
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
            />

            {/* Agreement Modal in PMS Mode */}
            {selectedProperty && (
                <PropertyAgreementModal
                    isOpen={isAgreementModalOpen}
                    onClose={() => setIsAgreementModalOpen(false)}
                    mode="pms"
                    data={{
                        propertyName: selectedProperty.name,
                        propertyType: selectedProperty.type || details.propertyType,
                        categoryName: (selectedProperty as any).category?.name || details.categoryName,
                        address: selectedProperty.address || details.address || '',
                        city: selectedProperty.city || details.city || '',
                        state: selectedProperty.state || details.state || '',
                        country: selectedProperty.country || details.country || 'India',
                        pincode: selectedProperty.pincode || details.pincode || '',
                        propertyEmail: selectedProperty.email || details.propertyEmail || '',
                        propertyPhone: selectedProperty.phone || details.propertyPhone || '',
                        ownerFirstName: details.ownerFirstName || selectedProperty.name,
                        ownerLastName: details.ownerLastName || '',
                        ownerEmail: details.ownerEmail || selectedProperty.email || '',
                        ownerPhone: details.ownerPhone || selectedProperty.phone || '',
                        platformCommission: details.platformCommission || (selectedProperty as any).platformCommission || 10,
                        gstNumber: selectedProperty.gstNumber || details.gstNumber,
                        isGstApplicable: selectedProperty.isGstApplicable || details.isGstApplicable,
                        ownerAadhaarNumber: (selectedProperty as any).ownerAadhaarNumber || details.ownerAadhaarNumber,
                        requestId: selectedProperty.id
                    }}
                    onAgree={handlePmsAcceptAgreement}
                    isSubmitting={isSigningAgreement}
                />
            )}
        </div>
    );
}
