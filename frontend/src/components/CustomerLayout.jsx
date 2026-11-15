import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
    GridIcon, EditIcon, DocumentIcon, CalendarIcon,
    HelpIcon, DownloadIcon,
    PlusIcon, MenuIcon,
} from './Icons';
import SupportMessagePanel from './SupportMessagePanel';
import NotificationBell from './NotificationBell';
import BrandLogo from './BrandLogo';
import ConfirmDialog from './ConfirmDialog';
import AccountMenu from './AccountMenu';

// Colours from the customer redesign ("Customer · Overview" mockup), the
// same palette as the admin pages
const T = {
    green: '#0F3D2E',
    gold: '#F2C14E',
    onGold: '#14261F',
    ink: '#1B2420',
    body: '#3A4440',
    navText: '#E4ECE8',
    line: '#E3E3DE',
    page: '#F5F5F2',
};

// Pages pass their name as `active`; matched without caring about capitals,
// so "My Quotations" still lights up "My quotations"
const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

export default function CustomerLayout({ children, active }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const navItems = [
        { label: 'Overview', path: '/customer/dashboard', icon: <GridIcon size={18} color="currentColor" /> },
        { label: 'Request quotation', path: '/quotation/new', icon: <EditIcon size={18} color="currentColor" /> },
        { label: 'My quotations', path: '/customer/my-quotations', icon: <DocumentIcon size={18} color="currentColor" /> },
        { label: 'Installation schedule', path: '/customer/schedule', icon: <CalendarIcon size={18} color="currentColor" /> },
        { label: 'FAQs', path: '/faqs', icon: <HelpIcon size={18} color="currentColor" /> },
        { label: 'Downloads', path: '/customer/downloads', icon: <DownloadIcon size={18} color="currentColor" /> },
    ];

    // The page name in the top bar
    const pageTitle = navItems.find((item) => same(item.label, active))?.label
        || (same(active, 'My Profile') ? 'My profile' : active);

    return (
        <div style={styles.wrapper}>
            <div
                className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} style={styles.sidebar}>
                <button className="sidebar-brand" style={styles.brand} onClick={() => handleNavigate('/customer/dashboard')} aria-label="Go to overview">
                    <BrandLogo light />
                </button>

                <nav aria-label="Main" style={styles.nav}>
                    {navItems.map((item) => {
                        const on = same(active, item.label);
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className="admin-nav-item"
                                onClick={() => handleNavigate(item.path)}
                                aria-current={on ? 'page' : undefined}
                                style={{ ...styles.navItem, ...(on ? styles.navItemActive : {}) }}
                            >
                                <span style={styles.navIcon}>{item.icon}</span>
                                <span className="sidebar-label">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div style={styles.sidebarBottom}>
                    <button
                        type="button"
                        onClick={() => handleNavigate('/quotation/new')}
                        className="c-btn c-btn-gold"
                        style={styles.newQuoteBtn}
                    >
                        <PlusIcon size={16} color="currentColor" />
                        <span className="sidebar-label">New quotation</span>
                    </button>
                </div>
            </aside>

            <div className="app-main" style={styles.rightSide}>
                <header className="m-pad-sm" style={styles.topBar}>
                    <button
                        className="sidebar-hamburger m-tap"
                        style={styles.hamburgerBtn}
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label="Toggle menu"
                    >
                        <MenuIcon size={20} color={T.body} />
                    </button>

                    <span style={styles.pageTitle}>{pageTitle}</span>

                    <div style={styles.topBarRight}>
                        {/* The floating "Chat with us" button and its panel */}
                        <SupportMessagePanel />

                        <NotificationBell iconColor={T.body} buttonStyle={styles.bell} />

                        {/* My Profile and Log out */}
                        <AccountMenu
                            user={user}
                            onProfile={() => navigate('/customer/profile')}
                            onLogout={() => setConfirmLogout(true)}
                            avatarColors={{ bg: T.green, text: T.gold }}
                            triggerStyle={styles.accountTrigger}
                            nameStyle={styles.accountName}
                        />
                    </div>
                </header>

                <main className="m-pad m-chat-space" style={styles.main}>
                    <div style={styles.mainInner}>{children}</div>
                </main>
            </div>

            <ConfirmDialog
                open={confirmLogout}
                title="Log out?"
                message="Your quotations stay saved on your account. Sign in again any time to check them."
                confirmLabel={loggingOut ? 'Logging out...' : 'Log out'}
                danger
                busy={loggingOut}
                onConfirm={handleLogout}
                onCancel={() => setConfirmLogout(false)}
            />
        </div>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: T.page,
        width: '100%',
        fontSize: '14px',
        lineHeight: 1.45,
        color: T.ink,
    },
    sidebar: {
        minHeight: '100vh',
        backgroundColor: T.green,
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
    },
    // Same height as the top bar, so the logo ends at the top bar's line
    brand: {
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        flexShrink: 0,
        padding: '0 20px',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
    },
    nav: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '16px 12px',
        overflowY: 'auto',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        height: '40px',
        padding: '0 10px',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: 'transparent',
        color: T.navText,
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
    },
    navItemActive: {
        backgroundColor: T.gold,
        color: T.onGold,
        fontWeight: 700,
    },
    navIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        flexShrink: 0,
    },
    sidebarBottom: {
        padding: '16px 12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
    },
    newQuoteBtn: {
        width: '100%',
        height: '44px',
        fontSize: '14px',
    },
    rightSide: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
    },
    topBar: {
        height: '60px',
        backgroundColor: '#FFFFFF',
        borderBottom: `1px solid ${T.line}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
        gap: '16px',
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
    pageTitle: {
        flex: 1,
        minWidth: 0,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    topBarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
    },
    bell: { width: '44px', height: '44px', padding: 0, border: 'none', borderRadius: '6px', background: 'transparent' },
    accountTrigger: { border: 'none', borderRadius: '6px', background: 'transparent', height: '44px', padding: '0 4px', gap: '8px', color: T.ink },
    accountName: { fontSize: '14px', fontWeight: 600, color: T.ink },
    main: {
        flex: 1,
        // The bottom keeps clear of the floating "Chat with us" button (48px tall,
        // 24px from the bottom), so the last thing on a page can scroll above it
        padding: '28px 32px 96px',
    },
    mainInner: {
        width: '100%',
        maxWidth: '1320px',
        margin: '0 auto',
    },
};
