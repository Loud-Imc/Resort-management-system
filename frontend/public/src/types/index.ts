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
    availableCount: number;
    totalPrice?: number;
}

export interface BookingSearchParams {
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
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
}
