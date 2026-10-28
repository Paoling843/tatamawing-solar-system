import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
    GridIcon, DocumentIcon, MessageIcon, HelpIcon, ShieldIcon,
    SearchIcon, MenuIcon, LogOutIcon, CalendarIcon,
} from '../components/Icons';
import api from '../api/axios';
import NotificationBell from './NotificationBell';
import BrandLogo from './BrandLogo';
import ConfirmDialog from './ConfirmDialog';
import { adminTokens, adminText } from '../styles/adminTheme';

const NAV_COUNT_KEYS = {
    Quotations: 'quotations',
    Schedule: 'schedule',
    Messages: 'messages',
};

const SEEN_STORAGE_KEY = 'admin_seen_counts';
const COUNTS_STORAGE_KEY = 'admin_last_counts';
const EMPTY_COUNTS = { quotations: 0, schedule: 0, messages: 0 };

const readSeenCounts = () => {
    try {
        return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

const writeSeenCounts = (seen) => {
    try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(seen));
    } catch {
        // Storage unavailable (private mode, quota, etc.) — the dot just won't persist.
    }
};

// AdminLayout remounts on every page navigation, so counts start from this cache
// instead of zero — otherwise every dot would blink out on each click while the
// fresh API calls are still in flight.
const readCachedCounts = () => {
    try {
        return { ...EMPTY_COUNTS, ...JSON.parse(localStorage.getItem(COUNTS_STORAGE_KEY)) };
    } catch {
        return { ...EMPTY_COUNTS };
    }
};

const writeCachedCounts = (counts) => {
    try {
        localStorage.setItem(COUNTS_STORAGE_KEY, JSON.stringify(counts));
    } catch {
        // Storage unavailable — falls back to the zero default on next mount.
    }
};

export default function AdminLayout({ children, active, title, subtitle, actions, searchValue, onSearchChange }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [counts, setCounts] = useState(readCachedCounts);
    const [seenCounts, setSeenCounts] = useState(readSeenCounts);

    useEffect(() => {
        let mounted = true;

        const loadCounts = async () => {
            const [quotationsRes, scheduleRes, messagesRes] = await Promise.allSettled([
                api.get('/admin/quotation-requests?status=pending'),
                api.get('/admin/schedules'),
                api.get('/conversations'),
            ]);

            if (!mounted) return;

            const next = { ...EMPTY_COUNTS };

            if (quotationsRes.status === 'fulfilled') {
                next.quotations = quotationsRes.value.data.length;
            }
            if (scheduleRes.status === 'fulfilled') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                next.schedule = scheduleRes.value.data.filter(
                    (s) => new Date(s.scheduled_date) >= today
                ).length;
            }
            if (messagesRes.status === 'fulfilled') {
                next.messages = messagesRes.value.data.reduce(
                    (sum, c) => sum + (c.unread_count || 0), 0
                );
            }

            // The page currently open is considered "seen" — its dot is cleared
            // and stays cleared (across visits) until its count rises again.
            const activeCountKey = NAV_COUNT_KEYS[active];
            const seen = readSeenCounts();
            if (activeCountKey) {
                seen[activeCountKey] = next[activeCountKey];
                writeSeenCounts(seen);
            }

            setCounts(next);
            writeCachedCounts(next);
            setSeenCounts(seen);
        };

        loadCounts();
        window.addEventListener('admin:counts-refresh', loadCounts);
        return () => {
            mounted = false;
            window.removeEventListener('admin:counts-refresh', loadCounts);
        };
    }, [active]);

    const [confirmLogout, setConfirmLogout] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        await logout();
        navigate('/login');
    };

    const handleNavigate = (path) => {
        navigate(path);
        setSidebarOpen(false);
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const navGroups = [
        {
            label: 'Workspace',
            items: [
                { label: 'Overview', path: '/admin/dashboard', icon: <GridIcon size={16} /> },
                { label: 'Quotations', path: '/admin/quotations', icon: <DocumentIcon size={16} />, countKey: 'quotations' },
                { label: 'Schedule', path: '/admin/schedule', icon: <CalendarIcon size={16} />, countKey: 'schedule' },
                { label: 'Analytics', path: '/admin/reports', icon: <ChartIcon /> },
            ],
        },
        {
            label: 'Manage',
            items: [
                { label: 'Users', path: '/admin/system', icon: <PersonIcon /> },
                { label: 'Messages', path: '/admin/inbox', icon: <MessageIcon size={16} />, countKey: 'messages' },
                { label: 'Audit Log', path: '/admin/audit-logs', icon: <ShieldIcon size={16} /> },
                { label: 'FAQ Management', path: '/admin/faqs', icon: <HelpIcon size={16} /> },
            ],
        },
    ];

    return (
        <div style={styles.wrapper}>
            <div
                className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />
            <div className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} style={styles.sidebar}>

                <button style={styles.brandBtn} onClick={() => handleNavigate('/admin/dashboard')} aria-label="Go to dashboard">
                    <BrandLogo size={40} fontSize={15} tag="Admin" textClassName="sidebar-label" />
                </button>

                <nav style={styles.nav}>
                    {navGroups.map((group) => (
                        <div key={group.label} style={styles.navGroup}>
                            <div className="sidebar-label" style={styles.navGroupLabel}>{group.label}</div>
                            {group.items.map((item) => {
                                const isActive = active === item.label;
                                const count = item.countKey ? counts[item.countKey] : undefined;
                                const seen = item.countKey ? (seenCounts[item.countKey] || 0) : 0;
                                const hasUpdate = !isActive && typeof count === 'number' && count > seen;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNavigate(item.path)}
                                        aria-current={isActive ? 'page' : undefined}
                                        style={{
                                            ...styles.navItem,
                                            ...(isActive ? styles.navItemActive : {}),
                                        }}
                                    >
                                        <span style={{
                                            ...styles.navIcon,
                                            color: isActive ? adminTokens.green : adminTokens.muted,
                                        }}>
                                            {item.icon}
                                        </span>
                                        <span className="sidebar-label" style={styles.navLabel}>{item.label}</span>
                                        {hasUpdate && (
                                            <span className="sidebar-label" style={styles.updateDot} aria-label="New updates" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div style={styles.accountBlock}>
                    <div style={styles.avatarSm}>{getInitials(user?.name)}</div>
                    <div className="sidebar-label" style={styles.accountText}>
                        <div style={styles.accountName}>{user?.name || 'Admin'}</div>
                        <div style={styles.accountRole}>
                            {user?.role === 'admin' ? 'Administrator' : (user?.role || 'Admin')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="app-main" style={styles.rightSide}>

                <div className="m-pad-sm" style={styles.topBar}>
                    <button
                        className="sidebar-hamburger m-tap"
                        style={styles.hamburgerBtn}
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                    >
                        <MenuIcon size={20} color={adminTokens.body} />
                    </button>

                    <div style={styles.topBarRight}>
                        <NotificationBell iconColor={adminTokens.muted} />

                        {actions}

                        {/* Same spot and look as the customer side's Logout */}
                        <button className="btn-secondary" style={styles.logoutBtn} onClick={() => setConfirmLogout(true)}>
                            <LogOutIcon size={15} color={adminTokens.danger} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>

                <main className="m-pad" style={styles.main}>
                    {(title || subtitle) && (
                        <div style={styles.pageHeading}>
                            {title && <h1 style={styles.pageTitle}>{title}</h1>}
                            {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </main>
            </div>

            <ConfirmDialog
                open={confirmLogout}
                title="Log out?"
                message="You'll need to sign in again to manage quotations and schedules."
                confirmLabel={loggingOut ? 'Logging out...' : 'Log out'}
                danger
                busy={loggingOut}
                onConfirm={handleLogout}
                onCancel={() => setConfirmLogout(false)}
            />
        </div>
    );
}

function ChartIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20V10" />
            <path d="M12 20V4" />
            <path d="M20 20v-6" />
        </svg>
    );
}

function PersonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: adminTokens.page,
        width: '100%',
        fontFamily: adminTokens.fontUI,
    },
    sidebar: {
        minHeight: '100vh',
        backgroundColor: adminTokens.surface,
        borderRight: `1px solid ${adminTokens.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        padding: '0.5rem 0 0',
    },
    brandBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.9rem 1.1rem 1.25rem',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
    },
    nav: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0.75rem',
        overflowY: 'auto',
    },
    navGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginBottom: '0.35rem',
    },
    navGroupLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
        padding: '0.9rem 0.75rem 0.4rem',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.55rem 0.75rem',
        borderRadius: '8px',
        border: 'none',
        borderLeft: '3px solid transparent',
        backgroundColor: 'transparent',
        color: adminTokens.muted,
        fontFamily: adminTokens.fontUI,
        fontSize: '13.5px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
    },
    navItemActive: {
        backgroundColor: adminTokens.greenTint,
        color: adminTokens.green,
        fontWeight: 600,
        borderLeftColor: adminTokens.green,
    },
    navIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        flexShrink: 0,
    },
    navLabel: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    updateDot: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: adminTokens.danger,
        flexShrink: 0,
    },
    accountBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.85rem 0.9rem',
        borderTop: `1px solid ${adminTokens.hairline}`,
        marginTop: '0.5rem',
    },
    avatarSm: {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        backgroundColor: adminTokens.green,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    accountText: { flex: 1, minWidth: 0 },
    accountName: {
        fontSize: '13px',
        fontWeight: 600,
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    accountRole: {
        fontSize: '11px',
        color: adminTokens.faint,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '8px',
        border: `1px solid ${adminTokens.border}`,
        backgroundColor: 'white',
        color: adminTokens.danger,
        fontSize: '0.8rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
    },
    rightSide: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
    },
    topBar: {
        minHeight: '56px',
        backgroundColor: adminTokens.surface,
        borderBottom: `1px solid ${adminTokens.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
        gap: '0.75rem',
    },
    hamburgerBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    topBarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        marginLeft: 'auto',
        flexShrink: 0,
    },
    main: {
        flex: 1,
        padding: '26px 28px',
        overflowY: 'auto',
        fontFamily: adminTokens.fontUI,
    },
    pageHeading: {
        marginBottom: '16px',
    },
    pageTitle: adminText.pageTitle,
    pageSubtitle: adminText.pageSubtitle,
};
