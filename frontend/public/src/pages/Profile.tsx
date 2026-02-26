import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Camera, Loader2, Calendar, MapPin, Package, ChevronRight, XCircle, AlertTriangle, Star } from 'lucide-react';
import { format, isAfter, startOfToday } from 'date-fns';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';
import { bookingService } from '../services/booking';
import { reviewService } from '../services/reviews';
import { formatPrice } from '../utils/currency';
import toast from 'react-hot-toast';

export default function Profile() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'details' | 'bookings'>((searchParams.get('tab') as any) || 'details');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Auth check
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const initialUser = userJson ? JSON.parse(userJson) : null;

    if (!token || !initialUser) {
        return <Navigate to="/login?redirect=/profile" replace />;
    }

    // Fetch fresh user data
    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const { data } = await api.get('/users/me');
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        },
    });

    // Bookings query
    const { data: bookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: bookingService.getMyBookings,
    });

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                email: user.email || ''
            });
        }
    }, [user]);

    // Profile Update Mutation
    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => api.patch('/users/me', data),
        onSuccess: (res) => {
            queryClient.setQueryData(['user-profile'], res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
            toast.success('Profile updated successfully');
            setIsUpdating(false);
        },
        onError: () => {
            toast.error('Failed to update profile');
        }
    });

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const { data } = await api.post('/uploads', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data ' }
            });
            await updateProfileMutation.mutateAsync({ avatar: data.url });
        } catch (err) {
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(formData);
    };

    // Booking Cancellation Logic
    const [cancellingBooking, setCancellingBooking] = useState<any | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    // Review Logic
    const [reviewingBooking, setReviewingBooking] = useState<any | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');

    const cancelMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingService.cancelBooking(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setCancellingBooking(null);
            setCancelReason('');
            toast.success('Booking cancelled successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to cancel booking');
        }
    });

    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            if (!reviewingBooking) return;
            return reviewService.create({
                propertyId: reviewingBooking.propertyId,
                roomTypeId: reviewingBooking.roomTypeId,
                rating: reviewRating,
                comment: reviewComment
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setReviewingBooking(null);
            setReviewRating(5);
            setReviewComment('');
            toast.success('Thank you for your review!', {
                icon: '✨',
                style: { borderRadius: '1rem', background: '#333', color: '#fff' }
            });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to submit review');
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-50 text-green-700 border-green-100';
            case 'PENDING_PAYMENT': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-100';
            case 'REFUNDED': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'CHECKED_IN': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'CHECKED_OUT': return 'bg-gray-50 text-gray-600 border-gray-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const canCancel = (booking: any) => {
        const checkIn = new Date(booking.checkInDate);
        return ['CONFIRMED', 'PENDING_PAYMENT'].includes(booking.status) && isAfter(checkIn, startOfToday());
    };

    const canReview = (booking: any) => {
        return booking.status === 'CHECKED_OUT' && !booking.review;
    };

    if (userLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa] pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] pt-32 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    {/* Sidebar / Profile Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 text-center sticky top-36">
                            <div className="relative inline-block mb-6 group">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-primary-50 border-[6px] border-white shadow-2xl mx-auto ring-1 ring-gray-100">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-primary-600 bg-primary-50 text-4xl font-bold">
                                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 z-10">
                                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary-600" /> : <Camera className="h-5 w-5 text-primary-600" />}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                                </label>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 font-serif leading-tight px-2">
                                {toTitleCase(`${user?.firstName || ''} ${user?.lastName || ''}`)}
                            </h2>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 mb-10">Guest since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'N/A'}</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 text-sm ${activeTab === 'details' ? 'bg-primary-900 text-white shadow-xl shadow-primary-200' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <div className={clsx("p-2 rounded-xl", activeTab === 'details' ? "bg-white/10" : "bg-gray-50")}>
                                        <User className="h-4 w-4" />
                                    </div>
                                    Personal Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('bookings')}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 text-sm ${activeTab === 'bookings' ? 'bg-primary-900 text-white shadow-xl shadow-primary-200' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <div className={clsx("p-2 rounded-xl", activeTab === 'bookings' ? "bg-white/10" : "bg-gray-50")}>
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    My Bookings
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden min-h-[640px]">
                            {activeTab === 'details' ? (
                                <div className="p-10 md:p-14">
                                    <div className="flex justify-between items-end mb-12">
                                        <div>
                                            <h3 className="text-3xl font-bold text-gray-900 font-serif mb-2">Account Settings</h3>
                                            <p className="text-gray-400 text-sm font-medium">Manage your personal information and preferences.</p>
                                        </div>
                                        {!isUpdating && (
                                            <button 
                                                onClick={() => setIsUpdating(true)}
                                                className="px-6 py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-100 transition-colors border border-primary-100"
                                            >
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={handleProfileSubmit} className="space-y-8 max-w-2xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.firstName}
                                                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                                    disabled={!isUpdating}
                                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-primary-50 focus:border-primary-200 outline-none transition-all disabled:bg-gray-50/50 disabled:text-gray-400 font-medium text-gray-700"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.lastName}
                                                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                                    disabled={!isUpdating}
                                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-primary-50 focus:border-primary-200 outline-none transition-all disabled:bg-gray-50/50 disabled:text-gray-400 font-medium text-gray-700"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                            <div className="relative group">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white shadow-sm border border-gray-50 text-gray-400 group-focus-within:text-primary-600 transition-colors">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                    disabled={!isUpdating}
                                                    className="w-full pl-16 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-primary-50 focus:border-primary-200 outline-none transition-all disabled:bg-gray-50/50 disabled:text-gray-400 font-medium text-gray-700"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <div className="relative">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white border border-gray-50 text-gray-300">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    disabled={true}
                                                    className="w-full pl-16 pr-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-gray-400 font-medium cursor-not-allowed"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium mt-1 ml-1 flex items-center gap-1.5">
                                                <AlertTriangle className="h-3 w-3" />
                                                Phone number cannot be changed directly for security reasons.
                                            </p>
                                        </div>

                                        {isUpdating && (
                                            <div className="flex gap-4 pt-10">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsUpdating(false);
                                                        setFormData({
                                                            firstName: user.firstName || '',
                                                            lastName: user.lastName || '',
                                                            phone: user.phone || '',
                                                            email: user.email || ''
                                                        });
                                                    }}
                                                    className="flex-1 px-8 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all text-sm uppercase tracking-widest"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={updateProfileMutation.isPending}
                                                    className="flex-1 px-8 py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 shadow-2xl shadow-primary-200 disabled:opacity-50 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                                                >
                                                    {updateProfileMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            ) : (
                                <div className="p-10 md:p-14">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
                                        <div>
                                            <h3 className="text-3xl font-bold text-gray-900 font-serif mb-2">My Bookings</h3>
                                            <p className="text-gray-400 text-sm font-medium">View and manage your past and upcoming reservations.</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <Package className="h-4 w-4 text-primary-500" />
                                            <span className="text-sm font-bold text-gray-700">{bookings?.length || 0} Total Stays</span>
                                        </div>
                                    </div>
                                    
                                    {bookingsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                                            <p className="text-gray-400 text-sm font-medium animate-pulse">Relieving your memories...</p>
                                        </div>
                                    ) : bookings?.length === 0 ? (
                                        <div className="text-center py-32 px-4 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                                            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-8 text-gray-200">
                                                <Calendar className="h-12 w-12" />
                                            </div>
                                            <h4 className="text-2xl font-bold text-gray-900 font-serif mb-3">No bookings yet</h4>
                                            <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">Your journey with us hasn't started yet. Let's find your perfect escape.</p>
                                            <Link to="/properties" className="inline-flex items-center px-10 py-4 bg-primary-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-primary-100 uppercase tracking-widest text-xs">
                                                Discover Resorts
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {bookings?.map((booking) => (
                                                <div key={booking.id} className="group bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:border-primary-100 hover:shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition-all duration-500">
                                                    <div className="p-8 md:p-10">
                                                        <div className="flex flex-col lg:flex-row gap-8">
                                                            <div className="w-full lg:w-48 h-36 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                                                                {booking.roomType?.images?.[0] ? (
                                                                    <img src={booking.roomType.images[0]} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                        <MapPin className="h-8 w-8" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-grow">
                                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                                                    <div>
                                                                        <h4 className="font-bold text-gray-900 text-xl font-serif mb-1 group-hover:text-primary-800 transition-colors">
                                                                            {toTitleCase(booking.property?.name)}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-400 font-medium">{booking.roomType?.name}</p>
                                                                    </div>
                                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border ${getStatusColor(booking.status)} shadow-sm`}>
                                                                        {booking.status.replace('_', ' ')}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-6 border-y border-gray-50">
                                                                    <div className="space-y-1">
                                                                        <span className="block text-[9px] font-black text-gray-300 uppercase tracking-widest">Stay Period</span>
                                                                        <p className="font-bold text-gray-700 text-sm">{format(new Date(booking.checkInDate), 'MMM dd')} — {format(new Date(booking.checkOutDate), 'MMM dd')}</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="block text-[9px] font-black text-gray-300 uppercase tracking-widest">Party Size</span>
                                                                        <p className="font-bold text-gray-700 text-sm">{booking.adultsCount + booking.childrenCount} Guests</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="block text-[9px] font-black text-gray-300 uppercase tracking-widest">Total Value</span>
                                                                        <p className="font-bold text-primary-900 text-base">{formatPrice(booking.totalAmount, booking.bookingCurrency || 'INR')}</p>
                                                                    </div>
                                                                    <div className="flex justify-end items-center gap-4">
                                                                        {canCancel(booking) && (
                                                                            <button onClick={() => setCancellingBooking(booking)} className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest transition-colors">Cancel</button>
                                                                        )}
                                                                        {canReview(booking) && (
                                                                            <button 
                                                                                onClick={() => setReviewingBooking(booking)} 
                                                                                className="px-4 py-2 bg-amber-400 text-amber-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-100 hover:scale-105 active:scale-95"
                                                                            >
                                                                                Leave Review
                                                                            </button>
                                                                        )}
                                                                        {booking.review && (
                                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl border border-green-100">
                                                                                <Star className="h-3 w-3 fill-current" />
                                                                                <span className="text-[9px] font-black uppercase tracking-widest">Reviewed</span>
                                                                            </div>
                                                                        )}
                                                                        <Link to={`/confirmation?bookingId=${booking.id}`} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-primary-900 hover:text-white transition-all group/btn border border-gray-100 hover:border-primary-900 hover:shadow-xl hover:shadow-primary-100">
                                                                            <ChevronRight className="h-5 w-5" />
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mt-4 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-200" />
                                                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Booking ID: #{booking.bookingNumber}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Modal (reused from MyBookings) */}
            {cancellingBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 font-serif">Cancel Booking</h3>
                        </div>
                        <p className="text-gray-600 mb-8">Are you sure you want to cancel booking #{cancellingBooking.bookingNumber}?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setCancellingBooking(null)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Back</button>
                            <button onClick={() => cancelMutation.mutate({id: cancellingBooking.id, reason: cancelReason})} className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">Cancel Stay</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Review Modal */}
            {reviewingBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewingBooking(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 md:p-12">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 font-serif mb-2">Leave a Review</h3>
                                    <p className="text-gray-400 text-sm font-medium">How was your stay at {toTitleCase(reviewingBooking.property?.name)}?</p>
                                </div>
                                <button onClick={() => setReviewingBooking(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                                    <XCircle className="h-6 w-6 text-gray-300" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                {/* Stars */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star}
                                                onMouseEnter={() => setReviewRating(star)}
                                                onClick={() => setReviewRating(star)}
                                                className="group outline-none"
                                            >
                                                <Star 
                                                    className={clsx(
                                                        "h-10 w-10 transition-all duration-300 transform group-hover:scale-110 active:scale-95",
                                                        star <= reviewRating ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" : "text-gray-200"
                                                    )}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">
                                        {reviewRating === 5 ? 'Exceptional' : reviewRating === 4 ? 'Very Good' : reviewRating === 3 ? 'Average' : reviewRating === 2 ? 'Poor' : 'Disappointing'}
                                    </span>
                                </div>

                                {/* Comment */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 block px-1">Your Experience</label>
                                    <textarea 
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Tell us about the service, food, and room..."
                                        className="w-full p-6 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-primary-50/10 focus:border-primary-500 outline-none transition-all min-h-[150px] resize-none shadow-inner"
                                    />
                                </div>

                                <button 
                                    onClick={() => submitReviewMutation.mutate()}
                                    disabled={submitReviewMutation.isPending}
                                    className="w-full py-5 bg-primary-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-primary-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {submitReviewMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <>
                                            Submit Review
                                            <Package className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
