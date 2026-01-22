export declare enum PropertyType {
    RESORT = "RESORT",
    HOMESTAY = "HOMESTAY",
    HOTEL = "HOTEL",
    VILLA = "VILLA",
    OTHER = "OTHER"
}
export declare class CreatePropertyDto {
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
export declare class UpdatePropertyDto {
    name?: string;
    type?: PropertyType;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    email?: string;
    phone?: string;
    amenities?: string[];
    images?: string[];
    coverImage?: string;
    policies?: Record<string, any>;
    isActive?: boolean;
    commissionStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
}
export declare class PropertyQueryDto {
    city?: string;
    state?: string;
    type?: PropertyType;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    page?: number;
    limit?: number;
}
