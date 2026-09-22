import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
    GridIcon, EditIcon, DocumentIcon, CalendarIcon,
    HelpIcon, DownloadIcon,
    SearchIcon, BellIcon, PlusIcon, MenuIcon, LogOutIcon,
} from './Icons';
import { colors } from '../styles/theme';
import SupportMessagePanel from './SupportMessagePanel';
export default function CustomerLayout({ children, active }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleNavigate = (path) => {
        navigate(path);
        setSidebarOpen(false);
    }

    const getInitials = (name) => {
        if (!name) return 'C';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const navItems = [
        { label: 'Overview', path: '/customer/dashboard', icon: <GridIcon size={16} /> },
        { label: 'Request Quotation', path: '/quotation/new', icon: <EditIcon size={16} /> },
        { label: 'My Quotations', path: '/customer/my-quotations', icon: <DocumentIcon size={16} /> },
        { label: 'Installation Schedule', path: '/customer/schedule', icon: <CalendarIcon size={16} /> },
        { label: 'FAQs', path: '/faqs', icon: <HelpIcon size={16} /> },
        { label: 'Downloads', path: '/customer/downloads', icon: <DownloadIcon size={16} /> },
    ];

return (
    <div style={styles.wrapper}>
        <div
            className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
            onClick={() => setSidebarOpen(false)}
        />

        <div className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} style={styles.sidebar}>
            <div className="sidebar-label" style={styles.sidebarLogo}>TataMawing Solar</div>

            <nav style={styles.nav}>
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => handleNavigate(item.path)}
                        style={{
                            ...styles.navItem,
                            ...(active === item.label ? styles.navItemActive : {}),
                        }}
                    >
                        <span style={{
                            ...styles.navIcon,
                            color: active === item.label ? colors.primary : colors.textMuted,
                        }}>
                            {item.icon}
                        </span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}
            </nav>
            
            <div style={styles.sidebarBottom}>
                <button
                    onClick={() => handleNavigate('/quotation/new')}
                    className="btn-primary"
                    style={styles.newProjectBtn}
                >
                    <PlusIcon size={14} color="white" />
                    <span className="sidebar-label">New Quotation</span>
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
                    <MenuIcon size={20} color={colors.textBody} />
                </button>

                <div style={styles.searchWrapper}>
                    <SearchIcon size={14} color={colors.textFaint} />
                    <input
                        type="text"
                        placeholder="Search Projects..."
                        className="input-field"
                        style={styles.searchInput}
                    />
                </div>

                <div style={styles.topBarRight}>
                    <SupportMessagePanel />

                    <button style={styles.iconBtn}>
                        <BellIcon size={18} color={colors.textMuted} />
                    </button>

                    <button className="btn-secondary" style={styles.logoutBtn} onClick={handleLogout}>
                            <LogOutIcon size={15} color={colors.danger} />
                        <span>Logout</span>
                    </button>

                    <div style={styles.avatar}>
                        {getInitials(user?.name)}
                    </div>
                </div>
            </div>

            <main style={styles.main}>
                {children}
            </main>
        </div>
    </div>
);
}

const styles = {
    wrapper: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: colors.bgPage,
        width: '100%',
    },
    sidebar: {
        minHeight: '100vh',
        backgroundColor: colors.bgCard,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        padding: '1rem 0',
    },
    sidebarLogo: {
        padding: '0.25rem 1.25rem 1.5rem',
        fontSize: '1rem',
        fontWeight: '700',
        color: colors.primary,
        whiteSpace: 'nowrap',
    },
    nav: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '0 0.75rem',
        overflowY: 'auto',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.6rem 0.75rem',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        color: colors.textMuted,
        fontSize: '0.875rem',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
    },
    navItemActive: {
        backgroundColor: colors.primaryTint,
        color: colors.primary,
        fontWeight: '600',
        borderLeft: `3px solid ${colors.primary}`,
        paddingLeft: 'calc(0.75rem - 3px)',
    },
    navIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        flexShrink: 0,
    },
    sidebarBottom: {
        padding: '0 0.75rem',
        borderTop: `1px solid ${colors.border}`,
        paddingTop: '1rem',
        marginTop: '0.5rem',
    },
    newProjectBtn: {
        width: '100%',
        padding: '0.75rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: '600',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        whiteSpace: 'nowrap',
    },
    rightSide: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
    },
    topBar: {
        height: '56px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
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
        backgroundColor: colors.borderLight,
        borderRadius: '999px',
        padding: '0.5rem 1rem',
        gap: '0.5rem',
        width: '280px',
        maxWidth: '100%'
    },
    searchInput: {
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '0.875rem',
        color: colors.textBody,
        width: '100%',
        borderRadius: '999px'
    },
    topBarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        backgroundColor: 'white',
        color: colors.danger,
        fontSize: '0.8rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
        cursor: 'pointer',
        flexShrink: 0,
    },
    main: {
        flex: 1,
        padding: '1.5rem',
        overflowY: 'auto',
    },
};
