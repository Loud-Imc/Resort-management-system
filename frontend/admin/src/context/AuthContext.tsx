import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import type { User, LoginCredentials, AuthResponse } from '../types/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            const { data } = await api.post<AuthResponse>('/auth/login', credentials);

            // Portal guard — only SuperAdmin or Admin may access the admin portal
            const roles: string[] = data.user.roles || (data.user.role ? [data.user.role] : []);
            const ADMIN_ROLES = ['SuperAdmin', 'Admin'];
            const hasAccess = roles.some(r => ADMIN_ROLES.includes(r));
            if (!hasAccess) {
                throw new Error('Access denied. This portal is for Administrators only.');
            }

            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const roles = userData.roles && Array.isArray(userData.roles)
                ? userData.roles.map((r: any) => typeof r === 'string' ? r : r.role?.name).filter(Boolean)
                : userData.roles;

            const updatedUser = { 
                ...user, 
                ...userData,
                ...(roles ? { roles } : {}) 
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
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
