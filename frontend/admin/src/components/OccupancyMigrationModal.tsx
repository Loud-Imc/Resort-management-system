import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/properties';
import {
    X,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ShieldCheck,
    Zap,
    Scale,
    Info,
    Check,
    Loader2,
    RefreshCw,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OccupancyMigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyName?: string;
    onStatusChange?: () => void;
}

export default function OccupancyMigrationModal({
    isOpen,
    onClose,
    propertyId,
    propertyName,
    onStatusChange,
}: OccupancyMigrationModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'readiness' | 'shadow'>('readiness');
    const [isConfirmActivateOpen, setIsConfirmActivateOpen] = useState(false);
    const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);

    // Fetch Property Readiness Audit
    const {
        data: readiness,
        isLoading: loadingReadiness,
        refetch: refetchReadiness,
    } = useQuery({
        queryKey: ['admin-occupancy-readiness', propertyId],
        queryFn: () => propertyService.getOccupancyReadiness(propertyId),
        enabled: isOpen && !!propertyId,
    });

    // Fetch Shadow Validation
    const {
        data: shadowData,
        isLoading: loadingShadow,
        refetch: refetchShadow,
    } = useQuery({
        queryKey: ['admin-occupancy-shadow', propertyId],
        queryFn: () => propertyService.getOccupancyShadowValidation(propertyId),
        enabled: isOpen && activeTab === 'shadow' && !!propertyId,
    });

    // Activation Mutation
    const activateMutation = useMutation({
        mutationFn: () => propertyService.activateV2Occupancy(propertyId),
        onSuccess: (data) => {
            toast.success(data.message || 'Property successfully activated to V2 Canonical Occupancy!');
            queryClient.invalidateQueries({ queryKey: ['admin-occupancy-readiness', propertyId] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            setIsConfirmActivateOpen(false);
            refetchReadiness();
            onStatusChange?.();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || 'Failed to activate V2';
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
    });

    // Deactivation Mutation
    const deactivateMutation = useMutation({
        mutationFn: () => propertyService.deactivateV2Occupancy(propertyId),
        onSuccess: (data) => {
            toast.success(data.message || 'Property reverted to V1 Legacy Occupancy');
            queryClient.invalidateQueries({ queryKey: ['admin-occupancy-readiness', propertyId] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            setIsConfirmDeactivateOpen(false);
            refetchReadiness();
            onStatusChange?.();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || 'Failed to deactivate V2';
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
    });

    if (!isOpen) return null;

    const currentVersion = readiness?.currentOccupancyVersion || 'V1';
    const isV2Active = currentVersion === 'V2';
    const isEligible = readiness?.isEligibleForV2Activation;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Occupancy Renovation: V2 Migration & Readiness (Super Admin)
                                </h2>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    isV2Active 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                }`}>
                                    Current: {isV2Active ? 'V2 Canonical Mode' : 'V1 Legacy Mode'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                Property: <strong className="text-gray-700 dark:text-slate-200">{propertyName || readiness?.propertyName || propertyId}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Summary Metrics Bar */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-b border-gray-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total RoomTypes</span>
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{readiness?.totalRoomTypes ?? '-'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">V2 Ready</span>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{readiness?.readyRoomTypesCount ?? '-'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Review Required</span>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">{readiness?.reviewRequiredRoomTypesCount ?? '-'}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Invalid Config</span>
                        <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">{readiness?.invalidRoomTypesCount ?? '-'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setActiveTab('readiness')}
                        className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'readiness'
                                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400'
                        }`}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        RoomType Readiness Audit
                    </button>
                    <button
                        onClick={() => setActiveTab('shadow')}
                        className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === 'shadow'
                                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400'
                        }`}
                    >
                        <Eye className="h-4 w-4" />
                        Shadow Validation (V1 vs V2 Simulation)
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'readiness' && (
                        <>
                            {/* Readiness Status Banner */}
                            {loadingReadiness ? (
                                <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                            ) : (
                                <div className={`p-4 rounded-xl border ${
                                    isV2Active 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                        : isEligible
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {isV2Active || isEligible ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold">
                                                {isV2Active 
                                                    ? 'Canonical V2 Occupancy Engine is Active'
                                                    : isEligible
                                                        ? 'Ready for V2 Activation: All RoomTypes are V2-ready'
                                                        : 'Action Required: Resolve room type blockers before activating V2'}
                                            </h4>
                                            <p className="text-xs mt-1 opacity-90">
                                                {isV2Active 
                                                    ? 'This property is operating on the canonical V2 headcount-first occupancy, discovery, and pricing engine.'
                                                    : isEligible
                                                        ? '100% of RoomTypes have valid canonical configurations and pass Channex compatibility checks.'
                                                        : `There are ${readiness?.blockingReasons?.length || 0} blocking configuration issues across room types.`}
                                            </p>
                                            {readiness?.blockingReasons && readiness.blockingReasons.length > 0 && !isV2Active && (
                                                <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-amber-800 dark:text-amber-300">
                                                    {readiness.blockingReasons.map((r: string, idx: number) => (
                                                        <li key={idx}>{r}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RoomTypes Audit Table */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    RoomType Configuration Readiness Breakdown
                                </h3>

                                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 font-bold border-b border-gray-200 dark:border-slate-700">
                                            <tr>
                                                <th className="p-3">Room Type</th>
                                                <th className="p-3">Current Mode</th>
                                                <th className="p-3">Readiness Status</th>
                                                <th className="p-3">Canonical Envelopes (B / M)</th>
                                                <th className="p-3">Physical Bounds (A / C / I)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {readiness?.roomTypeAudits?.map((rt: any) => {
                                                const status = rt.status;
                                                const isReady = rt.isV2Ready;
                                                const prop = rt.proposedCanonicalValues || {};

                                                return (
                                                    <tr key={rt.roomTypeId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="p-3 font-bold text-gray-900 dark:text-white">
                                                            {rt.roomTypeName}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                                                {rt.currentOccupancyVersion || 'V1'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {isReady ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                                                    <Check className="h-3 w-3" /> V2 Ready
                                                                </span>
                                                            ) : status === 'REVIEW_REQUIRED' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                                    <AlertTriangle className="h-3 w-3" /> Review Required
                                                                </span>
                                                            ) : status === 'SAFE' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                                                    <Info className="h-3 w-3" /> Safe (Pending V2 Save)
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                                                    <XCircle className="h-3 w-3" /> Invalid Config
                                                                </span>
                                                            )}
                                                            {rt.reasons && rt.reasons.length > 0 && (
                                                                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 max-w-xs leading-tight">
                                                                    {rt.reasons.join(' • ')}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-gray-700 dark:text-slate-300">
                                                            Base: <strong className="text-gray-900 dark:text-white">{prop.totalBaseOccupancy ?? '-'}</strong> | Max: <strong className="text-gray-900 dark:text-white">{prop.totalMaxOccupancy ?? '-'}</strong>
                                                        </td>
                                                        <td className="p-3 text-gray-700 dark:text-slate-300">
                                                            {prop.maxPhysicalAdults ?? '-'} Adults • {prop.maxPhysicalChildren ?? '-'} Children • {prop.maxPhysicalInfants ?? 1} Infants
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'shadow' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">What is Shadow Validation?</p>
                                    <p className="mt-0.5 text-blue-800 dark:text-blue-400">
                                        This non-mutating simulation runs representative guest parties through both the legacy V1 engine and canonical V2 engine side-by-side.
                                    </p>
                                </div>
                            </div>

                            {loadingShadow ? (
                                <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                            ) : (
                                shadowData?.roomTypes?.map((rtShadow: any) => (
                                    <div key={rtShadow.roomTypeId} className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-gray-900 dark:text-white flex items-center justify-between">
                                            <span>{rtShadow.roomTypeName}</span>
                                            <div className="flex items-center gap-2">
                                                {rtShadow.hasPricingDifference && (
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                                                        Pricing Delta Detected
                                                    </span>
                                                )}
                                                {rtShadow.hasOccupancyDifference && (
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                                                        Availability Expanded
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-bold text-gray-500 border-b border-gray-100 dark:border-slate-800">
                                                <tr>
                                                    <th className="p-2.5">Guest Party</th>
                                                    <th className="p-2.5">V1 Legacy Result</th>
                                                    <th className="p-2.5">V2 Canonical Result</th>
                                                    <th className="p-2.5">Price Delta</th>
                                                    <th className="p-2.5">Rule / Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                                                {rtShadow.testedParties?.map((party: any, pIdx: number) => {
                                                    const partyLabel = `${party.adults}A + ${party.children}C${party.infants > 0 ? ` + ${party.infants}I` : ''}`;
                                                    const hasDelta = party.priceDelta !== undefined && party.priceDelta !== 0;

                                                    return (
                                                        <tr key={pIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                            <td className="p-2.5 font-bold text-gray-800 dark:text-slate-200">{partyLabel}</td>
                                                            <td className="p-2.5">
                                                                {party.v1Allowed ? (
                                                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Allowed (₹{party.v1Price})</span>
                                                                ) : (
                                                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Blocked</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5">
                                                                {party.v2Allowed ? (
                                                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Allowed (₹{party.v2Price})</span>
                                                                ) : (
                                                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Blocked</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5">
                                                                {hasDelta ? (
                                                                    <span className={`font-bold ${party.priceDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                        {party.priceDelta > 0 ? `+₹${party.priceDelta}` : `-₹${Math.abs(party.priceDelta)}`}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">₹0 (Parity)</span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 text-gray-500 text-[11px]">{party.notes || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                        onClick={() => {
                            refetchReadiness();
                            if (activeTab === 'shadow') refetchShadow();
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Re-audit
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Close
                        </button>

                        {!isV2Active ? (
                            <button
                                disabled={!isEligible || activateMutation.isPending}
                                onClick={() => setIsConfirmActivateOpen(true)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all ${
                                    isEligible
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                        : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <Zap className="h-4 w-4" />
                                Activate V2 Canonical Engine
                            </button>
                        ) : (
                            <button
                                disabled={deactivateMutation.isPending}
                                onClick={() => setIsConfirmDeactivateOpen(true)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1.5"
                            >
                                Revert to V1 Legacy Engine
                            </button>
                        )}
                    </div>
                </div>

                {/* Confirmation Modal: Activate */}
                {isConfirmActivateOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-full text-emerald-600">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm V2 Activation</h3>
                                    <p className="text-xs text-gray-500">Atomic Property-Level Cutover</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                                You are about to activate the <strong>Canonical V2 Occupancy Engine</strong> for <strong>{propertyName || readiness?.propertyName}</strong>.
                            </p>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total RoomTypes:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{readiness?.totalRoomTypes}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">V2 Ready RoomTypes:</span>
                                    <span className="font-bold text-emerald-600">{readiness?.readyRoomTypesCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Channex Compatibility:</span>
                                    <span className="font-bold text-emerald-600">Passed (B ≤ P_A)</span>
                                </div>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                                <strong>Important:</strong> Live search, pricing, and booking creation for this property will immediately execute using canonical headcount-first envelopes.
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsConfirmActivateOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={activateMutation.isPending}
                                    onClick={() => activateMutation.mutate()}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md"
                                >
                                    {activateMutation.isPending && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                                    Confirm & Activate V2
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal: Deactivate */}
                {isConfirmDeactivateOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 dark:bg-amber-950 rounded-full text-amber-600">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Revert to V1 Legacy</h3>
                                    <p className="text-xs text-gray-500">Property-Level Reversion</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                                Are you sure you want to revert <strong>{propertyName || readiness?.propertyName}</strong> back to <strong>V1 Legacy Mode</strong>?
                            </p>
                            <p className="text-[11px] text-gray-500">
                                Your configured V2 canonical values will remain stored safely in the database, but search and pricing calculations will fall back to legacy formulas.
                            </p>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsConfirmDeactivateOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={deactivateMutation.isPending}
                                    onClick={() => deactivateMutation.mutate()}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-md"
                                >
                                    {deactivateMutation.isPending && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                                    Confirm Revert to V1
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
