import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { currencyService } from '../services/currencies';

interface CurrencyContextType {
    selectedCurrency: string;
    setCurrency: (code: string) => void;
    currencySymbol: string;
    rates: Record<string, number>;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedCurrency, setSelectedCurrency] = useState('INR');
    const [rates, setRates] = useState<Record<string, number>>({ 'INR': 1.0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('preferred_currency');
        if (saved) setSelectedCurrency(saved);

        const fetchRates = async () => {
            try {
                const data = await currencyService.getAll();
                const rateMap: Record<string, number> = {};
                data.forEach(c => {
                    rateMap[c.code] = Number(c.rateToINR);
                });
                setRates(rateMap);
            } catch (error) {
                console.error('Error fetching currency rates:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRates();
    }, []);

    const setCurrency = (code: string) => {
        setSelectedCurrency(code);
        localStorage.setItem('preferred_currency', code);
    };

    const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || '₹';

    return (
        <CurrencyContext.Provider value={{ selectedCurrency, setCurrency, currencySymbol, rates, isLoading }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
    return context;
};
