import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
        if (error.response?.status === 401) {
            localStorage.removeItem('cp_token');
            window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
    }
);

export default api;
