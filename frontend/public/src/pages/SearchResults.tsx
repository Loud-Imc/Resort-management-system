import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';
import SearchForm from '../components/booking/SearchForm';
import RoomCard from '../components/booking/RoomCard';
import { Loader2, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Use state to hold stable default dates that don't change on re-renders
    const [defaults] = useState(() => {
        const today = new Date();
        return {
            checkIn: format(today, 'yyyy-MM-dd'),
            checkOut: format(addDays(today, 1), 'yyyy-MM-dd')
        };
    });

    const checkIn = searchParams.get('checkIn') || defaults.checkIn;
    const checkOut = searchParams.get('checkOut') || defaults.checkOut;
    const adults = Number(searchParams.get('adults')) || 2;
    const children = Number(searchParams.get('children')) || 0;

    const { data, isLoading, error } = useQuery({
        queryKey: ['availability', checkIn, checkOut, adults, children],
        queryFn: () => bookingService.checkAvailability({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults,
            children
        }),
        enabled: !!checkIn && !!checkOut,
    });

    const handleBook = (roomId: string) => {
        // Navigate to checkout with selected room and search params
        const params = new URLSearchParams({
            checkIn,
            checkOut,
            adults: adults.toString(),
            children: children.toString(),
            roomId
        });
        navigate(`/book?${params.toString()}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 py-12 pt-28">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                <p className="text-gray-500">Finding the perfect room for you...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg inline-flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    Unable to load availability. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pt-28">
            {/* Modify Search */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Select Your Room</h1>
                <SearchForm className="shadow-sm border-gray-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Filters Sidebar (Placeholder) */}
                <div className="hidden lg:block space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                        <h3 className="font-semibold mb-4">Your Stay</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Check In</span>
                                <span className="font-medium text-gray-900">{format(new Date(checkIn), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Check Out</span>
                                <span className="font-medium text-gray-900">{format(new Date(checkOut), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Guests</span>
                                <span className="font-medium text-gray-900">{adults} Ad, {children} Ch</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="lg:col-span-3 space-y-6">
                    {data?.availableRoomTypes?.length === 0 ? (
                        <div className="bg-yellow-50 p-8 text-center rounded-xl border border-yellow-100">
                            <p className="text-yellow-800 font-medium">No rooms available for these dates.</p>
                            <p className="text-yellow-600 text-sm mt-1">Please try changing your travel dates or guest count.</p>
                        </div>
                    ) : (
                        data?.availableRoomTypes.map(room => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onBook={handleBook}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
