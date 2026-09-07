// Import tools from React we need to create and consume context (global state)
import { createContext, useContext } from 'react';

// The context object itself — kept in its own module so
// MessagePanelContext.jsx only exports components (fast refresh friendly)
export const MessagePanelContext = createContext(null);

// Custom hook — shortcut for opening/closing the support message panel
export function useMessagePanel() {
    return useContext(MessagePanelContext);
}
