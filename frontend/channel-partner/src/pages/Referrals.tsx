import React, { useEffect, useState, useMemo } from 'react';
import PremiumTable from '../components/PremiumTable';
import PaginationControls from '../components/PaginationControls';
import { BadgeCheck, Clock, XCircle, Eye, Search } from 'lucide-react';
import api from '../services/api';
import BookingDetailModal from '../components/BookingDetailModal';

interface Referral {
    id: string;
    bookingNumber?: string;
    guestName: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING_PAYMENT';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'FULL';
    date: string;
    checkIn: string;
    checkOut: string;
    property: string;
    commission: string;
    commissionAmount: number;
    paidAmount: number;
    totalAmount: number;
    points: number;
    isGroupBooking: boolean;
    groupSize?: number;
    roomType?: string;
}

const Referrals: React.FC = () => {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Referral | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const response: any = await api.get('/channel-partners/me');
                const mappedData = response.referrals.map((ref: any) => ({
                    id: ref.id,
                    bookingNumber: ref.bookingNumber,
                    guestName: ref.user ? `${ref.user.firstName} ${ref.user.lastName}` : 'Guest',
                    status: ref.status,
                    paymentStatus: ref.paymentStatus,
                    paidAmount: Number(ref.paidAmount || 0),
                    totalAmount: Number(ref.totalAmount || 0),
                    date: new Date(ref.createdAt).toLocaleDateString(),
                    checkIn: new Date(ref.checkInDate).toLocaleDateString(),
                    checkOut: new Date(ref.checkOutDate).toLocaleDateString(),
                    property: ref.property?.name || 'N/A',
                    commission: `₹${Number(ref.cpCommission || 0).toLocaleString()}`,
                    commissionAmount: Number(ref.cpCommission || 0),
                    points: Number(ref.cpPoints || 0),
                    isGroupBooking: ref.isGroupBooking || false,
                    groupSize: ref.groupSize,
                    roomType: ref.roomType?.name || ref.room?.roomType?.name || 'Standard Room',
                }));
                setReferrals(mappedData);
            } catch (error) {
                console.error('Error fetching referrals:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReferrals();
    }, []);

    const openDetails = (referral: Referral) => {
        setSelectedBooking(referral);
        setIsDrawerOpen(true);
    };

    const filteredReferrals = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return referrals.filter(r =>
            r.guestName.toLowerCase().includes(q) ||
            r.property.toLowerCase().includes(q) ||
            (r.bookingNumber?.toLowerCase().includes(q) ?? false)
        );
    }, [referrals, searchQuery]);

    const totalPages = Math.ceil(filteredReferrals.length / PAGE_SIZE);
    const paginatedReferrals = filteredReferrals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const columns = [
        {
            header: 'Guest Name',
            accessor: (item: Referral) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{item.guestName}</span>
                    {item.isGroupBooking && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-teal)', fontWeight: 700 }}>
                            Group Booking ({item.groupSize} people)
                        </span>
                    )}
                </div>
            )
        },
        { header: 'Date', accessor: 'date' as keyof Referral },
        {
            header: 'Booking Status',
            accessor: (item: Referral) => {
                const isCompleted = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(item.status);
                const isPending = ['PENDING', 'PENDING_PAYMENT'].includes(item.status);
                const isCancelled = item.status === 'CANCELLED';

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isCompleted && <BadgeCheck size={16} color="#10b981" />}
                        {isPending && <Clock size={16} color="#d97706" />}
                        {isCancelled && <XCircle size={16} color="#ef4444" />}
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: isCompleted ? '#10b981' : isPending ? '#d97706' : '#ef4444',
                            textTransform: 'capitalize'
                        }}>
                            {item.status.toLowerCase().replace('_', ' ')}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Payment Status',
            accessor: (item: Referral) => {
                const isFull = item.paymentStatus === 'FULL';
                const isPartial = item.paymentStatus === 'PARTIAL';

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isFull ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444'
                            }} />
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: isFull ? '#059669' : isPartial ? '#d97706' : '#dc2626'
                            }}>
                                {item.paymentStatus}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            ₹{item.paidAmount.toLocaleString()} / ₹{item.totalAmount.toLocaleString()}
                        </div>
                        {isPartial && (
                            <div style={{
                                width: '100%',
                                height: '4px',
                                background: '#e2e8f0',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(item.paidAmount / item.totalAmount) * 100}%`,
                                    height: '100%',
                                    background: '#f59e0b'
                                }} />
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Commission',
            accessor: (item: Referral) => (
                <span style={{ fontWeight: 600, color: 'var(--primary-teal)' }}>{item.commission}</span>
            )
        },

        { header: 'Points', accessor: 'points' as keyof Referral, align: 'center' as const },
        {
            header: 'Actions',
            accessor: (item: Referral) => (
                <button
                    onClick={() => openDetails(item)}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'white',
                        color: 'var(--primary-teal)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                    }}
                    className="hover-scale"
                    title="Explore Details"
                >
                    <Eye size={18} />
                </button>
            ),
            align: 'right' as const
        }
    ];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ color: 'var(--primary-teal)' }}>Loading referrals...</div>
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-padding)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, lineHeight: 1.2 }}>Your Referrals</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Track the progress of your shared links and commissions.</p>
                </div>
                {/* Search */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                    <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Search guest, property or booking ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.6rem',
                            borderRadius: '0.875rem', border: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                            outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            <div className="glass-pane" style={{ padding: 'var(--section-padding)' }}>
                {filteredReferrals.length > 0 ? (
                    <>
                        <PremiumTable columns={columns} data={paginatedReferrals} />
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredReferrals.length}
                            itemsPerPage={PAGE_SIZE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                        <p>{searchQuery ? 'No referrals match your search.' : 'No referrals found yet.'}</p>
                        <p style={{ fontSize: '0.9rem' }}>{!searchQuery && 'Share your code from the dashboard to get started!'}</p>
                    </div>
                )}
            </div>

            <BookingDetailModal
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                booking={selectedBooking ? {
                    ...selectedBooking,
                    amount: `₹${selectedBooking.totalAmount.toLocaleString()}`,
                    commissionAmount: selectedBooking.commissionAmount,
                    pointsEarned: selectedBooking.points,
                } : null}
            />
        </div>
    );
};

export default Referrals;
