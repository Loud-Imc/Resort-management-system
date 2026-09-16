import React, { useState } from 'react';
import { X, Users, BedDouble, Maximize2, CheckCircle, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export interface RoomDetailData {
    id: string;
    name: string;
    description?: string;
    images?: string[];
    maxAdults?: number;
    maxChildren?: number;
    maxPhysicalAdults?: number;
    maxPhysicalChildren?: number;
    baseAdults?: number;
    baseChildren?: number;
    bedType?: string;
    size?: number | string;
    amenities?: string[];
    basePrice?: number;
}

interface RoomDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: RoomDetailData | null;
}

export default function RoomDetailsModal({ isOpen, onClose, room }: RoomDetailsModalProps) {
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    if (!isOpen || !room) return null;

    const images = room.images && room.images.length > 0 ? room.images : [];
    const maxA = room.maxPhysicalAdults ?? room.maxAdults ?? 2;
    const maxC = room.maxPhysicalChildren ?? room.maxChildren ?? 1;
    const baseA = room.baseAdults ?? room.maxAdults ?? 2;
    const baseC = room.baseChildren ?? room.maxChildren ?? 1;

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length > 1) {
            setActiveImageIdx((prev) => (prev + 1) % images.length);
        }
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (images.length > 1) {
            setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            Room Type Specifications
                        </span>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                            {room.name}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Photo Carousel */}
                    {images.length > 0 ? (
                        <div className="space-y-3">
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group shadow-inner">
                                <img
                                    src={images[activeImageIdx]}
                                    alt={`${room.name} photo ${activeImageIdx + 1}`}
                                    className="w-full h-full object-cover transition-all duration-300"
                                />
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={handlePrevImage}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={handleNextImage}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                                            {activeImageIdx + 1} / {images.length}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Thumbnail strip */}
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImageIdx(idx)}
                                            className={clsx(
                                                "relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                                                activeImageIdx === idx
                                                    ? "border-primary-500 scale-105 shadow-sm"
                                                    : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-[16/9] rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <BedDouble className="h-10 w-10 opacity-40" />
                        </div>
                    )}

                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                                <Users className="h-3 w-3 text-primary-500" /> Physical Capacity
                            </span>
                            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">
                                Up to {maxA} Adults, {maxC} Children
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                                (Base: {baseA}A + {baseC}C)
                            </span>
                        </div>

                        {room.size && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                                    <Maximize2 className="h-3 w-3 text-primary-500" /> Room Dimensions
                                </span>
                                <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">
                                    {room.size} sq.ft
                                </span>
                            </div>
                        )}

                        {room.bedType && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                                    <BedDouble className="h-3 w-3 text-primary-500" /> Bed Setup
                                </span>
                                <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block capitalize">
                                    {room.bedType.toLowerCase()} Bed
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {room.description && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">About this Room</h4>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                {room.description}
                            </p>
                        </div>
                    )}

                    {/* Amenities List */}
                    {room.amenities && room.amenities.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary-500" /> Room Amenities & Inclusions
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {room.amenities.map((amenity, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span className="truncate">{amenity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                    <div>
                        {room.basePrice ? (
                            <span className="text-sm font-black text-gray-900 dark:text-white">
                                ₹{room.basePrice.toLocaleString()}{' '}
                                <span className="text-[10px] text-gray-500 font-normal">/ base night</span>
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500">Part of selected package</span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
