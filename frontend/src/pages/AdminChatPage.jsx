import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminChatPage() {
    const { user, logout } = useAuth();
    const { userId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [otherUser, setOtherUser] = useState(null);
    const [newMessage, setNewMessage] = useState(''); 
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();

        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => clearInterval(interval);
    }, [userId]);

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/messages/${userId}`);
            setMessages(res.data);

            if (res.data.length > 0) {
                const firstMessage = res.data[0]

                const other = firstMessage.sender_id === user?.id
                    ? firstMessage.receiver
                    : firstMessage.sender;
                    setOtherUser(other);
            }
        } catch (err) {
            setError('Failed to load conversations.');
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
                receiver_id: parseInt(userId),
                message: newMessage.trim(),
            });
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

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach((message) => {
            const date = new Date(message.created_at).toDateString();
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
                    <span style={styles.navRole}>Admin</span>
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
                    {/* Back button */}
                    <button
                        onClick={() => navigate('/admin/inbox')}
                        style={styles.backBtn}
                    >
                        ←
                    </button>

                    {/* Other user's avatar */}
                    <div style={styles.avatar}>
                        {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Other user's info */}
                    <div>
                        <h2 style={styles.chatTitle}>
                            {otherUser?.name || 'Loading...'}
                        </h2>
                        <p style={styles.chatSubtitle}>
                            {otherUser?.role === 'customer'
                                ? 'Customer'
                                : otherUser?.role === 'supplier'
                                ? 'Supplier'
                                : ''}
                            {' — '}{otherUser?.email}
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
                                No messages yet. Start the conversation!
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
                                    // Check if this message was sent by the admin
                                    const isMine = message.sender_id === user?.id;
                                    return (
                                        <div
                                            key={message.id}
                                            style={{
                                                ...styles.messageBubbleWrapper,
                                                justifyContent: isMine ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {/* Show other user's avatar for received messages */}
                                            {!isMine && (
                                                <div style={styles.bubbleAvatar}>
                                                    {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
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
                        placeholder={`Message ${otherUser?.name || ''}...`}
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

// Styles — same pattern as the other chat pages
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
    backBtn: {
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: '#6b7280',
        padding: '0.25rem 0.5rem',
        flexShrink: 0,
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
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
        backgroundColor: '#3b82f6',
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