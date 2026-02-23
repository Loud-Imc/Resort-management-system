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

        const formatter = new Intl.NumberFormat('en-IN', {
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
];
