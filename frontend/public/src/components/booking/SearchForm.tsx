import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Users, Calendar } from 'lucide-react';
import { addDays } from 'date-fns';

export default function SearchForm({ className = "" }: { className?: string }) {
    const navigate = useNavigate();
    const [checkIn, setCheckIn] = useState<Date | null>(new Date());
    const [checkOut, setCheckOut] = useState<Date | null>(addDays(new Date(), 1));
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkIn || !checkOut) return;

        const params = new URLSearchParams({
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            adults: adults.toString(),
            children: children.toString(),
        });

        navigate(`/search?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSearch} className={`bg-white p-6 rounded-xl shadow-xl border border-gray-100 ${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary-600" />
                        Check In
                    </label>
                    <DatePicker
                        selected={checkIn}
                        onChange={(date: Date | null) => setCheckIn(date)}
                        selectsStart
                        startDate={checkIn}
                        endDate={checkOut}
                        minDate={new Date()}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholderText="Select Date"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary-600" />
                        Check Out
                    </label>
                    <DatePicker
                        selected={checkOut}
                        onChange={(date: Date | null) => setCheckOut(date)}
                        selectsEnd
                        startDate={checkIn}
                        endDate={checkOut}
                        minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholderText="Select Date"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary-600" />
                        Guests
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select
                                value={adults}
                                onChange={(e) => setAdults(Number(e.target.value))}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                            >
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <option key={num} value={num}>{num} Adults</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative flex-1">
                            <select
                                value={children}
                                onChange={(e) => setChildren(Number(e.target.value))}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                            >
                                {[0, 1, 2, 3, 4].map(num => (
                                    <option key={num} value={num}>{num} Kids</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white font-bold py-2.5 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                    >
                        Search Availability
                    </button>
                </div>
            </div>
        </form>
    );
}
