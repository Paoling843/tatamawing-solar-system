import { useEffect, useRef, useState } from 'react';
import { LogOutIcon } from './Icons';

// The signed-in person's button in the top bar (customer and admin): their
// initials and name; it opens a small menu with My Profile and Log out.
//   user          { name, email, role }
//   onProfile     () → go to My Profile
//   onLogout      () → ask "Log out?" (the layout shows the confirmation)
//   avatarColors  { bg, text } for the initials circle
export default function AccountMenu({ user, onProfile, onLogout, avatarColors }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // Close on a click outside, or on Escape
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

    const initials = (user?.name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    const firstName = (user?.name || '').split(' ')[0];
    const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Customer';

    const choose = (action) => {
        setOpen(false);
        action();
    };

    return (
        <div ref={wrapRef} style={styles.wrap}>
            <button
                type="button"
                className="account-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account menu for ${user?.name || 'you'}`}
                style={styles.trigger}
            >
                <span style={{ ...styles.avatar, backgroundColor: avatarColors.bg, color: avatarColors.text }}>{initials}</span>
                <span className="m-hide" style={styles.triggerName}>{firstName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                    style={{ transition: 'transform 150ms ease', transform: open ? 'rotate(180deg)' : 'none' }}>
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            <div role="menu" aria-label="Account" className={`menu-pop${open ? ' menu-open' : ''}`} style={styles.menu}>
                <div style={styles.menuHead}>
                    <span style={{ ...styles.avatarLg, backgroundColor: avatarColors.bg, color: avatarColors.text }}>{initials}</span>
                    <span style={{ minWidth: 0 }}>
                        <span style={styles.menuName}>{user?.name}</span>
                        <span style={styles.menuEmail}>{user?.email}</span>
                        <span style={styles.menuRole}>{roleLabel}</span>
                    </span>
                </div>
                <button type="button" role="menuitem" className="account-item" onClick={() => choose(onProfile)} style={styles.item}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                    </svg>
                    My Profile
                </button>
                <div style={styles.divider} />
                <button type="button" role="menuitem" className="account-item" onClick={() => choose(onLogout)} style={{ ...styles.item, color: '#c0392b' }}>
                    <LogOutIcon size={16} color="currentColor" />
                    Log out
                </button>
            </div>
        </div>
    );
}

const styles = {
    wrap: { position: 'relative', flexShrink: 0 },
    trigger: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '4px 10px 4px 4px',
        border: '1px solid #e6e8e2',
        borderRadius: '999px',
        background: '#fff',
        color: '#293530',
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    avatar: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: 700,
        flexShrink: 0,
    },
    triggerName: {
        fontSize: '0.85rem',
        fontWeight: 600,
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    menu: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 120,
        width: '260px',
        maxWidth: 'calc(100vw - 24px)',
        padding: '6px',
        background: '#fff',
        border: '1px solid #e6e8e2',
        borderRadius: '12px',
        boxShadow: '0 14px 34px rgba(16, 33, 26, 0.16)',
    },
    menuHead: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '10px 10px 12px',
        borderBottom: '1px solid #eef0ec',
        marginBottom: '6px',
    },
    avatarLg: {
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8rem',
        fontWeight: 700,
        flexShrink: 0,
    },
    menuName: {
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#16211c',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    menuEmail: {
        display: 'block',
        fontSize: '0.78rem',
        color: '#5d6862',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    menuRole: {
        display: 'inline-block',
        marginTop: '4px',
        padding: '1px 8px',
        borderRadius: '999px',
        background: '#e8efea',
        color: '#0f3b2c',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: '#293530',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        fontWeight: 600,
        textAlign: 'left',
        cursor: 'pointer',
    },
    divider: { height: '1px', background: '#eef0ec', margin: '4px 6px' },
};
