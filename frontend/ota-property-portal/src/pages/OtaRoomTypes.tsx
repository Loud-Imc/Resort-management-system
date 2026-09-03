import { useState, useEffect } from 'react';
import { otaService } from '../services/otaService';
import { Loader2, Plus, Edit2, Trash2, Users, Sliders, ArrowLeft, Save, Image as ImageIcon, Check, ShieldCheck, Building2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const COMMON_HIGHLIGHTS = [
  'Mountain View', 'River View', 'Pool View', 'Garden View', 'Ocean View',
  'Valley View', 'Forest View', 'Sunset View', 'Private Balcony', 'Jacuzzi',
  'Fireplace', 'King Size Bed', 'Queen Size Bed', 'Twin Beds', 'Spacious Room',
  'Interconnected Rooms', 'Soundproofed', 'Attached Washroom', 'Bathtub'
];

const COMMON_INCLUSIONS = [
  'Breakfast Included', 'Lunch Included', 'Dinner Included',
  'All Meals Included (MAP)', 'Welcome Drink', 'Fruit Basket', 'Free Wi-Fi',
  'Airport Transfer', 'Railway Station Pickup', 'Evening Snacks',
  'Tea/Coffee Maker', 'Nature Walk', 'Yoga Session', 'Trekking',
  'Plantation Tour', 'Campfire', 'Bird Watching', 'Indoor Games'
];

const COMMON_AMENITIES = [
  'Wi-Fi', 'Air Conditioning (AC)', 'Fan', 'Room Heater', 'TV',
  'Mini Fridge', 'Electric Kettle', 'Safe Box', 'Telephone', 'Hair Dryer',
  'Iron box', 'Daily Housekeeping', 'Toiletries', 'Desk & Chair',
  'Wardrobe', 'Sofa / Seating Area', 'Extra Mattress', 'Bathrobes',
  'Plush Towels', 'Laundry Service'
];

export default function OtaRoomTypes() {
  const [property, setProperty] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Add panel states
  const [isEditViewOpen, setIsEditViewOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null);

  // Form states matching PMS
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [isGstInclusive, setIsGstInclusive] = useState(false);
  const [size, setSize] = useState('0');
  
  // Occupancy details
  const [baseAdults, setBaseAdults] = useState('2');
  const [baseChildren, setBaseChildren] = useState('0');
  const [maxPhysicalAdults, setMaxPhysicalAdults] = useState('4');
  const [maxPhysicalChildren, setMaxPhysicalChildren] = useState('2');
  const [extraAdultPrice, setExtraAdultPrice] = useState('0');
  const [extraChildPrice, setExtraChildPrice] = useState('0');

  // Policy & features
  const [cancellationPolicyId, setCancellationPolicyId] = useState('');
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(true);
  const [isAvailableForGroupBooking, setIsAvailableForGroupBooking] = useState(false);
  const [allowPayAtProperty, setAllowPayAtProperty] = useState(false);
  const [groupMaxOccupancy, setGroupMaxOccupancy] = useState('0');

  // Tag arrays & inputs
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState('');
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
  const [inclusionInput, setInclusionInput] = useState('');

  // Photos lists
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [rtRes, policiesRes, propRes] = await Promise.all([
        otaService.getRoomTypes(),
        otaService.getMyPolicies(),
        otaService.getMyProperty().catch(() => null)
      ]);
      setRoomTypes(rtRes);
      setPolicies(policiesRes);
      setProperty(propRes);
    } catch (e) {
      toast.error('Failed to retrieve room categories catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditView = (rt: any = null) => {
    setSelectedRoomType(rt);
    if (rt) {
      setName(rt.name || '');
      setDescription(rt.description || '');
      setBasePrice(rt.basePrice ? rt.basePrice.toString() : '0');
      setOriginalPrice(rt.originalPrice ? rt.originalPrice.toString() : '');
      setIsGstInclusive(rt.isGstInclusive || false);
      setSize(rt.size ? rt.size.toString() : '0');
      setBaseAdults(rt.baseAdults ? rt.baseAdults.toString() : '2');
      setBaseChildren(rt.baseChildren ? rt.baseChildren.toString() : '0');
      setMaxPhysicalAdults(rt.maxPhysicalAdults ? rt.maxPhysicalAdults.toString() : '4');
      setMaxPhysicalChildren(rt.maxPhysicalChildren ? rt.maxPhysicalChildren.toString() : '2');
      setExtraAdultPrice(rt.extraAdultPrice ? rt.extraAdultPrice.toString() : '0');
      setExtraChildPrice(rt.extraChildPrice ? rt.extraChildPrice.toString() : '0');
      setIsPubliclyVisible(rt.isPubliclyVisible !== false);
      setIsAvailableForGroupBooking(rt.isAvailableForGroupBooking || false);
      setAllowPayAtProperty(rt.allowPayAtProperty || false);
      setGroupMaxOccupancy(rt.groupMaxOccupancy ? rt.groupMaxOccupancy.toString() : '0');
      setCancellationPolicyId(rt.cancellationPolicyId || '');
      setSelectedAmenities(rt.amenities || []);
      setSelectedHighlights(rt.highlights || []);
      setSelectedInclusions(rt.inclusions || []);
      setImages(rt.images || []);
    } else {
      setName('');
      setDescription('');
      setBasePrice('0');
      setOriginalPrice('');
      setIsGstInclusive(false);
      setSize('0');
      setBaseAdults('2');
      setBaseChildren('0');
      setMaxPhysicalAdults('4');
      setMaxPhysicalChildren('2');
      setExtraAdultPrice('0');
      setExtraChildPrice('0');
      setIsPubliclyVisible(true);
      setIsAvailableForGroupBooking(false);
      setAllowPayAtProperty(false);
      setGroupMaxOccupancy('0');
      setCancellationPolicyId('');
      setSelectedAmenities([]);
      setSelectedHighlights([]);
      setSelectedInclusions([]);
      setImages([]);
    }
    setIsEditViewOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !basePrice || !size) {
      toast.error('Please fill out all mandatory fields');
      return;
    }
    if (images.length === 0) {
      toast.error('Please upload at least one room photo before saving');
      return;
    }
    setIsSaving(true);
    try {
      const resolvedBaseAdults = parseInt(baseAdults) || 2;
      const resolvedBaseChildren = parseInt(baseChildren) || 0;
      const resolvedMaxPhysAdults = parseInt(maxPhysicalAdults) || resolvedBaseAdults + 2;
      const resolvedMaxPhysChildren = parseInt(maxPhysicalChildren) || resolvedBaseChildren;

      const payload = {
        name,
        description,
        basePrice: parseFloat(basePrice),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        isGstInclusive,
        size: parseFloat(size),
        baseAdults: resolvedBaseAdults,
        baseChildren: resolvedBaseChildren,
        maxAdults: resolvedBaseAdults,
        maxChildren: resolvedBaseChildren,
        maxPhysicalAdults: resolvedMaxPhysAdults,
        maxPhysicalChildren: resolvedMaxPhysChildren,
        freeChildrenCount: resolvedBaseChildren,
        extraAdultPrice: parseFloat(extraAdultPrice) || 0,
        extraChildPrice: parseFloat(extraChildPrice) || 0,
        isPubliclyVisible,
        isAvailableForGroupBooking,
        allowPayAtProperty,
        groupMaxOccupancy: parseInt(groupMaxOccupancy) || 0,
        cancellationPolicyId: cancellationPolicyId || null,
        amenities: selectedAmenities,
        highlights: selectedHighlights,
        inclusions: selectedInclusions,
        images,
      };

      if (selectedRoomType) {
        await otaService.updateRoomType(selectedRoomType.id, payload);
        toast.success('Room type updated successfully');
      } else {
        await otaService.createRoomType(payload);
        toast.success('Room type created successfully');
      }
      setIsEditViewOpen(false);
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save room type details');
    } finally {
      setIsSaving(false);
    }
  };

  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  const handleDelete = (id: string) => {
    setDeletingTypeId(id);
  };

  const confirmDeleteType = async () => {
    if (!deletingTypeId) return;
    setIsDeletingType(true);
    try {
      await otaService.deleteRoomType(deletingTypeId);
      toast.success('Room type deleted successfully');
      setDeletingTypeId(null);
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete room category');
    } finally {
      setIsDeletingType(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Uploading room photo...');
    try {
      const res = await otaService.uploadFile(file);
      if (res && res.url) {
        setImages(prev => [...prev, res.url]);
        toast.success('Photo added successfully!', { id: toastId });
      } else {
        throw new Error('Upload missing URL');
      }
    } catch (err) {
      toast.error('Upload failed', { id: toastId });
    }
  };

  const handleDeleteImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleArrayItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setter(list.filter(x => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleAddCustomItem = (input: string, inputSetter: React.Dispatch<React.SetStateAction<string>>, list: string[], listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (input.trim() && !list.includes(input.trim())) {
      listSetter([...list, input.trim()]);
      inputSetter('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isEditViewOpen) {
    return (
      <div className="max-w-4xl mx-auto pb-12 space-y-6 text-xs text-foreground text-left">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <button
            type="button"
            onClick={() => setIsEditViewOpen(false)}
            className="p-2 hover:bg-muted rounded-xl transition-colors border border-border bg-card shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-black text-foreground">{selectedRoomType ? 'Edit' : 'Create'} Room Type</h2>
            <p className="text-muted-foreground text-[11px] mt-0.5">Configure details, custom tags, dynamic prices, and compliance limits.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Information Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Building2 className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-extrabold text-sm text-foreground">General Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Type Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Suite"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Base Price / Night (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
                <div className="mt-2.5">
                  {property?.isGstApplicable ? (
                    <>
                      <label className="inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isGstInclusive}
                          onChange={(e) => setIsGstInclusive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={`relative w-9 h-5 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors ${isGstInclusive ? 'bg-primary' : 'bg-muted'}`}></div>
                        <span className="ml-2 text-[9px] font-bold text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                          {isGstInclusive ? 'Price is Inclusive of GST' : 'Price is Exclusive of GST (+ GST)'}
                        </span>
                      </label>
                      <p className="mt-1 text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                        <Info className="h-3 w-3 text-primary shrink-0" />
                        <span>
                          {isGstInclusive
                            ? 'Base price is total guest amount; GST is reverse-calculated for invoices.'
                            : 'Dynamic GST tiers will be added on top of base price at checkout.'}
                        </span>
                      </p>
                    </>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-muted/40 text-muted-foreground text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"></span>
                      <span>Non-GST Property: Zero GST applied & Bill of Supply issued</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Market Price (MRP Strikethrough) (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 6000"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Size (sq.ft)</label>
                <input
                  type="number"

                  placeholder="e.g. 280"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Description <span className="text-red-500">*</span></label>
              <textarea
                required
                rows={3}
                placeholder="Describe the room experience, view, and bed arrangements..."
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Occupancy Limits Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Users className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-extrabold text-sm text-foreground">Occupancy Limits & Extras</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-4 bg-muted/20 border border-border rounded-xl">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Base Included Occupancy</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground">Base Adults</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-2 py-1.5 bg-card border border-border rounded-lg outline-none text-foreground font-semibold text-xs"
                      value={baseAdults}
                      onChange={(e) => setBaseAdults(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground">Base Children</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-2 py-1.5 bg-card border border-border rounded-lg outline-none text-foreground font-semibold text-xs"
                      value={baseChildren}
                      onChange={(e) => setBaseChildren(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 p-4 bg-muted/20 border border-border rounded-xl">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Maximum Room Capacity</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground">Max Adults</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-2 py-1.5 bg-card border border-border rounded-lg outline-none text-foreground font-semibold text-xs"
                      value={maxPhysicalAdults}
                      onChange={(e) => setMaxPhysicalAdults(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground">Max Children</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-2 py-1.5 bg-card border border-border rounded-lg outline-none text-foreground font-semibold text-xs"
                      value={maxPhysicalChildren}
                      onChange={(e) => setMaxPhysicalChildren(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Extra Adult Charge (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={extraAdultPrice}
                  onChange={(e) => setExtraAdultPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Extra Child Charge (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                  value={extraChildPrice}
                  onChange={(e) => setExtraChildPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Compliance & Settings Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-extrabold text-sm text-foreground">Compliance & Platform Rules</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col justify-center p-3 bg-muted/20 border border-border rounded-xl">
                <label className="inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isPubliclyVisible}
                    onChange={(e) => setIsPubliclyVisible(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`relative w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors ${isPubliclyVisible ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className="ml-2.5">
                    <span className="block text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">Publicly Visible</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">List room on the OTA website</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col justify-center p-3 bg-muted/20 border border-border rounded-xl">
                <label className="inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={allowPayAtProperty}
                    onChange={(e) => setAllowPayAtProperty(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`relative w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors ${allowPayAtProperty ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className="ml-2.5">
                    <span className="block text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">Pay at Property</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">Let guests pay during check-in</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col justify-center p-3 bg-muted/20 border border-border rounded-xl">
                <label className="inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAvailableForGroupBooking}
                    onChange={(e) => setIsAvailableForGroupBooking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`relative w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all transition-colors ${isAvailableForGroupBooking ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className="ml-2.5">
                    <span className="block text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">Enable Group Bookings</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">Sell rooms on per-head options</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cancellation Policy <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-muted-foreground font-semibold"
                  value={cancellationPolicyId}
                  onChange={(e) => setCancellationPolicyId(e.target.value)}
                >
                  <option value="">Select a cancellation policy...</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} ({p.refundPercentage}% refund before {p.cancelBeforeHours}h)
                    </option>
                  ))}
                </select>
              </div>

              {isAvailableForGroupBooking && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Max Group Occupancy</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground font-semibold"
                    value={groupMaxOccupancy}
                    onChange={(e) => setGroupMaxOccupancy(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags & Pills Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-extrabold text-sm text-foreground">Amenities, Highlights, & Inclusions</h3>
            </div>

            {/* Room Amenities */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Amenities</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-xl max-h-[120px] overflow-y-auto">
                {COMMON_AMENITIES.map((a) => {
                  const selected = selectedAmenities.includes(a);
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleArrayItem(selectedAmenities, setSelectedAmenities, a)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all border cursor-pointer ${
                        selected 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-card border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {a}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or type custom amenity..."
                  className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomItem(amenityInput, setAmenityInput, selectedAmenities, setSelectedAmenities))}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomItem(amenityInput, setAmenityInput, selectedAmenities, setSelectedAmenities)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Room Highlights */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Highlights</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-xl max-h-[120px] overflow-y-auto">
                {COMMON_HIGHLIGHTS.map((h) => {
                  const selected = selectedHighlights.includes(h);
                  return (
                    <button
                      type="button"
                      key={h}
                      onClick={() => toggleArrayItem(selectedHighlights, setSelectedHighlights, h)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all border cursor-pointer ${
                        selected 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-card border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {h}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or type custom highlight..."
                  className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomItem(highlightInput, setHighlightInput, selectedHighlights, setSelectedHighlights))}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomItem(highlightInput, setHighlightInput, selectedHighlights, setSelectedHighlights)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Room Inclusions */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Room Inclusions</label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-xl max-h-[120px] overflow-y-auto">
                {COMMON_INCLUSIONS.map((i) => {
                  const selected = selectedInclusions.includes(i);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => toggleArrayItem(selectedInclusions, setSelectedInclusions, i)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all border cursor-pointer ${
                        selected 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-card border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {i}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or type custom inclusion..."
                  className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                  value={inclusionInput}
                  onChange={(e) => setInclusionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomItem(inclusionInput, setInclusionInput, selectedInclusions, setSelectedInclusions))}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomItem(inclusionInput, setInclusionInput, selectedInclusions, setSelectedInclusions)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Photo Gallery Uploader Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4.5 w-4.5 text-primary" />
                <h3 className="font-extrabold text-sm text-foreground">Room Gallery Photos</h3>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="room-photos-upload"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="room-photos-upload"
                  className="px-3.5 py-2 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl cursor-pointer hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/25"
                >
                  <Plus className="h-4 w-4" /> Upload Photo
                </label>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="py-8 text-center bg-muted/10 border border-dashed border-border rounded-2xl">
                <ImageIcon className="h-8 w-8 text-muted-foreground/35 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-bold">No room photos added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-border aspect-video group bg-muted/20">
                    <img
                      src={imgUrl}
                      alt={`Room ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer shadow-md"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border/60">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-1">Add Image URL manually</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="manual-room-image-url"
                  placeholder="Paste external image link..."
                  className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-xl outline-none text-foreground text-xs font-semibold focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget;
                      if (input.value.trim()) {
                        setImages(prev => [...prev, input.value.trim()]);
                        input.value = '';
                        toast.success('Image link added!');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('manual-room-image-url') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      setImages(prev => [...prev, input.value.trim()]);
                      input.value = '';
                      toast.success('Image link added!');
                    }
                  }}
                  className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold text-xs rounded-xl cursor-pointer"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions footer */}
          <div className="flex gap-3 justify-end border-t border-border pt-6 mt-4">
            <button
              type="button"
              onClick={() => setIsEditViewOpen(false)}
              className="px-4 py-2 border border-border bg-card text-foreground hover:bg-muted font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-primary-foreground hover:opacity-90 font-extrabold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-primary/25"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Room Category
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-xl font-black text-foreground">Room Types</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Manage room categories, capacity limits, and base prices.</p>
        </div>
        <button
          onClick={() => handleOpenEditView()}
          className="py-2.5 px-4 bg-primary hover:opacity-90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Room Type</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roomTypes.map((rt) => (
          <div key={rt.id} className="bg-card border border-border rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            {rt.images && rt.images.length > 0 ? (
              <img
                src={rt.images[0]}
                alt={rt.name}
                className="w-full h-44 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                }}
              />
            ) : (
              <div className="w-full h-44 bg-muted/20 border-b border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-25" />
              </div>
            )}

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-foreground leading-tight text-left">{rt.name}</h3>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditView(rt)}
                      className="p-1.5 hover:bg-muted text-foreground rounded-lg border border-border cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rt.id)}
                      className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg border border-border cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-muted-foreground text-[11px] leading-normal line-clamp-2 text-left">
                  {rt.description || 'No description listed.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>Max Guests: {rt.maxPhysicalAdults || rt.maxAdults || rt.capacity || 2} Adults</span>
                </div>
                <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Base Rate</span>
                    {property?.isGstApplicable && rt.isGstInclusive && (
                      <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter mt-0.5">GST Inclusive</span>
                    )}
                  </div>
                  <span className="text-sm font-black text-primary">₹{Number(rt.basePrice).toLocaleString()} / night</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {roomTypes.length === 0 && (
          <div className="col-span-full text-center py-16 bg-card border-2 border-dashed border-border rounded-3xl">
            <ImageIcon className="h-10 w-10 text-muted-foreground/35 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-bold">No room categories registered. Create one to begin listing!</p>
          </div>
        )}
      </div>

      {/* Custom Confirm Modal for Room Category Deletion */}
      <ConfirmModal
        isOpen={!!deletingTypeId}
        onClose={() => setDeletingTypeId(null)}
        onConfirm={confirmDeleteType}
        isLoading={isDeletingType}
        title="Delete Room Category?"
        description="Are you sure you want to delete this room category? All associated rooms and availability will be impacted."
        confirmText="Delete Category"
      />
    </div>
  );
}
