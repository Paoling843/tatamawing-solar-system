import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { adminTokens } from '../styles/adminTheme';
import { statusColors } from '../styles/theme';
import { BellIcon, CheckIcon, XIcon, CalendarIcon, ClockIcon, DocumentIcon, FileTextIcon } from './Icons';

// The bell in the top bar (admin and customer layouts): a count of unread
// notifications and a panel listing the latest 20. Notifications are made
// by the backend (App\Services\Notifier) when something happens.

// How often to check for new ones. Kept slow so the free Render instance
// isn't kept busy; the panel also refreshes when it is opened or the tab
// regains focus.
const POLL_MS = 45000;

// Icon for each kind of notification
function KindIcon({ kind, size, color }) {
    switch (kind) {
        case 'quotation_approved':
        case 'installation_completed':
            return <CheckIcon size={size} color={color} />;
        case 'quotation_rejected':
            return <XIcon size={size} color={color} />;
        case 'quotation_new':
            return <DocumentIcon size={size} color={color} />;
        case 'external_new':
            return <FileTextIcon size={size} color={color} />;
        case 'quotation_waiting':
        case 'installation_delayed':
            return <ClockIcon size={size} color={color} />;
        default:
            return kind?.startsWith('installation_')
                ? <CalendarIcon size={size} color={color} />
                : <BellIcon size={size} color={color} />;
    }
}

const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();

// "Just now", "5m", "2h", "Yesterday", "Oct 12"
function timeAgo(date) {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (isToday(date)) return `${Math.floor(minutes / 60)}h`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (new Date(date).toDateString() === yesterday.toDateString()) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function NotificationBell({ iconColor = adminTokens.muted }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const wrapRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setItems(res.data.notifications);
            setUnread(res.data.unread_count);
        } catch {
            // Keep showing what we have; the next check will try again
        } finally {
            setLoaded(true);
        }
    }, []);

    // Check now, then every POLL_MS while the tab is visible, and on focus
    useEffect(() => {
        Promise.resolve().then(load);
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, POLL_MS);
        window.addEventListener('focus', load);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', load);
        };
    }, [load]);

    // Close on a click outside the bell/panel, or on Escape
    useEffect(() => {
        if (!open) return undefined;
        const onClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const toggle = () => {
        if (!open) load();
        setOpen(!open);
    };

    const openItem = (item) => {
        if (!item.read_at) {
            // Update the bell straight away; the request runs in the background
            setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
            setUnread((count) => Math.max(0, count - 1));
            api.patch(`/notifications/${item.id}/read`).catch(() => {});
        }
        setOpen(false);
        if (item.link) navigate(item.link);
    };

    const markAllRead = () => {
        const now = new Date().toISOString();
        setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || now })));
        setUnread(0);
        api.post('/notifications/read-all').catch(() => {});
    };

    const today = items.filter((n) => isToday(n.created_at));
    const earlier = items.filter((n) => !isToday(n.created_at));

    return (
        <div ref={wrapRef} style={styles.wrap}>
            <button
                type="button"
                onClick={toggle}
                style={styles.bellBtn}
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <BellIcon size={18} color={iconColor} />
                {unread > 0 && <span style={styles.count}>{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div className="notif-panel" role="dialog" aria-label="Notifications" style={styles.panel}>
                    <div style={styles.header}>
                        <span style={styles.headerTitle}>Notifications</span>
                        {unread > 0 && (
                            <button type="button" onClick={markAllRead} style={styles.markAll}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div style={styles.list}>
                        {!loaded ? (
                            <div style={styles.empty}>Loading…</div>
                        ) : items.length === 0 ? (
                            <div style={styles.empty}>
                                <CheckIcon size={18} color={adminTokens.green} />
                                <span>You're all caught up</span>
                            </div>
                        ) : (
                            <>
                                <Group label="Today" items={today} onOpen={openItem} />
                                <Group label="Earlier" items={earlier} onOpen={openItem} />
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Group({ label, items, onOpen }) {
    if (items.length === 0) return null;
    return (
        <div>
            <div style={styles.groupLabel}>{label}</div>
            {items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={onOpen} />
            ))}
        </div>
    );
}

function NotificationRow({ item, onOpen }) {
    const tone = statusColors[item.tone] || statusColors.draft;
    const unread = !item.read_at;

    return (
        <button
            type="button"
            className="notif-row"
            onClick={() => onOpen(item)}
            style={{ ...styles.row, backgroundColor: unread ? '#f3f7f4' : 'transparent' }}
        >
            <span style={{ ...styles.icon, backgroundColor: tone.bg, border: `1px solid ${tone.border}` }}>
                <KindIcon kind={item.kind} size={15} color={tone.text} />
            </span>
            <span style={styles.text}>
                <span style={styles.titleLine}>
                    <span style={{ ...styles.title, fontWeight: unread ? 700 : 600 }}>{item.title}</span>
                    <span style={styles.time}>{timeAgo(item.created_at)}</span>
                </span>
                {item.body && <span style={styles.body}>{item.body}</span>}
            </span>
            {unread && <span style={styles.unreadDot} aria-label="Unread" />}
        </button>
    );
}

const styles = {
    wrap: { position: 'relative' },
    bellBtn: {
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px',
    },
    count: {
        position: 'absolute', top: '-2px', right: '-4px', minWidth: '18px', height: '18px', padding: '0 5px',
        borderRadius: '999px', backgroundColor: adminTokens.danger, color: '#fff', fontSize: '11px',
        fontWeight: 700, lineHeight: '18px', textAlign: 'center', border: `2px solid ${adminTokens.surface}`,
        boxSizing: 'content-box',
    },
    panel: {
        position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '360px', zIndex: 60,
        backgroundColor: adminTokens.surface, border: `1px solid ${adminTokens.border}`, borderRadius: '14px',
        boxShadow: '0 16px 40px rgba(16,33,26,.16)', overflow: 'hidden', fontFamily: adminTokens.fontUI,
        display: 'flex', flexDirection: 'column', maxHeight: '70vh',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '14px 16px', borderBottom: `1px solid ${adminTokens.hairline}`,
    },
    headerTitle: { fontSize: '15px', fontWeight: 700, color: adminTokens.ink },
    markAll: {
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '13px', fontWeight: 600, color: adminTokens.green,
    },
    list: { overflowY: 'auto', paddingBottom: '6px' },
    groupLabel: {
        padding: '12px 16px 4px', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: adminTokens.muted,
    },
    row: {
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 16px',
        border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
    },
    icon: {
        flex: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginTop: '1px',
    },
    text: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
    titleLine: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' },
    title: { fontSize: '14px', color: adminTokens.ink, lineHeight: 1.35 },
    time: { flex: 'none', fontSize: '12px', color: adminTokens.muted },
    body: { fontSize: '13px', color: adminTokens.body, lineHeight: 1.4, overflowWrap: 'anywhere' },
    unreadDot: {
        flex: 'none', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: adminTokens.green,
        marginTop: '7px',
    },
    empty: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '36px 16px',
        fontSize: '14px', color: adminTokens.muted,
    },
};
