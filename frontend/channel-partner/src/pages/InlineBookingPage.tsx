import React, { useState, useEffect } from 'react';
import {
    Search, Calendar, Users, ChevronRight, Home, CreditCard,
    Wallet, CheckCircle, Loader2, ArrowLeft, BedDouble, Star
} from 'lucide-react';
import api from '../services/api';

// --- Types ---
interface Property {
    id: string;
    name: string;
    city: string;
    state: string;
    basePrice: number;
    images?: { url: string }[];
}

interface RoomType {
    id: string;
    name: string;
    basePrice: number;     // per-night rate
    totalPrice?: number;   // pre-calculated total from /bookings/search (includes nights, taxes etc)
    maxAdults: number;
    maxChildren: number;
    availableCount?: number;
    images?: { url: string }[];
}

interface CPStats {
    referralCode: string;
    commissionRate: number;
    referralDiscountRate: number;
    walletBalance: number;
}

type PaymentMethod = 'WALLET' | 'ONLINE';
type Step = 1 | 2 | 3;

const InlineBookingPage: React.FC = () => {
    const [step, setStep] = useState<Step>(1);

    // Step 1
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

    // Step 2
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    // Step 3
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE');
    const [cpStats, setCpStats] = useState<CPStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/channel-partners/me/stats').then((s: any) => setCpStats(s));
    }, []);

    // Search properties
    const searchProperties = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res: any = await api.get(`/properties?search=${encodeURIComponent(searchQuery)}&limit=20`);
            setProperties(res.data || res || []);
        } catch (e) {
            setProperties([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Move to step 2 after property selected - fetch ONLY available rooms
    const goToStep2 = async () => {
        if (!selectedProperty || !checkIn || !checkOut) return;
        setIsLoadingRooms(true);
        try {
            // Use the real availability search endpoint — it checks actual room inventory
            const res: any = await api.post('/bookings/search', {
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adults,
                children,
                location: selectedProperty.name, // scope to this property by name
                currency: 'INR',
            });

            // Filter to only show rooms that belong to the selected property
            const all: RoomType[] = res?.availableRoomTypes || [];
            const filtered = all.filter((rt: any) => rt.propertyId === selectedProperty.id);
            setRoomTypes(filtered);
            setStep(2);
        } catch {
            setRoomTypes([]);
            setStep(2);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    // Price calculations
    const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1;
    const baseTotal = (selectedRoom?.basePrice || 0) * nights;
    const discountRate = cpStats?.referralDiscountRate ?? 5;
    const commissionRate = cpStats?.commissionRate ?? 10;
    const discount = Math.round(baseTotal * discountRate / 100);
    const commission = Math.round(baseTotal * commissionRate / 100);
    const afterDiscount = baseTotal - discount; // What customer would pay = what CP pays online
    const afterWallet = afterDiscount - commission; // Wallet payment: deduct commission upfront

    const amountToPay = paymentMethod === 'WALLET' ? afterWallet : afterDiscount;

    // Step 3: Submit booking
    const handleBook = async () => {
        if (!selectedProperty || !selectedRoom || !guestName || !guestEmail) return;
        setIsSubmitting(true);
        setError(null);

        try {
            // Create booking
            // Split the guest name into first/last for the guests array
            const nameParts = guestName.trim().split(' ');
            const firstName = nameParts[0] || guestName;
            const lastName = nameParts.slice(1).join(' ') || '-';

            const bookingRes: any = await api.post('/bookings', {
                roomTypeId: selectedRoom.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                guests: [
                    {
                        firstName,
                        lastName,
                        email: guestEmail,
                        phone: guestPhone || undefined,
                    },
                ],
                guestName,
                guestEmail,
                guestPhone: guestPhone || undefined,
                referralCode: cpStats?.referralCode,
                paymentMethod,
                currency: 'INR',
            });

            if (paymentMethod === 'ONLINE') {
                // Open Razorpay for online payment
                const orderRes: any = await api.post('/payments/public/initiate', { bookingId: bookingRes.id });

                const options = {
                    key: orderRes.keyId,
                    amount: orderRes.amount,
                    currency: orderRes.currency,
                    name: selectedProperty.name,
                    description: `Booking for ${guestName}`,
                    order_id: orderRes.orderId,
                    handler: async (response: any) => {
                        try {
                            await api.post('/payments/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            });
                            setBooking(bookingRes);
                            setStep(3);
                        } catch {
                            setError('Payment verification failed. Please contact support.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                    modal: {
                        ondismiss: () => setIsSubmitting(false),
                    },
                    prefill: {
                        name: guestName,
                        email: guestEmail,
                        contact: guestPhone,
                    },
                    theme: { color: '#08474e' },
                };

                const razorpay = new (window as any).Razorpay(options);
                razorpay.open();
            } else {
                // Wallet payment is handled server-side in BookingsService
                setBooking(bookingRes);
                setStep(3);
                setIsSubmitting(false);
            }
        } catch (e: any) {
            setError(e?.message || 'Booking failed. Please try again.');
            setIsSubmitting(false);
        }
    };

    // ======================== RENDER ========================
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {step > 1 && step < 3 && (
                    <button onClick={() => setStep((s) => (s - 1) as Step)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Book a Stay</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Book a property for your guest — discount applied automatically.</p>
                </div>
            </div>

            {/* Step Indicator */}
            {step < 3 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {(['Search', 'Details', 'Payment'] as const).map((label, i) => {
                        const num = i + 1;
                        const isActive = step === num;
                        const isDone = step > num;
                        return (
                            <React.Fragment key={label}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
                                        background: isActive ? 'var(--primary-teal)' : isDone ? '#10b981' : 'var(--border-glass)',
                                        color: isActive || isDone ? '#fff' : 'var(--text-dim)',
                                    }}>
                                        {isDone ? '✓' : num}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--primary-teal)' : 'var(--text-dim)' }}>{label}</span>
                                </div>
                                {i < 2 && <ChevronRight size={14} color="var(--text-dim)" />}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {/* ===== STEP 1: SEARCH ===== */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Find a Property</h3>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    placeholder="Search by property name or city..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchProperties()}
                                    style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button
                                onClick={searchProperties}
                                disabled={isSearching}
                                style={{ padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)', color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                            >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Search
                            </button>
                        </div>

                        {/* Property Results */}
                        {properties.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {properties.map((p: Property) => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedProperty(p)}
                                        style={{
                                            padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s',
                                            border: selectedProperty?.id === p.id ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                            background: selectedProperty?.id === p.id ? 'rgba(8,71,78,0.08)' : 'rgba(255,255,255,0.5)',
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                        }}
                                    >
                                        <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                            <Home size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 700 }}>{p.name}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{p.city}, {p.state}</p>
                                        </div>
                                        {selectedProperty?.id === p.id && <CheckCircle size={20} color="var(--primary-teal)" />}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Dates + Guests */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)' }}>
                                    <Calendar size={14} /> Check-In
                                </label>
                                <input
                                    type="date"
                                    value={checkIn}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)' }}>
                                    <Calendar size={14} /> Check-Out
                                </label>
                                <input
                                    type="date"
                                    value={checkOut}
                                    min={checkIn || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)' }}>
                                    <Users size={14} /> Adults
                                </label>
                                <input type="number" min={1} max={10} value={adults} onChange={(e) => setAdults(Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)', display: 'block' }}>Children</label>
                                <input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        <button
                            onClick={goToStep2}
                            disabled={!selectedProperty || !checkIn || !checkOut || isLoadingRooms}
                            style={{
                                width: '100%', padding: '1rem',
                                background: (!selectedProperty || !checkIn || !checkOut) ? 'rgba(8,71,78,0.3)' : 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none',
                                cursor: (!selectedProperty || !checkIn || !checkOut) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem',
                            }}
                        >
                            {isLoadingRooms ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                            {isLoadingRooms ? 'Loading Rooms...' : 'View Available Rooms'}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: ROOM SELECTION + GUEST DETAILS ===== */}
            {step === 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
                    {/* Room List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontWeight: 700 }}>Select a Room</h3>
                        {roomTypes.length === 0 && (
                            <div className="glass-pane" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>No available rooms for those dates.</div>
                        )}
                        {roomTypes.map((rt) => {
                            // Prefer totalPrice from search (already accounts for nights/taxes)
                            // Fall back to basePrice * nights if not available
                            const roomBase = rt.totalPrice ?? (rt.basePrice * nights);
                            const roomDiscount = Math.round(roomBase * discountRate / 100);
                            const roomCommission = Math.round(roomBase * commissionRate / 100);
                            const roomAfterDiscount = roomBase - roomDiscount;
                            const roomWallet = roomAfterDiscount - roomCommission;

                            return (
                                <div
                                    key={rt.id}
                                    onClick={() => setSelectedRoom(rt)}
                                    className="glass-pane"
                                    style={{
                                        padding: '1.5rem', cursor: 'pointer',
                                        border: selectedRoom?.id === rt.id ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                        background: selectedRoom?.id === rt.id ? 'rgba(8,71,78,0.06)' : undefined,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)' }}>
                                                <BedDouble size={22} />
                                            </div>
                                            <div>
                                                <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{rt.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Up to {rt.maxAdults} adults{rt.maxChildren > 0 ? ` + ${rt.maxChildren} children` : ''}</p>
                                            </div>
                                        </div>
                                        {selectedRoom?.id === rt.id && <CheckCircle size={20} color="var(--primary-teal)" />}
                                    </div>

                                    <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-sm)' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Base ({nights}n)</p>
                                            <p style={{ fontSize: '0.95rem', fontWeight: 700, textDecoration: 'line-through', color: 'var(--text-dim)' }}>₹{roomBase.toLocaleString()}</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <p style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Online Pay</p>
                                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>₹{roomAfterDiscount.toLocaleString()}</p>
                                            <p style={{ fontSize: '0.65rem', color: '#10b981' }}>({discountRate}% off)</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                            <p style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Wallet Pay</p>
                                            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d97706' }}>₹{roomWallet.toLocaleString()}</p>
                                            <p style={{ fontSize: '0.65rem', color: '#d97706' }}>({discountRate + commissionRate}% off)</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Guest Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-pane" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>Guest Details</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem' }}>Full Name *</label>
                                    <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Ravi Kumar" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem' }}>Email *</label>
                                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="guest@email.com" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem' }}>Phone</label>
                                    <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedRoom || !guestName || !guestEmail}
                                style={{
                                    width: '100%', marginTop: '1.5rem', padding: '0.9rem',
                                    background: (!selectedRoom || !guestName || !guestEmail) ? 'rgba(8,71,78,0.3)' : 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                    color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none',
                                    cursor: (!selectedRoom || !guestName || !guestEmail) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                }}
                            >
                                <ChevronRight size={18} /> Continue to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== STEP 3: PAYMENT ===== */}
            {step === 3 && !booking && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
                    {/* Payment Method */}
                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Choose Payment Method</h3>

                        {/* Wallet Option */}
                        <div
                            onClick={() => setPaymentMethod('WALLET')}
                            style={{
                                padding: '1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: '1rem', transition: 'all 0.2s',
                                border: paymentMethod === 'WALLET' ? '2px solid #d97706' : '1px solid var(--border-glass)',
                                background: paymentMethod === 'WALLET' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.5)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700 }}>Pay via Wallet</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Commission ({commissionRate}%) deducted immediately. Balance: ₹{(cpStats?.walletBalance ?? 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>₹{afterWallet.toLocaleString()}</div>
                            </div>
                            {paymentMethod === 'WALLET' && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#d97706' }}>
                                    <Star size={12} style={{ display: 'inline', marginRight: '0.3rem' }} />
                                    You save ₹{(discount + commission).toLocaleString()} ({discountRate + commissionRate}% off). Commission reflected instantly.
                                </div>
                            )}
                        </div>

                        {/* Online Option */}
                        <div
                            onClick={() => setPaymentMethod('ONLINE')}
                            style={{
                                padding: '1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s',
                                border: paymentMethod === 'ONLINE' ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                background: paymentMethod === 'ONLINE' ? 'rgba(8,71,78,0.06)' : 'rgba(255,255,255,0.5)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)' }}>
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700 }}>Pay Online (Razorpay)</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Commission ({commissionRate}%) credited after guest check-in.</p>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-teal)' }}>₹{afterDiscount.toLocaleString()}</div>
                            </div>
                        </div>

                        <button
                            onClick={handleBook}
                            disabled={isSubmitting || (paymentMethod === 'WALLET' && (cpStats?.walletBalance ?? 0) < afterWallet)}
                            style={{
                                width: '100%', marginTop: '1.5rem', padding: '1rem',
                                background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none',
                                cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem',
                            }}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            {isSubmitting ? 'Processing...' : `Confirm Booking — ₹${amountToPay.toLocaleString()}`}
                        </button>

                        {paymentMethod === 'WALLET' && (cpStats?.walletBalance ?? 0) < afterWallet && (
                            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                Insufficient wallet balance. Please top up first.
                            </p>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="glass-pane" style={{ padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>Order Summary</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>{selectedProperty?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>{selectedRoom?.name} × {nights} night{nights > 1 ? 's' : ''}</span>
                                    <span style={{ fontWeight: 600 }}>₹{baseTotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                    <span>Guest Discount ({discountRate}%)</span>
                                    <span>-₹{discount.toLocaleString()}</span>
                                </div>
                                {paymentMethod === 'WALLET' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                                        <span>Commission ({commissionRate}%)</span>
                                        <span>-₹{commission.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                                    <span>You Pay</span>
                                    <span className="text-premium-gradient">₹{amountToPay.toLocaleString()}</span>
                                </div>
                                {paymentMethod === 'ONLINE' && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '0.5rem', background: 'rgba(8,71,78,0.04)', borderRadius: 'var(--radius-sm)' }}>
                                        Commission of ₹{commission.toLocaleString()} will be credited to your wallet after the guest checks in.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-pane" style={{ padding: '1.25rem', fontSize: '0.85rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Guest</p>
                            <p>{guestName}</p>
                            <p style={{ color: 'var(--text-dim)' }}>{guestEmail}</p>
                            {guestPhone && <p style={{ color: 'var(--text-dim)' }}>{guestPhone}</p>}
                            <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                                <p style={{ color: 'var(--text-dim)' }}>Check-In: <strong>{new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                                <p style={{ color: 'var(--text-dim)' }}>Check-Out: <strong>{new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CONFIRMATION ===== */}
            {booking && step === 3 && (
                <div className="glass-pane" style={{ padding: '3rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>
                    <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.8rem', color: '#10b981' }}>Booking Confirmed!</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>Booking Number: <strong>{booking.bookingNumber}</strong></p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        A confirmation email has been sent to {guestEmail}.
                        {paymentMethod === 'ONLINE' ? ` Your ₹${commission.toLocaleString()} commission will be credited after check-in.` : ` Your commission of ₹${commission.toLocaleString()} has been reflected in your wallet.`}
                    </p>
                    <button
                        onClick={() => {
                            setStep(1);
                            setBooking(null);
                            setSelectedProperty(null);
                            setSelectedRoom(null);
                            setGuestName('');
                            setGuestEmail('');
                            setGuestPhone('');
                            setCheckIn('');
                            setCheckOut('');
                            setProperties([]);
                            setRoomTypes([]);
                            setError(null);
                        }}
                        style={{ padding: '0.9rem 2rem', background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)', color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                    >
                        Book Another
                    </button>
                </div>
            )}
        </div>
    );
};

export default InlineBookingPage;
