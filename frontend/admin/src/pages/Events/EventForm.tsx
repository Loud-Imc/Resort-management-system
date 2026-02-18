import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Calendar, MapPin, Image as ImageIcon } from 'lucide-react';
import { eventsService } from '../../services/events';
import { CreateEventDto } from '../../types/event';
import { useProperty } from '../../context/PropertyContext';
import ImageUpload from '../../components/ImageUpload';

export default function EventForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { selectedProperty } = useProperty();

    const [formData, setFormData] = useState<CreateEventDto>({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        price: '',
        images: [],
        organizerType: 'PROPERTY',
        propertyId: selectedProperty?.id || '',
    });

    useEffect(() => {
        loadProperties();
        if (isEdit && id) {
            loadEvent(id);
        }
    }, [id, isEdit]);

    const loadProperties = async () => {
        // No longer needed to load all properties for selection
    };

    const loadEvent = async (eventId: string) => {
        try {
            setLoading(true);
            const event = await eventsService.getById(eventId);
            setFormData({
                title: event.title,
                description: event.description || '',
                date: new Date(event.date).toISOString().split('T')[0],
                location: event.location,
                price: event.price || '',
                images: event.images || [],
                organizerType: event.organizerType,
                propertyId: event.propertyId || '',
            });
        } catch (err) {
            setError('Failed to load event details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);

            // Validation
            if (formData.organizerType === 'PROPERTY' && !formData.propertyId) {
                throw new Error('Please select a property for this event');
            }

            const submissionData = {
                ...formData,
                date: new Date(formData.date).toISOString(),
            };

            if (isEdit && id) {
                await eventsService.update(id, submissionData);
            } else {
                await eventsService.create(submissionData);
            }

            navigate('/events');
        } catch (err: any) {
            setError(err.message || err.response?.data?.message || 'Failed to save event');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-all font-bold group"
            >
                <div className="p-1.5 rounded-lg group-hover:bg-muted transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Back to Events
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        {isEdit ? 'Edit Event' : 'Create New Event'}
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        {isEdit ? 'Update event details and requirements' : 'Add a new experience for guests and the community'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm font-bold">
                    <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                {/* Basic Information */}
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                    placeholder="e.g. Weekend Wellness Retreat"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Organizer Type</label>
                                <select
                                    value={formData.organizerType}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        organizerType: e.target.value as 'PROPERTY' | 'EXTERNAL',
                                        propertyId: e.target.value === 'EXTERNAL' ? '' : prev.propertyId
                                    }))}
                                    className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold"
                                >
                                    <option value="PROPERTY">Property Specific</option>
                                    <option value="EXTERNAL">External (Club/Group)</option>
                                </select>
                            </div>

                            {formData.organizerType === 'PROPERTY' && (
                                <div>
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Property</label>
                                    <div className="px-4 py-2.5 border border-border rounded-xl bg-muted text-foreground font-bold">
                                        {selectedProperty?.name || 'Selected Property'}
                                    </div>
                                    <input type="hidden" value={formData.propertyId} />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Event Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold [color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Price Info</label>
                                <input
                                    type="text"
                                    value={formData.price}
                                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                    placeholder="e.g. Free, ₹85, ₹500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.location}
                                        onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                        placeholder="e.g. Yoga Pavilion, Lakeview Terrace"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none font-bold placeholder:text-muted-foreground/30"
                                    placeholder="Provide detailed information about the event..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Event Media */}
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <ImageIcon className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Event Media</h2>
                    </div>
                    <div className="p-8">
                        <ImageUpload
                            images={formData.images || []}
                            onChange={(urls: string[]) => setFormData(prev => ({ ...prev, images: urls }))}
                            maxImages={5}
                        />
                        <p className="text-xs text-muted-foreground mt-4 italic font-medium">
                            * Recommended size 1200x800px. Upload professional photos to attract more attendees.
                        </p>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 border-t border-border pt-8">
                    <button
                        type="button"
                        onClick={() => navigate('/events')}
                        className="px-6 py-2.5 bg-muted text-muted-foreground font-black uppercase tracking-widest text-xs rounded-xl hover:bg-muted/80 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-10 py-2.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {isEdit ? 'Update Event' : 'Publish Event'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
