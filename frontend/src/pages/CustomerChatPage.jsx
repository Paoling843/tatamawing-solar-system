import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CustomerChatPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [adminId, setAdminId] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        fetchAdminId();
    }, []);

    useEffect(() => {
        if (!adminId) return;

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
        } catch (err) {
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
                message: newMessage.trim(),
            });

            setMessages((prev) => [...prev, res.data.chat_message]);

            setNewMessage('');
        } catch (err) {
            setError('Failed to send message. Please try again.');
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

            if(!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(message);
        });

        return Object.entries(groups).map(([date, msgs]) => ({
            date,
            messages: msgs,
        }));
    };


    return (
        // Outer container — full height, green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>

                {/* Right side — nav links, user name, logout */}
                <div style={styles.navRight}>
                    {/* Link to quotation form */}
                    <button
                        onClick={() => navigate('/quotation/new')}
                        style={styles.navBtn}
                    >
                        📋 New Quotation
                    </button>

                    {/* Link to schedule page */}
                    <button
                        onClick={() => navigate('/customer/schedule')}
                        style={styles.navBtn}
                    >
                        📅 My Schedule
                    </button>

                    {/* User name */}
                    <span style={styles.navUser}>Hello, {user?.name}</span>

                    {/* Logout button */}
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Chat container */}
            <div style={styles.chatContainer}>

                {/* Chat header */}
                <div style={styles.chatHeader}>
                    {/* Admin avatar circle */}
                    <div style={styles.avatar}>A</div>

                    {/* Admin info */}
                    <div>
                        <h2 style={styles.chatTitle}>TataMawing Solar Support</h2>
                        <p style={styles.chatSubtitle}>
                            Ask us about your quotation, installation, or solar systems
                        </p>
                    </div>
                </div>

                {/* Messages area */}
                <div style={styles.messagesArea}>

                    {/* Show loading spinner on first load */}
                    {loading ? (
                        <div style={styles.loadingText}>
                            Loading messages...
                        </div>
                    ) : messages.length === 0 ? (
                        // Show empty state if no messages yet
                        <div style={styles.emptyChat}>
                            <div style={styles.emptyChatIcon}>💬</div>
                            <p style={styles.emptyChatText}>
                                No messages yet. Send a message to start the conversation!
                            </p>
                        </div>
                    ) : (
                        // Show grouped messages
                        groupMessagesByDate(messages).map((group) => (
                            <div key={group.date}>

                                {/* Date separator between groups */}
                                <div style={styles.dateSeparator}>
                                    <span style={styles.dateSeparatorText}>
                                        {formatDate(group.messages[0].created_at)}
                                    </span>
                                </div>

                                {/* Messages in this date group */}
                                {group.messages.map((message) => {
                                    // Check if this message was sent by the current user
                                    const isMine = message.sender_id === user?.id;

                                    return (
                                        // Each message bubble
                                        <div
                                            key={message.id}
                                            style={{
                                                ...styles.messageBubbleWrapper,
                                                // Align right if mine, left if theirs
                                                justifyContent: isMine ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {/* Show admin avatar on the left for their messages */}
                                            {!isMine && (
                                                <div style={styles.bubbleAvatar}>A</div>
                                            )}

                                            {/* Message bubble */}
                                            <div style={{
                                                ...styles.messageBubble,
                                                // Green for mine, white for theirs
                                                backgroundColor: isMine ? '#16a34a' : 'white',
                                                color: isMine ? 'white' : '#111827',
                                                // Round corners differently based on sender
                                                borderRadius: isMine
                                                    ? '18px 18px 4px 18px'
                                                    : '18px 18px 18px 4px',
                                            }}>
                                                {/* Message text */}
                                                <p style={styles.messageText}>
                                                    {message.message}
                                                </p>

                                                {/* Message timestamp */}
                                                <span style={{
                                                    ...styles.messageTime,
                                                    // White time for mine, grey for theirs
                                                    color: isMine
                                                        ? 'rgba(255,255,255,0.7)'
                                                        : '#9ca3af',
                                                }}>
                                                    {formatTime(message.created_at)}
                                                    {/* Show read receipt for sent messages */}
                                                    {isMine && message.read_at && ' ✓✓'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}

                    {/* Show error if something went wrong */}
                    {error && (
                        <div style={styles.errorText}>{error}</div>
                    )}

                    {/* Invisible element at the bottom */}
                    {/* We scroll to this element to show the latest message */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message input area at the bottom */}
                <form onSubmit={handleSend} style={styles.inputArea}>

                    {/* Text input for typing the message */}
                    <input
                        type="text"
                        // Controlled input — value always reflects state
                        value={newMessage}
                        // Update state when the user types
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={styles.messageInput}
                        placeholder="Type a message..."
                        // Disable input while sending to prevent double sends
                        disabled={sending}
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        style={{
                            ...styles.sendBtn,
                            // Dim the button when there's nothing to send or currently sending
                            opacity: (!newMessage.trim() || sending) ? 0.5 : 1,
                            cursor: (!newMessage.trim() || sending)
                                ? 'not-allowed' : 'pointer',
                        }}
                        // Disable when empty or sending
                        disabled={!newMessage.trim() || sending}
                    >
                        {/* Show different text based on sending state */}
                        {sending ? '...' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Styles
const styles = {
    // Full height green background
    container: {
        height: '100vh',
        backgroundColor: '#f0fdf4',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
    },
    // Green navbar
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
    },
    // White app name
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    // Right side of navbar
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    // Navigation buttons in navbar
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    // White username text
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Transparent logout button
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Main chat area — takes up remaining height
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
    // Chat header with admin info
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
    // Green circle avatar
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
    // Chat partner name
    chatTitle: {
        fontSize: '1rem',
        color: '#111827',
        margin: 0,
        fontWeight: '600',
    },
    // Chat partner description
    chatSubtitle: {
        fontSize: '0.75rem',
        color: '#6b7280',
        margin: '0.25rem 0 0 0',
    },
    // Scrollable messages area
    messagesArea: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    // Loading text
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '2rem',
    },
    // Empty chat state
    emptyChat: {
        textAlign: 'center',
        padding: '3rem 1rem',
    },
    // Large icon in empty state
    emptyChatIcon: {
        fontSize: '3rem',
        marginBottom: '1rem',
    },
    // Empty state text
    emptyChatText: {
        color: '#6b7280',
        fontSize: '0.875rem',
    },
    // Date separator between message groups
    dateSeparator: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem 0',
    },
    // Date text in separator
    dateSeparatorText: {
        backgroundColor: '#e5e7eb',
        color: '#6b7280',
        fontSize: '0.75rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
    },
    // Wrapper for each message bubble — controls alignment
    messageBubbleWrapper: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
        marginBottom: '0.5rem',
    },
    // Small avatar next to received messages
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
    // The actual message bubble
    messageBubble: {
        maxWidth: '70%',
        padding: '0.625rem 1rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    // Message text
    messageText: {
        margin: 0,
        fontSize: '0.9rem',
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    // Timestamp below message text
    messageTime: {
        fontSize: '0.7rem',
        display: 'block',
        marginTop: '0.25rem',
        textAlign: 'right',
    },
    // Error text inside messages area
    errorText: {
        textAlign: 'center',
        color: '#dc2626',
        fontSize: '0.875rem',
        padding: '0.5rem',
    },
    // Input area at the bottom
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
    // Text input for typing
    messageInput: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: '1px solid #d1d5db',
        borderRadius: '999px',
        fontSize: '0.9rem',
        outline: 'none',
        backgroundColor: '#f9fafb',
    },
    // Send button
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