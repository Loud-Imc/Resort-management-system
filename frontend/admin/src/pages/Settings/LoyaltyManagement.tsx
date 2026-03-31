import { useState, useEffect } from 'react';
import { settingsService, GlobalSetting } from '../../services/settings';
import { marketingService, PartnerLevel, Reward } from '../../services/marketing';
import {
    Save,
    Plus,
    Trash2,
    AlertCircle,
    // CheckCircle2,
    Loader2,
    Info,
    Calculator,
    Coins,
    Award,
    Gift,
    Edit2,
    X,
    UploadCloud,
    Image as ImageIcon,
    Percent,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadService } from '../../services/uploads';

interface GstTier {
    min: number;
    max: number | null;
    rate: number;
}

type TabType = 'GLOBAL' | 'TIERS' | 'REWARDS';

export default function LoyaltyManagement() {
    const [activeTab, setActiveTab] = useState<TabType>('GLOBAL');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Global Specific State
    const [gstTiers, setGstTiers] = useState<GstTier[]>([]);
    const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
    const [defaultCommission, setDefaultCommission] = useState<number>(10);
    const [payoutCoolingHours, setPayoutCoolingHours] = useState<number>(24);

    // Tiers State
    const [levels, setLevels] = useState<PartnerLevel[]>([]);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [currentLevel, setCurrentLevel] = useState<Partial<PartnerLevel>>({});

    // Rewards State
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
    const [currentReward, setCurrentReward] = useState<Partial<Reward>>({ isActive: true });
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [settingsData, levelsData, rewardsData] = await Promise.all([
                settingsService.getAll(),
                marketingService.getLevels(),
                marketingService.getRewards(),
            ]);

            // Map Settings
            const gstSetting = settingsData.find((s: GlobalSetting) => s.key === 'GST_TIERS');
            if (gstSetting) setGstTiers(gstSetting.value);

            const loyaltySetting = settingsData.find((s: GlobalSetting) => s.key === 'LOYALTY_POINTS_PER_INR');
            if (loyaltySetting) setLoyaltyPoints(Number(loyaltySetting.value));

            const commissionSetting = settingsData.find((s: GlobalSetting) => s.key === 'DEFAULT_COMMISSION_RATE');
            if (commissionSetting) setDefaultCommission(Number(commissionSetting.value));

            const coolingSetting = settingsData.find((s: GlobalSetting) => s.key === 'PAYOUT_COOLING_HOURS');
            if (coolingSetting) setPayoutCoolingHours(Number(coolingSetting.value));

            // Map Tiers & Rewards
            setLevels(levelsData.sort((a, b) => a.minPoints - b.minPoints));
            setRewards(rewardsData.sort((a, b) => a.pointCost - b.pointCost));
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load loyalty settings');
        } finally {
            setIsLoading(false);
        }
    };

    // ================= GLOBAL ACTIONS =================
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
            await Promise.all([
                settingsService.update('LOYALTY_POINTS_PER_INR', loyaltyPoints, 'Number of loyalty points earned per 1 INR spent'),
                settingsService.update('DEFAULT_COMMISSION_RATE', defaultCommission, 'Global default commission rate for Channel Partners'),
                settingsService.update('PAYOUT_COOLING_HOURS', payoutCoolingHours, 'Cooling period (hours) before settlement approval'),
            ]);
            toast.success('Settings updated successfully');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const addGstTier = () => setGstTiers([...gstTiers, { min: 0, max: null, rate: 0 }]);
    const removeGstTier = (index: number) => setGstTiers(gstTiers.filter((_, i) => i !== index));
    const updateGstTier = (index: number, field: keyof GstTier, value: any) => {
        const newTiers = [...gstTiers];
        newTiers[index] = { ...newTiers[index], [field]: value === '' ? null : Number(value) };
        setGstTiers(newTiers);
    };

    // ================= TIERS ACTIONS =================
    const handleSaveLevel = async () => {
        try {
            setIsSaving(true);
            if (currentLevel.id) {
                await marketingService.updateLevel(currentLevel.id, currentLevel);
                toast.success('Tier updated successfully');
            } else {
                await marketingService.createLevel(currentLevel);
                toast.success('Tier created successfully');
            }
            setIsLevelModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to save tier');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLevel = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tier?')) return;
        try {
            await marketingService.deleteLevel(id);
            toast.success('Tier deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete tier');
        }
    };

    // ================= REWARDS ACTIONS =================
    const handleSaveReward = async () => {
        try {
            setIsSaving(true);
            if (currentReward.id) {
                await marketingService.updateReward(currentReward.id, currentReward);
                toast.success('Reward updated successfully');
            } else {
                await marketingService.createReward(currentReward);
                toast.success('Reward created successfully');
            }
            setIsRewardModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to save reward');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reward?')) return;
        try {
            await marketingService.deleteReward(id);
            toast.success('Reward deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete reward');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const data = await uploadService.upload(file);
            setCurrentReward({ ...currentReward, imageUrl: data.url });
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
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
                    Loyalty & Tiers Management
                </h1>
                <p className="mt-2 text-gray-600">
                    Centralize tax policies, Channel Partner (CP) reseller tiers, and the rewards catalog.
                </p>
            </div>

            {/* Navigation Pills */}
            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit drop-shadow-sm border border-gray-200">
                <button
                    onClick={() => setActiveTab('GLOBAL')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'GLOBAL' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Coins className="h-4 w-4" /> Global Points & Tax
                </button>
                <button
                    onClick={() => setActiveTab('TIERS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'TIERS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Award className="h-4 w-4" /> Partner Tiers
                </button>
                <button
                    onClick={() => setActiveTab('REWARDS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'REWARDS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Gift className="h-4 w-4" /> Rewards Catalog
                </button>
            </div>

            {/* TAB CONTENT: GLOBAL SETTINGS */}
            {activeTab === 'GLOBAL' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
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
                            <button onClick={addGstTier} className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="Add Tier">
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 space-y-4">
                            {gstTiers.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>No GST tiers defined. Fallback is 12%.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {gstTiers.map((tier, index) => (
                                        <div key={index} className="group relative border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-all hover:shadow-md">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Min Price (₹)</label>
                                                    <input type="number" value={tier.min} onChange={(e) => updateGstTier(index, 'min', e.target.value)} className="w-full text-sm font-medium focus:ring-0 border-none p-0" placeholder="0" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Max Price (₹)</label>
                                                    <input type="number" value={tier.max === null ? '' : tier.max} onChange={(e) => updateGstTier(index, 'max', e.target.value)} className="w-full text-sm font-medium focus:ring-0 border-none p-0" placeholder="No limit" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tax Rate (%)</label>
                                                    <input type="number" value={tier.rate} onChange={(e) => updateGstTier(index, 'rate', e.target.value)} className="w-full text-sm font-bold text-primary-600 focus:ring-0 border-none p-0" placeholder="0" />
                                                </div>
                                            </div>
                                            <button onClick={() => removeGstTier(index)} className="absolute -right-2 -top-2 p-1.5 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                                                <Trash2 className="h-3.3 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="h-3.5 w-3.5" /> Affects new bookings instantly.</div>
                                <button onClick={handleSaveGstTiers} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-50">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Tiers
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loyalty Settings */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
                                <div className="p-2 bg-emerald-100 rounded-lg"><Coins className="h-5 w-5 text-emerald-600" /></div>
                                <div><h2 className="text-lg font-bold text-gray-900">Financial & Points Engine</h2><p className="text-xs text-gray-500">Global commission and conversion rates</p></div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Points per ₹1 Commissionable Amt</label>
                                        <div className="relative">
                                            <input type="number" value={loyaltyPoints} onChange={(e) => setLoyaltyPoints(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-bold" placeholder="1" />
                                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Default CP Commission (%)</label>
                                        <div className="relative">
                                            <input type="number" value={defaultCommission} onChange={(e) => setDefaultCommission(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-lg font-bold" placeholder="10" />
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        Payout Cooling Period (Hours)
                                    </label>
                                    <div className="relative">
                                        <input type="number" value={payoutCoolingHours} onChange={(e) => setPayoutCoolingHours(Number(e.target.value))} className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 text-lg font-bold" placeholder="24" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">Hours</span>
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-400 font-medium italic">* Settlements can only be approved after this many hours have passed since checkout.</p>
                                </div>

                                <button onClick={handleSaveLoyalty} disabled={isSaving} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Financial Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TIERS */}
            {activeTab === 'TIERS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg"><Award className="h-5 w-5 text-purple-600" /></div>
                            <div><h2 className="text-lg font-bold text-gray-900">Partner Status Levels</h2><p className="text-xs text-gray-500">Define required points and commission multipliers</p></div>
                        </div>
                        <button onClick={() => { setCurrentLevel({}); setIsLevelModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium">
                            <Plus className="h-4 w-4" /> Add Tier
                        </button>
                    </div>
                    <div className="p-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Active Points</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission Rate (%)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {levels.map((level) => (
                                    <tr key={level.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-gray-900">{level.name}</div><div className="text-xs text-gray-500">{level.description}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">{level.minPoints.toLocaleString()} pts</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{level.commissionRate}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setCurrentLevel(level); setIsLevelModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteLevel(level.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {levels.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No partner tiers found. Default fallback logic will be used.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REWARDS */}
            {activeTab === 'REWARDS' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Rewards Catalog</h2>
                            <p className="text-sm text-gray-500">Items partners can redeem with their loyalty points.</p>
                        </div>
                        <button onClick={() => { setCurrentReward({ isActive: true }); setIsRewardModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium">
                            <Plus className="h-4 w-4" /> Add Reward
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.map((reward) => (
                            <div key={reward.id} className={`bg-white rounded-2xl border ${!reward.isActive ? 'border-dashed border-gray-300 opacity-70' : 'border-gray-200 shadow-sm'} overflow-hidden relative group transition-all hover:shadow-md`}>
                                {!reward.isActive && (
                                    <div className="absolute top-2 right-2 z-10 bg-gray-800 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Inactive</div>
                                )}
                                <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {reward.imageUrl ? (
                                        <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <ImageIcon className="h-12 w-12 text-gray-300" />
                                    )}
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-900 text-lg">{reward.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{reward.description || 'No description provided.'}</p>
                                    <div className="mt-4 flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Cost</span>
                                            <span className="text-lg font-black text-amber-500 flex items-center gap-1"><Coins className="h-4 w-4" /> {reward.pointCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setCurrentReward(reward); setIsRewardModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteReward(reward.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && (
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-gray-900 font-medium">Empty Catalog</h3>
                                <p className="text-sm text-gray-500">Create your first reward to populate the CP marketplace.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Level Modal */}
            {isLevelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{currentLevel.id ? 'Edit Tier' : 'Create New Tier'}</h3>
                            <button onClick={() => setIsLevelModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Level Name <span className="text-red-500">*</span></label>
                                <input type="text" value={currentLevel.name || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. Gold Tier" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Req. Points <span className="text-red-500">*</span></label>
                                    <input type="number" value={currentLevel.minPoints === undefined ? '' : currentLevel.minPoints} onChange={(e) => setCurrentLevel({ ...currentLevel, minPoints: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. 50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission % <span className="text-red-500">*</span></label>
                                    <input type="number" step="0.1" value={currentLevel.commissionRate === undefined ? '' : currentLevel.commissionRate} onChange={(e) => setCurrentLevel({ ...currentLevel, commissionRate: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. 10.5" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={currentLevel.description || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 min-h-[80px]" placeholder="Brief context about this tier..." />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setIsLevelModalOpen(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={handleSaveLevel} disabled={isSaving || !currentLevel.name || currentLevel.minPoints === undefined || currentLevel.commissionRate === undefined} className="px-5 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save Tier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reward Modal */}
            {isRewardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{currentReward.id ? 'Edit Reward' : 'Add to Catalog'}</h3>
                            <button onClick={() => setIsRewardModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={currentReward.name || ''} onChange={(e) => setCurrentReward({ ...currentReward, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500" placeholder="e.g. MacBook Pro M3" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Point Cost <span className="text-red-500">*</span></label>
                                    <input type="number" value={currentReward.pointCost === undefined ? '' : currentReward.pointCost} onChange={(e) => setCurrentReward({ ...currentReward, pointCost: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-amber-600" placeholder="e.g. 500000" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                            />
                                            <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2">
                                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary-600" /> : <UploadCloud className="h-5 w-5 text-gray-500" />}
                                                <span className="text-sm font-medium text-gray-600">
                                                    {isUploading ? 'Uploading...' : 'Click or drop image here'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {currentReward.imageUrl && (
                                        <div className="h-14 w-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 relative group">
                                            <img src={currentReward.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                                            <button
                                                onClick={(e) => { e.preventDefault(); setCurrentReward({ ...currentReward, imageUrl: '' }); }}
                                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={currentReward.description || ''} onChange={(e) => setCurrentReward({ ...currentReward, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 min-h-[80px]" placeholder="Specific details or terms and conditions for claiming this reward..." />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <input type="checkbox" id="isActive" checked={Boolean(currentReward.isActive)} onChange={(e) => setCurrentReward({ ...currentReward, isActive: e.target.checked })} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">Catalog Visibility (Active)</label>
                                <span className="text-xs text-gray-500 ml-auto">If unchecked, it hides from CP view.</span>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setIsRewardModalOpen(false)} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={handleSaveReward} disabled={isSaving || !currentReward.name || currentReward.pointCost === undefined} className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save Reward
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
