import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function SupplierChatPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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

    useEffect(() => {
        fetchAdminId();
    }, []);

    useEffect(() => {
        if(!adminId) return;

        fetchMessages();

        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, [adminId]);

    const fetchAdminId = async () => {
        try {
            const res = await api.get('/admin-id');
            setAdminId(res.data.admin_id);
        }catch (err) {
            setError('Failed to connect to messaging service.');
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/messages/${adminId}`);
            setMessages(res.data);
        } catch (err) {
            setError('Failed to load messages.');
        } finally {
            setLoading(false);
        }
    };

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
        } catch (err) {
            setError('Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
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
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* Link back to supplier dashboard */}
                    <button
                        onClick={() => navigate('/supplier/dashboard')}
                        style={styles.navBtn}
                    >
                        📦 Purchase Requests
                    </button>
                    <span style={styles.navRole}>Supplier</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Chat container */}
            <div style={styles.chatContainer}>

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
                        <div style={styles.loadingText}>Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div style={styles.emptyChat}>
                            <div style={styles.emptyChatIcon}>💬</div>
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
                                                backgroundColor: isMine ? '#16a34a' : 'white',
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
                                                    {isMine && message.read_at && ' ✓✓'}
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
                        style={styles.messageInput}
                        placeholder="Type a message..."
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        style={{
                            ...styles.sendBtn,
                            opacity: (!newMessage.trim() || sending) ? 0.5 : 1,
                            cursor: (!newMessage.trim() || sending) ? 'not-allowed' : 'pointer',
                        }}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? '...' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Styles — same as CustomerChatPage for visual consistency
const styles = {
    container: {
        height: '100vh',
        backgroundColor: '#f0fdf4',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
    },
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
    },
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto',
        padding: '1rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
    },
    chatHeader: {
        backgroundColor: 'white',
        borderRadius: '12px 12px 0 0',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
        flexShrink: 0,
    },
    chatTitle: {
        fontSize: '1rem',
        color: '#111827',
        margin: 0,
        fontWeight: '600',
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
        fontSize: '3rem',
        marginBottom: '1rem',
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
        backgroundColor: '#16a34a',
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
        borderRadius: '0 0 12px 12px',
        padding: '1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        borderTop: '1px solid #e5e7eb',
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
        backgroundColor: '#16a34a',
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
