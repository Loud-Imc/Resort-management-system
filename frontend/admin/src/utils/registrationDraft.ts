export interface RegistrationDraftData {
    formData: {
        ownerFirstName: string;
        ownerLastName: string;
        ownerEmail: string;
        ownerPhone: string;
        ownerPassword?: string;
        ownerAadhaarNumber: string;
        ownerAadhaarImage: string;
        ownerAadhaarImageBack: string;
        licenceImage: string;
        documents: string[];
        isGstApplicable: boolean;
        gstNumber: string;
        propertyName: string;
        propertyDescription: string;
        propertyType: string;
        categoryId: string;
        address: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
        propertyPhone: string;
        propertyEmail: string;
        googleMapsLink: string;
        latitude: string;
        longitude: string;
        platformCommission: number | string;
        addedById?: string;
        marketingCommission?: number | string;
    };
    step: number;
    isPhoneVerified: boolean;
    verifiedPhone?: string;
    isCommissionVerified: boolean;
    verifiedCommissionPhone?: string;
    documentExpiry: Record<string, string>;
    selectedExistingOwner?: any | null;
    lastSavedAt: number;
}

export const DRAFT_STORAGE_KEY = 'oreedu_admin_property_reg_draft_v1';
export const DRAFT_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Hours

export const saveRegistrationDraft = (
    data: Omit<RegistrationDraftData, 'lastSavedAt'>
): void => {
    try {
        const draft: RegistrationDraftData = {
            ...data,
            lastSavedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
        console.warn('Failed to save registration draft to localStorage:', e);
    }
};

export const loadRegistrationDraft = (): RegistrationDraftData | null => {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return null;

        const draft: RegistrationDraftData = JSON.parse(raw);
        if (!draft || typeof draft !== 'object') return null;

        if (draft.lastSavedAt && Date.now() - draft.lastSavedAt > DRAFT_EXPIRY_MS) {
            clearRegistrationDraft();
            return null;
        }

        return draft;
    } catch (e) {
        console.warn('Failed to parse registration draft from localStorage:', e);
        return null;
    }
};

export const clearRegistrationDraft = (): void => {
    try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear registration draft from localStorage:', e);
    }
};

export const isDraftMeaningful = (draft: RegistrationDraftData): boolean => {
    if (!draft || !draft.formData) return false;
    const { ownerFirstName, ownerLastName, ownerEmail, ownerPhone, propertyName, address, city } = draft.formData;
    return Boolean(
        draft.isPhoneVerified ||
        (ownerPhone && ownerPhone.trim().length > 3) ||
        (ownerFirstName && ownerFirstName.trim()) ||
        (ownerLastName && ownerLastName.trim()) ||
        (ownerEmail && ownerEmail.trim()) ||
        (propertyName && propertyName.trim()) ||
        (address && address.trim()) ||
        (city && city.trim()) ||
        draft.step > 1
    );
};

export const formatDraftTimeAgo = (timestamp: number): string => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};
