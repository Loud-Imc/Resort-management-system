import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { propertiesService } from '../../services/properties';
import { uploadService } from '../../services/uploads';
import type { Property } from '../../types/property';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Building2, MapPin, Phone, Mail, Globe, Save, Loader2,
    Camera, X, CheckCircle, XCircle, Star, Image as ImageIcon,
    Plus, Clock, Percent, ShieldAlert, Trash2, FileText,
    Users, Navigation, AlertCircle, Lock, Copy, Check, ShieldCheck, Send
} from 'lucide-react';
import { cancellationPoliciesService, type CancellationPolicy, type CancellationRule } from '../../services/cancellationPolicies';
import clsx from 'clsx';

const GlobalStyles = () => (
    <style>{`
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
        }
        .error-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
    `}</style>
);

const PREDEFINED_AMENITIES = [
    'Free WiFi', 'Swimming Pool', 'Infinity Pool', 'Free Parking', 'Valet Parking',
    'Restaurant', 'Bar', 'Lounge', 'Coffee Shop', 'Gym', 'State-of-the-art Fitness Center',
    'Spa & Wellness', 'Steam & Sauna', 'Ayurvedic Massage', 'Room Service',
    'Air Conditioning', 'Central Heating', '24-hour Front Desk', 'Concierge Service',
    'Laundry Service', 'Dry Cleaning', 'Business Center', 'Meeting Rooms',
    'Conference Hall', 'Airport Shuttle', 'Kids Club', 'Play Area',
    'Private Beach', 'Garden', 'Terrace', 'Bonfire Area', 'Campsite',
    'Indoor Games', 'Outdoor Sports', 'Tennis Court', 'Badminton Court',
    'Yoga Deck', 'Meditation Center', 'CCTV Security', '24/7 Security Guard',
    'Fire Safety', 'Power Backup', 'Complimentary Breakfast', 'Mini Bar',
    'Doctor on Call', 'Wheelchair Accessible', 'Pet Friendly',
    'EV Charging Station', 'Tour Desk', 'Library', 'Daily Housekeeping',
    'Newspaper', 'Smoke Detectors'
];

export default function MyProperty() {
    const { user } = useAuth();
    const { selectedProperty, refreshProperties } = useProperty();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    const { search } = useLocation();
    const [highlightSection, setHighlightSection] = useState<string | null>(null);

    const isPlatformAdmin = user?.roles?.some(r => ['SuperAdmin', 'Admin', 'Marketing'].includes(r));

    // Editable fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [pincode, setPincode] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [platformCommission, setPlatformCommission] = useState<number>(10);
    const [allowsGroupBooking, setAllowsGroupBooking] = useState(false);
    const [maxGroupCapacity, setMaxGroupCapacity] = useState<number | ''>('');
    const [groupPricePerHead, setGroupPricePerHead] = useState<number | ''>('');
    const [groupPriceAdult, setGroupPriceAdult] = useState<number | ''>('');
    const [groupPriceChild, setGroupPriceChild] = useState<number | ''>('');
    const [defaultCheckInTime, setDefaultCheckInTime] = useState<string>('14:00');
    const [defaultCheckOutTime, setDefaultCheckOutTime] = useState<string>('11:00');
    const [isGroupGstInclusive, setIsGroupGstInclusive] = useState(false);
    const [isGstApplicable, setIsGstApplicable] = useState(false);
    const [gstNumber, setGstNumber] = useState('');
    const [gstError, setGstError] = useState<string | null>(null);
    const [showGstContactModal, setShowGstContactModal] = useState(false);
    const [copiedGst, setCopiedGst] = useState(false);
    const [amenities, setAmenities] = useState<string[]>([]);
    const [newAmenity, setNewAmenity] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [invoiceInstructions, setInvoiceInstructions] = useState<string[]>([]);

    // Geo-Location
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [latitude, setLatitude] = useState<number | ''>('');
    const [longitude, setLongitude] = useState<number | ''>('');

    // Cancellation Policies
    const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
    const [showPolicyForm, setShowPolicyForm] = useState(false);
    const [newPolicyName, setNewPolicyName] = useState('');
    const [newPolicyDesc, setNewPolicyDesc] = useState('');
    const [newPolicyRules, setNewPolicyRules] = useState<CancellationRule[]>([
        { hoursBeforeCheckIn: 48, refundPercentage: 100 },
        { hoursBeforeCheckIn: 24, refundPercentage: 50 },
        { hoursBeforeCheckIn: 0, refundPercentage: 0 }
    ]);

    useEffect(() => {
        if (selectedProperty?.id) {
            loadProperty();
            if (!selectedProperty.isRequest) {
                loadPolicies();
            }
        }
    }, [selectedProperty?.id, selectedProperty?.isRequest]);

    useEffect(() => {
        const params = new URLSearchParams(search);
        const tab = params.get('tab');
        if (tab) {
            setEditMode(true);
            setHighlightSection(tab);
            setTimeout(() => {
                const element = document.getElementById(`section-${tab}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }, [search]);

    const loadPolicies = async () => {
        if (!selectedProperty?.id || selectedProperty.isRequest) return;
        try {
            const data = await cancellationPoliciesService.getAll(selectedProperty.id);
            setPolicies(data);
        } catch (err: any) {
            console.error('Failed to load policies', err);
        }
    };

    const loadProperty = async () => {
        try {
            setLoading(true);
            if (selectedProperty?.isRequest) {
                // It's a pending request — no backend fetch needed, details are in context
                const reqDetails = (selectedProperty as any).details || {};
                const reqProperty: Partial<Property> = {
                    ...selectedProperty,
                    name: selectedProperty.name || '',
                    description: reqDetails.description || '',
                    address: reqDetails.address || selectedProperty.location || '',
                    city: reqDetails.city || '',
                    state: reqDetails.state || '',
                    country: reqDetails.country || '',
                    pincode: reqDetails.pincode || '',
                    phone: reqDetails.propertyPhone || (selectedProperty as any).ownerPhone || '',
                    email: reqDetails.propertyEmail || (selectedProperty as any).ownerEmail || '',
                    whatsappNumber: reqDetails.whatsappNumber || '',
                    amenities: reqDetails.amenities || [],
                    images: reqDetails.images || [],
                    coverImage: reqDetails.coverImage || '',
                    allowsGroupBooking: reqDetails.allowsGroupBooking || false,
                    maxGroupCapacity: reqDetails.maxGroupCapacity || '',
                    groupPricePerHead: reqDetails.groupPricePerHead || '',
                    groupPriceAdult: reqDetails.groupPriceAdult || '',
                    groupPriceChild: reqDetails.groupPriceChild || '',
                    defaultCheckInTime: reqDetails.defaultCheckInTime || '14:00',
                    defaultCheckOutTime: reqDetails.defaultCheckOutTime || '11:00',
                    isGroupGstInclusive: reqDetails.isGroupGstInclusive || false,
                    isGstApplicable: reqDetails.isGstApplicable ?? (Boolean(reqDetails.gstNumber && reqDetails.gstNumber.trim())),
                    gstNumber: reqDetails.gstNumber || '',
                    platformCommission: (selectedProperty as any).platformCommission || 10.00,
                    policies: reqDetails.policies || {}
                };
                setProperty(reqProperty as Property);
                populateFields(reqProperty as Property);
            } else {
                // It's an approved Property
                const data = await propertiesService.getById(selectedProperty!.id);
                setProperty(data);
                populateFields(data);
            }
        } catch (err: any) {
            toast.error('Failed to load property');
        } finally {
            setLoading(false);
        }
    };

    const populateFields = (p: Property) => {
        if (!p) return;
        setName(p.name ?? '');
        setDescription(p.description ?? '');
        setAddress(p.address ?? '');
        setCity(p.city ?? '');
        setState(p.state ?? '');
        setCountry(p.country ?? '');
        setPincode(p.pincode ?? '');
        setPhone(p.phone ?? '');
        setEmail(p.email ?? '');
        setWhatsappNumber(p.whatsappNumber ?? '');
        setPlatformCommission(p.platformCommission !== undefined && p.platformCommission !== null ? Number(p.platformCommission) : 10);
        setIsGstApplicable((p as any).isGstApplicable ?? (Boolean(p.gstNumber && p.gstNumber.trim())));
        setGstNumber(p.gstNumber ?? '');
        setAmenities(p.amenities ?? []);
        setImages(p.images ?? []);
        setCoverImage(p.coverImage ?? '');
        setAllowsGroupBooking(p.allowsGroupBooking ?? false);
        setMaxGroupCapacity(p.maxGroupCapacity ?? '');
        setGroupPricePerHead(p.groupPricePerHead ?? '');
        setGroupPriceAdult(p.groupPriceAdult ?? '');
        setGroupPriceChild(p.groupPriceChild ?? '');
        setDefaultCheckInTime((p as any).defaultCheckInTime ?? '14:00');
        setDefaultCheckOutTime((p as any).defaultCheckOutTime ?? '11:00');
        setIsGroupGstInclusive(p.isGroupGstInclusive ?? false);
        
        // Parse invoice instructions
        if (p.policies && (p.policies as any).invoiceInstructions) {
            setInvoiceInstructions((p.policies as any).invoiceInstructions as string[]);
        } else {
            setInvoiceInstructions([]);
        }

        setLatitude(p.latitude ?? '');
        setLongitude(p.longitude ?? '');
        if (p.latitude && p.longitude) {
            setGoogleMapsLink(`https://www.google.com/maps?q=${p.latitude},${p.longitude}`);
        } else {
            setGoogleMapsLink('');
        }
    };

    const handleMapsLinkChange = async (value: string) => {
        setGoogleMapsLink(value);
        if (!value) return;

        let urlToMatch = value;
        // If it's a shortened google maps link, resolve it via backend
        if (value.includes('goo.gl') || value.includes('maps.app.goo.gl')) {
            try {
                const res = await propertiesService.expandUrl(value);
                if (res?.url) {
                    urlToMatch = res.url;
                }
            } catch (error) {
                console.error('Failed to expand Maps URL', error);
            }
        }
        
        // Extract coordinates
        const coordMatch = urlToMatch.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch) {
            setLatitude(parseFloat(coordMatch[1]));
            setLongitude(parseFloat(coordMatch[2]));
            toast.success('Coordinates extracted!');
            return;
        }

        const llMatch = urlToMatch.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (llMatch) {
            setLatitude(parseFloat(llMatch[1]));
            setLongitude(parseFloat(llMatch[2]));
            toast.success('Coordinates extracted!');
            return;
        }

        const qMatch = urlToMatch.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (qMatch) {
            setLatitude(parseFloat(qMatch[1]));
            setLongitude(parseFloat(qMatch[2]));
            toast.success('Coordinates extracted!');
        }
    };

    const handleFetchLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        toast.loading('Fetching your location...', { id: 'geo' });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
                toast.success('Coordinates fetched successfully!', { id: 'geo' });
            },
            (error) => {
                console.error('Geo error:', error);
                toast.error('Unable to retrieve your location. Check browser permissions.', { id: 'geo' });
            }
        );
    };

    const handleSave = async () => {
        if (!selectedProperty?.id) return;

        // Validation for Group Booking Prices
        if (allowsGroupBooking) {
            if (groupPriceAdult === '' || groupPriceAdult === null || groupPriceAdult === undefined) {
                toast.error('Group Price (Adult) is required when group bookings are allowed');
                return;
            }
            if (groupPriceChild === '' || groupPriceChild === null || groupPriceChild === undefined) {
                toast.error('Group Price (Child) is required when group bookings are allowed');
                return;
            }
        }

        // Validation for GST (if platform admin edits it)
        if (isPlatformAdmin && isGstApplicable) {
            const trimmedGst = gstNumber?.trim().toUpperCase();
            if (!trimmedGst) {
                setGstError('GST Identification Number (GSTIN) is required when GST is enabled.');
                const el = document.getElementById('myproperty-gst-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus();
                return;
            }
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(trimmedGst)) {
                setGstError('Please enter a valid 15-character GSTIN (e.g. 32AAAAA0000A1Z5)');
                const el = document.getElementById('myproperty-gst-input');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus();
                return;
            }
        }
        setGstError(null);

        try {
            setSaving(true);
            const payload: any = {
                name, description, address, city, state, country, pincode,
                phone, email, whatsappNumber,
                amenities, images, coverImage,
                allowsGroupBooking,
                groupPricePerHead: groupPricePerHead === '' ? null : Number(groupPricePerHead),
                groupPriceAdult: groupPriceAdult === '' ? null : Number(groupPriceAdult),
                groupPriceChild: groupPriceChild === '' ? null : Number(groupPriceChild),
                defaultCheckInTime,
                defaultCheckOutTime,
                isGroupGstInclusive,
                latitude: latitude === '' ? null : Number(latitude),
                longitude: longitude === '' ? null : Number(longitude),
                policies: {
                    ...(property?.policies as object || {}),
                    invoiceInstructions: invoiceInstructions.filter(s => s.trim())
                }
            };

            // Only include commission and GST if platform admin
            if (isPlatformAdmin) {
                payload.platformCommission = platformCommission;
                payload.isGstApplicable = isGstApplicable;
                payload.gstNumber = gstNumber ? gstNumber.trim().toUpperCase() : null;
            }

            if (selectedProperty.isRequest) {
                // Update the request details
                await propertiesService.updateRequest(selectedProperty.id, payload);
                toast.success('Registration details updated successfully!');
                setEditMode(false);
            } else {
                // Standard Property update
                const updated = await propertiesService.update(selectedProperty.id, payload);
                setProperty(updated);
                populateFields(updated);
                toast.success('Property updated successfully!');
                setEditMode(false);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update property');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!property || (selectedProperty as any)?.isRequest) return;
        const action = property.isActive ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${action} this property?`)) return;
        try {
            const updated = await propertiesService.toggleActive(property.id, !property.isActive);
            setProperty(updated);
            toast.success(`Property ${updated.isActive ? 'enabled' : 'disabled'} successfully`);
            await refreshProperties();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to toggle property status');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        try {
            setUploading(true);
            const filesArray = Array.from(files);
            const res = await uploadService.uploadMultiple(filesArray);
            const urls = res.map((r: any) => r.url || r.path);
            setImages(prev => [...prev, ...urls]);
            toast.success(`Successfully uploaded ${urls.length} images`);
        } catch {
            toast.error('Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (idx: number) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    };

    const addAmenity = () => {
        const trimmed = newAmenity.trim();
        if (trimmed && !amenities.includes(trimmed)) {
            setAmenities(prev => [...prev, trimmed]);
            setNewAmenity('');
        }
    };

    const removeAmenity = (idx: number) => {
        setAmenities(prev => prev.filter((_, i) => i !== idx));
    };

    const handleAddPolicy = async () => {
        if (!selectedProperty?.id || !newPolicyName) return;
        try {
            await cancellationPoliciesService.create({
                name: newPolicyName,
                description: newPolicyDesc,
                propertyId: selectedProperty.id,
                rules: newPolicyRules,
                isDefault: policies.length === 0 // First one is default
            });
            toast.success('Policy created!');
            setShowPolicyForm(false);
            setNewPolicyName('');
            setNewPolicyDesc('');
            loadPolicies();
        } catch (err: any) {
            toast.error('Failed to create policy');
        }
    };

    const handleSetDefaultPolicy = async (policyId: string) => {
        try {
            await cancellationPoliciesService.update(policyId, { isDefault: true });
            toast.success('Default policy updated');
            loadPolicies();
            loadProperty(); // Update property's default cancellation policy ID
        } catch (err: any) {
            toast.error('Failed to update default policy');
        }
    };

    const handleDeletePolicy = async (policyId: string) => {
        if (!window.confirm('Delete this policy?')) return;
        try {
            await cancellationPoliciesService.delete(policyId);
            toast.success('Policy deleted');
            loadPolicies();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete policy');
        }
    };

    const updateRule = (index: number, field: keyof CancellationRule, value: number) => {
        const updated = [...newPolicyRules];
        updated[index] = { ...updated[index], [field]: value };
        setNewPolicyRules(updated);
    };

    const addRule = () => {
        setNewPolicyRules([...newPolicyRules, { hoursBeforeCheckIn: 0, refundPercentage: 0 }]);
    };

    const removeRule = (index: number) => {
        setNewPolicyRules(newPolicyRules.filter((_, i) => i !== index));
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!property) {
        return (
            <div className="text-center py-20">
                <Building2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No property selected. Use the sidebar to select a property.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <GlobalStyles />
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" /> My Property
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your property details, images and settings</p>
                </div>
                <div className="flex items-center gap-2">
                    {!editMode ? (
                        <>
                            <button onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                                Edit Details
                            </button>
                            <button onClick={handleToggleActive}
                                className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                                    property.isActive ? "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40"
                                        : "bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40")}>
                                {property.isActive ? 'Disable' : 'Enable'} Property
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { setEditMode(false); populateFields(property); }}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
                <span className={clsx("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                    property.isActive ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400")}>
                    {property.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {property.isActive ? 'Active' : 'Disabled'}
                </span>
                <span className={clsx("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold",
                    property.isVerified ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400")}>
                    {property.isVerified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {property.isVerified ? 'Verified' : 'Unverified'}
                </span>
                {property.isFeatured && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        <Star className="h-3 w-3" /> Featured
                    </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">
                    {property.type}
                </span>
            </div>

            {/* Cover Image */}
            <div className="relative rounded-2xl overflow-hidden h-48 bg-gray-100 dark:bg-gray-700">
                {(coverImage || property.coverImage) ? (
                    <img src={coverImage || property.coverImage} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <Camera className="h-12 w-12" />
                    </div>
                )}
                {editMode && (
                    <div className="absolute bottom-3 right-3">
                        <label className="px-3 py-1.5 bg-black/60 text-white text-xs rounded-lg cursor-pointer hover:bg-black/80">
                            Change Cover
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try { setUploading(true); const res = await uploadService.upload(file); setCoverImage(res.url || res.path); }
                                catch { toast.error('Upload failed'); } finally { setUploading(false); }
                            }} />
                        </label>
                    </div>
                )}
            </div>

            {/* Property Details */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Property Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Property Name" icon={<Building2 className="h-4 w-4" />} value={name}
                        onChange={setName} editMode={editMode} />
                    <Field label="Email" icon={<Mail className="h-4 w-4" />} value={email}
                        onChange={setEmail} editMode={editMode} type="email" />
                    <Field label="Phone" icon={<Phone className="h-4 w-4" />} value={phone}
                        onChange={setPhone} editMode={editMode} type="tel" />
                    <Field label="WhatsApp" icon={<Phone className="h-4 w-4" />} value={whatsappNumber}
                        onChange={setWhatsappNumber} editMode={editMode} type="tel" />
                    <Field label="Check-In Time" icon={<Clock className="h-4 w-4" />} value={defaultCheckInTime}
                        onChange={setDefaultCheckInTime} editMode={editMode} type="time" />
                    <Field label="Check-Out Time" icon={<Clock className="h-4 w-4" />} value={defaultCheckOutTime}
                        onChange={setDefaultCheckOutTime} editMode={editMode} type="time" />
                </div>

                <div className={clsx(
                    "p-4 rounded-xl border flex items-center justify-between transition-all",
                    isPlatformAdmin ? "bg-amber-50/50 border-amber-200" : "bg-gray-50 border-gray-100"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg", isPlatformAdmin ? "bg-amber-100" : "bg-gray-200")}>
                            <Percent className={clsx("h-5 w-5", isPlatformAdmin ? "text-amber-600" : "text-gray-500")} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Platform Commission (%)</p>
                            {editMode && isPlatformAdmin ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number"
                                        value={platformCommission}
                                        onChange={(e) => setPlatformCommission(Number(e.target.value))}
                                        className="w-20 px-2 py-1 border border-amber-300 rounded bg-white text-lg font-black text-amber-700 focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="text-sm font-bold text-amber-600">%</span>
                                </div>
                            ) : (
                                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{platformCommission}%</p>
                            )}
                        </div>
                    </div>
                    {!isPlatformAdmin && (
                        <div className="flex items-center gap-1.5 text-gray-400 bg-white/50 px-2 py-1 rounded-md border border-gray-100">
                            <ShieldAlert className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase">Admin Only</span>
                        </div>
                    )}
                </div>

                {/* GST Applicability & GSTIN Settings */}
                {isGstApplicable ? (
                    <div className="p-4 sm:p-5 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 to-emerald-50/40 dark:bg-gray-800/80 dark:border-teal-900/50 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 shrink-0">
                                    <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">GST Registration & Invoicing</h3>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                                            <Check className="h-3 w-3" /> GST APPLIED
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        GST applicable: Dynamic GST tiers apply on rooms & Tax Invoices issued
                                    </p>
                                </div>
                            </div>

                            {editMode && isPlatformAdmin ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">
                                        Admin Control
                                    </span>
                                    <div className="flex items-center bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 rounded-xl p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsGstApplicable(false)}
                                            className={clsx(
                                                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                !isGstApplicable ? "bg-gray-900 text-white shadow-xs" : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                                            )}
                                        >
                                            Non-GST
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsGstApplicable(true)}
                                            className={clsx(
                                                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                                isGstApplicable ? "bg-teal-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                                            )}
                                        >
                                            Active
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 self-start sm:self-auto">
                                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-[11px] font-semibold">Non-editable</span>
                                </div>
                            )}
                        </div>

                        {/* GSTIN Details Box */}
                        <div className="pt-3 border-t border-teal-100 dark:border-teal-900/40">
                            <label className="block text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider mb-1.5">
                                Property GST Identification Number (GSTIN)
                            </label>
                            {editMode && isPlatformAdmin ? (
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText className="h-4 w-4 text-teal-600" />
                                        </div>
                                        <input
                                            id="myproperty-gst-input"
                                            type="text"
                                            maxLength={15}
                                            value={gstNumber}
                                            onChange={(e) => {
                                                setGstError(null);
                                                setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                                            }}
                                            placeholder="e.g. 32AAAAA0000A1Z5"
                                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 text-sm font-mono uppercase tracking-wider ${
                                                gstError
                                                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20 text-gray-900 dark:text-white'
                                                    : 'border-teal-300 dark:border-teal-700 focus:ring-teal-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800'
                                            }`}
                                        />
                                    </div>
                                    {gstError && (
                                        <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{gstError}</span>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 border border-teal-200/90 dark:border-teal-800/60 rounded-xl shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="font-mono text-sm sm:text-base font-extrabold text-teal-950 dark:text-teal-100 tracking-wider">
                                            {gstNumber || '32AAAAA0000A1Z5 (Applied)'}
                                        </div>
                                        {gstNumber && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(gstNumber);
                                                    setCopiedGst(true);
                                                    toast.success('GSTIN copied to clipboard');
                                                    setTimeout(() => setCopiedGst(false), 2000);
                                                }}
                                                className="text-xs text-teal-600 hover:text-teal-800 dark:text-teal-400 flex items-center gap-1 font-semibold transition-colors px-2 py-0.5 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer"
                                                title="Copy GSTIN"
                                            >
                                                {copiedGst ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                <span>{copiedGst ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowGstContactModal(true)}
                                        className="text-xs text-gray-500 hover:text-primary dark:text-gray-400 font-medium underline underline-offset-2 transition-colors cursor-pointer self-start sm:self-auto"
                                    >
                                        Need to update GSTIN? Contact Admin
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 space-y-3 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300 shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">GST Registration & Invoicing</h3>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 uppercase">
                                            GST Not Applied
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Non-GST Property • Zero GST applied & Bill of Supply issued
                                    </p>
                                </div>
                            </div>

                            {editMode && isPlatformAdmin && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded">
                                        Admin Control
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsGstApplicable(true)}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                        Enable GST
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-3.5 bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">GST is currently not applied for this property.</p>
                                <p className="text-gray-500 dark:text-gray-400">To add your GSTIN and enable Tax Invoices on guest bookings, please contact the platform administrator.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGstContactModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-xs"
                            >
                                <Mail className="h-3.5 w-3.5" />
                                <span>Contact Admin to Update GST</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                    <input
                        id="allowsGroupBooking"
                        type="checkbox"
                        checked={allowsGroupBooking}
                        onChange={(e) => setAllowsGroupBooking(e.target.checked)}
                        disabled={!editMode}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="allowsGroupBooking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Group Bookings (Multiple people in one booking)
                    </label>
                </div>

                {allowsGroupBooking && (
                    <div className="pl-6 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-primary uppercase tracking-wider">Total Group Capacity</label>
                            <div className="flex items-center gap-3">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-lg font-black text-gray-900 dark:text-white">
                                    {maxGroupCapacity || 0} guests
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic leading-relaxed">
                                Auto-calculated from the <span className="font-bold text-primary">Max Group Occupancy</span> set on each room type in the group pool.
                                To change this number, go to <span className="font-bold">Room Types → Edit</span> a room type, enable
                                <span className="font-bold"> "Enable Group Bookings"</span> and set its Max Group Occupancy.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider">Group Price (Adult)</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        value={groupPriceAdult}
                                        onChange={(e) => setGroupPriceAdult(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        disabled={!editMode}
                                        placeholder="e.g. 600"
                                        className={`w-full px-3 py-2 border ${allowsGroupBooking && groupPriceAdult === '' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'} text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold`}
                                    />
                                </div>
                                {allowsGroupBooking && groupPriceAdult === '' && (
                                    <p className="text-[10px] text-red-500 font-bold animate-pulse">Required for Group Bookings</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider">Group Price (Child)</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        value={groupPriceChild}
                                        onChange={(e) => setGroupPriceChild(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        disabled={!editMode}
                                        placeholder="e.g. 400"
                                        className={`w-full px-3 py-2 border ${allowsGroupBooking && groupPriceChild === '' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'} text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold`}
                                    />
                                </div>
                                {allowsGroupBooking && groupPriceChild === '' && (
                                    <p className="text-[10px] text-red-500 font-bold animate-pulse">Required for Group Bookings</p>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium italic">* These prices override individual room rates during group bookings.</p>
                        
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <input
                                type="checkbox"
                                id="isGroupGstInclusive"
                                checked={isGroupGstInclusive}
                                onChange={(e) => setIsGroupGstInclusive(e.target.checked)}
                                disabled={!editMode}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                            />
                            <label htmlFor="isGroupGstInclusive" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                These prices are inclusive of GST
                            </label>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    {editMode ? (
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description || 'No description'}</p>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Guest Instructions</label>
                            <p className="text-xs text-gray-500">These instructions will be displayed on guest invoices (one per line). Use <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-amber-600">{'{{PROPERTY_PHONE}}'}</code> to insert your phone number.</p>
                        </div>
                        {editMode && (
                            <button onClick={() => setInvoiceInstructions([...invoiceInstructions, ''])} className="p-1.5 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-full transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {editMode ? (
                        <div className="space-y-2">
                            {invoiceInstructions.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No specific instructions added.</p>
                            ) : (
                                invoiceInstructions.map((instruction, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={instruction} 
                                            onChange={(e) => {
                                                const newInst = [...invoiceInstructions];
                                                newInst[index] = e.target.value;
                                                setInvoiceInstructions(newInst);
                                            }} 
                                            placeholder="e.g. Please present a valid photo ID upon check-in."
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" 
                                        />
                                        <button onClick={() => setInvoiceInstructions(invoiceInstructions.filter((_, i) => i !== index))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {invoiceInstructions.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1">
                                    {invoiceInstructions.map((inst, i) => (
                                        <li key={i}>{inst}</li>
                                    ))}
                                </ul>
                            ) : (
                                'No specific instructions added.'
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Address
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <Field label="Address" value={address} onChange={setAddress} editMode={editMode} />
                    </div>
                    <Field label="City" value={city} onChange={setCity} editMode={editMode} />
                    <Field label="State" value={state} onChange={setState} editMode={editMode} />
                    <Field label="Country" value={country} onChange={setCountry} editMode={editMode} />
                    <Field label="Pincode" value={pincode} onChange={setPincode} editMode={editMode} />
                </div>
                
                <div id="section-location" className={clsx(
                    "pt-4 space-y-4 transition-all duration-1000",
                    (highlightSection === 'location' && (!latitude || !longitude))
                        ? "ring-2 ring-amber-500 ring-offset-4 ring-offset-background bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4" 
                        : "border-t border-gray-100 dark:border-gray-700"
                )}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Geo-Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5">Google Maps Link (for extraction)</label>
                            {editMode ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Globe className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="url"
                                            value={googleMapsLink}
                                            onChange={(e) => handleMapsLinkChange(e.target.value)}
                                            placeholder="Paste Google Maps URL to extract coordinates..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-gray-400 font-medium italic">
                                            * Link is not stored. It's used to automatically fill Latitude and Longitude below.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleFetchLocation}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 text-primary dark:text-primary-foreground text-xs font-bold rounded-lg transition-colors border border-primary/20 dark:border-primary-800"
                                        >
                                            <Navigation className="h-3.5 w-3.5" />
                                            Fetch Current Location
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                                    {googleMapsLink ? (
                                        <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                                            {googleMapsLink}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Enter edit mode to update location via Maps link</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                disabled={!editMode}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                                placeholder="0.000000"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                disabled={!editMode}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                                placeholder="0.000000"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Amenities */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Amenities
                </h2>

                {/* Predefined List (Only in Edit Mode) */}
                {editMode && (
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tighter mb-2">Select from Predefined</label>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            {PREDEFINED_AMENITIES.map((a) => {
                                const isSelected = amenities.includes(a);
                                return (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setAmenities(amenities.filter(item => item !== a));
                                            } else {
                                                setAmenities([...amenities, a]);
                                            }
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 dark:shadow-none"
                                                : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary/50"
                                        )}
                                    >
                                        {a}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-tighter mb-2">
                        {editMode ? 'Selected & Custom Amenities' : 'Current Amenities'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {amenities.map((a, i) => (
                            <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground rounded-lg text-sm font-medium border border-primary/20 dark:border-primary-800">
                                {a}
                                {editMode && <button onClick={() => removeAmenity(i)} className="ml-1 text-primary/70 hover:text-red-500"><X className="h-3 w-3" /></button>}
                            </span>
                        ))}
                        {amenities.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No amenities listed</p>}
                    </div>
                </div>

                {editMode && (
                    <div className="flex gap-2 pt-2">
                        <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} placeholder="Add custom amenity"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                        <button onClick={addAmenity} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 dark:shadow-none">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Gallery */}
            <div id="section-photos" className={clsx(
                "rounded-2xl shadow-sm border p-6 space-y-4 transition-all duration-1000",
                (highlightSection === 'photos' && (!coverImage || images.length === 0))
                    ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Gallery
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
                            <img src={img} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                            {editMode && (
                                <button onClick={() => removeImage(i)}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    {editMode && (
                        <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
                                <>
                                    <Camera className="h-6 w-6 text-gray-400" />
                                    <span className="text-xs text-gray-400 mt-1">Add Image</span>
                                </>
                            )}
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>
                {images.length === 0 && !editMode && <p className="text-sm text-gray-400 dark:text-gray-500">No images uploaded</p>}
            </div>

            {/* Cancellation Policies Section */}
            <div id="section-policies" className={clsx(
                "rounded-2xl shadow-sm border p-6 space-y-6 transition-all duration-1000",
                (highlightSection === 'policies' && policies.length === 0)
                    ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            )}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" /> Cancellation Policies
                    </h2>
                    {!showPolicyForm && (
                        <button
                            onClick={() => setShowPolicyForm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/20 dark:hover:bg-primary/30"
                        >
                            <Plus className="h-4 w-4" /> Add Policy
                        </button>
                    )}
                </div>

                {showPolicyForm && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Policy Name</label>
                                <input
                                    value={newPolicyName}
                                    onChange={e => setNewPolicyName(e.target.value)}
                                    placeholder="e.g. Standard, Strict, Non-refundable"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Description (Optional)</label>
                                <input
                                    value={newPolicyDesc}
                                    onChange={e => setNewPolicyDesc(e.target.value)}
                                    placeholder="Brief explanation"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500">Refund Rules</label>
                            {newPolicyRules.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={rule.hoursBeforeCheckIn}
                                            onChange={e => updateRule(idx, 'hoursBeforeCheckIn', parseInt(e.target.value))}
                                            className="w-16 bg-transparent text-sm focus:outline-none"
                                        />
                                        <span className="text-xs text-gray-400">hrs before</span>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <Percent className="h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={rule.refundPercentage}
                                            onChange={e => updateRule(idx, 'refundPercentage', parseInt(e.target.value))}
                                            className="w-16 bg-transparent text-sm focus:outline-none"
                                        />
                                        <span className="text-xs text-gray-400">refund</span>
                                    </div>
                                    <button onClick={() => removeRule(idx)} className="p-2 text-gray-400 hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addRule}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add Rule
                            </button>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowPolicyForm(false)}
                                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPolicy}
                                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                Create Policy
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {policies.map(p => (
                        <div key={p.id} className={clsx(
                            "p-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-all",
                            p.isDefault ? "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary-800" : "bg-white dark:bg-gray-800"
                        )}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <h3 className="font-medium text-gray-900 dark:text-white">{p.name}</h3>
                                        {p.isDefault && (
                                            <span className="px-2 py-0.5 bg-primary/20 dark:bg-primary/30 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!p.isDefault && (
                                        <button
                                            onClick={() => handleSetDefaultPolicy(p.id)}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Set as Default
                                        </button>
                                    )}
                                    {!p.isDefault && (
                                        <button
                                            onClick={() => handleDeletePolicy(p.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {((p.rules as any[]) || []).sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn).map((rule, idx) => (
                                    <div key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                        {rule.hoursBeforeCheckIn}h: <span className="text-primary">{rule.refundPercentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {policies.length === 0 && !showPolicyForm && (
                        <p className="text-sm text-gray-400 text-center py-4">No cancellation policies defined yet.</p>
                    )}
                </div>
            </div>

            {/* Uploaded Documents & KYC */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Uploaded Documents & KYC
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GST & Aadhaar Numbers */}
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">KYC Identifications</h3>
                        <div className="space-y-3">
                            <div>
                                <span className="block text-xs font-semibold text-gray-500">GST Number</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {property?.gstNumber || 'Not Provided'}
                                </span>
                            </div>
                            <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3">
                                <span className="block text-xs font-semibold text-gray-500">Owner Aadhaar Number</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {property?.ownerAadhaarNumber || 'Not Provided'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* License Document */}
                    <div className="space-y-2">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Business License</span>
                        {property?.licenceImage ? (
                            <a
                                href={property.licenceImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 hover:border-primary transition-all duration-300"
                            >
                                <img
                                    src={property.licenceImage}
                                    alt="Business License"
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                                        View Full Document
                                    </span>
                                </div>
                            </a>
                        ) : (
                            <div className="flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 text-gray-400">
                                <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                                <span className="text-xs font-medium">No license document uploaded</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Aadhaar Images */}
                <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Owner Aadhaar Card Images</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Aadhaar Front */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-500">Front Side</span>
                            {property?.ownerAadhaarImage ? (
                                <a
                                    href={property.ownerAadhaarImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 hover:border-primary transition-all duration-300"
                                >
                                    <img
                                        src={property.ownerAadhaarImage}
                                        alt="Aadhaar Front"
                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                                            View Full Document
                                        </span>
                                    </div>
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 text-gray-400">
                                    <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                                    <span className="text-xs font-medium">No front side image uploaded</span>
                                </div>
                            )}
                        </div>

                        {/* Aadhaar Back */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-500">Back Side</span>
                            {property?.ownerAadhaarImageBack ? (
                                <a
                                    href={property.ownerAadhaarImageBack}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 hover:border-primary transition-all duration-300"
                                >
                                    <img
                                        src={property.ownerAadhaarImageBack}
                                        alt="Aadhaar Back"
                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                                            View Full Document
                                        </span>
                                    </div>
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 text-gray-400">
                                    <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                                    <span className="text-xs font-medium">No back side image uploaded</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Compliance Documents */}
                {property?.documents && property.documents.length > 0 && (
                    <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Uploaded Documents ({property.documents.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {property.documents.map((doc, idx) => {
                                const isPdf = doc.toLowerCase().split('?')[0].endsWith('.pdf');
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-xl">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="h-4 w-4 text-primary shrink-0" />
                                            <a href={doc} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold underline truncate hover:text-primary-800 dark:hover:text-primary-400">
                                                {isPdf ? `Document ${idx + 1} (PDF)` : `Document ${idx + 1}`}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                {/* Contact Admin GST Modal */}
                {showGstContactModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-teal-50/50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">GST Registration Update</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Admin Managed Compliance</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowGstContactModal(false)}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    To ensure tax compliance and invoice accuracy, GST updates (GSTIN, legal trade name, or tax applicability) are verified and processed by the platform administration.
                                </p>

                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                        <span>Property:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{name || 'Your Property'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                        <span>Support Email:</span>
                                        <span className="font-mono font-bold text-primary">support@oreedu.com</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                        <span>Required Documents:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">GST Registration Certificate</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <a
                                        href={`mailto:support@oreedu.com?subject=${encodeURIComponent(`GST Update Request - ${name || 'Property'}`)}&body=${encodeURIComponent(`Hello Platform Support Team,\n\nWe would like to request an update to the GST registration details for our property:\n\n- Property Name: ${name || ''}\n- Property Email: ${email || ''}\n- GSTIN: [Enter 15-digit GSTIN]\n- Legal Business Name: [Enter Registered Business Name]\n\nPlease find our GST certificate attached.\n\nThank you,\n${name || 'Property Management'}`)}`}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
                                    >
                                        <Send className="h-4 w-4" />
                                        <span>Send Request via Email</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText('support@oreedu.com');
                                            toast.success('Support email copied to clipboard');
                                        }}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copy Support Email (support@oreedu.com)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

// Reusable field component
function Field({ label, icon, value, onChange, editMode, type = 'text' }: {
    label: string; icon?: React.ReactNode; value: string;
    onChange: (v: string) => void; editMode: boolean; type?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                {icon} {label}
            </label>
            {editMode ? (
                <input type={type} value={value} onChange={e => onChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">{value || '—'}</p>
            )}
        </div>
    );
}
