import { useState , useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/auth-context';
import { useMessagePanel } from '../context/message-panel-context';
import api from '../api/axios';
import { MessageIcon, XIcon, SendIcon } from './Icons';
import { colors } from '../styles/theme';

const MAX_INPUT_HEIGHT = 132; // roughly 6 lines at this font size/line-height

export default function SupportMessagePanel() {
    const { user } = useAuth();

    const { panelOpen , openPanel, closePanel } = useMessagePanel();

    const [adminId, setAdminId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const threadEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        api.get('/admin-id')
            .then((res) => setAdminId(res.data.admin_id))
            .catch(() => {});
    }, []);
    
    useEffect(() => {
        if (!adminId || panelOpen) return;

        const checkUnread = () => {
            api.get(`/messages/${adminId}/unread`)
                .then((res) => setHasUnread(res.data.has_unread))
                .catch(() => {});
        };

        checkUnread();
        const interval = setInterval(checkUnread, 8000);
        return () => clearInterval(interval);
    }, [adminId, panelOpen]);

    useEffect(() => {
        if (!adminId || !panelOpen) return;

        const loadThread = () => {
            api.get(`/messages/${adminId}`)
                .then((res) => {
                    setMessages(res.data);
                    setHasUnread(false);
                })
                .catch(() => {});
        };

        loadThread();
        const interval = setInterval(loadThread, 5000);
        return () => clearInterval(interval);
    }, [adminId, panelOpen]);

    useEffect(() => {
        if (panelOpen) {
            threadEndRef.current?.scrollIntoView({ behavior: 'smooth'});
        }
    }, [messages.length, panelOpen]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        const isOverflowing = textarea.scrollHeight > MAX_INPUT_HEIGHT;
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT)}px`;
        textarea.style.overflowY = isOverflowing ? 'auto' : 'hidden';
    }, [newMessage]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !adminId) return;

        setSending(true);
        try{
            const res = await api.post('/messages', {
                receiver_id: adminId,
                message: newMessage.trim(),
            });
            setMessages((prev) => [...prev, res.data.chat_message]);
            setNewMessage('');
        } catch {
            // The message failed to send; the composer keeps its text
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-PH',{
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};

        messages.forEach((message) => {
            const date = new Date(message.created_at).toDateString();
            if (!groups[date]) {
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
        <>
            <button
                style={styles.triggerBtn}
                onClick={openPanel}
                aria-label="Messages"
            >
                <MessageIcon size={18} color={colors.textMuted} />
                {hasUnread && <span style={styles.unreadDot} /> }
            </button>
            
            {createPortal(
                <>
                    <div
                        style={{
                            ...styles.overlay,
                            opacity: panelOpen ? 1 : 0,
                            pointerEvents: panelOpen ? 'auto' : 'none',
                        }}
                        onClick={closePanel}
                    />

                    <div
                        style={{
                            ...styles.panel,
                            transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
                        }}
                    >
                        <div style={styles.header}>
                            <div style={styles.headerTitle}>
                                <span style={styles.onlineDot} />
                                <span>TataMawing Support</span>
                            </div>
                            <button
                                style={styles.closeBtn}
                                onClick={closePanel}
                                aria-label="Close messages"
                            >
                                <XIcon size={16} color={colors.textMuted} />
                            </button>
                        </div>

                                                <div style={styles.thread}>
                            {messages.length === 0 ? (
                                <div style={styles.emptyThread}>
                                    No messages yet. Send a message to start a conversation.
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
                                                        ...styles.bubbleRow,
                                                        justifyContent: isMine? 'flex-end' : 'flex-start',
                                                    }}
                                                >
                                                    {!isMine && <div style={styles.bubbleAvatar}>TM</div>}

                                                    <div
                                                        style={{
                                                            ...styles.bubble,
                                                            backgroundColor: isMine? colors.primary : '#f3f4f6',
                                                            color:isMine ? 'white' : colors.textDark,
                                                            borderRadius: isMine
                                                                ? '14px 14px 4px 14px'
                                                                : '14px 14px 14px 4px',  
                                                        }}
                                                    >
                                                        <p style={styles.bubbleText}>{message.message}</p>
                                                        <span
                                                            style={{
                                                                ...styles.bubbleTime,
                                                                color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted,
                                                            }}
                                                        >
                                                            {formatTime(message.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                            <div ref={threadEndRef} />
                        </div>

                        <form onSubmit={handleSend} style={styles.inputArea}>
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSend(e);
                                    }
                                }}
                                className="input-field"
                                style={styles.input}
                                placeholder="Message"
                                rows={1}
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                style={{
                                    ...styles.sendBtn,
                                    opacity: !newMessage.trim() || sending ? 0.4 : 1,
                                    cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
                                }}
                                disabled={!newMessage.trim() || sending}
                                aria-label="Send Message"
                            >
                                <SendIcon size={16} color="white" />
                            </button>
                        </form>
                    </div>
                </>,
                document.body
            )}    
        </>
    );
}

const styles = {
    triggerBtn: {
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colors.danger,
        border: '1.5px solid white',
    },
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 200,
        transition: 'opacity 0.25s ease',
    },
    panel: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '340px',
        maxWidth: '100vw',
        backgroundColor: 'white',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s ease',
        borderRadius: '16px 0 0 16px',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9375rem',
        fontWeight: '700',
        color: colors.textDark,
    },
    onlineDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colors.success,
        flexShrink: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thread: {
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    emptyThread: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: '0.875rem',
        padding: '2rem 0.5rem',
    },
        dateSeparator: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem 0',
    },
    dateSeparatorText: {
        backgroundColor: '#f3f4f6',
        color: colors.textMuted,
        fontSize: '0.7rem',
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
    },

    bubbleRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
    },
    bubbleAvatar: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: 'white',
        fontSize: '0.6rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    bubble: {
        maxWidth: '75%',
        padding: '0.5rem 0.75rem',
        margin: '0.05rem',
    },
    bubbleText: {
        margin: 0,
        fontSize: '0.85rem',
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    bubbleTime: {
        fontSize: '0.65rem',
        display: 'block',
        marginTop: '0.2rem',
        textAlign: 'right',
    },
    inputArea: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
        padding: '0.875rem 1.25rem',
        borderTop: `1px solid ${colors.border}`,
        flexShrink: 0,
    },
    input: {
        flex: 1,
        padding: '0.6rem 0.875rem',
        border: `1px solid ${colors.border}`,
        borderRadius: '18px',
        fontSize: '0.85rem',
        lineHeight: '1.4',
        fontFamily: 'inherit',
        outline: 'none',
        backgroundColor: 'white',
        resize: 'none',
        overflowY: 'hidden',
        maxHeight: `${MAX_INPUT_HEIGHT}px`,
    },
    sendBtn: {
        backgroundColor: colors.primary,
        border: 'none',
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginBottom: '1px',
    },
};