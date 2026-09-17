import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { 
    Loader2, Calendar, Users, UserPlus, CheckCircle, AlertCircle, 
    ArrowLeft, Briefcase, Camera, X, BedDouble, 
    FileText, Sparkles, ChevronDown, ChevronUp, Search, Layers, SlidersHorizontal 
} from 'lucide-react';
import clsx from 'clsx';
import AccommodationPackageCard from '../../components/bookings/AccommodationPackageCard';
import RoomAssignmentSection from '../../components/bookings/RoomAssignmentSection';
import PropertyInventoryReference from '../../components/bookings/PropertyInventoryReference';
import BookingSummarySidebar from '../../components/bookings/BookingSummarySidebar';
import CustomAccommodationModal from '../../components/bookings/CustomAccommodationModal';
import type { PriceCalculationResult, CreateBookingDto } from '../../types/booking';
import type { RoomType } from '../../types/room';
import { useProperty } from '../../context/PropertyContext';
import { canRoomTypeFitParty } from '../../utils/occupancy';

const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().optional(),
    roomsCount: z.number().min(1, 'At least 1 room is required').optional(),
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
    const [accommodationSolutions, setAccommodationSolutions] = useState<any[] | null>(null);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [solutionRoomAssignments, setSolutionRoomAssignments] = useState<Record<number, string>>({});
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [originalPriceDetails, setOriginalPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showFullSolutionsModal, setShowFullSolutionsModal] = useState(false);
    const [showCustomSolutionModal, setShowCustomSolutionModal] = useState(false);
    const [showInsufficientModal, setShowInsufficientModal] = useState(false);
    const [showMobileSummarySheet, setShowMobileSummarySheet] = useState(false);
    const [childAges, setChildAges] = useState<number[]>([]);
    const [infantsCount, setInfantsCount] = useState<number>(0);

    // Promo / Referral Code State
    const [isApplyingPromoCode, setIsApplyingPromoCode] = useState(false);
    const [promoCodeMessage, setPromoCodeMessage] = useState<string | null>(null);
    const [isPromoCodeError, setIsPromoCodeError] = useState(false);

    // Collapsible section toggles
    const [showAdditionalGuests, setShowAdditionalGuests] = useState(false);
    const [showGstDetails, setShowGstDetails] = useState(false);
    const [showPriceOverride, setShowPriceOverride] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

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
            roomsCount: 1,
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

    // Track latest search generation to prevent race conditions from out-of-order responses
    const searchRequestId = useRef(0);

    // Auto-set property and detect historical entries
    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

    const watchedCheckInDate = watch('checkInDate');
    const watchedCheckOutDate = watch('checkOutDate');
    const watchedAdults = watch('adultsCount');
    const watchedChildren = watch('childrenCount');
    const watchedRoomsCount = watch('roomsCount');
    const watchedIsHistorical = watch('isHistoricalEntry');
    const isGroupMode = !!watch('isGroupBooking');

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
    }, [watchedCheckInDate, setValue, watchedIsHistorical]);

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
        return [...availableRoomTypesList].sort((a, b) => {
            const aSoldOut = Boolean(a.isSoldOut || (a.availableCount !== undefined && a.availableCount === 0));
            const bSoldOut = Boolean(b.isSoldOut || (b.availableCount !== undefined && b.availableCount === 0));

            if (aSoldOut && !bSoldOut) return 1;
            if (!aSoldOut && bSoldOut) return -1;
            return 0;
        });
    }, [availableRoomTypesList]);

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
            baseChildrenPerRoom,
            maxPhysicalAdultsPerRoom,
            maxPhysicalChildrenPerRoom,
            totalBaseAdults,
            totalBaseChildren,
            totalMaxPhysicalAdults,
            totalMaxPhysicalChildren,
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

    // Mode Toggle Handler: Clean state isolation
    const handleToggleGroupMode = (enableGroup: boolean) => {
        setValue('isGroupBooking', enableGroup);
        setHasSearched(false);
        setSelectedSolution(null);
        setAccommodationSolutions(null);
        setAvailableRoomTypesList(null);
        setSolutionRoomAssignments({});
        setValue('selectedRoomIds', []);
        setValue('roomId', '');
        setValue('roomTypeId', '');
        setValue('roomsCount', 1);
        setPriceDetails(null);
        setOriginalPriceDetails(null);
        setAvailability(null);
        setChildAges([]);
        setInfantsCount(0);
        setValue('childrenCount', 0);

        if (enableGroup) {
            const currentAdults = Math.max(2, Number(getValues('adultsCount')) || 2);
            setValue('adultsCount', currentAdults);
            setValue('groupSize', currentAdults);
        } else {
            setValue('adultsCount', 1);
            setValue('groupSize', undefined);
        }
    };

    const handleSelectSolution = (solution: any) => {
        setSelectedSolution(solution);
        const allocatedRooms = solution.rooms || solution.allocatedRooms || [];
        const firstRoomType = allocatedRooms[0]?.roomTypeId;
        if (firstRoomType) {
            setValue('roomTypeId', firstRoomType);
        }

        // Auto-assign conflict-free physical rooms for each allocated room in solution
        const initialAssignments: Record<number, string> = {};
        const chosenRoomIds: string[] = [];
        allocatedRooms.forEach((ar: any, idx: number) => {
            const rt = roomTypes?.find(r => r.id === ar.roomTypeId);
            const availableRoom = rt?.rooms?.find((r: any) => r.isEnabled && !chosenRoomIds.includes(r.id));
            if (availableRoom) {
                initialAssignments[idx] = availableRoom.id;
                chosenRoomIds.push(availableRoom.id);
            }
        });
        setSolutionRoomAssignments(initialAssignments);
        setValue('selectedRoomIds', chosenRoomIds);
        setValue('roomId', chosenRoomIds[0] || '');

        const pricing = solution.pricing || solution.pricingSummary;
        if (pricing) {
            const baseAmount = pricing.baseAmount ?? pricing.basePrice ?? 0;
            const extraAdultAmount = pricing.extraAmount ?? pricing.extraGuestTotal ?? 0;
            const taxAmount = pricing.taxAmount ?? 0;
            const totalAmount = pricing.totalPrice ?? pricing.grandTotal ?? (baseAmount + extraAdultAmount + taxAmount);
            const numberOfNights = pricing.numberOfNights ?? pricing.nights ?? 1;
            const taxRate = pricing.taxRate ?? ((taxAmount > 0 && (baseAmount + extraAdultAmount) > 0) ? Math.round((taxAmount / (baseAmount + extraAdultAmount)) * 100) : 0);

            const solPrice: PriceCalculationResult = {
                baseAmount,
                extraAdultAmount,
                extraChildAmount: 0,
                taxAmount,
                discountAmount: 0,
                offerDiscountAmount: 0,
                couponDiscountAmount: 0,
                referralDiscountAmount: 0,
                totalAmount,
                numberOfNights,
                pricePerNight: pricing.pricePerNight || (totalAmount / numberOfNights),
                taxRate,
                isGstInclusive: false,
            };
            setPriceDetails(solPrice);
            setOriginalPriceDetails(solPrice);
            setAvailability({
                available: true,
                availableRooms: solution.totalRooms || solution.totalRoomsCount || allocatedRooms.length,
            });
        }
    };

    const handleApplyPromoCode = async (code: string) => {
        if (!code.trim() || !selectedProperty?.id) return;
        setIsApplyingPromoCode(true);
        setPromoCodeMessage(null);
        setIsPromoCodeError(false);
        try {
            const firstRoomTypeId = selectedSolution?.rooms?.[0]?.roomTypeId || (watch('roomTypeId') || undefined);
            const checkIn = watchedCheckInDate;
            const checkOut = watchedCheckOutDate;
            const adults = Number(watchedAdults) || 1;
            const children = Number(watchedChildren) || 0;

            const res = await bookingsService.calculatePrice({
                roomTypeId: firstRoomTypeId,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                generalCode: code.trim(),
                isGroupBooking: isGroupMode,
                groupSize: isGroupMode ? (adults + children) : undefined,
                roomCount: selectedSolution?.totalRooms || 1,
            });

            if (res.couponDiscountAmount > 0 || res.referralDiscountAmount > 0) {
                setValue('appliedCode', code.trim().toUpperCase());
                setPriceDetails(res);
                setPromoCodeMessage(`Code "${code.trim().toUpperCase()}" applied successfully!`);
                setIsPromoCodeError(false);
                toast.success('Discount applied!');
            } else {
                setPromoCodeMessage(`Code "${code}" is valid but gave ₹0 discount.`);
                setIsPromoCodeError(false);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Invalid or expired promo/referral code';
            setPromoCodeMessage(msg);
            setIsPromoCodeError(true);
            toast.error(msg);
        } finally {
            setIsApplyingPromoCode(false);
        }
    };

    const handleRemovePromoCode = () => {
        setValue('appliedCode', '');
        setPromoCodeMessage(null);
        setIsPromoCodeError(false);
        if (originalPriceDetails) {
            setPriceDetails(originalPriceDetails);
        }
        toast.success('Promo code removed.');
    };

    const handleApplyCustomSolution = (customSol: any, roomAssignments: Record<number, string>) => {
        setSelectedSolution(customSol);
        setSolutionRoomAssignments(roomAssignments);
        const chosenRoomIds = Object.values(roomAssignments).filter(Boolean);
        setValue('selectedRoomIds', chosenRoomIds);
        setValue('roomId', chosenRoomIds[0] || '');

        const pricing = customSol.pricing;
        const solPrice: PriceCalculationResult = {
            baseAmount: pricing.baseAmount,
            extraAdultAmount: pricing.extraAdultAmount ?? pricing.extraAmount ?? 0,
            extraChildAmount: pricing.extraChildAmount ?? 0,
            taxAmount: pricing.taxAmount,
            discountAmount: 0,
            offerDiscountAmount: 0,
            couponDiscountAmount: 0,
            referralDiscountAmount: 0,
            totalAmount: pricing.totalPrice,
            numberOfNights: pricing.numberOfNights,
            pricePerNight: pricing.pricePerNight,
            taxRate: pricing.taxRate,
            isGstInclusive: Boolean(pricing.isGstInclusive),
        };
        setPriceDetails(solPrice);
        setOriginalPriceDetails(solPrice);
        setAvailability({
            available: true,
            availableRooms: customSol.totalRooms,
        });
        toast.success('Custom Accommodation Solution applied!');
    };

    const triggerSearch = useCallback(async (isExplicitClick: boolean = false) => {
        if (!selectedProperty?.id) return;

        const checkIn = watchedCheckInDate ? new Date(watchedCheckInDate) : null;
        const checkOut = watchedCheckOutDate ? new Date(watchedCheckOutDate) : null;

        if (!checkIn || isNaN(checkIn.getTime()) || !checkOut || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
            return;
        }

        if (isExplicitClick) {
            setHasSearched(true);
        }

        const currentSearch = ++searchRequestId.current;
        setCheckingAvailability(true);

        // Invalidate old selection & solutions immediately on new search
        setSelectedSolution(null);
        setSolutionRoomAssignments({});
        setValue('selectedRoomIds', []);
        setValue('roomId', '');
        setValue('roomTypeId', '');
        setPriceDetails(null);
        setOriginalPriceDetails(null);

        try {
            if (isGroupMode) {
                const gAdults = Number(watchedAdults) || 1;
                const gChildren = Number(watchedChildren) || 0;
                const totalGroupSize = gAdults + gChildren;

                if (totalGroupSize < 2) {
                    setCheckingAvailability(false);
                    return;
                }

                setValue('groupSize', totalGroupSize);

                const avail = await bookingsService.checkAvailability({
                    propertyId: selectedProperty.id,
                    checkInDate: watchedCheckInDate,
                    checkOutDate: watchedCheckOutDate,
                    isGroupBooking: true,
                    groupSize: totalGroupSize,
                    isAdmin: true,
                });

                if (currentSearch !== searchRequestId.current) return;
                setAvailability(avail);

                if (avail.available && avail.allocationPreview && avail.allocationPreview.length > 0) {
                    const preview = avail.allocationPreview;
                    const suggestedIds = preview.map((r: any) => r.id);
                    setValue('selectedRoomIds', suggestedIds);
                    setValue('roomId', suggestedIds[0] || '');

                    const targetRoomTypeId = preview[0]?.roomTypeId || roomTypes?.[0]?.id || '';
                    const priceParams = {
                        roomTypeId: targetRoomTypeId,
                        checkInDate: watchedCheckInDate,
                        checkOutDate: watchedCheckOutDate,
                        adultsCount: gAdults,
                        childrenCount: gChildren,
                        isGroupBooking: true,
                        groupSize: totalGroupSize,
                        roomCount: preview.length,
                        generalCode: getValues('appliedCode'),
                    };

                    const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
                    if (currentSearch !== searchRequestId.current) return;

                    const overrideTotal = getValues('overrideTotal');
                    if (overrideTotal) {
                        const overridePrice = await (bookingsService as any).calculatePrice({
                            ...priceParams,
                            overrideTotal: Number(overrideTotal),
                            isOverrideInclusive: getValues('isOverrideInclusive'),
                        });
                        setPriceDetails(overridePrice);
                    } else {
                        setPriceDetails(originalPrice);
                    }
                    setOriginalPriceDetails(originalPrice);

                    const totalPropertyRooms = roomTypes?.reduce((acc: number, rt: any) => acc + (rt.rooms?.filter((r: any) => r.isEnabled)?.length ?? rt.rooms?.length ?? 0), 0) || 0;
                    const isFullProperty = totalPropertyRooms > 0 && preview.length >= totalPropertyRooms;
                    const groupSolutionTitle = isFullProperty
                        ? `Full Property Buyout (${preview.length} Rooms)`
                        : `Group Accommodation Package (${preview.length} Rooms)`;

                    const groupSolution = {
                        id: 'group-solution',
                        solutionName: groupSolutionTitle,
                        isBestValue: true,
                        totalRooms: preview.length,
                        totalGuestsServed: totalGroupSize,
                        allocatedRooms: preview.map((r: any) => ({
                            roomTypeId: r.roomTypeId,
                            roomTypeName: r.roomType || r.roomTypeName || 'Group Room',
                            roomId: r.id,
                            adults: r.capacity || Math.ceil(totalGroupSize / preview.length),
                            children: 0,
                        })),
                        pricing: {
                            totalPrice: originalPrice.totalAmount,
                            baseAmount: originalPrice.baseAmount,
                            taxAmount: originalPrice.taxAmount,
                            pricePerNight: originalPrice.pricePerNight,
                            numberOfNights: originalPrice.numberOfNights,
                        }
                    };
                    setSelectedSolution(groupSolution);
                } else {
                    setSelectedSolution(null);
                    setPriceDetails(null);
                    setOriginalPriceDetails(null);
                }
            } else {
                const adults = Number(watchedAdults) || 1;
                const children = Number(watchedChildren) || 0;
                const rooms = Math.max(1, Number(watchedRoomsCount) || 1);

                const searchRes = await bookingsService.searchRooms({
                    propertyId: selectedProperty.id,
                    checkInDate: watchedCheckInDate,
                    checkOutDate: watchedCheckOutDate,
                    adults,
                    children,
                    childAges: childAges.length > 0 ? childAges : undefined,
                    infants: infantsCount > 0 ? infantsCount : undefined,
                    rooms,
                    includeSoldOut: true,
                });

                if (currentSearch !== searchRequestId.current) return;

                if (searchRes.accommodationSolutions && searchRes.accommodationSolutions.length > 0) {
                    setAccommodationSolutions(searchRes.accommodationSolutions);
                    handleSelectSolution(searchRes.accommodationSolutions[0]);
                } else {
                    setAccommodationSolutions(null);
                    setSelectedSolution(null);
                    setPriceDetails(null);
                    setOriginalPriceDetails(null);
                    setAvailability(null);
                }

                if (searchRes.availableRoomTypes && searchRes.availableRoomTypes.length > 0) {
                    setAvailableRoomTypesList(searchRes.availableRoomTypes);
                } else if (roomTypes && roomTypes.length > 0) {
                    const fallbackList = roomTypes.map((rt: any) => {
                        const physA = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
                        const physC = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
                        const nRooms = Math.max(
                            Math.ceil(adults / Math.max(physA, 1)),
                            children > 0 ? Math.ceil(children / Math.max(physC, 1)) : 0,
                            rooms
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
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            if (currentSearch === searchRequestId.current) {
                setCheckingAvailability(false);
            }
        }
    }, [
        selectedProperty?.id,
        watchedCheckInDate,
        watchedCheckOutDate,
        watchedAdults,
        watchedChildren,
        watchedRoomsCount,
        childAges,
        infantsCount,
        isGroupMode,
        roomTypes,
        getValues,
        setValue,
    ]);

    // Auto-search effect with debounce (ONLY runs after initial explicit search)
    useEffect(() => {
        if (!hasSearched) return;

        const debounceTimer = setTimeout(() => {
            triggerSearch(false);
        }, 350);

        return () => clearTimeout(debounceTimer);
    }, [
        hasSearched,
        watchedCheckInDate,
        watchedCheckOutDate,
        watchedAdults,
        watchedChildren,
        watchedRoomsCount,
        childAges,
        infantsCount,
        isGroupMode,
        triggerSearch,
    ]);

    const handleSelectRoomType = async (roomTypeId: string) => {
        const rt = roomTypes?.find(r => r.id === roomTypeId);
        if (rt) {
            const canFit = canRoomTypeFitParty(rt, {
                adults: Number(watch('adultsCount') || 1),
                children: Number(watch('childrenCount') || 0),
                infants: infantsCount || 0,
            });
            if (!canFit && accommodationSolutions && accommodationSolutions.length > 0) {
                toast.error(`A single ${rt.name} cannot accommodate ${watch('adultsCount')} adults & ${watch('childrenCount') || 0} children. Please select an Accommodation Solution above.`, { duration: 5000 });
                return;
            }
        }
        setSelectedSolution(null);
        setSolutionRoomAssignments({});
        setValue('roomTypeId', roomTypeId);
        setValue('roomId', '');
        setValue('selectedRoomIds', []);
        setValue('extraAdultsCount', 0);
        setValue('extraChildrenCount', 0);

        // Fetch direct room type availability
        try {
            setCheckingAvailability(true);
            const avail = await bookingsService.checkAvailability({
                roomTypeId,
                checkInDate: watchedCheckInDate,
                checkOutDate: watchedCheckOutDate,
                propertyId: selectedProperty?.id,
                isAdmin: true,
            });
            setAvailability(avail);
            if (avail.available && avail.roomList && avail.roomList.length > 0) {
                const firstRoom = avail.roomList[0];
                setValue('selectedRoomIds', [firstRoom.id]);
                setValue('roomId', firstRoom.id);

                const priceParams = {
                    roomTypeId,
                    checkInDate: watchedCheckInDate,
                    checkOutDate: watchedCheckOutDate,
                    adultsCount: Number(watchedAdults) || 1,
                    childrenCount: Number(watchedChildren) || 0,
                    roomCount: 1,
                    generalCode: getValues('appliedCode'),
                };
                const calcPrice = await (bookingsService as any).calculatePrice(priceParams);
                setPriceDetails(calcPrice);
                setOriginalPriceDetails(calcPrice);
            }
        } catch (e) {
            console.error('Failed to select room type', e);
        } finally {
            setCheckingAvailability(false);
        }
    };

    const handleAssignRoom = (roomIndex: number, roomId: string) => {
        setSolutionRoomAssignments(prev => {
            const updated = { ...prev, [roomIndex]: roomId };
            const ids = Object.values(updated).filter(Boolean);
            setValue('selectedRoomIds', ids);
            setValue('roomId', ids[0] || '');
            return updated;
        });
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

    const handleOverrideBlur = async () => {
        const currentValues = getValues();
        const overrideTotal = currentValues.overrideTotal;
        const isGroup = currentValues.isGroupBooking;
        const targetRoomTypeId = currentValues.roomTypeId;
        const roomCount = (currentValues.selectedRoomIds || []).length || 1;

        if (originalPriceDetails) {
            if (!overrideTotal) {
                setPriceDetails(originalPriceDetails);
                return;
            }
            try {
                const priceParams = {
                    roomTypeId: isGroup ? (availability?.allocationPreview?.[0]?.roomTypeId || targetRoomTypeId) : (targetRoomTypeId || selectedSolution?.allocatedRooms?.[0]?.roomTypeId || selectedSolution?.rooms?.[0]?.roomTypeId),
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
                    overrideTotal: Number(overrideTotal),
                    isOverrideInclusive: currentValues.isOverrideInclusive,
                };
                const overridePrice = await (bookingsService as any).calculatePrice(priceParams);
                setPriceDetails(overridePrice);
            } catch (e) {
                console.error('Failed to calculate override price', e);
            }
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
                errors: ['Please select a valid accommodation solution before submitting the booking.']
            });
            return;
        }

        if (!data.isGroupBooking && !selectedSolution) {
            const selectedCount = (data.selectedRoomIds || []).length;
            const minAllowedRooms = occupancyStats?.minRoomsByMaxCap || requiredRooms;
            if (selectedCount < minAllowedRooms) {
                setShowInsufficientModal(true);
                return;
            }
        }

        const allocatedRooms = selectedSolution?.rooms || selectedSolution?.allocatedRooms || [];
        let roomAllocationsPayload = undefined;
        if (!data.isGroupBooking && selectedSolution && allocatedRooms.length > 0) {
            roomAllocationsPayload = allocatedRooms.map((ar: any, idx: number) => ({
                roomTypeId: ar.roomTypeId,
                roomId: solutionRoomAssignments[idx] || ar.roomId || undefined,
                adults: ar.adults,
                children: ar.children,
                childAges: ar.childAges || (ar.children > 0 ? childAges.slice(0, ar.children) : []),
                infants: ar.infants || 0,
                extraAdults: ar.extraAdults || 0,
                extraChildren: ar.extraChildren || 0,
            }));
        } else if (!data.isGroupBooking && data.roomTypeId) {
            roomAllocationsPayload = [{
                roomTypeId: data.roomTypeId,
                roomId: data.selectedRoomIds && data.selectedRoomIds.length > 0 ? data.selectedRoomIds[0] : (data.roomId || undefined),
                adults: Number(data.adultsCount),
                children: Number(data.childrenCount || 0),
                childAges: childAges,
                infants: Number(infantsCount || 0),
                extraAdults: Number(data.extraAdultsCount || 0),
                extraChildren: Number(data.extraChildrenCount || 0),
            }];
        }

        const { propertyId, paymentOption, appliedCode, guestFirstName, guestLastName, guestEmail, guestPhone, isBookerAlsoGuest, ...rest } = data;

        const totalGroupSize = data.isGroupBooking ? (Number(data.adultsCount) + Number(data.childrenCount || 0)) : undefined;

        const sanitizedData = {
            ...rest,
            propertyId: selectedProperty?.id || propertyId,
            roomAllocations: roomAllocationsPayload,
            childAges: (!data.isGroupBooking && childAges.length > 0) ? childAges : undefined,
            infants: (!data.isGroupBooking && infantsCount > 0) ? infantsCount : undefined,
            roomsCount: data.isGroupBooking ? undefined : (Math.max(1, Number(data.roomsCount) || 1)),
            guestName: `${guestFirstName} ${guestLastName || ''}`.trim(),
            guestEmail: guestEmail || undefined,
            guestPhone: guestPhone,
            transactionDate: data.isHistoricalEntry ? data.transactionDate : undefined,
            generalCode: appliedCode || undefined,
            isGroupBooking: Boolean(data.isGroupBooking),
            groupSize: totalGroupSize,
            roomTypeId: data.isGroupBooking ? undefined : (selectedSolution?.allocatedRooms?.[0]?.roomTypeId || rest.roomTypeId),
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

    if (loadingRoomTypes) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isReadyToBook = Boolean(availability?.available && (selectedSolution || watch('roomTypeId')));

    return (
        <div className="max-w-[1560px] mx-auto pb-32 px-3 sm:px-6 lg:px-8">
            {/* Full Page Loader Overlay during submission */}
            {createBookingMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-widest">Creating Reservation...</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-2">Please wait, confirming reservation with server.</p>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/bookings');
                            }
                        }}
                        className="p-2.5 hover:bg-muted rounded-xl border border-border shadow-xs transition-all hover:scale-105 active:scale-95 bg-card cursor-pointer"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                            {selectedProperty?.name || 'Resort Operations'}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-0.5">
                            Create New Booking
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-black uppercase tracking-wider text-primary w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Frontdesk Workspace
                </div>
            </div>

            {/* Historical Stay Notice */}
            {watch('isHistoricalEntry') && (
                <div className="mb-6 p-4 sm:p-5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200 transition-all">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            ⚠️ Backdated Historical Booking Active
                        </h3>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300/90 leading-relaxed">
                            Creating a historical record for a past stay. Full payment will be logged automatically and status set directly to Checked Out.
                        </p>
                    </div>
                </div>
            )}

            {/* Main 2-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* ── LEFT COLUMN: MAIN WORKSPACE (~65% Width) ── */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <form 
                        id="create-booking-form" 
                        onSubmit={handleSubmit(onSubmit, (errs) => {
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
                        })} 
                        className="space-y-6"
                    >
                        {/* ── SECTION 1: STAY & PARTY CONFIGURATION ── */}
                        <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                                <h2 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-wider">
                                    <Calendar className="h-5 w-5 text-primary" /> 1. Stay & Party Configuration
                                </h2>

                                {/* Standard vs Group Booking Mode Switch */}
                                <div className="flex bg-muted p-1 rounded-xl w-fit border border-border shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleGroupMode(false)}
                                        className={clsx(
                                            'px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                                            !isGroupMode
                                                ? 'bg-card text-primary shadow-xs ring-1 ring-black/5 font-black'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Standard Booking
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleGroupMode(true)}
                                        className={clsx(
                                            'px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                                            isGroupMode
                                                ? 'bg-card text-primary shadow-xs ring-1 ring-black/5 font-black'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Group Booking
                                    </button>
                                </div>
                            </div>

                            {/* Standard Booking Mode Inputs */}
                            {!isGroupMode ? (
                                <div className="space-y-4">
                                    {/* FIRST ROW: Check-in & Check-out Dates */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {/* Check-In Date */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-in Date
                                            </label>
                                            <input 
                                                type="date" 
                                                {...register('checkInDate')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.checkInDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkInDate.message}</p>}
                                        </div>

                                        {/* Check-Out Date */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-out Date
                                            </label>
                                            <input 
                                                type="date" 
                                                {...register('checkOutDate')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.checkOutDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkOutDate.message}</p>}
                                        </div>
                                    </div>

                                    {/* SECOND ROW: Party Inputs (Rooms, Adults, Children, Infants) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {/* Rooms Count */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <BedDouble className="h-3.5 w-3.5 text-primary" /> Rooms
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                {...register('roomsCount', { valueAsNumber: true })}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.roomsCount && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.roomsCount.message}</p>}
                                        </div>

                                        {/* Adults */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-primary" /> Adults (13+ yrs)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                {...register('adultsCount', { valueAsNumber: true })}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.adultsCount && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.adultsCount.message}</p>}
                                        </div>

                                        {/* Children */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Children (3–12 yrs)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                {...register('childrenCount', { 
                                                    valueAsNumber: true,
                                                    onChange: (e) => {
                                                        const newCount = Number(e.target.value) || 0;
                                                        setChildAges(prev => {
                                                            if (newCount > prev.length) {
                                                                const added = Array(newCount - prev.length).fill(5);
                                                                return [...prev, ...added];
                                                            } else {
                                                                return prev.slice(0, newCount);
                                                            }
                                                        });
                                                    }
                                                })}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                        </div>

                                        {/* Infants Count */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Infants (0–2 yrs)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                value={infantsCount}
                                                onChange={(e) => setInfantsCount(Math.max(0, Number(e.target.value) || 0))}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">Stay free (exempt from room occupancy limits)</p>
                                        </div>
                                    </div>

                                    {/* Child Ages Selector (where applicable) */}
                                    {Number(watch('childrenCount') || 0) > 0 && (
                                        <div className="space-y-2 p-3.5 bg-muted/30 rounded-xl border border-border">
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                                Child Ages at Stay (3–12 yrs)
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from({ length: Number(watch('childrenCount') || 0) }).map((_, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1.5 rounded-lg shadow-2xs">
                                                        <span className="text-[11px] font-bold text-muted-foreground">Child {idx + 1}:</span>
                                                        <select
                                                            value={childAges[idx] !== undefined ? childAges[idx] : 5}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value) || 5;
                                                                setChildAges(prev => {
                                                                    const updated = [...prev];
                                                                    updated[idx] = val;
                                                                    return updated;
                                                                });
                                                            }}
                                                            className="h-7 text-xs font-black border border-input bg-background rounded px-1.5 focus:ring-1 focus:ring-primary cursor-pointer"
                                                        >
                                                            {Array.from({ length: 10 }, (_, i) => i + 3).map(age => (
                                                                <option key={age} value={age}>{age} yrs</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Group Booking Mode Inputs */
                                <div className="space-y-4">
                                    {/* FIRST ROW: Check-in & Check-out Dates */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {/* Check-In Date */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-in Date
                                            </label>
                                            <input 
                                                type="date" 
                                                {...register('checkInDate')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.checkInDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkInDate.message}</p>}
                                        </div>

                                        {/* Check-Out Date */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-out Date
                                            </label>
                                            <input 
                                                type="date" 
                                                {...register('checkOutDate')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                            {errors.checkOutDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkOutDate.message}</p>}
                                        </div>
                                    </div>

                                    {/* SECOND ROW: Group Party Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {/* Group Adults */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-primary" /> Group Adults (13+ yrs)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                {...register('adultsCount', { valueAsNumber: true })}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                        </div>

                                        {/* Group Children */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Group Children (3–12 yrs)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                {...register('childrenCount', { valueAsNumber: true })}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                            />
                                        </div>
                                    </div>

                                    {/* Group Summary Banner */}
                                    <div className="flex items-center justify-between p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                                                Group Booking Mode (No Child Ages Required)
                                            </span>
                                            <p className="text-xs font-bold text-foreground">
                                                Total Group Size: {(Number(watch('adultsCount')) || 1) + (Number(watch('childrenCount')) || 0)} Guests
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            Group Pool Rates Applied
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* THIRD ROW: Check Availability Button & Live Status */}
                            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => triggerSearch(true)}
                                    disabled={checkingAvailability}
                                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                                >
                                    {checkingAvailability ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Checking Availability...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4" /> Check Availability
                                        </>
                                    )}
                                </button>

                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                    {hasSearched ? (
                                        checkingAvailability ? (
                                            <span className="text-primary font-bold flex items-center gap-1.5">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auto-refreshing solutions...
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                <CheckCircle className="h-3.5 w-3.5" /> Solutions auto-refreshed with latest parameters
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-muted-foreground font-medium">
                                            Click "Check Availability" to find accommodation solutions
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* ── SECTION 2: ACCOMMODATION SOLUTIONS (PRIMARY DECISION AREA) ── */}
                        <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                                <div>
                                    <h2 className="text-base font-black flex items-center gap-2 text-foreground uppercase tracking-wider">
                                        <Sparkles className="h-5 w-5 text-primary" /> 2. Accommodation Selection
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {!hasSearched
                                            ? 'Enter your stay dates and party numbers above, then click Check Availability.'
                                            : isGroupMode
                                                ? 'Pooled group accommodation solutions matching your group size.'
                                                : (accommodationSolutions && accommodationSolutions.length > 0 
                                                    ? `Showing top accommodation solutions for your party.`
                                                    : 'Recommended accommodation solutions matching your exact party composition.')}
                                    </p>
                                </div>
                                {!isGroupMode && hasSearched && accommodationSolutions && accommodationSolutions.length > 0 && (
                                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider w-fit">
                                        {accommodationSolutions.length} Valid Solution{accommodationSolutions.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Initial State Before Search */}
                            {!hasSearched ? (
                                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-2.5">
                                    <Search className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
                                    <p className="text-sm font-black text-foreground uppercase tracking-wider">
                                        Ready to Search
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                        Enter your check-in, check-out, and guest details above, then click <span className="font-bold text-primary">"Check Availability"</span> to fetch accommodation solutions.
                                    </p>
                                </div>
                            ) : !isGroupMode ? (
                                /* Standard Booking Mode Solutions */
                                <>
                                    {accommodationSolutions && accommodationSolutions.length > 0 ? (
                                        <div className="space-y-3.5">
                                            {/* Show first 2 solutions directly on page */}
                                            {accommodationSolutions.slice(0, 2).map((sol: any) => (
                                                <AccommodationPackageCard
                                                    key={sol.id}
                                                    solution={sol}
                                                    isSelected={selectedSolution?.id === sol.id}
                                                    adultsCount={Number(watch('adultsCount')) || 1}
                                                    childrenCount={Number(watch('childrenCount')) || 0}
                                                    onSelect={handleSelectSolution}
                                                />
                                            ))}

                                            {/* Button to view all solutions in modal if > 2 solutions */}
                                            {accommodationSolutions.length > 2 && (
                                                <div className="pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowFullSolutionsModal(true)}
                                                        className="w-full py-3 px-4 bg-muted/70 hover:bg-muted border border-border rounded-xl text-xs font-black uppercase tracking-wider text-foreground hover:text-primary transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                                                    >
                                                        <Layers className="h-4 w-4 text-primary" />
                                                        View All {accommodationSolutions.length} Accommodation Solutions (Modal)
                                                    </button>
                                                </div>
                                            )}

                                            {/* Secondary Fallback: Create Custom Accommodation Solution */}
                                            <div className="pt-2 border-t border-border/60">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                                                            Can't find a suitable arrangement?
                                                        </span>
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                                            Secondary Custom Arrangement
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground font-medium">
                                                            Manually construct a custom multi-room guest allocation matching your operational needs.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCustomSolutionModal(true)}
                                                        className="px-4 py-2.5 bg-background hover:bg-muted border border-border hover:border-primary/50 text-foreground hover:text-primary font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                    >
                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Create Custom Accommodation Solution
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5">
                                            <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-2">
                                                <BedDouble className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
                                                <p className="text-sm font-bold text-foreground">
                                                    {checkingAvailability ? 'Searching optimal solutions...' : 'No valid accommodation solutions found for this party composition.'}
                                                </p>
                                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                    The party exceeds single-room capacity or available inventory. Adjust party numbers or dates.
                                                </p>
                                            </div>

                                            {/* Fallback Custom Solution Trigger when 0 solver solutions found */}
                                            <div className="pt-1">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                                                            Manual Operational Selection
                                                        </span>
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                                            Construct Custom Accommodation Solution
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground font-medium">
                                                            Select room types and physical rooms manually to host this party.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCustomSolutionModal(true)}
                                                        className="px-4 py-2.5 bg-background hover:bg-muted border border-border hover:border-primary/50 text-foreground hover:text-primary font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                    >
                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Create Custom Solution
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Secondary Room Inventory Reference Panel */}
                                    <div className="pt-2">
                                        <PropertyInventoryReference
                                            roomTypesList={sortedRoomTypesList}
                                            selectedRoomTypeId={!selectedSolution ? watch('roomTypeId') : undefined}
                                            hasValidSolutions={Boolean(accommodationSolutions && accommodationSolutions.length > 0)}
                                            adultsCount={Number(watch('adultsCount')) || 1}
                                            childrenCount={Number(watch('childrenCount')) || 0}
                                            infantsCount={infantsCount}
                                            onSelectRoomType={handleSelectRoomType}
                                        />
                                    </div>
                                </>
                            ) : (
                                /* Group Booking Mode Solutions */
                                <div className="space-y-3.5">
                                    {checkingAvailability ? (
                                        <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-2.5">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto opacity-75" />
                                            <p className="text-sm font-black text-foreground uppercase tracking-wider">
                                                Checking Group Availability...
                                            </p>
                                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                Scanning property group pool capacity and calculating group rate.
                                            </p>
                                        </div>
                                    ) : availability?.available && selectedSolution ? (
                                        <AccommodationPackageCard
                                            solution={selectedSolution}
                                            isSelected={true}
                                            adultsCount={Number(watch('adultsCount')) || 1}
                                            childrenCount={Number(watch('childrenCount')) || 0}
                                            onSelect={() => {}}
                                        />
                                    ) : (
                                        <div className="p-6 text-center rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/5 space-y-2">
                                            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                                                {availability?.groupUnavailableReason || 'Group booking unavailable for selected party size/dates.'}
                                            </p>
                                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                Property group pool does not have sufficient capacity for this group size.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* ── SECTIONS 3, 4, 5: DISPLAYED ONLY AFTER SELECTING A SOLUTION ── */}
                        {hasSearched && (selectedSolution || (!isGroupMode && watch('roomTypeId'))) && (
                            <>
                                {/* ── SECTION 3: PHYSICAL ROOM ASSIGNMENT ── */}
                                {selectedSolution && (
                                    <RoomAssignmentSection
                                        selectedSolution={selectedSolution}
                                        roomTypes={roomTypes}
                                        solutionRoomAssignments={solutionRoomAssignments}
                                        onAssignRoom={handleAssignRoom}
                                    />
                                )}

                                {/* Fallback Physical Room Toggle List if Single Room Type Selected Directly */}
                                {!selectedSolution && !isGroupMode && availability?.available && availability.roomList && availability.roomList.length > 0 && (
                                    <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-border">
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                                                    3. Select Physical Room Numbers ({(watch('selectedRoomIds') || []).length} Selected)
                                                </h3>
                                                <p className="text-xs text-muted-foreground">Click room numbers to toggle physical room assignment.</p>
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
                                                    className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Occupancy Guidance */}
                                        {occupancyStats && occupancyStats.isPhysicallyInsufficient && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-medium">
                                                ⚠️ Need at least {occupancyStats.minRoomsByMaxCap} rooms to physically accommodate all {occupancyStats.adultsCount} adults.
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
                                                            "p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all",
                                                            isSelected 
                                                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                                : "bg-background border-border hover:border-primary/40 text-foreground"
                                                        )}
                                                    >
                                                        <span className="text-sm font-black block">Room #{room.roomNumber || room.name}</span>
                                                        <span className="text-[10px] opacity-80">{room.roomType || 'Standard'}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}


                                {/* ── SECTION 4: OFFLINE CHANNEL PARTNER / AGENT REFERRAL ── */}
                                <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                                                    4. Offline Channel Partner / Agent Referral (Optional)
                                                </h3>
                                                <p className="text-xs text-muted-foreground">Attach an offline travel agent or partner referral to this reservation.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="enable-offline-cp"
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
                                                className="h-4 w-4 rounded border-input text-primary cursor-pointer"
                                            />
                                            <label htmlFor="enable-offline-cp" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                                Enable Referral
                                            </label>
                                        </div>
                                    </div>

                                    {isOfflineCpBooking && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 animate-in fade-in duration-200">
                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1">Select Channel Partner</label>
                                                <select
                                                    value={selectedOfflineCpId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedOfflineCpId(val);
                                                        if (val !== 'NEW') {
                                                            const cp = offlineCps?.find(c => c.id === val);
                                                            if (cp) setOfflineCpCommission(Number(cp.defaultCommission) || 0);
                                                        } else {
                                                            setNewOfflineCpName('');
                                                            setNewOfflineCpPhone('');
                                                            setOfflineCpCommission(0);
                                                        }
                                                    }}
                                                    className="w-full border border-input bg-background rounded-xl h-11 px-3 text-xs font-bold"
                                                >
                                                    <option value="NEW">+ Add New Offline Partner</option>
                                                    {offlineCps?.map((cp) => (
                                                        <option key={cp.id} value={cp.id}>
                                                            {cp.name} ({cp.phone || 'No phone'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedOfflineCpId === 'NEW' && (
                                                <>
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground mb-1">Agent / Partner Name *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Sunrise Holidays"
                                                            value={newOfflineCpName}
                                                            onChange={(e) => setNewOfflineCpName(e.target.value)}
                                                            className="w-full border border-input bg-background rounded-xl h-11 px-3 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground mb-1">Agent Phone</label>
                                                        <input
                                                            type="text"
                                                            placeholder="+91..."
                                                            value={newOfflineCpPhone}
                                                            onChange={(e) => setNewOfflineCpPhone(e.target.value)}
                                                            className="w-full border border-input bg-background rounded-xl h-11 px-3 text-xs font-bold"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-muted-foreground mb-1">Commission (₹)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={offlineCpCommission || ''}
                                                    onChange={(e) => setOfflineCpCommission(Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="w-full border border-input bg-background rounded-xl h-11 px-3 text-xs font-bold"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* ── SECTION 5: GUEST INFORMATION ── */}
                                <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-5">
                                    <h2 className="text-base font-black flex items-center gap-2 text-foreground pb-3 border-b border-border uppercase tracking-wider">
                                        <Users className="h-5 w-5 text-primary" /> 5. Guest & Booker Information
                                    </h2>

                                    {/* Primary Contact Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative phone-autocomplete-container md:col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Primary Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register('guestPhone')}
                                                onFocus={() => { if (phoneSearchResults.length > 0) setShowPhoneDropdown(true); }}
                                                placeholder="Enter primary contact number"
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                            {showPhoneDropdown && phoneSearchResults.length > 0 && (
                                                <div className="absolute z-20 w-full mt-1 bg-background border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto left-0">
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
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                First Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register('guestFirstName')}
                                                placeholder="Enter first name"
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                            {errors.guestFirstName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestFirstName.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Last Name (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                {...register('guestLastName')}
                                                placeholder="Enter last name"
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Email (Optional)
                                            </label>
                                            <input
                                                type="email"
                                                {...register('guestEmail')}
                                                placeholder="Enter email address"
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Primary WhatsApp Number (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                {...register('whatsappNumber')}
                                                placeholder="Enter WhatsApp number"
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>

                                        <div className="md:col-span-2 flex items-center pt-1">
                                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    {...register('isBookerAlsoGuest')}
                                                    className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-xs font-bold text-foreground">
                                                    Booker is staying as the Primary Guest (Guest 1)
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Progressive Disclosure: Additional Guests Accordion */}
                                    <div className="pt-2 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdditionalGuests(prev => !prev)}
                                            className="w-full py-2.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                                        >
                                            <span className="flex items-center gap-2">
                                                <UserPlus className="h-4 w-4 text-primary" />
                                                Additional Guests & ID Details ({fields.length} Registered)
                                            </span>
                                            {showAdditionalGuests ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showAdditionalGuests && (
                                            <div className="space-y-4 pt-3 animate-in fade-in duration-200">
                                                <div className="flex justify-end">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => append({ firstName: '', lastName: '' })} 
                                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                                    >
                                                        + Add Guest
                                                    </button>
                                                </div>

                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="p-4 bg-muted/30 rounded-xl border border-border relative space-y-3">
                                                        {fields.length > 1 && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => remove(index)} 
                                                                className="absolute top-3 right-3 text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-500/10 px-2 py-1 rounded-md transition-all cursor-pointer"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                                                            Guest {index + 1} {index === 0 && '(Primary)'}
                                                        </span>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <input
                                                                {...register(`guests.${index}.firstName`)}
                                                                placeholder="First Name"
                                                                readOnly={index === 0 && isBookerAlsoGuest}
                                                                className="border border-input bg-background rounded-lg px-3 py-2 text-xs font-semibold"
                                                            />
                                                            <input
                                                                {...register(`guests.${index}.lastName`)}
                                                                placeholder="Last Name"
                                                                readOnly={index === 0 && isBookerAlsoGuest}
                                                                className="border border-input bg-background rounded-lg px-3 py-2 text-xs font-semibold"
                                                            />
                                                            <select
                                                                {...register(`guests.${index}.idType`)}
                                                                className="border border-input bg-background rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                                            >
                                                                <option value="">-- ID Type (Optional) --</option>
                                                                <option value="AADHAR">Aadhaar Card</option>
                                                                <option value="PASSPORT">Passport</option>
                                                                <option value="VOTER_ID">Voter ID</option>
                                                                <option value="DRIVING_LICENSE">Driving License</option>
                                                            </select>
                                                            <input
                                                                {...register(`guests.${index}.idNumber`)}
                                                                placeholder="ID Number (Optional)"
                                                                className="border border-input bg-background rounded-lg px-3 py-2 text-xs font-semibold"
                                                            />

                                                            {/* ID Document Photo Upload */}
                                                            <div className="sm:col-span-2 pt-1 flex items-center gap-3">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleGuestFileUpload(index, e, false)}
                                                                    className="hidden"
                                                                    id={`guest-id-upload-front-${index}`}
                                                                />
                                                                <label
                                                                    htmlFor={`guest-id-upload-front-${index}`}
                                                                    className="px-3 py-1.5 bg-background border border-input rounded-lg cursor-pointer hover:bg-muted transition-colors text-xs font-bold text-foreground flex items-center gap-1.5 shadow-2xs border-dashed"
                                                                >
                                                                    {idUploading[`front-${index}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                    {watch(`guests.${index}.idImage`) ? 'Change Front Photo' : 'Upload ID Photo (Front)'}
                                                                </label>
                                                                {watch(`guests.${index}.idImage`) && (
                                                                    <a
                                                                        href={watch(`guests.${index}.idImage`)}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs font-bold text-primary underline"
                                                                    >
                                                                        View Uploaded ID ✓
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progressive Disclosure: Corporate GSTIN Accordion */}
                                    <div className="pt-2 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => setShowGstDetails(prev => !prev)}
                                            className="w-full py-2.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-primary" />
                                                Corporate GST / Tax Invoice Details
                                            </span>
                                            {showGstDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showGstDetails && (
                                            <div className="pt-3 space-y-3 animate-in fade-in duration-200">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">GSTIN Number</label>
                                                <input
                                                    type="text"
                                                    {...register('gstNumber')}
                                                    placeholder="Enter 15-digit GSTIN"
                                                    className="w-full max-w-md border border-input bg-background rounded-xl h-11 px-4 text-xs font-black uppercase"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* ── SECTION 6: PAYMENT & ADDITIONAL DETAILS ── */}
                                <div className="bg-card p-5 sm:p-7 rounded-2xl shadow-sm border border-border space-y-5">
                                    <h2 className="text-base font-black flex items-center gap-2 text-foreground pb-3 border-b border-border uppercase tracking-wider">
                                        <CheckCircle className="h-5 w-5 text-emerald-500" /> 6. Payment & Additional Details
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Payment Option / Status
                                            </label>
                                            <select 
                                                {...register('paymentOption')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-xs font-bold cursor-pointer"
                                            >
                                                <option value="FULL">Collect Full Payment</option>
                                                <option value="PARTIAL">Collect Partial / Deposit</option>
                                            </select>
                                        </div>

                                        {watch('paymentOption') === 'PARTIAL' && (
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1.5">
                                                    Deposit Amount Paid (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    {...register('paidAmount', { valueAsNumber: true })}
                                                    className="w-full border border-input bg-background rounded-xl shadow-xs h-11 px-4 font-black text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Payment Method
                                            </label>
                                            <select 
                                                {...register('paymentMethod')} 
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-4 text-xs font-bold cursor-pointer"
                                            >
                                                <option value="CASH">Cash</option>
                                                <option value="UPI">UPI / QR Code</option>
                                                <option value="CARD">Debit / Credit Card</option>
                                                <option value="WALLET">Channel Partner Wallet</option>
                                                <option value="ONLINE">Online Payment Link</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Progressive Disclosure: Price Override Accordion */}
                                    <div className="pt-2 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => setShowPriceOverride(prev => !prev)}
                                            className="w-full py-2.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                Custom Price Override (Optional)
                                            </span>
                                            {showPriceOverride ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showPriceOverride && (
                                            <div className="pt-3 space-y-3 animate-in fade-in duration-200 p-4 bg-muted/30 rounded-xl border border-border">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground mb-1">Override Amount (₹)</label>
                                                        <input
                                                            type="number"
                                                            {...register('overrideTotal', {
                                                                setValueAs: v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
                                                                onBlur: handleOverrideBlur
                                                            })}
                                                            placeholder="Custom total amount"
                                                            className="w-full border border-input bg-background rounded-lg h-10 px-3 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground mb-1">Reason for Override</label>
                                                        <input 
                                                            type="text" 
                                                            {...register('overrideReason')} 
                                                            placeholder="Reason for discount/custom rate"
                                                            className="w-full border border-input bg-background rounded-lg h-10 px-3 text-xs font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progressive Disclosure: Special Requests & Notes Accordion */}
                                    <div className="pt-2 border-t border-border">
                                        <button
                                            type="button"
                                            onClick={() => setShowNotes(prev => !prev)}
                                            className="w-full py-2.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                                        >
                                            <span className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                Special Requests & Staff Notes
                                            </span>
                                            {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showNotes && (
                                            <div className="pt-3 animate-in fade-in duration-200">
                                                <textarea
                                                    {...register('specialRequests')}
                                                    rows={2}
                                                    placeholder="Guest preferences, arrival time, or internal staff notes"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl p-3 text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                    </form>
                </div>


                {/* ── RIGHT COLUMN: STICKY BOOKING SUMMARY (~35% Width on Desktop) ── */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-4 h-fit sticky top-20">
                    <BookingSummarySidebar
                        propertyName={selectedProperty?.name}
                        checkInDate={watchedCheckInDate}
                        checkOutDate={watchedCheckOutDate}
                        adultsCount={Number(watchedAdults) || 1}
                        childrenCount={Number(watchedChildren) || 0}
                        infantsCount={infantsCount}
                        childAges={childAges}
                        isGroupBooking={isGroupMode}
                        groupSize={watch('groupSize')}
                        selectedSolution={selectedSolution}
                        solutionRoomAssignments={solutionRoomAssignments}
                        roomTypes={roomTypes}
                        priceDetails={priceDetails}
                        originalPriceDetails={originalPriceDetails}
                        overrideTotal={watch('overrideTotal')}
                        isOverrideInclusive={watch('isOverrideInclusive')}
                        paymentOption={watch('paymentOption')}
                        paymentMethod={watch('paymentMethod')}
                        paidAmount={watch('paidAmount')}
                        isSubmitting={createBookingMutation.isPending}
                        isReadyToBook={isReadyToBook}
                        appliedCode={watch('appliedCode')}
                        onApplyCode={handleApplyPromoCode}
                        onRemoveCode={handleRemovePromoCode}
                        isApplyingCode={isApplyingPromoCode}
                        codeMessage={promoCodeMessage}
                        isCodeError={isPromoCodeError}
                    />
                </div>

            </div>

            {/* ── MOBILE STICKY BOTTOM ACTION BAR (<1024px) ── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3.5 shadow-2xl flex items-center justify-between gap-3">
                <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Total Amount
                    </span>
                    <span className="text-lg font-black text-primary">
                        ₹{(watch('overrideTotal') || priceDetails?.totalAmount || 0).toLocaleString()}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowMobileSummarySheet(true)}
                        className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold border border-border"
                    >
                        Summary ▲
                    </button>
                    <button
                        type="submit"
                        form="create-booking-form"
                        disabled={!isReadyToBook || createBookingMutation.isPending}
                        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider shadow-sm disabled:opacity-50"
                    >
                        {createBookingMutation.isPending ? 'Booking...' : 'Confirm'}
                    </button>
                </div>
            </div>

            {/* Mobile Summary Drawer Sheet */}
            {showMobileSummarySheet && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in">
                    <div className="bg-card rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border-t border-border">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <h3 className="font-black text-base uppercase tracking-wider text-foreground">Booking Summary</h3>
                            <button onClick={() => setShowMobileSummarySheet(false)} className="p-2 hover:bg-muted rounded-full">
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>
                        <BookingSummarySidebar
                            propertyName={selectedProperty?.name}
                            checkInDate={watchedCheckInDate}
                            checkOutDate={watchedCheckOutDate}
                            adultsCount={Number(watchedAdults) || 1}
                            childrenCount={Number(watchedChildren) || 0}
                            infantsCount={infantsCount}
                            childAges={childAges}
                            isGroupBooking={isGroupMode}
                            groupSize={watch('groupSize')}
                            selectedSolution={selectedSolution}
                            solutionRoomAssignments={solutionRoomAssignments}
                            roomTypes={roomTypes}
                            priceDetails={priceDetails}
                            originalPriceDetails={originalPriceDetails}
                            overrideTotal={watch('overrideTotal')}
                            isOverrideInclusive={watch('isOverrideInclusive')}
                            paymentOption={watch('paymentOption')}
                            paymentMethod={watch('paymentMethod')}
                            paidAmount={watch('paidAmount')}
                            isSubmitting={createBookingMutation.isPending}
                            isReadyToBook={isReadyToBook}
                            appliedCode={watch('appliedCode')}
                            onApplyCode={handleApplyPromoCode}
                            onRemoveCode={handleRemovePromoCode}
                            isApplyingCode={isApplyingPromoCode}
                            codeMessage={promoCodeMessage}
                            isCodeError={isPromoCodeError}
                        />
                    </div>
                </div>
            )}

            {/* Full Accommodation Solutions Modal */}
            {showFullSolutionsModal && accommodationSolutions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-3xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/40">
                            <div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Accommodation Solutions</span>
                                <h2 className="text-lg font-black text-foreground tracking-tight">
                                    All Accommodation Solutions ({accommodationSolutions.length} Available)
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFullSolutionsModal(false)}
                                className="p-2 hover:bg-muted rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                            {accommodationSolutions.map((sol: any) => (
                                <AccommodationPackageCard
                                    key={sol.id}
                                    solution={sol}
                                    isSelected={selectedSolution?.id === sol.id}
                                    adultsCount={Number(watch('adultsCount')) || 1}
                                    childrenCount={Number(watch('childrenCount')) || 0}
                                    onSelect={(s) => {
                                        handleSelectSolution(s);
                                        setShowFullSolutionsModal(false);
                                    }}
                                />
                            ))}
                        </div>
                        <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowFullSolutionsModal(false)}
                                className="px-5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Validation & Insufficient Modals */}
            {errorModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-red-500/10">
                            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                {errorModal.title}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 hover:bg-muted rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {Array.isArray(errorModal.errors) ? (
                                <ul className="list-disc pl-5 text-sm text-foreground space-y-1.5 font-medium">
                                    {errorModal.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            ) : (
                                <div className="text-sm text-foreground font-medium">{errorModal.errors}</div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end">
                            <button
                                type="button"
                                onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs uppercase"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showInsufficientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 space-y-4">
                        <h2 className="text-lg font-bold text-amber-600 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" /> Insufficient Capacity
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Selected rooms cannot accommodate the requested party. Please select additional rooms or choose a recommended multi-room package.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowInsufficientModal(false)}
                            className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs uppercase"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Accommodation Solution Modal */}
            <CustomAccommodationModal
                isOpen={showCustomSolutionModal}
                onClose={() => setShowCustomSolutionModal(false)}
                roomTypes={roomTypes || []}
                checkInDate={watchedCheckInDate}
                checkOutDate={watchedCheckOutDate}
                requiredAdults={Number(watchedAdults) || 1}
                requiredChildren={Number(watchedChildren) || 0}
                requiredInfants={infantsCount}
                requiredChildAges={childAges}
                onApplyCustomSolution={handleApplyCustomSolution}
            />
        </div>
    );
}
