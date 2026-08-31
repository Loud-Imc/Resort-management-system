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

// Add a request interceptor
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

export default api;
