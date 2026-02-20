import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../../services/properties';
import SearchDesktop from './SearchDesktop';
import SearchMobile from './SearchMobile';
import SearchInline from './SearchInline';

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
    const [categoryId, setCategoryId] = useState('');
    const [checkIn, setCheckIn] = useState<Date | null>(new Date());
    const [checkOut, setCheckOut] = useState<Date | null>(addDays(new Date(), 1));
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [rooms, setRooms] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);

    const { data: categories } = useQuery({
        queryKey: ['property-categories'],
        queryFn: () => propertyApi.getCategories(),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkIn || !checkOut) return;

        const params = new URLSearchParams({
            location,
            categoryId,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            adults: adults.toString(),
            children: children.toString(),
            rooms: rooms.toString(),
        });

        navigate(`/search?${params.toString()}`);
    };

    const sharedProps = {
        location, setLocation,
        categoryId, setCategoryId,
        checkIn, setCheckIn,
        checkOut, setCheckOut,
        adults, setAdults,
        children, setChildren,
        rooms, setRooms,
        handleSearch,
        categories: categories || []
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
