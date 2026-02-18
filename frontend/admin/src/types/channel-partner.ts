// Channel Partner Types for Admin Frontend

export type ChannelPartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export interface ChannelPartner {
    id: string;
    referralCode: string;
    commissionRate: number;
    referralDiscountRate: number;
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    paidOut: number;
    status: ChannelPartnerStatus;
    userId: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    };
    createdAt: string;
    updatedAt: string;
    _count?: {
        referrals: number;
    };
}

export interface CPStats {
    referralCode: string;
    commissionRate: number;
    referralDiscountRate: number;
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    paidOut: number;
    pendingBalance: number;
    totalReferrals: number;
    confirmedReferrals: number;
    thisMonthReferrals: number;
}

export interface CPTransaction {
    id: string;
    type: 'COMMISSION' | 'POINTS_EARNED' | 'POINTS_REDEEMED' | 'PAYOUT';
    amount: number;
    points: number;
    description?: string;
    channelPartnerId: string;
    bookingId?: string;
    createdAt: string;
}

export interface CPReferral {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    cpCommission: number;
    createdAt: string;
    status: string;
}

export interface CPListResponse {
    data: ChannelPartner[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface CPReferralBooking {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    cpCommission: number;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    property?: {
        id: string;
        name: string;
    };
}

export interface CPPartnerDetails extends ChannelPartner {
    pendingBalance: number;
    totalReferrals: number;
    confirmedReferrals: number;
    thisMonthReferrals: number;
    referralBookings: CPReferralBooking[];
}
