import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
    GridIcon, DocumentIcon, MessageIcon, HelpIcon, ShieldIcon,
    SearchIcon, BellIcon, MenuIcon, LogOutIcon, CalendarIcon,
} from '../components/Icons';
import api from '../api/axios';
import logo from '../assets/logo.jpg';
import { adminTokens } from '../styles/adminTheme';

const NAV_COUNT_KEYS = {
    Quotations: 'quotations',
    Schedule: 'schedule',
    'Purchase Request': 'purchaseRequests',
    Messages: 'messages',
};

const SEEN_STORAGE_KEY = 'admin_seen_counts';
const COUNTS_STORAGE_KEY = 'admin_last_counts';
const EMPTY_COUNTS = { quotations: 0, schedule: 0, purchaseRequests: 0, messages: 0 };

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
            const [quotationsRes, scheduleRes, purchaseRes, messagesRes] = await Promise.allSettled([
                api.get('/admin/quotation-requests?status=pending'),
                api.get('/admin/schedules'),
                api.get('/admin/purchase-requests'),
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
            if (purchaseRes.status === 'fulfilled') {
                next.purchaseRequests = purchaseRes.value.data.filter(
                    (p) => p.procurement_status === 'pending'
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

    const handleLogout = async () => {
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
                { label: 'Purchase Request', path: '/admin/purchase-requests', icon: <CartIcon />, countKey: 'purchaseRequests' },
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
                    <img src={logo} alt="" style={styles.brandLogo} />
                    <div className="sidebar-label" style={styles.brandText}>
                        <div style={styles.brandName}>TataMawing</div>
                        <div style={styles.brandSub}>Solar &middot; Admin</div>
                    </div>
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
                    <button style={styles.logoutIconBtn} onClick={handleLogout} aria-label="Log out">
                        <LogOutIcon size={16} color={adminTokens.danger} />
                    </button>
                </div>
            </div>

            <div className="app-main" style={styles.rightSide}>

                <div style={styles.topBar}>
                    <button
                        className="sidebar-hamburger"
                        style={styles.hamburgerBtn}
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                    >
                        <MenuIcon size={20} color={adminTokens.body} />
                    </button>

                    <div style={styles.searchWrapper}>
                        <SearchIcon size={14} color={adminTokens.faint} />
                        <input
                            type="text"
                            placeholder="Search reference, customer or location"
                            className="input-field"
                            style={styles.searchInput}
                            {...(onSearchChange ? { value: searchValue ?? '' } : {})}
                            onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
                        />
                    </div>

                    <div style={styles.topBarRight}>
                        <button style={styles.iconBtn} aria-label="Notifications">
                            <BellIcon size={18} color={adminTokens.muted} />
                            {counts.messages > 0 && <span style={styles.bellDot} />}
                        </button>

                        {actions}
                    </div>
                </div>

                <main style={styles.main}>
                    {(title || subtitle) && (
                        <div style={styles.pageHeading}>
                            {title && <h1 style={styles.pageTitle}>{title}</h1>}
                            {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </main>
            </div>
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

function CartIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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
        zIndex: 100,
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
    brandLogo: {
        height: '44px',
        width: '44px',
        objectFit: 'contain',
        flexShrink: 0,
        borderRadius: '8px',
    },
    brandText: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
    },
    brandName: {
        fontSize: '14.5px',
        fontWeight: 700,
        color: adminTokens.green,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
    },
    brandSub: {
        fontSize: '11.5px',
        fontWeight: 600,
        color: adminTokens.faint,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
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
    logoutIconBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: `1px solid ${adminTokens.border}`,
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
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
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: adminTokens.page,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '10px',
        padding: '0.5rem 0.85rem',
        gap: '0.5rem',
        width: '100%',
        maxWidth: '360px',
    },
    searchInput: {
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '13.5px',
        color: adminTokens.body,
        width: '100%',
        fontFamily: adminTokens.fontUI,
    },
    topBarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        marginLeft: 'auto',
        flexShrink: 0,
    },
    iconBtn: {
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: adminTokens.danger,
        border: `1.5px solid ${adminTokens.surface}`,
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
    pageTitle: {
        fontSize: '30px',
        fontWeight: 800,
        letterSpacing: '-.03em',
        color: adminTokens.ink,
        margin: 0,
    },
    pageSubtitle: {
        fontSize: '14px',
        color: adminTokens.muted,
        margin: '6px 0 0',
    },
};
