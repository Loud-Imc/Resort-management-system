// Property Types for Admin Frontend

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
    policies?: Record<string, any>;
    rating?: number;
    reviewCount: number;
    isActive: boolean;
    isVerified: boolean;
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
    commissionStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
    addedBy?: {
        id: string;
        firstName: string;
        email: string;
    };
}

export interface CreatePropertyDto {
    name: string;
    type: PropertyType;
    description?: string;
    address: string;
    city: string;
    state: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    email: string;
    phone: string;
    amenities?: string[];
    images?: string[];
    coverImage?: string;
    policies?: Record<string, any>;
    addedById?: string;
    marketingCommission?: number;
}

export interface UpdatePropertyDto extends Partial<CreatePropertyDto> {
    isActive?: boolean;
}

export interface PropertyQueryParams {
    city?: string;
    state?: string;
    type?: PropertyType;
    search?: string;
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
