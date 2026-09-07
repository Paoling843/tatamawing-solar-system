import { useState, useEffect, useRef, useCallback } from 'react';

import AdminLayout from '../components/AdminLayout';

import { useAuth } from '../context/auth-context';

import api from '../api/axios';

import { SearchIcon, SendIcon } from '../components/Icons';

import { colors, typography } from '../styles/theme';

export default function AdminInboxPage() {
    const { user } = useAuth();

    const [conversations, setConversations] = useState([]);

    const [selectedUserId, setSelectedUserId] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);

    const [messages, setMessages] = useState([]);

    const [newMessage, setNewMessage] = useState('');

    const [searchQuery, setSearchQuery] = useState('');

    const [loadingConversations, setLoadingConversations] = useState(true);

    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/conversations');
            setConversations(res.data);
        } catch {
            // Polling refresh — keep the list we already have
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    const fetchMessages = useCallback(async (userId) => {
        try {
            const res = await api.get(`/messages/${userId}`);
            setMessages(res.data);

            if (res.data.length > 0) {
                const firstMsg = res.data[0];
                const other = firstMsg.sender_id === user?.id
                    ? firstMsg.receiver
                    : firstMsg.sender;
                setSelectedUser(other);
            }
        } catch {
            // Polling refresh — keep the thread we already have
        }
    }, [user]);

    useEffect(() => {
        // Start the first load in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchConversations);
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (!selectedUserId) return;

        Promise.resolve().then(() => fetchMessages(selectedUserId));
        const interval = setInterval(() => fetchMessages(selectedUserId), 5000);
        return () => clearInterval(interval);
    }, [selectedUserId, fetchMessages]);

    const handleSelectConversation = (conversation) => {
        setSelectedUserId(conversation.user.id);
        setSelectedUser(conversation.user);
        setMessages([]);
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || sending || !selectedUserId) return;

        setSending(true);
        try {
            const res = await api.post('/messages', {
                receiver_id: selectedUserId,
                message: newMessage.trim(),
            });
            setMessages(prev => [...prev, res.data.chat_message]);
            setNewMessage('');
        } catch {
            // The message failed to send; the composer keeps its text
        } finally {
            setSending(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getRoleColor = (role) => {
        if (role === 'customer') return '#3b82f6';
        if (role === 'supplier') return '#f59e0b';
        return '#6b7280';
    };

    const filteredConversations = conversations.filter(c =>
        c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout active="Messages">

            <h1 style={styles.pageTitle}>Messages</h1>

            <div className="chat-panel-wrap" style={styles.twoPanel}>

                <div className="chat-left-panel" style={styles.leftPanel}>

                    <div style={styles.searchBar}>
                        <span style={styles.searchIcon}>
                            <SearchIcon size={14} color="#9ca3af" />
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="input-field"
                            style={styles.searchInput}
                        />
                    </div>

                    <div style={styles.conversationList}>
                        {loadingConversations ? (
                            <div style={styles.panelEmpty}>Loading...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div style={styles.panelEmpty}>
                                No conversations yet.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => (
                                <div
                                    key={conversation.user.id}
                                    onClick={() => handleSelectConversation(conversation)}
                                    style={{
                                        ...styles.conversationItem,
                                        ...(selectedUserId === conversation.user.id
                                            ? styles.conversationItemActive : {}),
                                    }}
                                >
                                    <div style={{
                                        ...styles.conversationAvatar,
                                        backgroundColor: getRoleColor(conversation.user.role),
                                    }}>
                                        {getInitials(conversation.user.name)}
                                    </div>

                                    <div style={styles.conversationText}>
                                        <span style={styles.conversationName}>
                                            {conversation.user.name}
                                        </span>
                                        {conversation.latest_message && (
                                            <span style={styles.conversationPreview}>
                                                {conversation.latest_message.length > 35
                                                    ? conversation.latest_message.substring(0, 35) + '...'
                                                    : conversation.latest_message}
                                            </span>
                                        )}
                                    </div>

                                    {conversation.unread_count > 0 && (
                                        <div style={styles.unreadBadge}>
                                            {conversation.unread_count}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="chat-right-panel" style={styles.rightPanel}>
                    {selectedUserId ? (
                        <>
                            <div style={styles.chatHeader}>
                                <div style={{
                                    ...styles.chatHeaderAvatar,
                                    backgroundColor: getRoleColor(selectedUser?.role),
                                }}>
                                    {getInitials(selectedUser?.name)}
                                </div>
                                <span style={styles.chatHeaderName}>
                                    {selectedUser?.name}
                                </span>
                            </div>

                            <div style={styles.messagesArea}>
                                {messages.length === 0 ? (
                                    <div style={styles.panelEmpty}>
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((message) => {
                                        const isMine = message.sender_id === user?.id;
                                        return (
                                            <div
                                                key={message.id}
                                                style={{
                                                    ...styles.bubbleWrapper,
                                                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                }}
                                            >
                                                {!isMine && (
                                                    <div style={{
                                                        ...styles.bubbleAvatar,
                                                        backgroundColor: getRoleColor(selectedUser?.role),
                                                    }}>
                                                        {getInitials(selectedUser?.name)}
                                                    </div>
                                                )}

                                                <div style={{
                                                    ...styles.bubble,
                                                    backgroundColor: isMine ? colors.primary : '#f3f4f6',
                                                    color: isMine ? 'white' : '#111827',
                                                    borderRadius: isMine
                                                        ? '18px 18px 4px 18px'
                                                        : '18px 18px 18px 4px',
                                                }}>
                                                    <p style={styles.bubbleText}>
                                                        {message.message}
                                                    </p>
                                                </div>

                                                {isMine && (
                                                    <div style={{
                                                        ...styles.bubbleAvatar,
                                                        backgroundColor: colors.primary,
                                                    }}>
                                                        {getInitials(user?.name)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSend} style={styles.inputArea}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Message"
                                    className="input-field"
                                    style={styles.messageInput}
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        ...styles.sendBtn,
                                        opacity: (!newMessage.trim() || sending) ? 0.5 : 1,
                                    }}
                                    disabled={!newMessage.trim() || sending}
                                >
                                    <SendIcon size={16} color="white" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={styles.noSelection}>
                            <p style={styles.noSelectionText}>
                                Select a conversation to start messaging
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

const styles = {
    pageTitle: {
        ...typography.h1,
        marginBottom: '1.25rem',
    },
    twoPanel: {
        display: 'flex',
        height: 'calc(100vh - 180px)',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
    },
    leftPanel: {
        width: '280px',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1rem',
        borderBottom: '1px solid #f3f4f6',
        backgroundColor: '#fafafa',
    },
    searchIcon: {
        display: 'flex',
        alignItems: 'center',
        color: '#9ca3af',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        fontSize: '0.875rem',
        color: '#374151',
    },
    conversationList: {
        flex: 1,
        overflowY: 'auto',
    },
    panelEmpty: {
        textAlign: 'center',
        color: '#9ca3af',
        padding: '2rem',
        fontSize: '0.875rem',
    },
    conversationItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        cursor: 'pointer',
        borderBottom: '1px solid #f9fafb',
    },
    conversationItemActive: {
        backgroundColor: colors.primaryTint,
    },
    conversationAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.875rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    conversationText: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        minWidth: 0,
    },
    conversationName: {
        fontWeight: '600',
        fontSize: '0.875rem',
        color: '#111827',
    },
    conversationPreview: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    unreadBadge: {
        backgroundColor: colors.primary,
        color: 'white',
        borderRadius: '999px',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    rightPanel: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
    },
    chatHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
    },
    chatHeaderAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
    },
    chatHeaderName: {
        fontWeight: '600',
        fontSize: '0.9rem',
        color: '#111827',
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        backgroundColor: '#fafafa',
    },
    bubbleWrapper: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
    },
    bubbleAvatar: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.65rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    bubble: {
        maxWidth: '60%',
        padding: '0.75rem 1rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    },
    bubbleText: {
        margin: 0,
        fontSize: '0.875rem',
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    inputArea: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        flexShrink: 0,
    },
    messageInput: {
        flex: 1,
        padding: '0.625rem 1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '999px',
        fontSize: '0.875rem',
        outline: 'none',
        backgroundColor: '#f9fafb',
    },
    sendBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    noSelection: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noSelectionText: {
        color: '#9ca3af',
        fontSize: '0.875rem',
    },
};