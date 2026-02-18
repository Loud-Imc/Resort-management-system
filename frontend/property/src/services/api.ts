import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error('VITE_API_URL is not defined');
}

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('property_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config.url?.includes('auth/login')) {
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('property_token');
                localStorage.removeItem('property_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
