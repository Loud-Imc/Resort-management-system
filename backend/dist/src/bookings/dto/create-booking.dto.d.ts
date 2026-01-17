export declare class GuestInfoDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    age?: number;
    idType?: string;
    idNumber?: string;
}
export declare class CreateBookingDto {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    guests: GuestInfoDto[];
    specialRequests?: string;
    couponCode?: string;
    bookingSourceId?: string;
    isManualBooking?: boolean;
    overrideTotal?: number;
    overrideReason?: string;
    agentId?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
}
