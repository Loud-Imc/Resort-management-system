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

            // 1. Try to fetch approved properties (pass limit=5000 so full portfolio is retrieved)
            const response = await api.get<any>('/properties/admin/all', {
                params: { limit: 5000 }
            });
            let propertiesList = response.data.data || [];

            // 2. If no approved properties, check for pending/rejected requests
            if (propertiesList.length === 0) {
                try {
                    const reqRes = await api.get<any>('/properties/requests/my');
                    const requests = reqRes.data || [];
                    if (requests.length > 0) {
                        // Map requests to look like Property objects for the UI
                        propertiesList = requests.map((req: any) => ({
                            id: req.id,
                            name: req.name,
                            slug: 'pending-request-' + req.id,
                            status: req.status,
                            isActive: false,
                            isVerified: false,
                            isRequest: true, // Custom UI flag
                            details: req.details || {}
                        }));
                    }
                } catch (reqErr) {
                    console.error('Failed to fetch requests:', reqErr);
                }
            }

            const storedId = localStorage.getItem('property_selectedPropertyId');
            let found = storedId
                ? propertiesList.find((p: any) => p.id === storedId)
                : null;

            // Direct fallback lookup: If impersonating a specific property that was not in the initial list
            if (storedId && !found && propertiesList.length > 0) {
                try {
                    const singleRes = await api.get<any>(`/properties/id/${storedId}`);
                    if (singleRes.data) {
                        found = singleRes.data;
                        propertiesList = [found, ...propertiesList];
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
