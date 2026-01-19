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

export default api;
