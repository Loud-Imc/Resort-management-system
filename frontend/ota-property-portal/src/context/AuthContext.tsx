import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone: string;
  whatsappNumber?: string;
  roles?: string[];
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  registerProperty: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Sync/process session sync or impersonation parameters BEFORE reading localStorage
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const token = params.get('token');
      const encodedUser = params.get('user');
      const propertyId = params.get('propertyId');

      if ((action === 'login_sync' || action === 'impersonate') && token && encodedUser) {
        const userData = atob(encodedUser);
        localStorage.setItem('property_token', token);
        localStorage.setItem('property_user', userData);

        if (propertyId) {
          localStorage.setItem('property_selectedPropertyId', propertyId);
        }

        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Failed to parse synchronized session credentials from URL', e);
    }

    const token = localStorage.getItem('property_token');
    const storedUser = localStorage.getItem('property_user');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        
        // Self-healing: If roles are stored as objects, flatten them
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

  const login = async (credentials: any) => {
    const { data } = await api.post('/auth/login', credentials);

    const roles: string[] = data.user.roles?.length
      ? data.user.roles
      : (data.user.role ? [data.user.role] : []);

    const normalised = roles.map((r: string) => r.toLowerCase());
    const PROPERTY_BLOCKED_ONLY = ['channelpartner', 'customer'];
    const isBlockedOnly = normalised.every(r => PROPERTY_BLOCKED_ONLY.includes(r));

    if (isBlockedOnly) {
      throw new Error('Access denied. This portal is for Property Owners and Staff only.');
    }

    localStorage.setItem('property_token', data.accessToken);
    localStorage.setItem('property_user', JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
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

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/users/me');
      if (data) {
        const roles = data.roles && Array.isArray(data.roles)
          ? data.roles.map((r: any) => typeof r === 'string' ? r : r.role?.name).filter(Boolean)
          : data.roles;
        
        const updatedUser = {
          ...data,
          ...(roles ? { roles } : {})
        };
        
        localStorage.setItem('property_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, registerProperty, logout, updateUser, refreshUser }}>
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
