import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Building2, MapPin, Image } from 'lucide-react';
import propertyService from '../../services/properties';
import { usersService } from '../../services/users';
import { PropertyType, CreatePropertyDto } from '../../types/property';
import { User } from '../../types/user';
import { useAuth } from '../../context/AuthContext';
import ImageUpload from '../../components/ImageUpload';

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

    // Check roles
    const isAdmin = user?.roles?.some(r => r === 'SuperAdmin' || r === 'Admin');

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
    });

    useEffect(() => {
        if (isEdit && id) {
            loadProperty(id);
        }
        if (isAdmin) {
            loadMarketingUsers();
        } else {
            // If not admin (e.g., Marketing staff), auto-set addedById and commission
            if (user?.id) {
                setFormData(prev => ({
                    ...prev,
                    addedById: user.id,
                    marketingCommission: user.commissionPercentage || 0
                }));
            }
        }
    }, [id, isEdit, isAdmin, user]);

    const loadMarketingUsers = async () => {
        try {
            const users = await usersService.getAll();
            // Filter users who have 'Marketing' role (loose check)
            const marketers = users.filter(u => u.roles.some(r => r.role.name.includes('Marketing')));
            setMarketingUsers(marketers);
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
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/properties')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Property' : 'Add New Property'}
                    </h1>
                    <p className="text-gray-500">
                        {isEdit ? 'Update property details' : 'Create a new property listing'}
                    </p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Marketing & Commission - Only visible to Admin or if Marketing adding it (commission) */}
                <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-emerald-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">

                        ₹ Marketing & Commission
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isAdmin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Added By (Marketing Staff)
                                </label>
                                <select
                                    name="addedById"
                                    value={formData.addedById}
                                    onChange={(e) => {
                                        handleChange(e);
                                        const selectedUser = marketingUsers.find(u => u.id === e.target.value);
                                        // Always update commission, defaulting to 0 if null/undefined
                                        if (selectedUser) {
                                            setFormData(prev => ({
                                                ...prev,
                                                marketingCommission: Number(selectedUser.commissionPercentage || 0)
                                            }));
                                        } else {
                                            // Reset if no user selected
                                            setFormData(prev => ({
                                                ...prev,
                                                marketingCommission: 0
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- Select Staff --</option>
                                    {marketingUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.firstName} {u.lastName} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-100 cursor-not-allowed"
                                placeholder="e.g. 10.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Basic Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g., Nature Haven Resort"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Type *
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                {propertyTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="contact@property.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone *
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Describe your property..."
                            />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address *
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="Full street address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g., Wayanad"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                State *
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g., Kerala"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pincode
                            </label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                placeholder="673123"
                            />
                        </div>
                    </div>
                </div>

                {/* Amenities */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>

                    <div className="flex flex-wrap gap-2">
                        {defaultAmenities.map(amenity => (
                            <button
                                key={amenity}
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.amenities?.includes(amenity)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {amenity}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Images */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Images
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cover Image
                            </label>
                            <ImageUpload
                                images={formData.coverImage ? [formData.coverImage] : []}
                                onChange={(urls) => setFormData(prev => ({ ...prev, coverImage: urls[0] || '' }))}
                                maxImages={1}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Used as the main thumbnail for the property.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gallery Images
                            </label>
                            <ImageUpload
                                images={formData.images || []}
                                onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))}
                                maxImages={10}
                            />
                            <p className="text-xs text-gray-500 mt-1">
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
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
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


