import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { bookingsService } from '../../services/bookings';
import { usersService } from '../../services/users';
import { roomTypesService } from '../../services/roomTypes';
import { bookingSourcesService } from '../../services/bookingSources';
import { offlineCpsService, type OfflineCP } from '../../services/offlineCps';
import { uploadService } from '../../services/uploads';
import { Loader2, Calendar, Users, UserPlus, CheckCircle, AlertCircle, ArrowLeft, Briefcase, Camera, ShieldCheck, X, Info, BedDouble, FileText } from 'lucide-react';
import clsx from 'clsx';
import SearchableSelect from '../../components/SearchableSelect';
import BookingAvailabilityCalendar from '../../components/bookings/BookingAvailabilityCalendar';
import type { PriceCalculationResult, CreateBookingDto } from '../../types/booking';
import type { RoomType } from '../../types/room';
import { useProperty } from '../../context/PropertyContext';

const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().optional(),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0),
    extraAdultsCount: z.number().min(0).optional(),
    extraChildrenCount: z.number().min(0).optional(),
    appliedCode: z.string().optional(),
    bookingSourceId: z.string().optional(),
    roomId: z.string().optional(),
    selectedRoomIds: z.array(z.string()).optional(),
    isManualBooking: z.boolean().optional(),
    isGroupBooking: z.boolean().optional(),
    groupSize: z.number().optional(),
    overrideTotal: z.number().optional(),
    isOverrideInclusive: z.boolean().optional(),
    overrideReason: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'ONLINE', 'WALLET']),
    paymentOption: z.enum(['FULL', 'PARTIAL']),
    paidAmount: z.number().optional(),
    isHistoricalEntry: z.boolean().optional(),
    transactionDate: z.string().optional(),
    guestFirstName: z.string().min(1, 'First name is required'),
    guestLastName: z.string().optional(),
    guestEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    guestPhone: z.string().min(1, 'Primary phone number is required'),
    whatsappNumber: z.string().optional(),
    isBookerAlsoGuest: z.boolean().optional(),
    gstNumber: z.string().optional(),
    specialRequests: z.string().optional(),
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().optional(),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        whatsappNumber: z.string().optional(),
        age: z.number().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        idImage: z.string().optional(),
        idImageBack: z.string().optional(),
    })).min(1, 'At least 1 guest is required'),
}).refine(data => {
    if (!data.isGroupBooking && !data.roomTypeId) return false;
    return true;
}, {
    message: "Room type is required for standard bookings",
    path: ["roomTypeId"]
}).refine(data => {
    if (data.isHistoricalEntry && !data.transactionDate) return false;
    return true;
}, {
    message: "Transaction date is required for historical entries",
    path: ["transactionDate"]
}).refine(data => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(data.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today && !data.isHistoricalEntry) return false;
    return true;
}, {
    message: "Backdate this booking (Historical Entry) must be enabled for past dates",
    path: ["isHistoricalEntry"]
}).refine(data => {
    if (data.isHistoricalEntry) {
        return data.guests.every(g => g.idType && g.idNumber);
    }
    return true;
}, {
    message: "Guest ID Type and Number are mandatory for ALL guests in historical entries. Please check all guest records.",
    path: ["guests"]
}).refine(data => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(data.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today && !data.isHistoricalEntry) return false;
    return true;
}, {
    message: "Backdate this booking (Historical Entry) must be enabled for past dates",
    path: ["isHistoricalEntry"]
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function CreateBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const state = location.state as { roomId?: string, roomTypeId?: string, startDate?: string, endDate?: string } | null;

    const { selectedProperty } = useProperty();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number; roomList?: any[]; allocationPreview?: any[]; groupUnavailableReason?: string } | null>(null);
    const [availableRoomTypesList, setAvailableRoomTypesList] = useState<any[] | null>(null);
    const [soldOutWarningId, setSoldOutWarningId] = useState<string | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [originalPriceDetails, setOriginalPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [showInsufficientModal, setShowInsufficientModal] = useState(false);
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; errors: string[] | React.ReactNode }>({
        isOpen: false,
        title: '',
        errors: [],
    });

    const preSelectedRoomId = state?.roomId || searchParams.get('roomId');
    const preSelectedRoomTypeId = state?.roomTypeId || searchParams.get('roomTypeId');
    const preSelectedStartDate = state?.startDate;
    const preSelectedEndDate = state?.endDate;

    const {
        register, control, handleSubmit, watch,
        formState: { errors }, getValues, setValue,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            propertyId: selectedProperty?.id || '',
            checkInDate: preSelectedStartDate || format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: preSelectedEndDate || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            adultsCount: 1, childrenCount: 0,
            extraAdultsCount: 0, extraChildrenCount: 0,
            roomTypeId: preSelectedRoomTypeId || '',
            roomId: preSelectedRoomId || undefined,
            selectedRoomIds: preSelectedRoomId ? [preSelectedRoomId] : [],
            isManualBooking: true,
            isGroupBooking: false,
            groupSize: undefined,
            overrideTotal: undefined,
            isOverrideInclusive: true,
            overrideReason: '',
            paymentMethod: 'CASH',
            paymentOption: 'FULL',
            paidAmount: undefined,
            appliedCode: '',
            isHistoricalEntry: false,
            transactionDate: format(new Date(), 'yyyy-MM-dd'),
            guestFirstName: '',
            guestLastName: '',
            guestEmail: '',
            guestPhone: '',
            whatsappNumber: '',
            isBookerAlsoGuest: true,
            guests: [{ firstName: '', lastName: '', idImage: '', idImageBack: '' }],
        },
    });

    const [phoneSearchResults, setPhoneSearchResults] = useState<any[]>([]);
    const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
    const isFirstRender = useRef(true);

    // Auto-set property and detect historical entries
    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

    const watchedCheckInDate = watch('checkInDate');
    const watchedIsHistorical = watch('isHistoricalEntry');

    useEffect(() => {
        if (!watchedCheckInDate) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkIn = new Date(watchedCheckInDate);
        checkIn.setHours(0, 0, 0, 0);

        if (checkIn < today) {
            if (!watchedIsHistorical) {
                setValue('isHistoricalEntry', true);
                setValue('transactionDate', watchedCheckInDate);
                toast('Backdated stay detected. Enabling Historical Entry mode.', {
                    icon: '⏳',
                    duration: 4000
                });
            }
        }
    }, [watchedCheckInDate, setValue]);

    // Automatically set checkOutDate to checkInDate + 1 when checkInDate is changed by the user
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (!watchedCheckInDate) return;
        const checkIn = new Date(watchedCheckInDate);
        if (!isNaN(checkIn.getTime())) {
            const nextDay = addDays(checkIn, 1);
            setValue('checkOutDate', format(nextDay, 'yyyy-MM-dd'));
            // Trigger availability recheck if needed
            if (availability?.available) {
                handleCheckAvailability();
            }
        }
    }, [watchedCheckInDate, setValue]);

    const isBookerAlsoGuest = watch('isBookerAlsoGuest');
    const guestFirstName = watch('guestFirstName');
    const guestLastName = watch('guestLastName');
    const guestEmail = watch('guestEmail');
    const guestPhone = watch('guestPhone');
    const whatsappNumber = watch('whatsappNumber');

    useEffect(() => {
        if (isBookerAlsoGuest) {
            setValue('guests.0.firstName', guestFirstName || '');
            setValue('guests.0.lastName', guestLastName || '');
            setValue('guests.0.email', guestEmail || '');
            setValue('guests.0.phone', guestPhone || '');
            setValue('guests.0.whatsappNumber', whatsappNumber || '');
        }
    }, [isBookerAlsoGuest, guestFirstName, guestLastName, guestEmail, guestPhone, whatsappNumber, setValue]);

    useEffect(() => {
        const fetchCustomers = async () => {
            if (guestPhone && guestPhone.length >= 5) {
                try {
                    const results = await usersService.getAll({ search: guestPhone, propertyId: selectedProperty?.id });
                    setPhoneSearchResults(results);
                    setShowPhoneDropdown(true);
                } catch (error) {
                    console.error('Failed to search customers', error);
                }
            } else {
                setPhoneSearchResults([]);
                setShowPhoneDropdown(false);
            }
        };

        const timeoutId = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(timeoutId);
    }, [guestPhone, selectedProperty?.id]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.phone-autocomplete-container')) {
                setShowPhoneDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const selectedRoomTypeId = watch('roomTypeId');
    const selectedRoomType = useMemo(() => {
        return roomTypes?.find(rt => rt.id === selectedRoomTypeId);
    }, [roomTypes, selectedRoomTypeId]);

    const requiredRooms = useMemo(() => {
        if (!selectedRoomType) return 1;
        const baseA = selectedRoomType.baseAdults ?? selectedRoomType.maxAdults ?? 2;
        const baseC = selectedRoomType.baseChildren ?? selectedRoomType.maxChildren ?? 0;
        const adultsCount = Number(watch('adultsCount')) || 1;
        const childrenCount = Number(watch('childrenCount')) || 0;

        const roomsByAdults = Math.ceil(adultsCount / Math.max(baseA, 1));
        const roomsByChildren = childrenCount > 0 ? Math.ceil(childrenCount / Math.max(baseC, 1)) : 0;

        return Math.max(roomsByAdults, roomsByChildren, 1);
    }, [selectedRoomType, watch('adultsCount'), watch('childrenCount')]);

    const sortedRoomTypesList = useMemo(() => {
        if (!availableRoomTypesList) return [];
        const adults = Number(watch('adultsCount')) || 1;
        return [...availableRoomTypesList].sort((a, b) => {
            const aPhysA = a.maxPhysicalAdults ?? a.maxAdults ?? 2;
            const bPhysA = b.maxPhysicalAdults ?? b.maxAdults ?? 2;
            const aNeeded = a.neededRooms || Math.max(1, Math.ceil(adults / Math.max(aPhysA, 1)));
            const bNeeded = b.neededRooms || Math.max(1, Math.ceil(adults / Math.max(bPhysA, 1)));

            const aSoldOut = a.isSoldOut || (a.availableCount !== undefined && a.availableCount < aNeeded);
            const bSoldOut = b.isSoldOut || (b.availableCount !== undefined && b.availableCount < bNeeded);

            if (aSoldOut && !bSoldOut) return 1;
            if (!aSoldOut && bSoldOut) return -1;
            return 0;
        });
    }, [availableRoomTypesList, watch('adultsCount')]);

    const occupancyStats = useMemo(() => {
        if (!selectedRoomType) return null;
        const selectedCount = (watch('selectedRoomIds') || []).length;
        const adultsCount = Number(watch('adultsCount')) || 1;
        const childrenCount = Number(watch('childrenCount')) || 0;

        const baseAdultsPerRoom = selectedRoomType.baseAdults ?? selectedRoomType.maxAdults ?? 2;
        const baseChildrenPerRoom = selectedRoomType.baseChildren ?? selectedRoomType.maxChildren ?? 1;
        const maxPhysicalAdultsPerRoom = selectedRoomType.maxPhysicalAdults ?? selectedRoomType.maxAdults ?? 2;
        const maxPhysicalChildrenPerRoom = selectedRoomType.maxPhysicalChildren ?? selectedRoomType.maxChildren ?? 1;

        const totalBaseAdults = selectedCount * baseAdultsPerRoom;
        const totalBaseChildren = selectedCount * baseChildrenPerRoom;
        const totalMaxPhysicalAdults = selectedCount * maxPhysicalAdultsPerRoom;
        const totalMaxPhysicalChildren = selectedCount * maxPhysicalChildrenPerRoom;

        const minRoomsByMaxCap = Math.max(1, Math.ceil(adultsCount / Math.max(maxPhysicalAdultsPerRoom, 1)));
        const roomsByBaseCap = Math.max(1, Math.ceil(adultsCount / Math.max(baseAdultsPerRoom, 1)));

        const isPhysicallyInsufficient = selectedCount > 0 && adultsCount > totalMaxPhysicalAdults;
        const isExtraBedsRequired = selectedCount > 0 && adultsCount > totalBaseAdults && adultsCount <= totalMaxPhysicalAdults;
        const isStandardFit = selectedCount > 0 && adultsCount <= totalBaseAdults;

        const extraAdultsNeeded = Math.max(0, adultsCount - totalBaseAdults);

        return {
            selectedCount,
            adultsCount,
            childrenCount,
            baseAdultsPerRoom,
            maxPhysicalAdultsPerRoom,
            totalBaseAdults,
            totalMaxPhysicalAdults,
            minRoomsByMaxCap,
            roomsByBaseCap,
            isPhysicallyInsufficient,
            isExtraBedsRequired,
            isStandardFit,
            extraAdultsNeeded,
        };
    }, [selectedRoomType, watch('selectedRoomIds'), watch('adultsCount'), watch('childrenCount')]);

    const { data: _bookingSources } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: () => bookingSourcesService.getAll(),
    });

    const [isOfflineCpBooking, setIsOfflineCpBooking] = useState(false);
    const [selectedOfflineCpId, setSelectedOfflineCpId] = useState<string>('NEW');
    const [newOfflineCpName, setNewOfflineCpName] = useState('');
    const [newOfflineCpPhone, setNewOfflineCpPhone] = useState('');
    const [offlineCpCommission, setOfflineCpCommission] = useState<number>(0);

    const watchPropertyId = watch('propertyId');
    const { data: offlineCps } = useQuery<OfflineCP[]>({
        queryKey: ['offlineCps', watchPropertyId],
        queryFn: () => offlineCpsService.getAllForProperty(watchPropertyId!),
        enabled: !!watchPropertyId,
    });

    useEffect(() => {
        if (preSelectedRoomId && preSelectedRoomTypeId) handleCheckAvailability();
    }, [preSelectedRoomId, preSelectedRoomTypeId]);

    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

    const [idUploading, setIdUploading] = useState<Record<string, boolean>>({});

    const handleGuestFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadKey = isBack ? `back-${index}` : `front-${index}`;
        setIdUploading(prev => ({ ...prev, [uploadKey]: true }));
        try {
            const data = await uploadService.upload(file);
            setValue(`guests.${index}.${isBack ? 'idImageBack' : 'idImage'}`, data.url);
            toast.success(`Guest ${index + 1} ID ${isBack ? 'Back' : 'Front'} uploaded`);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(`Failed to upload ID ${isBack ? 'Back' : 'Front'} for Guest ${index + 1}`);
        } finally {
            setIdUploading(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const isGroupMode = !!watch('isGroupBooking');

    const handleCheckAvailability = async (overrideRoomTypeId?: string) => {
        const values = getValues();
        const isGroup = values.isGroupBooking;
        const targetRoomTypeId = overrideRoomTypeId !== undefined ? overrideRoomTypeId : values.roomTypeId;

        // --- Validation ---
        const errors: string[] = [];
        if (!values.checkInDate) errors.push('Check-in date is required');
        if (!values.checkOutDate) errors.push('Check-out date is required');
        if (values.checkInDate && values.checkOutDate) {
            const checkIn = new Date(values.checkInDate);
            const checkOut = new Date(values.checkOutDate);
            if (checkOut <= checkIn) errors.push('Check-out date must be after check-in date');
        }
        if (isGroup && (!values.groupSize || Number(values.groupSize) < 2)) errors.push('Group size must be at least 2 guests');
        if (!values.adultsCount || Number(values.adultsCount) < 1) errors.push('At least 1 adult is required');

        if (errors.length > 0) {
            setErrorModal({
                isOpen: true,
                title: 'Validation Errors',
                errors: errors
            });
            return;
        }

        setCheckingAvailability(true);

        try {
            // For standard bookings, search across all room types for the property
            if (!isGroup && values.propertyId) {
                try {
                    const searchRes = await bookingsService.searchRooms({
                        propertyId: values.propertyId,
                        checkInDate: values.checkInDate,
                        checkOutDate: values.checkOutDate,
                        adults: Number(values.adultsCount),
                        children: Number(values.childrenCount || 0),
                        includeSoldOut: true,
                    });
                    if (searchRes.availableRoomTypes && searchRes.availableRoomTypes.length > 0) {
                        setAvailableRoomTypesList(searchRes.availableRoomTypes);
                    } else if (roomTypes && roomTypes.length > 0) {
                        const fallbackList = roomTypes.map((rt: any) => {
                            const physA = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
                            const physC = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
                            const nRooms = Math.max(
                                Math.ceil(Number(values.adultsCount || 1) / Math.max(physA, 1)),
                                Number(values.childrenCount || 0) > 0 ? Math.ceil(Number(values.childrenCount) / Math.max(physC, 1)) : 0,
                                1
                            );
                            const totalRooms = rt.rooms?.filter((r: any) => r.isEnabled)?.length ?? rt._count?.rooms ?? 1;
                            return {
                                ...rt,
                                neededRooms: nRooms,
                                availableCount: totalRooms,
                                isSoldOut: totalRooms < nRooms,
                            };
                        });
                        setAvailableRoomTypesList(fallbackList);
                    }
                } catch (searchErr) {
                    console.error('Failed to search room types:', searchErr);
                }
            }

            // If a room type is selected (or in group mode), fetch detailed availability and calculate price
            if (targetRoomTypeId || isGroup) {
                const avail = await bookingsService.checkAvailability({
                    roomTypeId: targetRoomTypeId || undefined,
                    checkInDate: values.checkInDate,
                    checkOutDate: values.checkOutDate,
                    isGroupBooking: isGroup,
                    groupSize: isGroup ? Number(values.groupSize) : undefined,
                    propertyId: values.propertyId,
                    isAdmin: true,
                });
                setAvailability(avail);

                if (avail.available) {
                    let currentValues = getValues();

                    // For group bookings, auto-populate suggested rooms if none selected yet
                    if (isGroup && avail.allocationPreview && (!currentValues.selectedRoomIds || currentValues.selectedRoomIds.length === 0)) {
                        const suggestedIds = avail.allocationPreview.map((r: any) => r.id);
                        setValue('selectedRoomIds', suggestedIds);
                        currentValues = getValues();
                    }

                    // For standard bookings, compute needed rooms and auto-select
                    if (!isGroup) {
                        const currentRoomType = roomTypes?.find(rt => rt.id === targetRoomTypeId);
                        const rBaseA = currentRoomType?.baseAdults ?? currentRoomType?.maxAdults ?? 2;
                        const rBaseC = currentRoomType?.baseChildren ?? currentRoomType?.maxChildren ?? 0;
                        const reqRooms = Math.max(
                            Math.ceil(Number(currentValues.adultsCount || 1) / Math.max(rBaseA, 1)),
                            Number(currentValues.childrenCount || 0) > 0 ? Math.ceil(Number(currentValues.childrenCount) / Math.max(rBaseC, 1)) : 0,
                            1
                        );

                        const availablePool = avail.roomList || [];
                        const validSelected = (currentValues.selectedRoomIds || []).filter(id =>
                            availablePool.some((r: any) => r.id === id)
                        );

                        let finalSelection: string[] = [];
                        if (validSelected.length >= reqRooms) {
                            // Truncate to required rooms if user reduced guest count
                            finalSelection = validSelected.slice(0, reqRooms);
                        } else {
                            // Keep already selected rooms and auto-pick recommended ones up to reqRooms
                            const neededMore = reqRooms - validSelected.length;
                            const unselected = availablePool
                                .filter((r: any) => !validSelected.includes(r.id))
                                .map((r: any) => r.id);
                            finalSelection = [...validSelected, ...unselected.slice(0, neededMore)];
                        }

                        setValue('selectedRoomIds', finalSelection);
                        currentValues = getValues();
                    }

                    // If check availability returns less rooms than required, show the modal warning
                    if (!isGroup) {
                        const selectedCount = (currentValues.selectedRoomIds || []).length;
                        if (selectedCount < requiredRooms) {
                            setShowInsufficientModal(true);
                        }
                    }

                    const roomCount = (currentValues.selectedRoomIds && currentValues.selectedRoomIds.length > 0)
                        ? currentValues.selectedRoomIds.length
                        : (isGroup ? (avail.allocationPreview?.length || 1) : requiredRooms);

                    const priceParams = {
                        roomTypeId: isGroup ? (avail.allocationPreview?.[0]?.roomTypeId || targetRoomTypeId) : targetRoomTypeId,
                        checkInDate: currentValues.checkInDate,
                        checkOutDate: currentValues.checkOutDate,
                        adultsCount: Number(currentValues.adultsCount),
                        childrenCount: Number(currentValues.childrenCount),
                        extraAdultsCount: Number(currentValues.extraAdultsCount || 0),
                        extraChildrenCount: Number(currentValues.extraChildrenCount || 0),
                        isGroupBooking: isGroup,
                        groupSize: isGroup ? Number(currentValues.groupSize) : undefined,
                        roomCount,
                        generalCode: currentValues.appliedCode,
                    };

                    // Always calculate the ORIGINAL price (without override) for the top breakdown
                    const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
                    setOriginalPriceDetails(originalPrice);

                    // If override is set, also calculate override price separately
                    if (currentValues.overrideTotal) {
                        const overridePrice = await (bookingsService as any).calculatePrice({
                            ...priceParams,
                            overrideTotal: Number(currentValues.overrideTotal),
                            isOverrideInclusive: currentValues.isOverrideInclusive,
                        });
                        setPriceDetails(overridePrice);
                    } else {
                        setPriceDetails(originalPrice);
                    }
                } else {
                    setPriceDetails(null);
                    setOriginalPriceDetails(null);
                }
            } else {
                setAvailability(null);
                setPriceDetails(null);
                setOriginalPriceDetails(null);
            }
        } catch (error: any) {
            console.error('Error checking availability:', error);
            const message = error.response?.data?.message || 'Failed to check availability';
            setErrorModal({
                isOpen: true,
                title: 'Availability Check Failed',
                errors: [typeof message === 'string' ? message : JSON.stringify(message)]
            });
        } finally {
            setCheckingAvailability(false);
        }
    };

    const handleSelectRoomType = (roomTypeId: string) => {
        setValue('roomTypeId', roomTypeId);
        setValue('roomId', '');
        setValue('selectedRoomIds', []);
        setValue('extraAdultsCount', 0);
        setValue('extraChildrenCount', 0);
        handleCheckAvailability(roomTypeId);
    };

    const handleToggleRoom = async (roomId: string) => {
        const current = watch('selectedRoomIds') || [];
        const next = current.includes(roomId)
            ? current.filter(id => id !== roomId)
            : [...current, roomId];
        setValue('selectedRoomIds', next);
        setValue('roomId', next[0] || '');

        const currentValues = getValues();
        const isGroup = currentValues.isGroupBooking;
        const targetRoomTypeId = currentValues.roomTypeId;
        const roomCount = next.length;

        if (roomCount > 0 && (targetRoomTypeId || isGroup)) {
            const priceParams = {
                roomTypeId: isGroup ? (availability?.allocationPreview?.[0]?.roomTypeId || targetRoomTypeId) : targetRoomTypeId,
                checkInDate: currentValues.checkInDate,
                checkOutDate: currentValues.checkOutDate,
                adultsCount: Number(currentValues.adultsCount),
                childrenCount: Number(currentValues.childrenCount),
                extraAdultsCount: Number(currentValues.extraAdultsCount || 0),
                extraChildrenCount: Number(currentValues.extraChildrenCount || 0),
                isGroupBooking: isGroup,
                groupSize: isGroup ? Number(currentValues.groupSize) : undefined,
                roomCount,
                generalCode: currentValues.appliedCode,
            };

            try {
                const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
                setOriginalPriceDetails(originalPrice);

                if (currentValues.overrideTotal) {
                    const overridePrice = await (bookingsService as any).calculatePrice({
                        ...priceParams,
                        overrideTotal: Number(currentValues.overrideTotal),
                        isOverrideInclusive: currentValues.isOverrideInclusive,
                    });
                    setPriceDetails(overridePrice);
                } else {
                    setPriceDetails(originalPrice);
                }
            } catch (e) {
                console.error('Failed to recalculate price on room toggle', e);
            }
        } else if (roomCount === 0) {
            setPriceDetails(null);
            setOriginalPriceDetails(null);
        }
    };

    const handleAutoSelectRooms = async (targetCount: number, autoSetExtraBeds = false) => {
        if (!availability?.roomList) return;
        const targetRooms = availability.roomList.slice(0, targetCount).map((r: any) => r.id);
        setValue('selectedRoomIds', targetRooms);
        setValue('roomId', targetRooms[0] || '');

        const currentValues = getValues();
        const adultsCount = Number(currentValues.adultsCount) || 1;
        const baseA = selectedRoomType?.baseAdults ?? selectedRoomType?.maxAdults ?? 2;
        const baseCap = targetRooms.length * baseA;
        const extraAdultsNeeded = autoSetExtraBeds ? Math.max(0, adultsCount - baseCap) : 0;

        setValue('extraAdultsCount', extraAdultsNeeded);

        const priceParams = {
            roomTypeId: currentValues.roomTypeId,
            checkInDate: currentValues.checkInDate,
            checkOutDate: currentValues.checkOutDate,
            adultsCount: Number(currentValues.adultsCount),
            childrenCount: Number(currentValues.childrenCount),
            extraAdultsCount: extraAdultsNeeded,
            extraChildrenCount: Number(currentValues.extraChildrenCount || 0),
            isGroupBooking: false,
            roomCount: targetRooms.length,
            generalCode: currentValues.appliedCode,
        };

        try {
            const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
            setOriginalPriceDetails(originalPrice);
            if (currentValues.overrideTotal) {
                const overridePrice = await (bookingsService as any).calculatePrice({
                    ...priceParams,
                    overrideTotal: Number(currentValues.overrideTotal),
                    isOverrideInclusive: currentValues.isOverrideInclusive,
                });
                setPriceDetails(overridePrice);
            } else {
                setPriceDetails(originalPrice);
            }
            toast.success(`Selected ${targetRooms.length} room${targetRooms.length > 1 ? 's' : ''} (${extraAdultsNeeded > 0 ? `${extraAdultsNeeded} extra beds applied` : 'standard base occupancy'}).`);
        } catch (e) {
            console.error('Failed to recalculate price on auto-select', e);
        }
    };

    const handleSetExtraGuests = async (extraAdults: number, extraChildren?: number) => {
        setValue('extraAdultsCount', extraAdults);
        if (extraChildren !== undefined) setValue('extraChildrenCount', extraChildren);

        const currentValues = getValues();
        const roomCount = (currentValues.selectedRoomIds || []).length || 1;

        const priceParams = {
            roomTypeId: currentValues.roomTypeId,
            checkInDate: currentValues.checkInDate,
            checkOutDate: currentValues.checkOutDate,
            adultsCount: Number(currentValues.adultsCount),
            childrenCount: Number(currentValues.childrenCount),
            extraAdultsCount: extraAdults,
            extraChildrenCount: extraChildren !== undefined ? extraChildren : Number(currentValues.extraChildrenCount || 0),
            isGroupBooking: false,
            roomCount,
            generalCode: currentValues.appliedCode,
        };

        try {
            const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
            setOriginalPriceDetails(originalPrice);
            if (currentValues.overrideTotal) {
                const overridePrice = await (bookingsService as any).calculatePrice({
                    ...priceParams,
                    overrideTotal: Number(currentValues.overrideTotal),
                    isOverrideInclusive: currentValues.isOverrideInclusive,
                });
                setPriceDetails(overridePrice);
            } else {
                setPriceDetails(originalPrice);
            }
            toast.success(`Applied ${extraAdults} extra adult bed(s) in pricing.`);
        } catch (e) {
            console.error('Failed to recalculate price on extra guest set', e);
        }
    };

    const createBookingMutation = useMutation({
        mutationFn: bookingsService.create,
        onSuccess: () => {
            toast.success('Booking created successfully');
            navigate('/bookings');
        },
        onError: (error: any) => {
            setErrorModal({
                isOpen: true,
                title: 'Booking Creation Failed',
                errors: [error.response?.data?.message || 'Failed to create booking']
            });
        },
    });

    const onSubmit = (data: BookingFormData) => {
        if (!availability?.available) {
            setErrorModal({
                isOpen: true,
                title: 'Action Required',
                errors: ['Please check room availability first before submitting the booking.']
            });
            return;
        }

        if (!data.isGroupBooking) {
            const selectedCount = (data.selectedRoomIds || []).length;
            const minAllowedRooms = occupancyStats?.minRoomsByMaxCap || requiredRooms;
            if (selectedCount < minAllowedRooms) {
                setShowInsufficientModal(true);
                return;
            }
        }

        // Remove propertyId (unless needed for group allocation) and other non-DTO fields
        const { propertyId, paymentOption, appliedCode, guestFirstName, guestLastName, guestEmail, guestPhone, isBookerAlsoGuest, ...rest } = data;

        const sanitizedData = {
            ...rest,
            guestName: `${guestFirstName} ${guestLastName || ''}`.trim(),
            guestEmail: guestEmail || undefined,
            guestPhone: guestPhone,
            transactionDate: data.isHistoricalEntry ? data.transactionDate : undefined,
            generalCode: appliedCode || undefined,
            roomTypeId: data.isGroupBooking ? undefined : rest.roomTypeId,  // clear stale roomTypeId for group bookings
            propertyId: data.isGroupBooking ? propertyId : undefined,
            bookingSourceId: data.bookingSourceId || undefined,
            roomId: data.selectedRoomIds && data.selectedRoomIds.length > 0 ? data.selectedRoomIds[0] : (data.roomId || undefined),
            selectedRoomIds: data.selectedRoomIds || undefined,
            overrideTotal: data.overrideTotal ? Number(data.overrideTotal) : undefined,
            isOverrideInclusive: data.isOverrideInclusive,
            paymentMethod: data.isManualBooking ? data.paymentMethod : 'ONLINE',
            paidAmount: data.isHistoricalEntry
                ? (data.overrideTotal || priceDetails?.totalAmount)
                : (data.isManualBooking
                    ? (paymentOption === 'FULL'
                        ? (data.overrideTotal || priceDetails?.totalAmount)
                        : (data.paidAmount || 0))
                    : undefined),
            paymentOption: data.isHistoricalEntry ? 'FULL' : paymentOption,
            offlineCpId: isOfflineCpBooking && selectedOfflineCpId !== 'NEW' ? selectedOfflineCpId : undefined,
            offlineCpCommission: isOfflineCpBooking ? offlineCpCommission : undefined,
            newOfflineCpName: isOfflineCpBooking && selectedOfflineCpId === 'NEW' ? newOfflineCpName : undefined,
            newOfflineCpPhone: isOfflineCpBooking && selectedOfflineCpId === 'NEW' ? newOfflineCpPhone : undefined,
        };
        createBookingMutation.mutate(sanitizedData as CreateBookingDto);
    };

    if (loadingRoomTypes) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-[1400px] mx-auto pb-16 px-4 xl:px-8">
            {/* Full Page Loader Overlay */}
            {createBookingMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-widest">Creating Booking...</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-2">Please wait, do not close or refresh this page.</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/bookings');
                            }
                        }}
                        className="p-2.5 hover:bg-muted rounded-full border border-border shadow-sm transition-all hover:scale-105 active:scale-95 bg-card"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Resort Operations</span>
                        <h1 className="text-3xl font-black text-foreground tracking-tight mt-0.5">Create New Booking</h1>
                    </div>
                </div>
                {/* Visual badge/status */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-wider text-primary w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Frontdesk Console
                </div>
            </div>

            {/* Top Warning Banner for Backdated / Historical Stays (Sticky) */}
            {watch('isHistoricalEntry') && (
                <div className="sticky top-16 z-30 mb-6 p-4 sm:p-5 bg-amber-50/95 dark:bg-amber-950/90 backdrop-blur-md border-2 border-amber-500/80 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 flex items-start gap-3 text-amber-900 dark:text-amber-200 transition-all">
                    <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            ⚠️ Backdated Historical Booking Mode Active
                        </h3>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300/90 leading-relaxed">
                            You are creating a historical record for a past stay. Guest ID type & number are mandatory, the system will record full payment automatically, and booking status will be set directly to <strong>Checked Out</strong>.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                <div className="xl:col-span-5 space-y-6">
                    <form id="create-booking-form" onSubmit={handleSubmit(onSubmit, (errs) => {
                        console.log('Form Errors:', errs);
                        const fieldNames = Object.keys(errs).map(key => {
                            if (key === 'guests') return 'Guest Details (ID mandatory for historical stays)';
                            if (key === 'isHistoricalEntry') return 'Backdate Checkbox';
                            return key.replace(/([A-Z])/g, ' $1').toLowerCase();
                        });

                        setErrorModal({
                            isOpen: true,
                            title: 'Validation Errors',
                            errors: fieldNames.map(name => name.charAt(0).toUpperCase() + name.slice(1))
                        });
                    })} className="space-y-6">

                        {/* ── Mobile Price Summary Bar (hidden on lg+) ── */}
                        {priceDetails && (
                            <div className="lg:hidden sticky top-[70px] z-10 -mx-4 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border shadow-md">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Price</span>
                                        {watch('overrideTotal') && (
                                            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full shrink-0">Override</span>
                                        )}
                                        <div className="flex items-center gap-2 min-w-0 truncate">
                                            {watch('overrideTotal') && originalPriceDetails && (
                                                <span className="text-xs text-muted-foreground line-through font-semibold shrink-0">₹{originalPriceDetails.totalAmount.toFixed(0)}</span>
                                            )}
                                            <span className={`font-extrabold text-xl tracking-tight shrink-0 ${watch('overrideTotal') ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                                                ₹{watch('overrideTotal')
                                                    ? (watch('isOverrideInclusive') ? watch('overrideTotal')! : watch('overrideTotal')! * (1 + priceDetails.taxRate / 100)).toFixed(2)
                                                    : priceDetails.totalAmount.toFixed(2)
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold shrink-0">
                                        <span>{priceDetails.numberOfNights}N</span>
                                        <span className="h-3 w-px bg-border"></span>
                                        <span>GST {priceDetails.taxRate}%</span>
                                        {watch('overrideTotal') && (
                                            <>
                                                <span className="h-3 w-px bg-border"></span>
                                                <span className="text-muted-foreground">Base: ₹{(originalPriceDetails || priceDetails).totalAmount.toFixed(0)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Historical Entry Option (Top Placement) */}
                        {
                            watch('isManualBooking') && (
                                <div className={clsx(
                                    "p-5 border-2 rounded-2xl transition-all duration-300 shadow-sm",
                                    watch('isHistoricalEntry')
                                        ? "border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20"
                                        : "border-gray-200/80 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20"
                                )}>
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            {...register('isHistoricalEntry')}
                                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500/40 w-4.5 h-4.5 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                Backdate this booking (Historical Entry)
                                            </span>
                                            {watchedCheckInDate && new Date(watchedCheckInDate) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                                                <span className="text-[10px] text-orange-600 font-extrabold uppercase mt-0.5 tracking-wider">Required for past dates</span>
                                            )}
                                        </div>
                                    </label>
                                    {errors.isHistoricalEntry && <p className="text-red-500 text-xs mt-1 font-bold">{errors.isHistoricalEntry.message}</p>}
                                    {watch('isHistoricalEntry') && (
                                        <div className="pl-6 pt-3 animate-in slide-in-from-top-3 duration-300 space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Original Transaction Date</label>
                                                <input
                                                    type="date"
                                                    {...register('transactionDate')}
                                                    className="border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-semibold w-full md:w-64 cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                                />
                                                {errors.transactionDate && <p className="text-red-500 text-xs mt-1">{errors.transactionDate.message}</p>}
                                            </div>

                                            <div className="p-4 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-black uppercase mb-1.5 flex items-center gap-1">
                                                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Historical Verification Rules
                                                </p>
                                                <ul className="text-[10px] text-amber-800 dark:text-amber-200/80 list-disc pl-4 space-y-1 font-medium">
                                                    <li>Guest ID details are **mandatory** (Type & Number)</li>
                                                    <li>System will record **Full Payment** automatically</li>
                                                    <li>Booking status will be set to **Checked Out**</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {/* Booking Details */}
                        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <Calendar className="h-5 w-5 text-primary" /> Booking Details
                                </h2>

                                <div className="flex bg-muted p-1 rounded-xl w-fit border border-border shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('isGroupBooking', false);
                                        }}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300',
                                            !isGroupMode
                                                ? 'bg-card text-primary shadow-md ring-1 ring-black/5'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Standard Booking
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('isGroupBooking', true);
                                            setValue('groupSize', getValues('adultsCount') + getValues('childrenCount'));
                                        }}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300',
                                            isGroupMode
                                                ? 'bg-card text-primary shadow-md ring-1 ring-black/5'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Group Booking
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Stay Dates (First) */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary" /> Check-in Date
                                    </label>
                                    <div 
                                        onClick={() => {
                                            if (window.innerWidth < 1280) setShowMobileCalendar(true);
                                        }}
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary hover:border-primary/50 transition-all flex items-center justify-between xl:hidden"
                                    >
                                        <span>{watch('checkInDate') ? format(new Date(watch('checkInDate')), 'yyyy-MM-dd') : 'Select Date'}</span>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input 
                                        type="date" 
                                        {...register('checkInDate')} 
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all hidden xl:block" 
                                    />
                                    {errors.checkInDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkInDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary" /> Check-out Date
                                    </label>
                                    <div 
                                        onClick={() => {
                                            if (window.innerWidth < 1280) setShowMobileCalendar(true);
                                        }}
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary hover:border-primary/50 transition-all flex items-center justify-between xl:hidden"
                                    >
                                        <span>{watch('checkOutDate') ? format(new Date(watch('checkOutDate')), 'yyyy-MM-dd') : 'Select Date'}</span>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input 
                                        type="date" 
                                        {...register('checkOutDate')} 
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all hidden xl:block" 
                                    />
                                    {errors.checkOutDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkOutDate.message}</p>}
                                </div>

                                {/* Guests & Capacity (Second) */}
                                <div className="md:col-span-2 space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Guests & Capacity</label>
                                    {isGroupMode ? (
                                        <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-foreground">
                                                <Users className="h-4 w-4 text-primary" />
                                                <span>Total Group Guests</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Adults</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        {...register('adultsCount', {
                                                            valueAsNumber: true,
                                                            onChange: (e) => {
                                                                setValue('groupSize', (parseInt(e.target.value) || 1) + (watch('childrenCount') || 0));
                                                            }
                                                        })}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Children</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        {...register('childrenCount', {
                                                            valueAsNumber: true,
                                                            onChange: (e) => {
                                                                setValue('groupSize', (watch('adultsCount') || 1) + (parseInt(e.target.value) || 0));
                                                            }
                                                        })}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-foreground">
                                                    <Users className="h-4 w-4 text-primary" />
                                                    <span>Standard Guests</span>
                                                </div>
                                                {selectedRoomType && (
                                                    <span className="text-[10px] font-extrabold text-primary/80 bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                                        Base Covers: {selectedRoomType.baseAdults ?? selectedRoomType.maxAdults ?? 2} Adults, {selectedRoomType.baseChildren ?? selectedRoomType.maxChildren ?? 1} Children
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Adults</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        {...register('adultsCount', { valueAsNumber: true })}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Children</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        {...register('childrenCount', { valueAsNumber: true })}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Check Room Availability Button (Third) */}
                                <div className="md:col-span-2">
                                    <hr className="my-2 border-border" />
                                    <button 
                                        type="button" 
                                        onClick={() => handleCheckAvailability()} 
                                        disabled={checkingAvailability}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 px-6 py-3.5 rounded-xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none cursor-pointer"
                                    >
                                        {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
                                        {checkingAvailability ? 'Verifying Availability...' : 'Check Room Availability'}
                                    </button>
                                </div>

                                {/* Available Room Types Grid (Fourth - Standard Bookings) */}
                                {!isGroupMode && sortedRoomTypesList && sortedRoomTypesList.length > 0 && (
                                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-border">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                                                <BedDouble className="h-4 w-4 text-primary" />
                                                Available Room Types ({sortedRoomTypesList.length})
                                            </h3>
                                            <span className="text-[10px] text-muted-foreground font-bold">
                                                Select an available room type to view rooms & rates
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {sortedRoomTypesList.map((rt: any) => {
                                                const isSelected = watch('roomTypeId') === rt.id;
                                                const physAdults = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
                                                const physChildren = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
                                                const neededRooms = rt.neededRooms || Math.max(1, Math.ceil(Number(watch('adultsCount') || 1) / Math.max(physAdults, 1)));
                                                const isSoldOut = rt.isSoldOut || (rt.availableCount !== undefined && rt.availableCount < neededRooms);
                                                const showWarning = isSoldOut && soldOutWarningId === rt.id;

                                                return (
                                                    <div 
                                                        key={rt.id} 
                                                        onClick={() => {
                                                            if (!isSoldOut) {
                                                                setSoldOutWarningId(null);
                                                                handleSelectRoomType(rt.id);
                                                            } else {
                                                                setSoldOutWarningId(prev => prev === rt.id ? null : rt.id);
                                                            }
                                                        }}
                                                        className={clsx(
                                                            "p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer group shadow-xs",
                                                            isSelected 
                                                                ? "bg-primary/5 border-primary ring-2 ring-primary/20 shadow-md"
                                                                : isSoldOut
                                                                    ? "bg-muted/20 border-rose-500/20 hover:border-rose-500/40 opacity-80"
                                                                    : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                                                        )}
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <h4 className={clsx("text-sm font-black transition-colors", isSelected ? "text-primary" : "text-foreground group-hover:text-primary")}>
                                                                        {rt.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        <p className="text-[11px] text-muted-foreground font-medium">
                                                                            Cap: {physAdults} Adults, {physChildren} Children
                                                                        </p>
                                                                        {neededRooms > 1 && (
                                                                            <span className={clsx(
                                                                                "text-[10px] font-extrabold px-2 py-0.5 rounded border",
                                                                                isSoldOut
                                                                                    ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40"
                                                                                    : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40"
                                                                            )}>
                                                                                {neededRooms} Rooms Needed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={clsx(
                                                                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0",
                                                                    isSoldOut
                                                                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                )}>
                                                                    {isSoldOut ? 'Sold Out' : `${rt.availableCount ?? (rt.rooms?.length || 1)} Left`}
                                                                </span>
                                                            </div>

                                                            {rt.amenities && rt.amenities.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 pt-1">
                                                                    {rt.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                                                                        <span key={idx} className="text-[9px] bg-muted px-2 py-0.5 rounded-md font-semibold text-muted-foreground">
                                                                            {amenity}
                                                                        </span>
                                                                    ))}
                                                                    {rt.amenities.length > 3 && (
                                                                        <span className="text-[9px] text-muted-foreground font-semibold">+{rt.amenities.length - 3}</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Inline Warning Message on Sold Out Click */}
                                                            {showWarning && (
                                                                <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                                                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="font-bold text-[11px]">Insufficient Rooms Available</p>
                                                                        <p className="text-[10.5px] opacity-90 leading-tight mt-0.5">
                                                                            Requires <strong>{neededRooms} rooms</strong> for {watch('adultsCount')} guests, but only <strong>{rt.availableCount ?? 0} room{rt.availableCount === 1 ? '' : 's'}</strong> {rt.availableCount === 1 ? 'is' : 'are'} available for the selected dates.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
                                                            <div>
                                                                <span className="text-base font-black text-foreground">₹{Number(rt.basePrice || 0).toFixed(0)}</span>
                                                                <span className="text-[10px] text-muted-foreground font-bold"> / night</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!isSoldOut) {
                                                                        setSoldOutWarningId(null);
                                                                        handleSelectRoomType(rt.id);
                                                                    } else {
                                                                        setSoldOutWarningId(prev => prev === rt.id ? null : rt.id);
                                                                    }
                                                                }}
                                                                className={clsx(
                                                                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                                        : isSoldOut
                                                                            ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20"
                                                                            : "bg-muted hover:bg-primary hover:text-primary-foreground text-foreground"
                                                                )}
                                                            >
                                                                {isSelected ? <><CheckCircle className="h-3.5 w-3.5" /> Selected</> : isSoldOut ? (showWarning ? 'Hide Warning' : 'Unavailable ⚠️') : 'Select'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Specific Room Allocation & Extras (When Room Type is Selected or in Group Mode) */}
                                {availability && (
                                    <div className="md:col-span-2 space-y-4">
                                        <div className={clsx(
                                            'p-4 rounded-xl border flex items-start gap-3.5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300',
                                            availability.available 
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                                                : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-150 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                                        )}>
                                            {availability.available 
                                                ? <CheckCircle className="h-5 w-5 mt-0.5 text-emerald-500 shrink-0" /> 
                                                : <AlertCircle className="h-5 w-5 mt-0.5 text-rose-500 shrink-0" />
                                            }
                                            <div className="flex-1">
                                                <p className="font-extrabold text-sm uppercase tracking-wider leading-none">
                                                    {availability.available ? 'Rooms Available' : 'No Rooms Available'}
                                                </p>
                                                <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-400 font-medium">
                                                    {availability.available
                                                        ? isGroupMode
                                                            ? `Aggregate capacity verified for ${watch('groupSize')} guests.`
                                                            : `${availability.availableRooms} rooms left for ${selectedRoomType?.name || 'selected room type'}.`
                                                        : isGroupMode && availability.groupUnavailableReason === 'NO_POOL_CONFIGURED'
                                                            ? 'No room types are added to the group booking pool. Go to Room Types → Edit a room type and enable "Enable Group Bookings".'
                                                            : isGroupMode && availability.groupUnavailableReason === 'CAPACITY_EXCEEDED'
                                                                ? `The group pool capacity is not enough for ${watch('groupSize')} guests.`
                                                                : 'Please choose different dates, room type or reduce guest count.'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Physical Room Selection List */}
                                        {availability.available && availability.roomList && availability.roomList.length > 0 && (
                                            <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border border-blue-150 dark:border-blue-900/30 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-3 mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 tracking-wider flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                                                            {isGroupMode 
                                                                ? 'Room Inventory Selection' 
                                                                : `Select Room Numbers (${(watch('selectedRoomIds') || []).length} Selected)`}
                                                        </h3>
                                                        <p className="text-[10px] text-blue-500/80 mt-0.5 font-medium italic">
                                                            {isGroupMode
                                                                ? `Total capacity must meet ${watch('groupSize')} guests.`
                                                                : `Click room numbers to customize your room allocation for ${watch('adultsCount')} adults.`}
                                                        </p>
                                                    </div>
                                                    {(watch('selectedRoomIds') || []).length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setValue('selectedRoomIds', []);
                                                                setValue('roomId', '');
                                                                setPriceDetails(null);
                                                                setOriginalPriceDetails(null);
                                                            }}
                                                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            Clear Selection
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Dynamic Real-Time Occupancy & Extra Bed Guidance Banner */}
                                                {!isGroupMode && occupancyStats && (
                                                    <div className="mb-4">
                                                        {occupancyStats.selectedCount === 0 ? (
                                                            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Info className="h-4 w-4 shrink-0 text-blue-600" />
                                                                    <span>Please select at least <strong>{occupancyStats.minRoomsByMaxCap} rooms</strong> (with extra beds) or <strong>{occupancyStats.roomsByBaseCap} rooms</strong> (standard base beds) for {occupancyStats.adultsCount} guests.</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {availability.roomList && availability.roomList.length >= occupancyStats.minRoomsByMaxCap && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.minRoomsByMaxCap, true)}
                                                                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[10.5px] transition-all shadow-sm active:scale-95 cursor-pointer"
                                                                        >
                                                                            Select {occupancyStats.minRoomsByMaxCap} Rooms (Extra Beds)
                                                                        </button>
                                                                    )}
                                                                    {availability.roomList && availability.roomList.length >= occupancyStats.roomsByBaseCap && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.roomsByBaseCap, false)}
                                                                            className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-blue-500/20 border border-blue-500/30 text-blue-800 dark:text-blue-200 font-black text-[10.5px] transition-all shadow-xs active:scale-95 cursor-pointer"
                                                                        >
                                                                            Select {occupancyStats.roomsByBaseCap} Rooms (Base Beds)
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : occupancyStats.isPhysicallyInsufficient ? (
                                                            <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs animate-in fade-in space-y-3">
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px]">
                                                                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                                                        <span>⚠️ Insufficient Capacity ({occupancyStats.selectedCount} Room{occupancyStats.selectedCount > 1 ? 's' : ''} for {occupancyStats.adultsCount} Adults)</span>
                                                                    </div>
                                                                    <p className="mt-1 font-medium text-[11px] leading-relaxed">
                                                                        <strong>{occupancyStats.selectedCount} room{occupancyStats.selectedCount > 1 ? 's' : ''}</strong> can hold only <strong>{occupancyStats.totalBaseAdults} adults in base beds</strong> and at most <strong>{occupancyStats.totalMaxPhysicalAdults} adults with extra beds</strong>.
                                                                    </p>
                                                                    <p className="mt-1 font-black text-rose-600 dark:text-rose-300 text-[11px]">
                                                                        👉 Please select at least <strong>{occupancyStats.minRoomsByMaxCap} rooms</strong> to physically fit all {occupancyStats.adultsCount} adults.
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-rose-500/20">
                                                                    {availability.roomList && availability.roomList.length >= occupancyStats.minRoomsByMaxCap && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.minRoomsByMaxCap, true)}
                                                                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                                                                        >
                                                                            <BedDouble className="h-3.5 w-3.5" />
                                                                            Select {occupancyStats.minRoomsByMaxCap} Rooms (Min with Extra Beds)
                                                                        </button>
                                                                    )}
                                                                    {availability.roomList && availability.roomList.length >= occupancyStats.roomsByBaseCap && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.roomsByBaseCap, false)}
                                                                            className="px-3 py-1.5 rounded-lg bg-card hover:bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                                                                        >
                                                                            <BedDouble className="h-3.5 w-3.5 text-rose-600" />
                                                                            Select {occupancyStats.roomsByBaseCap} Rooms (Standard Base Beds)
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : occupancyStats.isExtraBedsRequired ? (
                                                            <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs animate-in fade-in space-y-3">
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px]">
                                                                        <Info className="h-4 w-4 text-amber-600 shrink-0" />
                                                                        <span>Extra Beds Required ({occupancyStats.extraAdultsNeeded} Extra Adult Beds)</span>
                                                                    </div>
                                                                    <p className="mt-1 font-medium text-[11px] leading-relaxed">
                                                                        <strong>{occupancyStats.selectedCount} room{occupancyStats.selectedCount > 1 ? 's' : ''}</strong> provide <strong>{occupancyStats.totalBaseAdults} base adult beds</strong> and hold up to <strong>{occupancyStats.totalMaxPhysicalAdults} adults with extra beds</strong>.
                                                                    </p>
                                                                    <p className="mt-1 font-bold text-amber-700 dark:text-amber-200 text-[11px]">
                                                                        ✓ Fits {occupancyStats.adultsCount} adults ({occupancyStats.extraAdultsNeeded} extra bed charges needed).
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-amber-500/20">
                                                                    {watch('extraAdultsCount') !== occupancyStats.extraAdultsNeeded && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetExtraGuests(occupancyStats.extraAdultsNeeded)}
                                                                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                                                                        >
                                                                            <UserPlus className="h-3.5 w-3.5" />
                                                                            Apply {occupancyStats.extraAdultsNeeded} Extra Adult Beds in Pricing
                                                                        </button>
                                                                    )}
                                                                    {availability.roomList && availability.roomList.length >= occupancyStats.roomsByBaseCap && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.roomsByBaseCap, false)}
                                                                            className="px-3 py-1.5 rounded-lg bg-card hover:bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                                                                        >
                                                                            <BedDouble className="h-3.5 w-3.5 text-amber-600" />
                                                                            Switch to {occupancyStats.roomsByBaseCap} Rooms (Standard Base Beds)
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs animate-in fade-in space-y-3">
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px]">
                                                                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                                                                        <span>Standard Base Capacity Satisfied</span>
                                                                    </div>
                                                                    <p className="mt-1 font-medium text-[11px] leading-relaxed">
                                                                        <strong>{occupancyStats.selectedCount} room{occupancyStats.selectedCount > 1 ? 's' : ''}</strong> fully accommodate all <strong>{occupancyStats.adultsCount} adults</strong> in base beds (Base: {occupancyStats.totalBaseAdults} adults, Max: {occupancyStats.totalMaxPhysicalAdults} adults). No extra bed charges needed.
                                                                    </p>
                                                                </div>
                                                                {occupancyStats.minRoomsByMaxCap < occupancyStats.selectedCount && availability.roomList && availability.roomList.length >= occupancyStats.minRoomsByMaxCap && (
                                                                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-emerald-500/20">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAutoSelectRooms(occupancyStats.minRoomsByMaxCap, true)}
                                                                            className="px-3 py-1.5 rounded-lg bg-card hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                                                                        >
                                                                            <BedDouble className="h-3.5 w-3.5 text-emerald-600" />
                                                                            Optimize to {occupancyStats.minRoomsByMaxCap} Rooms with Extra Beds (Save Costs)
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {availability.roomList.map((room) => {
                                                        const isSelected = (watch('selectedRoomIds') || []).includes(room.id);
                                                        return (
                                                            <button
                                                                key={room.id}
                                                                type="button"
                                                                onClick={() => handleToggleRoom(room.id)}
                                                                className={clsx(
                                                                    "relative overflow-hidden group p-3.5 rounded-xl border-2 transition-all duration-300 text-left flex flex-col justify-between cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700"
                                                                        : room.isRecommended
                                                                            ? "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-400 dark:border-emerald-700 hover:border-emerald-500 text-gray-700 dark:text-gray-300"
                                                                            : "bg-white dark:bg-gray-950 border-gray-150 dark:border-gray-800 hover:border-blue-400/50 dark:hover:border-blue-700/50 text-gray-700 dark:text-gray-300"
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <div className="absolute top-2.5 right-2.5 z-20">
                                                                        <div className="bg-white/20 p-0.5 rounded-full">
                                                                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {room.isRecommended && !isSelected && (
                                                                    <div className="absolute top-2 right-2 z-20">
                                                                        <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded-md shadow-sm">
                                                                            ✦ Best
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col relative z-10 space-y-1.5">
                                                                    <span className={clsx(
                                                                        "text-[9px] font-extrabold px-2 py-0.5 rounded-md w-fit tracking-wide",
                                                                        isSelected ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
                                                                    )}>
                                                                        Cap: {room.baseAdults !== undefined ? `${room.baseAdults}A, ${room.baseChildren || 0}C` : (room.capacity || 'N/A')}
                                                                    </span>
                                                                    <span className={clsx("text-base font-black uppercase tracking-tight block pt-0.5", isSelected ? "text-white" : "text-gray-950 dark:text-white")}>
                                                                        {room.roomNumber || room.name}
                                                                    </span>
                                                                    <span className={clsx("text-[10px] truncate font-semibold block", isSelected ? "text-blue-100" : "text-gray-400 dark:text-gray-500")}>
                                                                        {room.roomType}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Fragmentation Warning */}
                                                {!isGroupMode && availability.roomList.length > 1 && (() => {
                                                    const selectedIds = watch('selectedRoomIds') || [];
                                                    const recommendedRoom = availability.roomList.find((r: any) => r.isRecommended);
                                                    const hasNonRecommendedSelected = selectedIds.length > 0 &&
                                                        recommendedRoom &&
                                                        !selectedIds.includes(recommendedRoom.id);
                                                    if (!hasNonRecommendedSelected) return null;
                                                    return (
                                                        <div className="mt-4 p-4 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                                                            <div>
                                                                <p className="font-extrabold text-sm uppercase tracking-wider text-amber-800 dark:text-amber-300">⚠ Fragmentation Risk</p>
                                                                <p className="text-xs mt-1 text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                                                    The selected room differs from the optimal assignment.
                                                                    {recommendedRoom && (
                                                                        <span className="block mt-1 font-bold">
                                                                            Recommended: <span className="text-amber-900 dark:text-amber-200 font-black">{recommendedRoom.roomNumber || recommendedRoom.name}</span>
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Extra Guests Bedding Options (Standard Mode) */}
                                        {!isGroupMode && selectedRoomType && (() => {
                                            const roomCount = Math.max((watch('selectedRoomIds') || []).length, 1);
                                            const baseAdultsCap = (selectedRoomType.baseAdults ?? selectedRoomType.maxAdults ?? 2) * roomCount;
                                            const baseChildrenCap = (selectedRoomType.baseChildren ?? selectedRoomType.maxChildren ?? 1) * roomCount;
                                            const maxPhysAdultsCap = (selectedRoomType.maxPhysicalAdults ?? selectedRoomType.maxAdults ?? 4) * roomCount;
                                            const maxPhysChildrenCap = (selectedRoomType.maxPhysicalChildren ?? selectedRoomType.maxChildren ?? 2) * roomCount;

                                            const maxExtraAdultsCap = Math.max(0, maxPhysAdultsCap - baseAdultsCap);
                                            const maxExtraChildrenCap = Math.max(0, maxPhysChildrenCap - baseChildrenCap);

                                            if (maxExtraAdultsCap <= 0 && maxExtraChildrenCap <= 0) return null;

                                            return (
                                                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3 mt-4">
                                                    <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <UserPlus className="h-4 w-4 text-amber-500" />
                                                            <span>Extra Bedding / Guests (Optional)</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 lowercase">Extra charge applies</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1.5">
                                                                Extra Adults (Max {maxExtraAdultsCap})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxExtraAdultsCap}
                                                                placeholder="0"
                                                                {...register('extraAdultsCount', {
                                                                    setValueAs: (v) => v === '' || v === null || isNaN(v) ? 0 : Number(v),
                                                                    onChange: () => {
                                                                        if (availability?.available) handleCheckAvailability();
                                                                    }
                                                                })}
                                                                className="w-full border border-amber-300 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-950/20 text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1.5">
                                                                Extra Children (Max {maxExtraChildrenCap})
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxExtraChildrenCap}
                                                                placeholder="0"
                                                                {...register('extraChildrenCount', {
                                                                    setValueAs: (v) => v === '' || v === null || isNaN(v) ? 0 : Number(v),
                                                                    onChange: () => {
                                                                        if (availability?.available) handleCheckAvailability();
                                                                    }
                                                                })}
                                                                className="w-full border border-amber-300 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-950/20 text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Group allocation preview for group bookings */}
                                        {isGroupMode && availability.available && availability.allocationPreview && (watch('selectedRoomIds') || []).length === 0 && (
                                            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-3 tracking-wider flex items-center gap-1.5">
                                                    <CheckCircle className="h-3.5 w-3.5 text-blue-500" /> Suggested Allocation Preview
                                                </h4>
                                                <div className="space-y-2">
                                                    {availability.allocationPreview.map((room, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-blue-100/50 dark:border-blue-800/30 last:border-0">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900 dark:text-white">Room {room.name}</span>
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{room.roomType}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold bg-blue-100/70 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Cap: {room.capacity}</span>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 flex justify-between items-center border-t border-blue-100/50 dark:border-blue-800/30">
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Capacity</span>
                                                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                                            {availability.allocationPreview.reduce((sum, r) => sum + r.capacity, 0)} Guests
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Offline CP Selection */}
                        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <Briefcase className="h-5 w-5 text-primary" /> Offline Channel Partner / Agent Referral
                                </h2>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {isOfflineCpBooking ? 'Yes (Agent Referral)' : 'No (Direct Booking)'}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={isOfflineCpBooking}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setIsOfflineCpBooking(checked);
                                            if (!checked) {
                                                setSelectedOfflineCpId('NEW');
                                                setNewOfflineCpName('');
                                                setNewOfflineCpPhone('');
                                                setOfflineCpCommission(0);
                                            }
                                        }}
                                        className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                    />
                                </label>
                            </div>

                            {isOfflineCpBooking ? (
                                <div className="space-y-4 animate-in fade-in zoom-in-95">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Select Offline Agent / CP
                                            </label>
                                            <select
                                                value={selectedOfflineCpId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedOfflineCpId(val);
                                                    if (val !== 'NEW') {
                                                        const cp = offlineCps?.find(c => c.id === val);
                                                        if (cp) {
                                                            setOfflineCpCommission(Number(cp.defaultCommission) || 0);
                                                        }
                                                    } else {
                                                        setNewOfflineCpName('');
                                                        setNewOfflineCpPhone('');
                                                        setOfflineCpCommission(0);
                                                    }
                                                }}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all cursor-pointer"
                                            >
                                                <option value="NEW">+ Add New Offline Agent / CP</option>
                                                {offlineCps?.map((cp) => (
                                                    <option key={cp.id} value={cp.id}>
                                                        {cp.name} {cp.phone ? `(${cp.phone})` : ''} {cp.defaultCommission ? `- ${cp.defaultCommission}% Default Comm.` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedOfflineCpId === 'NEW' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                        Agent / Business Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Raju Travels / Sun Tours"
                                                        value={newOfflineCpName}
                                                        onChange={(e) => setNewOfflineCpName(e.target.value)}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                        Agent Phone Number (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. +91 9876543210"
                                                        value={newOfflineCpPhone}
                                                        onChange={(e) => setNewOfflineCpPhone(e.target.value)}
                                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Commission Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0.00"
                                                value={offlineCpCommission || ''}
                                                onChange={(e) => setOfflineCpCommission(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">
                                    Booking source will automatically be assigned as <strong className="text-foreground">Oreedu PMS</strong>.
                                </p>
                            )}
                        </div>

                        {/* Guest Details */}
                        {
                            availability?.available && (
                                <>
                                    {/* Primary Contact Information */}
                                    <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300 relative">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground pb-3 border-b border-border">
                                            <Users className="h-5 w-5 text-primary" /> Primary Contact Information
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="relative phone-autocomplete-container md:col-span-2">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Primary Phone Number</label>
                                                <input
                                                    type="text"
                                                    {...register('guestPhone')}
                                                    onFocus={() => { if (phoneSearchResults.length > 0) setShowPhoneDropdown(true); }}
                                                    placeholder="Enter primary contact number"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {showPhoneDropdown && phoneSearchResults.length > 0 && (
                                                    <div className="absolute z-20 w-full mt-1 bg-background border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden left-0">
                                                        {phoneSearchResults.map((customer) => (
                                                            <div 
                                                                key={customer.id} 
                                                                className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-0 transition-colors"
                                                                onClick={() => {
                                                                    setValue('guestPhone', customer.phone || '');
                                                                    if (customer.firstName) setValue('guestFirstName', customer.firstName);
                                                                    if (customer.lastName) setValue('guestLastName', customer.lastName);
                                                                    if (customer.email) setValue('guestEmail', customer.email);
                                                                    if (customer.whatsappNumber) setValue('whatsappNumber', customer.whatsappNumber);
                                                                    setShowPhoneDropdown(false);
                                                                    toast.success('Customer details loaded!');
                                                                }}
                                                            >
                                                                <p className="text-sm font-bold text-foreground">{customer.firstName} {customer.lastName}</p>
                                                                <p className="text-xs text-muted-foreground">{customer.phone} {customer.email ? `• ${customer.email}` : ''}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {errors.guestPhone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestPhone.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
                                                <input
                                                    type="text"
                                                    {...register('guestFirstName')}
                                                    placeholder="Enter first name"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestFirstName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestFirstName.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    {...register('guestLastName')}
                                                    placeholder="Enter last name (Optional)"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestLastName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestLastName.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email (Optional)</label>
                                                <input
                                                    type="email"
                                                    {...register('guestEmail')}
                                                    placeholder="Enter email address"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestEmail && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestEmail.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Primary WhatsApp Number (Optional)</label>
                                                <input
                                                    type="text"
                                                    {...register('whatsappNumber')}
                                                    placeholder="Enter WhatsApp number"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.whatsappNumber.message}</p>}
                                            </div>
                                            <div className="md:col-span-2 flex items-center mt-3">
                                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        {...register('isBookerAlsoGuest')}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/40 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 transition-colors">
                                                        Add Booker as the Primary Guest (Guest 1)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                                <Users className="h-5 w-5 text-blue-500" /> Guest Details
                                            </h2>
                                            <button 
                                                type="button" 
                                                onClick={() => append({ firstName: '', lastName: '' })} 
                                                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                + Add Guest
                                            </button>
                                        </div>
                                        {errors.guests?.message && (
                                            <div className="mb-4 p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-150 dark:border-red-900/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500" /> {errors.guests.message}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-5">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="p-5 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-850/50 relative group/guest">
                                                    {fields.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => remove(index)} 
                                                            className="absolute top-3 right-3 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-2 py-1 rounded-md transition-all active:scale-95"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                    <div className="flex justify-between items-center mb-3">
                                                         <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-505 uppercase tracking-wider">
                                                             Guest {index + 1} {index === 0 && '(Primary)'}
                                                         </h3>
                                                         {index === 0 && isBookerAlsoGuest && (
                                                             <span className="text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                                 Synced with Booker
                                                             </span>
                                                         )}
                                                     </div>

                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                         <div>
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
                                                             <input
                                                                 {...register(`guests.${index}.firstName`)}
                                                                 placeholder="Enter first name"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50",
                                                                     index === 0 && isBookerAlsoGuest && "bg-muted cursor-not-allowed text-muted-foreground border-border"
                                                                 )}
                                                             />
                                                             {errors.guests?.[index]?.firstName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guests[index]?.firstName?.message}</p>}
                                                         </div>
                                                         <div>
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name (Optional)</label>
                                                             <input
                                                                 {...register(`guests.${index}.lastName`)}
                                                                 placeholder="Enter last name (Optional)"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50",
                                                                     index === 0 && isBookerAlsoGuest && "bg-muted cursor-not-allowed text-muted-foreground border-border"
                                                                 )}
                                                             />
                                                             {errors.guests?.[index]?.lastName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guests[index]?.lastName?.message}</p>}
                                                         </div>
                                                         <div>
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email (Optional)</label>
                                                             <input
                                                                 {...register(`guests.${index}.email`)}
                                                                 type="email"
                                                                 placeholder="Enter email address"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50",
                                                                     index === 0 && isBookerAlsoGuest && "bg-muted cursor-not-allowed text-muted-foreground border-border"
                                                                 )}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number (Optional)</label>
                                                             <input
                                                                 {...register(`guests.${index}.phone`)}
                                                                 placeholder="Enter phone number"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50",
                                                                     index === 0 && isBookerAlsoGuest && "bg-muted cursor-not-allowed text-muted-foreground border-border"
                                                                 )}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">WhatsApp Number (Optional)</label>
                                                             <input
                                                                 {...register(`guests.${index}.whatsappNumber`)}
                                                                 placeholder="Enter WhatsApp number"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50",
                                                                     index === 0 && isBookerAlsoGuest && "bg-muted cursor-not-allowed text-muted-foreground border-border"
                                                                 )}
                                                             />
                                                         </div>
                                                         <div className="relative">
                                                             <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">ID Document Type (Optional)</label>
                                                             <select 
                                                                 {...register(`guests.${index}.idType`)} 
                                                                 className={clsx(
                                                                     "w-full border border-input bg-background text-foreground rounded-xl shadow-sm text-sm h-11 px-4 font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 cursor-pointer", 
                                                                     errors.guests?.[index]?.idType && "border-red-500 ring-1 ring-red-500"
                                                                 )}
                                                             >
                                                                 <option value="">-- ID Type (Optional) --</option>
                                                                 <option value="AADHAR">Aadhar Card</option>
                                                                 <option value="PASSPORT">Passport</option>
                                                                 <option value="VOTER_ID">Voter ID</option>
                                                                 <option value="DRIVING_LICENSE">Driving License</option>
                                                                 <option value="OTHER">Other</option>
                                                             </select>
                                                             {errors.guests?.[index]?.idType && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.guests[index].idType?.message}</p>}
                                                         </div>

                                                         {watch(`guests.${index}.idType`) && (
                                                             <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                                                                 <div>
                                                                     <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">ID Number</label>
                                                                     <input
                                                                         {...register(`guests.${index}.idNumber`)}
                                                                         placeholder="Enter ID number"
                                                                         className={clsx("w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50", errors.guests?.[index]?.idNumber && "border-red-500 ring-1 ring-red-500")}
                                                                     />
                                                                     {errors.guests?.[index]?.idNumber && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guests[index].idNumber?.message}</p>}
                                                                 </div>

                                                                 <div>
                                                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Upload Guest ID Photo (Front & Optional Back)</label>
                                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-150 dark:border-gray-800/50 shadow-inner">
                                                                          {/* Front Side */}
                                                                          <div className="flex flex-col gap-2">
                                                                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Front Side</span>
                                                                              <div className="flex items-center gap-3">
                                                                                  <input
                                                                                      type="file"
                                                                                      accept="image/*"
                                                                                      onChange={(e) => handleGuestFileUpload(index, e, false)}
                                                                                      className="hidden"
                                                                                      id={`guest-id-upload-front-${index}`}
                                                                                  />
                                                                                  <label
                                                                                      htmlFor={`guest-id-upload-front-${index}`}
                                                                                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shadow-sm border-dashed"
                                                                                  >
                                                                                      {idUploading[`front-${index}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                                      {watch(`guests.${index}.idImage`) ? 'Change Front' : 'Upload Front'}
                                                                                  </label>
                                                                                  {watch(`guests.${index}.idImage`) && (
                                                                                      <a
                                                                                          href={watch(`guests.${index}.idImage`)}
                                                                                          target="_blank"
                                                                                          rel="noreferrer"
                                                                                          className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-all group/img relative shadow-sm block"
                                                                                      >
                                                                                          <img
                                                                                              src={watch(`guests.${index}.idImage`)}
                                                                                              alt="Front ID"
                                                                                              className="w-full h-full object-cover"
                                                                                          />
                                                                                      </a>
                                                                                  )}
                                                                              </div>
                                                                          </div>

                                                                          {/* Back Side */}
                                                                          <div className="flex flex-col gap-2">
                                                                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Back Side (Optional)</span>
                                                                              <div className="flex items-center gap-3">
                                                                                  <input
                                                                                      type="file"
                                                                                      accept="image/*"
                                                                                      onChange={(e) => handleGuestFileUpload(index, e, true)}
                                                                                      className="hidden"
                                                                                      id={`guest-id-upload-back-${index}`}
                                                                                  />
                                                                                  <label
                                                                                      htmlFor={`guest-id-upload-back-${index}`}
                                                                                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shadow-sm border-dashed"
                                                                                  >
                                                                                      {idUploading[`back-${index}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                                      {watch(`guests.${index}.idImageBack`) ? 'Change Back' : 'Upload Back'}
                                                                                  </label>
                                                                                  {watch(`guests.${index}.idImageBack`) && (
                                                                                      <a
                                                                                          href={watch(`guests.${index}.idImageBack`)}
                                                                                          target="_blank"
                                                                                          rel="noreferrer"
                                                                                          className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-all group/img relative shadow-sm block"
                                                                                      >
                                                                                          <img
                                                                                              src={watch(`guests.${index}.idImageBack`)}
                                                                                              alt="Back ID"
                                                                                              className="w-full h-full object-cover"
                                                                                          />
                                                                                      </a>
                                                                                  )}
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                      <p className="text-[10px] text-gray-400 italic mt-2">Accepted formats: JPG, PNG. Max 5MB.</p>
                                                                  </div>
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>

                                     {/* Additional Details, GST & Promo Code (Before Payment & Confirmation) */}
                                     <div className="mt-8 bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300 space-y-5">
                                         <h2 className="text-lg font-bold flex items-center gap-2 text-foreground pb-3 border-b border-border">
                                             <FileText className="h-5 w-5 text-primary" /> Additional Details & Notes
                                         </h2>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div>
                                                 <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">GST Number (Optional)</label>
                                                 <input
                                                     type="text"
                                                     {...register('gstNumber')}
                                                     placeholder="Enter GSTIN"
                                                     className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-bold uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                                 />
                                             </div>
                                             <div>
                                                 <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Promo or Referral Code</label>
                                                 <div className="flex gap-2">
                                                     <input
                                                         type="text"
                                                         {...register('appliedCode')}
                                                         placeholder="GUEST10 or CP..."
                                                         className="flex-1 min-w-0 border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-bold text-sm uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                                     />
                                                     <button
                                                         type="button"
                                                         onClick={handleCheckAvailability}
                                                         className="shrink-0 whitespace-nowrap px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-xl text-xs font-bold transition-all border border-border shadow-sm active:scale-95 cursor-pointer"
                                                     >
                                                         Apply
                                                     </button>
                                                 </div>
                                             </div>
                                             <div className="md:col-span-2">
                                                 <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Special Requests / Notes (Optional)</label>
                                                 <textarea
                                                     {...register('specialRequests')}
                                                     rows={3}
                                                     placeholder="Any special instructions, preferences, or guest requests?"
                                                     className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                                 />
                                             </div>
                                         </div>
                                     </div>

                                    {/* Price Override & Payments - Moved here for better workflow */}
                                    <div className="mt-8 bg-gradient-to-br from-emerald-50/40 to-teal-50/40 dark:from-emerald-950/5 dark:to-teal-950/5 p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 hover:shadow-md transition-all duration-300">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-800 dark:text-emerald-400 pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20">
                                            <CheckCircle className="h-5 w-5 text-emerald-500" /> Manage Payment for this Booking
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Payment Option / Status</label>
                                                <select {...register('paymentOption')} className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                                    <option value="FULL">Collect Full Payment Now</option>
                                                    <option value="PARTIAL">Collect Partial / Deposit</option>
                                                </select>
                                            </div>
                                            {watch('paymentOption') === 'PARTIAL' && (
                                                <div className="animate-in zoom-in-95 duration-200">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1.5">Initial Deposit Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        {...register('paidAmount', { valueAsNumber: true })}
                                                        className="w-full border-blue-200 dark:border-blue-900 dark:bg-gray-950 dark:text-white rounded-xl shadow-sm h-11 px-4 font-black text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                        placeholder="0.00"
                                                        required={watch('paymentOption') === 'PARTIAL'}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Payment Method</label>
                                                <select {...register('paymentMethod')} className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                                    <option value="CASH">Cash Payment</option>
                                                    <option value="UPI">UPI / QR Code</option>
                                                    <option value="CARD">Debit / Credit Card</option>
                                                    <option value="WALLET">Channel Partner Wallet</option>
                                                    <option value="ONLINE">Send Payment Link (Email/SMS)</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-emerald-100/50 dark:border-emerald-900/20 pt-5 mt-2">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Override Price (Optional)</label>
                                                        <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue('isOverrideInclusive', true);
                                                                    if (watch('overrideTotal')) handleCheckAvailability();
                                                                }}
                                                                className={clsx('px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200', watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-800 text-blue-650 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-650')}
                                                            >
                                                                Inc. GST
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue('isOverrideInclusive', false);
                                                                    if (watch('overrideTotal')) handleCheckAvailability();
                                                                }}
                                                                className={clsx('px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200', !watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-800 text-blue-650 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-650')}
                                                            >
                                                                Exc. GST
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        {...register('overrideTotal', {
                                                            setValueAs: v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
                                                            onBlur: () => { if (watch('overrideTotal')) handleCheckAvailability(); }
                                                        })}
                                                        className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-extrabold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400"
                                                        placeholder={watch('isOverrideInclusive') ? "Final Total amount" : "Base amount (add GST)"}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-405 mb-1.5">Reason for Override</label>
                                                    <input 
                                                        type="text" 
                                                        {...register('overrideReason')} 
                                                        className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400" 
                                                        placeholder="Why the custom price?" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )
                        }




                    </form >
                </div >

                {/* Right Sidebar: Interactive Calendar & Price Summary */}
                <div className="xl:col-span-7 space-y-6">
                    {/* 1. Interactive Availability Calendar (Desktop only) */}
                    <div className="hidden xl:block">
                        <BookingAvailabilityCalendar
                            propertyId={watch('propertyId')}
                            roomTypeId={watch('roomTypeId')}
                            isGroupBooking={!!watch('isGroupBooking')}
                            selectedCheckIn={watch('checkInDate')}
                            selectedCheckOut={watch('checkOutDate')}
                            monthsToShow={2}
                            onSelectDates={(checkIn, checkOut) => {
                                setValue('checkInDate', checkIn);
                                setValue('checkOutDate', checkOut);
                                handleCheckAvailability();
                            }}
                        />
                    </div>

                    {/* Mobile Calendar Modal */}
                    {showMobileCalendar && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm xl:hidden">
                            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                    <h3 className="font-bold text-foreground">Select Dates</h3>
                                    <button onClick={() => setShowMobileCalendar(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto">
                                    <BookingAvailabilityCalendar
                                        propertyId={watch('propertyId')}
                                        roomTypeId={watch('roomTypeId')}
                                        isGroupBooking={!!watch('isGroupBooking')}
                                        selectedCheckIn={watch('checkInDate')}
                                        selectedCheckOut={watch('checkOutDate')}
                                        monthsToShow={1} // Show 1 month on mobile to save vertical space
                                        onSelectDates={(checkIn, checkOut) => {
                                            setValue('checkInDate', checkIn);
                                            setValue('checkOutDate', checkOut);
                                            handleCheckAvailability();
                                            // Optional: Close modal after selection
                                            setTimeout(() => setShowMobileCalendar(false), 500);
                                        }}
                                        className="border-none shadow-none p-0"
                                    />
                                </div>
                                <div className="p-4 border-t border-border bg-muted/10">
                                    <button 
                                        onClick={() => setShowMobileCalendar(false)}
                                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Price Summary */}
                    <div className="bg-card p-6 rounded-2xl shadow-xl border border-border sticky top-[72px] overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
                        <h2 className="text-xl font-extrabold mb-5 flex items-center gap-2 text-foreground">
                            <span className="text-primary">₹</span> Price Summary
                        </h2>
                        {!priceDetails ? (
                            <p className="text-muted-foreground text-sm italic py-4 text-center">
                                Select stay details and room type, then check availability to view pricing.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {/* ── ALWAYS show the ORIGINAL breakdown (real room rate, no override) ── */}
                                {(() => {
                                    const details = originalPriceDetails || priceDetails;
                                    const isInclusive = details.isGstInclusive;

                                    const roomChargesDisplay = isInclusive
                                        ? (details.grossBaseAmount ?? (details.baseAmount + details.taxAmount))
                                        : details.baseAmount;

                                    const extraAdultDisplay = isInclusive
                                        ? (details.grossExtraAdultAmount ?? details.extraAdultAmount)
                                        : details.extraAdultAmount;

                                    const extraChildDisplay = isInclusive
                                        ? (details.grossExtraChildAmount ?? details.extraChildAmount)
                                        : details.extraChildAmount;

                                    const offerDiscountDisplay = isInclusive && details.offerDiscountAmount > 0
                                        ? (details.grossOfferDiscountAmount ?? details.offerDiscountAmount)
                                        : details.offerDiscountAmount;

                                    const couponDiscountDisplay = isInclusive && details.couponDiscountAmount > 0
                                        ? (details.grossCouponDiscountAmount ?? details.couponDiscountAmount)
                                        : details.couponDiscountAmount;

                                    const referralDiscountDisplay = isInclusive && details.referralDiscountAmount > 0
                                        ? (details.grossReferralDiscountAmount ?? details.referralDiscountAmount)
                                        : details.referralDiscountAmount;

                                    return (
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground font-medium">
                                                    {watch('isGroupBooking') ? (
                                                        <>
                                                            Group of {watch('groupSize') || 0} Guests
                                                            {availability?.roomList && ` (${availability.roomList.length} Rooms)`}
                                                        </>
                                                    ) : (
                                                        (watch('selectedRoomIds') || []).length > 1 ? `${(watch('selectedRoomIds') || []).length} Rooms` : '1 Room'
                                                    )} x {details.numberOfNights} Nights {isInclusive && <span className="text-[10px] text-muted-foreground font-bold">(GST Inc.)</span>}
                                                </span>
                                                <span className="font-semibold text-foreground">₹{roomChargesDisplay.toFixed(2)}</span>
                                            </div>
                                            {details.extraAdultAmount > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                                                        Extra Adult Charges
                                                        {(() => {
                                                            const rt = selectedRoomType;
                                                            const baseAllowance = rt?.maxAdults || 2;
                                                            const adults = Number(watch('adultsCount')) || 1;
                                                            const roomsSelected = Math.max((watch('selectedRoomIds') || []).length, 1);
                                                            const extraAdults = Math.max(0, adults - baseAllowance * roomsSelected);
                                                            return extraAdults > 0
                                                                ? <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{extraAdults} extra</span>
                                                                : <span className="text-[10px] font-bold text-muted-foreground opacity-60">(charged)</span>;
                                                        })()}
                                                    </span>
                                                    <span className="font-semibold text-foreground">₹{extraAdultDisplay.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {details.extraChildAmount > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                                                        Extra Child Charges
                                                        {(() => {
                                                            const rt = selectedRoomType;
                                                            const baseAllowance = rt?.maxChildren || 2;
                                                            const children = Number(watch('childrenCount')) || 0;
                                                            const roomsSelected = Math.max((watch('selectedRoomIds') || []).length, 1);
                                                            const extraChildren = Math.max(0, children - baseAllowance * roomsSelected);
                                                            return extraChildren > 0
                                                                ? <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{extraChildren} extra</span>
                                                                : <span className="text-[10px] font-bold text-muted-foreground opacity-60">(charged)</span>;
                                                        })()}
                                                    </span>
                                                    <span className="font-semibold text-foreground">₹{extraChildDisplay.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {offerDiscountDisplay > 0 && (
                                                <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                                    <span>Offer Discount</span><span>-₹{offerDiscountDisplay.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {couponDiscountDisplay > 0 && details.appliedCodeType === 'COUPON' && (
                                                <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                                    <span>Coupon Discount</span><span>-₹{couponDiscountDisplay.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {referralDiscountDisplay > 0 && details.appliedCodeType === 'REFERRAL' && (
                                                <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                                    <span>Referral Discount</span><span>-₹{referralDiscountDisplay.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {!isInclusive && (
                                                <div className="flex justify-between text-sm border-b border-border pb-3">
                                                    <span className="text-muted-foreground font-medium">GST / Taxes ({details.taxRate}%)</span>
                                                    <span className="font-semibold text-foreground">+₹{details.taxAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {/* Original total — strikethrough if override is active */}
                                            <div className="flex justify-between items-center pt-1 border-t border-border">
                                                <div>
                                                    <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider block">
                                                        {watch('overrideTotal') ? 'Original Total' : 'Total'}
                                                    </span>
                                                    {isInclusive && details.taxAmount > 0 && !watch('overrideTotal') && (
                                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                                            Includes ₹{details.taxAmount.toFixed(2)} GST ({details.taxRate}%)
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`font-extrabold tracking-tight ${watch('overrideTotal') ? 'text-xl text-muted-foreground line-through' : 'text-3xl text-primary'}`}>
                                                    ₹{details.totalAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ── Override section (shown only when override is set) ── */}
                                {watch('overrideTotal') && (
                                    <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl animate-in fade-in zoom-in-95">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                                                Override Active
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {watch('isOverrideInclusive') ? 'Incl. GST' : 'Excl. GST'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground font-medium">Override Base Tariff</span>
                                            <span className="font-bold text-foreground">₹{(watch('isOverrideInclusive') ? (watch('overrideTotal')! / (1 + priceDetails.taxRate / 100)) : watch('overrideTotal')!).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-amber-200/40 dark:border-amber-900/20 pb-3">
                                            <span className="text-muted-foreground font-medium">GST Tax ({priceDetails.taxRate}%)</span>
                                            <span className="font-bold text-foreground">₹{(watch('isOverrideInclusive') ? (watch('overrideTotal')! - watch('overrideTotal')! / (1 + priceDetails.taxRate / 100)) : (watch('overrideTotal')! * priceDetails.taxRate / 100)).toFixed(2)}</span>
                                        </div>
                                        {(originalPriceDetails || priceDetails).offerDiscountAmount > 0 || (originalPriceDetails || priceDetails).discountAmount > 0 ? (
                                            <p className="text-[9px] text-muted-foreground italic">Discounts are bypassed when a manual override is active.</p>
                                        ) : null}
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Override Total</span>
                                            <span className="font-extrabold text-3xl tracking-tight text-amber-600 dark:text-amber-400">
                                                ₹{(watch('isOverrideInclusive') ? watch('overrideTotal')! : watch('overrideTotal')! * (1 + priceDetails.taxRate / 100)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button 
                            type="submit" 
                            form="create-booking-form"
                            disabled={!availability?.available || createBookingMutation.isPending}
                            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-95 duration-200"
                        >
                            {createBookingMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>) : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            </div >

            {showInsufficientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
                            <div>
                                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Insufficient Rooms
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInsufficientModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-10 w-10" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                    {(availability?.roomList || []).length < requiredRooms ? (
                                        <span>
                                            Not enough rooms available on these dates! The guest count requires at least <strong>{requiredRooms} rooms</strong>, but only <strong>{(availability?.roomList || []).length} rooms</strong> are available of this type. Please choose different dates, select a different room type, reduce the guest count, <strong className="text-amber-600 dark:text-amber-400 font-black">or split the booking into multiple room types</strong>.
                                        </span>
                                    ) : (
                                        <span>
                                            The selected guest count cannot fit in the number of rooms currently selected. Please select additional available rooms to accommodate all guests.
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Guests:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {watch('adultsCount')} Adult(s), {watch('childrenCount')} Child(ren)
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Room Type:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {selectedRoomType?.name || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-gray-100 dark:border-gray-800 pt-2">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold">Required Rooms:</span>
                                    <span className="font-black text-amber-600 dark:text-amber-400">{requiredRooms} Room(s)</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold">Currently Selected:</span>
                                    <span className="font-black text-red-600 dark:text-red-400">
                                        {(watch('selectedRoomIds') || []).length} Room(s)
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInsufficientModal(false)}
                                    className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center"
                                >
                                    {(availability?.roomList || []).length < requiredRooms ? 'Modify Search' : 'Select More Rooms'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {errorModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-red-50/50 dark:bg-red-950/20">
                            <div>
                                <h2 className="text-lg font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    {errorModal.title}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <AlertCircle className="h-10 w-10" />
                                </div>
                                <div className="w-full text-left">
                                    {Array.isArray(errorModal.errors) ? (
                                        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1.5 font-medium">
                                            {errorModal.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                            {errorModal.errors}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all text-xs font-black uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
