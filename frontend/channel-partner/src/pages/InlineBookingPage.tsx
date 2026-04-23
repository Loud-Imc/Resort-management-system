import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Calendar, Users, ChevronRight, CreditCard,
    Wallet, CheckCircle, Loader2, ArrowLeft, Star,
    FileText, Download, Eye, Mail, MessageSquare, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import api from '../services/api';
import { formatPrice } from '../utils/currency';
import type { InvoiceData } from '../utils/generateInvoicePdf';
import CPInvoiceTemplate from '../components/CPInvoiceTemplate';
import LocationAutocomplete from '../components/LocationAutocomplete';
import BookingResultsGrid from '../components/booking/BookingResultsGrid';
import RoomSelectionCard from '../components/booking/RoomSelectionCard';

// --- Types ---
export interface Property {
    id: string;
    name: string;
    city: string;
    state: string;
    type: 'RESORT' | 'HOMESTAY' | 'HOTEL' | 'VILLA' | 'OTHER';
    basePrice: number;
    groupPricePerHead?: number;
    groupPriceAdult?: number;
    currency: string;
    images?: (string | { url: string })[];
    coverImage?: string;
    isVerified?: boolean;
    rating?: number;
    reviewCount?: number;
    _count?: {
        rooms: number;
    };
}

export interface RoomType {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    totalPrice?: number;
    originalPrice?: number;
    maxAdults: number;
    maxChildren: number;
    size?: number;
    images?: (string | { url: string })[];
    amenities?: string[];
    availableCount?: number;
    isSoldOut?: boolean;
    offerName?: string;
    offerDiscountAmount?: number;
    isGstInclusive?: boolean;
    marketingBadgeText?: string;
    marketingBadgeType?: 'POSITIVE' | 'WARNING' | 'NEGATIVE' | 'URGENT';
}

interface CPStats {
    id: string;
    referralCode: string;
    commissionRate: number;
    referralDiscountRate: number;
    walletBalance: number;
    loyaltySettings: {
        pointsPerUnit: number;
        unitAmount: number;
    };
}

type PaymentMethod = 'WALLET' | 'ONLINE';
type Step = 1 | 2 | 3;

const InlineBookingPage: React.FC = () => {
    const [step, setStep] = useState<Step>(1);

    // Step 1
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
    const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [isGroupBooking, setIsGroupBooking] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Step 2 Rooms
    const [availableRoomsMap, setAvailableRoomsMap] = useState<Record<string, RoomType[]>>({});
    const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
    const [guests, setGuests] = useState<{ firstName: string; lastName: string; email?: string; phone?: string; idType?: string; idNumber?: string; idImage?: string }[]>([]);

    // Server-side pricing
    const [pricing, setPricing] = useState<any>(null);
    const [isPricingLoading, setIsPricingLoading] = useState(false);

    // Step 3
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE');
    const [cpStats, setCpStats] = useState<CPStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // PDF & Send States
    const [showPreview, setShowPreview] = useState(false);
    const [previewType, setPreviewType] = useState<'GUEST' | 'PARTNER'>('GUEST');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSending, setIsSending] = useState<{ [key: string]: boolean }>({});
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);
    const [invoiceCaptureData, setInvoiceCaptureData] = useState<{ data: InvoiceData; type: 'GUEST' | 'PARTNER' } | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get('/channel-partners/me/stats').then((s: any) => setCpStats(s));
    }, []);

    // Initialize guest with at least one entry
    useEffect(() => {
        if (guests.length === 0) {
            setGuests([{ firstName: '', lastName: '', email: '', phone: '', idType: '', idNumber: '' }]);
        }
    }, [guests.length]);

    const handleAddGuest = () => {
        const totalMax = (adults + children);
        if (guests.length < totalMax) {
            setGuests(prev => [...prev, { firstName: '', lastName: '', email: '', phone: '', idType: '', idNumber: '' }]);
        } else {
            setError(`You have already added guest details for all ${totalMax} occupants.`);
        }
    };

    const handleRemoveGuest = (index: number) => {
        if (guests.length > 1) {
            setGuests(prev => prev.filter((_, i) => i !== index));
        }
    };

    const getBookingInvoiceData = (): InvoiceData => {
        // Use pricing from state if available (most accurate breakdown), fallback to booking response
        const p = pricing || booking;
        const total = Number(p?.totalAmount || serverTotal || 0);
        const comm = Math.round(total * commissionRate / 100);

        return {
            bookingNumber: booking?.bookingNumber || p?.bookingId,
            guestName: guests[0] ? `${guests[0].firstName} ${guests[0].lastName}`.trim() : 'Guest',
            property: selectedProperty?.name || booking?.property?.name || 'N/A',
            propertyImage: selectedProperty?.images?.[0] || booking?.property?.images?.[0] || booking?.room?.property?.images?.[0],
            city: `${selectedProperty?.city || booking?.property?.city || ''}`,
            checkIn: checkIn ? new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            checkOut: checkOut ? new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            nights,
            adults,
            children,
            status: booking?.status || 'CONFIRMED',
            roomType: selectedRoom?.name || booking?.roomType?.name || booking?.room?.roomType?.name,
            paymentMethod,
            baseAmount: Number(p?.baseAmount || total),
            taxAmount: Number(p?.taxAmount || 0),
            extraAdultAmount: Number(p?.extraAdultAmount || 0),
            extraChildAmount: Number(p?.extraChildAmount || 0),
            offerDiscountAmount: Number(p?.offerDiscountAmount || 0),
            referralDiscountAmount: Number(p?.cpDiscount || p?.referralDiscountAmount || 0),
            commissionAmount: comm,
            commissionRate,
            discountRate,
            grossTotal: total,
            partnerNetPayable: total - comm,
        };
    };

    const captureInvoice = async (type: 'GUEST' | 'PARTNER'): Promise<string> => {
        // Mount template in hidden div, then capture
        const data = getBookingInvoiceData();
        setInvoiceCaptureData({ data, type });

        // Wait for the DOM update
        await new Promise(res => setTimeout(res, 300));

        const element = invoiceRef.current;
        if (!element) throw new Error('Invoice element not mounted');

        const canvas = await toCanvas(element, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
        });

        setInvoiceCaptureData(null); // hide after capture
        return canvas.toDataURL('image/png');
    };

    const handlePreviewInvoice = async (type: 'GUEST' | 'PARTNER') => {
        if (!booking?.id) return;
        setPreviewType(type);
        setShowPreview(true);
        setPreviewUrl(null);

        try {
            const imgData = await captureInvoice(type);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const temp = new Image();
            temp.src = imgData;
            await new Promise(r => { temp.onload = r; });
            const imgHeight = (temp.height * imgWidth) / temp.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            const blob = pdf.output('blob');
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (err) {
            console.error('Preview generation failed:', err);
            setError('Failed to generate preview.');
            setShowPreview(false);
        }
    };

    const handleDownloadInvoice = async (type: 'GUEST' | 'PARTNER') => {
        if (!booking?.id) return;
        try {
            const imgData = await captureInvoice(type);
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
            console.error('Failed to download invoice:', err);
            setError('Failed to download invoice.');
        }
    };

    const handleSendInvoice = async (type: 'GUEST' | 'PARTNER', method: 'EMAIL' | 'WHATSAPP') => {
        if (!booking?.id) return;
        const key = `${type}-${method}`;
        setIsSending(prev => ({ ...prev, [key]: true }));

        try {
            // 1. Always generate & download the PDF first so they can attach it
            await handleDownloadInvoice(type);

            const guestName = guests[0] ? `${guests[0].firstName} ${guests[0].lastName}`.trim() : 'Guest';
            const guestEmail = guests[0]?.email || '';
            const guestPhone = (guests[0]?.phone || '').replace(/\D/g, '');
            const propertyName = selectedProperty?.name || 'the property';
            const bookingRef = booking?.bookingNumber || booking?.id;
            const dates = `${checkIn} → ${checkOut}`;

            const message =
                `Hello ${guestName},\n\n` +
                `Your booking at *${propertyName}* is confirmed! 🎉\n\n` +
                `📋 *Booking Reference:* ${bookingRef}\n` +
                `📅 *Dates:* ${dates}\n` +
                `🛏 *Room:* ${selectedRoom?.name || 'N/A'}\n\n` +
                `The invoice PDF has been downloaded — please find it attached.\n\n` +
                `Thank you for choosing us!`;

            if (method === 'WHATSAPP') {
                const encoded = encodeURIComponent(message);
                const waUrl = guestPhone
                    ? `https://wa.me/${guestPhone}?text=${encoded}`
                    : `https://wa.me/?text=${encoded}`;
                window.open(waUrl, '_blank');
            } else {
                const subject = encodeURIComponent(`Booking Confirmation – ${bookingRef} | ${propertyName}`);
                const body = encodeURIComponent(message);
                const mailUrl = guestEmail
                    ? `mailto:${guestEmail}?subject=${subject}&body=${body}`
                    : `mailto:?subject=${subject}&body=${body}`;
                window.open(mailUrl, '_blank');
            }

            setSendSuccess(`Invoice downloaded and ${method === 'WHATSAPP' ? 'WhatsApp' : 'Email'} opened. Please attach the PDF before sending!`);
            setTimeout(() => setSendSuccess(null), 6000);
        } catch (err) {
            console.error('Failed to send invoice:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsSending(prev => ({ ...prev, [key]: false }));
        }
    };

    // Search properties with availability
    const performSearch = async () => {
        if (!checkIn || !checkOut) {
            setError('Please select check-in and check-out dates');
            return;
        }
        setError(null);
        setIsSearching(true);
        try {
            const res: any = await api.post('/bookings/search', {
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adults: adults,
                children: children,
                location: searchQuery.trim() || undefined,
                isGroupBooking,
                groupSize: isGroupBooking ? (adults + children) : undefined,
                currency: 'INR',
            });

            const all: any[] = res?.availableRoomTypes || [];

            // Group rooms by property
            const pMap: Record<string, RoomType[]> = {};
            const props: Property[] = [];
            const propIds = new Set();

            all.forEach((rt: any) => {
                if (!pMap[rt.propertyId]) pMap[rt.propertyId] = [];
                pMap[rt.propertyId].push(rt);

                if (!propIds.has(rt.propertyId)) {
                    props.push(rt.property);
                    propIds.add(rt.propertyId);
                }
            });

            setAvailableRoomsMap(pMap);
            setProperties(props);

            if (props.length === 0) {
                setError('No properties available for these dates/criteria.');
            } else {
                setStep(2);
                setSelectedProperty(null); // Reset selection
            }
        } catch (e: any) {
            setError(e?.message || 'Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };


    // Price calculations — derived from server-side pricing response
    const nights = pricing?.numberOfNights || (checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1);
    const commissionRate = cpStats?.commissionRate ?? 10;
    const discountRate = cpStats?.referralDiscountRate ?? 5;

    // All amounts from backend when available
    const serverTotal = pricing?.totalAmount || 0;
    const serverBase = pricing?.baseAmount || 0;
    const serverTax = pricing?.taxAmount || 0;
    const serverExtraAdult = pricing?.extraAdultAmount || 0;
    const serverExtraChild = pricing?.extraChildAmount || 0;
    const serverReferralDiscount = pricing?.referralDiscountAmount || 0;
    const serverOfferDiscount = pricing?.offerDiscountAmount || 0;

    const commission = Math.round(serverTotal * commissionRate / 100);
    const afterDiscount = serverTotal; // Total already includes referral discount from backend
    
    /*
    ## Calculation Logic Example

    Based on your requirement, here is exactly how the numbers will be calculated and labeled:

    ### 1. Guest Invoice Example
    | Description | Calculation | Result |
    | :--- | :--- | :--- |
    | Accommodation – Standard Room (1 night) : | Base Price | **₹6,000** |
    | Government Tax & GST : | + Tax amount | **₹684** |
    | Partner Network Discount (5%) : | - 5% Discount | **-₹300** |
    | **Grand Total** | **(6000 + 684 - 300)** | **₹6,384** |

    ---

    ### 2. Agency Invoice Example
    | Description | Calculation | Result |
    | :--- | :--- | :--- |
    | Accommodation – Standard Room (1 night) : | Base Price | **₹6,000** |
    | Government Tax & GST : | + Tax amount | **₹684** |
    | Partner Network Discount (5%) : | - 5% Discount | **-₹300** |
    | Instant Agency Commission (10%) : | - 10% of total | **-₹638** |
    | **Net Payable (After Commission)** | **(6384 - 638)** | **₹5,746** |

    > [!IMPORTANT]
    > The Guest Invoice stops at **₹6,384**. The Agency Invoice continues to subtract the commission to show the final **₹5,746** settlement amount.
    */

    const afterWallet = afterDiscount - commission;

    const amountToPay = paymentMethod === 'WALLET' ? afterWallet : afterDiscount;

    // Fetch server-side pricing when a room is selected
    const fetchPricing = async (room: any) => {
        if (!checkIn || !checkOut) return;
        setIsPricingLoading(true);
        try {
            const res: any = await api.post('/bookings/calculate-price', {
                roomTypeId: room.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                referralCode: cpStats?.referralCode,
                currency: selectedProperty?.currency || 'INR',
                isGroupBooking,
                groupSize: isGroupBooking ? (adults + children) : undefined,
            });
            setPricing(res.data || res);
        } catch (e) {
            console.error('Failed to fetch pricing', e);
            setPricing(null);
        } finally {
            setIsPricingLoading(false);
        }
    };

    const handleRoomSelect = (room: any) => {
        setSelectedRoom(room);
        fetchPricing(room);
    };

    // Step 3: Submit booking
    const handleBook = async () => {
        if (!selectedProperty || !selectedRoom) {
            setError('Please complete the selection before booking.');
            return;
        }

        if (guests.length === 0 || !guests[0].firstName || !guests[0].lastName) {
            setError('Primary guest details (First Name and Last Name) are required at minimum.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            const primaryGuest = guests[0];
            const bookingRes: any = await api.post('/bookings', {
                propertyId: selectedProperty.id,
                roomTypeId: selectedRoom.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                isGroupBooking,
                groupSize: isGroupBooking ? (adults + children) : undefined,
                guests: guests.map(g => ({
                    firstName: g.firstName,
                    lastName: g.lastName || '-',
                    email: g.email || undefined,
                    phone: g.phone || undefined,
                    idType: g.idType || undefined,
                    idNumber: g.idNumber || undefined,
                    idImage: g.idImage || undefined,
                })),
                referralCode: cpStats?.referralCode,
                paymentMethod,
                currency: selectedProperty?.currency || 'INR',
            });

            if (paymentMethod === 'ONLINE') {
                const orderRes: any = await api.post('/payments/public/initiate', { bookingId: bookingRes.id });
                const guestFullName = `${primaryGuest.firstName} ${primaryGuest.lastName || ''}`.trim();

                const options = {
                    key: orderRes.keyId,
                    amount: orderRes.amount,
                    currency: orderRes.currency,
                    name: selectedProperty.name,
                    description: `Booking for ${guestFullName}`,
                    order_id: orderRes.orderId,
                    handler: async (response: any) => {
                        try {
                            await api.post('/payments/verify', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            });
                            setBooking(bookingRes);
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
                        name: guestFullName,
                        email: primaryGuest.email,
                        contact: primaryGuest.phone,
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            padding: '1rem'
        }}>
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

            {/* Sticky Header Container */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                padding: '1rem 0 1.5rem 0',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {step > 1 && step < 4 && ( // Fixed condition to handle success state booking object
                        <button onClick={() => {
                            if (booking) {
                                setBooking(null);
                                setStep(1);
                            } else if (step === 2 && selectedProperty) {
                                setSelectedProperty(null);
                            } else {
                                setStep((s) => (s - 1) as Step);
                            }
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Book a Stay</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Book a property for your guest — discount applied automatically.</p>
                    </div>
                </div>

                {/* Step Indicator */}
                {step < 3 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(['Search', 'Selection', 'Payment'] as const).map((label, i) => {
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
                    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' }}>
                        {error}
                    </div>
                )}
            </div>

            {/* ===== STEP 1: SEARCH CRITERIA ===== */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Find a Property</h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)' }}>
                                <Search size={14} /> Location or Property Name
                            </label>
                            <LocationAutocomplete
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSelect={(description) => {
                                    const city = description.split(',')[0];
                                    setSearchQuery(city);
                                }}
                                placeholder="Where are you going?"
                                wrapperStyle={{ width: '100%' }}
                                inputStyle={{
                                    width: '100%', padding: '0.85rem 1rem', border: '1px solid var(--border-glass)',
                                    borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', boxSizing: 'border-box' as const,
                                    fontFamily: 'inherit', fontSize: '0.95rem',
                                }}
                            />
                        </div>

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
                                    <Users size={14} /> Adults (13+)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={adults}
                                    onChange={(e) => setAdults(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-dim)', display: 'block' }}>Children (6-12)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={children}
                                    onChange={(e) => setChildren(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} color="var(--primary-teal)" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Stay Type</span>
                            </div>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsGroupBooking(false)}
                                    style={{
                                        padding: '0.4rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                        background: !isGroupBooking ? '#fff' : 'transparent',
                                        color: !isGroupBooking ? 'var(--primary-teal)' : 'var(--text-dim)',
                                        boxShadow: !isGroupBooking ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                    }}
                                >
                                    Individual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsGroupBooking(true)}
                                    style={{
                                        padding: '0.4rem 1rem', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                        background: isGroupBooking ? '#fff' : 'transparent',
                                        color: isGroupBooking ? 'var(--primary-teal)' : 'var(--text-dim)',
                                        boxShadow: isGroupBooking ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                    }}
                                >
                                    Group
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={performSearch}
                            disabled={isSearching}
                            style={{
                                width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                color: '#fff', fontWeight: 700, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.2rem',
                                boxShadow: '0 4px 15px rgba(8, 71, 78, 0.2)'
                            }}
                        >
                            {isSearching ? <Loader2 size={24} className="animate-spin" /> : <Search size={22} />}
                            Search Availability
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: SELECTION (Properties -> Room Types) ===== */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {!selectedProperty ? (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.25rem' }}>Exclusive Destinations</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Select a property to view available accommodations.</p>
                                </div>
                                <div className="glass-pane" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-teal)', border: '1px solid var(--primary-teal)' }}>
                                    {properties.length} Results Found
                                </div>
                            </div>

                            <BookingResultsGrid
                                properties={properties}
                                isGroupBooking={isGroupBooking}
                                onSelect={(prop) => {
                                    setSelectedProperty(prop);
                                    setStep(2);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-6 duration-500" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div
                                    onClick={() => setSelectedProperty(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--primary-teal)', fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                >
                                    <ArrowLeft size={18} /> Back to Results
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.8rem', lineHeight: 1.2 }}>{selectedProperty.name}</h3>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>{selectedProperty.city}, {selectedProperty.state}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to right, transparent, var(--border-glass), transparent)' }} />
                                    <h4 style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--text-dim)' }}>
                                        {isGroupBooking ? 'Select Your Group Stay Package' : 'Available Accommodations'}
                                    </h4>
                                    <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to right, transparent, var(--border-glass), transparent)' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {(availableRoomsMap[selectedProperty.id] || []).map((rt) => (
                                        <RoomSelectionCard
                                            key={rt.id}
                                            room={rt as any}
                                            onSelect={handleRoomSelect}
                                            isSelected={selectedRoom?.id === rt.id}
                                            nights={nights}
                                            guests={adults + children}
                                            isGroupBooking={isGroupBooking}
                                            currency={selectedProperty.currency}
                                        />
                                    ))}
                                </div>
                            </div>

                            {selectedRoom && (
                                <div className="animate-in slide-in-from-bottom-8 duration-500 sticky bottom-8 z-30">
                                    <div className="glass-pane" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--primary-teal)' }}>
                                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Selected Room</p>
                                                <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{selectedRoom.name}</p>
                                            </div>
                                            <div style={{ height: '30px', width: '1px', background: 'var(--border-glass)' }} />
                                            <div>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Estimated Total</p>
                                                {isPricingLoading ? (
                                                    <Loader2 size={24} className="animate-spin text-teal-400" />
                                                ) : (
                                                    <p style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary-teal)' }}>
                                                        {formatPrice(serverTotal, selectedProperty.currency)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            disabled={isPricingLoading || !pricing}
                                            onClick={() => setStep(3)}
                                            style={{
                                                padding: '1rem 2.5rem',
                                                background: 'var(--primary-teal)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '1rem',
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                cursor: 'pointer',
                                                boxShadow: '0 10px 20px rgba(20, 184, 166, 0.2)',
                                                transition: 'all 0.3s'
                                            }}
                                            className="hover:scale-105 active:scale-95"
                                        >
                                            Continue to Guest Details
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ===== STEP 3: PAYMENT & SUMMARY ===== */}
            {step === 3 && !booking && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '2.5rem', alignItems: 'start' }} className="animate-fade-in">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-pane" style={{ padding: '2.5rem' }}>
                            <h3 style={{ marginBottom: '2rem', fontWeight: 800, fontSize: '1.4rem' }}>Guest Details</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {guests.map((g, idx) => (
                                    <div key={idx} style={{ padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                    {idx + 1}
                                                </div>
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    {idx === 0 ? 'Primary Guest' : `Guest ${idx + 1}`}
                                                </span>
                                            </div>
                                            {idx > 0 && (
                                                <button
                                                    onClick={() => handleRemoveGuest(idx)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>First Name</label>
                                                <input
                                                    type="text"
                                                    value={g.firstName}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].firstName = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    placeholder="First Name"
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Last Name</label>
                                                <input
                                                    type="text"
                                                    value={g.lastName}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].lastName = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    placeholder="Last Name"
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email (Optional)</label>
                                                <input
                                                    type="email"
                                                    value={g.email}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].email = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    placeholder="email@example.com"
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Phone (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={g.phone}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].phone = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    placeholder="Phone Number"
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>ID Type</label>
                                                <select
                                                    value={g.idType || ''}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].idType = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: '#1a1a1a', color: '#fff', outline: 'none' }}
                                                >
                                                    <option value="">None</option>
                                                    <option value="AADHAR">Aadhar</option>
                                                    <option value="PASSPORT">Passport</option>
                                                    <option value="DRIVING_LICENSE">License</option>
                                                    <option value="VOTER_ID">Voter ID</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>ID Number</label>
                                                <input
                                                    type="text"
                                                    value={g.idNumber || ''}
                                                    onChange={(e) => {
                                                        const newGuests = [...guests];
                                                        newGuests[idx].idNumber = e.target.value;
                                                        setGuests(newGuests);
                                                    }}
                                                    placeholder="Identification Number"
                                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {guests.length < (adults + children) && (
                                    <button
                                        onClick={handleAddGuest}
                                        style={{
                                            padding: '1rem',
                                            border: '2px dashed var(--border-glass)',
                                            borderRadius: '1.25rem',
                                            background: 'transparent',
                                            color: 'var(--primary-teal)',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        className="hover:bg-teal-500/5 hover:border-teal-500/40"
                                    >
                                        <Users size={18} />
                                        Add Another Guest Details (Optional)
                                    </button>
                                )}
                            </div>

                            <h3 style={{ marginTop: '3rem', marginBottom: '2rem', fontWeight: 800, fontSize: '1.4rem' }}>Select Payment Strategy</h3>

                            <div
                                onClick={() => setPaymentMethod('WALLET')}
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '1.25rem',
                                    cursor: 'pointer',
                                    marginBottom: '1rem',
                                    transition: 'all 0.3s',
                                    border: paymentMethod === 'WALLET' ? '2px solid #f59e0b' : '1px solid var(--border-glass)',
                                    background: paymentMethod === 'WALLET' ? 'rgba(245,158,11,0.05)' : 'var(--bg-card)',
                                    boxShadow: paymentMethod === 'WALLET' ? '0 10px 20px rgba(245,158,11,0.1)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div style={{ padding: '0.8rem', borderRadius: '1rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                            <Wallet size={24} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Partner Wallet</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                                                Commission deducted upfront. Balance: <span style={{ color: '#d97706', fontWeight: 800 }}>{formatPrice(cpStats?.walletBalance ?? 0, 'INR')}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>{formatPrice(afterWallet, selectedProperty?.currency || 'INR')}</div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800 }}>Net Payable</p>
                                    </div>
                                </div>
                            </div>

                            <div
                                onClick={() => setPaymentMethod('ONLINE')}
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '1.25rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    border: paymentMethod === 'ONLINE' ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                    background: paymentMethod === 'ONLINE' ? 'rgba(8,71,78,0.03)' : 'var(--bg-card)',
                                    boxShadow: paymentMethod === 'ONLINE' ? '0 10px 20px rgba(8,71,78,0.1)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div style={{ padding: '0.8rem', borderRadius: '1rem', background: 'rgba(8,71,78,0.1)', color: 'var(--primary-teal)', border: '1px solid rgba(8,71,78,0.2)' }}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Digital Payment</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Razorpay, Cards, UPI. Commission after check-in.</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-teal)' }}>{formatPrice(afterDiscount, selectedProperty?.currency || 'INR')}</div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800 }}>Total Amount</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleBook}
                                disabled={isSubmitting || (paymentMethod === 'WALLET' && (cpStats?.walletBalance ?? 0) < afterWallet)}
                                style={{
                                    width: '100%', marginTop: '2.5rem', padding: '1.25rem',
                                    background: 'var(--primary-teal)',
                                    color: '#fff', fontWeight: 900, borderRadius: '1.25rem', border: 'none',
                                    cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.2rem',
                                    boxShadow: '0 10px 30px rgba(20, 184, 166, 0.25)',
                                    transition: 'all 0.3s'
                                }}
                                className="hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100"
                            >
                                {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : <CheckCircle size={22} />}
                                {isSubmitting ? 'Finalizing Luxury Stay...' : `Confirm & Pay ${formatPrice(amountToPay, selectedProperty?.currency || 'INR')}`}
                            </button>

                            {paymentMethod === 'WALLET' && (cpStats?.walletBalance ?? 0) < afterWallet && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}>
                                        Insufficient Wallet Balance. Please use Digital Payment.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Loyalty Prediction */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', background: 'rgba(20,184,166,0.05)', borderRadius: '1.5rem', border: '1px dashed rgba(20,184,166,0.3)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'var(--primary-teal)', color: '#fff', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '0 0 0 1rem' }}>
                                Partner Reward
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,184,166,0.1)' }} className="flex items-center justify-center">
                                    <Star size={20} color="var(--primary-teal)" fill="var(--primary-teal)" />
                                </div>
                                <div>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Loyalty Growth</span>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Points credited post-stay verification</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontWeight: 900, color: 'var(--primary-teal)', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                                    +{Math.floor((serverTotal / (cpStats?.loyaltySettings?.unitAmount || 100)) * (cpStats?.loyaltySettings?.pointsPerUnit || 1))} Points
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side summary column - STICKY */}
                    <div style={{ position: 'sticky', top: '160px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-pane" style={{ padding: '1.75rem' }}>
                            <h4 style={{ marginBottom: '1.25rem', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>Investment Summary</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <p style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '1.1rem' }}>{selectedProperty?.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{selectedRoom?.name}</p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)' }}>
                                    <span>Accommodation ({nights} {nights > 1 ? 'nights' : 'night'})</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatPrice(serverBase, selectedProperty?.currency || 'INR')}</span>
                                </div>

                                {(serverExtraAdult > 0 || serverExtraChild > 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)' }}>
                                        <span>Extra Guest Services</span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatPrice(serverExtraAdult + serverExtraChild, selectedProperty?.currency || 'INR')}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)' }}>
                                    <span>Government Tax & GST</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatPrice(serverTax, selectedProperty?.currency || 'INR')}</span>
                                </div>

                                {serverOfferDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 700 }}>
                                        <span>Exclusive Offer Applied</span>
                                        <span>-{formatPrice(serverOfferDiscount, selectedProperty?.currency || 'INR')}</span>
                                    </div>
                                )}

                                {serverReferralDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 700 }}>
                                        <span>Partner Network Discount ({discountRate}%)</span>
                                        <span>-{formatPrice(serverReferralDiscount, selectedProperty?.currency || 'INR')}</span>
                                    </div>
                                )}

                                {paymentMethod === 'WALLET' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 700, padding: '0.5rem 0', borderTop: '1px dashed var(--border-glass)', borderBottom: '1px dashed var(--border-glass)' }}>
                                        <span>Instant Commission ({commissionRate}%)</span>
                                        <span>-{formatPrice(commission, selectedProperty?.currency || 'INR')}</span>
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.75rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Grand Total</p>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-teal)' }}>Net Investment</span>
                                    </div>
                                    <span style={{ fontWeight: 900, fontSize: '1.8rem', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                                        {formatPrice(amountToPay, selectedProperty?.currency || 'INR')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-pane" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h4 style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-dim)' }}>Guest Ledger</h4>
                                <CheckCircle size={14} className="text-teal-500" />
                            </div>
                            <div style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                {guests.map((g, i) => (
                                    <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--border-glass)' }}>
                                        <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{g.firstName} {g.lastName}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{g.email || 'No Email'}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>Stay Period</span>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{checkIn} — {checkOut}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>Occupancy</span>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{adults + children} Guests</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CONFIRMATION HUB ===== */}
            {booking && step === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                    {/* Hero Section */}
                    <div className="glass-pane" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(20,184,166,0.05) 0%, rgba(8,71,78,0.05) 100%)', border: '1px solid rgba(20,184,166,0.2)', marginBottom: '2rem', position: 'relative' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(20,184,166,0.3)' }}>
                            <CheckCircle size={40} color="var(--primary-teal)" />
                        </div>
                        <h2 style={{ fontWeight: 900, marginBottom: '0.5rem', fontSize: '2.5rem', letterSpacing: '-0.03em' }}>Reservation Finalized!</h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Your booking at <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{selectedProperty?.name}</span> is confirmed.</p>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border-glass)' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Booking ID:</span>
                            <span style={{ color: 'var(--primary-teal)', fontWeight: 900, fontSize: '1.2rem' }}>{booking.bookingNumber}</span>
                        </div>
                    </div>

                    {sendSuccess && (
                        <div className="animate-in slide-in-from-top-2 duration-300" style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '1rem', color: '#10b981', fontWeight: 700, textAlign: 'center', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                            <CheckCircle size={18} />
                            {sendSuccess}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                        {/* Agency Invoice Card */}
                        <div className="glass-pane hover-scale" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid rgba(99,102,241,0.25)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#6366f1' }}>
                                <FileText size={24} />
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.75rem' }}>Agency Invoice</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '2rem', flex: 1 }}>
                                Professional invoice including full tax breakdown, instant commission details, and net investment record.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => handlePreviewInvoice('PARTNER')}
                                    style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(99,102,241,0.1)', border: '1.5px solid #6366f1', color: '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Eye size={16} /> Preview
                                </button>
                                <button
                                    onClick={() => handleDownloadInvoice('PARTNER')}
                                    style={{ padding: '0.85rem', borderRadius: '0.75rem', background: '#6366f1', border: '1.5px solid #6366f1', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Download size={16} /> Download
                                </button>
                            </div>
                        </div>

                        {/* Guest Invoice Card */}
                        <div className="glass-pane hover-scale" style={{ padding: '2rem', border: '1px solid rgba(20,184,166,0.3)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary-teal)' }}>
                                <Users size={24} />
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.75rem' }}>Guest Invoice</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '2rem', flex: 1 }}>
                                Shareable confirmation for your guests. All commissions and agency-specific discounts are hidden for privacy.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        onClick={() => handlePreviewInvoice('GUEST')}
                                        style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--primary-teal)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        <Eye size={16} /> Preview
                                    </button>
                                    <button
                                        onClick={() => handleDownloadInvoice('GUEST')}
                                        style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--primary-teal)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        disabled={isSending['GUEST-EMAIL']}
                                        onClick={() => handleSendInvoice('GUEST', 'EMAIL')}
                                        style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'var(--primary-teal)', border: 'none', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        {isSending['GUEST-EMAIL'] ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                        Email
                                    </button>
                                    <button
                                        disabled={isSending['GUEST-WHATSAPP']}
                                        onClick={() => handleSendInvoice('GUEST', 'WHATSAPP')}
                                        style={{ padding: '0.85rem', borderRadius: '0.75rem', background: '#25D366', border: 'none', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                    >
                                        {isSending['GUEST-WHATSAPP'] ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                        WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => {
                                setStep(1);
                                setBooking(null);
                                setSelectedProperty(null);
                                setSelectedRoom(null);
                                setGuests([]);
                                setCheckIn('');
                                setCheckOut('');
                                setProperties([]);
                                setError(null);
                            }}
                            style={{
                                padding: '1rem 2.5rem',
                                background: 'transparent',
                                color: 'var(--text-dim)',
                                fontWeight: 700,
                                borderRadius: '1rem',
                                border: '1px solid var(--border-glass)',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                            className="hover:bg-white/5 hover:text-white"
                        >
                            Return to Selection
                        </button>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreview && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ width: '100%', maxWidth: '1000px', height: '90vh', background: '#1a1a1a', borderRadius: '1.5rem', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <div>
                                <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Previewing {previewType === 'PARTNER' ? 'Agency' : 'Guest'} Invoice</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{booking?.bookingNumber}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                                    setPreviewUrl(null);
                                }}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                className="hover:bg-red-500/20 hover:text-red-500"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#333', position: 'relative' }}>
                            {!previewUrl ? (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-dim)' }}>
                                    <Loader2 size={40} className="animate-spin" color="var(--primary-teal)" />
                                    <p style={{ fontWeight: 700 }}>Generating PDF Document...</p>
                                </div>
                            ) : (
                                <iframe
                                    src={previewUrl}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Invoice Preview"
                                />
                            )}
                        </div>
                        <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => handleDownloadInvoice(previewType)}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'var(--primary-teal)', border: 'none', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            >
                                <Download size={18} /> Download Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineBookingPage;
