import { useState, useEffect } from 'react';
import { settingsService, GlobalSetting } from '../../services/settings';
import {
    Save,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Info,
    // ChevronRight,
    Calculator,
    Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GstTier {
    min: number;
    max: number | null;
    rate: number;
}

export default function LoyaltyManagement() {
    const [, setSettings] = useState<GlobalSetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Specific state for GST Tiers for easier editing
    const [gstTiers, setGstTiers] = useState<GstTier[]>([]);
    const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const data = await settingsService.getAll();
            setSettings(data);

            // Extract specific settings
            const gstSetting = data.find(s => s.key === 'GST_TIERS');
            if (gstSetting) setGstTiers(gstSetting.value);

            const loyaltySetting = data.find(s => s.key === 'LOYALTY_POINTS_PER_INR');
            if (loyaltySetting) setLoyaltyPoints(Number(loyaltySetting.value));

        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGstTiers = async () => {
        try {
            setIsSaving(true);
            await settingsService.update('GST_TIERS', gstTiers, 'GST tax tiers based on room tariff per night');
            toast.success('GST Tiers updated successfully');
        } catch (error) {
            toast.error('Failed to update GST Tiers');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLoyalty = async () => {
        try {
            setIsSaving(true);
            await settingsService.update('LOYALTY_POINTS_PER_INR', loyaltyPoints, 'Number of loyalty points earned per 1 INR spent');
            toast.success('Loyalty settings updated successfully');
        } catch (error) {
            toast.error('Failed to update loyalty settings');
        } finally {
            setIsSaving(false);
        }
    };

    const addGstTier = () => {
        setGstTiers([...gstTiers, { min: 0, max: null, rate: 0 }]);
    };

    const removeGstTier = (index: number) => {
        setGstTiers(gstTiers.filter((_, i) => i !== index));
    };

    const updateGstTier = (index: number, field: keyof GstTier, value: any) => {
        const newTiers = [...gstTiers];
        newTiers[index] = { ...newTiers[index], [field]: value === '' ? null : Number(value) };
        setGstTiers(newTiers);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Coins className="h-8 w-8 text-primary-600" />
                    Loyalty & Global Management
                </h1>
                <p className="mt-2 text-gray-600">
                    Centralize your application's global rules, tax policies, and loyalty programs.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* GST Tiers Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calculator className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">GST Tax Tiers</h2>
                                <p className="text-xs text-gray-500">Automated based on room tariff</p>
                            </div>
                        </div>
                        <button
                            onClick={addGstTier}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                            title="Add Tier"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 flex-1 space-y-4">
                        {gstTiers.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>No tax tiers defined. Application will fallback to default 12%.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {gstTiers.map((tier, index) => (
                                    <div key={index} className="group relative border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-all hover:shadow-md">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Min Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={tier.min}
                                                    onChange={(e) => updateGstTier(index, 'min', e.target.value)}
                                                    className="w-full text-sm font-medium focus:ring-0 border-none p-0"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Max Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={tier.max === null ? '' : tier.max}
                                                    onChange={(e) => updateGstTier(index, 'max', e.target.value)}
                                                    className="w-full text-sm font-medium focus:ring-0 border-none p-0"
                                                    placeholder="No limit"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tax Rate (%)</label>
                                                <input
                                                    type="number"
                                                    value={tier.rate}
                                                    onChange={(e) => updateGstTier(index, 'rate', e.target.value)}
                                                    className="w-full text-sm font-bold text-primary-600 focus:ring-0 border-none p-0"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeGstTier(index)}
                                            className="absolute -right-2 -top-2 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                        >
                                            <Trash2 className="h-3.3 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Changes affect all new bookings instantly.
                            </div>
                            <button
                                onClick={handleSaveGstTiers}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Tiers
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loyalty & Points Section */}
                <div className="space-y-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Coins className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Loyalty Program</h2>
                                <p className="text-xs text-gray-500">Manage point earnings</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Points Earned per ₹1 INR
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={loyaltyPoints}
                                        onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-bold"
                                        placeholder="1"
                                    />
                                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                </div>
                                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    Default: 1 point per 1 unit of currency.
                                </p>
                            </div>

                            <button
                                onClick={handleSaveLoyalty}
                                disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-primary-100 font-bold"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Update Loyalty Settings
                            </button>
                        </div>
                    </div>

                    {/* Developer Info Card */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary-400" />
                                System Health
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-700">
                                    <span className="text-gray-400">Settings Status</span>
                                    <span className="text-emerald-400 font-medium">Synchronized</span>
                                </div>
                                <div className="flex items-center justify-between text-sm py-2">
                                    <span className="text-gray-400">Database Engine</span>
                                    <span className="text-primary-400 font-medium">Prisma + PostgreSQL</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background circle */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
