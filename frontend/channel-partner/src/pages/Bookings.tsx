import React, { useEffect, useState } from 'react';
import PremiumTable from '../components/PremiumTable';
import { BadgeCheck, Clock, MapPin, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Booking {
    id: string;
    guestName: string;
    property: string;
    checkIn: string;
    checkOut: string;
    status: string;
    amount: string;
}

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response: any = await api.get('/channel-partners/me');
                const mappedData = response.referrals.map((ref: any) => ({
                    id: ref.id,
                    guestName: ref.user ? `${ref.user.firstName} ${ref.user.lastName}` : 'Guest',
                    property: ref.property?.name || 'N/A',
                    checkIn: new Date(ref.checkInDate).toLocaleDateString(),
                    checkOut: new Date(ref.checkOutDate).toLocaleDateString(),
                    status: ref.status,
                    amount: `₹${Number(ref.totalAmount || 0).toLocaleString()}`,
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

    const columns = [
        { header: 'Guest Name', accessor: 'guestName' as keyof Booking },
        {
            header: 'Property',
            accessor: (item: Booking) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--text-dim)" />
                    <span>{item.property}</span>
                </div>
            )
        },
        {
            header: 'Stay Dates',
            accessor: (item: Booking) => (
                <div style={{ fontSize: '0.85rem' }}>
                    <p>{item.checkIn}</p>
                    <p style={{ color: 'var(--text-dim)' }}>to {item.checkOut}</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isCompleted && <BadgeCheck size={16} color="#10b981" />}
                        {isPending && <Clock size={16} color="#6366f1" />}
                        {isCancelled && <XCircle size={16} color="#ef4444" />}
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: isCompleted ? '#10b981' : isPending ? '#6366f1' : '#ef4444',
                            textTransform: 'capitalize'
                        }}>
                            {item.status.toLowerCase().replace('_', ' ')}
                        </span>
                    </div>
                );
            }
        },
        { header: 'Total Amount', accessor: 'amount' as keyof Booking, align: 'right' as const },
    ];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-gold)" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Bookings Tracking</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Monitor the stays of guests you've referred to our properties.</p>
                </div>
            </div>

            <div className="glass-pane" style={{ padding: '2rem' }}>
                {bookings.length > 0 ? (
                    <PremiumTable columns={columns} data={bookings} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                        <p>No bookings found yet.</p>
                        <p style={{ fontSize: '0.9rem' }}>When your referred guests book a stay, they will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bookings;
