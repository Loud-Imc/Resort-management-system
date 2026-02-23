import api from './api';

export interface Currency {
    code: string;
    symbol: string;
    rateToINR: number;
    isActive: boolean;
}

export const currencyService = {
    getAll: async (): Promise<Currency[]> => {
        const { data } = await api.get('/currencies');
        return data;
    },
};
