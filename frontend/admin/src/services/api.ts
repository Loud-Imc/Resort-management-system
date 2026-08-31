import axios from 'axios';


const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD) {
        return envUrl && !envUrl.includes('localhost') ? envUrl : '';
    }
    return envUrl || 'http://localhost:3000';
};

const API_URL = getApiUrl();

const api = axios.create({
    baseURL: API_URL ? `${API_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});


// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
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
            // Only redirect if we are not already on the login page
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
