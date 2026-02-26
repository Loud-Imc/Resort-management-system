/**
 * Formats a numeric price into a currency string based on the selected currency code.
 * @param amount The numeric amount to format
 * @param currencyCode The currency code (e.g., 'INR', 'AED', 'USD')
 * @returns A formatted string e.g., '₹1,200', 'AED 500'
 */
export const formatPrice = (amount: number, currencyCode: string = 'INR', rates?: Record<string, number>): string => {
    try {
        let displayAmount = amount;
        if (rates && currencyCode !== 'INR') {
            const rate = rates[currencyCode];
            if (rate && rate > 0) {
                displayAmount = amount / rate;
            }
        }

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
        return `${currencyCode} ${amount.toLocaleString()}`;
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
