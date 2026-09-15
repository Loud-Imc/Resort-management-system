import React from 'react';
import { MapPin, Star, Building2, CheckCircle, Users } from 'lucide-react';
import { formatPrice } from '../../utils/currency';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Image {
    url: string;
}

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
    images?: (string | Image)[];
    coverImage?: string;
    isVerified?: boolean;
    rating?: number;
    reviewCount?: number;
    _count?: {
        rooms: number;
    };
}

interface BookingResultsGridProps {
    properties: Property[];
    onSelect: (property: Property) => void;
    isGroupBooking?: boolean;
    solutionsMap?: Record<string, any[]>;
}

const getImageUrl = (image: string | Image | undefined, fallback?: string): string => {
    if (!image && !fallback) return '';
    let url = typeof image === 'string' ? image : (image && typeof image === 'object' ? image.url : fallback || '');
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;
};

const getPropertyTypeColor = (type: string) => {
    switch (type) {
        case 'RESORT': return '#10b981'; // emerald-500
        case 'HOMESTAY': return '#3b82f6'; // blue-500
        case 'HOTEL': return '#8b5cf6'; // purple-500
        case 'VILLA': return '#f59e0b'; // amber-500
        default: return '#6b7280'; // gray-500
    }
};

const getPropertyTypeLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
};

const BookingResultsGrid: React.FC<BookingResultsGridProps> = ({ properties, onSelect, isGroupBooking, solutionsMap }) => {
    if (!properties || properties.length === 0) {
        return (
            <div style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fff', borderRadius: '2rem' }}>
                <div style={{ width: '80px', height: '80px', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Building2 size={40} color="#9ca3af" style={{ opacity: 0.3 }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>No Destination Found</h3>
                <p style={{ color: '#6b7280', maxWidth: '300px', margin: '0 auto' }}>Try adjusting your search criteria.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '2.5rem'
        }}>
            {properties.map((property) => {
                const displayImage = getImageUrl(property.images?.[0], property.coverImage);
                const propertySolutions = solutionsMap?.[property.id] || [];
                const recommendedSolution = propertySolutions.find(s => s.isRecommended) || propertySolutions[0];

                const solutionHeadline = recommendedSolution
                    ? Array.from(
                        recommendedSolution.rooms.reduce((acc: Map<string, { name: string; count: number }>, r: any) => {
                            if (!acc.has(r.roomTypeId)) acc.set(r.roomTypeId, { name: r.roomTypeName, count: 0 });
                            acc.get(r.roomTypeId)!.count += 1;
                            return acc;
                        }, new Map()).values()
                    ).map((item: any) => `${item.count}× ${item.name}`).join(' + ')
                    : null;

                const priceValue = isGroupBooking
                    ? (property.groupPriceAdult || property.groupPricePerHead || property.basePrice)
                    : (recommendedSolution ? (recommendedSolution.pricing?.pricePerNight || recommendedSolution.pricing?.totalPrice) : property.basePrice);

                return (
                    <div
                        key={property.id}
                        className="bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                        style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', border: '1px solid #f3f4f6' }}
                        onClick={() => onSelect(property)}
                    >
                        {/* Image Container */}
                        <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
                            {displayImage ? (
                                <img
                                    src={displayImage}
                                    alt={property.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={48} color="#cbd5e1" />
                                </div>
                            )}

                            {/* Type Badge */}
                            <div style={{
                                position: 'absolute', top: '1.25rem', left: '1.25rem',
                                background: getPropertyTypeColor(property.type),
                                color: '#fff', fontSize: '13px', fontWeight: 900,
                                padding: '0.4rem 1.25rem', borderRadius: '2rem',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}>
                                {getPropertyTypeLabel(property.type)}
                            </div>

                            {/* Solution Badge if recommended */}
                            {!isGroupBooking && recommendedSolution && (
                                <div style={{
                                    position: 'absolute', bottom: '1.25rem', left: '1.25rem',
                                    background: 'rgba(13, 148, 136, 0.95)', backdropFilter: 'blur(8px)',
                                    padding: '0.35rem 0.85rem', borderRadius: '2rem',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    color: '#fff', fontSize: '11px', fontWeight: 800,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    ✨ {recommendedSolution.totalRooms} {recommendedSolution.totalRooms === 1 ? 'Room' : 'Rooms'} Solution
                                </div>
                            )}

                            {/* Verified Badge */}
                            {property.isVerified && (
                                <div style={{
                                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                                    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                                    padding: '0.4rem 0.85rem', borderRadius: '2rem',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    color: '#10b981', fontSize: '11px', fontWeight: 800,
                                    border: '1px solid rgba(16,185,129,0.1)',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                }}>
                                    <CheckCircle size={14} />
                                    Verified
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#111827', margin: '0 0 0.4rem 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                                {property.name}
                            </h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '14px', marginBottom: '1rem', fontWeight: 500 }}>
                                <MapPin size={16} color="#0d9488" />
                                {property.city}, {property.state}
                            </div>

                            {/* Solution composition preview */}
                            {!isGroupBooking && solutionHeadline && (
                                <div style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    marginBottom: '1rem',
                                    fontSize: '12px',
                                    color: '#166534',
                                    fontWeight: 700
                                }}>
                                    <span style={{ fontWeight: 800 }}>Recommended:</span> {solutionHeadline}
                                </div>
                            )}

                            {/* Stats Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {property.rating ? (
                                        <>
                                            <Star size={18} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontWeight: 800, color: '#374151' }}>{property.rating}</span>
                                            <span style={{ fontSize: '13px' }}>({property.reviewCount || 0})</span>
                                        </>
                                    ) : (
                                        <span style={{ fontWeight: 700, color: '#9ca3af' }}>New</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontWeight: 700 }}>
                                    <Users size={18} />
                                    <span>{property._count?.rooms || 10} rooms</span>
                                </div>
                            </div>

                            {/* Price / Buttons Area */}
                            <div style={{ marginTop: 'auto', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {isGroupBooking ? (
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9ca3af', marginBottom: '0.4rem' }}>Starting Package</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                                            <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }}>
                                                {formatPrice(priceValue, property.currency)}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 800 }}>/ person + GST</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9ca3af', marginBottom: '0.2rem' }}>
                                            {recommendedSolution ? 'Recommended Solution' : 'Starting From'}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                                            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }}>
                                                {formatPrice(priceValue, property.currency)}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>/ night</span>
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    padding: '0.85rem 1.5rem',
                                    background: '#111827',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    borderRadius: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    boxShadow: '0 8px 20px rgba(17,24,39,0.25)',
                                    transition: 'all 0.3s'
                                }} className="view-details-btn">
                                    View Options →
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BookingResultsGrid;
