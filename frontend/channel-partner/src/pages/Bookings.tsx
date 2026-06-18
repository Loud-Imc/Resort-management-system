import React, { useEffect, useState, useMemo } from 'react';
import PremiumTable from '../components/PremiumTable';
import PaginationControls from '../components/PaginationControls';
import {
    BadgeCheck, Clock, MapPin, XCircle, Loader2, Eye,
    Search, TrendingUp, Wallet, Briefcase,
    Calendar, Users, FileText
} from 'lucide-react';
import BookingDetailModal from '../components/BookingDetailModal';
import { formatPrice } from '../utils/currency';
import api from '../services/api';

interface Booking {
    id: string;
    bookingNumber?: string;
    guestName: string;
    property: string;
    propertyImage?: string;
    city?: string;
    checkIn: string;
    checkOut: string;
    nights?: number;
    status: string;
    amount: string;
    rawAmount: number;
    paymentStatus?: string;
    paymentMethod?: 'WALLET' | 'ONLINE';
    commissionAmount?: number;
    commissionRate?: number;
    discountRate?: number;
    baseAmount?: number;
    taxAmount?: number;
    extraAdultAmount?: number;
    extraChildAmount?: number;
    offerDiscountAmount?: number;
    referralDiscountAmount?: number;
    pointsEarned?: number;
    roomType?: string;
    adults?: number;
    children?: number;
    createdBy?: string;
}

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;
    const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response: any = await api.get('/channel-partners/me');
                console.log('Bookings Data:', response.referrals); // Adding debug log
                const mappedData = response.referrals.map((ref: any) => ({
                    id: ref.id,
                    bookingNumber: ref.bookingNumber,
                    guestName: ref.user ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : (ref.guests?.[0] ? `${ref.guests[0].firstName} ${ref.guests[0].lastName || ''}`.trim() : 'Guest'),
                    property: ref.property?.name || ref.room?.roomType?.property?.name || 'N/A',
                    propertyImage: ref.property?.images?.[0] || ref.room?.roomType?.property?.images?.[0],
                    city: ref.property?.city || ref.room?.roomType?.property?.city || 'Wayanad',
                    checkIn: new Date(ref.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    checkOut: new Date(ref.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    nights: ref.numberOfNights || Math.max(1, Math.ceil((new Date(ref.checkOutDate).getTime() - new Date(ref.checkInDate).getTime()) / 86400000)),
                    status: ref.status,
                    rawAmount: Number(ref.totalAmount || 0),
                    amount: formatPrice(Number(ref.totalAmount || 0), 'INR'),
                    paymentStatus: ref.paymentStatus,
                    paymentMethod: ref.paymentMethod || 'ONLINE',
                    commissionAmount: Number(ref.cpCommission || 0),
                    commissionRate: Number(ref.channelPartner?.commissionRate || 10),
                    baseAmount: Number(ref.baseAmount || 0),
                    taxAmount: Number(ref.taxAmount || 0),
                    extraAdultAmount: Number(ref.extraAdultAmount || 0),
                    extraChildAmount: Number(ref.extraChildAmount || 0),
                    offerDiscountAmount: Number(ref.offerDiscountAmount || 0),
                    referralDiscountAmount: Number(ref.cpDiscount || 0),
                    discountRate: Number(ref.channelPartner?.referralDiscountRate || 5),
                    adults: Number(ref.adultsCount || 1),
                    children: Number(ref.childrenCount || 0),
                    pointsEarned: Number(ref.cpPoints || 0),
                    roomType: ref.roomType?.name || ref.room?.roomType?.name || 'Standard Room',
                    createdBy: ref.createdBy || 'Direct System',
                }));
                setBookings(mappedData);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const stats = useMemo(() => {
        const total = bookings.length;
        const revenue = bookings.reduce((sum, b) => sum + b.rawAmount, 0);
        const commission = bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
        const confirmed = bookings.filter(b => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status)).length;

        return { total, revenue, commission, confirmed };
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        setCurrentPage(1);
        return bookings.filter(b => {
            const matchesSearch = b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.property.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [bookings, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleDownloadInvoice = async (booking: Booking, type: 'GUEST' | 'PARTNER') => {
        const key = `${booking.id}-${type}`;
        setIsDownloading(prev => ({ ...prev, [key]: true }));
        try {
            const apiType = type === 'GUEST' ? 'guest' : 'agency';
            const response = await api.get(`/bookings/invoice/${booking.id}/${apiType}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `${type === 'PARTNER' ? 'Agency' : 'Guest'}_Invoice_${booking.bookingNumber || 'Booking'}.pdf`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Failed to generate PDF.');
        } finally {
            setIsDownloading(prev => ({ ...prev, [key]: false }));
        }
    };

    const openDetails = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsDrawerOpen(true);
    };

    // Expose handleDownloadInvoice to window for the modal's download buttons
    useEffect(() => {
        (window as any).handleDownloadInvoice = handleDownloadInvoice;
        return () => { delete (window as any).handleDownloadInvoice; };
    }, []);

    const columns = [
        {
            header: 'Guest & ID',
            accessor: (item: Booking) => (
                <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.guestName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary-teal)', fontWeight: 800 }}>#{item.bookingNumber}</p>
                </div>
            )
        },
        {
            header: 'Property / Room',
            accessor: (item: Booking) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <MapPin size={14} color="var(--primary-teal)" />
                        <span style={{ fontWeight: 600 }}>{item.property}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '1.25rem' }}>{item.roomType}</p>
                </div>
            )
        },
        {
            header: 'Stay Period',
            accessor: (item: Booking) => (
                <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={14} color="var(--text-dim)" />
                        <span>{item.checkIn} — {item.checkOut}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: (item: Booking) => {
                const isCompleted = item.status === 'CHECKED_OUT' || item.status === 'CONFIRMED' || item.status === 'CHECKED_IN';
                const isPending = item.status === 'PENDING_PAYMENT';
                const isCancelled = item.status === 'CANCELLED' || item.status === 'NO_SHOW' || item.status === 'REFUNDED';

                return (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.2)' : isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                        {isCompleted && <BadgeCheck size={14} color="#10b981" />}
                        {isPending && <Clock size={14} color="#d97706" />}
                        {isCancelled && <XCircle size={14} color="#ef4444" />}
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: isCompleted ? '#10b981' : isPending ? '#d97706' : '#ef4444',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {item.status.replace('_', ' ')}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Commission',
            accessor: (item: Booking) => (
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, color: '#10b981' }}>+{formatPrice(item.commissionAmount || 0, 'INR')}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{item.amount} total</p>
                </div>
            )
        },
        {
            header: 'Actions',
            accessor: (item: Booking) => (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => openDetails(item)}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'var(--primary-teal)', cursor: 'pointer' }}
                        title="View Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        disabled={isDownloading[`${item.id}-GUEST`]}
                        onClick={() => handleDownloadInvoice(item, 'GUEST')}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer' }}
                        title="Download Guest Invoice"
                    >
                        {isDownloading[`${item.id}-GUEST`] ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    </button>
                    <button
                        disabled={isDownloading[`${item.id}-PARTNER`]}
                        onClick={() => handleDownloadInvoice(item, 'PARTNER')}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer' }}
                        title="Download Agency Invoice"
                    >
                        {isDownloading[`${item.id}-PARTNER`] ? <Loader2 size={16} className="animate-spin" /> : <Briefcase size={16} />}
                    </button>
                </div>
            ),
            align: 'center' as const
        }
    ];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-teal)" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-padding)', width: '100%' }}>

            {/* Page Header */}
            <div>
                <h1 className="text-premium-gradient" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Bookings Portfolio</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 'clamp(0.9rem, 3vw, 1.1rem)' }}>Manage and track your referred luxury stay reservations.</p>
            </div>

            {/* Stats Summary Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-pane" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20,184,166,0.1)', color: 'var(--primary-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Referrals</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{stats.total}</h3>
                    </div>
                </div>
                <div className="glass-pane" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Revenue</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{formatPrice(stats.revenue, 'INR')}</h3>
                    </div>
                </div>
                <div className="glass-pane" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Earned Commission</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{formatPrice(stats.commission, 'INR')}</h3>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search by Guest, Property or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.85rem 1rem 0.85rem 2.8rem',
                            borderRadius: '1rem',
                            border: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-main)',
                            outline: 'none',
                            fontSize: '0.9rem',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.3rem', borderRadius: '0.75rem', overflowX: 'auto', maxWidth: '100%' }}>
                    {['ALL', 'CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_OUT'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: statusFilter === status ? 'var(--primary-teal)' : 'transparent',
                                color: statusFilter === status ? '#fff' : 'var(--text-dim)',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {status === 'ALL' ? 'Everything' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bookings Table */}
            <div className="glass-pane" style={{ padding: '1rem', overflow: 'hidden' }}>
                {filteredBookings.length > 0 ? (
                    <>
                        <PremiumTable columns={columns} data={paginatedBookings} />
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredBookings.length}
                            itemsPerPage={PAGE_SIZE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-dim)' }}>
                            <FileText size={32} />
                        </div>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>No Matching Reservations</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>We couldn't find any bookings matching your current filter.</p>
                        <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                            style={{ marginTop: '1.5rem', color: 'var(--primary-teal)', background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            <BookingDetailModal
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                booking={selectedBooking}
            />
        </div>
    );
};

export default Bookings;
