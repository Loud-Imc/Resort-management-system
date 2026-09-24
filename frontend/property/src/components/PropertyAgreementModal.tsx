import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, AlertTriangle, X, User, Loader2, RefreshCw } from 'lucide-react';
import logo from '../assets/logo.svg';
import api from '../services/api';

const resolveAssetUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const envUrl = import.meta.env.VITE_API_URL;
    const baseApi = envUrl && !envUrl.includes('localhost') ? envUrl : (import.meta.env.DEV ? 'http://localhost:3000' : '');
    const cleanBase = baseApi.replace(/\/api\/?$/, '');
    if (cleanBase && url.startsWith('/')) {
        return `${cleanBase}${url}`;
    }
    return url;
};

export interface AgreementPropertyData {
    propertyName?: string;
    propertyType?: string;
    categoryName?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    propertyEmail?: string;
    propertyPhone?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    platformCommission?: number | string;
    gstNumber?: string;
    isGstApplicable?: boolean;
    ownerAadhaarNumber?: string;
    defaultCheckInTime?: string;
    defaultCheckOutTime?: string;
    requestId?: string;
    propertyId?: string;
}

export interface AgreementAcceptancePayload {
    agreementAccepted: boolean;
    agreementAcceptedAt: string;
    agreementVersion: string;
    agreementDesignation: string;
    agreementSignatureName: string;
    agreementAuditId: string;
}

export interface AgreementSection {
    id: number;
    title: string;
    paragraphs: string[];
    bulletPoints?: string[];
}

export interface AgreementContractPayload {
    agreementVersion: string;
    isAccepted?: boolean;
    acceptedAt?: string | null;
    auditId?: string;
    oreeduEntity: {
        legalName: string;
        registeredOffice: string;
        signatoryName: string;
        signatoryDesignation: string;
        stampUrl?: string;
        signatureUrl?: string;
    };
    propertyDetails: {
        propertyId?: string;
        propertyName?: string;
        propertyType?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
        gstNumber?: string;
        panNumber?: string;
        primaryContactName?: string;
        designation?: string;
        email?: string;
        phone?: string;
        platformCommission?: number | string;
        checkInTime?: string;
        checkOutTime?: string;
    };
    sections: AgreementSection[];
    schedules: {
        scheduleA?: Array<{ field: string; value: string }>;
        scheduleB?: Array<{ item: string; term: string }>;
        scheduleC?: Array<{ policyItem: string; configuredRule: string }>;
        scheduleE?: Array<{ field: string; record: string }>;
        scheduleF?: Array<{ subject: string; customTerm: string; approvedBy: string }>;
    };
}

interface PropertyAgreementModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AgreementPropertyData;
    mode?: 'registration' | 'pms';
    onAgree: (payload: AgreementAcceptancePayload) => void;
    onDecline?: (payload: AgreementAcceptancePayload) => void;
    isSubmitting?: boolean;
}

export default function PropertyAgreementModal({
    isOpen,
    onClose,
    data: initialData,
    mode = 'registration',
    onAgree,
    onDecline,
    isSubmitting = false
}: PropertyAgreementModalProps) {
    const [isConfirmed, setIsConfirmed] = useState(false);
    const designation = 'Owner / Proprietor';
    const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

    const [contract, setContract] = useState<AgreementContractPayload | null>(null);
    const [isFetchingRemote, setIsFetchingRemote] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const targetPropId = (initialData as any)?.propertyId;
    const targetReqId = initialData?.requestId;
    const hasTargetId = Boolean(targetPropId || targetReqId);

    const fetchRemoteAgreement = async () => {
        setIsFetchingRemote(true);
        setFetchError(null);

        try {
            let res;
            if (hasTargetId) {
                const primaryEndpoint = targetPropId
                    ? `/properties/${targetPropId}/agreement`
                    : `/properties/requests/${targetReqId}/agreement`;
                const fallbackEndpoint = targetPropId
                    ? `/properties/requests/${targetPropId}/agreement`
                    : `/properties/${targetPropId}/agreement`;

                try {
                    res = await api.get(primaryEndpoint);
                } catch (primaryErr: any) {
                    if (primaryErr?.response?.status === 404) {
                        res = await api.get(fallbackEndpoint);
                    } else {
                        throw primaryErr;
                    }
                }
            } else {
                res = await api.get('/properties/agreements/template');
            }

            const backendPayload: AgreementContractPayload = res.data?.data || res.data;
            if (!backendPayload) {
                throw new Error('Agreement contract data not returned by server.');
            }

            // If in registration mode without an existing database record,
            // merge user-entered form inputs into propertyDetails & scheduleA
            if (!hasTargetId && initialData) {
                const pd = backendPayload.propertyDetails || {};
                const fullName = `${initialData.ownerFirstName || ''} ${initialData.ownerLastName || ''}`.trim();
                const fullAddress = [initialData.address, initialData.city, initialData.state, initialData.country, initialData.pincode].filter(Boolean).join(', ');

                backendPayload.propertyDetails = {
                    ...pd,
                    propertyName: initialData.propertyName || pd.propertyName || '',
                    propertyType: initialData.propertyType || initialData.categoryName || pd.propertyType || 'RESORT',
                    address: fullAddress || pd.address || '',
                    email: initialData.ownerEmail || initialData.propertyEmail || pd.email || '',
                    phone: initialData.ownerPhone || initialData.propertyPhone || pd.phone || '',
                    platformCommission: initialData.platformCommission ?? pd.platformCommission ?? 15,
                    gstNumber: initialData.gstNumber || pd.gstNumber,
                    primaryContactName: fullName || pd.primaryContactName || 'Authorized Signatory',
                    designation: 'Owner / Proprietor',
                };

                if (backendPayload.schedules?.scheduleA) {
                    backendPayload.schedules.scheduleA = backendPayload.schedules.scheduleA.map(item => {
                        if (item.field === 'Legal Entity Name' || item.field === 'Property / Trade Name') {
                            return { ...item, value: initialData.propertyName || item.value };
                        }
                        if (item.field === 'Registered / Operating Address' && fullAddress) {
                            return { ...item, value: fullAddress };
                        }
                        if (item.field === 'Primary Authorised Representative' && fullName) {
                            return { ...item, value: fullName };
                        }
                        if (item.field === 'Email' && (initialData.ownerEmail || initialData.propertyEmail)) {
                            return { ...item, value: initialData.ownerEmail || initialData.propertyEmail || '' };
                        }
                        if (item.field === 'Mobile' && (initialData.ownerPhone || initialData.propertyPhone)) {
                            return { ...item, value: initialData.ownerPhone || initialData.propertyPhone || '' };
                        }
                        return item;
                    });
                }
            }

            setContract(backendPayload);
        } catch (err: any) {
            console.error('Failed to fetch agreement data:', err);
            setFetchError(err?.response?.data?.message || err?.message || 'Failed to load official agreement from server.');
        } finally {
            setIsFetchingRemote(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        fetchRemoteAgreement();
    }, [isOpen, targetPropId, targetReqId]);

    // Scroll locking on document body & html when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalBodyOverflow = document.body.style.overflow;
            const originalHtmlOverflow = document.documentElement.style.overflow;
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalBodyOverflow || '';
                document.documentElement.style.overflow = originalHtmlOverflow || '';
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setIsConfirmed(false);
            setShowDeclineConfirm(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const propDetails = contract?.propertyDetails || {};
    const oreeduEntity = contract?.oreeduEntity || {
        legalName: 'Oreedu Private Limited',
        registeredOffice: '',
        signatoryName: 'Shahoor PK',
        signatoryDesignation: 'CEO',
    };

    const propertyDisplayName = propDetails.propertyName || initialData?.propertyName || 'Property Operating Entity';
    const fullName = propDetails.primaryContactName || `${initialData?.ownerFirstName || ''} ${initialData?.ownerLastName || ''}`.trim() || 'Authorized Signatory';
    const effectiveDateStr = contract?.acceptedAt 
        ? new Date(contract.acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveTimestamp = new Date().toISOString();
    const agreementVersion = contract?.agreementVersion || 'v1.0 (India Operations)';
    const auditId = contract?.auditId || `ORD-AGR-${(propDetails.propertyId || initialData?.propertyId || initialData?.requestId || 'VERIFIED').slice(-8).toUpperCase()}`;
    const commissionPct = propDetails.platformCommission ?? initialData?.platformCommission ?? 15;

    const handleAgreeSubmit = () => {
        if (!isConfirmed) return;
        const payload: AgreementAcceptancePayload = {
            agreementAccepted: true,
            agreementAcceptedAt: effectiveTimestamp,
            agreementVersion,
            agreementDesignation: designation,
            agreementSignatureName: fullName,
            agreementAuditId: auditId,
        };
        onAgree(payload);
    };

    const handleDeclineSubmit = () => {
        const payload: AgreementAcceptancePayload = {
            agreementAccepted: false,
            agreementAcceptedAt: effectiveTimestamp,
            agreementVersion,
            agreementDesignation: designation,
            agreementSignatureName: fullName,
            agreementAuditId: auditId,
        };
        if (onDecline) {
            onDecline(payload);
        } else {
            onClose();
        }
    };

    const handleDownloadOrPrint = () => {
        const el = document.getElementById('property-agreement-paper');
        if (!el) {
            window.print();
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Oreedu Property Listing Agreement - ${propertyDisplayName}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 15mm 12mm 15mm 12mm;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #1a1a1a;
                        background: #fff;
                        margin: 0;
                        padding: 0;
                        font-size: 11pt;
                        line-height: 1.5;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        page-break-inside: avoid;
                        margin: 8px 0;
                        font-size: 9.5pt;
                    }
                    th, td {
                        border: 1px solid #999;
                        padding: 5px 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #0F2942 !important;
                        color: #ffffff !important;
                        font-weight: 700;
                    }
                    h1 { font-size: 16pt; font-weight: 800; color: #0F2942; margin: 0 0 4px 0; }
                    h2 { font-size: 13pt; font-weight: 700; color: #0F2942; margin: 16px 0 6px 0; border-bottom: 1.5px solid #0F2942; padding-bottom: 3px; }
                    h3 { font-size: 10.5pt; font-weight: 700; color: #0F2942; margin: 12px 0 4px 0; }
                    p { margin: 0 0 6px 0; text-align: justify; }
                    ul { margin: 4px 0 8px 18px; padding: 0; }
                    li { margin-bottom: 3px; text-align: justify; }
                    .page-break { page-break-before: always; }
                    .avoid-break { page-break-inside: avoid; }
                    .text-center { text-align: center; }
                    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                </style>
            </head>
            <body>
                ${el.innerHTML}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 300);
    };

    return createPortal(
        <div 
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-150"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 999999 }}
        >
            {/* ── Top Bar (Sticky Full-Width) ── */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-900 text-white border-b border-slate-800 shrink-0 shadow-md w-full">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Oreedu" className="h-6 w-auto brightness-200" />
                    <div className="h-4 w-[1px] bg-slate-700 hidden sm:block"></div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                            Oreedu Property Listing &amp; Platform Services Agreement
                        </h2>
                        <p className="text-[10px] text-slate-400 hidden sm:block">
                            Official Legal Template &bull; {propertyDisplayName ? `For ${propertyDisplayName}` : 'Property Onboarding'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadOrPrint}
                        disabled={!contract || isFetchingRemote}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Download / Print Agreement as PDF"
                    >
                        <Download className="h-3.5 w-3.5 text-teal-400" />
                        <span>Download PDF</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* ── Document Body View ── */}
            <div className="flex-1 overflow-y-auto bg-slate-900/60 p-2 sm:p-4 lg:p-5">
                {isFetchingRemote ? (
                    <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 max-w-lg mx-auto mt-12 shadow-2xl">
                        <Loader2 className="h-12 w-12 animate-spin text-teal-400 mb-4" />
                        <h3 className="text-base font-bold text-white mb-2">Loading Verified Agreement...</h3>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                            Fetching official legal sections, commercial schedules, and property data directly from the server.
                        </p>
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center min-h-[450px] p-8 text-center bg-slate-900/80 rounded-2xl border border-rose-900/50 max-w-lg mx-auto mt-12 shadow-2xl">
                        <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 mb-4">
                            <AlertTriangle className="h-10 w-10 text-rose-400" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Failed to Load Agreement</h3>
                        <p className="text-xs text-rose-200 max-w-sm mb-6 leading-relaxed bg-rose-950/40 p-3 rounded-lg border border-rose-900/40 font-mono">
                            {fetchError}
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-sm mb-6">
                            Agreements cannot be reviewed or signed with unverified or missing property data.
                        </p>
                        <button
                            type="button"
                            onClick={fetchRemoteAgreement}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Retry Fetching Agreement</span>
                        </button>
                    </div>
                ) : contract ? (
                    <div 
                        id="property-agreement-paper"
                        className="max-w-4xl mx-auto bg-white text-gray-900 p-6 sm:p-10 lg:p-12 shadow-2xl rounded-sm border border-gray-200 font-sans text-xs leading-relaxed space-y-6"
                    >
                        {/* ── Document Header ── */}
                        <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#0F2942] pb-5 gap-4">
                            <div className="flex items-center gap-3">
                                <img src={logo} alt="Oreedu" className="h-10 w-auto" />
                                <div>
                                    <h1 className="text-base sm:text-lg font-black tracking-tight text-[#0F2942] uppercase">
                                        Oreedu Platform Agreement
                                    </h1>
                                    <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
                                        Standard Master Terms &bull; India Operations ({contract.agreementVersion})
                                    </p>
                                </div>
                            </div>
                            <div className="text-right text-[11px] text-gray-500 border-l border-gray-300 pl-4 hidden sm:block">
                                <p className="font-mono text-gray-700 font-bold">{auditId}</p>
                                <p>Version: <span className="text-teal-800 font-semibold">{contract.agreementVersion}</span></p>
                            </div>
                        </div>

                        {/* Title Banner */}
                        <div className="text-center py-2">
                            <h2 className="text-base sm:text-xl font-black text-[#0F2942] tracking-wide uppercase">
                                PROPERTY LISTING &amp; PLATFORM SERVICES AGREEMENT
                            </h2>
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                                Standard Terms and Conditions for Accommodation Listing, Distribution and Platform Services
                            </p>
                        </div>

                        {/* Document Field Summary Table */}
                        <div className="border border-gray-400 overflow-hidden">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="bg-[#0F2942] text-white">
                                        <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Document Field</th>
                                        <th className="p-2.5 font-bold uppercase">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    <tr>
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Agreement Version</td>
                                        <td className="p-2.5 font-semibold text-teal-800">{contract.agreementVersion}</td>
                                    </tr>
                                    <tr className="bg-gray-50/60">
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Effective Date</td>
                                        <td className="p-2.5">Date of electronic acceptance / <strong>{effectiveDateStr}</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Oreedu Legal Entity</td>
                                        <td className="p-2.5"><strong>{oreeduEntity.legalName}</strong></td>
                                    </tr>
                                    <tr className="bg-gray-50/60">
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Registered Office</td>
                                        <td className="p-2.5">{oreeduEntity.registeredOffice}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property Legal / Trade Name</td>
                                        <td className="p-2.5 font-bold text-[#0F2942] bg-teal-50/40">
                                            {propertyDisplayName}
                                        </td>
                                    </tr>
                                    <tr className="bg-gray-50/60">
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property ID</td>
                                        <td className="p-2.5 font-mono font-semibold">{propDetails.propertyId || auditId}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Commercial Model</td>
                                        <td className="p-2.5 font-semibold">
                                            As stated in Schedule B ({commissionPct}% Platform Commission per confirmed booking) / applicable order form
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-gray-200 my-6"></div>

                        {/* ── Dynamic Legal Sections From Backend ── */}
                        <div className="space-y-6">
                            {contract.sections?.map((section) => (
                                <div key={section.id} className="space-y-2.5">
                                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                                        {section.title}
                                    </h3>
                                    {section.paragraphs?.map((p, idx) => (
                                        <p key={idx} className="text-justify leading-relaxed">
                                            {p}
                                        </p>
                                    ))}
                                    {section.bulletPoints && section.bulletPoints.length > 0 && (
                                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                            {section.bulletPoints.map((bp, bidx) => (
                                                <li key={bidx} className="text-justify leading-relaxed">
                                                    {bp}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* ── Dynamic Schedules From Backend ── */}
                        {contract.schedules && (
                            <div className="space-y-8 pt-6 border-t-2 border-gray-300">
                                <div className="text-center pb-2">
                                    <h2 className="text-sm sm:text-base font-black text-[#0F2942] tracking-wide uppercase">
                                        SCHEDULES FORMING PART OF THIS AGREEMENT
                                    </h2>
                                </div>

                                {/* Schedule A */}
                                {contract.schedules.scheduleA && contract.schedules.scheduleA.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            SCHEDULE A: Property Details &amp; Commercial Profile
                                        </h3>
                                        <div className="border border-gray-400 overflow-hidden">
                                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                                <tbody className="divide-y divide-gray-300">
                                                    {contract.schedules.scheduleA.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300 w-2/5">{row.field}</td>
                                                            <td className="p-2.5">{row.value}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule B */}
                                {contract.schedules.scheduleB && contract.schedules.scheduleB.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            SCHEDULE B: Commercial Terms &amp; Commission Structure
                                        </h3>
                                        <div className="border border-gray-400 overflow-hidden">
                                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                                <thead>
                                                    <tr className="bg-[#0F2942] text-white">
                                                        <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-2/5">Commercial Item</th>
                                                        <th className="p-2.5 font-bold uppercase">Agreed Parameter / Rule</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-300">
                                                    {contract.schedules.scheduleB.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">{row.item}</td>
                                                            <td className="p-2.5">{row.term}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule C */}
                                {contract.schedules.scheduleC && contract.schedules.scheduleC.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            SCHEDULE C: Operating Rules, Check-in &amp; Cancellation Policies
                                        </h3>
                                        <div className="border border-gray-400 overflow-hidden">
                                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                                <thead>
                                                    <tr className="bg-[#0F2942] text-white">
                                                        <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-2/5">Policy / Operating Parameter</th>
                                                        <th className="p-2.5 font-bold uppercase">Agreed Requirement</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-300">
                                                    {contract.schedules.scheduleC.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">{row.policyItem}</td>
                                                            <td className="p-2.5">{row.configuredRule}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule E */}
                                {contract.schedules.scheduleE && contract.schedules.scheduleE.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            SCHEDULE E: Electronic Acceptance &amp; Audit Trail Record
                                        </h3>
                                        <div className="border border-gray-400 overflow-hidden">
                                            <table className="w-full border-collapse border border-gray-400 text-xs font-mono">
                                                <thead>
                                                    <tr className="bg-[#0F2942] text-white">
                                                        <th className="p-2 font-bold uppercase border-r border-gray-400 w-2/5">Electronic Audit Field</th>
                                                        <th className="p-2 font-bold uppercase">Logged System Evidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-300">
                                                    {contract.schedules.scheduleE.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">{row.field}</td>
                                                            <td className="p-2">{row.record}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule F */}
                                {contract.schedules.scheduleF && contract.schedules.scheduleF.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            SCHEDULE F: Special Conditions &amp; Custom Addenda
                                        </h3>
                                        <div className="border border-gray-400 overflow-hidden">
                                            <table className="w-full border-collapse border border-gray-400 text-xs">
                                                <thead>
                                                    <tr className="bg-[#0F2942] text-white">
                                                        <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/4">Subject Matter</th>
                                                        <th className="p-2.5 font-bold uppercase border-r border-gray-400">Agreed Special Condition</th>
                                                        <th className="p-2.5 font-bold uppercase w-1/4">Approved By</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-300">
                                                    {contract.schedules.scheduleF.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">{row.subject}</td>
                                                            <td className="p-2.5 border-r border-gray-300">{row.customTerm}</td>
                                                            <td className="p-2.5 font-semibold text-teal-800">{row.approvedBy}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── EXECUTION & AUTHORISED SIGNATURES ── */}
                        <div className="space-y-4 pt-6 border-t-2 border-gray-300">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide text-center">
                                IN WITNESS WHEREOF / EXECUTION &amp; AUTHORISATION
                            </h3>
                            <p className="text-xs text-gray-600 text-center italic">
                                Executed electronically by the authorised representatives of the Parties on the date indicated below.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                {/* Left Column: Oreedu Private Limited */}
                                <div className="p-4 bg-gray-50 border border-gray-300 rounded space-y-3 relative">
                                    <div className="border-b border-gray-300 pb-2">
                                        <p className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            For and on behalf of:
                                        </p>
                                        <p className="text-sm font-black text-gray-900">
                                            {oreeduEntity.legalName}
                                        </p>
                                    </div>

                                    {/* Seal Stamp & Signature Display */}
                                    <div className="flex items-center justify-between py-1 min-h-[110px] relative">
                                        <div className="space-y-1 z-10">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Authorised Signature</p>
                                            {oreeduEntity.signatureUrl ? (
                                                <img 
                                                    src={resolveAssetUrl(oreeduEntity.signatureUrl)} 
                                                    alt="Oreedu Authorised Signature" 
                                                    className="h-20 sm:h-24 w-auto object-contain max-w-[170px] mix-blend-multiply"
                                                    style={{ mixBlendMode: 'multiply' }}
                                                    onError={(e) => {
                                                        const fallbackPath = oreeduEntity.signatureUrl;
                                                        if (fallbackPath && e.currentTarget.src !== fallbackPath && !e.currentTarget.src.endsWith(fallbackPath)) {
                                                            e.currentTarget.src = fallbackPath;
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                        <div className="z-10">
                                            {oreeduEntity.stampUrl ? (
                                                <img 
                                                    src={resolveAssetUrl(oreeduEntity.stampUrl)} 
                                                    alt="Oreedu Official Corporate Seal" 
                                                    className="h-24 w-24 sm:h-28 sm:w-28 object-contain opacity-90 mix-blend-multiply rotate-[10deg]"
                                                    style={{ mixBlendMode: 'multiply', transform: 'rotate(10deg)' }}
                                                    onError={(e) => {
                                                        const fallbackPath = oreeduEntity.stampUrl;
                                                        if (fallbackPath && e.currentTarget.src !== fallbackPath && !e.currentTarget.src.endsWith(fallbackPath)) {
                                                            e.currentTarget.src = fallbackPath;
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 text-[11px] space-y-0.5 text-gray-700">
                                        <p><strong>Name:</strong> {oreeduEntity.signatoryName || 'Shahoor PK'}</p>
                                        <p><strong>Designation:</strong> {oreeduEntity.signatoryDesignation || 'CEO'}</p>
                                        <p><strong>Date:</strong> {effectiveDateStr}</p>
                                    </div>
                                </div>

                                {/* Right Column: The Property */}
                                <div className="p-4 bg-gray-50 border border-gray-300 rounded space-y-3 flex flex-col justify-between">
                                    <div>
                                        <div className="border-b border-gray-300 pb-2">
                                            <p className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                                For and on behalf of:
                                            </p>
                                            <p className="text-sm font-black text-gray-900">
                                                {propertyDisplayName}
                                            </p>
                                        </div>

                                        <div className="py-3 min-h-[110px] flex flex-col justify-center">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Electronic Signature &bull; Authorised Signatory</p>
                                            <div className="border-b border-dashed border-gray-400 py-1 flex items-center justify-between">
                                                <span className="font-serif italic text-base text-gray-800 font-bold tracking-wider">
                                                    {fullName}
                                                </span>
                                                <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                    {contract.isAccepted ? 'VERIFIED SIGNATURE' : 'PENDING CLICK'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 text-[11px] space-y-0.5 text-gray-700">
                                        <p><strong>Name:</strong> {fullName}</p>
                                        <p><strong>Designation:</strong> {designation}</p>
                                        <p><strong>Date:</strong> {effectiveDateStr}</p>
                                        <p className="font-mono text-[10px] text-gray-500"><strong>Audit ID:</strong> {auditId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* ── Fixed Bottom Acceptance Action Bar ── */}
            {contract && (
                <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 text-white shrink-0 shadow-2xl w-full">
                    {showDeclineConfirm ? (
                        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-950/60 border border-amber-600/50 rounded-xl p-3 animate-in fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                                <p className="text-xs text-amber-200 leading-snug">
                                    Are you sure you want to proceed without accepting? Unsigned properties require manual verification by admin before activation.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowDeclineConfirm(false)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeclineSubmit}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
                                >
                                    Yes, Continue Without Agreement
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
                            {/* Signatory & Designation Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-teal-400" />
                                    <span className="text-slate-400">Signatory:</span>
                                    <span className="font-bold text-white">{fullName}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-slate-400 text-[11px] font-medium shrink-0">Designation:</label>
                                    <span className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white tracking-wide">
                                        Owner / Proprietor
                                    </span>
                                </div>
                            </div>

                            {/* Checkbox */}
                            <label className="flex items-start gap-2.5 cursor-pointer select-none bg-teal-950/30 border border-teal-800/50 px-3 py-1.5 rounded-lg text-xs text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={isConfirmed}
                                    onChange={(e) => setIsConfirmed(e.target.checked)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                                />
                                <span className="leading-snug text-[11px] sm:text-xs">
                                    I confirm I am authorized as <strong>Owner / Proprietor</strong> for <strong>{propertyDisplayName}</strong> and agree to the <strong>Oreedu Property Listing &amp; Platform Services Agreement ({contract.agreementVersion})</strong> with <strong>{commissionPct}% platform commission</strong>.
                                </span>
                            </label>

                            {/* Action buttons */}
                            <div className="flex items-center justify-between gap-3 pt-0.5">
                                <div>
                                    {mode === 'registration' ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeclineConfirm(true)}
                                            className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 underline underline-offset-2 transition-colors cursor-pointer"
                                        >
                                            Decline for now &amp; submit without agreement
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                                        >
                                            Close &amp; Remind Later
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {mode !== 'registration' && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAgreeSubmit}
                                        disabled={!isConfirmed || isSubmitting}
                                        className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <span>Submitting...</span>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>{mode === 'registration' ? 'I Agree & Submit Registration' : 'I Agree & Accept Agreement'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body
    );
}
