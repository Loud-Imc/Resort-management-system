import React, { useRef, useEffect } from 'react';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

interface GuestRoomsModalProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLDivElement | null>;
}

// Custom Paw Icon matching MMT
const PawIcon = ({ className = "h-5 w-5 text-gray-500" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8.5" cy="5.5" r="2" />
        <circle cx="15.5" cy="5.5" r="2" />
        <circle cx="4.5" cy="10" r="2" />
        <circle cx="19.5" cy="10" r="2" />
        <path d="M12 9c-3.2 0-5 2.2-5 4.5 0 2.4 1.8 4.5 5 4.5s5-2.1 5-4.5c0-2.3-1.8-4.5-5-4.5z" />
    </svg>
);

export default function GuestRoomsModal({ isOpen, onClose }: GuestRoomsModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const {
        rooms, setRooms,
        adults, setAdults,
        rawChildAges, setRawChildrenCount, setRawChildAge,
        petFriendly, setPetFriendly
    } = useSearch();

    const childCount = rawChildAges.length;

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            className="absolute top-full right-0 mt-3 z-50 w-full sm:w-[410px] bg-white rounded-2xl shadow-2xl p-5 border-0 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Room Row */}
            <div className="flex items-center justify-between py-2.5">
                <div>
                    <span className="text-base font-bold text-gray-900">Room</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                        disabled={rooms <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900 text-base">{rooms}</span>
                    <button
                        type="button"
                        onClick={() => setRooms(Math.min(10, rooms + 1))}
                        disabled={rooms >= 10}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Adults Row */}
            <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                <div>
                    <span className="text-base font-bold text-gray-900">Adults</span>
                    <p className="text-xs text-gray-400">13 Years Old and Above</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        disabled={adults <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900 text-base">{adults}</span>
                    <button
                        type="button"
                        onClick={() => setAdults(Math.min(30, adults + 1))}
                        disabled={adults >= 30}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Children Row */}
            <div className="flex items-center justify-between py-2.5 border-t border-gray-100">
                <div>
                    <span className="text-base font-bold text-gray-900">Children</span>
                    <p className="text-xs text-gray-400">0 - 12 Years Old</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setRawChildrenCount(Math.max(0, childCount - 1))}
                        disabled={childCount <= 0}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900 text-base">{childCount}</span>
                    <button
                        type="button"
                        onClick={() => setRawChildrenCount(Math.min(10, childCount + 1))}
                        disabled={childCount >= 10}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:border-gray-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Guidance Helper Note */}
            <p className="text-[11px] text-gray-500 mt-2 leading-tight">
                Please provide right number of children along with their right age for best options and prices.
            </p>

            {/* Child Ages Dynamic Selectors */}
            {childCount > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-700 block mb-2">Age of Children</span>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                        {rawChildAges.map((age, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-gray-600">Child {idx + 1}</span>
                                <div className="relative flex-1">
                                    <select
                                        value={age}
                                        onChange={(e) => setRawChildAge(idx, parseInt(e.target.value))}
                                        className="w-full appearance-none bg-white border border-gray-200 hover:border-primary-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800 pr-7 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all cursor-pointer"
                                    >
                                        <option value={0}>0 yrs (Infant)</option>
                                        <option value={1}>1 yr (Infant)</option>
                                        <option value={2}>2 yrs (Infant)</option>
                                        <option value={3}>3 yrs</option>
                                        <option value={4}>4 yrs</option>
                                        <option value={5}>5 yrs</option>
                                        <option value={6}>6 yrs</option>
                                        <option value={7}>7 yrs</option>
                                        <option value={8}>8 yrs</option>
                                        <option value={9}>9 yrs</option>
                                        <option value={10}>10 yrs</option>
                                        <option value={11}>11 yrs</option>
                                        <option value={12}>12 yrs</option>
                                    </select>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pet Friendly Checkbox Card */}
            <div className="mt-4 p-3.5 rounded-xl border border-gray-100 bg-gray-50/80 flex items-start gap-3 transition-colors hover:bg-gray-50">
                <input
                    type="checkbox"
                    id="pet-friendly-modal-toggle"
                    checked={petFriendly}
                    onChange={(e) => setPetFriendly(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="pet-friendly-modal-toggle" className="flex-1 cursor-pointer select-none">
                    <span className="text-xs font-bold text-gray-900 block leading-snug">Are you travelling with pets?</span>
                    <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                        Selecting this option will show only pet-friendly properties. Please review the pet policies & applicable fees, if any.
                    </span>
                </label>
                <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-gray-100 flex-shrink-0">
                    <PawIcon className="h-4 w-4 text-primary-700" />
                </div>
            </div>

            {/* Apply Action */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                    APPLY
                </button>
            </div>
        </div>
    );
}
