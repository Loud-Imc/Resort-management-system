import { RoomType } from '../../types';
import { User, Maximize } from 'lucide-react';

interface RoomCardProps {
    room: RoomType;
    onBook: (roomId: string) => void;
}

export default function RoomCard({ room, onBook }: RoomCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col md:flex-row">
            <div className="md:w-1/3 h-64 md:h-auto overflow-hidden relative">
                <img
                    src={room.images[0] || 'https://images.unsplash.com/photo-1590490359683-65813c23c985?ixlib=rb-1.2.1'}
                    alt={room.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-900 uppercase tracking-wide">
                    {room.availableCount > 0 ? `${room.availableCount} Available` : 'Sold Out'}
                </div>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary-700">₹{room.basePrice}</span>
                            <span className="text-sm text-gray-500 block">/night</span>
                        </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{room.description}</p>

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>Up to {room.maxAdults} Adults, {room.maxChildren} Kids</span>
                        </div>
                        {room.size && (
                            <div className="flex items-center gap-1">
                                <Maximize className="h-4 w-4" />
                                <span>{room.size} sq ft</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {room.amenities.slice(0, 4).map((amenity, idx) => (
                            <span key={idx} className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded border border-gray-100">
                                {amenity}
                            </span>
                        ))}
                        {room.amenities.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">+ {room.amenities.length - 4} more</span>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => onBook(room.id)}
                        disabled={room.availableCount === 0}
                        className={`
                    px-6 py-2 rounded-lg font-medium transition-colors
                    ${room.availableCount > 0
                                ? 'bg-primary-600 text-white hover:bg-primary-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                `}
                    >
                        {room.availableCount > 0 ? 'Select Room' : 'Sold Out'}
                    </button>
                </div>
            </div>
        </div>
    );
}
