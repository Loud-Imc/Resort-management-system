import { useState, useEffect } from 'react';
import { settingsService, GlobalSetting } from '../../services/settings';
import { marketingService, PartnerLevel, Reward } from '../../services/marketing';
import {
    Save,
    Plus,
    Trash2,
    AlertCircle,
    Loader2,
    Info,
    Calculator,
    Coins,
    Award,
    Gift,
    Edit2,
    X,
    Image as ImageIcon,
    Percent,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    const [defaultPlatformCommission, setDefaultPlatformCommission] = useState<number>(10);
    const [payoutCoolingHours, setPayoutCoolingHours] = useState<number>(24);
    const [partialPaymentPct, setPartialPaymentPct] = useState<number>(33.33);
    const [payoutFrequency, setPayoutFrequency] = useState<string>('Monthly');

    // Tiers State
    const [levels, setLevels] = useState<PartnerLevel[]>([]);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [currentLevel, setCurrentLevel] = useState<Partial<PartnerLevel>>({});

    // Rewards State
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
    const [currentReward, setCurrentReward] = useState<Partial<Reward>>({ isActive: true });

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

            const platformCommissionSetting = settingsData.find((s: GlobalSetting) => s.key === 'DEFAULT_PLATFORM_COMMISSION');
            if (platformCommissionSetting) setDefaultPlatformCommission(Number(platformCommissionSetting.value));

            const coolingSetting = settingsData.find((s: GlobalSetting) => s.key === 'PAYOUT_COOLING_HOURS');
            if (coolingSetting) setPayoutCoolingHours(Number(coolingSetting.value));

            const partialPaymentSetting = settingsData.find((s: GlobalSetting) => s.key === 'PARTIAL_PAYMENT_PCT');
            if (partialPaymentSetting) setPartialPaymentPct(Number(partialPaymentSetting.value));

            const freqSetting = settingsData.find((s: GlobalSetting) => s.key === 'PAYOUT_FREQUENCY');
            if (freqSetting) setPayoutFrequency(String(freqSetting.value));

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

    // ================= VALIDATIONS =================
    const validateGstTiersLogic = (tiers: GstTier[]): string | null => {
        if (tiers.length === 0) return null;
        const sorted = [...tiers].sort((a, b) => a.min - b.min);
        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            if (current.max !== null && current.min >= current.max) {
                return `Logical Error: Min (₹${current.min}) cannot be greater than or equal to Max (₹${current.max})`;
            }
            if (i < sorted.length - 1) {
                const next = sorted[i + 1];
                if (current.max === null) {
                    return `Overlap Error: A tier with "No Limit" max must be the last tier.`;
                }
                if (current.max > next.min) {
                    return `Overlap Error: Tier range ₹${current.min}-₹${current.max} overlaps with next tier starting at ₹${next.min}`;
                }
            }
        }
        return null;
    };

    const validateFinancialSettingsLogic = (): string | null => {
        if (defaultPlatformCommission < 0 || defaultPlatformCommission > 100) return 'Platform Commission must be between 0 and 100%';
        if (partialPaymentPct < 0 || partialPaymentPct > 100) return 'Partial Payment % must be between 0 and 100%';
        if (payoutCoolingHours < 0) return 'Cooling period cannot be negative';
        return null;
    };

    const validateLevelLogic = (newLevel: Partial<PartnerLevel>, allLevels: PartnerLevel[]): string | null => {
        if (!newLevel.name?.trim()) return 'Tier name is required';
        if (newLevel.minPoints === undefined || newLevel.minPoints < 0) return 'Min points must be 0 or greater';
        if (newLevel.commissionRate === undefined || newLevel.commissionRate < 0 || newLevel.commissionRate > 100) return 'Commission rate must be between 0 and 100';

        // Check for duplicates (excluding self)
        const duplicatePoints = allLevels.find(l => l.id !== newLevel.id && l.minPoints === newLevel.minPoints);
        if (duplicatePoints) return `A tier with ${newLevel.minPoints} points already exists (${duplicatePoints.name})`;

        const duplicateName = allLevels.find(l => l.id !== newLevel.id && l.name.toLowerCase() === newLevel.name?.toLowerCase());
        if (duplicateName) return `A tier with the name "${newLevel.name}" already exists`;

        // Progression validation: Commission should increase with points
        const sorted = [...allLevels.filter(l => l.id !== newLevel.id), newLevel as PartnerLevel].sort((a, b) => a.minPoints - b.minPoints);
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            if (Number(current.commissionRate) > Number(next.commissionRate)) {
                return `Progression Error: "${current.name}" (${current.minPoints} pts) has a higher commission (${current.commissionRate}%) than "${next.name}" (${next.minPoints} pts, ${next.commissionRate}%). Rates should increase with points.`;
            }
        }

        return null;
    };

    // ================= GLOBAL ACTIONS =================
    const handleSaveGstTiers = async () => {
        const error = validateGstTiersLogic(gstTiers);
        if (error) {
            toast.error(error);
            return;
        }

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
        const error = validateFinancialSettingsLogic();
        if (error) {
            toast.error(error);
            return;
        }

        try {
            setIsSaving(true);
            await Promise.all([
                settingsService.update('DEFAULT_PLATFORM_COMMISSION', defaultPlatformCommission, 'Global default platform commission rate for properties'),
                settingsService.update('PAYOUT_COOLING_HOURS', payoutCoolingHours, 'Cooling period (hours) before settlement approval'),
                settingsService.update('PARTIAL_PAYMENT_PCT', partialPaymentPct, 'The percentage of the total amount required for a partial payment booking advance'),
                settingsService.update('PAYOUT_FREQUENCY', payoutFrequency, 'Global payout frequency for Channel Partners'),
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
        const error = validateLevelLogic(currentLevel, levels);
        if (error) {
            toast.error(error);
            return;
        }

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
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Coins className="h-8 w-8 text-primary" />
                    Loyalty & Tiers Management
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Centralize tax policies, Channel Partner (CP) reseller tiers, and the rewards catalog.
                </p>
            </div>

            {/* Navigation Pills */}
            <div className="flex p-1 bg-muted rounded-2xl w-fit drop-shadow-sm border border-border">
                <button
                    onClick={() => setActiveTab('GLOBAL')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'GLOBAL' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    <Coins className="h-4 w-4" /> Global Points & Tax
                </button>
                <button
                    onClick={() => setActiveTab('TIERS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'TIERS' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    <Award className="h-4 w-4" /> Partner Tiers
                </button>
                <button
                    onClick={() => setActiveTab('REWARDS')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'REWARDS' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                    <Gift className="h-4 w-4" /> Rewards Catalog
                </button>
            </div>

            {/* TAB CONTENT: GLOBAL SETTINGS */}
            {activeTab === 'GLOBAL' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Global Configuration</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Setup foundational tax tiers based on room prices and define the base conversion rates for the loyalty engine.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                                    <div><h2 className="text-lg font-bold text-foreground">GST Tax Tiers</h2><p className="text-xs text-muted-foreground">Automated based on room tariff</p></div>
                                </div>
                                <button onClick={addGstTier} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"><Plus className="h-5 w-5" /></button>
                            </div>
                            <div className="p-6 flex-1 space-y-4">
                                {gstTiers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground"><Info className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>No GST tiers defined.</p></div>
                                ) : (
                                    <div className="space-y-4">
                                        {gstTiers.map((tier, index) => (
                                            <div key={index} className="group relative border border-border rounded-xl p-4 hover:border-primary/50 transition-all bg-background/50">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Min (₹)</label><input type="number" value={tier.min} onChange={(e) => updateGstTier(index, 'min', e.target.value)} className="w-full text-sm font-medium border-none p-0 bg-transparent text-foreground" /></div>
                                                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Max (₹)</label><input type="number" value={tier.max === null ? '' : tier.max} onChange={(e) => updateGstTier(index, 'max', e.target.value)} className="w-full text-sm font-medium border-none p-0 bg-transparent text-foreground" /></div>
                                                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Rate (%)</label><input type="number" value={tier.rate} onChange={(e) => updateGstTier(index, 'rate', e.target.value)} className="w-full text-sm font-bold text-primary border-none p-0 bg-transparent" /></div>
                                                </div>
                                                <button onClick={() => removeGstTier(index)} className="absolute -right-2 -top-2 p-1.5 bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="h-3.5 w-3.5" /> Affects new bookings.</div>
                                    <button onClick={handleSaveGstTiers} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-foreground text-background rounded-xl font-bold">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Tiers</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                <div className="p-6 border-b border-border flex items-center gap-3 bg-muted/30">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
                                    <div><h2 className="text-lg font-bold text-foreground">Points & Financials</h2><p className="text-xs text-muted-foreground">Global commission and conversion rates</p></div>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">Platform Fee %</label>
                                            <div className="relative">
                                                <input type="number" value={defaultPlatformCommission} onChange={(e) => setDefaultPlatformCommission(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 bg-muted/50 border-none rounded-xl text-lg font-bold" />
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted-foreground">The service fee charged to resort properties for every booking processed.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">Payout Frequency</label>
                                            <div className="relative">
                                                <select
                                                    value={payoutFrequency}
                                                    onChange={(e) => setPayoutFrequency(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border-none rounded-xl text-lg font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="Weekly">Weekly</option>
                                                    <option value="Bi-weekly">Bi-weekly</option>
                                                    <option value="Monthly">Monthly</option>
                                                    <option value="Instant">Instant (On Checkout)</option>
                                                </select>
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted-foreground">Determines when the commission becomes eligible for withdrawal by the partner.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">Partial Pay %</label>
                                            <div className="relative">
                                                <input type="number" value={partialPaymentPct} onChange={(e) => setPartialPaymentPct(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 bg-muted/50 border-none rounded-xl text-lg font-bold" />
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted-foreground">Minimum guest advance payment (%) required to confirm a reservation.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">Cooling Period (Hrs)</label>
                                            <div className="relative">
                                                <input type="number" value={payoutCoolingHours} onChange={(e) => setPayoutCoolingHours(Number(e.target.value))} className="w-full pl-4 pr-12 py-3 bg-muted/50 border-none rounded-xl text-lg font-bold" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">Hrs</span>
                                            </div>
                                            <p className="mt-2 text-[10px] text-muted-foreground italic">Safety period after checkout before settlement is approved.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleSaveLoyalty} disabled={isSaving} className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        Save All Financial Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: TIERS */}
            {activeTab === 'TIERS' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 p-4 rounded-2xl flex items-start gap-3">
                        <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-purple-900">Partner Progression</p>
                            <p className="text-xs text-purple-700/70 mt-0.5">Setup a tiered growth system for Channel Partners. As partners reach cumulative point milestones through bookings, they graduate to higher tiers with better commission rates.</p>
                            <p className="mt-2 text-[10px] text-purple-900/60 italic bg-purple-100/50 p-2 rounded-lg leading-relaxed">
                                <strong>Example:</strong> If "Gold" requires 50k pts and offers 12% commission, once a partner hits 50,000 total points, their commission automatically increases from the base rate (e.g. 10%) to 12% for all future bookings.
                            </p>
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Award className="h-5 w-5 text-purple-600" /></div><div><h2 className="text-lg font-bold">Partner Status Levels</h2><p className="text-xs text-muted-foreground">Commission multipliers</p></div></div>
                            <button onClick={() => { setCurrentLevel({}); setIsLevelModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"><Plus className="h-4 w-4" /> Add Tier</button>
                        </div>
                        <div className="p-0">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">Level</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Points</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Rate (%)</th><th className="px-6 py-3 text-right text-xs font-medium uppercase">Actions</th></tr></thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {levels.map((level) => (
                                        <tr key={level.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4"><div className="text-sm font-bold">{level.name}</div></td>
                                            <td className="px-6 py-4"><span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">{level.minPoints.toLocaleString()} pts</span></td>
                                            <td className="px-6 py-4 text-sm font-medium">{level.commissionRate}%</td>
                                            <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setCurrentLevel(level); setIsLevelModalOpen(true); }} className="p-2 text-blue-600 bg-blue-100 rounded-lg"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDeleteLevel(level.id)} className="p-2 text-destructive bg-destructive/10 rounded-lg"><Trash2 className="h-4 w-4" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REWARDS */}
            {activeTab === 'REWARDS' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
                        <Gift className="h-5 w-5 text-emerald-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-emerald-900">Loyalty Marketplace</p>
                            <p className="text-xs text-emerald-700/70 mt-0.5">Manage the catalog of items and rewards that Channel Partners can redeem using their points. Points are spent upon redemption.</p>
                            <p className="mt-2 text-[10px] text-emerald-900/60 italic bg-emerald-100/50 p-2 rounded-lg leading-relaxed">
                                <strong>Example:</strong> If a partner has 600,000 points and redeems an "iPad" for 500k, their "Available" balance drops to 100k, but their "Lifetime Points" (which determines tier status) remains at 600,000.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div><h2 className="text-xl font-bold">Rewards Catalog</h2><p className="text-sm text-muted-foreground">Items partners can claim.</p></div>
                        <button onClick={() => { setCurrentReward({ isActive: true }); setIsRewardModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium"><Plus className="h-4 w-4" /> Add Reward</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.map((reward) => (
                            <div key={reward.id} className={`bg-white rounded-2xl border ${!reward.isActive ? 'border-dashed opacity-70' : 'border-gray-200 shadow-sm'} overflow-hidden relative group`}>
                                <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">{reward.imageUrl ? <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" /> : <ImageIcon className="h-12 w-12 text-gray-300" />}</div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-900 text-lg">{reward.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{reward.description}</p>
                                    <div className="mt-4 flex items-end justify-between">
                                        <div><span className="text-[10px] text-gray-400 font-bold uppercase block">Cost</span><span className="text-lg font-black text-amber-500 flex items-center gap-1"><Coins className="h-4 w-4" /> {reward.pointCost.toLocaleString()}</span></div>
                                        <div className="flex gap-2"><button onClick={() => { setCurrentReward(reward); setIsRewardModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDeleteReward(reward.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {isLevelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold">{currentLevel.id ? 'Edit Tier' : 'Create New Tier'}</h3>
                            <button onClick={() => setIsLevelModalOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Level Name</label><input type="text" value={currentLevel.name || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, name: e.target.value })} className="w-full px-4 py-2 border rounded-xl" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Req. Points</label>
                                    <input type="number" value={currentLevel.minPoints || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, minPoints: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Commission %</label>
                                    <input type="number" value={currentLevel.commissionRate || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, commissionRate: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Points Per Unit</label>
                                    <input type="number" value={currentLevel.pointsPerUnit || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, pointsPerUnit: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Unit Amount (₹)</label>
                                    <input type="number" value={currentLevel.unitAmount || ''} onChange={(e) => setCurrentLevel({ ...currentLevel, unitAmount: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                                </div>
                                <p className="col-span-2 text-[10px] text-muted-foreground italic -mt-2">
                                    Partners in this tier earn <strong>{currentLevel.pointsPerUnit || 0} pts</strong> for every <strong>₹{currentLevel.unitAmount || 0}</strong> spent.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-muted/30">
                            <button onClick={() => setIsLevelModalOpen(false)} className="px-5 py-2 font-medium">Cancel</button>
                            <button onClick={handleSaveLevel} className="px-5 py-2 bg-primary text-white font-medium rounded-xl">Save Tier</button>
                        </div>
                    </div>
                </div>
            )}

            {isRewardModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-border">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold">{currentReward.id ? 'Edit Reward' : 'Add to Catalog'}</h3>
                            <button onClick={() => setIsRewardModalOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Item Name</label><input type="text" value={currentReward.name || ''} onChange={(e) => setCurrentReward({ ...currentReward, name: e.target.value })} className="w-full px-4 py-2 border rounded-xl" /></div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium mb-1">Point Cost</label>
                                    <input type="number" value={currentReward.pointCost || ''} onChange={(e) => setCurrentReward({ ...currentReward, pointCost: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-xl" />
                                    <p className="text-[10px] text-muted-foreground mt-1">Cost in loyalty points.</p>
                                </div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Image URL</label><input type="text" value={currentReward.imageUrl || ''} onChange={(e) => setCurrentReward({ ...currentReward, imageUrl: e.target.value })} className="w-full px-4 py-2 border rounded-xl" /></div>
                            <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={currentReward.description || ''} onChange={(e) => setCurrentReward({ ...currentReward, description: e.target.value })} className="w-full px-4 py-2 border rounded-xl min-h-[80px]" /></div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-muted/30">
                            <button onClick={() => setIsRewardModalOpen(false)} className="px-5 py-2 font-medium">Cancel</button>
                            <button onClick={handleSaveReward} className="px-5 py-2 bg-emerald-600 text-white font-medium rounded-xl">Save Reward</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
