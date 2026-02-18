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
            const response = await api.get<any>('/properties/admin/all');
            const propertiesList = response.data.data || [];

            setProperties(propertiesList);

            if (propertiesList.length > 0) {
                const storedId = localStorage.getItem('property_selectedPropertyId');
                const found = storedId
                    ? propertiesList.find((p: Property) => p.id === storedId)
                    : null;

                if (found) {
                    setSelectedProperty(found);
                } else {
                    // Auto-lock to first property
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
