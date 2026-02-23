import React from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { Globe } from 'lucide-react';

const CurrencySwitcher: React.FC = () => {
    const { selectedCurrency, setCurrency } = useCurrency();

    return (
        <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 bg-white border border-gray-200 rounded-full transition-colors shadow-sm">
                <Globe size={14} className="text-gray-400 group-hover:text-primary-500" />
                <span>{selectedCurrency}</span>
            </button>

            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Currency
                </div>
                {SUPPORTED_CURRENCIES.map((currency) => (
                    <button
                        key={currency.code}
                        onClick={() => setCurrency(currency.code)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${selectedCurrency === currency.code
                                ? 'bg-primary-50 text-primary-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-mono">{currency.symbol}</span>
                            <span>{currency.name}</span>
                        </div>
                        {selectedCurrency === currency.code && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CurrencySwitcher;
