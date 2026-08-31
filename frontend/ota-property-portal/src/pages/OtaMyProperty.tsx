import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Save, MapPin, Building, ShieldCheck, Image as ImageIcon, Trash2, Plus, Edit, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OtaMyProperty() {
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Edit states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [amenityInput, setAmenityInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Policy Form states
  const [policies, setPolicies] = useState<any[]>([]);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [policyType, setPolicyType] = useState('REFUNDABLE');
  const [cancelBeforeHours, setCancelBeforeHours] = useState('24');
  const [refundPercentage, setRefundPercentage] = useState('100');
  const [noShowFeePercentage, _setNoShowFeePercentage] = useState('100');
  const [policyDescription, setPolicyDescription] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, []);

  const fetchProperty = async () => {
    setIsLoading(true);
    try {
      const res = await otaService.getDashboard();
      if (res.hasProperty) {
        const details = await otaService.getMyProperty();
        setProperty(details);
        populateFields(details);

        const policiesList = await otaService.getMyPolicies();
        setPolicies(policiesList);
      }
    } catch (e) {
      toast.error('Failed to load property listing details');
    } finally {
      setIsLoading(false);
    }
  };

  const populateFields = (details: any) => {
    if (!details) return;
    setName(details.name || '');
    setDescription(details.description || '');
    setAddress(details.address || '');
    setCity(details.city || '');
    setState(details.state || '');
    setPincode(details.pincode || '');
    setPhone(details.phone || '');
    setEmail(details.email || '');
    setWhatsappNumber(details.whatsappNumber || '');
    setLatitude(details.latitude ? details.latitude.toString() : '');
    setLongitude(details.longitude ? details.longitude.toString() : '');
    setCoverImage(details.coverImage || '');
    setAmenities(details.amenities || []);
    setImages(details.images || []);
  };

  const handleCancel = () => {
    populateFields(property);
    setEditMode(false);
    toast.dismiss();
  };

  // Cover image file uploader
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading cover photo...');
    try {
      const res = await otaService.uploadFile(file);
      if (res && res.url) {
        setCoverImage(res.url);
        toast.success('Cover photo uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Upload response did not contain url');
      }
    } catch (error) {
      toast.error('Failed to upload cover image.', { id: toastId });
    }
  };

  // Gallery image file uploader
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading gallery photo...');
    try {
      const res = await otaService.uploadFile(file);
      if (res && res.url) {
        setImages(prev => [...prev, res.url]);
        toast.success('Photo added to gallery!', { id: toastId });
      } else {
        throw new Error('Upload response did not contain url');
      }
    } catch (error) {
      toast.error('Failed to upload gallery image.', { id: toastId });
    }
  };

  const handleDeleteGalleryImage = (idxToDelete: number) => {
    setImages(images.filter((_, idx) => idx !== idxToDelete));
  };

  // Google maps parser helper
  const handleParseMapsLink = () => {
    if (!googleMapsUrl.trim()) {
      toast.error('Please input a Google Maps link to parse');
      return;
    }
    const match = googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      setLatitude(match[1]);
      setLongitude(match[2]);
      toast.success('Coordinates parsed successfully!');
    } else {
      toast.error('Could not extract coordinates. Make sure url contains @latitude,longitude details.');
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() && !amenities.includes(amenityInput.trim())) {
      setAmenities([...amenities, amenityInput.trim()]);
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (val: string) => {
    setAmenities(amenities.filter((a) => a !== val));
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await otaService.updateMyProperty({
        name,
        description,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        whatsappNumber,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        coverImage,
        amenities,
        images,
      });
      setProperty(updated);
      populateFields(updated);
      setEditMode(false);
      toast.success('Property listing profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update listing details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    try {
      await otaService.createMyPolicy({
        type: policyType,
        cancelBeforeHours: parseInt(cancelBeforeHours),
        refundPercentage: parseFloat(refundPercentage),
        noShowFeePercentage: parseFloat(noShowFeePercentage),
        description: policyDescription,
      });
      toast.success('Cancellation policy added successfully');
      setIsAddingPolicy(false);
      setPolicyDescription('');
      
      const policiesList = await otaService.getMyPolicies();
      setPolicies(policiesList);
    } catch (e: any) {
      toast.error('Failed to add policy');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm('Delete this cancellation policy?')) return;
    try {
      await otaService.deleteMyPolicy(id);
      toast.success('Policy deleted successfully');
      const policiesList = await otaService.getMyPolicies();
      setPolicies(policiesList);
    } catch (e) {
      toast.error('Failed to delete policy');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-4">
        <div className="text-left">
          <h2 className="text-xl font-black text-foreground">My Property Profile</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Manage search descriptions, geolocation markers, photos, and cancellation terms.</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-center">
          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-md shadow-primary/25"
            >
              <Edit className="h-4 w-4" /> Edit Details
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-border bg-card text-foreground hover:bg-muted font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveProfile()}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-primary/25"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cover Image Banner (PMS Style) */}
      <div className="relative rounded-2xl overflow-hidden h-52 bg-muted/20 border border-border/60 shadow-md">
        {coverImage ? (
          <img src={coverImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-40 animate-pulse" />
          </div>
        )}
        
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

        {/* Property Name overlay at the bottom of the cover image */}
        <div className="absolute bottom-4 left-6 text-left">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary-foreground/10 px-2 py-0.5 rounded-md backdrop-blur-sm border border-primary/20">Oreedu Partner</span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 drop-shadow-md">{name || 'Unnamed Property'}</h1>
        </div>

        {editMode && (
          <div className="absolute bottom-4 right-6">
            <input
              type="file"
              accept="image/*"
              id="cover-upload"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <label
              htmlFor="cover-upload"
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900/90 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all border border-white/10 shadow-lg flex items-center gap-1.5 backdrop-blur-sm active:scale-95 animate-in fade-in duration-200"
            >
              <Plus className="h-4 w-4" /> Change Cover
            </label>
          </div>
        )}
      </div>

      {/* Profile details card */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground w-full">
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
          <Building className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-extrabold text-sm text-foreground">Search Listing Settings</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Property Name</label>
            {editMode ? (
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {name || '—'}
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">WhatsApp Number</label>
            {editMode ? (
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {whatsappNumber || '—'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Listing Description</label>
          {editMode ? (
            <textarea
              required
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          ) : (
            <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-medium text-xs min-h-[80px] leading-relaxed">
              {description || '—'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Contact Email</label>
            {editMode ? (
              <input
                type="email"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {email || '—'}
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Contact Phone</label>
            {editMode ? (
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {phone || '—'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Street Address</label>
          {editMode ? (
            <input
              type="text"
              required
              className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          ) : (
            <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
              {address || '—'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">City</label>
            {editMode ? (
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {city || '—'}
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">State</label>
            {editMode ? (
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {state || '—'}
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Pincode</label>
            {editMode ? (
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            ) : (
              <div className="px-3 py-2.5 bg-muted/20 border border-border/10 rounded-xl text-foreground font-semibold text-xs min-h-[38px] flex items-center">
                {pincode || '—'}
              </div>
            )}
          </div>
        </div>

        {/* Google maps link coordinates extractor */}
        <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="font-extrabold text-xs text-foreground">Google Maps Coordinates Parser</h4>
          </div>
          {editMode && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste Google Maps URL containing coordinates..."
                className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-medium focus:ring-2 focus:ring-primary"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleParseMapsLink}
                className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
              >
                Extract
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Latitude</label>
              {editMode ? (
                <input
                  type="text"
                  required
                  placeholder="e.g. 15.42193"
                  className="w-full px-2 py-1.5 bg-muted/45 border border-border rounded-lg outline-none text-foreground font-semibold text-[11px]"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              ) : (
                <div className="px-2 py-1.5 bg-muted/20 border border-border/10 rounded-lg text-foreground font-semibold text-[11px] min-h-[28px] flex items-center">
                  {latitude || '—'}
                </div>
              )}
            </div>
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Longitude</label>
              {editMode ? (
                <input
                  type="text"
                  required
                  placeholder="e.g. 73.81239"
                  className="w-full px-2 py-1.5 bg-muted/45 border border-border rounded-lg outline-none text-foreground font-semibold text-[11px]"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              ) : (
                <div className="px-2 py-1.5 bg-muted/20 border border-border/10 rounded-lg text-foreground font-semibold text-[11px] min-h-[28px] flex items-center">
                  {longitude || '—'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amenities Tag lists */}
        <div className="space-y-2 text-left">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Property Amenities</label>
          {editMode && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Swimming Pool, Free Wifi..."
                className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {amenities.map((a) => (
              <span
                key={a}
                className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg flex items-center gap-1.5"
              >
                {a}
                {editMode && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(a)}
                    className="p-0.5 hover:bg-primary/20 rounded text-primary border-none cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {amenities.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No amenities specified.</p>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery Card */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground w-full">
        <div className="flex items-center justify-between border-b border-border pb-3 text-left">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-extrabold text-sm text-foreground font-black">Property Photo Gallery</h3>
          </div>
          {editMode && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                id="gallery-upload"
                className="hidden"
                onChange={handleGalleryUpload}
              />
              <label
                htmlFor="gallery-upload"
                className="px-3 py-1.5 bg-primary text-primary-foreground font-bold text-[10px] rounded-lg cursor-pointer hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm shadow-primary/10"
              >
                <Plus className="h-3 w-3" /> Upload Photo
              </label>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div className="py-8 text-center bg-muted/10 border border-dashed border-border rounded-2xl">
            <ImageIcon className="h-8 w-8 text-muted-foreground/35 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-bold">No gallery photos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((imgUrl, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-border aspect-video group bg-muted/20">
                <img 
                  src={imgUrl} 
                  alt={`Gallery ${idx + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                {editMode && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGalleryImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-550 hover:bg-red-650 text-white rounded-lg transition-colors cursor-pointer shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {editMode && (
          <div className="pt-2 border-t border-border/60 text-left">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-1">Add Image URL manually</label>
            <div className="flex gap-2">
              <input
                type="text"
                id="manual-image-url"
                placeholder="Paste external image link..."
                className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      setImages(prev => [...prev, input.value.trim()]);
                      input.value = '';
                      toast.success('Image link added to gallery!');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('manual-image-url') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    setImages(prev => [...prev, input.value.trim()]);
                    input.value = '';
                    toast.success('Image link added to gallery!');
                  }
                }}
                className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
              >
                Add Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation policies card */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground w-full">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-2 text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-extrabold text-sm text-foreground">Cancellation Policies</h3>
          </div>
          {!isAddingPolicy && (
            <button
              onClick={() => setIsAddingPolicy(true)}
              className="px-2.5 py-1 bg-primary text-primary-foreground font-bold text-[10px] rounded-lg cursor-pointer hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>

        {isAddingPolicy ? (
          <form onSubmit={handleCreatePolicy} className="space-y-3.5 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Policy Type</label>
              <select
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
              >
                <option value="REFUNDABLE">Refundable</option>
                <option value="NON_REFUNDABLE">Non Refundable</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Refund (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={refundPercentage}
                  onChange={(e) => setRefundPercentage(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Cancel window (Hours)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={cancelBeforeHours}
                  onChange={(e) => setCancelBeforeHours(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Policy Description</label>
              <textarea
                required
                placeholder="Describe refund policy statements to guest..."
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
                rows={2}
                value={policyDescription}
                onChange={(e) => setPolicyDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsAddingPolicy(false)}
                className="px-3 py-1.5 bg-muted text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPolicy}
                className="px-4 py-1.5 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                {isSavingPolicy ? 'Saving...' : 'Add Policy'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {policies.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">No cancellation policies formulated yet.</p>
            ) : (
              policies.map((p) => (
                <div key={p.id} className="p-4 bg-muted/20 border border-border rounded-xl space-y-2 relative group">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      p.type === 'REFUNDABLE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {p.type.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleDeletePolicy(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded border border-border transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    {p.refundPercentage}% refund if cancelled before {p.cancelBeforeHours}h.
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-normal">{p.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Uploaded Documents & KYC Card */}
      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm space-y-4 text-xs text-foreground w-full">
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-2 text-left">
          <FileText className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-extrabold text-sm text-foreground font-black">Uploaded Documents & KYC</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GST & Aadhaar Numbers */}
          <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border text-left">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">KYC Identifications</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] font-semibold text-muted-foreground">GST Number</span>
                <span className="text-xs font-bold text-foreground">
                  {property?.gstNumber || 'Not Provided'}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <span className="block text-[10px] font-semibold text-muted-foreground">Owner Aadhaar Number</span>
                <span className="text-xs font-bold text-foreground">
                  {property?.ownerAadhaarNumber || 'Not Provided'}
                </span>
              </div>
            </div>
          </div>

          {/* License Document */}
          <div className="space-y-2 text-left">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Business License</span>
            {property?.licenceImage ? (
              <a
                href={property.licenceImage}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted/20 hover:border-primary transition-all duration-300"
              >
                <img
                  src={property.licenceImage}
                  alt="Business License"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                    View Full Document
                  </span>
                </div>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground/45">
                <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                <span className="text-xs font-medium">No license document uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Aadhaar Images */}
        <div className="space-y-3 border-t border-border pt-6 text-left">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Owner Aadhaar Card Images</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Aadhaar Front */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Front Side</span>
              {property?.ownerAadhaarImage ? (
                <a
                  href={property.ownerAadhaarImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block relative aspect-video rounded-xl overflow-hidden border border-border bg-muted/20 hover:border-primary transition-all duration-300"
                >
                  <img
                    src={property.ownerAadhaarImage}
                    alt="Aadhaar Front"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                      View Full Document
                    </span>
                  </div>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground/45">
                  <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                  <span className="text-xs font-medium">No front side image uploaded</span>
                </div>
              )}
            </div>

            {/* Aadhaar Back */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Back Side</span>
              {property?.ownerAadhaarImageBack ? (
                <a
                  href={property.ownerAadhaarImageBack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block relative aspect-video rounded-xl overflow-hidden border border-border bg-muted/20 hover:border-primary transition-all duration-300"
                >
                  <img
                    src={property.ownerAadhaarImageBack}
                    alt="Aadhaar Back"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-primary px-3 py-1.5 rounded-lg shadow-md">
                      View Full Document
                    </span>
                  </div>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground/45">
                  <FileText className="h-8 w-8 stroke-[1.5] mb-2" />
                  <span className="text-xs font-medium">No back side image uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Compliance Documents */}
        {property?.documents && property.documents.length > 0 && (
          <div className="space-y-3 border-t border-border pt-6 text-left">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Additional Uploaded Documents ({property.documents.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {property.documents.map((doc: string, idx: number) => {
                const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc);
                return (
                  <a
                    key={idx}
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-muted/10 hover:bg-muted/20 border border-border rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted/30 shrink-0 flex items-center justify-center">
                      {isImg ? (
                        <img src={doc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        Document #{idx + 1}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        Click to view
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
