export interface RoomType {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    capacity: number;
    maxAdults: number;
    maxChildren: number;
    size?: number;
    amenities: string[];
    images: string[];
    highlights?: string[];
    inclusions?: string[];
    cancellationPolicy?: string;
    availableCount: number;
    marketingBadgeText?: string;
    marketingBadgeType?: string;
    totalPrice?: number;
    offers?: any[];
    isSoldOut?: boolean;
    rooms?: { id: string; status: string }[];
    property?: Property;
}

export interface BookingSearchParams {
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    location?: string;
    type?: string;
    includeSoldOut?: boolean;
}

export interface AvailabilityResponse {
    availableRoomTypes: RoomType[];
}

export interface CreateBookingDto {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guests?: any[];
    specialRequests?: string;
    couponCode?: string;
    referralCode?: string; // CP referral code
}

// Marketplace Types
export type PropertyType = 'RESORT' | 'HOMESTAY' | 'HOTEL' | 'VILLA' | 'OTHER';

export interface Property {
    id: string;
    name: string;
    slug: string;
    type: PropertyType;
    description?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    email: string;
    phone: string;
    images: string[];
    coverImage?: string;
    amenities: string[];
    rating?: number;
    reviewCount: number;
    isActive: boolean;
    isVerified: boolean;
    _count?: {
        rooms: number;
        bookings: number;
    };
    roomTypes?: RoomType[];
    isSoldOut?: boolean;
    minPrice?: number;
    availableRoomCount?: number;
}

export interface PropertySearchParams {
    search?: string;
    city?: string;
    type?: PropertyType;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    page?: number;
    limit?: number;
}

export interface PropertyListResponse {
    data: Property[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ChannelPartnerInfo {
    referralCode: string;
    discount?: number;
    partnerName?: string;
}
