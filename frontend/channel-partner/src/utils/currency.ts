/**
 * Formats a numeric price into a currency string based on the selected currency code.
 * @param amount The numeric amount to format
 * @param currencyCode The currency code (e.g., 'INR', 'AED', 'USD')
 * @returns A formatted string e.g., '₹1,200', 'AED 500'
 */
export const formatPrice = (amount: number | undefined | null, currencyCode: string = 'INR'): string => {
    try {
        // Guard against undefined, null, or NaN
        if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
            const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
            return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
        }

        const displayAmount = Number(amount);

        // Use locale based on currency for better formatting
        const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';

        const formatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'symbol',
            minimumFractionDigits: displayAmount % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
        });

        return formatter.format(displayAmount);
    } catch (e) {
        return `${currencyCode} ${(amount || 0).toLocaleString()}`;
    }
};

export const SUPPORTED_CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
    { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal' },
    { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
    { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
    { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar' },
];
