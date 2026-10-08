import { useState , useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/auth-context';
import { useMessagePanel } from '../context/message-panel-context';
import api from '../api/axios';
import { MessengerIcon } from './MessengerLinkCard';

// Customer's chat with TataMawing Support: a floating "Chat with us" button
// (bottom-right) opens a panel that slides in from the right. Look from
// "Admin inbox redesign/Customer Dashboard.dc.html".

const MAX_INPUT_HEIGHT = 132; // roughly 6 lines at this font size/line-height

// "Chat on Messenger" cards the customer answered with "I'll wait" — kept per
// browser so they stay dismissed after a refresh
const DISMISSED_KEY = 'support-chat-dismissed-cards';

const readDismissed = () => {
    try {
        return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || [];
    } catch {
        return [];
    }
};

const T = {
    green: '#1f4d3a',
    greenPale: '#a9bab0',
    yellow: '#f3d36b',
    online: '#3fb26b',
    ink: '#1b2420',
    body: '#4a524e',
    muted: '#7a837e',
    faint: '#9aa19c',
    line: '#efefea',
    border: '#ebebe6',
    threadBg: '#fafaf8',
};

export default function SupportMessagePanel() {
    const { user } = useAuth();

    const { panelOpen , openPanel, closePanel } = useMessagePanel();

    const [adminId, setAdminId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [dismissed, setDismissed] = useState(readDismissed);
    const threadRef = useRef(null);
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
                .then((res) => setUnreadCount(res.data.unread_count ?? (res.data.has_unread ? 1 : 0)))
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
                    setUnreadCount(0);
                })
                .catch(() => {});
        };

        loadThread();
        const interval = setInterval(loadThread, 5000);
        return () => clearInterval(interval);
    }, [adminId, panelOpen]);

    // Keep the newest message in view (scrolls the thread only, not the page)
    useEffect(() => {
        const el = threadRef.current;
        if (panelOpen && el) el.scrollTop = el.scrollHeight;
    }, [messages.length, panelOpen, dismissed.length]);

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
        setSendError('');
        try{
            const res = await api.post('/messages', {
                receiver_id: adminId,
                message: newMessage.trim(),
            });
            setMessages((prev) => [...prev, res.data.chat_message]);
            setNewMessage('');
        } catch {
            // The message failed to send; the composer keeps its text
            setSendError('Your message could not be sent. Please try again.');
        } finally {
            setSending(false);
        }
    };

    // "I'll wait" — swap the card for a short note
    const dismissCard = (id) => {
        setDismissed((previous) => {
            const next = [...previous, id];
            try {
                localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
            } catch {
                // Storage blocked — it stays dismissed until the page is reloaded
            }
            return next;
        });
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US',{
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

    // The reply-time promise comes from the slow-response setting, when we know it
    const lastAutoCard = [...messages].reverse().find((m) => m.type === 'messenger_link' && m.meta?.auto);
    const replyNote = lastAutoCard?.meta?.after_minutes
        ? `Usually replies within ${lastAutoCard.meta.after_minutes} min`
        : 'We reply here as soon as we can';

    const lastMessage = messages[messages.length - 1];
    const waitingForReply = lastMessage && lastMessage.sender_id === user?.id;

    const renderMessage = (message) => {
        const isMine = message.sender_id === user?.id;

        // The admin's "Chat on Messenger" card (sent by hand or after a long wait)
        if (message.type === 'messenger_link') {
            if (dismissed.includes(message.id)) {
                return (
                    <div key={message.id} style={styles.note}>
                        Okay, we’ll reply here as soon as we can.
                    </div>
                );
            }

            return (
                <div key={message.id} style={{ ...styles.messageWrap, alignSelf: 'flex-start', alignItems: 'flex-start', maxWidth: '88%' }}>
                    <div style={styles.card}>
                        <div style={styles.cardBody}>
                            <span style={styles.cardTitle}>Is our response taking too long?</span>
                            <span style={styles.cardText}>
                                Sorry for the wait. You can reach our admin directly on Messenger for a faster reply.
                            </span>
                        </div>
                        <div style={styles.cardActions}>
                            {message.meta?.url ? (
                                <a href={message.meta.url} target="_blank" rel="noopener noreferrer" style={styles.messengerBtn}>
                                    <MessengerIcon />
                                    Chat on Messenger
                                </a>
                            ) : (
                                <span style={{ ...styles.messengerBtn, background: T.greenPale }}>Messenger unavailable</span>
                            )}
                            <button type="button" onClick={() => dismissCard(message.id)} style={styles.waitBtn}>
                                I'll wait
                            </button>
                        </div>
                    </div>
                    <span style={styles.time}>
                        {message.meta?.auto ? 'Auto message · ' : ''}{formatTime(message.created_at)}
                    </span>
                </div>
            );
        }

        return (
            <div
                key={message.id}
                style={{
                    ...styles.messageWrap,
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
            >
                <div style={isMine ? styles.bubbleMine : styles.bubbleTheirs}>{message.message}</div>
                <span style={styles.time}>{formatTime(message.created_at)}</span>
            </div>
        );
    };

    const canSend = newMessage.trim() && !sending;

    return (
        <>
            {createPortal(
                <>
                    {/* Floating "Chat with us" button (bottom-right), hidden while the chat is open */}
                    {!panelOpen && (
                        <button
                            type="button"
                            className="chat-with-us"
                            style={styles.chatButton}
                            onClick={openPanel}
                            aria-label={unreadCount ? `Chat with us, ${unreadCount} unread` : 'Chat with us'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.6A8.4 8.4 0 1 1 21 11.5z" />
                            </svg>
                            <span className="chat-with-us-label">Chat with us</span>
                            {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                        </button>
                    )}

                    <div
                        style={{
                            ...styles.overlay,
                            opacity: panelOpen ? 1 : 0,
                            pointerEvents: panelOpen ? 'auto' : 'none',
                        }}
                        onClick={closePanel}
                    />

                    <aside
                        aria-label="Chat with TataMawing Support"
                        aria-hidden={!panelOpen}
                        style={{
                            ...styles.panel,
                            transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
                            visibility: panelOpen ? 'visible' : 'hidden',
                        }}
                    >
                        <div style={styles.header}>
                            <div style={styles.logo}>
                                T
                                <span style={styles.onlineDot} />
                            </div>
                            <div style={styles.headerText}>
                                <span style={styles.headerTitle}>TataMawing Support</span>
                                <span style={styles.headerSub}>{replyNote}</span>
                            </div>
                            <button
                                type="button"
                                style={styles.closeBtn}
                                onClick={closePanel}
                                aria-label="Close messages"
                                title="Close"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div ref={threadRef} style={styles.thread}>
                            {messages.length === 0 ? (
                                <div style={styles.emptyThread}>
                                    No messages yet. Send a message to start a conversation.
                                </div>
                            ) : (
                                groupMessagesByDate(messages).map((group) => (
                                    <div key={group.date} style={styles.day}>
                                        <div style={styles.dayLabel}>{formatDate(group.messages[0].created_at)}</div>
                                        {group.messages.map(renderMessage)}
                                    </div>
                                ))
                            )}
                            {waitingForReply && (
                                <div style={{ ...styles.note, color: T.faint }}>Sent. Support will reply here.</div>
                            )}
                        </div>

                        <form onSubmit={handleSend} style={styles.composer}>
                            {sendError && <div style={styles.error}>{sendError}</div>}
                            <div style={styles.inputRow}>
                                <textarea
                                    ref={textareaRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            handleSend(e);
                                        }
                                    }}
                                    style={styles.input}
                                    placeholder="Write a message"
                                    aria-label="Write a message"
                                    rows={1}
                                    maxLength={1000}
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.sendBtn,
                                        background: canSend ? T.green : T.greenPale,
                                        cursor: canSend ? 'pointer' : 'not-allowed',
                                    }}
                                    disabled={!canSend}
                                    aria-label="Send message"
                                    title="Send"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </aside>
                </>,
                document.body
            )}
        </>
    );
}

const styles = {
    chatButton: {
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 150,
        height: '52px',
        padding: '0 20px 0 16px',
        border: 0,
        borderRadius: '999px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 24px rgba(31, 77, 58, 0.28)',
    },
    unreadBadge: {
        minWidth: '20px',
        height: '20px',
        borderRadius: '999px',
        background: T.yellow,
        color: T.ink,
        fontSize: '11px',
        fontWeight: 700,
        display: 'grid',
        placeItems: 'center',
        padding: '0 6px',
        boxSizing: 'border-box',
    },
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(16, 33, 26, 0.18)',
        zIndex: 200,
        transition: 'opacity 0.25s ease',
    },
    panel: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '380px',
        maxWidth: '100vw',
        backgroundColor: '#fff',
        borderLeft: `1px solid ${T.border}`,
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 28px rgba(16, 33, 26, 0.12)',
        transition: 'transform 0.25s ease, visibility 0.25s',
        color: T.ink,
    },

    // header
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 18px',
        borderBottom: `1px solid ${T.line}`,
        flexShrink: 0,
    },
    logo: {
        position: 'relative',
        width: '38px',
        height: '38px',
        flex: 'none',
        borderRadius: '50%',
        background: T.green,
        color: T.yellow,
        display: 'grid',
        placeItems: 'center',
        fontSize: '13px',
        fontWeight: 700,
    },
    onlineDot: {
        position: 'absolute',
        right: '-1px',
        bottom: '-1px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: T.online,
        border: '2px solid #fff',
    },
    headerText: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
    headerTitle: { fontSize: '15px', fontWeight: 600 },
    headerSub: { fontSize: '12px', color: T.muted },
    closeBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 0,
        background: 'transparent',
        color: T.body,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
    },

    // thread
    thread: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: T.threadBg,
    },
    emptyThread: {
        margin: 'auto',
        textAlign: 'center',
        color: T.muted,
        fontSize: '13px',
        padding: '2rem 0.5rem',
    },
    day: { display: 'flex', flexDirection: 'column', gap: '6px' },
    dayLabel: {
        alignSelf: 'center',
        fontSize: '11px',
        fontWeight: 600,
        color: T.faint,
        letterSpacing: '.04em',
        padding: '10px 0 6px',
    },
    messageWrap: { maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '3px' },
    bubbleMine: {
        background: T.green,
        color: '#fff',
        padding: '9px 13px',
        borderRadius: '14px 14px 4px 14px',
        fontSize: '14px',
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    bubbleTheirs: {
        background: '#fff',
        border: `1px solid ${T.border}`,
        padding: '9px 13px',
        borderRadius: '14px 14px 14px 4px',
        fontSize: '14px',
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    time: { fontSize: '11px', color: T.faint },
    note: { alignSelf: 'center', fontSize: '12px', color: T.muted, padding: '6px 0', textAlign: 'center' },

    // "Chat on Messenger" card
    card: {
        background: '#fff',
        border: '1px solid #d6e2da',
        borderRadius: '14px 14px 14px 4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    cardBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' },
    cardTitle: { fontSize: '14px', fontWeight: 600 },
    cardText: { fontSize: '13px', lineHeight: 1.45, color: T.body },
    cardActions: { display: 'flex', borderTop: `1px solid ${T.line}` },
    messengerBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '10px 12px',
        background: T.green,
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        textDecoration: 'none',
    },
    waitBtn: {
        border: 0,
        background: '#fff',
        color: T.body,
        fontSize: '13px',
        fontWeight: 500,
        padding: '0 14px',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },

    // composer
    composer: {
        padding: '12px 14px 14px',
        borderTop: `1px solid ${T.line}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
    },
    error: { fontSize: '12px', color: '#b4483a' },
    inputRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        border: '1px solid #e1e1db',
        borderRadius: '12px',
        padding: '5px 5px 5px 14px',
        background: '#fff',
    },
    input: {
        flex: 1,
        minWidth: 0,
        border: 0,
        outline: 0,
        padding: '8px 0',
        fontSize: '14px',
        lineHeight: '1.4',
        fontFamily: 'inherit',
        color: T.ink,
        background: 'transparent',
        resize: 'none',
        overflowY: 'hidden',
        maxHeight: `${MAX_INPUT_HEIGHT}px`,
    },
    sendBtn: {
        width: '36px',
        height: '36px',
        border: 0,
        borderRadius: '9px',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
    },
};
