import { useState, useEffect } from 'react';
import {
    Shield, CheckCircle, XCircle, Loader2, Building2, MapPin,
    Phone, Mail, Clock, ChevronDown, ChevronUp, User, FileText,
    Image, Tag, Info
} from 'lucide-react';
import propertyService from '../../services/properties';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function PropertyRequestsList() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await propertyService.getAllRequests();
            setRequests(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load property requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this property? This will create the property, owner account, and roles automatically.')) return;

        try {
            setProcessingId(id);
            await propertyService.approveRequest(id);
            toast.success('Property approved and onboarded successfully!');
            loadRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to approve property');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Please enter a reason for rejection (mandatory):');
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            toast.error('Rejection reason is mandatory');
            return;
        }

        try {
            setProcessingId(id);
            await propertyService.rejectRequest(id, reason.trim());
            toast.success('Registration request rejected');
            loadRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to reject request');
        } finally {
            setProcessingId(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Property Onboarding Requests</h1>
                    <p className="text-muted-foreground">Vetting &amp; Oversight: Review new property registration requests</p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 font-bold">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground italic">No property requests found.</p>
                    </div>
                ) : (
                    requests.map((request) => {
                        const details = request.details || {};
                        const isExpanded = expandedId === request.id;

                        return (
                            <div key={request.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                {/* Summary Row */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-foreground truncate">{request.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <MapPin className="h-3 w-3" />
                                                <span>{request.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={clsx(
                                            "px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm uppercase tracking-wider",
                                            request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                request.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-red-100 text-red-700'
                                        )}>
                                            {request.status}
                                        </span>

                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(request.createdAt), 'dd MMM, HH:mm')}
                                        </div>

                                        {request.status === 'PENDING' && (
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                                                    title="Approve &amp; Onboard"
                                                >
                                                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={processingId === request.id}
                                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50"
                                                    title="Reject Request"
                                                >
                                                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => toggleExpand(request.id)}
                                            className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                            title={isExpanded ? 'Collapse' : 'View Details'}
                                        >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Detail Panel */}
                                {isExpanded && (
                                    <div className="border-t border-border bg-muted/20 p-5 space-y-5">

                                        {/* Owner Contact */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                <User className="h-3.5 w-3.5" /> Owner Contact
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Full Name</p>
                                                    <p className="font-semibold text-sm">{details.ownerFirstName} {details.ownerLastName}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                                                    <p className="font-semibold text-sm truncate">{request.ownerEmail}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                                                    <p className="font-semibold text-sm">{request.ownerPhone}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Property Details */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5" /> Property Details
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Type</p>
                                                    <p className="font-semibold text-sm">{details.propertyType || 'N/A'}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Email</p>
                                                    <p className="font-semibold text-sm truncate">{details.propertyEmail || request.ownerEmail}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Phone</p>
                                                    <p className="font-semibold text-sm">{details.propertyPhone || request.ownerPhone}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Group Booking</p>
                                                    <p className="font-semibold text-sm">{details.allowsGroupBooking ? 'Yes' : 'No'}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Platform Commission</p>
                                                    <p className="font-semibold text-sm">{details.platformCommission || 10}%</p>
                                                </div>
                                            </div>
                                            {details.propertyDescription && (
                                                <div className="mt-3 bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Info className="h-3 w-3" /> Description</p>
                                                    <p className="text-sm text-foreground">{details.propertyDescription}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                <MapPin className="h-3.5 w-3.5" /> Address
                                            </h3>
                                            <div className="bg-card rounded-lg p-3 border border-border/50 text-sm">
                                                <p className="font-semibold">{details.address}</p>
                                                <p className="text-muted-foreground">{details.city}, {details.state}, {details.country} - {details.pincode}</p>
                                            </div>
                                        </div>

                                        {/* Amenities */}
                                        {details.amenities && details.amenities.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                    <Tag className="h-3.5 w-3.5" /> Amenities ({details.amenities.length})
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {details.amenities.map((amenity: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-lg">
                                                            {amenity}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Images */}
                                        {details.images && details.images.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                    <Image className="h-3.5 w-3.5" /> Property Images ({details.images.length})
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {details.images.slice(0, 5).map((img: string, i: number) => (
                                                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={img}
                                                                alt={`Property image ${i + 1}`}
                                                                className="h-20 w-28 object-cover rounded-lg border border-border hover:scale-105 transition-transform"
                                                            />
                                                        </a>
                                                    ))}
                                                    {details.images.length > 5 && (
                                                        <div className="h-20 w-28 bg-muted rounded-lg border border-border flex items-center justify-center text-sm text-muted-foreground font-bold">
                                                            +{details.images.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* KYC Documents */}
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5" /> KYC / Legal Documents
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">GST Number</p>
                                                    <p className="font-semibold text-sm">{details.gstNumber || <span className="text-muted-foreground italic">Not provided</span>}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                                                    <p className="font-semibold text-sm">{details.ownerAadhaarNumber ? `****${details.ownerAadhaarNumber.slice(-4)}` : <span className="text-muted-foreground italic">Not provided</span>}</p>
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Aadhaar Image</p>
                                                    {details.ownerAadhaarImage
                                                        ? <a href={details.ownerAadhaarImage} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-semibold underline">View Document</a>
                                                        : <span className="text-muted-foreground italic text-sm">Not provided</span>
                                                    }
                                                </div>
                                                <div className="bg-card rounded-lg p-3 border border-border/50">
                                                    <p className="text-xs text-muted-foreground">Licence Image</p>
                                                    {details.licenceImage
                                                        ? <a href={details.licenceImage} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-semibold underline">View Document</a>
                                                        : <span className="text-muted-foreground italic text-sm">Not provided</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rejection Reason (if rejected) */}
                                        {request.status === 'REJECTED' && request.reason && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">Rejection Reason</p>
                                                <p className="text-sm text-red-700 font-medium">{request.reason}</p>
                                                {request.rejectedBy && (
                                                    <p className="text-xs text-red-400 mt-1">By {request.rejectedBy.firstName} ({request.rejectedBy.email})</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
