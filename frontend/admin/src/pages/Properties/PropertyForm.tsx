import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Building2, MapPin, Image, Star } from 'lucide-react';
import propertyService from '../../services/properties';
import { usersService } from '../../services/users';
import { PropertyType, CreatePropertyDto } from '../../types/property';
import { User } from '../../types/user';
import { useAuth } from '../../context/AuthContext';
import ImageUpload from '../../components/ImageUpload';
import { categoryService } from '../../services/category';
import { PropertyCategory } from '../../types/category';
import SearchableSelect from '../../components/SearchableSelect';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'RESORT', label: 'Resort' },
    { value: 'HOMESTAY', label: 'Homestay' },
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'OTHER', label: 'Other' },
];

const defaultAmenities = [
    'WiFi', 'Pool', 'Restaurant', 'Spa', 'Gym', 'Parking',
    'Air Conditioning', 'Room Service', 'Laundry', 'Bar'
];

export default function PropertyForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [marketingUsers, setMarketingUsers] = useState<User[]>([]);
    const [propertyOwners, setPropertyOwners] = useState<User[]>([]);
    const [categories, setCategories] = useState<PropertyCategory[]>([]);

    // Check roles
    const isAdmin = user?.roles?.some(r => r === 'SuperAdmin' || r === 'Admin');
    const isMarketing = user?.roles?.includes('Marketing');
    const isPropertyOwner = user?.roles?.includes('PropertyOwner');

    const [formData, setFormData] = useState<CreatePropertyDto>({
        name: '',
        type: 'RESORT',
        description: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        email: '',
        phone: '',
        amenities: [],
        images: [],
        coverImage: '',
        addedById: '',
        marketingCommission: 0,
        ownerId: '',
        isFeatured: false,
        platformCommission: 10,
        whatsappNumber: '',
        categoryId: '',
        latitude: undefined,
        longitude: undefined,
        taxRate: 12,
    });

    useEffect(() => {
        if (isEdit && id) {
            loadProperty(id);
        }

        if (isAdmin || isMarketing) {
            loadUsers();
            loadCategories();
        }

        // Auto-set defaults for non-admins
        if (!isAdmin) {
            if (user?.id) {
                setFormData(prev => ({
                    ...prev,
                    ...(isMarketing && {
                        addedById: user.id,
                        marketingCommission: user.commissionPercentage || 0
                    }),
                    ...(isPropertyOwner && !isEdit && {
                        ownerId: user.id
                    })
                }));
            }
        }
    }, [id, isEdit, isAdmin, isMarketing, isPropertyOwner, user]);

    const loadCategories = async () => {
        try {
            const data = await categoryService.getAll();
            setCategories(data);
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    };

    const loadUsers = async () => {
        try {
            const users = await usersService.getAll();
            // Filter users who have 'Marketing' role
            const marketers = users.filter(u => u.roles.some(r => r.role.name.includes('Marketing')));
            setMarketingUsers(marketers);

            // Filter users who are property owners
            const owners = users.filter(u =>
                u.roles.some(r =>
                    r.role.name.includes('Owner') ||
                    r.role.name === 'Admin' ||
                    r.role.name === 'SuperAdmin'
                )
            );
            setPropertyOwners(owners);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const loadProperty = async (propertyId: string) => {
        try {
            setLoading(true);
            const property = await propertyService.getById(propertyId);
            setFormData({
                name: property.name,
                type: property.type,
                description: property.description || '',
                address: property.address,
                city: property.city,
                state: property.state,
                country: property.country,
                pincode: property.pincode || '',
                email: property.email,
                phone: property.phone,
                amenities: property.amenities,
                images: property.images,
                coverImage: property.coverImage || '',
                latitude: property.latitude,
                longitude: property.longitude,
                addedById: property.addedBy?.id || '',
                marketingCommission: property.marketingCommission || 0,
                ownerId: property.ownerId || '',
                isFeatured: property.isFeatured || false,
                platformCommission: property.platformCommission || 10,
                whatsappNumber: property.whatsappNumber || '',
                categoryId: property.categoryId || '',
                taxRate: property.taxRate || 12,
            });
        } catch (err: any) {
            setError(err.message || 'Failed to load property');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            setSaving(true);
            // Convert commission to number if string
            const submissionData = {
                ...formData,
                marketingCommission: Number(formData.marketingCommission),
                platformCommission: Number(formData.platformCommission),
                taxRate: Number(formData.taxRate),
            };

            if (isEdit && id) {
                await propertyService.update(id, submissionData);
            } else {
                await propertyService.create(submissionData);
            }
            navigate('/properties');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to save property');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const toggleAmenity = (amenity: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities?.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...(prev.amenities || []), amenity],
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/properties')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {isEdit ? 'Edit Property' : 'Add New Property'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isEdit ? 'Update property details' : 'Create a new property listing'}
                    </p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Marketing & Commission - Only visible to Admin or if Marketing adding it (commission) */}
                <div className="bg-card rounded-xl shadow-sm p-6 border-l-4 border-emerald-500 border border-border">
                    <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">

                        ₹ Marketing & Commission
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isAdmin && (
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">
                                    Added By (Marketing Staff)
                                </label>
                                <SearchableSelect
                                    options={marketingUsers.map(u => ({
                                        id: u.id,
                                        label: `${u.firstName} ${u.lastName}`,
                                        subLabel: u.email
                                    }))}
                                    value={formData.addedById || ''}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, addedById: val }));
                                        const selectedUser = marketingUsers.find(u => u.id === val);
                                        if (selectedUser) {
                                            setFormData(prev => ({
                                                ...prev,
                                                marketingCommission: Number(selectedUser.commissionPercentage || 0)
                                            }));
                                        } else {
                                            setFormData(prev => ({
                                                ...prev,
                                                marketingCommission: 0
                                            }));
                                        }
                                    }}
                                    placeholder="-- Select Staff --"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Commission Percentage (%)
                            </label>
                            <input
                                type="number"
                                name="marketingCommission"
                                value={formData.marketingCommission}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.01"
                                readOnly
                                className="w-full px-4 py-2 bg-muted text-muted-foreground border border-border rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-not-allowed opacity-70"
                                placeholder="e.g. 10.00"
                            />
                        </div>
                        {isAdmin && (
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">
                                    Platform Commission (%)
                                </label>
                                <input
                                    type="number"
                                    name="platformCommission"
                                    value={formData.platformCommission}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                    placeholder="e.g. 10.00"
                                />
                                <p className="text-xs text-muted-foreground mt-1 font-medium italic">
                                    * This is the percentage the platform takes from each booking.
                                </p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Tax Rate (%) *
                            </label>
                            <select
                                name="taxRate"
                                value={formData.taxRate}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            >
                                <option value={5}>5% (GST)</option>
                                <option value={12}>12% (GST)</option>
                                <option value={18}>18% (GST)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1 font-medium italic">
                                * Applied to all bookings for this property.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Owner Selection - Only visible to Admin/Marketing */}
                {(isAdmin || isMarketing) && (
                    <div className="bg-card rounded-xl shadow-sm p-6 border-l-4 border-blue-500 border border-border">
                        <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Property Owner (Client)
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">
                                    Assign Owner *
                                </label>
                                <SearchableSelect
                                    options={propertyOwners.map(u => ({
                                        id: u.id,
                                        label: `${u.firstName} ${u.lastName}`,
                                        subLabel: u.email
                                    }))}
                                    value={formData.ownerId || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, ownerId: val }))}
                                    placeholder="-- Select Owner --"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-2 font-medium">
                                    The user selected here will have full control over this property's operations.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Basic Info */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
                    <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Basic Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Property Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="e.g., Nature Haven Resort"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Property Type *
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            >
                                {propertyTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Category *
                            </label>
                            <select
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={(e) => {
                                    const catId = e.target.value;
                                    const selectedCat = categories.find(c => c.id === catId);
                                    setFormData(prev => ({
                                        ...prev,
                                        categoryId: catId,
                                        // Auto-sync type if possible for backward compatibility
                                        type: (selectedCat?.slug?.toUpperCase() as any) || prev.type
                                    }));
                                }}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            >
                                <option value="">-- Select Category --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="contact@property.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Phone *
                            </label>
                            <div className="phone-input-container">
                                <PhoneInput
                                    country={'in'}
                                    value={formData.phone}
                                    onChange={(phone) => setFormData(prev => ({ ...prev, phone: `+${phone}` }))}
                                    inputClass="!w-full !h-[42px] !pl-12 !pr-3 !py-2 !bg-background !text-foreground !border !border-border !rounded-lg focus:!ring-2 focus:!ring-primary focus:!outline-none transition-all"
                                    buttonClass="!bg-transparent !border-r-0 !rounded-l-lg hover:!bg-muted"
                                    containerClass="!w-full"
                                    enableSearch={true}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                WhatsApp Number
                            </label>
                            <div className="phone-input-container">
                                <PhoneInput
                                    country={'in'}
                                    value={formData.whatsappNumber || ''}
                                    onChange={(phone) => setFormData(prev => ({ ...prev, whatsappNumber: `+${phone}` }))}
                                    inputClass="!w-full !h-[42px] !pl-12 !pr-3 !py-2 !bg-background !text-foreground !border !border-border !rounded-lg focus:!ring-2 focus:!ring-primary focus:!outline-none transition-all"
                                    buttonClass="!bg-transparent !border-r-0 !rounded-l-lg hover:!bg-muted"
                                    containerClass="!w-full"
                                    enableSearch={true}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                                placeholder="Describe your property..."
                            />
                        </div>
                    </div>
                </div>

                {/* Featured Status - Only visible to Admin */}
                {isAdmin && (
                    <div className="bg-card rounded-xl shadow-sm p-6 border-l-4 border-amber-500 border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                                    <Star className="h-5 w-5 text-amber-500" />
                                    Featured Property
                                </h2>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Featured properties are showcased on the public homepage.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isFeatured"
                                    checked={formData.isFeatured}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Location */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
                    <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Address *
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="Full street address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="e.g., Wayanad"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                State *
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="e.g., Kerala"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Pincode
                            </label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="673123"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Latitude
                            </label>
                            <input
                                type="number"
                                name="latitude"
                                value={formData.latitude || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value ? Number(e.target.value) : undefined }))}
                                step="any"
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="11.6892"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">
                                Longitude
                            </label>
                            <input
                                type="number"
                                name="longitude"
                                value={formData.longitude || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value ? Number(e.target.value) : undefined }))}
                                step="any"
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                placeholder="76.0432"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            (position) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    latitude: position.coords.latitude,
                                                    longitude: position.coords.longitude
                                                }));
                                            },
                                            (error) => {
                                                console.error('Error getting location:', error);
                                                alert('Failed to get current location. Please check browser permissions.');
                                            }
                                        );
                                    } else {
                                        alert('Geolocation is not supported by this browser.');
                                    }
                                }}
                                className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <MapPin className="h-4 w-4" />
                                Use current location
                            </button>
                        </div>
                    </div>
                </div>

                {/* Amenities */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
                    <h2 className="text-lg font-bold text-card-foreground mb-4">Amenities</h2>

                    <div className="flex flex-wrap gap-2">
                        {defaultAmenities.map(amenity => (
                            <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${formData.amenities?.includes(amenity)
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {amenity}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Images */}
                <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
                    <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Images
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                                Cover Image
                            </label>
                            <ImageUpload
                                images={formData.coverImage ? [formData.coverImage] : []}
                                onChange={(urls) => setFormData(prev => ({ ...prev, coverImage: urls[0] || '' }))}
                                maxImages={1}
                            />
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                                Used as the main thumbnail for the property.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                                Gallery Images
                            </label>
                            <ImageUpload
                                images={formData.images || []}
                                onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))}
                                maxImages={10}
                            />
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                                Add up to 10 photos of the property.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/properties')}
                        className="px-6 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 font-bold transition-all shadow-md"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Property'}
                    </button>
                </div>
            </form>
        </div>
    );
}


