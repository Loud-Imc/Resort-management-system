import { useCurrency } from '../../context/CurrencyContext';
import { formatPrice } from '../../utils/currency';

interface PriceDisplayProps {
    amount: number | undefined | null;
    className?: string;
    currencyCode?: string;
}

export const PriceDisplay = ({ amount, className, currencyCode }: PriceDisplayProps) => {
    const { selectedCurrency, rates } = useCurrency();
    const targetCurrency = currencyCode || selectedCurrency;
    const formatted = formatPrice(amount, targetCurrency, rates);

    // Split into symbol and number
    const digitIndex = formatted.search(/\d/);
    if (digitIndex === -1) return <span className={className}>{formatted}</span>;

    const symbol = formatted.slice(0, digitIndex);
    const value = formatted.slice(digitIndex);

    return (
        <span className={className}>
            <span className="text-[0.7em] font-bold mr-0.5 relative top-[-0.1em]">
                {symbol}
            </span>
            <span>{value}</span>
        </span>
    );
};
