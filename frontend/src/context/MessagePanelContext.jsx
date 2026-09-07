import { useState } from 'react';

import { MessagePanelContext } from './message-panel-context';

export function MessagePanelProvider({ children }) {
    const [panelOpen, setPanelOpen] = useState(false);

    const openPanel = () => setPanelOpen(true);
    const closePanel = () => setPanelOpen(false);

    return (
        <MessagePanelContext.Provider value={{ panelOpen, openPanel, closePanel }}>
            {children}
        </MessagePanelContext.Provider>
    );
}
