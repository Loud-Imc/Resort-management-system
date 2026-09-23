import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, AlertTriangle, X, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
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

export interface AdminAgreementData {
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
    agreementAccepted?: boolean;
    agreementAcceptedAt?: string;
    agreementVersion?: string;
    agreementDesignation?: string;
    agreementSignatureName?: string;
    agreementAuditId?: string;
}

export interface AgreementSection {
    id: number;
    title: string;
    paragraphs: string[];
    bulletPoints?: string[];
}

export interface AdminAgreementContractPayload {
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

interface AdminAgreementViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AdminAgreementData;
}

export default function AdminAgreementViewerModal({
    isOpen,
    onClose,
    data
}: AdminAgreementViewerModalProps) {
    const [contract, setContract] = useState<AdminAgreementContractPayload | null>(null);
    const [isFetchingRemote, setIsFetchingRemote] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const targetId = data?.requestId || data?.propertyId;

    const fetchAgreement = async () => {
        setIsFetchingRemote(true);
        setFetchError(null);

        try {
            let res;
            if (targetId) {
                try {
                    res = await api.get(`/properties/requests/${targetId}/agreement`);
                } catch (firstErr: any) {
                    if (firstErr?.response?.status === 404) {
                        try {
                            res = await api.get(`/properties/${targetId}/agreement`);
                        } catch {
                            res = await api.get('/properties/agreements/template');
                        }
                    } else {
                        throw firstErr;
                    }
                }
            } else {
                res = await api.get('/properties/agreements/template');
            }

            const backendPayload: AdminAgreementContractPayload = res.data?.data || res.data;
            if (!backendPayload) {
                throw new Error('Agreement contract data not returned by server.');
            }

            // Overlay any specific historical acceptance fields passed from props
            if (data?.agreementAccepted !== undefined) {
                backendPayload.isAccepted = data.agreementAccepted;
            }
            if (data?.agreementAcceptedAt) {
                backendPayload.acceptedAt = data.agreementAcceptedAt;
            }
            if (data?.agreementVersion) {
                backendPayload.agreementVersion = data.agreementVersion;
            }
            if (data?.agreementAuditId) {
                backendPayload.auditId = data.agreementAuditId;
            }
            if (data?.agreementSignatureName && backendPayload.propertyDetails) {
                backendPayload.propertyDetails.primaryContactName = data.agreementSignatureName;
            }
            if (data?.agreementDesignation && backendPayload.propertyDetails) {
                backendPayload.propertyDetails.designation = data.agreementDesignation;
            }

            setContract(backendPayload);
        } catch (err: any) {
            console.error('Failed to load agreement in admin viewer:', err);
            setFetchError(err?.response?.data?.message || err?.message || 'Failed to load official agreement from server.');
        } finally {
            setIsFetchingRemote(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        fetchAgreement();
    }, [isOpen, targetId]);

    // Lock background scrolling when modal is open
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

    if (!isOpen) return null;

    const propDetails = contract?.propertyDetails || {};
    const oreeduEntity = contract?.oreeduEntity || {
        legalName: 'Oreedu Private Limited',
        registeredOffice: '',
        signatoryName: 'Shahoor PK',
        signatoryDesignation: 'CEO',
    };

    const propertyDisplayName = propDetails.propertyName || data?.propertyName || 'Property Operating Entity';
    const fullName = propDetails.primaryContactName || data?.agreementSignatureName || `${data?.ownerFirstName || ''} ${data?.ownerLastName || ''}`.trim() || 'Authorized Signatory';
    const effectiveDateStr = contract?.acceptedAt 
        ? new Date(contract.acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : (data?.agreementAcceptedAt 
            ? new Date(data.agreementAcceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) 
            : 'Pending Electronic Acceptance');

    const auditId = contract?.auditId || data?.agreementAuditId || `ORD-AGR-${(propDetails.propertyId || targetId || 'VERIFIED').slice(-8).toUpperCase()}`;
    const commissionPct = propDetails.platformCommission ?? data?.platformCommission ?? 15;
    const isAccepted = contract?.isAccepted ?? data?.agreementAccepted ?? false;

    const handleDownloadOrPrint = () => {
        const el = document.getElementById('admin-agreement-paper');
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
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                                Oreedu Property Listing &amp; Platform Services Agreement (Admin Viewer)
                            </h2>
                            {isAccepted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <ShieldCheck className="h-3 w-3" /> Signed &amp; Accepted
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Pending Acceptance
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 hidden sm:block">
                            Official Legal Template &bull; {propertyDisplayName}
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
                        <button
                            type="button"
                            onClick={fetchAgreement}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Retry Fetching Agreement</span>
                        </button>
                    </div>
                ) : contract ? (
                    <div 
                        id="admin-agreement-paper"
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
                                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                                    isAccepted 
                                                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200 font-bold'
                                                        : 'text-amber-800 bg-amber-50 border-amber-200 font-bold'
                                                }`}>
                                                    {isAccepted ? '✓ VERIFIED SIGNATURE' : 'PENDING ACCEPTANCE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 text-[11px] space-y-0.5 text-gray-700">
                                        <p><strong>Name:</strong> {fullName}</p>
                                        <p><strong>Designation:</strong> {propDetails.designation || data?.agreementDesignation || 'Owner / Authorized Representative'}</p>
                                        <p><strong>Date:</strong> {effectiveDateStr}</p>
                                        <p className="font-mono text-[10px] text-gray-500"><strong>Audit ID:</strong> {auditId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* ── Fixed Bottom Footer for Admin ── */}
            <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 text-white shrink-0 shadow-2xl w-full flex items-center justify-between">
                <div className="text-xs text-slate-400">
                    Viewing authoritative server record for <strong>{propertyDisplayName}</strong>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer"
                >
                    Close Viewer
                </button>
            </div>
        </div>,
        document.body
    );
}
