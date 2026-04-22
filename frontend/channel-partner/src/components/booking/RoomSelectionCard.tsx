import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Users, Maximize,
    Sparkles, BedDouble, CheckCircle,
    Wifi, Tv, Coffee, Waves, Snowflake, Car, Bath, Utensils
} from 'lucide-react';
import { formatPrice } from '../../utils/currency';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Image {
    url: string;
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
    images?: (string | Image)[];
    amenities?: string[];
    availableCount?: number;
    isSoldOut?: boolean;
    offerName?: string;
    offerDiscountAmount?: number;
    isGstInclusive?: boolean;
    marketingBadgeText?: string;
    marketingBadgeType?: 'POSITIVE' | 'WARNING' | 'NEGATIVE' | 'URGENT';
}

const getImageUrl = (image: string | Image | undefined): string => {
    if (!image) return '';
    let url = typeof image === 'string' ? image : (image && typeof image === 'object' ? image.url : '');
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;
};

const getFeatureIcon = (text: string) => {
    const lowerText = (text || '').toLowerCase();
    if (lowerText.includes('wifi')) return <Wifi size={14} />;
    if (lowerText.includes('breakfast') || lowerText.includes('dining') || lowerText.includes('meal')) return <Utensils size={14} />;
    if (lowerText.includes('tv')) return <Tv size={14} />;
    if (lowerText.includes('coffee')) return <Coffee size={14} />;
    if (lowerText.includes('pool')) return <Waves size={14} />;
    if (lowerText.includes('ac') || lowerText.includes('air conditioning')) return <Snowflake size={14} />;
    if (lowerText.includes('parking')) return <Car size={14} />;
    if (lowerText.includes('bath') || lowerText.includes('shower')) return <Bath size={14} />;
    return <CheckCircle size={14} />;
};

const RoomImageCarousel: React.FC<{ images: (string | Image)[], name: string }> = ({ images, name }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div style={{ width: '100%', aspectRatio: '4/3', background: '#f3f4f6', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BedDouble size={40} color="#cbd5e1" />
            </div>
        );
    }

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % images.length);
    };

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const currentImageUrl = getImageUrl(images[activeIndex]);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            {currentImageUrl ? (
                <img
                    src={currentImageUrl}
                    alt={`${name} ${activeIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BedDouble size={40} color="#cbd5e1" />
                </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 40%)' }} />

            {images.length > 1 && (
                <>
                    <button onClick={prev} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', color: '#111827', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}><ChevronLeft size={20} /></button>
                    <button onClick={next} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', color: '#111827', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}><ChevronRight size={20} /></button>
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: 900, padding: '0.3rem 0.6rem', borderRadius: '6px', zIndex: 10 }}>{activeIndex + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
};

const RoomSelectionCard: React.FC<{
    room: RoomType,
    onSelectIndex?: (room: RoomType) => void,
    onSelect: (room: RoomType) => void,
    isSelected: boolean,
    nights: number,
    guests: number,
    isGroupBooking?: boolean,
    currency?: string
}> = ({ room, onSelect, isSelected, nights, guests, isGroupBooking, currency = 'INR' }) => {
    const isSoldOut = room.isSoldOut || (room.availableCount !== undefined && room.availableCount === 0);

    return (
        <div
            style={{
                background: '#fff', borderRadius: '2rem', overflow: 'hidden',
                border: isSelected ? '3px solid #14b8a6' : '1px solid #f3f4f6',
                boxShadow: isSelected ? '0 20px 40px rgba(20,184,166,0.12)' : '0 4px 20px rgba(0,0,0,0.03)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isSoldOut ? 'default' : 'pointer',
                opacity: isSoldOut ? 0.75 : 1,
                position: 'relative'
            }}
            onClick={() => !isSoldOut && onSelect(room)}
        >
            {isSoldOut && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(1px)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#111827', color: '#fff', padding: '0.8rem 1.6rem', borderRadius: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', transform: 'rotate(-2deg)' }}>Sold Out</div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                    {/* Left: Image */}
                    <div style={{ width: '320px', padding: '1.5rem', flexShrink: 0 }}>
                        <RoomImageCarousel images={room.images || []} name={room.name} />
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#0d9488', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <Sparkles size={14} /> view more photos
                        </div>
                    </div>

                    {/* Middle: Info */}
                    <div style={{ flex: 1, borderRight: '1.5px solid #f9fafb', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '2rem', borderBottom: '1.5px solid #f9fafb' }}>
                            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', margin: '0 0 0.75rem 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                                {isGroupBooking ? 'Group Stay Package' : room.name}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '12px', fontWeight: 800 }}>
                                <Sparkles size={16} />
                                {isGroupBooking ? 'Exclusive Property Reservation' : 'Highest Quality Standard'}
                            </div>
                        </div>

                        {/* Middle Specs */}
                        <div style={{ padding: '1rem 2rem', background: '#f9fafb', display: 'flex', gap: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', fontWeight: 800, color: '#374151' }}>
                                <Users size={16} color="#0d9488" />
                                {room.maxAdults} Adults {room.maxChildren > 0 && `+ ${room.maxChildren} Child`}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', fontWeight: 700, color: '#6b7280' }}>
                                <Maximize size={16} color="#0d9488" />
                                {room.size || 280} SQ.FT
                            </div>
                        </div>

                        {/* Amenities Grid */}
                        <div style={{ padding: '2rem', flex: 1 }}>
                            <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9ca3af', marginBottom: '1.25rem' }}>Top Inclusions</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {(room.amenities || ['Premium Bedding', 'Fast WiFi', 'Room Service', 'Air Conditioned']).slice(0, 4).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '14px', color: '#4b5563', fontWeight: 600 }}>
                                        <div style={{ width: '28px', height: '28px', background: 'rgba(20,184,166,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                                            {getFeatureIcon(item)}
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Pricing */}
                    <div style={{ width: '260px', padding: '2rem', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
                        <div style={{ marginBottom: '2.5rem' }}>
                            <p style={{ fontSize: '11px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                                {nights} Night{nights > 1 ? 's' : ''} • {guests} Guest{guests > 1 ? 's' : ''}
                            </p>

                            <div style={{ marginBottom: '0.25rem' }}>
                                {room.originalPrice && room.originalPrice > (room.totalPrice || room.basePrice) && (
                                    <span style={{ fontSize: '0.95rem', color: '#9ca3af', textDecoration: 'line-through', marginRight: '0.75rem', fontWeight: 600 }}>
                                        {formatPrice(room.originalPrice, currency)}
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', lineHeight: 1, letterSpacing: '-0.04em' }}>
                                {room.totalPrice ? formatPrice(room.totalPrice, currency) : formatPrice(room.basePrice * nights, currency)}
                            </div>

                            <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, marginTop: '0.5rem' }}>
                                {room.isGstInclusive ? 'Tax inclusive' : '+ GST & Service Charges'}
                            </p>
                        </div>

                        {room.offerName && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                    <Sparkles size={12} /> Promotion Applied
                                </div>
                                <p style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', lineHeight: 1.3 }}>{room.offerName}</p>
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isSoldOut) onSelect(room);
                            }}
                            disabled={isSoldOut}
                            style={{
                                width: '100%',
                                padding: '1.1rem',
                                background: isSelected ? '#14b8a6' : '#111827',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '1.25rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                fontSize: '12px',
                                letterSpacing: '0.1em',
                                cursor: isSoldOut ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                boxShadow: isSelected ? '0 10px 25px rgba(20,184,166,0.3)' : '0 10px 25px rgba(17,24,39,0.2)',
                                transition: 'all 0.3s'
                            }}
                        >
                            {isSelected ? 'Stay Selected' : 'Choose Package'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomSelectionCard;
