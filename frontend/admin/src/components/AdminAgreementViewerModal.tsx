import  { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, CheckCircle2, Download, X, ShieldAlert } from 'lucide-react';
import oreeduStamp from '../assets/oreedu-stamp.jpg';
import oreeduSignature from '../assets/oreedu-signature.jpg';

export interface AdminAgreementData {
    propertyName: string;
    propertyType?: string;
    categoryName?: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    propertyEmail: string;
    propertyPhone: string;
    ownerFirstName: string;
    ownerLastName?: string;
    ownerEmail: string;
    ownerPhone: string;
    platformCommission: number | string;
    gstNumber?: string;
    isGstApplicable?: boolean;
    ownerAadhaarNumber?: string;
    defaultCheckInTime?: string;
    defaultCheckOutTime?: string;
    requestId?: string;
    // Acceptance details
    agreementAccepted?: boolean;
    agreementAcceptedAt?: string;
    agreementVersion?: string;
    agreementDesignation?: string;
    agreementSignatureName?: string;
    agreementAuditId?: string;
}

interface AdminAgreementViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AdminAgreementData;
}

const DEFAULT_AGREEMENT_VERSION = 'v1.0 (India Operations)';
const OREEDU_LEGAL_ENTITY = 'Oreedu Private Limited';
const OREEDU_REGISTERED_OFFICE = 'Oreedu Tech Hub, Beach Road, Calicut, Kerala, India - 673001';

export default function AdminAgreementViewerModal({
    isOpen,
    onClose,
    data
}: AdminAgreementViewerModalProps) {
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

    const fullName = data.agreementSignatureName || `${data.ownerFirstName || ''} ${data.ownerLastName || ''}`.trim() || 'Authorized Signatory';
    const effectiveDateStr = data.agreementAcceptedAt 
        ? new Date(data.agreementAcceptedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Pending Acceptance';

    const auditId = data.agreementAuditId || data.requestId || 'ORD-AGR-AUDIT';
    const version = data.agreementVersion || DEFAULT_AGREEMENT_VERSION;
    const designation = data.agreementDesignation || 'Owner / Authorized Representative';
    const panNumber = data.gstNumber && data.gstNumber.length === 15 
        ? data.gstNumber.substring(2, 12) 
        : (data.ownerAadhaarNumber ? `Linked to Aadhaar (***${data.ownerAadhaarNumber.slice(-4)})` : 'To be provided');

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
                <title>Oreedu Property Listing Agreement - ${data.propertyName || 'Agreement'}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 15mm 12mm 15mm 12mm;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        font-size: 11px;
                        line-height: 1.5;
                        color: #111827;
                        background: #ffffff;
                        margin: 0;
                        padding: 0;
                        text-align: justify;
                    }
                    h1, h2, h3, h4 {
                        margin: 0;
                        color: #0F2942;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8px 0;
                        font-size: 10.5px;
                    }
                    th, td {
                        border: 1px solid #9CA3AF;
                        padding: 5px 8px;
                        vertical-align: top;
                    }
                    th {
                        background-color: #0F2942 !important;
                        color: #ffffff !important;
                        font-weight: bold;
                        text-align: left;
                    }
                    tr:nth-child(even) td {
                        background-color: #F9FAFB !important;
                    }
                    ul {
                        margin: 4px 0;
                        padding-left: 20px;
                    }
                    li {
                        margin-bottom: 3px;
                    }
                    .running-header, .flex.justify-between {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        width: 100% !important;
                        border-bottom: 1px solid #D1D5DB !important;
                        padding-bottom: 5px !important;
                        margin-bottom: 8px !important;
                        font-size: 9.5px !important;
                        color: #6B7280 !important;
                        font-weight: 600 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.05em !important;
                    }
                    .flex { display: flex !important; }
                    .justify-between { justify-content: space-between !important; }
                    .items-center { align-items: center !important; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    .uppercase { text-transform: uppercase; }
                    .italic { font-style: italic; }
                    .font-mono { font-family: monospace; }
                    .p-4 { padding: 8px; }
                    .space-y-2 > * + * { margin-top: 6px; }
                    .space-y-3 > * + * { margin-top: 8px; }
                    .space-y-4 > * + * { margin-top: 10px; }
                    .space-y-8 > * + * { margin-top: 16px; }
                    .border { border: 1px solid #D1D5DB; }
                    .border-b { border-bottom: 1px solid #D1D5DB; }
                    .border-t { border-top: 1px solid #D1D5DB; }
                    .bg-gray-50 { background-color: #F9FAFB !important; }
                    .text-gray-500 { color: #6B7280; }
                    .text-gray-600 { color: #4B5563; }
                    .text-gray-700 { color: #374151; }
                    .text-gray-800 { color: #1F2937; }
                    .text-gray-900 { color: #111827; }
                    .text-teal-800 { color: #115E59; }
                    .text-emerald-700 { color: #047857; }
                    .text-amber-700 { color: #B45309; }
                    .grid { display: grid !important; }
                    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
                    .gap-6 { gap: 16px !important; }
                    .rounded { border-radius: 4px; }
                    img { max-width: 100%; }
                    .mix-blend-multiply { mix-blend-mode: multiply !important; }
                    .print\\:hidden { display: none !important; }
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
                    <div className="p-1 bg-teal-500/20 text-teal-400 rounded-lg">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                                Property Listing Agreement Record &bull; {data.propertyName}
                            </h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                data.agreementAccepted 
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                                    : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}>
                                {data.agreementAccepted ? `✓ Verified (${version})` : '⚠️ Signature Pending'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 hidden sm:block">
                            Audit Certificate ID: {auditId} &bull; Signed: {effectiveDateStr}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadOrPrint}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all shadow-sm cursor-pointer"
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

            {/* ── Full Continuous Document Body (A4 Paper View) ── */}
            <div className="flex-1 overflow-y-auto bg-slate-900/60 p-2 sm:p-4 lg:p-5">
                
                <div 
                    id="admin-agreement-paper" 
                    className="max-w-4xl mx-auto bg-white text-gray-900 shadow-2xl border border-gray-300 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-6 space-y-5 font-sans text-xs leading-relaxed text-justify rounded-sm"
                >
                    {/* Running Header */}
                    <div className="running-header flex items-center justify-between border-b border-gray-200 pb-2 text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                        <span>Oreedu Administration &bull; Legal Compliance</span>
                        <span>OREEDU | PROPERTY LISTING &amp; PLATFORM SERVICES AGREEMENT</span>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2 py-4">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F2942] uppercase font-serif">
                            OREEDU PRIVATE LIMITED
                        </h1>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-tight">
                            PROPERTY LISTING &amp; PLATFORM SERVICES AGREEMENT
                        </h2>
                        <p className="text-xs italic text-gray-600">
                            Electronic Record for Property Onboarding &bull; Oreedu Connect / Oreedu PMS
                        </p>
                    </div>

                    {/* Template Note */}
                    <div className="p-4 bg-gray-50 border border-gray-300 text-xs text-gray-700 leading-normal">
                        <strong>IMPORTANT TEMPLATE NOTE:</strong> This document is drafted as a comprehensive business template for India-based operations. Complete all placeholders, align it with Oreedu&apos;s actual payment flow and commercial model, and obtain Indian legal/tax review before production deployment.
                    </div>

                    {/* Document Field Details Table (Page 1) */}
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
                                    <td className="p-2.5 font-semibold text-teal-800">{version}</td>
                                </tr>
                                <tr className="bg-gray-50/60">
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Effective Date</td>
                                    <td className="p-2.5">Date of electronic acceptance / <strong>{effectiveDateStr}</strong></td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Oreedu Legal Entity</td>
                                    <td className="p-2.5"><strong>{OREEDU_LEGAL_ENTITY}</strong></td>
                                </tr>
                                <tr className="bg-gray-50/60">
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Registered Office</td>
                                    <td className="p-2.5">{OREEDU_REGISTERED_OFFICE}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property Legal / Trade Name</td>
                                    <td className="p-2.5 font-bold text-[#0F2942] bg-teal-50/40">{data.propertyName}</td>
                                </tr>
                                <tr className="bg-gray-50/60">
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property ID</td>
                                    <td className="p-2.5 font-mono font-semibold">{data.requestId || auditId}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Commercial Model</td>
                                    <td className="p-2.5 font-semibold">
                                        As stated in Schedule B ({data.platformCommission}% Platform Commission per confirmed booking)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-200 my-6"></div>

                    {/* Section 1 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            1. Parties, Acceptance and Binding Effect
                        </h3>
                        <p>
                            This Property Listing &amp; Platform Services Agreement (&quot;Agreement&quot;) is entered into between <strong>{OREEDU_LEGAL_ENTITY}</strong>, a company incorporated under the laws of India, having its registered office at <strong>{OREEDU_REGISTERED_OFFICE}</strong> (&quot;Oreedu&quot;), and the hotel, resort, villa, homestay, apartment, accommodation provider or other hospitality establishment identified in Schedule A (&quot;Property&quot;). Oreedu and the Property are each a &quot;Party&quot; and together the &quot;Parties&quot;.
                        </p>
                        <p>
                            The Agreement becomes effective when an authorised representative of the Property affirmatively accepts it through Oreedu Connect, Oreedu PMS, an approved electronic onboarding flow, or another method accepted by Oreedu. The individual accepting confirms that he or she has authority to bind the Property and its operating/legal entity.
                        </p>
                        <p>
                            The Property agrees that its electronic acceptance, together with the applicable agreement version, Property ID, authorised-user account, date/time and other system-generated acceptance records maintained by Oreedu, may constitute evidence of acceptance and formation of this Agreement to the extent permitted by applicable law.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            2. Definitions
                        </h3>
                        <p>
                            For this Agreement: &quot;Platform&quot; means Oreedu&apos;s websites, mobile applications, Oreedu Connect, Oreedu PMS, APIs and related technology/services; &quot;Guest&quot; means an actual or prospective customer; &quot;Booking&quot; means a reservation facilitated, recorded or managed through the Platform; &quot;Property Content&quot; means names, trademarks, images, descriptions, amenities, policies, rates and other material supplied or authorised by the Property; &quot;Commercial Terms&quot; means the commission, fees, payment model and other financial terms in Schedule B or another written order form; and &quot;Applicable Law&quot; means laws, rules and legally binding governmental requirements applicable to the relevant Party, service or transaction.
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            3. Appointment and Scope of Services
                        </h3>
                        <p>
                            The Property appoints Oreedu, on a non-exclusive basis unless expressly stated otherwise in Schedule B, to display and market the Property, facilitate or manage Bookings, provide partner technology and operational tools, and perform related services described in the Platform or applicable commercial documents.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Oreedu may display the Property on Oreedu-owned channels and, where agreed or enabled, distribute or facilitate distribution through approved channels, integrations or marketing partners.</li>
                            <li>Oreedu does not acquire ownership or operational control of the Property by virtue of this Agreement.</li>
                            <li>Unless Oreedu expressly contracts as principal for a specific product, the Property remains responsible for the accommodation and on-property services supplied to Guests.</li>
                        </ul>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            4. Property Eligibility, Authority and Compliance
                        </h3>
                        <p>
                            The Property represents and warrants throughout the Term that it is lawfully entitled to operate, market and sell the accommodation offered through the Platform and that the person administering its Oreedu account is duly authorised.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>The Property shall maintain all licences, registrations, permissions, tax registrations (GSTIN/PAN) and approvals required for its operations.</li>
                            <li>The Property shall comply with applicable hospitality, consumer, safety, fire, food, labour, tax, local-body and other regulatory requirements relevant to its operations.</li>
                            <li>The Property shall promptly notify Oreedu of suspension, cancellation or material restriction of a licence or permission that may affect Guests or Bookings.</li>
                        </ul>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            5. Property Information and Content
                        </h3>
                        <p>
                            The Property is responsible for the accuracy, completeness and currency of all Property Content. It shall not provide misleading photographs, false amenities, inaccurate location information, deceptive room descriptions or other information likely to mislead a Guest.
                        </p>
                        <p>
                            The Property grants Oreedu, during the Term and for a reasonable wind-down/record-retention period, a non-exclusive, worldwide, royalty-free licence to host, reproduce, resize, adapt for technical formatting, display, distribute and use Property Content for operating, promoting and marketing the Property and Platform, subject to this Agreement. The Property confirms that it owns, licenses or otherwise has sufficient rights to provide the Property Content and to grant the foregoing licence.
                        </p>
                    </div>

                    {/* Section 6 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            6. Rates, Taxes, Inventory and Availability
                        </h3>
                        <p>
                            The Property shall maintain accurate rates, taxes, fees, occupancy limits, room/unit inventory, blackout dates, restrictions and availability in the Platform or through its connected systems. Where the Property controls inventory, it bears responsibility for inaccuracies caused by its failure to update or synchronise information in a timely manner.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Rates displayed to Guests must reflect the agreed commercial configuration and applicable mandatory charges.</li>
                            <li>The Property shall not use the Platform to advertise inventory it does not reasonably expect to honour.</li>
                            <li>Rate parity, exclusivity or promotional obligations apply only if expressly stated in Schedule B or a campaign/order form.</li>
                        </ul>
                    </div>

                    {/* Section 7 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            7. Bookings and Property Obligations
                        </h3>
                        <p>
                            A Booking shown as confirmed in accordance with the Platform workflow must be honoured by the Property, subject to fraud controls, force majeure, lawful restrictions and other express terms of this Agreement.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>The Property shall provide the booked room/unit or an equal or better alternative where a substitution is accepted by the Guest.</li>
                            <li>The Property shall not require a Guest to pay an amount inconsistent with the confirmed Booking except for clearly disclosed permitted extras, taxes or Guest-requested services.</li>
                            <li>The Property shall promptly update check-in, cancellation, no-show and other status information required for reconciliation.</li>
                            <li>The Property shall preserve reasonable records supporting disputes, no-shows, damages or additional charges.</li>
                        </ul>
                    </div>

                    {/* Section 8 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            8. Overbooking, Relocation and Property Denial
                        </h3>
                        <p>
                            If the Property cannot honour a confirmed Booking for reasons within its control, it shall immediately notify Oreedu and cooperate in arranging a reasonable remedy. Subject to the applicable Booking terms and law, the Property may be required to provide or fund equivalent or better alternative accommodation, transportation, rate difference and/or other reasonable Guest remediation caused by the Property&apos;s failure.
                        </p>
                        <p>
                            Oreedu may take reasonable customer-protection action in urgent cases and may recover from the Property amounts properly attributable to the Property under the agreed commercial/payment model, subject to supporting records and dispute procedures.
                        </p>
                    </div>

                    {/* Section 9 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            9. Cancellations, No-Shows, Modifications and Refunds
                        </h3>
                        <p>
                            The cancellation/no-show policy applicable to a Booking shall be the policy displayed and accepted at the time of Booking, unless a later change is lawfully agreed with the Guest. The Property shall not retrospectively impose a more restrictive policy.
                        </p>
                        <p>
                            Refunds, waivers and modifications shall follow the applicable Booking policy, payment model and authority controls. Where Oreedu processes a refund attributable to the Property, Oreedu may adjust the relevant settlement in accordance with Schedule B and applicable law.
                        </p>
                    </div>

                    {/* Section 10 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            10. Commission, Fees, Taxes and Commercial Terms
                        </h3>
                        <p>
                            The Property shall pay Oreedu the commission of <strong>{data.platformCommission}%</strong>, subscription, transaction, technology, marketing or other fees stated in Schedule B, an applicable order form, campaign acceptance or other written commercial instrument. Unless expressly stated otherwise, applicable taxes on Oreedu&apos;s fees are additional.
                        </p>
                        <p>
                            The Parties shall issue invoices, credit notes and other tax documents as required by applicable law. Each Party remains responsible for taxes legally imposed on that Party. Nothing in this Agreement is intended to reallocate a statutory tax liability contrary to law.
                        </p>
                    </div>

                    {/* Section 11 - 15 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            11. Guest Payments, Settlements and Reconciliation
                        </h3>
                        <p>
                            The payment model for each Booking may be prepaid/collected through an approved payment provider, pay-at-property, credit-based, or another model identified in Schedule B or the Platform. The Property authorises Oreedu to perform settlements, adjustments and reconciliations consistent with that model.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>The Property shall maintain accurate bank and tax details and promptly report changes through an approved verification process.</li>
                            <li>Oreedu may withhold or adjust amounts reasonably connected with refunds, chargebacks, duplicate payments, fraud, disputed Bookings, contractual deductions or legally required withholding.</li>
                            <li>The Property must raise reconciliation disputes within <strong>30</strong> days after the relevant statement/settlement, with supporting records.</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            12. Chargebacks, Fraud and Payment Disputes
                        </h3>
                        <p>
                            The Parties shall reasonably cooperate on suspected fraud, payment disputes and chargebacks. Responsibility for a chargeback or loss shall depend on the cause, applicable payment-network rules, Booking evidence, the payment model and the Parties&apos; respective acts or omissions. The Property shall not create fictitious Bookings, manipulate transactions, misuse payment credentials, circumvent Platform fees, or encourage Guests to misrepresent transaction facts.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            13. Oreedu Connect / Oreedu PMS Access
                        </h3>
                        <p>
                            Oreedu may provide the Property with accounts and permissions for Oreedu Connect, Oreedu PMS and related tools. Accounts are for authorised business users only.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>The Property shall maintain current authorised-user information and promptly remove users who no longer require access.</li>
                            <li>Credentials, OTPs and access tokens must not be shared with unauthorised persons.</li>
                            <li>The Property is responsible for actions taken through its authorised accounts unless caused by Oreedu&apos;s breach.</li>
                            <li>The Property shall not reverse engineer, interfere with, scrape, overload, introduce malicious code into or attempt unauthorised access to the Platform.</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            14. Guest Experience and Property Standards
                        </h3>
                        <p>
                            The Property shall provide accommodation and services in a professional manner consistent with the listing, confirmed Booking and Applicable Law. It shall maintain reasonable standards of cleanliness, safety, security, hygiene and service. Serious safety, security, discrimination, harassment, fraud or criminal allegations must be escalated immediately through the designated Oreedu channel.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            15. Reviews, Ratings and Platform Integrity
                        </h3>
                        <p>
                            Oreedu may collect and display Guest reviews, ratings and other feedback subject to its then-current review policies. The Property may respond through available tools but shall not threaten, bribe or improperly incentivise Guests to manipulate reviews, nor create or procure fake reviews.
                        </p>
                    </div>

                    {/* Section 16 - 21 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            16. Marketing, Promotions and Discounts
                        </h3>
                        <p>
                            The Property may participate in promotions, coupons, loyalty benefits or marketing campaigns through separate acceptance or campaign terms. Unless expressly authorised, Oreedu personnel and Property personnel may not create binding discounts or financial commitments outside their delegated authority. Where a promotion is co-funded, the contribution and settlement treatment shall be recorded in Schedule B.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            17. Personal Data, Privacy and Security
                        </h3>
                        <p>
                            Each Party shall process personal data in accordance with Applicable Law and only for legitimate purposes connected with Bookings, guest service, fraud prevention, accounting, legal compliance and other properly disclosed purposes. The Parties shall implement reasonable security safeguards appropriate to the nature of the data. Guest information obtained through Oreedu shall not be sold or used for unrelated unsolicited marketing.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            18. Confidentiality &amp; 19. Intellectual Property
                        </h3>
                        <p>
                            Each Party shall protect the other&apos;s non-public commercial, technical, financial and operational information using at least reasonable care. Except for the limited licences expressly granted in this Agreement, each Party retains ownership of its names, trademarks, software, content, data and other intellectual property. No implied transfer of ownership is created.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            20. Service Availability &amp; 21. Suspension, Restriction and Delisting
                        </h3>
                        <p>
                            Oreedu may update, maintain or modify the Platform to improve functionality, security, compliance or business operations. Oreedu may temporarily restrict Bookings, suspend Platform access or delist the Property where reasonably necessary to protect Guests, the Platform or Oreedu, including for suspected fraud, material inaccuracies, repeated failure to honour Bookings, serious safety concerns, or material breach.
                        </p>
                    </div>

                    {/* Section 22 - 27 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            22. Term and Termination
                        </h3>
                        <p>
                            This Agreement begins on the Effective Date and continues until terminated in accordance with this clause. Either Party may terminate for convenience by giving <strong>30</strong> days&apos; written/electronic notice unless Schedule B states a committed term. Either Party may terminate for material breach if the breach is not cured within <strong>15</strong> days after notice. Termination does not automatically cancel existing Guest Bookings; the Property shall honour confirmed Bookings made before the effective termination date.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            23. Consequences of Termination &amp; 24. Representations and Warranties
                        </h3>
                        <p>
                            On termination, outstanding fees, settlements, refunds, chargebacks and other accrued amounts remain payable. Each Party represents that it has authority to enter into this Agreement and that its performance will not knowingly violate Applicable Law or third-party rights.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            25. Indemnity &amp; 26. Limitation of Liability
                        </h3>
                        <p>
                            Subject to Applicable Law, each Party shall indemnify the other Party against third-party claims, losses, damages, penalties and reasonable external costs arising from material breach, negligence, wilful misconduct, or violation of Applicable Law. To the maximum extent permitted by Applicable Law, neither Party shall be liable for indirect, incidental, special or consequential loss. Ordinary contractual claims shall be subject to an aggregate liability cap of <strong>total commissions paid in the preceding 3 months or INR 1,00,000 (whichever is lower)</strong>.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            27. Force Majeure &amp; 28. Complaints, Government Requests and Cooperation
                        </h3>
                        <p>
                            Neither Party shall be liable for delay or failure caused by an event beyond its reasonable control, including natural disasters, epidemic/pandemic restrictions, war, civil disturbance, or governmental action. The Property shall reasonably cooperate with Oreedu in investigating Guest complaints, regulatory inquiries, payment disputes and safety incidents.
                        </p>
                    </div>

                    {/* Section 29 - 34 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            29. Audit and Record Support &amp; 30. Notices
                        </h3>
                        <p>
                            The Property shall maintain reasonable records necessary to verify Bookings, cancellations, no-shows, Guest charges and settlements for at least the period required by Applicable Law or <strong>3</strong> years. Contractual notices may be sent to the registered email/address stated in Schedule A or through Oreedu Connect/PMS.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            31. Assignment and Subcontracting &amp; 32. Relationship of the Parties
                        </h3>
                        <p>
                            The Property may not assign this Agreement without Oreedu&apos;s prior written approval. The Parties are independent contractors. Nothing in this Agreement creates a partnership, franchise, employment, fiduciary relationship or general agency.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            33. Governing Law and Dispute Resolution
                        </h3>
                        <p>
                            This Agreement shall be governed by the laws of India. Before formal proceedings, authorised representatives shall attempt in good faith to resolve a dispute through written escalation for at least <strong>30</strong> days. Any unresolved disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, seated in <strong>Kerala, India</strong>, conducted in the English language by a sole arbitrator, with supervisory jurisdiction in the competent courts of <strong>Kerala, India</strong>.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            34. General Provisions
                        </h3>
                        <p>
                            If a provision is held unenforceable, it shall be modified to the minimum extent necessary or severed without affecting the remainder. This Agreement, together with its schedules, constitutes the agreement between the Parties and supersedes prior discussions concerning that subject matter.
                        </p>
                    </div>

                    {/* Section 35 */}
                    <div className="space-y-3 p-4 bg-gray-50 border border-gray-300">
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">
                            35. Electronic Acceptance Protocol
                        </h3>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            The production acceptance flow should display the agreement version and make the complete Agreement available for viewing/download before acceptance. The acceptance control should not be pre-selected.
                        </p>
                        <div className="space-y-1 pt-1">
                            <h4 className="text-xs font-bold text-gray-900">Recommended acceptance statement:</h4>
                            <p className="italic text-xs text-gray-700 bg-white p-3 border border-gray-200 rounded">
                                &ldquo;By selecting &lsquo;I Agree &amp; Continue&rsquo;, I confirm that I am duly authorised to act on behalf of the Property, that I have read and understood the Oreedu Property Listing &amp; Platform Services Agreement and the applicable Commercial Terms, and that the Property agrees to be bound by them. I confirm that the information submitted for the Property is true and accurate to the best of my knowledge.&rdquo;
                            </p>
                        </div>
                        <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-bold text-gray-900">Recommended acceptance record fields:</h4>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2 font-bold uppercase border-r border-gray-400 w-1/2">Field</th>
                                            <th className="p-2 font-bold uppercase">Record</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Agreement version</td>
                                            <td className="p-2 text-gray-700 font-mono font-semibold">{version}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Property ID / legal entity</td>
                                            <td className="p-2 text-gray-700 font-semibold">{data.requestId || auditId} / {data.propertyName || 'Registered Legal Entity'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Authorised user name / user ID</td>
                                            <td className="p-2 text-gray-700 font-semibold">{fullName} ({data.ownerEmail || data.ownerPhone || 'User ID'})</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Authorised user&apos;s declared designation</td>
                                            <td className="p-2 text-teal-800 font-semibold">{designation}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Acceptance date/time</td>
                                            <td className="p-2 text-gray-700 font-mono font-semibold">{effectiveDateStr}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">IP / session / device evidence</td>
                                            <td className="p-2 text-gray-700 font-mono">[Captured via Web Client Session]</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Agreement document hash or immutable version reference</td>
                                            <td className="p-2 text-gray-700 font-mono text-xs">SHA-256 (Oreedu-Listing-Agr-{auditId})</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2 font-bold text-gray-800 border-r border-gray-300">Acceptance action</td>
                                            <td className="p-2 text-gray-700 font-semibold">
                                                {data.agreementAccepted ? (
                                                    <span className="text-emerald-700 font-bold">✓ &ldquo;I Agree &amp; Continue&rdquo; (Electronically Signed)</span>
                                                ) : (
                                                    <span className="text-amber-700 font-semibold">&ldquo;I Agree &amp; Continue&rdquo; (Pending Property Acceptance)</span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── SCHEDULES A TO F ── */}
                    <div className="pt-8 space-y-8">
                        
                        {/* Schedule A */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule A - Property Details
                            </h3>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Field</th>
                                            <th className="p-2.5 font-bold uppercase">Property Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Legal Entity Name</td>
                                            <td className="p-2.5 font-bold">{data.propertyName || '[● Legal Entity Name]'}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property / Trade Name</td>
                                            <td className="p-2.5 font-bold">{data.propertyName || '[● Trade Name]'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property Type</td>
                                            <td className="p-2.5">{data.propertyType || data.categoryName || 'RESORT'}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property ID</td>
                                            <td className="p-2.5 font-mono font-bold">{data.requestId || auditId}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Registered / Operating Address</td>
                                            <td className="p-2.5">{data.address}, {data.city}, {data.state}, {data.country} - {data.pincode}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">GSTIN / Tax ID</td>
                                            <td className="p-2.5 font-mono font-bold">{data.gstNumber || (data.isGstApplicable ? 'Pending' : 'Unregistered / Not Applicable')}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">PAN / Registration No.</td>
                                            <td className="p-2.5 font-mono font-bold">{panNumber}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Primary Authorised Representative</td>
                                            <td className="p-2.5 font-bold">{fullName}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Designation</td>
                                            <td className="p-2.5 font-semibold text-teal-800">{designation}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Email</td>
                                            <td className="p-2.5">{data.ownerEmail || data.propertyEmail}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Mobile</td>
                                            <td className="p-2.5">{data.ownerPhone || data.propertyPhone}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Bank / Payout Account Reference</td>
                                            <td className="p-2.5 italic text-gray-600">[Stored securely via Oreedu PMS Payout Settings]</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Emergency Contact</td>
                                            <td className="p-2.5">{data.propertyPhone || data.ownerPhone}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Schedule B */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule B - Commercial Terms
                            </h3>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Commercial Item</th>
                                            <th className="p-2.5 font-bold uppercase">Agreed Term</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Commission model / percentage</td>
                                            <td className="p-2.5 font-bold text-[#0F2942] bg-teal-50/40">{data.platformCommission}% per confirmed Booking</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">PMS subscription / technology fee</td>
                                            <td className="p-2.5">Included in platform commercial model</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Payment model</td>
                                            <td className="p-2.5">Prepaid / Pay at Property / Hybrid</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Settlement cycle</td>
                                            <td className="p-2.5">Weekly Settlement / Standard Platform Cycle</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Payment gateway / transaction charges</td>
                                            <td className="p-2.5">As applicable per payment provider integration</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Applicable taxes on Oreedu fees</td>
                                            <td className="p-2.5">As per law (18% Indian GST)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Promotion / co-funding rules</td>
                                            <td className="p-2.5">Standard Platform Promotions / Separate Campaign Acceptance</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Reconciliation dispute window</td>
                                            <td className="p-2.5 font-bold">30 days</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Credit / security deposit, if any</td>
                                            <td className="p-2.5">Nil</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Special commercial conditions</td>
                                            <td className="p-2.5">Standard platform terms</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Schedule C */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule C - Booking, Cancellation &amp; Refund Configuration
                            </h3>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Policy Item</th>
                                            <th className="p-2.5 font-bold uppercase">Configured Rule</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Standard cancellation policy</td>
                                            <td className="p-2.5">As configured in Property Listing / PMS Cancellation Policy</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">No-show policy</td>
                                            <td className="p-2.5">Full booking amount / standard cancellation fee</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Early departure policy</td>
                                            <td className="p-2.5">Subject to property policy / non-refundable remaining nights</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Refund processing responsibility</td>
                                            <td className="p-2.5">Processed via Oreedu Platform Gateway according to policy</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Check-in time</td>
                                            <td className="p-2.5 font-bold">{data.defaultCheckInTime || '14:00 (2:00 PM)'}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Check-out time</td>
                                            <td className="p-2.5 font-bold">{data.defaultCheckOutTime || '11:00 (11:00 AM)'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Child / extra-person policy</td>
                                            <td className="p-2.5">Standard property extra occupancy charges apply</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Pet policy</td>
                                            <td className="p-2.5">As configured in property house rules</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Other mandatory conditions</td>
                                            <td className="p-2.5">Valid Government Issued Photo ID required for all guests at check-in</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Schedule D */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule D - Property Standards &amp; Onboarding Declaration
                            </h3>
                            <div className="p-4 bg-gray-50 border border-gray-300 space-y-2 text-xs">
                                <ul className="list-disc pl-5 space-y-1.5 text-gray-800">
                                    <li>Property information, map location, contacts and room/unit details have been verified.</li>
                                    <li>Rates, taxes, fees, occupancy rules and policies are accurately configured.</li>
                                    <li>The Property has authority to use all photographs, trademarks and listing content supplied to Oreedu.</li>
                                    <li>Required operating licences/registrations are valid and will be maintained.</li>
                                    <li>Authorised users have been identified and instructed on account security.</li>
                                    <li>Payout/tax information has been submitted through the approved verification process.</li>
                                    <li>The Property understands its obligations concerning confirmed Bookings, Guest service, privacy and complaint handling.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Schedule E - Electronic Acceptance Record */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule E - Electronic Acceptance Record (Verified Audit Certificate)
                            </h3>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Acceptance Record</th>
                                            <th className="p-2.5 font-bold uppercase">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Agreement Version</td>
                                            <td className="p-2.5 font-mono font-bold">{version}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property ID</td>
                                            <td className="p-2.5 font-mono font-bold">{data.requestId || auditId}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Property Legal Name</td>
                                            <td className="p-2.5 font-bold">{data.propertyName || 'Property Operating Entity'}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Accepted By</td>
                                            <td className="p-2.5 font-bold">{fullName}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Designation / Authority</td>
                                            <td className="p-2.5 font-semibold text-teal-800">{designation}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">User Account ID</td>
                                            <td className="p-2.5 font-mono">{data.ownerEmail || data.ownerPhone || 'User ID'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Date &amp; Time</td>
                                            <td className="p-2.5 font-semibold">{effectiveDateStr}</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">IP / Session Reference</td>
                                            <td className="p-2.5 font-mono text-gray-600">[Captured via Web Client Session]</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Document Version / Hash</td>
                                            <td className="p-2.5 font-mono text-gray-600">SHA-256 (Oreedu-Listing-Agr-{auditId})</td>
                                        </tr>
                                        <tr className="bg-gray-50/60">
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Acceptance Status</td>
                                            <td className="p-2.5 font-bold">
                                                {data.agreementAccepted ? (
                                                    <span className="text-emerald-700">✓ Accepted &amp; Electronically Signed</span>
                                                ) : (
                                                    <span className="text-amber-700">⚠️ Pending Property Acceptance</span>
                                                )}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-2.5 font-bold text-gray-800 border-r border-gray-300">Audit Record ID</td>
                                            <td className="p-2.5 font-mono font-bold text-teal-800">{auditId}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Schedule F */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-[#0F2942] uppercase tracking-wide">
                                Schedule F - Optional Property-Specific Addendum
                            </h3>
                            <p className="text-xs text-gray-600 italic">
                                Use this schedule for negotiated property-specific terms that have been approved by Oreedu&apos;s authorised commercial/legal approver. Any handwritten or informal alteration outside the approved process is invalid.
                            </p>
                            <div className="border border-gray-400 overflow-hidden">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#0F2942] text-white">
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400 w-1/3">Clause / Subject</th>
                                            <th className="p-2.5 font-bold uppercase border-r border-gray-400">Property-Specific Term</th>
                                            <th className="p-2.5 font-bold uppercase">Approved By / Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="p-2.5 font-semibold text-gray-800 border-r border-gray-300">Standard Terms</td>
                                            <td className="p-2.5 border-r border-gray-300">Standard platform terms apply without custom addendum</td>
                                            <td className="p-2.5">Oreedu Operations / {effectiveDateStr}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

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
                                            {OREEDU_LEGAL_ENTITY}
                                        </p>
                                    </div>

                                    {/* Seal Stamp & Signature Display */}
                                    <div className="flex items-center justify-between py-1 min-h-[90px] relative">
                                        <div className="space-y-1 z-10">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Authorised Signature</p>
                                            <img 
                                                src={oreeduSignature} 
                                                alt="Oreedu Authorised Signature" 
                                                className="h-16 w-auto object-contain max-w-[140px] mix-blend-multiply"
                                                style={{ mixBlendMode: 'multiply' }}
                                            />
                                        </div>
                                        <div className="text-right relative">
                                            <img 
                                                src={oreeduStamp} 
                                                alt="Oreedu Private Limited Official Stamp" 
                                                className="h-28 w-28 sm:h-32 sm:w-32 object-contain inline-block transform rotate-[10deg] mix-blend-multiply"
                                                style={{ transform: 'rotate(10deg)', marginTop: '-36px', marginBottom: '-12px', mixBlendMode: 'multiply' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 text-xs space-y-0.5 text-gray-700">
                                        <p><strong>Signatory Name:</strong> Shahoor PK</p>
                                        <p><strong>Designation:</strong> CEO</p>
                                        <p><strong>Entity:</strong> Oreedu Private Limited, Calicut, India</p>
                                    </div>
                                </div>

                                {/* Right Column: Property Entity */}
                                <div className="p-4 bg-gray-50 border border-gray-300 rounded space-y-3 relative">
                                    <div className="border-b border-gray-300 pb-2">
                                        <p className="text-xs font-bold text-[#0F2942] uppercase tracking-wide">
                                            For and on behalf of:
                                        </p>
                                        <p className="text-sm font-black text-gray-900">
                                            {data.propertyName || 'Property Operating Entity'}
                                        </p>
                                    </div>

                                    {/* Property Digital Signature Display */}
                                    <div className="flex flex-col justify-center py-1 min-h-[90px] space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Property Authorised Signature</p>
                                        <div className="p-2.5 bg-white border border-dashed border-teal-600 rounded text-center">
                                            <p className="font-serif italic text-lg text-slate-800 font-bold tracking-wide">
                                                {fullName}
                                            </p>
                                            <p className="text-[10px] text-teal-700 font-mono font-bold mt-0.5">
                                                {data.agreementAccepted ? `[Digitally Signed & Verified - ${auditId}]` : `[Pending Electronic Signing]`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 text-xs space-y-0.5 text-gray-700">
                                        <p><strong>Signatory Name:</strong> {fullName}</p>
                                        <p><strong>Declared Designation:</strong> {designation}</p>
                                        <p><strong>Timestamp:</strong> {effectiveDateStr}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Implementation Checklist */}
                        <div className="space-y-3 border-t border-gray-300 pt-6">
                            <h3 className="text-sm font-bold text-[#0F2942] uppercase tracking-wide">
                                Implementation Checklist for Oreedu Product Team
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                                <li>Require acceptance by an authorised property user before first operational access or before activation.</li>
                                <li>Display agreement version and links to View Agreement and Download Agreement.</li>
                                <li>Do not use a pre-ticked acceptance box.</li>
                                <li>Capture a durable acceptance event and retain the exact agreement version accepted.</li>
                                <li>Generate an acceptance receipt visible to the Property in Oreedu Connect/PMS.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Document Footer */}
                    <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-500 font-semibold tracking-wider uppercase">
                        Confidential &bull; Oreedu Property Listing &amp; Platform Services Agreement &bull; Electronic Compliance Record
                    </div>
                </div>
            </div>

            {/* ── Modal Footer ── */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-t border-slate-800 shrink-0 flex items-center justify-between gap-3 text-white print:hidden">
                <div className="text-xs text-slate-400">
                    {data.agreementAccepted ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-4 w-4" /> Valid electronic agreement verified for this property.
                        </span>
                    ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1.5 text-xs">
                            <ShieldAlert className="h-4 w-4" /> Electronic agreement must be signed before approval can be granted.
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer"
                >
                    Close
                </button>
            </div>
        </div>,
        document.body
    );
}
