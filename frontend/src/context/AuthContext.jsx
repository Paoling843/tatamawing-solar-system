// Import the React hooks this provider needs
import { useState, useEffect } from 'react';

// Import our custom axios instance for making API calls
import api from '../api/axios';

// Reads/saves the token in localStorage or sessionStorage (see tokenStorage.js)
import { getToken, saveToken, clearToken } from '../api/tokenStorage';

// Clears the quote builder's saved inputs on logout
import { startNewQuoteSession } from '../services/quoteDraft';

// The context object lives in its own module (auth-context.js) so this file
// only exports components, which keeps Vite's fast refresh working
import { AuthContext } from './auth-context';

import { SESSION_ENDED_MESSAGE } from '../utils/errorMessage';

// Waits before each try of the startup login check: right away, then after
// 2, 5 and 10 seconds — about the time the free server takes to wake up
const VERIFY_RETRY_DELAYS = [0, 2000, 5000, 10000];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // true when the server couldn't be reached to check the saved login.
    // The login is kept, and the pages offer "Try again" (retryAuth).
    const [authError, setAuthError] = useState(false);
    // Bumped by retryAuth to run the check below again
    const [verifyRun, setVerifyRun] = useState(0);

    // Shown on the login page after the login expired mid-session
    const [sessionNotice, setSessionNotice] = useState('');

    // useEffect runs on mount and whenever token changes
    useEffect(() => {
        // No token — there is nothing to verify and loading is already false
        if (!token) return undefined;

        let cancelled = false;

        // Verify the token by calling /api/me. Only a 401/403 means the login
        // is bad; anything else (offline, server waking up) is retried and
        // never signs the person out.
        const verify = async () => {
            for (const delay of VERIFY_RETRY_DELAYS) {
                if (delay) await sleep(delay);
                if (cancelled) return;
                try {
                    // /api/me returns the user object directly
                    const res = await api.get('/me');
                    if (cancelled) return;
                    setUser(res.data);
                    setAuthError(false);
                    setLoading(false);
                    return;
                } catch (err) {
                    if (cancelled) return;
                    if ([401, 403].includes(err.response?.status)) {
                        clearToken();
                        setToken(null);
                        setLoading(false);
                        return;
                    }
                }
            }
            setAuthError(true);
            setLoading(false);
        };

        verify();
        return () => { cancelled = true; };
    }, [token, verifyRun]);

    // The axios interceptor fires this on a 401 in the middle of a session
    useEffect(() => {
        const onExpired = () => {
            clearToken();
            setToken(null);
            setUser(null);
            setSessionNotice(SESSION_ENDED_MESSAGE);
        };
        window.addEventListener('auth:expired', onExpired);
        return () => window.removeEventListener('auth:expired', onExpired);
    }, []);

    // "Try again" after the server couldn't be reached
    const retryAuth = () => {
        setAuthError(false);
        setLoading(true);
        setVerifyRun((n) => n + 1);
    };

    // Saves the token and user after a successful login or registration.
    // remember = true keeps the user signed in after the browser is closed.
    const signIn = (tokenData, userData, remember) => {
        saveToken(tokenData, remember);

        // Save token to state so the axios interceptor uses it immediately
        setToken(tokenData);

        // Save just the user object to state (not the full response)
        setUser(userData);
        setSessionNotice('');
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
        try {
            // Tell the server to delete this token
            await api.post('/logout');
        } catch {
            // Token already expired or server unreachable — still sign out locally
        } finally {
            // Remove token from browser storage
            clearToken();

            // Forget any unfinished quotation, so the next person on this
            // browser starts the calculator empty
            startNewQuoteSession();

            // Clear token and user from state — app now treats this as logged out
            setToken(null);
            setUser(null);
        }
    };


    // Provide auth values and functions to all child components
    return (
        <AuthContext.Provider value={{ user, token, loading, authError, retryAuth, sessionNotice, login, register, logout }}>
            {/* Render all child components inside this provider */}
            {children}
        </AuthContext.Provider>
    );
}
