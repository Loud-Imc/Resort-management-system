export const BookingStatus = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    CONFIRMED: 'CONFIRMED',
    CHECKED_IN: 'CHECKED_IN',
    CHECKED_OUT: 'CHECKED_OUT',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
    REFUNDED: 'REFUNDED',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export interface BookingGuest {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    age?: number;
    idType?: string;
    idNumber?: string;
    idImage?: string;
}

export interface Booking {
    id: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfNights: number;
    adultsCount: number;
    childrenCount: number;
    baseAmount: number;
    taxAmount: number;
    offerDiscountAmount: number;
    couponDiscountAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    paymentStatus?: 'FULL' | 'PARTIAL' | 'PENDING';
    paymentOption?: 'FULL' | 'PARTIAL';
    status: BookingStatus;
    specialRequests?: string;
    isManualBooking: boolean;
    roomId: string;
    room: {
        roomNumber: string;
        floor: number;
        roomType: {
            name: string;
        };
    };
    userId: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    };
    bookingSourceId?: string;
    agentId?: string;
    commissionAmount: number;
    guests: BookingGuest[];
    createdAt: string;
}

export interface CreateBookingDto {
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    roomTypeId: string;
    guests: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        age?: number;
    }[];
    couponCode?: string;
    referralCode?: string;
    roomId?: string;
    isManualBooking?: boolean;
}

export interface CheckAvailabilityDto {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
}

export interface PriceCalculationDto {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    couponCode?: string;
    referralCode?: string;
}

export interface PriceCalculationResult {
    baseAmount: number;
    extraAdultAmount: number;
    extraChildAmount: number;
    taxAmount: number;
    offerDiscountAmount: number;
    couponDiscountAmount: number;
    referralDiscountAmount: number;
    discountAmount: number;
    totalAmount: number;
    numberOfNights: number;
    pricePerNight: number;
    taxRate: number;
}
