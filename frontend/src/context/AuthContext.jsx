// Import tools from React we need to create and use context (global state)
import { createContext, useContext, useState, useEffect } from 'react';

// Import our custom axios instance for making API calls
import api from '../api/axios';

// Create a context object — this is the container for our global auth state
const AuthContext = createContext(null);

// AuthProvider wraps the whole app so every component can access auth state
export function AuthProvider({ children }) {
    // user stores the currently logged-in user object (null if not logged in)
    const [user, setUser] = useState(null);

    // token stores the API token, initialized from localStorage for persistence
    const [token, setToken] = useState(localStorage.getItem('token'));

    // loading tracks whether we're still checking if the user is logged in
    const [loading, setLoading] = useState(true);

    // useEffect runs on mount and whenever token changes
    useEffect(() => {
        // If a token exists, verify it by calling /api/me
        if (token) {
            api.get('/me')
                // /api/me returns the user object directly
                .then((res) => setUser(res.data))
                // If token is invalid, clean up
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                })
                // Stop loading whether success or failure
                .finally(() => setLoading(false));
        } else {
            // No token — stop loading immediately
            setLoading(false);
        }
    }, [token]);

    // login function — sends credentials to API and saves the result
    const login = async (email, password) => {
        // Send POST to /api/login
        const res = await api.post('/login', { email, password });

        // res.data is { message, user, token }
        // We extract just the pieces we need
        const userData = res.data.user;
        const tokenData = res.data.token;

        // Save token to localStorage so it persists after page refresh
        localStorage.setItem('token', tokenData);

        // Save token to state so the axios interceptor uses it immediately
        setToken(tokenData);

        // Save just the user object to state (not the full response)
        setUser(userData);

        // Return just the user object so pages can check user.role directly
        return userData;
    };

    // logout function — invalidates the token and clears local state
    const logout = async () => {
        // Tell the server to delete this token
        await api.post('/logout');

        // Remove token from localStorage
        localStorage.removeItem('token');

        // Clear token from state
        setToken(null);

        // Clear user from state — app now treats this as logged out
        setUser(null);
    };

    // Provide auth values and functions to all child components
    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {/* Render all child components inside this provider */}
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook — shortcut for accessing auth context from any component
export function useAuth() {
    return useContext(AuthContext);
}