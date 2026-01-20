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
    basePrice: number;
    maxAdults: number;
    maxChildren: number;
    amenities: string[];
    images: string[];
    isPubliclyVisible: boolean;
    extraAdultPrice: number;
    extraChildPrice: number;
    freeChildrenCount: number;
}

export interface CreateRoomTypeDto {
    name: string;
    description?: string;
    basePrice: number;
    maxAdults: number;
    maxChildren: number;
    amenities: string[];
    images: string[];
    isPubliclyVisible: boolean;
    extraAdultPrice: number;
    extraChildPrice: number;
    freeChildrenCount: number;
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
}

export interface UpdateRoomDto {
    roomNumber?: string;
    floor?: number;
    roomTypeId?: string;
    status?: RoomStatus;
    notes?: string;
    isEnabled?: boolean;
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
