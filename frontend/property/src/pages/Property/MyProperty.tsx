import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { propertiesService } from '../../services/properties';
import { uploadService } from '../../services/uploads';
import type { Property } from '../../types/property';
import toast from 'react-hot-toast';
import {
    Building2, MapPin, Phone, Mail, Globe, Save, Loader2,
    Camera, X, CheckCircle, XCircle, Star, Image as ImageIcon,
    Plus, Clock, Percent, ShieldAlert, Trash2, FileText
} from 'lucide-react';
import { cancellationPoliciesService, type CancellationPolicy, type CancellationRule } from '../../services/cancellationPolicies';
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
            loadPolicies();
        }
    }, [selectedProperty?.id]);

    const loadPolicies = async () => {
        if (!selectedProperty?.id) return;
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

            {/* Cancellation Policies Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-blue-600" /> Cancellation Policies
                    </h2>
                    {!showPolicyForm && (
                        <button
                            onClick={() => setShowPolicyForm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40"
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
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
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
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
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
                            p.isDefault ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-gray-800"
                        )}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        <h3 className="font-medium text-gray-900 dark:text-white">{p.name}</h3>
                                        {p.isDefault && (
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
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
                                            className="text-xs text-blue-600 hover:underline"
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
                                        {rule.hoursBeforeCheckIn}h: <span className="text-blue-600 dark:text-blue-400">{rule.refundPercentage}%</span>
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
