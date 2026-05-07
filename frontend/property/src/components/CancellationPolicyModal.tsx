import { useState, useEffect } from 'react';
import {
    X, Plus, Clock, Percent, ShieldAlert, Trash2,
    FileText, Loader2, Save, Info, AlertTriangle
} from 'lucide-react';
import { cancellationPoliciesService, type CancellationPolicy, type CancellationRule } from '../services/cancellationPolicies';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface CancellationPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    onPoliciesChange?: () => void;
}

export default function CancellationPolicyModal({
    isOpen,
    onClose,
    propertyId,
    onPoliciesChange
}: CancellationPolicyModalProps) {
    const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState<CancellationRule[]>([
        { hoursBeforeCheckIn: 48, refundPercentage: 100 },
        { hoursBeforeCheckIn: 24, refundPercentage: 50 },
        { hoursBeforeCheckIn: 0, refundPercentage: 0 }
    ]);

    useEffect(() => {
        if (isOpen && propertyId) {
            loadPolicies();
        }
    }, [isOpen, propertyId]);

    const loadPolicies = async () => {
        try {
            setLoading(true);
            const data = await cancellationPoliciesService.getAll(propertyId);
            setPolicies(data);
        } catch (err) {
            toast.error('Failed to load policies');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPolicy = async () => {
        if (!name) {
            toast.error('Policy name is required');
            return;
        }
        try {
            setSaving(true);
            await cancellationPoliciesService.create({
                name,
                description,
                propertyId,
                rules,
                isDefault: policies.length === 0
            });
            toast.success('Policy created successfully');
            setName('');
            setDescription('');
            setRules([
                { hoursBeforeCheckIn: 48, refundPercentage: 100 },
                { hoursBeforeCheckIn: 24, refundPercentage: 50 },
                { hoursBeforeCheckIn: 0, refundPercentage: 0 }
            ]);
            setShowForm(false);
            loadPolicies();
            onPoliciesChange?.();
        } catch (err) {
            toast.error('Failed to create policy');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) return;
        try {
            await cancellationPoliciesService.delete(id);
            toast.success('Policy deleted');
            loadPolicies();
            onPoliciesChange?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete policy');
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await cancellationPoliciesService.update(id, { isDefault: true });
            toast.success('Default policy updated');
            loadPolicies();
            onPoliciesChange?.();
        } catch (err) {
            toast.error('Failed to update default policy');
        }
    };

    const updateRule = (index: number, field: keyof CancellationRule, value: number) => {
        const updated = [...rules];
        updated[index] = { ...updated[index], [field]: value };
        setRules(updated);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                            <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cancellation Policies</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-70">Manage refund rules for guests</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                    >
                        <X className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New Section */}
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all group"
                        >
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-all">
                                <Plus className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest">Add New Policy</span>
                        </button>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Create New Policy
                                </h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Policy Name</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Flexible, Moderate"
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
                                    <input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Brief details..."
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    Refund Rules
                                    <div className="group relative">
                                        <Info className="h-3.5 w-3.5 text-gray-400" />
                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed font-medium shadow-2xl border border-white/10">
                                            Define how much refund is given based on hours before check-in.
                                        </div>
                                    </div>
                                </label>

                                <div className="space-y-2">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex-1 flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={rule.hoursBeforeCheckIn}
                                                    onChange={e => updateRule(idx, 'hoursBeforeCheckIn', parseInt(e.target.value))}
                                                    className="w-16 bg-transparent text-sm font-black focus:outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">hrs before</span>
                                            </div>
                                            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />
                                            <div className="flex-1 flex items-center gap-2">
                                                <Percent className="h-4 w-4 text-gray-400" />
                                                <input
                                                    type="number"
                                                    value={rule.refundPercentage}
                                                    onChange={e => updateRule(idx, 'refundPercentage', parseInt(e.target.value))}
                                                    className="w-16 bg-transparent text-sm font-black focus:outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">refund</span>
                                            </div>
                                            <button
                                                onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setRules([...rules, { hoursBeforeCheckIn: 0, refundPercentage: 0 }])}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                                >
                                    <Plus className="h-3 w-3" /> Add Tier
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddPolicy}
                                    disabled={saving}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Create Policy
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Existing Policies List */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Existing Policies</h3>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {policies.map(p => (
                                    <div
                                        key={p.id}
                                        className={clsx(
                                            "p-5 rounded-2xl border transition-all relative overflow-hidden group",
                                            p.isDefault
                                                ? "bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50"
                                                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={clsx(
                                                    "p-2.5 rounded-xl",
                                                    p.isDefault ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-700/50"
                                                )}>
                                                    <FileText className={clsx("h-5 w-5", p.isDefault ? "text-blue-600" : "text-gray-400")} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">{p.name}</h4>
                                                        {p.isDefault && (
                                                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                                                                Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    {p.description && <p className="text-xs text-gray-500 font-medium">{p.description}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!p.isDefault && (
                                                    <button
                                                        onClick={() => handleSetDefault(p.id)}
                                                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                    >
                                                        Set Default
                                                    </button>
                                                )}
                                                {!p.isDefault && (
                                                    <button
                                                        onClick={() => handleDeletePolicy(p.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-1.5 pl-14">
                                            {((p.rules as any[]) || []).sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn).map((rule, idx) => (
                                                <div key={idx} className="px-2.5 py-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg text-[9px] font-bold text-gray-500">
                                                    <span className="text-gray-400">{rule.hoursBeforeCheckIn}h:</span> <span className="text-blue-600">{rule.refundPercentage}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {policies.length === 0 && (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                        <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No policies found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
