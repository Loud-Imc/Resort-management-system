export const RoomStatus = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    BLOCKED: 'BLOCKED',
} as const;

export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

export interface RoomType {
    id: string;
    name: string;
    description?: string;
    size?: number | null;
    basePrice: number;
    // Legacy V1 fields
    maxAdults: number;
    maxChildren: number;
    baseAdults?: number;
    baseChildren?: number;
    // Canonical V2 fields
    occupancyVersion?: 'V1' | 'V2' | string | null;
    totalBaseOccupancy?: number | null;
    totalMaxOccupancy?: number | null;
    baseMaxAdults?: number | null;
    baseMaxChildren?: number | null;
    maxPhysicalAdults?: number | null;
    maxPhysicalChildren?: number | null;
    maxPhysicalInfants?: number | null;
    freeChildrenCount: number;
    amenities: string[];
    highlights: string[];
    inclusions: string[];
    cancellationPolicy?: string;
    marketingBadgeText?: string;
    marketingBadgeType?: string;
    images: string[];
    isPubliclyVisible: boolean;
    extraAdultPrice: number;
    extraChildPrice: number;
    propertyId: string;
    property?: {
        id: string;
        name: string;
        city: string;
        occupancyVersion?: 'V1' | 'V2' | string | null;
    };
}

export interface CreateRoomTypeDto {
    name: string;
    description?: string;
    size?: number | null;
    basePrice: number;
    // Legacy V1 fields
    maxAdults: number;
    maxChildren: number;
    baseAdults?: number;
    baseChildren?: number;
    // Canonical V2 fields
    occupancyVersion?: 'V1' | 'V2' | string | null;
    totalBaseOccupancy?: number | null;
    totalMaxOccupancy?: number | null;
    baseMaxAdults?: number | null;
    baseMaxChildren?: number | null;
    maxPhysicalAdults?: number | null;
    maxPhysicalChildren?: number | null;
    maxPhysicalInfants?: number | null;
    freeChildrenCount: number;
    amenities: string[];
    highlights: string[];
    inclusions: string[];
    cancellationPolicy?: string;
    marketingBadgeText?: string;
    marketingBadgeType?: string;
    images: string[];
    isPubliclyVisible: boolean;
    extraAdultPrice: number;
    extraChildPrice: number;
    propertyId?: string;
}

export interface UpdateRoomTypeDto extends Partial<CreateRoomTypeDto> { }

export interface Room {
    id: string;
    roomNumber: string;
    floor?: number;
    status: RoomStatus;
    isEnabled: boolean;
    notes?: string;
    roomTypeId: string;
    roomType: RoomType;
    propertyId?: string;
    property?: {
        name: string;
        city: string;
    };
    createdAt: string;
    updatedAt: string;
    bookings?: any[]; // For dashboard reserved status
}

export interface CreateRoomDto {
    roomNumber: string;
    floor?: number;
    roomTypeId: string;
    notes?: string;
    isEnabled?: boolean;
    propertyId?: string;
}

export interface UpdateRoomDto {
    roomNumber?: string;
    floor?: number;
    roomTypeId?: string;
    status?: RoomStatus;
    notes?: string;
    isEnabled?: boolean;
    propertyId?: string;
}

export interface BlockRoomDto {
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
}

export interface RoomBlock {
    id: string;
    roomId: string;
    minDate: string;
    endDate: string;
    reason: string;
    notes?: string;
    createdById: string;
    createdAt: string;
}
