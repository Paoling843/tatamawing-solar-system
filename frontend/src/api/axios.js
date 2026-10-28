import axios from 'axios';
import { getToken } from './tokenStorage';

const api = axios.create({
    // VITE_API_URL is set in Vercel to the deployed backend's /api address
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    // The free Render server can take ~50 s to wake up, so wait a minute
    // before giving up on a request
    timeout: 60000,
});

// Automatically magsasama ng token sa mga request kung nageexist
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// A 401 in the middle of using the app means the saved login is no longer
// valid. AuthContext listens for this event, signs out, and the login page
// says why. Login itself (wrong password) and the startup /me check handle
// their own 401s.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const ownHandling = ['/login', '/register', '/me', '/logout'].some((path) => url.endsWith(path));
        if (error.response?.status === 401 && !ownHandling && getToken()) {
            window.dispatchEvent(new Event('auth:expired'));
        }
        return Promise.reject(error);
    },
);

export default api;