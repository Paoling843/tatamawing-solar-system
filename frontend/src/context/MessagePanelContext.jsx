import { useState } from 'react';

import { MessagePanelContext } from './message-panel-context';

export function MessagePanelProvider({ children }) {
    const [panelOpen, setPanelOpen] = useState(false);
    // The quotation the customer is asking about ("Ask about this quote"):
    // { id, reference, label }. Sent with their next message, then cleared.
    const [topic, setTopic] = useState(null);

    const openPanel = () => setPanelOpen(true);
    const closePanel = () => setPanelOpen(false);

    const askAbout = (quotation) => {
        setTopic(quotation);
        setPanelOpen(true);
    };
    const clearTopic = () => setTopic(null);

    return (
        <MessagePanelContext.Provider value={{ panelOpen, openPanel, closePanel, topic, askAbout, clearTopic }}>
            {children}
        </MessagePanelContext.Provider>
    );
}
