import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminInboxPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        fetchConversations();

        const interval = setInterval(() => {
            fetchConversations();
        }, 5000);

            return () => clearInterval(interval);
        }, []);

        const fetchConversations = async () => {
            try {
                const res = await api.get('/conversations');
                setConversations(res.data);
            } catch (err) {
                setError('Failed to load conversations.');
            }finally {
                setLoading(false);
            }
        };

        const handleLogout = async () => {
            await logout();
            navigate('/login');
        };

        const formatTime = (timestamp) => {
            const date = new Date(timestamp);
            const now = new Date();

            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }

            return date.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
            });
        };

        const getRoleColor = (role) => {
            if (role === 'customer') return '#3b82f6';
            if (role === 'supplier') return '#f59e0b';
            return '#6b7280';
        };

        const getRoleLabel = (role) => {
            if (role === 'customer') return 'Customer';
            if (role === 'supplier') return 'Supplier';
            return 'Unknown';
        };
    return (
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* Link to admin dashboard */}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        style={styles.navBtn}
                    >
                        📋 Quotations
                    </button>
                    <span style={styles.navRole}>Admin</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.content}>

                {/* Page header */}
                <h2 style={styles.pageTitle}>Messages</h2>
                <p style={styles.pageSubtitle}>
                    All conversations with customers and suppliers.
                </p>

                {/* Error message */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Conversations list */}
                <div style={styles.conversationsList}>
                    {loading ? (
                        <div style={styles.loadingText}>
                            Loading conversations...
                        </div>
                    ) : conversations.length === 0 ? (
                        // Empty state
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>💬</div>
                            <p style={styles.emptyText}>No conversations yet.</p>
                        </div>
                    ) : (
                        // One row per conversation
                        conversations.map((conversation) => (
                            <div
                                key={conversation.user.id}
                                // Click to open the chat with this user
                                onClick={() => navigate(`/admin/chat/${conversation.user.id}`)}
                                style={styles.conversationRow}
                            >
                                {/* User avatar with first letter of name */}
                                <div style={{
                                    ...styles.avatar,
                                    // Different color based on role
                                    backgroundColor: getRoleColor(conversation.user.role),
                                }}>
                                    {conversation.user.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Conversation info */}
                                <div style={styles.conversationInfo}>
                                    {/* Name and role badge */}
                                    <div style={styles.conversationHeader}>
                                        <span style={styles.conversationName}>
                                            {conversation.user.name}
                                        </span>
                                        {/* Role badge */}
                                        <span style={{
                                            ...styles.roleBadge,
                                            backgroundColor: getRoleColor(conversation.user.role) + '20',
                                            color: getRoleColor(conversation.user.role),
                                        }}>
                                            {getRoleLabel(conversation.user.role)}
                                        </span>
                                    </div>

                                    {/* Latest message preview */}
                                    <p style={styles.latestMessage}>
                                        {conversation.latest_message.length > 50
                                            // Truncate long messages with ellipsis
                                            ? conversation.latest_message.substring(0, 50) + '...'
                                            : conversation.latest_message}
                                    </p>
                                </div>

                                {/* Right side — time and unread count */}
                                <div style={styles.conversationMeta}>
                                    {/* Time of latest message */}
                                    <span style={styles.conversationTime}>
                                        {formatTime(conversation.latest_time)}
                                    </span>

                                    {/* Unread count badge — only show if there are unread messages */}
                                    {conversation.unread_count > 0 && (
                                        <div style={styles.unreadBadge}>
                                            {conversation.unread_count}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    content: {
        width: '100%',
        maxWidth: '700px',
        margin: '0 auto',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    conversationsList: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
    },
    emptyIcon: {
        fontSize: '2.5rem',
        marginBottom: '0.5rem',
    },
    emptyText: {
        color: '#6b7280',
    },
    conversationRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #f3f4f6',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
        flexShrink: 0,
    },
    conversationInfo: {
        flex: 1,
        minWidth: 0,
    },
    conversationHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.25rem',
    },
    conversationName: {
        fontWeight: '600',
        color: '#111827',
        fontSize: '0.9rem',
    },
    roleBadge: {
        padding: '0.1rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: '600',
    },
    latestMessage: {
        color: '#6b7280',
        fontSize: '0.8rem',
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    conversationMeta: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.25rem',
        flexShrink: 0,
    },
    conversationTime: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    unreadBadge: {
        backgroundColor: '#16a34a',
        color: 'white',
        borderRadius: '999px',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
    },
};