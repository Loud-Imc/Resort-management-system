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
        platformCommission: number;
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

export const DRAFT_STORAGE_KEY = 'oreedu_property_reg_draft_v1';
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

        // Check if draft has expired
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
    if (!timestamp) return 'recently';
    const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);

    if (elapsedSeconds < 60) {
        return 'just now';
    }
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) {
        return `${elapsedMinutes} min${elapsedMinutes > 1 ? 's' : ''} ago`;
    }
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
        return `${elapsedHours} hr${elapsedHours > 1 ? 's' : ''} ago`;
    }
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays} day${elapsedDays > 1 ? 's' : ''} ago`;
};
