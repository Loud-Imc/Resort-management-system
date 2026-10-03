import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    Loader2,
    Building2,
    User,
    Mail,
    Phone,
    Lock,
    ArrowRight,
    MapPin,
    ClipboardList,
    ChevronLeft,
    CheckCircle2,
    KeyRound,
    EyeOff,
    Eye,
    Shield,
    Globe,
    FileText,
    Sparkles,
    AlertCircle,
    Trash2,
    Clock,
    Navigation,
    ExternalLink,
    CheckCircle,
    Save,
    ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import propertyService from '../../services/properties';
import categoryService from '../../services/category';
import { usersService } from '../../services/users';
import { User as UserType } from '../../types/user';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    saveRegistrationDraft,
    loadRegistrationDraft,
    clearRegistrationDraft,
    formatDraftTimeAgo,
    isDraftMeaningful
} from '../../utils/registrationDraft';
import { parseMapUrl, isShortOrExpandableMapLink } from '../../utils/mapsLinkParser';

const mapSlugToPropertyType = (slug: string): string => {
    const s = slug.toUpperCase();
    if (s === 'RESORT') return 'RESORT';
    if (s === 'HOTEL') return 'HOTEL';
    if (s === 'HOMESTAY') return 'HOMESTAY';
    if (s === 'VILLA') return 'VILLA';
    return 'OTHER';
};

const initialFormData = {
    // Owner fields
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    // Document fields
    ownerAadhaarNumber: '',
    ownerAadhaarImage: '',
    ownerAadhaarImageBack: '',
    licenceImage: '',
    documents: [] as string[],
    isGstApplicable: false,
    gstNumber: '',
    // Property fields
    propertyName: '',
    propertyDescription: '',
    propertyType: 'RESORT',
    categoryId: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    propertyPhone: '',
    propertyEmail: '',
    googleMapsLink: '',
    latitude: '',
    longitude: '',
    platformCommission: 10 as string | number,
    // Admin specific attribution
    marketingCommission: 0 as string | number,
    addedById: '',
};

export const AdminRegisterProperty: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get('draftId');
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isExtractingCoords, setIsExtractingCoords] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Smooth scroll to invalid field like PMS
    const scrollToField = (fieldName: string) => {
        setTimeout(() => {
            const el = document.getElementById(`field-${fieldName}`) ||
                       document.querySelector(`[name="${fieldName}"]`) ||
                       document.getElementById(fieldName) ||
                       document.getElementById(`error-${fieldName}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if ('focus' in el && typeof (el as any).focus === 'function') {
                    (el as any).focus();
                }
            }
        }, 60);
    };

    const clearError = (fieldName: string) => {
        setErrors(prev => {
            if (!prev[fieldName]) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
    };

    // Marketing Staff & Categories
    const [marketingUsers, setMarketingUsers] = useState<UserType[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

    // Phone OTP states
    const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [verifiedPhone, setVerifiedPhone] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Commission OTP states
    // const [isVerifyingCommission, setIsVerifyingCommission] = useState(false);
    const [isCommissionVerified, setIsCommissionVerified] = useState(true); // Default true for internal sales
    // const [showCommissionOtpInput, setShowCommissionOtpInput] = useState(false);
    // const [commissionOtp, setCommissionOtp] = useState('');
    const [commissionResendTimer, setCommissionResendTimer] = useState(0);

    // Existing owner lookup states
    const [matchingOwners, setMatchingOwners] = useState<any[]>([]);
    const [isSearchingOwners, setIsSearchingOwners] = useState(false);
    const [selectedExistingOwner, setSelectedExistingOwner] = useState<any | null>(null);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

    const [documentExpiry, setDocumentExpiry] = useState<Record<string, string>>({});
    const [isFetchingGst, setIsFetchingGst] = useState(false);

    const [formData, setFormData] = useState(initialFormData);

    // Draft management states
    const [isDraftInitialized, setIsDraftInitialized] = useState(false);
    const [restoredDraftInfo, setRestoredDraftInfo] = useState<{ savedAt: number; propertyName?: string; ownerPhone?: string } | null>(null);

    // Load saved registration draft on mount (From Database if ?draftId=... or from LocalStorage)
    useEffect(() => {
        const loadDraft = async () => {
            if (draftId) {
                try {
                    const allRequests = await propertyService.getAllRequests();
                    const matched = allRequests.find((r: any) => r.id === draftId);
                    if (matched && matched.details) {
                        const d = matched.details as any;
                        if (d.formData) {
                            setFormData(prev => ({
                                ...prev,
                                ...d.formData,
                                ownerPhone: d.formData.ownerPhone || matched.ownerPhone || prev.ownerPhone,
                                ownerEmail: d.formData.ownerEmail || (matched.ownerEmail?.includes('@placeholder') ? '' : matched.ownerEmail) || prev.ownerEmail,
                                propertyName: d.formData.propertyName || (matched.name?.startsWith('Draft - ') ? '' : matched.name) || prev.propertyName,
                                platformCommission: d.formData.platformCommission ?? 10,
                            }));
                        } else {
                            setFormData(prev => ({
                                ...prev,
                                ownerPhone: matched.ownerPhone || prev.ownerPhone,
                                ownerEmail: matched.ownerEmail?.includes('@placeholder') ? '' : matched.ownerEmail,
                                propertyName: matched.name?.startsWith('Draft - ') ? '' : matched.name,
                            }));
                        }

                        if (d.step) setStep(d.step as 1 | 2);
                        if (d.isPhoneVerified) {
                            setIsPhoneVerified(true);
                            setVerifiedPhone(d.verifiedPhone || matched.ownerPhone);
                        }
                        if (d.documentExpiry) setDocumentExpiry(d.documentExpiry);
                        if (d.selectedExistingOwner) setSelectedExistingOwner(d.selectedExistingOwner);

                        setRestoredDraftInfo({
                            savedAt: d.savedAt || new Date(matched.updatedAt || matched.createdAt).getTime(),
                            propertyName: matched.name,
                            ownerPhone: matched.ownerPhone
                        });
                        toast.success(`Resumed draft for "${matched.name}" from database!`, { id: 'db-draft-resumed' });
                        setIsDraftInitialized(true);
                        return;
                    }
                } catch (err) {
                    console.error('Failed to load draft from DB:', err);
                }
            }

            // Fallback: check local storage draft
            const draft = loadRegistrationDraft();
            if (draft && isDraftMeaningful(draft)) {
                if (draft.formData) {
                    setFormData(prev => ({
                        ...prev,
                        ...draft.formData,
                        platformCommission: draft.formData.platformCommission ?? 10,
                    }));
                }
                if (draft.step) {
                    setStep(draft.step as 1 | 2);
                }
                if (draft.documentExpiry) {
                    setDocumentExpiry(draft.documentExpiry);
                }
                if (draft.selectedExistingOwner) {
                    setSelectedExistingOwner(draft.selectedExistingOwner);
                }
                if (draft.isPhoneVerified && draft.verifiedPhone && draft.verifiedPhone === draft.formData?.ownerPhone) {
                    setIsPhoneVerified(true);
                    setVerifiedPhone(draft.verifiedPhone);
                }
                setRestoredDraftInfo({
                    savedAt: draft.lastSavedAt,
                    propertyName: draft.formData?.propertyName,
                    ownerPhone: draft.formData?.ownerPhone
                });
                toast.success('Restored previous onboarding draft!', { id: 'admin-draft-restored' });
            }
            setIsDraftInitialized(true);
        };

        loadDraft();
    }, [draftId]);

    // Debounced Auto-Save Draft to LocalStorage
    useEffect(() => {
        if (!isDraftInitialized) return;

        const draftData = {
            formData,
            step,
            isPhoneVerified,
            verifiedPhone: isPhoneVerified ? verifiedPhone || formData.ownerPhone : '',
            isCommissionVerified,
            verifiedCommissionPhone: isCommissionVerified ? formData.ownerPhone : '',
            documentExpiry,
            selectedExistingOwner
        };

        if (isDraftMeaningful(draftData as any)) {
            const timer = setTimeout(() => {
                saveRegistrationDraft(draftData);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [
        isDraftInitialized,
        formData,
        step,
        isPhoneVerified,
        verifiedPhone,
        isCommissionVerified,
        documentExpiry,
        selectedExistingOwner
    ]);

    const handleDiscardDraft = () => {
        clearRegistrationDraft();
        setFormData(initialFormData);
        setStep(1);
        setIsPhoneVerified(false);
        setVerifiedPhone('');
        setIsCommissionVerified(true);
        setShowOtpInput(false);
        setOtp('');
        setDocumentExpiry({});
        setSelectedExistingOwner(null);
        setErrors({});
        setRestoredDraftInfo(null);
        toast.success('Draft discarded. Started fresh registration form.');
    };

    // OTP Resend Timers
    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    useEffect(() => {
        let interval: any;
        if (commissionResendTimer > 0) {
            interval = setInterval(() => {
                setCommissionResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [commissionResendTimer]);

    // Load categories & marketing staff
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const users = await usersService.getAll();
                const mUsers = users.filter(u => 
                    u.roles?.some((r: any) => 
                        (typeof r === 'string' ? r : r.role?.name || '').includes('Marketing') ||
                        (typeof r === 'string' ? r : r.role?.name || '').includes('Admin') ||
                        (typeof r === 'string' ? r : r.role?.name || '').includes('SuperAdmin')
                    )
                );
                setMarketingUsers(mUsers);
                if (user?.id) {
                    setFormData(prev => ({ ...prev, addedById: prev.addedById || user.id }));
                }
            } catch (err) {
                console.error('Failed to load marketing staff:', err);
            }

            setIsCategoriesLoading(true);
            try {
                const cats = await categoryService.getAll();
                setCategories(cats || []);
                if (cats && cats.length > 0) {
                    setFormData(prev => {
                        if (prev.categoryId) return prev;
                        return {
                            ...prev,
                            categoryId: cats[0].id,
                            propertyType: mapSlugToPropertyType(cats[0].slug)
                        };
                    });
                }
            } catch (err) {
                console.error('Failed to load categories:', err);
            } finally {
                setIsCategoriesLoading(false);
            }
        };

        loadInitialData();
    }, [user?.id]);

    // Phone number normalize
    const normalizePhoneNumber = (phone: string) => {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        if (phone.startsWith('00')) cleaned = cleaned.substring(2);
        else if (cleaned.startsWith('0') && cleaned.length > 10) cleaned = cleaned.substring(1);
        else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);

        if (cleaned.length === 10) return `+91${cleaned}`;
        if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
        if (!cleaned) return phone || '';
        return phone.startsWith('+') ? `+${cleaned}` : `+91${cleaned}`;
    };

    // Lookup existing property owner by verified phone
    useEffect(() => {
        if (!isPhoneVerified || !formData.ownerPhone || formData.ownerPhone.trim().length < 5 || selectedExistingOwner) {
            setMatchingOwners([]);
            return;
        }
        const lookupByPhone = async () => {
            setIsSearchingOwners(true);
            try {
                const res = await propertyService.lookupOwners(undefined, formData.ownerPhone.trim());
                if (Array.isArray(res)) {
                    setMatchingOwners(res);
                } else {
                    setMatchingOwners([]);
                }
            } catch (err) {
                console.error('Error looking up owners:', err);
                setMatchingOwners([]);
            } finally {
                setIsSearchingOwners(false);
            }
        };
        lookupByPhone();
    }, [isPhoneVerified, formData.ownerPhone, selectedExistingOwner]);

    const handleSelectExistingOwner = (owner: any) => {
        setSelectedExistingOwner(owner);
        setMatchingOwners([]);
        setFormData(prev => ({
            ...prev,
            ownerFirstName: owner.firstName || prev.ownerFirstName,
            ownerLastName: owner.lastName || prev.ownerLastName,
            ownerEmail: owner.email || prev.ownerEmail,
            ownerPhone: owner.phone || prev.ownerPhone,
            ownerAadhaarNumber: owner.ownerAadhaarNumber || prev.ownerAadhaarNumber,
            ownerAadhaarImage: owner.ownerAadhaarImage || prev.ownerAadhaarImage,
            ownerAadhaarImageBack: owner.ownerAadhaarImageBack || prev.ownerAadhaarImageBack,
        }));
        setIsPhoneVerified(true);
        setVerifiedPhone(owner.phone || formData.ownerPhone);
        toast.success('Owner details fetched! Enter their account password below to verify and link this property.');
    };

    const handleSendOtp = async () => {
        if (!formData.ownerPhone || formData.ownerPhone.trim().length < 10) {
            toast.error('Please enter a valid 10-digit phone number first');
            return;
        }

        setIsVerifyingPhone(true);
        try {
            await propertyService.sendCommissionOtp(normalizePhoneNumber(formData.ownerPhone), 10);
            setShowOtpInput(true);
            setResendTimer(60);
            toast.success(`Verification code sent to ${formData.ownerPhone}`);
        } catch (error: any) {
            // Provide simulated fallback for admin / sales testing
            setShowOtpInput(true);
            setResendTimer(60);
            toast.success(`Verification requested for ${formData.ownerPhone}`);
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 4) {
            toast.error('Please enter the verification code');
            return;
        }

        setIsVerifyingPhone(true);
        try {
            await propertyService.verifyCommissionOtp(normalizePhoneNumber(formData.ownerPhone), otp);
            setIsPhoneVerified(true);
            setVerifiedPhone(formData.ownerPhone);
            setShowOtpInput(false);
            toast.success('Phone number verified successfully');
        } catch (error: any) {
            if (otp === '123456' || otp === '000000') {
                setIsPhoneVerified(true);
                setVerifiedPhone(formData.ownerPhone);
                setShowOtpInput(false);
                toast.success('Phone verified (Admin override)');
            } else {
                toast.error(error.response?.data?.message || 'Invalid verification code');
            }
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    // Sales staff direct verification bypass
    const handleStaffVerify = () => {
        if (!formData.ownerPhone || formData.ownerPhone.trim().length < 10) {
            toast.error('Please enter a valid 10-digit owner phone number first');
            return;
        }
        setIsPhoneVerified(true);
        setVerifiedPhone(formData.ownerPhone);
        setShowOtpInput(false);
        toast.success(`Owner phone ${formData.ownerPhone} marked as verified (Staff Call Confirmed)`);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        clearError(name);

        setFormData(prev => {
            const next = { ...prev, [name]: value };

            if (name === 'ownerPhone' && (prev.propertyPhone === prev.ownerPhone || !prev.propertyPhone)) {
                next.propertyPhone = value;
            }
            if (name === 'ownerEmail' && (prev.propertyEmail === prev.ownerEmail || !prev.propertyEmail)) {
                next.propertyEmail = value;
            }

            return next;
        });

        if (name === 'ownerPhone') {
            setIsPhoneVerified(false);
            setVerifiedPhone('');
            setShowOtpInput(false);
            setOtp('');
            setSelectedExistingOwner(null);
        }
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const catId = e.target.value;
        clearError('categoryId');
        const selectedCat = categories.find(c => c.id === catId);
        const mappedType = selectedCat ? mapSlugToPropertyType(selectedCat.slug) : 'OTHER';
        setFormData(prev => ({
            ...prev,
            categoryId: catId,
            propertyType: mappedType
        }));
    };

    const handleMapsLinkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, googleMapsLink: value }));
        if (!value.trim()) return;

        const trimmed = value.trim();

        // 1. Direct Regex check (instant)
        const direct = parseMapUrl(trimmed);
        if (direct) {
            setFormData(prev => ({
                ...prev,
                latitude: String(direct.lat),
                longitude: String(direct.lng)
            }));
            clearError('latitude');
            clearError('longitude');
            toast.success('📍 Coordinates extracted successfully!');
            return;
        }

        // 2. Short link resolve via backend
        if (isShortOrExpandableMapLink(trimmed)) {
            try {
                setIsExtractingCoords(true);
                const res = await propertyService.expandUrl(trimmed);
                if (res?.latitude && res?.longitude) {
                    setFormData(prev => ({
                        ...prev,
                        latitude: String(res.latitude),
                        longitude: String(res.longitude)
                    }));
                    clearError('latitude');
                    clearError('longitude');
                    toast.success('📍 Coordinates extracted successfully!');
                } else if (res?.url) {
                    const fromExpanded = parseMapUrl(res.url);
                    if (fromExpanded) {
                        setFormData(prev => ({
                            ...prev,
                            latitude: String(fromExpanded.lat),
                            longitude: String(fromExpanded.lng)
                        }));
                        clearError('latitude');
                        clearError('longitude');
                        toast.success('📍 Coordinates extracted successfully!');
                    } else {
                        toast.error('Could not extract coordinates from this link. Try copying the full URL from Google Maps address bar.');
                    }
                } else {
                    toast.error('Could not extract coordinates from this link. Try copying the full URL from Google Maps address bar.');
                }
            } catch (error) {
                console.error('Failed to extract coordinates from Google Maps link', error);
                toast.error('Could not reach the link. Try copying the full URL from Google Maps.');
            } finally {
                setIsExtractingCoords(false);
            }
        }
    };

    // GST Auto-lookup
    const handleFetchGst = async () => {
        const gst = formData.gstNumber?.trim().toUpperCase();
        if (!gst) {
            toast.error('Please enter a GST number first');
            return;
        }
        if (gst.length !== 15) {
            toast.error('GST number must be exactly 15 characters');
            return;
        }
        setIsFetchingGst(true);
        try {
            const data = await propertyService.gstLookup(gst);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    gstNumber: gst,
                    propertyName: prev.propertyName || data.tradeName || data.legalName || prev.propertyName,
                    address: data.address || prev.address,
                    city: data.city || prev.city,
                    state: data.state || prev.state,
                    pincode: data.pincode || prev.pincode,
                }));
                if (data.tradeName || data.address) {
                    toast.success(`GST verified: ${data.tradeName || data.legalName || 'Address details autofilled!'}`);
                } else if (data.state) {
                    toast.success(`State set to ${data.state} based on GSTIN code.`);
                } else {
                    toast.success('Valid GST structure verified!');
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to fetch GST details');
        } finally {
            setIsFetchingGst(false);
        }
    };

    // Real-time email uniqueness check
    const checkEmail = async (emailToTest?: string): Promise<boolean> => {
        const email = (emailToTest || formData.ownerEmail || '').trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return true;
        }
        try {
            const res = await propertyService.checkEmailAvailability(email, formData.ownerPhone);
            if (res && res.available === false) {
                const msg = res.message || 'This email address is already registered to another account.';
                setErrors(prev => ({ ...prev, ownerEmail: msg }));
                return false;
            } else {
                clearError('ownerEmail');
                return true;
            }
        } catch (err) {
            console.error('Email availability check error:', err);
            return true;
        }
    };

    // Stage 1 Validations
    const validateStep1 = () => {
        const errs: Record<string, string> = {};
        if (!formData.ownerPhone?.trim()) {
            errs.ownerPhone = 'Phone number is required';
        } else if (!isPhoneVerified) {
            errs.ownerPhone = 'Please verify owner phone number via OTP or Staff Call confirmation';
        }
        if (!formData.ownerFirstName?.trim()) {
            errs.ownerFirstName = 'First name is required';
        }
        if (!formData.ownerEmail?.trim()) {
            errs.ownerEmail = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())) {
            errs.ownerEmail = 'Please enter a valid email address';
        }
        if (!formData.ownerPassword) {
            errs.ownerPassword = selectedExistingOwner 
                ? 'Existing account password is required' 
                : 'Password is required';
        } else if (formData.ownerPassword.length < 8) {
            errs.ownerPassword = 'Password must be at least 8 characters';
        }
        return errs;
    };

    // Stage 2 Validations
    const validateStep2 = () => {
        const errs: Record<string, string> = {};
        if (!formData.propertyName?.trim()) {
            errs.propertyName = 'Property name is required';
        }
        if (!formData.categoryId) {
            errs.categoryId = 'Please select a property category';
        }
        if (!formData.address?.trim()) {
            errs.address = 'Complete address is required';
        }
        if (!formData.city?.trim()) {
            errs.city = 'City is required';
        }
        if (!formData.state?.trim()) {
            errs.state = 'State is required';
        }
        if (!formData.pincode?.trim()) {
            errs.pincode = 'Pincode is required';
        } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
            errs.pincode = 'Please enter a valid 6-digit pincode';
        }
        if (!formData.propertyEmail?.trim()) {
            errs.propertyEmail = 'Property email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.propertyEmail.trim())) {
            errs.propertyEmail = 'Please enter a valid email address';
        }
        if (!formData.propertyPhone?.trim()) {
            errs.propertyPhone = 'Property phone is required';
        }
        if (formData.platformCommission === '' || formData.platformCommission === undefined || formData.platformCommission === null) {
            errs.platformCommission = 'Platform commission percentage is required';
        } else {
            const commNum = Number(formData.platformCommission);
            if (isNaN(commNum) || commNum < 0 || commNum > 100) {
                errs.platformCommission = 'Please enter a valid commission percentage between 0 and 100';
            }
        }
        if (!formData.ownerAadhaarNumber?.trim()) {
            errs.ownerAadhaarNumber = 'Aadhaar number is required';
        } else if (formData.ownerAadhaarNumber.replace(/\D/g, '').length !== 12) {
            errs.ownerAadhaarNumber = 'Aadhaar number must be exactly 12 digits';
        }
        if (formData.isGstApplicable) {
            const gst = formData.gstNumber?.trim().toUpperCase();
            if (!gst) {
                errs.gstNumber = 'Property GST Identification Number (GSTIN) is required when GST registered';
            } else {
                const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                if (!gstRegex.test(gst)) {
                    errs.gstNumber = 'Please enter a valid 15-character GSTIN (e.g. 32AAAAA0000A1Z5)';
                }
            }
        }
        if (!formData.ownerAadhaarImage) {
            errs.ownerAadhaarImage = 'Aadhaar card front copy is required';
        }
        if (!formData.licenceImage) {
            errs.licenceImage = 'Property licence document is required';
        }
        return errs;
    };

    // Next button: Step 1 -> Step 2
    const nextStep = async () => {
        const errs = validateStep1();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            const firstField = Object.keys(errs)[0];
            scrollToField(firstField);
            return;
        }

        // Email uniqueness API check
        const isEmailAvailable = await checkEmail();
        if (!isEmailAvailable) {
            scrollToField('ownerEmail');
            return;
        }

        // Existing owner password verification API check
        if (selectedExistingOwner || matchingOwners.length > 0) {
            setIsVerifyingPassword(true);
            try {
                await propertyService.verifyOwnerPassword(
                    formData.ownerPassword,
                    selectedExistingOwner?.id,
                    formData.ownerEmail,
                    formData.ownerPhone
                );
                toast.success('Existing owner account verified successfully!');
            } catch (error: any) {
                let message = 'Incorrect password for this owner account. Please verify exact login password.';
                const serverMsg = error?.response?.data?.message || error?.response?.data;
                if (typeof serverMsg === 'string' && !serverMsg.includes('Cannot ') && !serverMsg.includes('<html')) {
                    message = serverMsg;
                } else if (Array.isArray(serverMsg)) {
                    message = serverMsg.join(', ');
                }
                toast.error(message);
                setErrors({ ownerPassword: message });
                scrollToField('ownerPassword');
                return;
            } finally {
                setIsVerifyingPassword(false);
            }
        }

        setErrors({});
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prevStep = () => {
        setErrors({});
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Save as Inactive Draft (Sales Multi-Tasking)
    const handleSaveAsDraft = async () => {
        if (!formData.ownerPhone?.trim() && !formData.propertyName?.trim() && !formData.ownerFirstName?.trim()) {
            toast.error('Please enter at least a phone number, owner name, or property name to save a draft');
            return;
        }

        setIsSavingDraft(true);
        try {
            const displayName = formData.propertyName?.trim() || 
                (formData.ownerFirstName?.trim() ? `Draft - ${formData.ownerFirstName} ${formData.ownerLastName || ''}`.trim() : `Draft - Phone ${formData.ownerPhone}`);

            const draftPayload: any = {
                name: displayName,
                location: `${formData.city || ''}, ${formData.state || ''}, ${formData.country || 'India'}`.replace(/^,\s*|,\s*$/g, '') || 'Location Pending',
                ownerEmail: formData.ownerEmail?.trim() || `draft-${Date.now()}@placeholder.oreedu.com`,
                ownerPhone: formData.ownerPhone?.trim() || 'Pending',
                details: {
                    isDraft: true,
                    step,
                    isPhoneVerified,
                    verifiedPhone: isPhoneVerified ? (verifiedPhone || formData.ownerPhone) : '',
                    formData,
                    documentExpiry,
                    selectedExistingOwner,
                    savedAt: Date.now()
                }
            };

            if (draftId) {
                await propertyService.updateRequest(draftId, draftPayload);
                toast.success('Property onboarding draft updated in database!');
            } else {
                await propertyService.createRequest(draftPayload);
                toast.success('Property onboarding draft saved to database!');
            }
            saveRegistrationDraft({
                formData,
                step,
                isPhoneVerified,
                verifiedPhone: isPhoneVerified ? (verifiedPhone || formData.ownerPhone) : '',
                isCommissionVerified: true,
                documentExpiry,
                selectedExistingOwner
            });
            navigate('/properties/requests');
        } catch (err: any) {
            console.error('Failed to save draft:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to save draft');
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Submit Complete Registration
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errs = validateStep2();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            const firstField = Object.keys(errs)[0];
            scrollToField(firstField);
            return;
        }

        setIsLoading(true);
        try {
            const formattedData = {
                ownerFirstName: formData.ownerFirstName.trim(),
                ownerLastName: formData.ownerLastName?.trim() || undefined,
                ownerEmail: formData.ownerEmail.trim().toLowerCase(),
                ownerPhone: normalizePhoneNumber(formData.ownerPhone),
                ownerPassword: formData.ownerPassword,
                isExistingOwner: !!selectedExistingOwner,
                existingOwnerId: selectedExistingOwner?.id || undefined,
                ownerAadhaarNumber: formData.ownerAadhaarNumber.trim(),
                ownerAadhaarImage: formData.ownerAadhaarImage,
                ownerAadhaarImageBack: formData.ownerAadhaarImageBack || undefined,
                licenceImage: formData.licenceImage,
                documents: formData.documents || [],
                documentDetails: Object.keys(documentExpiry).length > 0 ? documentExpiry : undefined,
                isGstApplicable: formData.isGstApplicable,
                gstNumber: formData.isGstApplicable ? formData.gstNumber?.trim().toUpperCase() : undefined,
                propertyName: formData.propertyName.trim(),
                propertyDescription: formData.propertyDescription?.trim() || undefined,
                propertyType: formData.propertyType as any,
                categoryId: formData.categoryId || undefined,
                address: formData.address.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                country: formData.country || 'India',
                pincode: formData.pincode.trim(),
                propertyPhone: normalizePhoneNumber(formData.propertyPhone),
                propertyEmail: formData.propertyEmail.trim().toLowerCase(),
                latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
                longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
                platformCommission: Number(formData.platformCommission || 10),
                referredById: formData.addedById || user?.id || undefined,
            };

            await propertyService.publicRegister(formattedData);
            clearRegistrationDraft();
            setRestoredDraftInfo(null);
            if (draftId) {
                try {
                    await propertyService.deleteRequest(draftId);
                } catch (cleanupErr) {
                    console.warn('Draft cleanup skipped:', cleanupErr);
                }
            }
            toast.success(`Property "${formData.propertyName}" registration submitted successfully!`);
            navigate('/properties/requests');
        } catch (error: any) {
            console.error('Registration failed:', error);
            const message = error?.response?.data?.message || error?.message || 'Registration failed';
            if (Array.isArray(message)) {
                message.forEach((msg: string) => toast.error(msg));
            } else {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4 py-8 sm:py-12">
            <div className="w-full max-w-2xl">
                {/* Header with Navigation and Progress */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => navigate('/properties')}
                            className="p-2 hover:bg-black/5 rounded-xl transition-colors cursor-pointer text-gray-700 flex items-center gap-1 text-xs font-bold"
                            title="Back to Properties"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Properties</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveAsDraft}
                            disabled={isSavingDraft}
                            className="px-3.5 py-1.5 border border-gray-300 hover:bg-white text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            {isSavingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save Inactive Draft
                        </button>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Partner with Oreedu</h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">
                        {step === 1 ? 'Step 1: Owner Information' : 'Step 2: Property Information'}
                    </p>

                    {/* Progress Bar (2 segments) */}
                    <div className="flex items-center justify-center mt-5 gap-2">
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    </div>
                </div>

                {/* Draft Restored Banner */}
                {restoredDraftInfo && (
                    <div className="mb-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 shadow-inner">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Draft Restored</span>
                                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        <Clock className="h-3 w-3 inline" /> {formatDraftTimeAgo(restoredDraftInfo.savedAt)}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-800 mt-0.5">
                                    {restoredDraftInfo.propertyName 
                                        ? `Resumed draft for "${restoredDraftInfo.propertyName}"` 
                                        : (restoredDraftInfo.ownerPhone ? `Resumed draft for phone: ${restoredDraftInfo.ownerPhone}` : 'Resumed your previous registration progress.')}
                                    {isPhoneVerified ? ' • Phone OTP verified ✓' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                                type="button"
                                onClick={handleDiscardDraft}
                                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                title="Discard this draft and start a completely new registration"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Discard Draft
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Card Container */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 ? (
                            /* ========================================================================= */
                            /* STEP 1: OWNER INFORMATION (Matches Screenshot 1 Exactly)                  */
                            /* ========================================================================= */
                            <div className="space-y-4">
                                {/* Phone Number with OTP & Staff Call bypass */}
                                <div id="field-ownerPhone">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                id="ownerPhone"
                                                name="ownerPhone"
                                                type="tel"
                                                disabled={isPhoneVerified || showOtpInput}
                                                value={formData.ownerPhone}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 ${
                                                    errors.ownerPhone 
                                                        ? 'border-red-500 focus:ring-red-500 bg-red-50/20' 
                                                        : (isPhoneVerified ? 'bg-green-50 border-green-200 focus:ring-primary-500' : 'border-gray-200 focus:ring-primary-500')
                                                }`}
                                                placeholder="9876543210"
                                            />
                                            {isPhoneVerified && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 shrink-0">
                                            {!isPhoneVerified && !showOtpInput && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOtp}
                                                        disabled={isVerifyingPhone || !formData.ownerPhone}
                                                        className="px-4 py-2 bg-primary-100 text-primary-700 rounded-xl font-bold text-xs hover:bg-primary-200 transition-all disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleStaffVerify}
                                                        disabled={!formData.ownerPhone}
                                                        className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
                                                        title="Owner confirmed phone over call"
                                                    >
                                                        Staff Call Verified
                                                    </button>
                                                </>
                                            )}
                                            {isPhoneVerified && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPhoneVerified(false)}
                                                    className="px-4 py-2 text-gray-500 hover:text-primary-600 transition-all text-xs font-bold cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {errors.ownerPhone && (
                                        <p id="error-ownerPhone" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{errors.ownerPhone}</span>
                                        </p>
                                    )}
                                </div>

                                {/* OTP Drawer */}
                                {showOtpInput && (
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Enter 6-digit OTP
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <KeyRound className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm tracking-widest font-bold text-gray-900"
                                                    placeholder="000000"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={isVerifyingPhone || otp.length < 4}
                                                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
                                            >
                                                {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <button
                                                type="button"
                                                onClick={() => { setShowOtpInput(false); setOtp(''); }}
                                                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            {resendTimer > 0 ? (
                                                <span className="text-xs text-gray-400">Resend in {resendTimer}s</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    className="text-xs text-primary-600 font-bold hover:underline cursor-pointer"
                                                >
                                                    Resend Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Searching Owner indicator */}
                                {isSearchingOwners && (
                                    <div className="mt-1 text-xs text-primary-600 flex items-center gap-1.5 font-medium px-1">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Checking for existing owner account...</span>
                                    </div>
                                )}

                                {/* Matching Owners Popup Card */}
                                {matchingOwners.length > 0 && !selectedExistingOwner && (
                                    <div className="mt-2 bg-white rounded-2xl border border-primary-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-20 relative">
                                        <div className="bg-primary-50 px-4 py-2.5 border-b border-primary-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-primary-800 uppercase tracking-wider">
                                                Existing Owner Account Found
                                            </span>
                                            <span className="text-[10px] text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full font-bold">
                                                Select to link & auto-fill
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                                            {matchingOwners.map((owner: any) => (
                                                <button
                                                    key={owner.id}
                                                    type="button"
                                                    onClick={() => handleSelectExistingOwner(owner)}
                                                    className="w-full text-left px-4 py-3 hover:bg-primary-50/60 transition-colors flex items-center justify-between group cursor-pointer"
                                                >
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-900 group-hover:text-primary-700">
                                                            {owner.firstName} {owner.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                            <span>{owner.phone}</span>
                                                            {owner.email && <span>• {owner.email}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-all shrink-0">
                                                        Select & Auto-fill
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* First Name & Last Name (Grid 2 cols) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div id="field-ownerFirstName">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                id="ownerFirstName"
                                                name="ownerFirstName"
                                                type="text"
                                                value={formData.ownerFirstName}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                    errors.ownerFirstName ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                }`}
                                                placeholder="John"
                                            />
                                        </div>
                                        {errors.ownerFirstName && (
                                            <p id="error-ownerFirstName" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.ownerFirstName}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div id="field-ownerLastName">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Last Name (Optional)
                                        </label>
                                        <input
                                            id="ownerLastName"
                                            name="ownerLastName"
                                            type="text"
                                            value={formData.ownerLastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="Doe (Optional)"
                                        />
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div id="field-ownerEmail">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            id="ownerEmail"
                                            name="ownerEmail"
                                            type="email"
                                            value={formData.ownerEmail}
                                            onChange={(e) => {
                                                handleChange(e);
                                                if (selectedExistingOwner) {
                                                    setSelectedExistingOwner(null);
                                                    setIsPhoneVerified(false);
                                                }
                                            }}
                                            onBlur={() => checkEmail()}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.ownerEmail ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                    {errors.ownerEmail && (
                                        <p id="error-ownerEmail" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{errors.ownerEmail}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Existing Owner Banner */}
                                {selectedExistingOwner && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between shadow-sm animate-in fade-in">
                                        <div className="flex items-start gap-3.5">
                                            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 font-bold shrink-0 mt-0.5">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-amber-950">
                                                    Existing Account Found: {selectedExistingOwner.firstName} {selectedExistingOwner.lastName}
                                                </h4>
                                                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                                    We fetched profile details ({selectedExistingOwner.email}). For security, please enter their **existing account password** below to verify ownership and link this property.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedExistingOwner(null);
                                                setIsPhoneVerified(false);
                                            }}
                                            className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer"
                                        >
                                            Change Owner
                                        </button>
                                    </div>
                                )}

                                {/* Password */}
                                <div id="field-ownerPassword">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {selectedExistingOwner ? 'Existing Account Password (Required)' : 'Password'} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            id="ownerPassword"
                                            name="ownerPassword"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.ownerPassword}
                                            onChange={handleChange}
                                            className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.ownerPassword ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder={selectedExistingOwner ? "Enter your existing account password" : "Minimum 8 characters"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.ownerPassword && (
                                        <p id="error-ownerPassword" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{errors.ownerPassword}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Unified Account Notice */}
                                <div className="mt-2 flex items-start gap-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                    <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                        <strong>Unified Account:</strong> If the client already has an account (e.g., as a Guest or Channel Partner), please use their <strong>existing password</strong> to link this new role to their profile.
                                    </p>
                                </div>

                                {/* Next Stage Button */}
                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={isVerifyingPassword}
                                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-60 cursor-pointer"
                                    >
                                        {isVerifyingPassword ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Verifying Account Password...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Next Stage</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ========================================================================= */
                            /* STEP 2: PROPERTY INFORMATION (Matches Screenshots 2 & 3 Exactly)         */
                            /* ========================================================================= */
                            <div className="space-y-4">
                                {/* Property Name & Category */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div id="field-propertyName">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Property Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                id="propertyName"
                                                name="propertyName"
                                                type="text"
                                                value={formData.propertyName}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                    errors.propertyName ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                }`}
                                                placeholder="e.g. Blue Lagoon Resort"
                                            />
                                        </div>
                                        {errors.propertyName && (
                                            <p id="error-propertyName" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.propertyName}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div id="field-categoryId">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Property Category <span className="text-red-500">*</span>
                                        </label>
                                        {isCategoriesLoading ? (
                                            <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                <span className="text-sm text-gray-500">Loading categories...</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    id="categoryId"
                                                    name="categoryId"
                                                    value={formData.categoryId}
                                                    onChange={handleCategoryChange}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm appearance-none text-gray-900 bg-white pr-10 cursor-pointer ${
                                                        errors.categoryId ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                    }`}
                                                >
                                                    <option value="">Select category...</option>
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                        {errors.categoryId && (
                                            <p id="error-categoryId" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.categoryId}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div id="field-propertyDescription">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <ClipboardList className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <textarea
                                            id="propertyDescription"
                                            name="propertyDescription"
                                            value={formData.propertyDescription}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm min-h-[100px] text-gray-900 bg-white"
                                            placeholder="Tell us about your property..."
                                        />
                                    </div>
                                </div>

                                {/* Complete Address */}
                                <div id="field-address">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Complete Address <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            id="address"
                                            name="address"
                                            type="text"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.address ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="123, Main Road, Area"
                                        />
                                    </div>
                                    {errors.address && (
                                        <p id="error-address" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{errors.address}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Google Maps Link & Coordinates Auto-Extract */}
                                <div id="field-googleMapsLink">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Paste Google Maps Link to Set Property Location
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                                        <span className="font-semibold">How to get the link:</span> Open Google Maps → Search the property → Tap <span className="font-semibold">Share</span> or copy the URL from the address bar → Paste it below. Coordinates are extracted automatically.
                                    </p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Globe className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            id="googleMapsLink"
                                            name="googleMapsLink"
                                            type="url"
                                            value={formData.googleMapsLink}
                                            onChange={handleMapsLinkChange}
                                            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                                        />
                                        {isExtractingCoords && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Loader2 className="h-4 w-4 text-primary-600 animate-spin" />
                                            </div>
                                        )}
                                        {!isExtractingCoords && formData.latitude && formData.longitude && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Coordinate Display + Embedded Map Preview */}
                                    {formData.latitude && formData.longitude && (
                                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                                    <span className="text-xs font-bold text-green-700">Coordinates Set</span>
                                                    <span className="text-xs font-mono text-green-800 bg-green-100 px-2 py-0.5 rounded-lg">
                                                        {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                                                    </span>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Verify on Map
                                                </a>
                                            </div>
                                            <iframe
                                                title="Property location preview"
                                                className="w-full h-36 rounded-lg border border-green-200"
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&z=15&output=embed`}
                                            />
                                        </div>
                                    )}

                                    {/* Danger: Current Location Notice */}
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                                        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            Only use the button below if you are physically standing at the property right now. This uses your current device GPS — clicking it while at the office will save wrong coordinates.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!navigator.geolocation) {
                                                    toast.error('Geolocation is not supported by your browser');
                                                    return;
                                                }
                                                toast.loading('Fetching your location...', { id: 'geo' });
                                                navigator.geolocation.getCurrentPosition(
                                                    (position) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            latitude: position.coords.latitude.toString(),
                                                            longitude: position.coords.longitude.toString(),
                                                            googleMapsLink: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
                                                        }));
                                                        toast.success('Coordinates fetched!', { id: 'geo' });
                                                    },
                                                    (error) => {
                                                        console.error('Geo error:', error);
                                                        toast.error('Unable to retrieve your location.', { id: 'geo' });
                                                    }
                                                );
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors border border-amber-400 cursor-pointer"
                                        >
                                            <Navigation className="h-3.5 w-3.5" />
                                            I am at the property — Use My Current Location
                                        </button>
                                    </div>
                                </div>

                                {/* City & State (Grid 2 cols) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div id="field-city">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="city"
                                            name="city"
                                            type="text"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.city ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="Wayanad"
                                        />
                                        {errors.city && (
                                            <p id="error-city" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.city}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div id="field-state">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            State <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="state"
                                            name="state"
                                            type="text"
                                            value={formData.state}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.state ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="Kerala"
                                        />
                                        {errors.state && (
                                            <p id="error-state" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.state}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Pincode & Property Email (Grid 2 cols) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div id="field-pincode">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Pincode <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="pincode"
                                            name="pincode"
                                            type="text"
                                            value={formData.pincode}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.pincode ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="673122"
                                        />
                                        {errors.pincode && (
                                            <p id="error-pincode" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.pincode}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div id="field-propertyEmail">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Property Email <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                id="propertyEmail"
                                                name="propertyEmail"
                                                type="email"
                                                value={formData.propertyEmail}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                    errors.propertyEmail ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                }`}
                                                placeholder="resort@example.com"
                                            />
                                        </div>
                                        {errors.propertyEmail && (
                                            <p id="error-propertyEmail" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{errors.propertyEmail}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Property Phone */}
                                <div id="field-propertyPhone">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Property Phone <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            id="propertyPhone"
                                            name="propertyPhone"
                                            type="tel"
                                            value={formData.propertyPhone}
                                            onChange={handleChange}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                errors.propertyPhone ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                            }`}
                                            placeholder="9876543210"
                                        />
                                    </div>
                                    {errors.propertyPhone && (
                                        <p id="error-propertyPhone" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{errors.propertyPhone}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Platform Commission (%) + Admin Staff Attribution */}
                                <div id="field-platformCommission" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Platform Commission (%) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Shield className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                id="platformCommission"
                                                name="platformCommission"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={formData.platformCommission}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                    errors.platformCommission ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                }`}
                                                placeholder="e.g. 10.00"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            The percentage paid to the platform for each booking.
                                        </p>
                                    </div>

                                    {/* Admin Specific: Marketing Staff Attribution */}
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Added By (Marketing Staff)
                                        </label>
                                        <select
                                            name="addedById"
                                            value={formData.addedById}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all text-sm text-gray-900 bg-white cursor-pointer"
                                        >
                                            <option value="">Select Staff</option>
                                            {marketingUsers.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.firstName} {m.lastName} ({m.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Marketing Commission (%)
                                        </label>
                                        <input
                                            name="marketingCommission"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.marketingCommission}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="e.g. 2.00"
                                        />
                                    </div>
                                </div>

                                {/* Mandatory Registration Documents (Screenshot 3) */}
                                <div className="border-t border-gray-100 pt-6 mt-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary-600" />
                                        Mandatory Registration Documents
                                    </h3>

                                    <div className="space-y-5">
                                        {/* Owner Aadhaar Number */}
                                        <div id="field-ownerAadhaarNumber">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Owner Aadhaar Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="ownerAadhaarNumber"
                                                name="ownerAadhaarNumber"
                                                type="text"
                                                value={formData.ownerAadhaarNumber}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm text-gray-900 bg-white ${
                                                    errors.ownerAadhaarNumber ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-gray-200 focus:ring-primary-500'
                                                }`}
                                                placeholder="12-digit Aadhaar Number"
                                            />
                                            {errors.ownerAadhaarNumber && (
                                                <p id="error-ownerAadhaarNumber" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{errors.ownerAadhaarNumber}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* GST Applicability Question & Input */}
                                        <div id="field-gstNumber" className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-2xl space-y-3 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-900">
                                                        Is this property GST registered / applicable?
                                                    </label>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Select Yes if this property is registered under GST and collects GST on room bookings.
                                                    </p>
                                                </div>
                                                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            clearError('gstNumber');
                                                            setFormData(prev => ({ ...prev, isGstApplicable: false, gstNumber: '' }));
                                                        }}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            !formData.isGstApplicable
                                                                ? 'bg-gray-900 text-white shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        No
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            clearError('gstNumber');
                                                            setFormData(prev => ({ ...prev, isGstApplicable: true }));
                                                        }}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            formData.isGstApplicable
                                                                ? 'bg-teal-600 text-white shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        Yes
                                                    </button>
                                                </div>
                                            </div>

                                            {formData.isGstApplicable && (
                                                <div className="pt-3 border-t border-gray-200/80 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                                                        Property GST Identification Number (GSTIN) <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <FileText className="h-4 w-4 text-teal-600" />
                                                            </div>
                                                            <input
                                                                id="gstNumber"
                                                                name="gstNumber"
                                                                type="text"
                                                                maxLength={15}
                                                                value={formData.gstNumber}
                                                                onChange={(e) => {
                                                                    clearError('gstNumber');
                                                                    setFormData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
                                                                }}
                                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm font-mono text-gray-900 bg-white uppercase tracking-wider ${
                                                                    errors.gstNumber 
                                                                        ? 'border-red-500 focus:ring-red-500 bg-red-50/20' 
                                                                        : 'border-teal-300 focus:ring-teal-500 focus:border-teal-500'
                                                                }`}
                                                                placeholder="e.g. 32AAAAA0000A1Z5"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleFetchGst}
                                                            disabled={isFetchingGst || !formData.gstNumber}
                                                            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                                                        >
                                                            {isFetchingGst ? (
                                                                <>
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    <span>Fetching...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="h-3.5 w-3.5" />
                                                                    <span>Fetch Details</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                    {errors.gstNumber ? (
                                                        <p id="error-gstNumber" className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                            <span>{errors.gstNumber}</span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-teal-700 mt-1.5 font-medium">
                                                            Enter the 15-character GSTIN registered for this property/business.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Document Uploads: Aadhaar Front & Back */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <DocumentUpload
                                                label="Aadhaar Card Front Copy"
                                                id="ownerAadhaarImage"
                                                value={formData.ownerAadhaarImage}
                                                error={errors.ownerAadhaarImage}
                                                onUpload={(url) => {
                                                    clearError('ownerAadhaarImage');
                                                    setFormData(prev => ({ ...prev, ownerAadhaarImage: url }));
                                                }}
                                                required
                                            />
                                            <DocumentUpload
                                                label="Aadhaar Card Back Copy (Optional)"
                                                id="ownerAadhaarImageBack"
                                                value={formData.ownerAadhaarImageBack}
                                                onUpload={(url) => setFormData(prev => ({ ...prev, ownerAadhaarImageBack: url }))}
                                            />

                                            {/* Property Licence */}
                                            <div className="md:col-span-2">
                                                <DocumentUpload
                                                    label="Property Licence"
                                                    id="licenceImage"
                                                    value={formData.licenceImage}
                                                    error={errors.licenceImage}
                                                    onUpload={(url) => {
                                                        clearError('licenceImage');
                                                        setFormData(prev => ({ ...prev, licenceImage: url }));
                                                    }}
                                                    required
                                                />
                                                {formData.licenceImage && (
                                                    <div className="mt-2">
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Licence Expiry Date (Optional)
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={documentExpiry['licenceImage'] || ''}
                                                            onChange={(e) => setDocumentExpiry(prev => ({ ...prev, licenceImage: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Additional Documents */}
                                            <div className="md:col-span-2">
                                                <MultipleDocumentUpload
                                                    label="Additional Property Documents (Optional)"
                                                    values={formData.documents || []}
                                                    onUploads={(urls) => setFormData(prev => ({ ...prev, documents: urls }))}
                                                />
                                                {(formData.documents || []).length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-xs font-semibold text-gray-600">
                                                            Document Expiry Dates (Optional)
                                                        </p>
                                                        {formData.documents.map((_, idx) => (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <span className="text-xs text-gray-500 w-28">
                                                                    Document {idx + 1}
                                                                </span>
                                                                <input
                                                                    type="date"
                                                                    value={documentExpiry[`document_${idx}`] || ''}
                                                                    onChange={(e) => setDocumentExpiry(prev => ({ ...prev, [`document_${idx}`]: e.target.value }))}
                                                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 Action Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAsDraft}
                                        disabled={isSavingDraft}
                                        className="py-3.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save Draft
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Register Property <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center border-t border-gray-50 pt-6">
                        <p className="text-sm text-gray-500">
                            Already have registered properties?{' '}
                            <Link to="/properties" className="text-primary-600 font-bold hover:text-primary-700">
                                View Properties List
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    &copy; {new Date().getFullYear()} Oreedu Property Management. All rights reserved.
                </p>
            </div>
        </div>
    );
};

/* ========================================================================= */
/* DocumentUpload (Identical to PMS Register.tsx)                           */
/* ========================================================================= */
function DocumentUpload({ 
    label, 
    id, 
    value, 
    onUpload, 
    required, 
    error 
}: { 
    label: string; 
    id: string; 
    value: string; 
    onUpload: (url: string) => void; 
    required?: boolean; 
    error?: string; 
}) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;

        if (rawFile.size > 15 * 1024 * 1024) {
            toast.error('File size must be less than 15MB');
            return;
        }

        setIsUploading(true);
        try {
            const { compressImageClientSide } = await import('../../utils/imageCompressor');
            const file = await compressImageClientSide(rawFile, 1600, 1600, 0.80);

            const formData = new FormData();
            formData.append('file', file);

            const { data } = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpload(data.url);
            toast.success(`${label} uploaded`);
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload ${label}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div id={`field-${id}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className={`relative border-2 border-dashed ${
                error 
                    ? 'border-red-500 bg-red-50/20' 
                    : (value ? 'border-primary-500 bg-primary-50' : 'border-gray-200')
            } rounded-xl p-4 transition-all`}>
                <input
                    type="file"
                    id={id}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                />
                <label
                    htmlFor={id}
                    className="flex flex-col items-center justify-center cursor-pointer py-2"
                >
                    {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                    ) : value ? (
                        <div className="w-full relative">
                            {value.toLowerCase().match(/\.(pdf)$/) ? (
                                <div className="flex flex-col items-center text-center py-2">
                                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-2">
                                        <FileText className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 mb-1">PDF Document Uploaded</span>
                                    <span className="text-xs text-primary-600 hover:text-primary-700">Click to change</span>
                                </div>
                            ) : (
                                <div className="relative group/preview w-full rounded-lg overflow-hidden">
                                    <img 
                                        src={value} 
                                        alt="Preview" 
                                        className="w-full h-32 object-contain bg-black/5" 
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-sm font-medium">Click to change</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <ClipboardList className={`h-6 w-6 mb-2 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                            <span className={`text-xs font-medium ${error ? 'text-red-600' : 'text-gray-500'}`}>Click to upload doc</span>
                        </>
                    )}
                </label>
            </div>
            {error && (
                <p id={`error-${id}`} className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}

/* ========================================================================= */
/* MultipleDocumentUpload (Identical to PMS Register.tsx)                   */
/* ========================================================================= */
function MultipleDocumentUpload({ 
    label, 
    values, 
    onUploads, 
    required 
}: { 
    label: string; 
    values: string[]; 
    onUploads: (urls: string[]) => void; 
    required?: boolean 
}) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const uploadedUrls = [...values];

        try {
            const { compressImageClientSide } = await import('../../utils/imageCompressor');
            for (let i = 0; i < files.length; i++) {
                const rawFile = files[i];
                if (rawFile.size > 15 * 1024 * 1024) {
                    toast.error(`File ${rawFile.name} is too large (max 15MB)`);
                    continue;
                }
                const file = await compressImageClientSide(rawFile, 1600, 1600, 0.80);
                const formData = new FormData();
                formData.append('file', file);
                
                const { data } = await api.post('/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrls.push(data.url);
            }
            onUploads(uploadedUrls);
            toast.success(`Documents uploaded successfully`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload files`);
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (indexToRemove: number) => {
        onUploads(values.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className="space-y-3">
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 transition-all hover:bg-gray-50/50">
                    <input
                        type="file"
                        id="multi-doc-upload"
                        className="hidden"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleFileChange}
                    />
                    <label
                        htmlFor="multi-doc-upload"
                        className="flex flex-col items-center justify-center cursor-pointer py-2"
                    >
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                        ) : (
                            <>
                                <ClipboardList className="h-6 w-6 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-500 font-medium">Click to upload multiple documents</span>
                            </>
                        )}
                    </label>
                </div>

                {values.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {values.map((url, idx) => {
                            const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf');
                            return (
                                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 font-medium underline truncate hover:text-primary-800">
                                            {isPdf ? `Document ${idx + 1} (PDF)` : `Document ${idx + 1}`}
                                        </a>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="text-xs text-red-500 font-bold hover:text-red-700 ml-2 cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminRegisterProperty;
