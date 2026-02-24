// Property Types for Admin Frontend

export type PropertyType = 'RESORT' | 'HOMESTAY' | 'HOTEL' | 'VILLA' | 'OTHER';

export interface Property {
    id: string;
    name: string;
    slug: string;
    type: PropertyType;
    categoryId?: string;
    category?: {
        id: string;
        name: string;
        slug: string;
        icon?: string;
    };
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
    addedBy?: {
        id: string;
        firstName: string;
        email: string;
    };
    taxRate?: number;
}

export interface CreatePropertyDto {
    name: string;
    type: PropertyType;
    categoryId?: string;
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
    whatsappNumber?: string;
    amenities?: string[];
    images?: string[];
    coverImage?: string;
    policies?: Record<string, any>;
    addedById?: string;
    marketingCommission?: number;
    platformCommission?: number;
    ownerId?: string;
    isFeatured?: boolean;
    taxRate?: number;
}

export interface UpdatePropertyDto extends Partial<CreatePropertyDto> {
    isActive?: boolean;
    isFeatured?: boolean;
}

export interface PropertyQueryParams {
    city?: string;
    state?: string;
    type?: PropertyType;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
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
