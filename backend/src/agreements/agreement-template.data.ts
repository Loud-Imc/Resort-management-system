export const AGREEMENT_VERSION = 'v1.0 (India Operations)';

export const OREEDU_CORPORATE_INFO = {
    legalName: 'Oreedu Private Limited',
    registeredOffice: 'Oreedu Tech Hub, Beach Road, Calicut, Kerala, India - 673001',
    signatoryName: 'Shahoor PK',
    signatoryDesignation: 'CEO',
    stampUrl: '/assets/oreedu-stamp.jpg',
    signatureUrl: '/assets/oreedu-signature.jpg',
};

export interface AgreementSection {
    id: number;
    title: string;
    paragraphs: string[];
    bulletPoints?: string[];
}

export const AGREEMENT_SECTIONS: AgreementSection[] = [
    {
        id: 1,
        title: '1. Parties, Acceptance and Binding Effect',
        paragraphs: [
            `This Property Listing & Platform Services Agreement ("Agreement") is entered into between ${OREEDU_CORPORATE_INFO.legalName}, a company incorporated under the laws of India, having its registered office at ${OREEDU_CORPORATE_INFO.registeredOffice} ("Oreedu"), and the hotel, resort, villa, homestay, apartment, accommodation provider or other hospitality establishment identified in Schedule A ("Property"). Oreedu and the Property are each a "Party" and together the "Parties".`,
            `The Agreement becomes effective when an authorised representative of the Property affirmatively accepts it through Oreedu Connect, Oreedu PMS, an approved electronic onboarding flow, or another method accepted by Oreedu. The individual accepting confirms that he or she has authority to bind the Property and its operating/legal entity.`,
            `The Property agrees that its electronic acceptance, together with the applicable agreement version, Property ID, authorised-user account, date/time and other system-generated acceptance records maintained by Oreedu, may constitute evidence of acceptance and formation of this Agreement to the extent permitted by applicable law.`
        ]
    },
    {
        id: 2,
        title: '2. Definitions',
        paragraphs: [
            `For this Agreement: "Platform" means Oreedu's websites, mobile applications, Oreedu Connect, Oreedu PMS, APIs and related technology/services; "Guest" means an actual or prospective customer; "Booking" means a reservation facilitated, recorded or managed through the Platform; "Property Content" means names, trademarks, images, descriptions, amenities, policies, rates and other material supplied or authorised by the Property; "Commercial Terms" means the commission, fees, payment model and other financial terms in Schedule B or another written order form; and "Applicable Law" means laws, rules and legally binding governmental requirements applicable to the relevant Party, service or transaction.`
        ]
    },
    {
        id: 3,
        title: '3. Appointment and Scope of Services',
        paragraphs: [
            `The Property appoints Oreedu, on a non-exclusive basis unless expressly stated otherwise in Schedule B, to display and market the Property, facilitate or manage Bookings, provide partner technology and operational tools, and perform related services described in the Platform or applicable commercial documents.`
        ],
        bulletPoints: [
            `Oreedu may display the Property on Oreedu-owned channels and, where agreed or enabled, distribute or facilitate distribution through approved channels, integrations or marketing partners.`,
            `Oreedu does not acquire ownership or operational control of the Property by virtue of this Agreement.`,
            `Unless Oreedu expressly contracts as principal for a specific product, the Property remains responsible for the accommodation and on-property services supplied to Guests.`
        ]
    },
    {
        id: 4,
        title: '4. Property Eligibility, Authority and Compliance',
        paragraphs: [
            `The Property represents and warrants throughout the Term that it is lawfully entitled to operate, market and sell the accommodation offered through the Platform and that the person administering its Oreedu account is duly authorised.`
        ],
        bulletPoints: [
            `The Property shall maintain all licences, registrations, permissions, tax registrations (GSTIN/PAN) and approvals required for its operations.`,
            `The Property shall comply with applicable hospitality, consumer, safety, fire, food, labour, tax, local-body and other regulatory requirements relevant to its operations.`,
            `The Property shall promptly notify Oreedu of suspension, cancellation or material restriction of a licence or permission that may affect Guests or Bookings.`
        ]
    },
    {
        id: 5,
        title: '5. Property Information and Content',
        paragraphs: [
            `The Property is responsible for the accuracy, completeness and currency of all Property Content. It shall not provide misleading photographs, false amenities, inaccurate location information, deceptive room descriptions or other information likely to mislead a Guest.`,
            `The Property grants Oreedu, during the Term and for a reasonable wind-down/record-retention period, a non-exclusive, worldwide, royalty-free licence to host, reproduce, resize, adapt for technical formatting, display, distribute and use Property Content for operating, promoting and marketing the Property and Platform, subject to this Agreement. The Property confirms that it owns, licenses or otherwise has sufficient rights to provide the Property Content and to grant the foregoing licence.`
        ]
    },
    {
        id: 6,
        title: '6. Rates, Taxes, Inventory and Availability',
        paragraphs: [
            `The Property shall maintain accurate rates, taxes, fees, occupancy limits, room/unit inventory, blackout dates, restrictions and availability in the Platform or through its connected systems. Where the Property controls inventory, it bears responsibility for inaccuracies caused by its failure to update or synchronise information in a timely manner.`
        ],
        bulletPoints: [
            `Rates displayed to Guests must reflect the agreed commercial configuration and applicable mandatory charges.`,
            `The Property shall not use the Platform to advertise inventory it does not reasonably expect to honour.`,
            `Rate parity, exclusivity or promotional obligations apply only if expressly stated in Schedule B or a campaign/order form.`
        ]
    },
    {
        id: 7,
        title: '7. Bookings and Property Obligations',
        paragraphs: [
            `A Booking shown as confirmed in accordance with the Platform workflow must be honoured by the Property, subject to fraud controls, force majeure, lawful restrictions and other express terms of this Agreement.`
        ],
        bulletPoints: [
            `The Property shall provide the booked room/unit or an equal or better alternative where a substitution is accepted by the Guest.`,
            `The Property shall not require a Guest to pay an amount inconsistent with the confirmed Booking except for clearly disclosed permitted extras, taxes or Guest-requested services.`,
            `The Property shall promptly update check-in, cancellation, no-show and other status information required for reconciliation.`,
            `The Property shall preserve reasonable records supporting disputes, no-shows, damages or additional charges.`
        ]
    },
    {
        id: 8,
        title: '8. Overbooking, Relocation and Property Denial',
        paragraphs: [
            `If the Property cannot honour a confirmed Booking for reasons within its control, it shall immediately notify Oreedu and cooperate in arranging a reasonable remedy. Subject to the applicable Booking terms and law, the Property may be required to provide or fund equivalent or better alternative accommodation, transportation, rate difference and/or other reasonable Guest remediation caused by the Property's failure.`,
            `Oreedu may take reasonable customer-protection action in urgent cases and may recover from the Property amounts properly attributable to the Property under the agreed commercial/payment model, subject to supporting records and dispute procedures.`
        ]
    },
    {
        id: 9,
        title: '9. Cancellations, No-Shows, Modifications and Refunds',
        paragraphs: [
            `The cancellation/no-show policy applicable to a Booking shall be the policy displayed and accepted at the time of Booking, unless a later change is lawfully agreed with the Guest. The Property shall not retrospectively impose a more restrictive policy.`,
            `Refunds, waivers and modifications shall follow the applicable Booking policy, payment model and authority controls. Where Oreedu processes a refund attributable to the Property, Oreedu may adjust the relevant settlement in accordance with Schedule B and applicable law.`
        ]
    },
    {
        id: 10,
        title: '10. Commission, Fees, Taxes and Commercial Terms',
        paragraphs: [
            `The Property shall pay Oreedu the commission agreed in Schedule B, subscription, transaction, technology, marketing or other fees stated in Schedule B, an applicable order form, campaign acceptance or other written commercial instrument. Unless expressly stated otherwise, applicable taxes on Oreedu's fees are additional.`,
            `The Parties shall issue invoices, credit notes and other tax documents as required by applicable law. Each Party remains responsible for taxes legally imposed on that Party. Nothing in this Agreement is intended to reallocate a statutory tax liability contrary to law.`
        ]
    },
    {
        id: 11,
        title: '11. Guest Payments, Settlements and Reconciliation',
        paragraphs: [
            `The payment model for each Booking may be prepaid/collected through an approved payment provider, pay-at-property, credit-based, or another model identified in Schedule B or the Platform. The Property authorises Oreedu to perform settlements, adjustments and reconciliations consistent with that model.`
        ],
        bulletPoints: [
            `The Property shall maintain accurate bank and tax details and promptly report changes through an approved verification process.`,
            `Oreedu may withhold or adjust amounts reasonably connected with refunds, chargebacks, duplicate payments, fraud, disputed Bookings, contractual deductions or legally required withholding.`,
            `The Property must raise reconciliation disputes within 30 days after the relevant statement/settlement, with supporting records.`
        ]
    },
    {
        id: 12,
        title: '12. Chargebacks, Fraud and Payment Disputes',
        paragraphs: [
            `The Parties shall reasonably cooperate on suspected fraud, payment disputes and chargebacks. Responsibility for a chargeback or loss shall depend on the cause, applicable payment-network rules, Booking evidence, the payment model and the Parties' respective acts or omissions. The Property shall not create fictitious Bookings, manipulate transactions, misuse payment credentials, circumvent Platform fees, or encourage Guests to misrepresent transaction facts.`
        ]
    },
    {
        id: 13,
        title: '13. Oreedu Connect / Oreedu PMS Access',
        paragraphs: [
            `Oreedu may provide the Property with accounts and permissions for Oreedu Connect, Oreedu PMS and related tools. Accounts are for authorised business users only.`
        ],
        bulletPoints: [
            `The Property shall maintain current authorised-user information and promptly remove users who no longer require access.`,
            `Credentials, OTPs and access tokens must not be shared with unauthorised persons.`,
            `The Property is responsible for actions taken through its authorised accounts unless caused by Oreedu's breach.`,
            `The Property shall not reverse engineer, interfere with, scrape, overload, introduce malicious code into or attempt unauthorised access to the Platform.`
        ]
    },
    {
        id: 14,
        title: '14. Guest Experience and Property Standards',
        paragraphs: [
            `The Property shall provide accommodation and services in a professional manner consistent with the listing, confirmed Booking and Applicable Law. It shall maintain reasonable standards of cleanliness, safety, security, hygiene and service. Serious safety, security, discrimination, harassment, fraud or criminal allegations must be escalated immediately through the designated Oreedu channel.`
        ]
    },
    {
        id: 15,
        title: '15. Reviews, Ratings and Platform Integrity',
        paragraphs: [
            `Oreedu may collect and display Guest reviews, ratings and other feedback subject to its then-current review policies. The Property may respond through available tools but shall not threaten, bribe or improperly incentivise Guests to manipulate reviews, nor create or procure fake reviews.`
        ]
    },
    {
        id: 16,
        title: '16. Marketing, Promotions and Discounts',
        paragraphs: [
            `The Property may participate in promotions, coupons, loyalty benefits or marketing campaigns through separate acceptance or campaign terms. Unless expressly authorised, Oreedu personnel and Property personnel may not create binding discounts or financial commitments outside their delegated authority. Where a promotion is co-funded, the contribution and settlement treatment shall be recorded in Schedule B.`
        ]
    },
    {
        id: 17,
        title: '17. Personal Data, Privacy and Security',
        paragraphs: [
            `Each Party shall process personal data in accordance with Applicable Law and only for legitimate purposes connected with Bookings, guest service, fraud prevention, accounting, legal compliance and other properly disclosed purposes. The Parties shall implement reasonable security safeguards appropriate to the nature of the data. Guest information obtained through Oreedu shall not be sold or used for unrelated unsolicited marketing.`
        ]
    },
    {
        id: 18,
        title: '18. Confidentiality & 19. Intellectual Property',
        paragraphs: [
            `Each Party shall protect the other's non-public commercial, technical, financial and operational information using at least reasonable care. Except for the limited licences expressly granted in this Agreement, each Party retains ownership of its names, trademarks, software, content, data and other intellectual property. No implied transfer of ownership is created.`
        ]
    },
    {
        id: 20,
        title: '20. Service Availability & 21. Suspension, Restriction and Delisting',
        paragraphs: [
            `Oreedu may update, maintain or modify the Platform to improve functionality, security, compliance or business operations. Oreedu may temporarily restrict Bookings, suspend Platform access or delist the Property where reasonably necessary to protect Guests, the Platform or Oreedu, including for suspected fraud, material inaccuracies, repeated failure to honour Bookings, serious safety concerns, or material breach.`
        ]
    },
    {
        id: 22,
        title: '22. Term and Termination',
        paragraphs: [
            `This Agreement begins on the Effective Date and continues until terminated in accordance with this clause. Either Party may terminate for convenience by giving 30 days' written/electronic notice unless Schedule B states a committed term. Either Party may terminate for material breach if the breach is not cured within 15 days after notice. Termination does not automatically cancel existing Guest Bookings; the Property shall honour confirmed Bookings made before the effective termination date.`
        ]
    },
    {
        id: 23,
        title: '23. Consequences of Termination & 24. Representations and Warranties',
        paragraphs: [
            `On termination, outstanding fees, settlements, refunds, chargebacks and other accrued amounts remain payable. Each Party represents that it has authority to enter into this Agreement and that its performance will not knowingly violate Applicable Law or third-party rights.`
        ]
    },
    {
        id: 25,
        title: '25. Indemnity & 26. Limitation of Liability',
        paragraphs: [
            `Subject to Applicable Law, each Party shall indemnify the other Party against third-party claims, losses, damages, penalties and reasonable external costs arising from material breach, negligence, wilful misconduct, or violation of Applicable Law. To the maximum extent permitted by Applicable Law, neither Party shall be liable for indirect, incidental, special or consequential loss. Ordinary contractual claims shall be subject to an aggregate liability cap of total commissions paid in the preceding 3 months or INR 1,00,000 (whichever is lower).`
        ]
    },
    {
        id: 27,
        title: '27. Force Majeure & 28. Complaints, Government Requests and Cooperation',
        paragraphs: [
            `Neither Party shall be liable for delay or failure caused by an event beyond its reasonable control, including natural disasters, epidemic/pandemic restrictions, war, civil disturbance, or governmental action. The Property shall reasonably cooperate with Oreedu in investigating Guest complaints, regulatory inquiries, payment disputes and safety incidents.`
        ]
    },
    {
        id: 29,
        title: '29. Audit and Record Support & 30. Notices',
        paragraphs: [
            `The Property shall maintain reasonable records necessary to verify Bookings, cancellations, no-shows, Guest charges and settlements for at least the period required by Applicable Law or 3 years. Contractual notices may be sent to the registered email/address stated in Schedule A or through Oreedu Connect/PMS.`
        ]
    },
    {
        id: 31,
        title: '31. Assignment and Subcontracting & 32. Relationship of the Parties',
        paragraphs: [
            `The Property may not assign this Agreement without Oreedu's prior written approval. The Parties are independent contractors. Nothing in this Agreement creates a partnership, franchise, employment, fiduciary relationship or general agency.`
        ]
    },
    {
        id: 33,
        title: '33. Governing Law and Dispute Resolution',
        paragraphs: [
            `This Agreement shall be governed by the laws of India. Before formal proceedings, authorised representatives shall attempt in good faith to resolve a dispute through written escalation for at least 30 days. Any unresolved disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, seated in Kerala, India, conducted in the English language by a sole arbitrator, with supervisory jurisdiction in the competent courts of Kerala, India.`
        ]
    },
    {
        id: 34,
        title: '34. General Provisions',
        paragraphs: [
            `If a provision is held unenforceable, it shall be modified to the minimum extent necessary or severed without affecting the remainder. This Agreement, together with its schedules, constitutes the agreement between the Parties and supersedes prior discussions concerning that subject matter.`
        ]
    },
    {
        id: 35,
        title: '35. Electronic Acceptance Protocol',
        paragraphs: [
            `The production acceptance flow should display the agreement version and make the complete Agreement available for viewing/download before acceptance. The acceptance control should not be pre-selected.`
        ]
    }
];

export interface BuildAgreementOptions {
    propertyName: string;
    propertyType?: string;
    categoryName?: string;
    address: string;
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
    // Acceptance details
    agreementAccepted?: boolean;
    agreementAcceptedAt?: string;
    agreementVersion?: string;
    agreementDesignation?: string;
    agreementSignatureName?: string;
    agreementAuditId?: string;
}

export function buildAgreementContractPayload(options: BuildAgreementOptions) {
    const fullName = options.agreementSignatureName || 
        `${options.ownerFirstName || ''} ${options.ownerLastName || ''}`.trim() || 
        'Authorized Signatory';

    const effectiveDateStr = options.agreementAcceptedAt 
        ? new Date(options.agreementAcceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const auditId = options.agreementAuditId || 
        options.requestId || 
        options.propertyId || 
        `ORD-AGR-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const panNumber = options.gstNumber && options.gstNumber.length === 15 
        ? options.gstNumber.substring(2, 12) 
        : (options.ownerAadhaarNumber ? `Linked to Aadhaar (***${options.ownerAadhaarNumber.slice(-4)})` : 'To be provided');

    const fullAddress = [options.address, options.city, options.state, options.country]
        .filter(Boolean)
        .join(', ') + (options.pincode ? ` - ${options.pincode}` : '');

    const commissionPct = options.platformCommission ?? 15;
    const version = options.agreementVersion || AGREEMENT_VERSION;
    const designation = options.agreementDesignation || 'Owner / Proprietor';
    const isAccepted = Boolean(options.agreementAccepted);

    return {
        agreementVersion: version,
        isAccepted,
        acceptedAt: options.agreementAcceptedAt || null,
        auditId,
        oreeduEntity: OREEDU_CORPORATE_INFO,
        propertyDetails: {
            propertyId: options.requestId || options.propertyId || auditId,
            propertyName: options.propertyName || 'Property Operating Entity',
            propertyType: options.propertyType || options.categoryName || 'RESORT',
            address: fullAddress || options.address || 'Address on record',
            gstNumber: options.gstNumber || (options.isGstApplicable ? 'Pending' : 'Unregistered / Not Applicable'),
            panNumber,
            primaryContactName: fullName,
            designation,
            email: options.ownerEmail || options.propertyEmail || '',
            phone: options.ownerPhone || options.propertyPhone || '',
            platformCommission: commissionPct,
            checkInTime: options.defaultCheckInTime || '14:00 (2:00 PM)',
            checkOutTime: options.defaultCheckOutTime || '11:00 (11:00 AM)',
        },
        sections: AGREEMENT_SECTIONS,
        schedules: {
            scheduleA: [
                { field: 'Legal Entity Name', value: options.propertyName || '[● Legal Entity Name]' },
                { field: 'Property / Trade Name', value: options.propertyName || '[● Trade Name]' },
                { field: 'Property Type', value: options.propertyType || options.categoryName || 'RESORT' },
                { field: 'Property ID', value: options.requestId || options.propertyId || auditId },
                { field: 'Registered / Operating Address', value: fullAddress },
                { field: 'GSTIN / Tax ID', value: options.gstNumber || (options.isGstApplicable ? 'Pending' : 'Unregistered / Not Applicable') },
                { field: 'PAN / Registration No.', value: panNumber },
                { field: 'Primary Authorised Representative', value: fullName },
                { field: 'Designation', value: designation },
                { field: 'Email', value: options.ownerEmail || options.propertyEmail || '' },
                { field: 'Mobile', value: options.ownerPhone || options.propertyPhone || '' },
                { field: 'Bank / Payout Account Reference', value: '[Stored securely via Oreedu PMS Payout Settings]' },
                { field: 'Emergency Contact', value: options.propertyPhone || options.ownerPhone || '' }
            ],
            scheduleB: [
                { item: 'Commission model / percentage', term: `${commissionPct}% per confirmed Booking` },
                { item: 'PMS subscription / technology fee', term: 'Included in platform commercial model' },
                { item: 'Payment model', term: 'Prepaid / Pay at Property / Hybrid' },
                { item: 'Settlement cycle', term: 'Weekly Settlement / Standard Platform Cycle' },
                { item: 'Payment gateway / transaction charges', term: 'As applicable per payment provider integration' },
                { item: 'Applicable taxes on Oreedu fees', term: 'As per law (18% Indian GST)' },
                { item: 'Promotion / co-funding rules', term: 'Standard Platform Promotions / Separate Campaign Acceptance' },
                { item: 'Reconciliation dispute window', term: '30 days' },
                { item: 'Credit / security deposit, if any', term: 'Nil' },
                { item: 'Special commercial conditions', term: 'Standard platform terms' }
            ],
            scheduleC: [
                { policyItem: 'Standard cancellation policy', configuredRule: 'As configured in Property Listing / PMS Cancellation Policy' },
                { policyItem: 'No-show policy', configuredRule: 'Full booking amount / standard cancellation fee' },
                { policyItem: 'Early departure policy', configuredRule: 'Subject to property policy / non-refundable remaining nights' },
                { policyItem: 'Refund processing responsibility', configuredRule: 'Processed via Oreedu Platform Gateway according to policy' },
                { policyItem: 'Check-in time', configuredRule: options.defaultCheckInTime || '14:00 (2:00 PM)' },
                { policyItem: 'Check-out time', configuredRule: options.defaultCheckOutTime || '11:00 (11:00 AM)' },
                { policyItem: 'Child / extra-person policy', configuredRule: 'Standard property extra occupancy charges apply' },
                { policyItem: 'Pet policy', configuredRule: 'As configured in property house rules' },
                { policyItem: 'Other mandatory conditions', configuredRule: 'Valid Government Issued Photo ID required for all guests at check-in' }
            ],
            scheduleE: [
                { field: 'Agreement version', record: version },
                { field: 'Property ID / legal entity', record: `${options.requestId || options.propertyId || auditId} / ${options.propertyName || 'Registered Legal Entity'}` },
                { field: 'Authorised user name / user ID', record: `${fullName} (${options.ownerEmail || options.ownerPhone || 'User ID'})` },
                { field: "Authorised user's declared designation", record: designation },
                { field: 'Acceptance date/time', record: `${effectiveDateStr} (Live System Timestamp)` },
                { field: 'IP / session / device evidence', record: '[Captured via Web / Mobile Client Session]' },
                { field: 'Agreement document hash or immutable version reference', record: `SHA-256 (Oreedu-Listing-Agr-${auditId})` },
                { field: 'Acceptance action', record: isAccepted ? '✓ "I Agree & Continue" (Confirmed & Verified)' : '"I Agree & Continue" (Pending Affirmative Click)' }
            ],
            scheduleF: [
                { subject: 'Standard Terms', customTerm: 'Standard platform terms apply without custom addendum', approvedBy: `Oreedu Operations / ${effectiveDateStr}` }
            ]
        }
    };
}
