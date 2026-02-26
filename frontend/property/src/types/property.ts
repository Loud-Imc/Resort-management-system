export type PropertyType = 'RESORT' | 'HOMESTAY' | 'HOTEL' | 'VILLA' | 'OTHER';

export interface CancellationRule {
    hoursBeforeCheckIn: number;
    refundPercentage: number;
}

export interface CancellationPolicy {
    id: string;
    name: string;
    description?: string;
    propertyId: string;
    rules: CancellationRule[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

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
    whatsappNumber?: string;
    images: string[];
    coverImage?: string;
    amenities: string[];
    policies?: Record<string, any>;
    rating?: number;
    reviewCount: number;
    isActive: boolean;
    isVerified: boolean;
    isFeatured: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
    ownerId: string;
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
    };
    createdAt: string;
    updatedAt: string;
    _count?: {
        bookings: number;
        staff?: number;
        rooms: number;
    };
    marketingCommission?: number;
    platformCommission?: number;
    commissionStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
    taxRate?: number;
    cancellationPolicies?: CancellationPolicy[];
    defaultCancellationPolicyId?: string;
    defaultCancellationPolicy?: CancellationPolicy;
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
