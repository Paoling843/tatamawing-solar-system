import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import CustomerLayout from '../components/CustomerLayout';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';
import { errorMessage, fieldErrors } from '../utils/errorMessage';
import { CheckIcon, EditIcon, EyeIcon, EyeOffIcon, LockIcon } from '../components/Icons';
import { adminTokens, adminUi } from '../styles/adminTheme';
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
        ? [{ label: 'Quotations approved' }, { label: 'Installations scheduled' }, { label: 'Installations completed' }]
        : [{ label: 'Quotation requests' }, { label: 'Approved quotations' }, { label: 'Installations' }]);

    return <ProfileView isAdmin={isAdmin} user={user} since={since} stats={stats} summary={summary} summaryError={summaryError} />;
}

// ---------------------------------------------------------------------
// The profile (admins and customers): green banner with the three counts,
// then account settings on the left and recent activity on the right.
// Look from the admin "My profile" mockup.
// ---------------------------------------------------------------------
const STAT_DOTS = ['#A8D5C2', '#8EC1EE', adminTokens.gold];

// Badge colours for an activity item, by its tone
const ACTIVITY_TONE = {
    approved: { dot: '#2E8B5E', bg: '#E3F1E8', fg: '#1F6B45', word: 'Approved' },
    completed: { dot: '#2E8B5E', bg: '#E3F1E8', fg: '#1F6B45', word: 'Completed' },
    rejected: { dot: '#C8372B', bg: '#FBE4E1', fg: '#A3261B', word: 'Rejected' },
    delayed: { dot: '#C8372B', bg: '#FBE4E1', fg: '#A3261B', word: 'Delayed' },
    scheduled: { dot: '#3F7CC0', bg: '#E6EFF9', fg: '#1F4E80', word: 'Scheduled' },
    in_progress: { dot: '#3F7CC0', bg: '#E6EFF9', fg: '#1F4E80', word: 'In progress' },
    pending: { dot: '#D49A23', bg: '#FBEBC4', fg: '#6B4500', word: 'Pending' },
    other: { dot: '#6B7570', bg: '#EEEFEC', fg: '#3A4440', word: 'Update' },
};

function ProfileView({ isAdmin, user, since, stats, summary, summaryError }) {
    const Layout = isAdmin ? AdminLayout : CustomerLayout;

    return (
        <Layout active={isAdmin ? 'My profile' : 'My Profile'}>
            <div style={A.page}>
                <section aria-label="Profile summary" style={A.hero}>
                    <div style={A.heroTop}>
                        <span style={A.avatar} aria-hidden="true">{initialsOf(user?.name)}</span>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={A.nameRow}>
                                <h1 style={A.name}>{user?.name}</h1>
                                <span style={A.rolePill}>{isAdmin ? 'Administrator' : 'Customer'}</span>
                            </div>
                            <p style={A.meta}>
                                <span style={{ overflowWrap: 'anywhere' }}>{user?.email}</span>
                                {since && <span>Member since {since}</span>}
                            </p>
                        </div>
                    </div>
                    <dl style={A.stats}>
                        {stats.map((stat, i) => (
                            <div key={stat.label} style={{ ...A.stat, ...(i > 0 ? A.statDivider : {}) }}>
                                <dt style={A.statLabel}>
                                    <span aria-hidden="true" style={{ ...A.statDot, background: STAT_DOTS[i] }} />
                                    {stat.label}
                                </dt>
                                <dd style={A.statValue}>{stat.value ?? '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <div style={A.columns}>
                    <div style={A.leftCol}>
                        <DetailsCard isAdmin={isAdmin} />
                        <PasswordCard />
                    </div>

                    <section style={{ ...A.card, flex: '999 1 520px', minWidth: 0 }}>
                        <div style={{ ...A.cardHead, borderBottom: `1px solid ${adminTokens.line}`, alignItems: 'center' }}>
                            <div>
                                <h2 style={A.cardTitle}>Your recent activity</h2>
                                <p style={A.cardSub}>{isAdmin ? 'Latest actions you made' : 'Latest updates on your quotations and installation'}</p>
                            </div>
                            <Link to={isAdmin ? '/admin/audit-logs' : '/customer/my-quotations'} style={A.textLink}>
                                {isAdmin ? 'Full audit log →' : 'My quotations →'}
                            </Link>
                        </div>
                        {summaryError ? (
                            <p style={A.note}>{summaryError}</p>
                        ) : !summary ? (
                            <p style={A.note}>Loading…</p>
                        ) : summary.activity.length === 0 ? (
                            <p style={A.note}>No activity yet.</p>
                        ) : (
                            <ol style={A.activityList}>
                                {summary.activity.map((item, index) => {
                                    const tone = ACTIVITY_TONE[item.tone] || ACTIVITY_TONE.other;
                                    return (
                                        <li key={`${item.at}-${index}`} style={A.activityRow}>
                                            <span style={{ ...A.badge, background: tone.bg, color: tone.fg }}>
                                                <span aria-hidden="true" style={{ ...A.badgeDot, background: tone.dot }} />
                                                {/* Admins get the action word from the server; customers, the tone's */}
                                                {item.action || tone.word}
                                            </span>
                                            <span style={A.activityTarget} title={item.label}>{item.target || item.label}</span>
                                            <span style={A.activityDate}>{when(item.at)}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                </div>
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

    // What's shown when not editing; customers also have their mobile number
    const info = [
        ['Full name', user?.name],
        ['Email', user?.email],
        isAdmin ? ['Role', 'Administrator'] : ['Mobile number', formatPhone(user?.customer?.contact_number) || '—'],
    ];

    return (
        <section style={A.card}>
            <div style={A.cardHead}>
                <div>
                    <h2 style={A.cardTitle}>Personal information</h2>
                    <p style={A.cardSub}>
                        {isAdmin
                            ? 'Your name shows on quotations you approve and in the audit log.'
                            : 'Your name and mobile number are used on your quotations and installation schedule.'}
                    </p>
                </div>
                {!editing && (
                    <button type="button" onClick={startEdit} style={A.smallBtn}>
                        <EditIcon size={14} color="currentColor" />
                        Edit
                    </button>
                )}
            </div>

            {!editing ? (
                <>
                    <dl style={A.infoList}>
                        {info.map(([label, value], i) => (
                            <div key={label} style={{ ...A.infoRow, ...(i === info.length - 1 ? { borderBottom: 'none' } : {}) }}>
                                <dt style={{ color: adminTokens.muted }}>{label}</dt>
                                <dd style={A.infoValue}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {success && <p role="status" style={A.successBand}>{success}</p>}
                </>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ margin: 0, borderTop: `1px solid ${adminTokens.line}` }}>
                    <div style={A.formBody}>
                        <label style={A.field}>
                            <span style={{ fontWeight: 600 }}>Full name</span>
                            <input
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                autoComplete="name"
                                maxLength={160}
                                aria-invalid={Boolean(errors.name)}
                                style={A.input(Boolean(errors.name))}
                            />
                            {errors.name && <span role="alert" style={A.fieldError}>{errors.name}</span>}
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600 }}>Email</span>
                            {/* The login and where reset links go, so it's never an input */}
                            <div style={A.locked}>
                                <span style={{ color: adminTokens.ink, overflowWrap: 'anywhere' }}>{user?.email}</span>
                                <span style={A.lockNote}>
                                    <LockIcon size={12} color="currentColor" />
                                    {isAdmin ? "Can't be changed" : "Can't be changed here. Message us to change it."}
                                </span>
                            </div>
                        </div>
                        {!isAdmin && (
                            <label style={A.field}>
                                <span style={{ fontWeight: 600 }}>Mobile number</span>
                                <span style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
                                    <span aria-hidden="true" style={A.countryCode}>+63</span>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel-national"
                                        placeholder="917 123 4567"
                                        aria-label="Mobile number, after +63"
                                        value={form.mobile}
                                        onChange={(e) => set('mobile', e.target.value.replace(/[^\d\s-]/g, ''))}
                                        aria-invalid={Boolean(errors.contact_number)}
                                        style={A.input(Boolean(errors.contact_number))}
                                    />
                                </span>
                                {errors.contact_number && <span role="alert" style={A.fieldError}>{errors.contact_number}</span>}
                            </label>
                        )}
                        {formError && <div role="alert" style={A.errorBox}>{formError}</div>}
                    </div>
                    <div style={A.formFoot}>
                        <button type="button" onClick={cancelEdit} disabled={busy} style={A.secondaryBtn}>Cancel</button>
                        <button type="submit" disabled={busy} style={{ ...A.primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}>
                            {busy ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------
// Password: a row with "Change password"; the form opens below it
// ---------------------------------------------------------------------
const EMPTY_PASSWORDS = { current_password: '', password: '', password_confirmation: '' };

// Shown under "New password" on the admin card, ticked off as the admin types
const PASSWORD_RULES = [
    ['At least 8 characters', (pw) => pw.length >= 8],
    ['A letter', (pw) => /[A-Za-z]/.test(pw)],
    ['A number', (pw) => /\d/.test(pw)],
];

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
    const mismatch = form.password_confirmation.length > 0 && form.password_confirmation !== form.password;
        const input = (name, autoComplete, extra = {}) => (
            <input
                id={`pw-${name}`}
                type={type}
                autoComplete={autoComplete}
                maxLength={72}
                value={form[name]}
                onChange={(e) => set(name, e.target.value)}
                aria-invalid={Boolean(errors[name])}
                style={A.input(Boolean(errors[name]) || extra.invalid)}
                {...(extra.describedBy ? { 'aria-describedby': extra.describedBy } : {})}
            />
        );

        return (
            <section style={A.card}>
                <div style={{ ...A.cardHead, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={A.lockTile} aria-hidden="true"><LockIcon size={16} color="currentColor" /></span>
                        <div>
                            <h2 style={A.cardTitle}>Password</h2>
                            <p style={A.cardSub}>Use at least 8 characters, with letters and numbers.</p>
                        </div>
                    </div>
                    {!open ? (
                        <button type="button" onClick={() => { setSuccess(''); setOpen(true); }} style={{ ...A.smallBtn, height: '36px', padding: '0 14px', fontSize: '14px' }}>
                            Change password
                        </button>
                    ) : (
                        <button type="button" aria-pressed={show} onClick={() => setShow((prev) => !prev)} style={A.showBtn}>
                            {show ? <EyeOffIcon size={16} color="currentColor" /> : <EyeIcon size={16} color="currentColor" />}
                            {show ? 'Hide passwords' : 'Show passwords'}
                        </button>
                    )}
                </div>

                {success && !open && <p role="status" style={A.successBand}>{success}</p>}

                {open && (
                    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ margin: 0, borderTop: `1px solid ${adminTokens.line}` }}>
                        <div style={A.formBody}>
                            <label htmlFor="pw-current_password" style={A.field}>
                                <span style={{ fontWeight: 600 }}>Current password</span>
                                {input('current_password', 'current-password')}
                                {errors.current_password && <span role="alert" style={A.fieldError}>{errors.current_password}</span>}
                            </label>
                            <label htmlFor="pw-password" style={A.field}>
                                <span style={{ fontWeight: 600 }}>New password</span>
                                {input('password', 'new-password', { describedBy: 'pw-rules' })}
                                {errors.password && <span role="alert" style={A.fieldError}>{errors.password}</span>}
                            </label>
                            <ul id="pw-rules" style={A.rules}>
                                {PASSWORD_RULES.map(([label, test]) => {
                                    const ok = test(form.password);
                                    return (
                                        <li key={label} style={{ ...A.rule, color: ok ? '#1F6B45' : adminTokens.muted }}>
                                            {ok ? <CheckIcon size={14} color="currentColor" /> : <span aria-hidden="true" style={A.ruleDot} />}
                                            {label}
                                            <span style={adminUi.srOnly}>{ok ? ' (done)' : ' (not yet)'}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <label htmlFor="pw-password_confirmation" style={A.field}>
                                <span style={{ fontWeight: 600 }}>Confirm new password</span>
                                {input('password_confirmation', 'new-password', { invalid: mismatch })}
                                {(errors.password_confirmation || mismatch) && (
                                    <span role="alert" style={A.fieldError}>{errors.password_confirmation || "Passwords don't match."}</span>
                                )}
                            </label>
                            <label style={A.checkRow}>
                                <input
                                    type="checkbox"
                                    checked={signOutOthers}
                                    onChange={(e) => setSignOutOthers(e.target.checked)}
                                    style={{ width: '18px', height: '18px', margin: 0, accentColor: adminTokens.green }}
                                />
                                <span>Sign me out on my other devices</span>
                            </label>
                            {formError && <div role="alert" style={A.errorBox}>{formError}</div>}
                        </div>
                        <div style={A.formFoot}>
                            <button type="button" onClick={close} disabled={busy} style={A.secondaryBtn}>Cancel</button>
                            <button type="submit" disabled={busy} style={{ ...A.primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}>
                                {busy ? 'Changing…' : 'Change password'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        );
}

// The profile's look (from the admin "My profile" mockup; customers use it too)
const A = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: 1.45, color: adminTokens.ink },

    hero: { background: adminTokens.green, color: '#FFFFFF', borderRadius: adminTokens.heroRadius },
    heroTop: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 20px', padding: '22px 24px' },
    avatar: {
        width: '64px', height: '64px', borderRadius: '50%', background: adminTokens.gold, color: adminTokens.onGold,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, flex: 'none',
    },
    nameRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' },
    name: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', overflowWrap: 'anywhere' },
    rolePill: { fontSize: '12px', fontWeight: 700, color: adminTokens.onGold, background: adminTokens.gold, borderRadius: '4px', padding: '2px 8px' },
    meta: { margin: '4px 0 0', color: adminTokens.stripText, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' },
    stats: {
        margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        borderTop: '1px solid rgba(255,255,255,0.14)', background: adminTokens.strip,
        borderRadius: `0 0 ${adminTokens.heroRadius} ${adminTokens.heroRadius}`, overflow: 'hidden',
    },
    // marginLeft -1px hides the divider of whichever cell starts a wrapped row
    stat: { padding: '14px 24px', marginLeft: '-1px' },
    statDivider: { borderLeft: '1px solid rgba(255,255,255,0.12)' },
    statLabel: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: adminTokens.stripText },
    statDot: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' },
    statValue: { margin: '2px 0 0', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

    columns: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' },
    leftCol: { flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' },

    card: { background: '#FFFFFF', border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius },
    cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '16px 20px' },
    cardTitle: { margin: 0, fontSize: '16px', fontWeight: 700, color: adminTokens.ink },
    cardSub: { margin: '2px 0 0', fontSize: '13px', color: adminTokens.muted },
    textLink: { fontWeight: 600, textDecoration: 'none', color: adminTokens.green, whiteSpace: 'nowrap' },
    note: { margin: 0, padding: '16px 20px', color: adminTokens.muted },

    infoList: { margin: 0, borderTop: `1px solid ${adminTokens.line}` },
    infoRow: {
        display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '12px', padding: '12px 20px',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
    },
    infoValue: { margin: 0, fontWeight: 600, color: adminTokens.ink, overflowWrap: 'anywhere' },
    successBand: {
        margin: 0, padding: '10px 20px', borderTop: `1px solid ${adminTokens.rowLine}`, background: '#E3F1E8',
        color: '#1F6B45', fontWeight: 600, borderRadius: `0 0 ${adminTokens.radius} ${adminTokens.radius}`,
    },

    formBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    input: (invalid) => ({
        height: '40px', padding: '0 12px', boxSizing: 'border-box', width: '100%', minWidth: 0,
        border: `1px solid ${invalid ? '#C8372B' : adminTokens.control}`, borderRadius: adminTokens.radius,
        font: 'inherit', fontSize: '15px', color: adminTokens.ink, background: '#FFFFFF',
    }),
    fieldError: { fontSize: '13px', color: adminTokens.danger },
    locked: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', minHeight: '40px', padding: '0 12px',
        border: `1px solid ${adminTokens.rowLine}`, borderRadius: adminTokens.radius, background: '#F7F7F4', color: adminTokens.muted,
    },
    countryCode: {
        display: 'flex', alignItems: 'center', padding: '0 12px', border: `1px solid ${adminTokens.control}`,
        borderRadius: adminTokens.radius, background: '#F7F7F4', fontWeight: 600, color: adminTokens.body, flex: 'none',
    },
    lockNote: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' },
    lockTile: {
        width: '32px', height: '32px', borderRadius: adminTokens.radius, background: '#FBEBC4', color: '#7A4F00',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    },
    rules: { listStyle: 'none', margin: '-6px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '13px' },
    rule: { display: 'flex', alignItems: 'center', gap: '6px' },
    ruleDot: { width: '5px', height: '5px', margin: '0 4px', borderRadius: '50%', background: 'currentColor' },
    checkRow: { display: 'flex', alignItems: 'center', gap: '10px', minHeight: '32px', cursor: 'pointer' },
    errorBox: { ...adminUi.errorBanner, margin: 0 },
    formFoot: {
        display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px', padding: '12px 20px',
        borderTop: `1px solid ${adminTokens.rowLine}`, background: adminTokens.headBg,
        borderRadius: `0 0 ${adminTokens.radius} ${adminTokens.radius}`,
    },

    smallBtn: {
        height: '34px', padding: '0 12px', borderRadius: adminTokens.radius, border: `1px solid ${adminTokens.control}`,
        background: '#FFFFFF', color: adminTokens.ink, fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap',
    },
    showBtn: {
        height: '34px', padding: '0 10px', border: 'none', background: 'transparent', color: adminTokens.green,
        fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
    },
    secondaryBtn: { ...adminUi.whiteBtn, height: '38px' },
    primaryBtn: { ...adminUi.primaryBtn, height: '38px' },

    activityList: { listStyle: 'none', margin: 0, padding: 0 },
    activityRow: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: `1px solid ${adminTokens.rowLine}`,
    },
    badge: {
        flex: 'none', minWidth: '96px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '12px', fontWeight: 700, borderRadius: '4px', padding: '2px 8px', whiteSpace: 'nowrap',
    },
    badgeDot: { width: '6px', height: '6px', borderRadius: '50%', flex: 'none' },
    activityTarget: {
        flex: 1, minWidth: 0, fontWeight: 600, color: adminTokens.green,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    activityDate: { fontSize: '13px', color: adminTokens.subtle, whiteSpace: 'nowrap' },
};
