import axios from 'axios';
import { getToken } from './tokenStorage';

const api = axios.create({
    // VITE_API_URL is set in Vercel to the deployed backend's /api address
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Automatically magsasama ng token sa mga request kung nageexist
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export default api;