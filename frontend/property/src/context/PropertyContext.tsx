import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { type Property } from '../types/property';

interface PropertyContextType {
    properties: Property[];
    selectedProperty: Property | null;
    setSelectedProperty: (property: Property | null) => void;
    isLoading: boolean;
    refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchProperties = async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);

            // 1. Fetch approved / live properties (pass limit=5000 so full portfolio is retrieved)
            let approvedList: Property[] = [];
            try {
                const response = await api.get<any>('/properties/admin/all', {
                    params: { limit: 5000 }
                });
                approvedList = response.data?.data || [];
            } catch (err) {
                console.error('Failed to fetch approved properties:', err);
            }

            // 2. ALWAYS fetch pending / rejected property onboarding requests for this owner
            let requestList: Property[] = [];
            try {
                const reqRes = await api.get<any>('/properties/requests/my');
                const requests = reqRes.data || [];

                const approvedIds = new Set(approvedList.map((p: any) => p.id));
                const approvedNames = new Set(approvedList.map((p: any) => p.name?.trim().toLowerCase()));

                requestList = requests
                    .filter((req: any) => {
                        // Skip if already in approved properties list
                        if (req.propertyId && approvedIds.has(req.propertyId)) {
                            return false;
                        }
                        if (req.status === 'APPROVED' && approvedNames.has(req.name?.trim().toLowerCase())) {
                            return false;
                        }
                        return true;
                    })
                    .map((req: any) => {
                        const details = req.details || {};
                        return {
                            id: req.id,
                            name: req.name,
                            slug: 'pending-request-' + req.id,
                            status: req.status, // 'PENDING' | 'REJECTED'
                            reason: req.reason || null,
                            isActive: false,
                            isVerified: false,
                            isRequest: true, // Custom UI flag
                            type: details.propertyType || details.type || req.type || 'RESORT',
                            city: details.city || '',
                            state: details.state || '',
                            country: details.country || 'India',
                            address: details.address || req.location || '',
                            pincode: details.pincode || '',
                            phone: req.ownerPhone || details.propertyPhone || '',
                            email: req.ownerEmail || details.propertyEmail || '',
                            coverImage: details.coverImage || details.images?.[0] || '',
                            images: details.images || [],
                            details: details,
                            documentDetails: details.documentDetails || {
                                agreementAccepted: Boolean(details.agreementAccepted),
                                agreementAcceptedAt: details.agreementAcceptedAt || null,
                                agreementVersion: details.agreementVersion || 'v1.0',
                            },
                        } as unknown as Property;
                    });
            } catch (reqErr) {
                console.error('Failed to fetch requests:', reqErr);
            }

            let propertiesList = [...approvedList, ...requestList];

            const storedId = localStorage.getItem('property_selectedPropertyId');
            let found: Property | null = storedId
                ? (propertiesList.find((p: any) => p.id === storedId) || null)
                : null;

            // Direct fallback lookup: If impersonating a specific property that was not in the initial list
            if (storedId && !found && propertiesList.length > 0) {
                try {
                    const singleRes = await api.get<any>(`/properties/id/${storedId}`);
                    if (singleRes.data) {
                        const targetProp = singleRes.data as Property;
                        found = targetProp;
                        propertiesList = [targetProp, ...propertiesList];
                    }
                } catch (singleErr) {
                    console.error('Failed to fetch target property directly:', singleErr);
                }
            }

            setProperties(propertiesList);

            if (found) {
                setSelectedProperty(found);
            } else if (propertiesList.length > 0) {
                // Auto-lock to first property/request if no stored property found
                setSelectedProperty(propertiesList[0]);
            } else {
                setSelectedProperty(null);
            }
        } catch (error) {
            console.error('Failed to fetch properties:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchProperties();
        } else {
            setProperties([]);
            setSelectedProperty(null);
        }
    }, [isAuthenticated, user?.id]);

    // Persist selection
    useEffect(() => {
        if (selectedProperty) {
            localStorage.setItem('property_selectedPropertyId', selectedProperty.id);
        }
    }, [selectedProperty]);

    return (
        <PropertyContext.Provider
            value={{
                properties,
                selectedProperty,
                setSelectedProperty,
                isLoading,
                refreshProperties: fetchProperties,
            }}
        >
            {children}
        </PropertyContext.Provider>
    );
};

export const useProperty = () => {
    const context = useContext(PropertyContext);
    if (context === undefined) {
        throw new Error('useProperty must be used within a PropertyProvider');
    }
    return context;
};
