import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Building2, User, Mail, Phone, Lock, ArrowRight, MapPin, ClipboardList, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
    const { registerProperty } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        // Owner fields
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        // Property fields
        propertyName: '',
        propertyDescription: '',
        propertyType: 'RESORT',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        propertyPhone: '',
        propertyEmail: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-fill property contact if empty
        if (name === 'ownerPhone' && !formData.propertyPhone) {
            setFormData(prev => ({ ...prev, propertyPhone: value }));
        }
        if (name === 'ownerEmail' && !formData.propertyEmail) {
            setFormData(prev => ({ ...prev, propertyEmail: value }));
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.ownerFirstName || !formData.ownerLastName || !formData.ownerEmail || !formData.ownerPhone || !formData.ownerPassword) {
                toast.error('Please fill all owner details');
                return;
            }
            if (formData.ownerPassword.length < 8) {
                toast.error('Password must be at least 8 characters');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await registerProperty(formData);
            toast.success('Registration successful! Property is pending approval.');
            navigate('/login', {
                state: {
                    message: 'Registration successful! Your property is being reviewed by our team. Please sign in to manage your details.'
                }
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white mb-4 shadow-lg text-2xl font-bold">
                        {step === 1 ? <User className="h-8 w-8" /> : <Building2 className="h-8 w-8" />}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Partner with Route Guide</h1>
                    <p className="text-gray-500 mt-2">
                        {step === 1 ? 'Step 1: Owner Information' : 'Step 2: Property Information'}
                    </p>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-center mt-6 gap-2">
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="ownerFirstName"
                                                type="text"
                                                required
                                                value={formData.ownerFirstName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                                placeholder="John"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                                        <input
                                            name="ownerLastName"
                                            type="text"
                                            required
                                            value={formData.ownerLastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="ownerEmail"
                                            type="email"
                                            required
                                            value={formData.ownerEmail}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="ownerPhone"
                                            type="tel"
                                            required
                                            value={formData.ownerPhone}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="ownerPassword"
                                            type="password"
                                            required
                                            value={formData.ownerPassword}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="Minimum 8 characters"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                                    >
                                        Next Stage <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="propertyName"
                                                type="text"
                                                required
                                                value={formData.propertyName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                                placeholder="e.g. Blue Lagoon Resort"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Type</label>
                                        <select
                                            name="propertyType"
                                            required
                                            value={formData.propertyType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm appearance-none"
                                        >
                                            <option value="RESORT">Resort</option>
                                            <option value="HOTEL">Hotel</option>
                                            <option value="HOMESTAY">Homestay</option>
                                            <option value="VILLA">Villa</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <ClipboardList className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <textarea
                                            name="propertyDescription"
                                            required
                                            value={formData.propertyDescription}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm min-h-[100px]"
                                            placeholder="Tell us about your property..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Complete Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="address"
                                            type="text"
                                            required
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="123, Main Road, Area"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                                        <input
                                            name="city"
                                            type="text"
                                            required
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="Wayanad"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                                        <input
                                            name="state"
                                            type="text"
                                            required
                                            value={formData.state}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="Kerala"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                                        <input
                                            name="pincode"
                                            type="text"
                                            required
                                            value={formData.pincode}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="673122"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Email</label>
                                        <input
                                            name="propertyEmail"
                                            type="email"
                                            required
                                            value={formData.propertyEmail}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
                                            placeholder="resort@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Register Property <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center border-t border-gray-50 pt-6">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    &copy; {new Date().getFullYear()} Route Guide Property Management. All rights reserved.
                </p>
            </div>
        </div>
    );
}
