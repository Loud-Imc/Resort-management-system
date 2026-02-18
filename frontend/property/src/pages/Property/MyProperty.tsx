import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { propertiesService } from '../../services/properties';
import { uploadService } from '../../services/uploads';
import type { Property } from '../../types/property';
import toast from 'react-hot-toast';
import {
    Building2, MapPin, Phone, Mail, Globe, Save, Loader2,
    Camera, X, CheckCircle, XCircle, Star, Image as ImageIcon,
    Plus
} from 'lucide-react';
import clsx from 'clsx';

export default function MyProperty() {
    const { selectedProperty, refreshProperties } = useProperty();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

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
    const [amenities, setAmenities] = useState<string[]>([]);
    const [newAmenity, setNewAmenity] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (selectedProperty?.id) loadProperty();
    }, [selectedProperty?.id]);

    const loadProperty = async () => {
        try {
            setLoading(true);
            const data = await propertiesService.getById(selectedProperty!.id);
            setProperty(data);
            populateFields(data);
        } catch (err: any) {
            toast.error('Failed to load property details');
        } finally {
            setLoading(false);
        }
    };

    const populateFields = (p: Property) => {
        setName(p.name || '');
        setDescription(p.description || '');
        setAddress(p.address || '');
        setCity(p.city || '');
        setState(p.state || '');
        setCountry(p.country || '');
        setPincode(p.pincode || '');
        setPhone(p.phone || '');
        setEmail(p.email || '');
        setWhatsappNumber(p.whatsappNumber || '');
        setAmenities(p.amenities || []);
        setImages(p.images || []);
        setCoverImage(p.coverImage || '');
    };

    const handleSave = async () => {
        if (!property) return;
        try {
            setSaving(true);
            const updated = await propertiesService.update(property.id, {
                name, description, address, city, state, country, pincode,
                phone, email, whatsappNumber, amenities, images, coverImage,
            });
            setProperty(updated);
            populateFields(updated);
            setEditMode(false);
            toast.success('Property updated successfully!');
            await refreshProperties();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update property');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!property) return;
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
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const res = await uploadService.upload(file);
            setImages(prev => [...prev, res.url || res.path]);
        } catch {
            toast.error('Failed to upload image');
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

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" /> My Property
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your property details, images and settings</p>
                </div>
                <div className="flex items-center gap-2">
                    {!editMode ? (
                        <>
                            <button onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
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
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70">
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
                    property.isVerified ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400")}>
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
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    {editMode ? (
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description || 'No description'}</p>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" /> Address
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
            </div>

            {/* Amenities */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" /> Amenities
                </h2>
                <div className="flex flex-wrap gap-2">
                    {amenities.map((a, i) => (
                        <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium">
                            {a}
                            {editMode && <button onClick={() => removeAmenity(i)} className="ml-1 text-blue-400 hover:text-red-500"><X className="h-3 w-3" /></button>}
                        </span>
                    ))}
                    {amenities.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No amenities listed</p>}
                </div>
                {editMode && (
                    <div className="flex gap-2">
                        <input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} placeholder="Add amenity"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm" />
                        <button onClick={addAmenity} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Gallery */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" /> Gallery
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
                        <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : (
                                <>
                                    <Camera className="h-6 w-6 text-gray-400" />
                                    <span className="text-xs text-gray-400 mt-1">Add Image</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>
                {images.length === 0 && !editMode && <p className="text-sm text-gray-400 dark:text-gray-500">No images uploaded</p>}
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{property._count?.rooms || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rooms</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{property._count?.bookings || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bookings</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{property._count?.staff || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Staff</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{property.rating?.toFixed(1) || '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rating</p>
                    </div>
                </div>
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 py-2">{value || '—'}</p>
            )}
        </div>
    );
}
