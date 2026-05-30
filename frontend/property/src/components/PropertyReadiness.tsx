import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../context/PropertyContext';
import { roomTypesService } from '../services/roomTypes';
import { roomsService } from '../services/rooms';
import { cancellationPoliciesService } from '../services/cancellationPolicies';
import { AlertCircle, CheckCircle2, XCircle, ChevronRight, X, Image as ImageIcon, MapPin, BedDouble, FileText } from 'lucide-react';
import clsx from 'clsx';

export default function PropertyReadiness() {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch required data
    const { data: roomTypes } = useQuery({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const { data: rooms } = useQuery({
        queryKey: ['rooms', selectedProperty?.id],
        queryFn: () => roomsService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const { data: policies } = useQuery({
        queryKey: ['cancellationPolicies', selectedProperty?.id],
        queryFn: () => cancellationPoliciesService.getAll(selectedProperty!.id),
        enabled: !!selectedProperty?.id,
    });

    // Evaluate readiness checklist
    const checklist = useMemo(() => {
        if (!selectedProperty) return [];

        const hasCoordinates = !!selectedProperty.latitude && !!selectedProperty.longitude;
        const hasImages = !!selectedProperty.coverImage && (selectedProperty.images?.length || 0) > 0;
        const hasRoomTypes = (roomTypes?.length || 0) > 0;
        const hasRooms = (rooms?.length || 0) > 0;
        const hasPolicies = (policies?.length || 0) > 0;

        return [
            {
                id: 'location',
                title: 'Set Map Coordinates',
                description: 'Exact latitude and longitude are required for your property to appear in location-based searches.',
                isComplete: hasCoordinates,
                icon: MapPin,
                action: () => navigate('/my-property?tab=location'),
                actionText: 'Update Location'
            },
            {
                id: 'roomTypes',
                title: 'Create Room Types',
                description: 'Define the categories of rooms available at your property.',
                isComplete: hasRoomTypes,
                icon: BedDouble,
                action: () => navigate('/room-types'),
                actionText: 'Manage Room Types'
            },
            {
                id: 'rooms',
                title: 'Add Rooms',
                description: 'Add physical rooms under your created room types.',
                isComplete: hasRooms,
                icon: BedDouble,
                action: () => navigate('/rooms'),
                actionText: 'Manage Rooms'
            },
            {
                id: 'images',
                title: 'Upload Property Images',
                description: 'Upload a cover image and at least one gallery image to showcase your property.',
                isComplete: hasImages,
                icon: ImageIcon,
                action: () => navigate('/my-property?tab=photos'),
                actionText: 'Upload Photos'
            },
            {
                id: 'policies',
                title: 'Set Cancellation Policies',
                description: 'Create at least one standard cancellation policy for bookings.',
                isComplete: hasPolicies,
                icon: FileText,
                action: () => navigate('/my-property?tab=policies'),
                actionText: 'Manage Policies'
            }
        ];
    }, [selectedProperty, roomTypes, rooms, policies, navigate]);

    // If property is pending/inactive, don't show this checklist (handled in DashboardHome usually)
    if (!selectedProperty || selectedProperty.status !== 'APPROVED') return null;

    const pendingItems = checklist.filter(item => !item.isComplete);
    const isReady = pendingItems.length === 0;

    if (isReady) return null;

    return (
        <>
            {/* Warning Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6 shadow-sm">
                <div className="flex items-start sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-amber-800 dark:text-amber-300 font-semibold text-sm sm:text-base">
                            Action Required: Complete your property profile
                        </h3>
                        <p className="text-amber-700 dark:text-amber-400/80 text-xs sm:text-sm mt-1">
                            Your property is missing {pendingItems.length} essential {pendingItems.length === 1 ? 'item' : 'items'}. It will not be fully visible to the public until these are resolved.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
                    >
                        View Checklist
                    </button>
                </div>
            </div>

            {/* Checklist Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Property Readiness Checklist
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Complete these items to make your property visible on the public site.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {checklist.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div 
                                        key={item.id}
                                        className={clsx(
                                            "flex items-start gap-4 p-4 rounded-2xl border transition-colors",
                                            item.isComplete 
                                                ? "bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700" 
                                                : "bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-900/50 shadow-sm"
                                        )}
                                    >
                                        <div className="mt-1">
                                            {item.isComplete ? (
                                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-6 w-6 text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={clsx(
                                                "font-semibold text-base flex items-center gap-2",
                                                item.isComplete ? "text-gray-900 dark:text-white" : "text-amber-900 dark:text-amber-100"
                                            )}>
                                                <Icon className="h-4 w-4" />
                                                {item.title}
                                            </h4>
                                            <p className={clsx(
                                                "text-sm mt-1 leading-relaxed",
                                                item.isComplete ? "text-gray-500 dark:text-gray-400" : "text-amber-700 dark:text-amber-400/80"
                                            )}>
                                                {item.description}
                                            </p>
                                        </div>
                                        {!item.isComplete && (
                                            <button
                                                onClick={() => {
                                                    setIsModalOpen(false);
                                                    item.action();
                                                }}
                                                className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-xl transition-colors"
                                            >
                                                {item.actionText}
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
