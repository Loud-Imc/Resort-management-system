import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { Property } from '../types/property';

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
            // Fetch properties based on user role
            // We use the admin endpoint because it correctly handles "properties I own OR work at" logic
            const response = await api.get<any>('/properties/admin/all');
            // The admin endpoint returns { data: [], meta: {} }
            const propertiesList = response.data.data || [];

            setProperties(propertiesList);

            // Auto-select first property if none selected or if previously selected is not in list
            if (propertiesList.length > 0) {
                // Check if we have a stored preference
                const storedId = localStorage.getItem('selectedPropertyId');
                const found = propertiesList.find((p: Property) => p.id === storedId);

                if (found) {
                    setSelectedProperty(found);
                } else if (!selectedProperty) {
                    setSelectedProperty(propertiesList[0]);
                }
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
            localStorage.setItem('selectedPropertyId', selectedProperty.id);
        }
    }, [selectedProperty]);

    return (
        <PropertyContext.Provider
            value={{
                properties,
                selectedProperty,
                setSelectedProperty,
                isLoading,
                refreshProperties: fetchProperties
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
