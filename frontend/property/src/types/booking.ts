export const BookingStatus = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    RESERVED: 'RESERVED',
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
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'FULL';
    paymentMethod?: string;
    extraAdultAmount?: number;
    extraChildAmount?: number;
    status: BookingStatus;
    specialRequests?: string;
    isManualBooking: boolean;
    roomId: string;
    room: {
        roomNumber: string;
        floor: number;
        roomType: {
            name: string;
            images?: string[];
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
    roomBlocks?: {
        room: {
            roomNumber: string;
            roomType: {
                name: string;
                images?: string[];
            };
        };
    }[];
    amountInBookingCurrency: number;
    bookingCurrency: string;
    exchangeRate: number;
    isGroupBooking: boolean;
    groupSize?: number;
    createdAt: string;
}

export interface CreateBookingDto {
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    roomTypeId?: string;
    guests: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        age?: number;
        idType?: string;
        idNumber?: string;
    }[];
    couponCode?: string;
    referralCode?: string;
    generalCode?: string;
    roomId?: string;
    isManualBooking?: boolean;
    isGroupBooking?: boolean;
    groupSize?: number;
    propertyId?: string;
    paymentOption?: 'FULL' | 'PARTIAL';
    paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'ONLINE' | 'WALLET';
    paidAmount?: number;
    bookingSourceId?: string;
    overrideTotal?: number;
    overrideReason?: string;
}

export interface CheckAvailabilityDto {
    roomTypeId?: string;
    checkInDate: string;
    checkOutDate: string;
    isGroupBooking?: boolean;
    groupSize?: number;
    propertyId?: string;
    isAdmin?: boolean;
}

export interface CheckAvailabilityResult {
    available: boolean;
    availableRooms: number;
    roomList?: { id: string; name: string; roomNumber: string }[];
    allocationPreview?: any[];
    groupUnavailableReason?: string;
}

export interface PriceCalculationDto {
    roomTypeId?: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    couponCode?: string;
    referralCode?: string;
    generalCode?: string;
    isGroupBooking?: boolean;
    groupSize?: number;
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
    targetCurrency?: string;
    convertedTotal?: number;
    exchangeRate?: number;
    numberOfNights: number;
    pricePerNight: number;
    taxRate: number;
    appliedCodeType?: 'COUPON' | 'REFERRAL' | 'NONE';
    referralPartnerId?: string;
}
