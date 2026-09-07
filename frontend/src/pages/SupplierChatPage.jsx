import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/auth-context';
import SupplierLayout from '../components/SupplierLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { MessageIcon, CheckIcon, SendIcon } from '../components/Icons';
import { colors, typography } from '../styles/theme';

export default function SupplierChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [adminId, setAdminId] = useState(null);
    const messagesEndRef = useRef(null);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior : 'smooth' });
    }, [messages]);

    const fetchAdminId = useCallback(async () => {
        try {
            const res = await api.get('/admin-id');
            setAdminId(res.data.admin_id);
        }catch {
            setError('Failed to connect to messaging service.');
        }
    }, []);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await api.get(`/messages/${adminId}`);
            setMessages(res.data);
        } catch {
            setError('Failed to load messages.');
        } finally {
            setLoading(false);
        }
    }, [adminId]);

    useEffect(() => {
        // Start the lookup in a microtask so its state updates land after this
        // effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchAdminId);
    }, [fetchAdminId]);

    useEffect(() => {
        if(!adminId) return;

        Promise.resolve().then(fetchMessages);

        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, [adminId, fetchMessages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);

        try {
            const res = await api.post('/messages', {
                receiver_id: adminId,
                message:newMessage.trim(),
            });

            setMessages((prev) => [...prev, res.data.chat_message]);
            setNewMessage('');
        } catch {
            setError('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timeStamp) => {
        return new Date(timeStamp).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (timeStamp) => {
        return new Date(timeStamp).toLocaleDateString('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach((message) => {
            const date = new Date(message.created_at).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(message);
        });

        return Object.entries(groups).map(([date, msgs]) => ({
            date,
            messages: msgs,
        }));
    };

    return (
        <SupplierLayout active="Messages">
            <div style={styles.card}>

                {/* Chat header */}
                <div style={styles.chatHeader}>
                    <div style={styles.avatar}>A</div>
                    <div>
                        <h2 style={styles.chatTitle}>TataMawing Solar Admin</h2>
                        <p style={styles.chatSubtitle}>
                            Coordinate with the admin about purchase requests and materials
                        </p>
                    </div>
                </div>

                {/* Messages area */}
                <div style={styles.messagesArea}>
                    {loading ? (
                        <LoadingState label="Loading messages..." />
                    ) : messages.length === 0 ? (
                        <div style={styles.emptyChat}>
                            <div style={styles.emptyChatIcon}>
                                <MessageIcon size={48} color="#9ca3af" />
                            </div>
                            <p style={styles.emptyChatText}>
                                No messages yet. Send a message to start the conversation!
                            </p>
                        </div>
                    ) : (
                        groupMessagesByDate(messages).map((group) => (
                            <div key={group.date}>
                                <div style={styles.dateSeparator}>
                                    <span style={styles.dateSeparatorText}>
                                        {formatDate(group.messages[0].created_at)}
                                    </span>
                                </div>
                                {group.messages.map((message) => {
                                    const isMine = message.sender_id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            style={{
                                                ...styles.messageBubbleWrapper,
                                                justifyContent: isMine ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {!isMine && (
                                                <div style={styles.bubbleAvatar}>A</div>
                                            )}
                                            <div style={{
                                                ...styles.messageBubble,
                                                backgroundColor: isMine ? colors.primary : 'white',
                                                color: isMine ? 'white' : '#111827',
                                                borderRadius: isMine
                                                    ? '18px 18px 4px 18px'
                                                    : '18px 18px 18px 4px',
                                            }}>
                                                <p style={styles.messageText}>
                                                    {message.message}
                                                </p>
                                                <span style={{
                                                    ...styles.messageTime,
                                                    color: isMine
                                                        ? 'rgba(255,255,255,0.7)'
                                                        : '#9ca3af',
                                                }}>
                                                    {formatTime(message.created_at)}
                                                    {isMine && message.read_at && (
                                                        <span style={{ display: 'inline-flex', marginLeft: '4px', verticalAlign: 'middle' }}>
                                                            <CheckIcon size={12} color="currentColor" />
                                                            <span style={{ marginLeft: '-7px' }}><CheckIcon size={12} color="currentColor" /></span>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                    {error && <div style={styles.errorText}>{error}</div>}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <form onSubmit={handleSend} style={styles.inputArea}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="input-field"
                        style={styles.messageInput}
                        placeholder="Type a message..."
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            ...styles.sendBtn,
                            opacity: (!newMessage.trim() || sending) ? 0.5 : 1,
                            cursor: (!newMessage.trim() || sending) ? 'not-allowed' : 'pointer',
                        }}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? '...' : <SendIcon size={16} color="white" />}
                    </button>
                </form>
            </div>
        </SupplierLayout>
    );
}

// Styles
const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 7.5rem)',
        overflow: 'hidden',
    },
    chatHeader: {
        backgroundColor: 'white',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid #f3f4f6',
        flexShrink: 0,
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
        flexShrink: 0,
    },
    chatTitle: {
        ...typography.h3,
        margin: 0,
    },
    chatSubtitle: {
        fontSize: '0.75rem',
        color: '#6b7280',
        margin: '0.25rem 0 0 0',
    },
    messagesArea: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '2rem',
    },
    emptyChat: {
        textAlign: 'center',
        padding: '3rem 1rem',
    },
    emptyChatIcon: {
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'center',
    },
    emptyChatText: {
        color: '#6b7280',
        fontSize: '0.875rem',
    },
    dateSeparator: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem 0',
    },
    dateSeparatorText: {
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
        fontSize: '0.75rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
    },
    messageBubbleWrapper: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
        marginBottom: '0.5rem',
    },
    bubbleAvatar: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    messageBubble: {
        maxWidth: '70%',
        padding: '0.625rem 1rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    messageText: {
        margin: 0,
        fontSize: '0.9rem',
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    messageTime: {
        fontSize: '0.7rem',
        display: 'block',
        marginTop: '0.25rem',
        textAlign: 'right',
    },
    errorText: {
        textAlign: 'center',
        color: '#dc2626',
        fontSize: '0.875rem',
        padding: '0.5rem',
    },
    inputArea: {
        backgroundColor: 'white',
        padding: '1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        borderTop: '1px solid #f3f4f6',
        flexShrink: 0,
    },
    messageInput: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: '1px solid #d1d5db',
        borderRadius: '999px',
        fontSize: '0.9rem',
        outline: 'none',
        backgroundColor: '#f9fafb',
    },
    sendBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
};
