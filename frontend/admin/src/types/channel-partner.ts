// Channel Partner Types for Admin Frontend

export interface ChannelPartner {
    id: string;
    referralCode: string;
    commissionRate: number;
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    paidOut: number;
    isActive: boolean;
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
