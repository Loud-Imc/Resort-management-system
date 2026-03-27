import api from './api';
import {
    AdjustmentType,
    //  SettlementStatus, RedemptionStatus 
} from '../types/finance';

export const financialsService = {
    // ============================================
    // AD-HOC ADJUSTMENTS (MAKER-CHECKER)
    // ============================================

    // Create a wallet/points adjustment request (Maker)
    async createAdjustment(dto: { targetId: string; amount: number; type: AdjustmentType; reason: string }) {
        const response = await api.post('/financials/adjustments', dto);
        return response.data;
    },

    // Approve a financial adjustment request (Checker)
    async approveAdjustment(id: string) {
        const response = await api.patch(`/financials/adjustments/${id}/approve`);
        return response.data;
    },

    // ============================================
    // PROPERTY SETTLEMENTS
    // ============================================

    // Calculate settlement (Maker)
    async calculateSettlement(bookingId: string) {
        const response = await api.post(`/financials/settlements/calculate/${bookingId}`);
        return response.data;
    },

    // Approve settlement (Checker)
    async approveSettlement(id: string) {
        const response = await api.patch(`/financials/settlements/${id}/approve`);
        return response.data;
    },

    // Mark settlement as PAID (Processor)
    async processSettlementPayout(id: string, dto: { referenceId: string; method: string }) {
        const response = await api.patch(`/financials/settlements/${id}/payout`, dto);
        return response.data;
    },

    // ============================================
    // CP REDEMPTIONS
    // ============================================

    // Create redemption request
    async createRedemption(dto: { cpId: string; amount: number }) {
        const response = await api.post('/financials/redemptions', dto);
        return response.data;
    },

    // Approve redemption (Checker)
    async approveRedemption(id: string) {
        const response = await api.patch(`/financials/redemptions/${id}/approve`);
        return response.data;
    },

    // Mark redemption as PAID (Processor)
    async processRedemptionPayout(id: string, dto: { referenceId: string; method: string }) {
        const response = await api.patch(`/financials/redemptions/${id}/payout`, dto);
        return response.data;
    },

    // ============================================
    // RECONCILIATION
    // ============================================

    // List discrepancies
    async getDiscrepancies() {
        const response = await api.get('/financials/reconciliation/discrepancies');
        return response.data;
    },

    // Flag discrepancy (Maker)
    async flagDiscrepancy(paymentId: string, dto: { gatewayStatus: string }) {
        const response = await api.post(`/financials/reconciliation/flag/${paymentId}`, dto);
        return response.data;
    },

    // Resolve discrepancy (Checker)
    async resolveDiscrepancy(paymentId: string, dto: { notes: string }) {
        const response = await api.patch(`/financials/reconciliation/resolve/${paymentId}`, dto);
        return response.data;
    },

    // ============================================
    // LISTING METHODS
    // ============================================

    async getAllSettlements(params?: any) {
        const response = await api.get('/financials/settlements', { params });
        return response.data;
    },

    async getAllRedemptions(params?: any) {
        const response = await api.get('/financials/redemptions', { params });
        return response.data;
    },

    async getAllAdjustments(params?: any) {
        const response = await api.get('/financials/adjustments', { params });
        return response.data;
    }
};

export default financialsService;
