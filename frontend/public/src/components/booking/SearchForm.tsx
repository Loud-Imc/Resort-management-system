import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Palmtree, Hotel, Home, Tent } from 'lucide-react';
import { addDays } from 'date-fns';
import SearchDesktop from './SearchDesktop';
import SearchMobile from './SearchMobile';
import SearchInline from './SearchInline';

const CATEGORIES = [
    { id: 'ALL', label: 'All Stays', icon: Building2 },
    { id: 'RESORT', label: 'Resorts', icon: Palmtree },
    { id: 'HOTEL', label: 'Hotels', icon: Hotel },
    { id: 'HOMESTAY', label: 'Homestays', icon: Tent },
    { id: 'VILLA', label: 'Villas', icon: Home },
];

export default function SearchForm({
    className = "",
    theme = 'dark',
    variant = 'hero'
}: {
    className?: string,
    theme?: 'dark' | 'light',
    variant?: 'hero' | 'inline'
}) {
    const navigate = useNavigate();
    const [location, setLocation] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [checkIn, setCheckIn] = useState<Date | null>(new Date());
    const [checkOut, setCheckOut] = useState<Date | null>(addDays(new Date(), 1));
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkIn || !checkOut) return;

        const params = new URLSearchParams({
            location,
            type: propertyType,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            adults: adults.toString(),
            children: children.toString(),
        });

        navigate(`/search?${params.toString()}`);
    };

    const sharedProps = {
        location, setLocation,
        propertyType, setPropertyType,
        checkIn, setCheckIn,
        checkOut, setCheckOut,
        adults, setAdults,
        children, setChildren,
        handleSearch,
        CATEGORIES
    };

    if (variant === 'inline') {
        return (
            <div className={`w-full max-w-7xl mx-auto ${className}`}>
                <SearchInline {...sharedProps} />
            </div>
        );
    }

    return (
        <div className={`relative w-full max-w-6xl mx-auto ${className}`}>
            <SearchDesktop {...sharedProps} theme={theme} />
            <SearchMobile {...sharedProps} isExpanded={isExpanded} setIsExpanded={setIsExpanded} theme={theme} />

            {theme === 'dark' && (
                <div className="mt-14 md:mt-20 text-center pointer-events-none">
                    <p className="text-white/40 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                        <span className="w-8 md:w-16 h-[1px] bg-white/10" />
                        Premium Eco-Stays
                        <span className="w-8 md:w-16 h-[1px] bg-white/10" />
                    </p>
                </div>
            )}
        </div>
    );
}
