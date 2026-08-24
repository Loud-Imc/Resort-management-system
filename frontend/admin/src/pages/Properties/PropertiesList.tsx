import { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Star, CheckCircle, XCircle, Loader2, LayoutDashboard, Edit, ShieldCheck, Zap, User, Key, X, ChevronLeft, ChevronRight } from 'lucide-react';
import propertyService from '../../services/properties';
import { Property, PropertyType, PropertyQueryParams } from '../../types/property';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 20;

const propertyTypeLabels: Record<PropertyType, string> = {
    RESORT: 'Resort',
    HOMESTAY: 'Homestay',
    HOTEL: 'Hotel',
    VILLA: 'Villa',
    OTHER: 'Other',
};

const propertyTypeColors: Record<PropertyType, string> = {
    RESORT: 'bg-emerald-100 text-emerald-800',
    HOMESTAY: 'bg-blue-100 text-blue-800',
    HOTEL: 'bg-purple-100 text-purple-800',
    VILLA: 'bg-amber-100 text-amber-800',
    OTHER: 'bg-gray-100 text-gray-800',
};

// Maps a flag filter key to the API query params it represents
type FlagFilter =
    | ''
    | 'APPROVED'
    | 'PENDING'
    | 'REJECTED'
    | 'DISABLED'
    | 'FEATURED'
    | 'VERIFIED'
    | 'UNIQUE';

const FLAG_OPTIONS: { value: FlagFilter; label: string }[] = [
    { value: '',         label: 'All Statuses' },
    { value: 'APPROVED', label: 'âœ… Approved' },
    { value: 'PENDING',  label: 'ðŸ• Pending' },
    { value: 'REJECTED', label: 'âŒ Rejected' },
    { value: 'DISABLED', label: 'ðŸš« Disabled' },
    { value: 'FEATURED', label: 'â­ Featured' },
    { value: 'VERIFIED', label: 'ðŸ›¡ Verified' },
    { value: 'UNIQUE',   label: 'âš¡ Unique (Sponsored)' },
];

/** Convert a FlagFilter into the right set of API query params */
function flagToParams(flag: FlagFilter): Partial<PropertyQueryParams> {
    switch (flag) {
        case 'APPROVED':  return { status: 'APPROVED', isActive: true };
        case 'PENDING':   return { status: 'PENDING' };
        case 'REJECTED':  return { status: 'REJECTED' };
        case 'DISABLED':  return { status: 'APPROVED', isActive: false };
        case 'FEATURED':  return { isFeatured: true };
        case 'VERIFIED':  return { isVerified: true };
        case 'UNIQUE':    return { isSponsored: true };
        default:          return {}; // no filter = all
    }
}

export default function PropertiesList() {

    const { user } = useAuth();
    const navigate = useNavigate();
    const [properties, setProperties] = useState<Property[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [search, setSearch] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<PropertyType | ''>('');
    const [flagFilter, setFlagFilter] = useState<FlagFilter>('');

    // Pagination
    const [page, setPage] = useState(1);

    // Password reset modal
    const [resetPwProperty, setResetPwProperty] = useState<Property | null>(null);
    const [confirmEmailInput, setConfirmEmailInput] = useState('');
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);

    const isManageable = user?.role === 'SuperAdmin' ||
        user?.role === 'Admin' ||
        user?.role === 'PropertyOwner' ||
        user?.role === 'Property Owner' ||
        user?.role === 'Marketing';

    const loadProperties = useCallback(async (targetPage: number) => {
        try {
            setLoading(true);
            setError(null);

            const params: PropertyQueryParams = {
                search: search.trim() || undefined,
                city: cityFilter.trim() || undefined,
                state: stateFilter.trim() || undefined,
                type: typeFilter || undefined,
                page: targetPage,
                limit: ITEMS_PER_PAGE,
                ...flagToParams(flagFilter),
            };

            const response = isManageable
                ? await propertyService.getAllAdmin(params)
                : await propertyService.getAll(params);

            setProperties(response.data);
            setTotalCount(response.meta?.total ?? response.data.length);
            setTotalPages(response.meta?.totalPages ?? 1);
        } catch (err: any) {
            setError(err.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, cityFilter, stateFilter, typeFilter, flagFilter, isManageable]);

    // When dropdown-only filters change, reset to page 1 and re-fetch
    useEffect(() => {
        setPage(1);
        loadProperties(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeFilter, flagFilter]);

    // When page changes (from pagination buttons), fetch that page
    useEffect(() => {
        loadProperties(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    /** Search button / Enter â€” resets to page 1 */
    const handleSearch = () => {
        if (page === 1) {
            loadProperties(1);
        } else {
            setPage(1); // triggers the page useEffect
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await propertyService.toggleActive(id, !isActive);
            setProperties(properties.map(p =>
                p.id === id ? { ...p, isActive: !isActive } : p
            ));
            toast.success(`Property ${!isActive ? 'enabled' : 'disabled'} successfully`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update property status');
        }
    };

    const handleTogglePms = async (id: string, isPmsActive: boolean) => {
        try {
            await propertyService.togglePms(id, !isPmsActive);
            setProperties(properties.map(p =>
                p.id === id ? { ...p, isPmsActive: !isPmsActive } : p
            ));
            toast.success(`PMS ${!isPmsActive ? 'enabled' : 'disabled'} successfully`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update property PMS status');
        }
    };

    const handleResetOwnerPassword = (property: Property) => {
        setResetPwProperty(property);
        setConfirmEmailInput('');
        setNewPasswordInput('');
    };

    const handleSubmitResetPassword = async () => {
        if (!resetPwProperty) return;
        const ownerEmail = resetPwProperty.owner?.email || resetPwProperty.email;

        if (confirmEmailInput.trim().toLowerCase() !== ownerEmail.toLowerCase()) {
            toast.error('The email address typed does not match. Action cancelled.');
            return;
        }

        const trimmedPassword = newPasswordInput.trim();
        if (trimmedPassword.length < 6) {
            toast.error('Password must be at least 6 characters long.');
            return;
        }

        try {
            setIsSubmittingReset(true);
            await propertyService.resetOwnerPassword(resetPwProperty.id, confirmEmailInput.trim(), trimmedPassword);
            toast.success(`Password successfully updated to your chosen password!`);
            setResetPwProperty(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setIsSubmittingReset(false);
        }
    };

    const handleOpenDashboard = (propertyId: string) => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            toast.error('Authentication session not found');
            return;
        }

        const rawPropertyUrl = import.meta.env.VITE_PROPERTY_URL || 'http://localhost:5175';
        const propertyUrl = rawPropertyUrl.replace(/\/login\/?$/, '');
        const encodedUser = btoa(userData);

        const params = new URLSearchParams({
            action: 'impersonate',
            token: token,
            user: encodedUser,
            propertyId: propertyId
        });

        window.open(`${propertyUrl}?${params.toString()}`, '_blank');
    };

    // Derived pagination range label
    const rangeStart = totalCount === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
    const rangeEnd = Math.min(page * ITEMS_PER_PAGE, totalCount);

    // Smart page number list with ellipsis
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
        }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">All Properties</h1>
                    <p className="text-muted-foreground">Platform-wide overview of all properties</p>
                </div>
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg font-medium">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : `${totalCount} result${totalCount !== 1 ? 's' : ''}`}
                </span>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
                <div className="flex flex-col gap-3">
                    {/* Row 1: Fuzzy search + Type + Status */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Search by name, address, email, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}
                            className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        >
                            <option value="">All Types</option>
                            {Object.entries(propertyTypeLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>

                        <select
                            value={flagFilter}
                            onChange={(e) => setFlagFilter(e.target.value as FlagFilter)}
                            className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        >
                            {FLAG_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Row 2: City + State + Search button */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Filter by city..."
                                value={cityFilter}
                                onChange={(e) => setCityFilter(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Filter by state..."
                                value={stateFilter}
                                onChange={(e) => setStateFilter(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shrink-0"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">{error}</div>
            )}

            {/* Loading skeleton */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
                            <div className="h-40 bg-muted" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                                <div className="h-8 bg-muted rounded w-full mt-6" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : properties.length === 0 ? (
                <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-card-foreground">No properties found</h3>
                    <p className="text-muted-foreground mt-1">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <div
                                key={property.id}
                                className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all group"
                            >
                                {/* Cover Image */}
                                <div className="h-40 bg-muted relative">
                                    {property.coverImage ? (
                                        <img
                                            src={property.coverImage}
                                            alt={property.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Building2 className="h-12 w-12 text-muted-foreground opacity-50" />
                                        </div>
                                    )}

                                    {/* Type/Category Badge */}
                                    <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded shadow-sm ${propertyTypeColors[property.type]} opacity-90`}>
                                        {property.category?.name || propertyTypeLabels[property.type]}
                                    </span>

                                    {/* Status Badges */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        {property.isFeatured && (
                                            <span className="bg-amber-500 text-white px-2 py-1 text-xs rounded font-bold flex items-center gap-1 shadow-sm">
                                                <Star className="h-3 w-3 fill-current" />
                                                Featured
                                            </span>
                                        )}
                                        {property.isSponsored && (
                                            <span className="bg-indigo-600 text-white px-2 py-1 text-xs rounded font-bold flex items-center gap-1 shadow-sm">
                                                <Zap className="h-3 w-3 fill-current" />
                                                Unique
                                            </span>
                                        )}
                                        {property.isVerified && (
                                            <span className="bg-green-500 text-white px-2 py-1 text-xs rounded flex items-center gap-1 shadow-sm">
                                                <ShieldCheck className="h-3 w-3" />
                                                Verified
                                            </span>
                                        )}
                                        <span className={clsx(
                                            "px-2 py-1 text-xs rounded font-bold shadow-sm",
                                            property.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                            property.status === 'PENDING'  ? 'bg-amber-500 text-white' :
                                            property.status === 'REJECTED' ? 'bg-red-500 text-white' :
                                                                             'bg-gray-500 text-white'
                                        )}>
                                            {property.status}
                                        </span>
                                        {property.status === 'APPROVED' && (
                                            <span className={clsx(
                                                "px-2 py-1 text-xs rounded font-bold shadow-sm",
                                                property.isPmsActive ? 'bg-indigo-600 text-white' : 'bg-slate-650 text-white'
                                            )}>
                                                {property.isPmsActive ? 'PMS Active' : 'OTA Only'}
                                            </span>
                                        )}
                                        {!property.isActive && property.status === 'APPROVED' && (
                                            <span className="bg-red-600 text-white px-2 py-1 text-xs rounded font-bold">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-card-foreground truncate text-lg">{property.name}</h3>
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                                        <MapPin className="h-4 w-4 shrink-0" />
                                        <span className="truncate font-medium">{property.city}, {property.state}</span>
                                    </div>
                                    
                                    {(property.addedBy || property.propertyRequest?.referredBy || property.propertyRequest?.requestedBy) && (() => {
                                        const onboarder = property.addedBy || property.propertyRequest?.referredBy || property.propertyRequest?.requestedBy;
                                        const roleLabel = property.addedBy ? 'Manual' : property.propertyRequest?.referredBy ? 'Referral' : 'Self';
                                        return (
                                            <div className="flex items-center gap-1.5 text-xs text-primary/80 mt-2 font-medium bg-primary/5 px-2 py-1 rounded-md w-fit border border-primary/10">
                                                <User className="h-3 w-3 shrink-0" />
                                                <span className="truncate">Onboarded by: {onboarder.firstName} {onboarder.lastName || ''} <span className="opacity-70">({roleLabel})</span></span>
                                            </div>
                                        );
                                    })()}

                                    {/* Stats */}
                                    <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">{property._count?.rooms || 0} rooms</span>
                                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">{property._count?.bookings || 0} bookings</span>
                                        <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                                            {property.platformCommission || 0}% Comm.
                                        </span>
                                        {property.rating && (
                                            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                {property.rating}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 mt-5 pt-4 border-t border-border">
                                        <div className="space-y-3">
                                            {/* Primary Action: Oversight Impersonation */}
                                            <button
                                                onClick={() => handleOpenDashboard(property.id)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-sm group/btn"
                                            >
                                                <LayoutDashboard className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                                                Impersonate Property Dashboard
                                            </button>

                                            {/* PMS Toggle Action */}
                                            {property.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleTogglePms(property.id, !!property.isPmsActive)}
                                                    className={clsx(
                                                        "w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all border border-border/50 cursor-pointer",
                                                        property.isPmsActive
                                                            ? "text-amber-600 hover:bg-amber-50 hover:border-amber-100"
                                                            : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100"
                                                    )}
                                                >
                                                    <ShieldCheck className="h-4 w-4" />
                                                    {property.isPmsActive ? 'Switch to OTA Only' : 'Activate PMS Mode'}
                                                </button>
                                            )}

                                            {/* Secondary Actions */}
                                            <div className="flex gap-2.5">
                                                <button
                                                    onClick={() => navigate(`/properties/${property.id}/edit`)}
                                                    title="Edit Property Details"
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all border border-border/50 cursor-pointer"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleResetOwnerPassword(property)}
                                                    title="Reset Owner Password"
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg transition-all border border-border/50 cursor-pointer"
                                                >
                                                    <Key className="h-3.5 w-3.5" />
                                                    Reset PW
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(property.id, property.isActive)}
                                                    className={clsx(
                                                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold rounded-lg transition-all border border-border/50",
                                                        property.isActive
                                                            ? "text-amber-600 hover:bg-amber-50 hover:border-amber-100"
                                                            : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100"
                                                    )}
                                                >
                                                    {property.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                                    {property.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card rounded-xl border border-border px-5 py-3 shadow-sm">
                            <p className="text-sm text-muted-foreground font-medium">
                                Showing{' '}
                                <span className="text-foreground font-bold">{rangeStart}â€“{rangeEnd}</span>
                                {' '}of{' '}
                                <span className="text-foreground font-bold">{totalCount}</span> properties
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Prev
                                </button>

                                <div className="flex items-center gap-1">
                                    {pageNumbers.map((p, i) =>
                                        p === '...' ? (
                                            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">â€¦</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p as number)}
                                                className={clsx(
                                                    "w-8 h-8 text-sm font-bold rounded-lg transition-all",
                                                    page === p
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "bg-background border border-border hover:bg-muted text-foreground"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Custom React Modal for Reset Password */}
            {resetPwProperty && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setResetPwProperty(null)}
                >
                    <div 
                        className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-md overflow-hidden animate-in scale-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="bg-rose-500/10 text-rose-500 p-2 rounded-xl">
                                    <Key className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-foreground tracking-tight text-left">Reset Owner Password</h2>
                                    <p className="text-[10px] text-muted-foreground font-semibold truncate max-w-[280px] text-left">
                                        {resetPwProperty.name}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setResetPwProperty(null)}
                                className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-5 space-y-4 text-left">
                            <div>
                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 text-left">
                                    Confirm Owner Email Address ({resetPwProperty.owner?.email || resetPwProperty.email})
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type owner's email to confirm..."
                                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-foreground"
                                    value={confirmEmailInput}
                                    onChange={(e) => setConfirmEmailInput(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 text-left">
                                    New Custom Password (Min. 6 Characters)
                                </label>
                                <input
                                    type="password"
                                    placeholder="Type new custom password..."
                                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-foreground"
                                    value={newPasswordInput}
                                    onChange={(e) => setNewPasswordInput(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
                            <button
                                onClick={() => setResetPwProperty(null)}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitResetPassword}
                                disabled={isSubmittingReset || !confirmEmailInput || !newPasswordInput}
                                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
                            >
                                {isSubmittingReset ? 'Updating...' : 'Confirm Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

