// Import tools from React we need to create and consume context (global state)
import { createContext, useContext } from 'react';

// The context object itself — the container for our global auth state.
// It lives in its own module so AuthContext.jsx only exports components,
// which keeps Vite's fast refresh working for the provider.
export const AuthContext = createContext(null);

// Custom hook — shortcut for accessing auth context from any component
export function useAuth() {
    return useContext(AuthContext);
}
