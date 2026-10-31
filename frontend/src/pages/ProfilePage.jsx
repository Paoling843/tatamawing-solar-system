import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import CustomerLayout from '../components/CustomerLayout';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';
import { errorMessage, fieldErrors } from '../utils/errorMessage';
import { CalendarIcon, MailIcon } from '../components/Icons';
import { smallGreenButton } from '../styles/theme';
import { formatPhone } from '../utils/phone';

// My Profile (routes /customer/profile and /admin/profile), opened from the
// account menu in the top bar.
//   Header       green banner: initials, name, role, email, member since;
//                three counts from GET /api/profile/summary along the bottom
//   Personal     view mode with an Edit button; editing shows inputs and
//   information  Cancel / Save. The email is shown but never editable.
//   Recent       the admin's own audit-log entries, or a customer's latest
//   activity     notifications (same endpoint)
//   Password     collapsed row; "Change password" opens the form

const C = {
    green: '#123d2d',
    greenDark: '#0c2c20',
    gold: '#f2c230',
    ink: '#16201b',
    body: '#3b463f',
    muted: '#5f6a63',
    faint: '#6b7a71',
    onDark: '#9fc0b0',
    border: '#e2e0d7',
    line: '#ecebe4',
    rowLine: '#f0efe9',
    soft: '#faf9f5',
    error: '#b42318',
};
const MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace";

// Dot colour for an activity item
const TONE = {
    approved: '#1f8a5b',
    completed: '#1f8a5b',
    scheduled: '#2f6fb5',
    in_progress: '#2f6fb5',
    pending: C.gold,
    rejected: '#c0392b',
    delayed: '#c0392b',
};

// "+639171234567" → "917 123 4567"
const localMobile = (contactNumber) => {
    const digits = String(contactNumber || '').replace(/\D/g, '').replace(/^63/, '');
    return digits.replace(/^(\d{3})(\d{3})(\d{0,4}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
};

const initialsOf = (name) => (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();

// "10:42" today, "Yesterday", otherwise "Oct 25"
const when = (value) => {
    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function ProfilePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const Layout = isAdmin ? AdminLayout : CustomerLayout;

    // Header counts and recent activity; the page still works without them
    const [summary, setSummary] = useState(null);
    const [summaryError, setSummaryError] = useState('');
    useEffect(() => {
        let alive = true;
        api.get('/profile/summary')
            .then((res) => { if (alive) setSummary(res.data); })
            .catch((err) => { if (alive) setSummaryError(errorMessage(err, "Couldn't load your recent activity.")); });
        return () => { alive = false; };
    }, []);

    const since = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
        : null;
    const stats = summary?.stats ?? (isAdmin
        ? [{ label: 'Quotes approved' }, { label: 'Installations scheduled' }, { label: 'Installations completed' }]
        : [{ label: 'Quotation requests' }, { label: 'Approved quotations' }, { label: 'Installations' }]);

    return (
        <Layout active="My Profile">
            <div style={styles.page}>
                {/* ---- Header banner ---- */}
                <section style={styles.hero}>
                    <div className="profile-hero-top" style={styles.heroTop}>
                        <span style={styles.avatar} aria-hidden="true">{initialsOf(user?.name)}</span>
                        <div style={styles.heroText}>
                            <div style={styles.nameRow}>
                                <h1 style={styles.name}>{user?.name}</h1>
                                <span style={styles.rolePill}>{isAdmin ? 'Administrator' : 'Customer'}</span>
                            </div>
                            <div style={styles.meta}>
                                <span style={styles.metaItem}>
                                    <MailIcon size={15} color={C.onDark} />
                                    <span style={{ overflowWrap: 'anywhere' }}>{user?.email}</span>
                                </span>
                                {since && (
                                    <span style={styles.metaItem}>
                                        <CalendarIcon size={15} color={C.onDark} />
                                        Member since {since}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <dl className="profile-hero-stats" style={styles.stats}>
                        {stats.map((stat) => (
                            <div key={stat.label} className="profile-stat" style={styles.stat}>
                                <dt style={styles.statLabel}>{stat.label}</dt>
                                <dd style={styles.statValue}>{stat.value ?? '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <DetailsCard isAdmin={isAdmin} />

                {/* ---- Recent activity ---- */}
                <section style={styles.card}>
                    <div style={{ ...styles.cardHead, alignItems: 'center' }}>
                        <span style={styles.cardTitle}>Recent activity</span>
                        <Link to={isAdmin ? '/admin/audit-logs' : '/customer/my-quotations'} className="btn-primary" style={smallGreenButton}>
                            {isAdmin ? 'Audit log →' : 'My quotations →'}
                        </Link>
                    </div>
                    <div style={{ padding: '8px 24px 14px' }}>
                        {summaryError ? (
                            <p style={styles.emptyNote}>{summaryError}</p>
                        ) : !summary ? (
                            <p style={styles.emptyNote}>Loading…</p>
                        ) : summary.activity.length === 0 ? (
                            <p style={styles.emptyNote}>No activity yet.</p>
                        ) : (
                            summary.activity.map((item, index) => (
                                <div
                                    key={`${item.at}-${index}`}
                                    style={{ ...styles.activityRow, borderBottom: index === summary.activity.length - 1 ? 'none' : styles.activityRow.borderBottom }}
                                >
                                    <span style={{ ...styles.dot, background: TONE[item.tone] || '#b9c0bb' }} />
                                    <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                                    <span style={styles.activityTime}>{when(item.at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <PasswordCard />
            </div>
        </Layout>
    );
}

// ---------------------------------------------------------------------
// Personal information: read-only rows, or inputs while editing
// ---------------------------------------------------------------------
function DetailsCard({ isAdmin }) {
    const { user, updateUser } = useAuth();

    const savedForm = () => ({ name: user?.name || '', mobile: localMobile(user?.customer?.contact_number) });
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(savedForm);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setFormError('');
    };

    const startEdit = () => {
        setForm(savedForm());
        setErrors({});
        setFormError('');
        setSuccess('');
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setErrors({});
        setFormError('');
    };

    const save = async () => {
        const next = {};
        if (form.name.trim().length < 2) next.name = 'Enter your full name.';
        if (!isAdmin && form.mobile.replace(/\D/g, '').length !== 10) next.contact_number = 'Enter a 10-digit mobile number after +63.';
        setErrors(next);
        if (Object.keys(next).length) return;

        setBusy(true);
        setFormError('');
        try {
            const res = await api.put('/profile', {
                name: form.name,
                ...(isAdmin ? {} : { contact_number: `+63${form.mobile.replace(/\D/g, '')}` }),
            });
            updateUser(res.data.user);
            setEditing(false);
            setSuccess(res.data.message);
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) setFormError(errorMessage(err, "Couldn't save your details. Please try again."));
        } finally {
            setBusy(false);
        }
    };

    const rows = [
        {
            label: 'Full name',
            view: user?.name,
            input: (
                <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoComplete="name"
                    maxLength={160}
                    aria-label="Full name"
                    aria-invalid={Boolean(errors.name)}
                    style={styles.input(Boolean(errors.name))}
                />
            ),
            error: errors.name,
        },
        {
            label: 'Email',
            view: user?.email,
            // The login and where reset links go, so it's never an input
            input: (
                <span style={styles.lockedValue}>
                    <span style={{ overflowWrap: 'anywhere' }}>{user?.email}</span>
                    <span style={styles.lockNote}>
                        {isAdmin ? "Can't be changed" : "Can't be changed here. Message us to change it."}
                    </span>
                </span>
            ),
        },
        ...(isAdmin ? [] : [{
            label: 'Mobile number',
            view: formatPhone(user?.customer?.contact_number) || '—',
            input: (
                <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
                    <span aria-hidden="true" style={styles.countryCode}>+63</span>
                    <input
                        className="input-field"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="917 123 4567"
                        aria-label="Mobile number, after +63"
                        value={form.mobile}
                        onChange={(e) => set('mobile', e.target.value.replace(/[^\d\s-]/g, ''))}
                        aria-invalid={Boolean(errors.contact_number)}
                        style={styles.input(Boolean(errors.contact_number))}
                    />
                </div>
            ),
            error: errors.contact_number,
        }]),
    ];

    return (
        <section style={styles.card}>
            <div style={styles.cardHead}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={styles.cardTitle}>Personal information</span>
                    <span style={styles.cardSub}>
                        {isAdmin
                            ? 'Your name appears on the quotations you approve and in the audit log.'
                            : 'Your name and mobile number are used on your quotations and installation schedule.'}
                    </span>
                </div>
                {!editing && (
                    <button type="button" className="btn-secondary" onClick={startEdit} style={styles.secondaryBtn}>
                        Edit
                    </button>
                )}
            </div>

            <div>
                {rows.map((row) => (
                    <div key={row.label} className="profile-row" style={styles.row}>
                        <span style={styles.rowLabel}>{row.label}</span>
                        <div style={{ minWidth: 0 }}>
                            {editing ? row.input : <span style={styles.rowValue}>{row.view}</span>}
                            {editing && row.error && <p role="alert" style={styles.fieldError}>{row.error}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {formError && <div role="alert" style={styles.errorBox}>{formError}</div>}
            {success && !editing && <div role="status" style={styles.successBox}>{success}</div>}

            {editing && (
                <div style={styles.cardFoot}>
                    <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={busy} style={styles.secondaryBtn}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={save}
                        disabled={busy}
                        style={{ ...styles.primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}
                    >
                        {busy ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------
// Password: a row with "Change password"; the form opens below it
// ---------------------------------------------------------------------
const EMPTY_PASSWORDS = { current_password: '', password: '', password_confirmation: '' };

function PasswordCard() {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_PASSWORDS);
    const [signOutOthers, setSignOutOthers] = useState(true);
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setFormError('');
    };

    const close = () => {
        setOpen(false);
        setForm(EMPTY_PASSWORDS);
        setErrors({});
        setFormError('');
    };

    const save = async () => {
        const next = {};
        if (!form.current_password) next.current_password = 'Enter your current password.';
        if (form.password.length < 8) next.password = 'Use at least 8 characters.';
        else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'Use both letters and numbers.';
        if (form.password_confirmation !== form.password) next.password_confirmation = 'Passwords do not match.';
        setErrors(next);
        if (Object.keys(next).length) return;

        setBusy(true);
        setFormError('');
        try {
            const res = await api.put('/profile/password', { ...form, sign_out_others: signOutOthers });
            close();
            setSuccess(res.data.message);
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) setFormError(errorMessage(err, "Couldn't change your password. Please try again."));
        } finally {
            setBusy(false);
        }
    };

    const type = show ? 'text' : 'password';
    const fields = [
        ['current_password', 'Current password', 'current-password'],
        ['password', 'New password', 'new-password'],
        ['password_confirmation', 'Confirm new password', 'new-password'],
    ];

    return (
        <section style={styles.card}>
            <div style={{ ...styles.cardHead, alignItems: 'center', borderBottom: open ? styles.cardHead.borderBottom : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={styles.cardTitle}>Password</span>
                    <span style={styles.cardSub}>Use at least 8 characters, with letters and numbers.</span>
                </div>
                {!open ? (
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => { setSuccess(''); setOpen(true); }}
                        style={styles.secondaryBtn}
                    >
                        Change password
                    </button>
                ) : (
                    <button type="button" onClick={() => setShow((prev) => !prev)} style={styles.linkBtn}>
                        {show ? 'Hide passwords' : 'Show passwords'}
                    </button>
                )}
            </div>

            {success && !open && <div role="status" style={{ ...styles.successBox, margin: '0 24px 18px' }}>{success}</div>}

            {open && (
                <>
                    {fields.map(([name, label, autoComplete]) => (
                        <div key={name} className="profile-row" style={styles.row}>
                            <label htmlFor={`pw-${name}`} style={styles.rowLabel}>{label}</label>
                            <div style={{ minWidth: 0 }}>
                                <input
                                    id={`pw-${name}`}
                                    className="input-field"
                                    type={type}
                                    autoComplete={autoComplete}
                                    maxLength={72}
                                    value={form[name]}
                                    onChange={(e) => set(name, e.target.value)}
                                    aria-invalid={Boolean(errors[name])}
                                    style={styles.input(Boolean(errors[name]))}
                                />
                                {errors[name] && <p role="alert" style={styles.fieldError}>{errors[name]}</p>}
                            </div>
                        </div>
                    ))}
                    <label style={styles.checkRow}>
                        <input
                            type="checkbox"
                            checked={signOutOthers}
                            onChange={(e) => setSignOutOthers(e.target.checked)}
                            style={{ accentColor: C.green, width: '16px', height: '16px', margin: 0 }}
                        />
                        Sign me out on my other devices
                    </label>

                    {formError && <div role="alert" style={styles.errorBox}>{formError}</div>}

                    <div style={styles.cardFoot}>
                        <button type="button" className="btn-secondary" onClick={close} disabled={busy} style={styles.secondaryBtn}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={save}
                            disabled={busy}
                            style={{ ...styles.primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}
                        >
                            {busy ? 'Changing…' : 'Change password'}
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}

const styles = {
    page: { maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '24px' },

    // Header banner
    // Deep green with a faint warm light in the top-right corner
    hero: {
        background: `radial-gradient(circle at 100% 0%, rgba(242,194,48,.13), transparent 42%), linear-gradient(135deg, #154533 0%, ${C.green} 55%, ${C.greenDark} 100%)`,
        borderRadius: '16px',
        overflow: 'hidden',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(12,44,32,.18)',
    },
    heroTop: { display: 'flex', alignItems: 'center', gap: '20px', padding: '28px 32px' },
    avatar: {
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: C.gold,
        color: C.ink,
        boxShadow: '0 0 0 4px rgba(255,255,255,.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '26px',
        letterSpacing: '.02em',
        flexShrink: 0,
    },
    heroText: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 },
    nameRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px' },
    name: { margin: 0, fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.2, overflowWrap: 'anywhere' },
    rolePill: {
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '999px',
        border: '1px solid rgba(242,194,48,.45)',
        background: 'rgba(242,194,48,.12)',
        color: C.gold,
        fontSize: '12px',
        letterSpacing: '.03em',
        textTransform: 'uppercase',
    },
    meta: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 20px', color: C.onDark, fontSize: '14px' },
    metaItem: { display: 'inline-flex', alignItems: 'center', gap: '7px', minWidth: 0 },

    // Counts: a darker strip along the bottom, split by thin lines
    stats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        margin: 0,
        background: 'rgba(0,0,0,.14)',
        borderTop: '1px solid rgba(255,255,255,.08)',
    },
    stat: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 32px', minWidth: 0 },
    statLabel: { fontSize: '12px', fontWeight: 600, color: C.onDark, textTransform: 'uppercase', letterSpacing: '.05em' },
    statValue: { margin: 0, fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

    // Cards
    card: { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '14px' },
    cardHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '20px 24px',
        borderBottom: `1px solid ${C.line}`,
    },
    cardTitle: { fontSize: '18px', fontWeight: 700, color: C.ink },
    cardSub: { fontSize: '14px', color: C.muted },
    cardFoot: {
        display: 'flex',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '14px 24px',
        background: C.soft,
        borderRadius: '0 0 14px 14px',
    },

    // Label | value rows (columns set by .profile-row in App.css)
    row: {
        display: 'grid',
        gap: '6px 16px',
        alignItems: 'center',
        padding: '14px 24px',
        borderBottom: `1px solid ${C.rowLine}`,
    },
    rowLabel: { color: C.faint, fontSize: '14px' },
    rowValue: { fontWeight: 600, color: C.ink, overflowWrap: 'anywhere' },
    input: (invalid) => ({
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: `1px solid ${invalid ? C.error : C.border}`,
        borderRadius: '8px',
        background: C.soft,
        fontSize: '15px',
        fontFamily: 'inherit',
        color: C.ink,
    }),
    countryCode: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        border: `1px solid ${C.border}`,
        borderRadius: '8px',
        background: '#f1f0ea',
        fontWeight: 600,
        color: C.body,
        flexShrink: 0,
    },
    lockedValue: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px', fontWeight: 600, color: C.ink },
    lockNote: { fontSize: '13px', fontWeight: 400, color: C.faint },
    fieldError: { margin: '6px 0 0', fontSize: '13px', color: C.error },
    checkRow: {
        display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', fontSize: '14px', color: C.body, cursor: 'pointer',
    },

    // Activity
    activityRow: {
        display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: `1px solid ${C.rowLine}`, color: C.ink,
    },
    dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    activityTime: { fontFamily: MONO, fontSize: '12px', color: '#8a958e', whiteSpace: 'nowrap' },
    emptyNote: { margin: '10px 0', fontSize: '14px', color: C.muted },

    // Buttons and banners
    secondaryBtn: {
        whiteSpace: 'nowrap',
        border: `1px solid ${C.border}`,
        background: '#fff',
        color: C.ink,
        padding: '8px 14px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    primaryBtn: {
        whiteSpace: 'nowrap',
        border: 0,
        background: C.green,
        color: '#fff',
        padding: '9px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: 'inherit',
    },
    linkBtn: {
        border: 'none',
        background: 'none',
        padding: '6px 4px',
        color: '#174a37',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'underline',
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    errorBox: {
        margin: '14px 24px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #f0d0cb',
        background: '#fbeae7',
        color: '#a4302a',
        fontSize: '14px',
    },
    successBox: {
        margin: '14px 24px',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cfe0d7',
        background: '#e8efea',
        color: C.green,
        fontSize: '14px',
        fontWeight: 600,
    },
};
