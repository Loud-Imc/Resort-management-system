import React, { useEffect, useState, useMemo, useRef } from 'react';
import PremiumTable from '../components/PremiumTable';
import {
    BadgeCheck, Clock, MapPin, XCircle, Loader2, Eye,
    Search, TrendingUp, Wallet, Briefcase,
    Calendar, Users, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import api from '../services/api';
import BookingDetailModal from '../components/BookingDetailModal';
import { formatPrice } from '../utils/currency';
import type { InvoiceData } from '../utils/generateInvoicePdf';
import CPInvoiceTemplate from '../components/CPInvoiceTemplate';

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
    const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
    const [invoiceCaptureData, setInvoiceCaptureData] = useState<{ data: InvoiceData; type: 'GUEST' | 'PARTNER' } | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);

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
        return bookings.filter(b => {
            const matchesSearch = b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.property.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [bookings, searchQuery, statusFilter]);

    const handleDownloadInvoice = async (booking: Booking, type: 'GUEST' | 'PARTNER') => {
        const key = `${booking.id}-${type}`;
        setIsDownloading(prev => ({ ...prev, [key]: true }));
        try {
            const data: InvoiceData = {
                bookingNumber: booking.bookingNumber,
                guestName: booking.guestName,
                property: booking.property,
                propertyImage: booking.propertyImage,
                city: booking.city,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                nights: booking.nights,
                status: booking.status,
                roomType: booking.roomType,
                adults: booking.adults,
                children: booking.children,
                paymentMethod: booking.paymentMethod,
                baseAmount: booking.baseAmount || 0,
                taxAmount: booking.taxAmount || 0,
                extraAdultAmount: booking.extraAdultAmount || 0,
                extraChildAmount: booking.extraChildAmount || 0,
                offerDiscountAmount: booking.offerDiscountAmount || 0,
                referralDiscountAmount: booking.referralDiscountAmount || 0,
                commissionAmount: Math.round(booking.rawAmount * (booking.commissionRate || 0) / 100),
                commissionRate: booking.commissionRate || 0,
                discountRate: booking.discountRate || 0,
                grossTotal: booking.rawAmount,
                partnerNetPayable: booking.rawAmount - Math.round(booking.rawAmount * (booking.commissionRate || 0) / 100),
            };

            setInvoiceCaptureData({ data, type });
            await new Promise(res => setTimeout(res, 300));

            const element = invoiceRef.current;
            if (!element) throw new Error('Invoice element not mounted');

            const canvas = await toCanvas(element, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            setInvoiceCaptureData(null);
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const temp = new Image();
            temp.src = imgData;
            await new Promise(r => { temp.onload = r; });
            const imgHeight = (temp.height * imgWidth) / temp.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            const fileName = `${type === 'PARTNER' ? 'Agency' : 'Guest'}_Invoice_${booking.bookingNumber || 'Booking'}.pdf`;
            pdf.save(fileName);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {/* Hidden Invoice Template for DOM capture */}
            <div
                ref={invoiceRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: -50,
                    pointerEvents: 'none',
                    opacity: invoiceCaptureData ? 1 : 0,
                }}
            >
                {invoiceCaptureData && (
                    <CPInvoiceTemplate
                        data={invoiceCaptureData.data}
                        type={invoiceCaptureData.type}
                    />
                )}
            </div>

            {/* Page Header */}
            <div>
                <h1 className="text-premium-gradient" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Bookings Portfolio</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>Manage and track your referred luxury stay reservations.</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                            color: '#fff',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '0.75rem' }}>
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
                                transition: 'all 0.2s'
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
                    <PremiumTable columns={columns} data={filteredBookings} />
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
