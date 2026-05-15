import { useState, useEffect, useCallback } from 'react';
import { financialsService } from '../services/financials';
import { channelPartnerService } from '../services/channel-partners';
import { propertyService } from '../services/properties';
import { marketingService } from '../services/marketing';
import { promotionsService } from '../services/promotions';

export interface PendingCounts {
    '/financials/refunds': number;
    '/financials/adjustments': number;
    '/financials/settlements': number;
    '/financials/redemptions': number;
    '/channel-partners': number;
    '/properties/requests': number;
    '/marketing/promotions': number;
}

export function usePendingCounts() {
    const [counts, setCounts] = useState<PendingCounts>({
        '/financials/refunds': 0,
        '/financials/adjustments': 0,
        '/financials/settlements': 0,
        '/financials/redemptions': 0,
        '/channel-partners': 0,
        '/properties/requests': 0,
        '/marketing/promotions': 0,
    });

    const refresh = useCallback(async () => {
        const [settlements, redemptions, adjustments, cpList, propRequests, physicalRewards, promoRequests] =
            await Promise.allSettled([
                financialsService.getAllSettlements({ status: 'CALCULATED', limit: 1 }),
                financialsService.getAllRedemptions({ status: 'REQUESTED', limit: 1 }),
                financialsService.getAllAdjustments({ status: 'PENDING', limit: 1 }),
                channelPartnerService.getAll(1, 1),     
                propertyService.getAllRequests(),        
                marketingService.getRewardRedemptions('PENDING'),
                promotionsService.getAll({ status: 'PENDING_APPROVAL' }),
            ]);

        const get = (r: PromiseSettledResult<any>, extractor: (v: any) => number) =>
            r.status === 'fulfilled' ? extractor(r.value) : 0;

        setCounts({
            '/financials/settlements':  get(settlements,  v => Array.isArray(v) ? v.length : 0),
            '/financials/redemptions':  get(redemptions,  v => Array.isArray(v) ? v.length : 0) + 
                                       get(physicalRewards, v => Array.isArray(v) ? v.length : 0),
            '/financials/adjustments':  get(adjustments,  v => Array.isArray(v) ? v.length : 0),
            '/financials/refunds':      0, 
            '/channel-partners':        get(cpList,       v => v?.meta?.totalPending ?? (Array.isArray(v) ? v.length : 0)),
            '/properties/requests':     get(propRequests, v => Array.isArray(v) ? v.filter((r: any) => r.status === 'PENDING').length : 0),
            '/marketing/promotions':    get(promoRequests, v => Array.isArray(v) ? v.length : 0),
        });
    }, []);

    useEffect(() => {
        refresh();
        // Poll every 60 seconds to keep badges fresh
        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, [refresh]);

    return counts;
}
