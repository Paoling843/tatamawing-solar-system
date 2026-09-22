// Import the React hooks this provider needs
import { useState, useEffect } from 'react';

// Import our custom axios instance for making API calls
import api from '../api/axios';

// Reads/saves the token in localStorage or sessionStorage (see tokenStorage.js)
import { getToken, saveToken, clearToken } from '../api/tokenStorage';

// The context object lives in its own module (auth-context.js) so this file
// only exports components, which keeps Vite's fast refresh working
import { AuthContext } from './auth-context';

// AuthProvider wraps the whole app so every component can access auth state
export function AuthProvider({ children }) {
    // user stores the currently logged-in user object (null if not logged in)
    const [user, setUser] = useState(null);

    // token stores the API token, initialized from browser storage for persistence
    const [token, setToken] = useState(getToken);

    // loading tracks whether we're still checking if the user is logged in.
    // It only starts true when there is a stored token left to verify, so the
    // effect below never has to clear it synchronously during the first render.
    const [loading, setLoading] = useState(() => Boolean(getToken()));

    // useEffect runs on mount and whenever token changes
    useEffect(() => {
        // No token — there is nothing to verify and loading is already false
        if (!token) return;

        // Verify the token by calling /api/me
        api.get('/me')
            // /api/me returns the user object directly
            .then((res) => setUser(res.data))
            // If token is invalid, clean up
            .catch(() => {
                clearToken();
                setToken(null);
            })
            // Stop loading whether success or failure
            .finally(() => setLoading(false));
    }, [token]);

    // Saves the token and user after a successful login or registration.
    // remember = true keeps the user signed in after the browser is closed.
    const signIn = (tokenData, userData, remember) => {
        saveToken(tokenData, remember);

        // Save token to state so the axios interceptor uses it immediately
        setToken(tokenData);

        // Save just the user object to state (not the full response)
        setUser(userData);
    };

    // login function — sends credentials to API and saves the result
    const login = async (email, password, remember = true) => {
        // Send POST to /api/login
        const res = await api.post('/login', { email, password });

        // res.data is { message, user, token }
        // We extract just the pieces we need
        const userData = res.data.user;
        const tokenData = res.data.token;

        signIn(tokenData, userData, remember);

        // Return just the user object so pages can check user.role directly
        return userData;
    };

    // register function — creates a customer account and signs them in.
    // payload: { first_name, last_name, email, contact_number, password, password_confirmation }
    const register = async (payload) => {
        const res = await api.post('/register', payload);

        // New accounts stay signed in on this device
        signIn(res.data.token, res.data.user, true);

        return res.data.user;
    };

    // logout function — invalidates the token and clears local state
    const logout = async () => {
        // Tell the server to delete this token
        await api.post('/logout');

        // Remove token from browser storage
        clearToken();

        // Clear token from state
        setToken(null);

        // Clear user from state — app now treats this as logged out
        setUser(null);
    };

    // Provide auth values and functions to all child components
    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {/* Render all child components inside this provider */}
            {children}
        </AuthContext.Provider>
    );
}
