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

// Request Interceptor for Auth Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('cp_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor for Error Handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401 && !error.config.url?.includes('auth/login')) {
            localStorage.removeItem('cp_token');
            window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
    }
);

export default api;
