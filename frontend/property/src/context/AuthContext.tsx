import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import type { User, LoginCredentials, AuthResponse } from '../types/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: any) => Promise<void>;
    registerProperty: (data: any) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem('property_token');
        const storedUser = localStorage.getItem('property_user');

        if (token && storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                
                // Self-healing: If roles are stored as objects (corrupted data), flatten them
                if (userData.roles && Array.isArray(userData.roles) && userData.roles.length > 0 && typeof userData.roles[0] !== 'string') {
                    userData.roles = userData.roles.map((r: any) => typeof r === 'string' ? r : r.role?.name).filter(Boolean);
                    localStorage.setItem('property_user', JSON.stringify(userData));
                }
                
                setUser(userData);
                setIsAuthenticated(true);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials);
        localStorage.setItem('property_token', data.accessToken);
        localStorage.setItem('property_user', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
    };

    const register = async (formData: any) => {
        await api.post('/auth/register', formData);
    };

    const registerProperty = async (formData: any) => {
        await api.post('/properties/public-register', formData);
    };

    const logout = () => {
        localStorage.removeItem('property_token');
        localStorage.removeItem('property_user');
        setUser(null);
        setIsAuthenticated(false);
    };
    
    const updateUser = (userData: Partial<User>) => {
        if (user) {
            // Ensure roles are always flattened if they come from a raw Prisma response
            const roles = userData.roles && Array.isArray(userData.roles)
                ? userData.roles.map((r: any) => typeof r === 'string' ? r : r.role?.name).filter(Boolean)
                : userData.roles;

            const updatedUser = { 
                ...user, 
                ...userData,
                ...(roles ? { roles } : {}) 
            };
            localStorage.setItem('property_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, registerProperty, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
