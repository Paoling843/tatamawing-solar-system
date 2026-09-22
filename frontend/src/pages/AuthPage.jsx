import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { safeRedirect } from '../utils/safeRedirect';
import logo from '../assets/logo.jpg';
import './AuthPage.css';

// =====================================================================
// Auth page (routes: /login and /register)
// =====================================================================
// One page that switches between "Log in" and "Register" without changing
// the route. /register just opens it in register mode.
//
// ?redirect=/some/page sends the user back there after signing in (the
// Solar Computation Engine uses this to return guests to their quotation).
//
// Validation timing: a field only shows its red border and message after the
// user has left the field (blur) or pressed the submit button — never on
// first paint. Switching modes clears that state again.
// =====================================================================

const PHONE = '(02) 8123 4567';

// Design tokens
const T = {
    ink: '#16211c',
    green: '#0f3b2c',
    gold: '#f4c542',
    page: '#f6f7f4',
    border: '#e6e8e2',
    inputBorder: '#dcdfd8',
    muted: '#6b7670',
    // The spec's label grey (#9aa39d) is only 2.6:1 on white, below the
    // 4.5:1 minimum, so labels and the OR divider use the muted grey instead.
    label: '#6b7670',
    onDarkBody: '#b9c9c1',
    onDarkMuted: '#8fa79b',
    error: '#c0392b',
    successBg: '#e4ede8',
    track: '#f2f4f0',
};
const SANS = "'Figtree', Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', monospace";

const EMPTY_VALUES = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    mobile: '',
    confirm: '',
    terms: false,
};

// Wording that changes with the mode
const COPY = {
    login: {
        eyebrow: 'ACCOUNT ACCESS',
        headline: 'Welcome back.',
        blurb: 'Sign in to pick up your saved appliance load and the quotations attached to it.',
        submit: 'Log in',
        headerPrompt: 'New here?',
        headerAction: 'Register',
        footerPrompt: 'New to TataMawing Solar?',
        footerAction: 'Register',
        panelEyebrow: 'ON YOUR ACCOUNT',
        panelHeadline: 'Pick up exactly where you left off.',
        bullets: [
            'Your saved appliance load and computation',
            'Every quotation and its current status',
            'Survey schedule and installer contact',
            'Payment and financing documents',
        ],
    },
    register: {
        eyebrow: 'CREATE ACCOUNT',
        headline: 'Start your solar file.',
        blurb: 'One account holds your bills, your appliance load and every quotation we prepare for your roof.',
        submit: 'Create account',
        headerPrompt: 'Already have an account?',
        headerAction: 'Log in',
        footerPrompt: 'Already have an account?',
        footerAction: 'Log in',
        panelEyebrow: 'WHAT YOU GET',
        panelHeadline: 'Your load profile, sized once and kept on file.',
        bullets: [
            'Save your appliance load and recompute anytime',
            'Track each quotation from request to signature',
            'Book and reschedule the site survey',
            'Keep your last three bills in one place',
        ],
    },
};

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { fieldName: message } for every invalid field in this mode
function validate(mode, v) {
    const errors = {};

    if (!v.email.trim()) errors.email = 'Required';
    else if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = 'Enter a valid email address';

    if (mode === 'login') {
        if (!v.password) errors.password = 'Required';
        return errors;
    }

    if (!v.firstName.trim()) errors.firstName = 'Required';
    if (!v.lastName.trim()) errors.lastName = 'Required';

    const digits = v.mobile.replace(/\D/g, '');
    if (!digits) errors.mobile = 'Required';
    else if (digits.length !== 10) errors.mobile = 'Enter a 10-digit mobile number';

    if (!v.password) errors.password = 'Required';
    else if (v.password.length < 8) errors.password = 'Use at least 8 characters';

    if (!v.confirm) errors.confirm = 'Required';
    else if (v.confirm !== v.password) errors.confirm = 'Passwords do not match';

    if (!v.terms) errors.terms = 'Please accept the terms to continue';

    return errors;
}

// One point each for: 8+ characters, mixed case, a digit, a symbol (0–4)
function passwordScore(password) {
    return [
        password.length >= 8,
        /[a-z]/.test(password) && /[A-Z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
}

const STRENGTH = [
    { label: 'WEAK', color: T.error },     // score 0 (password typed but no points)
    { label: 'WEAK', color: T.error },     // 1
    { label: 'FAIR', color: '#d98324' },   // 2
    { label: 'GOOD', color: T.gold },      // 3
    { label: 'STRONG', color: '#2f8f5b' }, // 4
];

// Laravel field names → form field names, for errors sent back by the server
const SERVER_FIELDS = {
    email: 'email',
    password: 'password',
    first_name: 'firstName',
    last_name: 'lastName',
    contact_number: 'mobile',
};

// =====================================================================

export default function AuthPage({ initialMode = 'login' }) {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = safeRedirect(searchParams.get('redirect'));

    const [mode, setMode] = useState(initialMode);
    const [values, setValues] = useState(EMPTY_VALUES);
    const [touched, setTouched] = useState({});        // fields the user has left
    const [submitted, setSubmitted] = useState(false); // submit was pressed
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [serverErrors, setServerErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [notice, setNotice] = useState('');           // "not available yet" messages
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);

    // Timer for the short pause between the success message and redirecting
    const redirectTimer = useRef(null);
    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    const copy = COPY[mode];
    const errors = validate(mode, values);

    // The message to show under a field, or null.
    // Server errors (e.g. email already taken) always show; our own checks
    // wait until the field was left or submit was pressed.
    const fieldError = (name) => serverErrors[name] || ((touched[name] || submitted) ? errors[name] || null : null);

    const setValue = (name, value) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: null }));
        setFormError('');
    };

    const touch = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

    const switchMode = (nextMode) => {
        if (busy || nextMode === mode) return;
        setMode(nextMode);
        // Start the new mode clean — no leftover red fields or messages
        setTouched({});
        setSubmitted(false);
        setServerErrors({});
        setFormError('');
        setNotice('');
        setSuccess('');
    };

    // After signing in: admins go to their dashboard; customers go back to
    // where they came from (e.g. their saved computation) or their dashboard.
    const finish = (user, message) => {
        setSuccess(message);
        const destination = user.role === 'admin' ? '/admin/dashboard' : (redirect || '/customer/dashboard');
        redirectTimer.current = setTimeout(() => navigate(destination, { replace: true }), 1200);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setFormError('');
        setNotice('');

        if (Object.keys(errors).length > 0) return;

        setBusy(true);
        const email = values.email.trim();

        try {
            if (mode === 'login') {
                const user = await login(email, values.password, remember);
                finish(user, redirect && user.role === 'customer'
                    ? 'Signed in. Taking you back to your saved computation.'
                    : 'Signed in. Taking you to your dashboard.');
            } else {
                const user = await register({
                    first_name: values.firstName.trim(),
                    last_name: values.lastName.trim(),
                    email,
                    contact_number: `+63${values.mobile.replace(/\D/g, '')}`,
                    password: values.password,
                    password_confirmation: values.confirm,
                });
                // No verification email is sent yet, so the message doesn't mention one
                finish(user, `Account created. You're signed in as ${email}${redirect
                    ? ' — taking you back to your saved computation.'
                    : ' — taking you to your dashboard.'}`);
            }
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;

            if (status === 422 && data?.errors) {
                // Put each server message under its field
                const mapped = {};
                let unmapped = '';
                Object.entries(data.errors).forEach(([field, messages]) => {
                    const name = SERVER_FIELDS[field];
                    if (name) mapped[name] = messages[0];
                    else unmapped = unmapped || messages[0];
                });
                setServerErrors(mapped);
                if (unmapped) setFormError(unmapped);
            } else if (status === 401) {
                setFormError("That email and password don't match an account.");
            } else {
                setFormError(data?.message || (mode === 'login'
                    ? 'Could not sign you in. Please try again.'
                    : 'Could not create your account. Please try again.'));
            }
            setBusy(false);
        }
    };

    const showUnavailable = (message) => {
        setFormError('');
        setNotice(message);
    };

    const score = passwordScore(values.password);
    const strength = values.password ? STRENGTH[score] : null;

    return (
        <div className="auth-root" style={styles.page}>
            {/* ================= Header ================= */}
            <header className="auth-header" style={styles.header}>
                <div style={styles.brand}>
                    <img src={logo} alt="" style={styles.logo} />
                    <div style={styles.wordmark}>
                        TataMawing <span style={{ fontWeight: 600, color: T.muted }}>Solar</span>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <span className="auth-header-phone" style={styles.phone}>{PHONE}</span>
                    <span className="auth-header-prompt" style={{ fontSize: '14px', color: T.muted }}>{copy.headerPrompt}</span>
                    <button
                        type="button"
                        className="auth-btn-secondary"
                        onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                        style={{ ...styles.secondaryButton, width: 'auto', padding: '10px 16px', fontSize: '14px' }}
                    >
                        {copy.headerAction}
                    </button>
                </div>
            </header>

            {/* ================= Card ================= */}
            <main className="auth-body" style={styles.body}>
                <div className="auth-card" style={styles.card}>
                    {/* ----- Form column ----- */}
                    <div className="auth-form-col" style={styles.formCol}>
                        <div style={styles.eyebrow}>{copy.eyebrow}</div>
                        <h1 style={styles.headline}>{copy.headline}</h1>
                        <p style={styles.blurb}>{copy.blurb}</p>

                        <div role="tablist" aria-label="Account mode" style={styles.toggle}>
                            {[['login', 'Log in'], ['register', 'Register']].map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === id}
                                    onClick={() => switchMode(id)}
                                    style={styles.toggleButton(mode === id)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} noValidate style={styles.form}>
                            {mode === 'register' && (
                                <div className="auth-name-grid" style={styles.twoCol}>
                                    <Field
                                        id="firstName" label="First name" autoComplete="given-name"
                                        value={values.firstName} error={fieldError('firstName')}
                                        onChange={(v) => setValue('firstName', v)} onBlur={() => touch('firstName')}
                                    />
                                    <Field
                                        id="lastName" label="Last name" autoComplete="family-name"
                                        value={values.lastName} error={fieldError('lastName')}
                                        onChange={(v) => setValue('lastName', v)} onBlur={() => touch('lastName')}
                                    />
                                </div>
                            )}

                            <Field
                                id="email" label="Email address" type="email" autoComplete="email"
                                placeholder="you@email.com"
                                value={values.email} error={fieldError('email')}
                                onChange={(v) => setValue('email', v)} onBlur={() => touch('email')}
                            />

                            {mode === 'register' && (
                                <div>
                                    <label htmlFor="mobile" style={styles.label}>Mobile number</label>
                                    <div style={styles.mobileGrid}>
                                        <div aria-hidden="true" style={styles.countryCode}>+63</div>
                                        <input
                                            id="mobile"
                                            className="auth-input"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            placeholder="917 123 4567"
                                            aria-label="Mobile number, after +63"
                                            aria-invalid={Boolean(fieldError('mobile'))}
                                            aria-describedby={fieldError('mobile') ? 'mobile-error' : undefined}
                                            value={values.mobile}
                                            onChange={(e) => setValue('mobile', e.target.value.replace(/[^\d\s-]/g, ''))}
                                            onBlur={() => touch('mobile')}
                                            style={styles.input(Boolean(fieldError('mobile')))}
                                        />
                                    </div>
                                    <FieldError id="mobile-error" message={fieldError('mobile')} />
                                </div>
                            )}

                            <Field
                                id="password" label="Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                value={values.password} error={fieldError('password')}
                                onChange={(v) => setValue('password', v)} onBlur={() => touch('password')}
                                labelAction={(
                                    <button
                                        type="button"
                                        className="auth-link"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-controls="password"
                                        style={styles.showToggle}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                )}
                                after={mode === 'register' && <StrengthMeter score={score} strength={strength} />}
                            />

                            {mode === 'register' && (
                                <Field
                                    id="confirm" label="Confirm password"
                                    type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                                    value={values.confirm} error={fieldError('confirm')}
                                    onChange={(v) => setValue('confirm', v)} onBlur={() => touch('confirm')}
                                />
                            )}

                            {mode === 'login' ? (
                                <div style={styles.optionsRow}>
                                    <Checkbox checked={remember} onChange={setRemember}>
                                        Keep me signed in on this device
                                    </Checkbox>
                                    <button
                                        type="button"
                                        className="auth-link"
                                        onClick={() => showUnavailable(`Password reset isn't available yet. Call us at ${PHONE} and we'll help you get back in.`)}
                                        style={styles.forgot}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <Checkbox
                                        checked={values.terms}
                                        invalid={Boolean(fieldError('terms'))}
                                        describedBy={fieldError('terms') ? 'terms-error' : undefined}
                                        onChange={(checked) => { setValue('terms', checked); touch('terms'); }}
                                    >
                                        I agree to the Terms of Service and Privacy Policy
                                    </Checkbox>
                                    <FieldError id="terms-error" message={fieldError('terms')} />
                                </div>
                            )}

                            {formError && <div role="alert" style={styles.formError}>{formError}</div>}

                            <button
                                type="submit"
                                className="auth-btn-primary"
                                disabled={busy}
                                style={styles.primaryButton}
                            >
                                {busy && !success ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : copy.submit}
                            </button>

                            {success && <div role="status" style={styles.success}>{success}</div>}
                        </form>

                        <div style={styles.orRow}>
                            <span style={styles.hairline} />
                            <span style={styles.orLabel}>OR</span>
                            <span style={styles.hairline} />
                        </div>

                        <div className="auth-social-grid" style={styles.twoCol}>
                            <button
                                type="button"
                                className="auth-btn-secondary"
                                onClick={() => showUnavailable("Google sign-in isn't available yet. Use your email and password instead.")}
                                style={styles.secondaryButton}
                            >
                                Continue with Google
                            </button>
                            <button
                                type="button"
                                className="auth-btn-secondary"
                                onClick={() => showUnavailable("Facebook sign-in isn't available yet. Use your email and password instead.")}
                                style={styles.secondaryButton}
                            >
                                Continue with Facebook
                            </button>
                        </div>

                        {notice && <div role="status" style={styles.notice}>{notice}</div>}

                        <p style={styles.footerLine}>
                            {copy.footerPrompt}{' '}
                            <button
                                type="button"
                                className="auth-link"
                                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                                style={styles.inlineLink}
                            >
                                {copy.footerAction}
                            </button>
                        </p>
                    </div>

                    {/* ----- Green panel ----- */}
                    <aside className="auth-panel" style={styles.panel}>
                        <div style={{ ...styles.eyebrow, color: T.onDarkMuted }}>{copy.panelEyebrow}</div>
                        <h2 style={styles.panelHeadline}>{copy.panelHeadline}</h2>
                        <div style={styles.panelHairline} />
                        <ul style={styles.bullets}>
                            {copy.bullets.map((bullet) => (
                                <li key={bullet} style={styles.bullet}>
                                    <span aria-hidden="true" style={{ color: T.gold, flex: 'none' }}>✓</span>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>

                        <div style={styles.panelBottom}>
                            <div style={styles.panelHairline} />
                            <div style={styles.stats}>
                                <div>
                                    <div style={styles.statValue}>1,240+</div>
                                    <div style={styles.statLabel}>Roofs surveyed</div>
                                </div>
                                <div>
                                    <div style={styles.statValue}>18 yrs</div>
                                    <div style={styles.statLabel}>Average payback tracked</div>
                                </div>
                            </div>
                            <p style={styles.panelNote}>
                                Your bills and appliance list stay on your account. We never share them with third parties.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>

            {/* ================= Footer ================= */}
            <footer className="auth-footer" style={styles.footer}>
                <span>© 2026 TataMawing Solar</span>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span>Terms</span>
                    <span>Privacy</span>
                    <span>Support</span>
                </div>
            </footer>
        </div>
    );
}

// ---------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------

// Label (+ optional action on the right) → input → error note
function Field({ id, label, labelAction, type = 'text', value, error, onChange, onBlur, autoComplete, placeholder, after }) {
    return (
        <div>
            <div style={styles.labelRow}>
                <label htmlFor={id} style={{ ...styles.label, marginBottom: 0 }}>{label}</label>
                {labelAction}
            </div>
            <input
                id={id}
                className="auth-input"
                type={type}
                value={value}
                autoComplete={autoComplete}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                style={styles.input(Boolean(error))}
            />
            {after}
            <FieldError id={`${id}-error`} message={error} />
        </div>
    );
}

function FieldError({ id, message }) {
    if (!message) return null;
    return <div id={id} style={styles.fieldError}>{message}</div>;
}

// 18px custom checkbox. A real (visually hidden) checkbox sits underneath so
// keyboards and screen readers work normally.
function Checkbox({ checked, invalid = false, describedBy, onChange, children }) {
    return (
        <label className="auth-checkbox" style={styles.checkboxLabel}>
            <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
                <input
                    type="checkbox"
                    className="auth-visually-hidden"
                    checked={checked}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span aria-hidden="true" style={styles.checkBox(checked, invalid)}>{checked ? '✓' : ''}</span>
            </span>
            <span>{children}</span>
        </label>
    );
}

// Four bars that fill red → orange → gold → green as the password gets stronger
function StrengthMeter({ score, strength }) {
    return (
        <div style={styles.strengthRow}>
            <div style={styles.strengthBars} aria-hidden="true">
                {[1, 2, 3, 4].map((bar) => (
                    <span key={bar} style={{ ...styles.strengthBar, background: strength && bar <= score ? strength.color : T.border }} />
                ))}
            </div>
            <span style={styles.strengthLabel} aria-live="polite">
                <span className="auth-visually-hidden">Password strength: </span>
                {strength ? strength.label : '—'}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

const styles = {
    page: {
        minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
        background: T.page, fontFamily: SANS, color: T.ink, WebkitFontSmoothing: 'antialiased',
    },
    header: {
        position: 'sticky', top: 0, zIndex: 20, minHeight: '72px', background: '#fff',
        borderBottom: `1px solid ${T.border}`, padding: '0 40px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: '20px',
    },
    brand: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 },
    logo: { height: '52px', width: 'auto', display: 'block', borderRadius: '8px' },
    wordmark: { fontSize: '17px', fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    phone: { fontFamily: MONO, fontSize: '13px', color: T.muted, whiteSpace: 'nowrap' },

    body: { flex: 1, width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '48px 40px 72px' },
    card: {
        display: 'grid', background: '#fff', border: `1px solid ${T.border}`,
        borderRadius: '14px', overflow: 'hidden',
    },

    formCol: { padding: '44px', minWidth: 0 },
    eyebrow: { fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em', color: T.label },
    headline: { margin: '12px 0 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1, color: T.ink },
    blurb: { margin: '12px 0 0', fontSize: '15px', lineHeight: 1.6, color: T.muted, maxWidth: '460px' },

    toggle: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: '340px', marginTop: '26px',
        background: T.track, border: `1px solid ${T.border}`, borderRadius: '11px', padding: '4px',
    },
    toggleButton: (active) => ({
        border: 'none', borderRadius: '8px', padding: '10px 12px', fontFamily: SANS, fontSize: '14px',
        fontWeight: active ? 700 : 600, cursor: 'pointer', color: active ? T.ink : T.muted,
        background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(16,33,26,.12)' : 'none',
    }),

    form: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px', marginTop: '26px' },
    twoCol: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px' },
    labelRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '7px' },
    label: {
        display: 'block', fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em',
        textTransform: 'uppercase', color: T.label, marginBottom: '7px',
    },
    input: (invalid) => ({
        width: '100%', background: '#fff', border: `1px solid ${invalid ? T.error : T.inputBorder}`,
        borderRadius: '9px', padding: '13px', fontFamily: SANS, fontSize: '14.5px', color: T.ink,
        outline: 'none', minWidth: 0,
    }),
    fieldError: { marginTop: '6px', fontSize: '12px', color: T.error },
    showToggle: {
        background: 'none', border: 'none', padding: 0, fontFamily: SANS, fontSize: '12px',
        fontWeight: 600, color: T.green, cursor: 'pointer',
    },
    mobileGrid: { display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: '10px' },
    countryCode: {
        display: 'flex', alignItems: 'center', background: T.track, border: `1px solid ${T.inputBorder}`,
        borderRadius: '9px', padding: '13px', fontFamily: MONO, fontSize: '14px', color: T.ink,
    },

    strengthRow: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' },
    strengthBars: { display: 'flex', gap: '8px', flex: 1 },
    strengthBar: { flex: 1, height: '5px', borderRadius: '3px', transition: 'background .15s' },
    strengthLabel: { fontFamily: MONO, fontSize: '11px', letterSpacing: '.06em', color: T.ink, minWidth: '54px', textAlign: 'right' },

    optionsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' },
    checkboxLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: T.ink, cursor: 'pointer', lineHeight: 1.4 },
    checkBox: (checked, invalid) => ({
        width: '18px', height: '18px', borderRadius: '5px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '12px', lineHeight: 1, color: '#fff',
        background: checked ? T.green : '#fff',
        border: `1px solid ${invalid ? T.error : checked ? T.green : '#cfd4cd'}`,
    }),
    forgot: {
        background: 'none', border: 'none', padding: 0, fontFamily: SANS, fontSize: '13.5px',
        fontWeight: 600, color: T.green, textDecoration: 'underline', cursor: 'pointer', marginLeft: 'auto',
    },

    formError: {
        background: '#fdf3f2', border: `1px solid #efc9c4`, borderRadius: '10px',
        padding: '12px 14px', fontSize: '13.5px', color: T.error, lineHeight: 1.5,
    },
    primaryButton: {
        width: '100%', background: T.green, color: '#fff', border: 'none', borderRadius: '10px',
        padding: '16px 22px', fontFamily: SANS, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    },
    success: {
        background: T.successBg, border: '1px solid #cfe0d7', borderRadius: '10px',
        padding: '12px 14px', fontSize: '13.5px', color: T.green, lineHeight: 1.5,
    },

    orRow: { display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '520px', margin: '24px 0' },
    hairline: { flex: 1, height: '1px', background: '#eef0ec' },
    orLabel: { fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em', color: T.label },
    secondaryButton: {
        width: '100%', background: '#fff', color: '#293530', border: `1px solid ${T.inputBorder}`,
        borderRadius: '10px', padding: '13px 16px', fontFamily: SANS, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    },
    notice: {
        maxWidth: '520px', marginTop: '14px', background: T.track, border: `1px solid ${T.border}`,
        borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', color: '#293530', lineHeight: 1.5,
    },
    footerLine: { margin: '24px 0 0', fontSize: '13.5px', color: T.muted },
    inlineLink: {
        background: 'none', border: 'none', padding: 0, fontFamily: SANS, fontSize: '13.5px',
        fontWeight: 700, color: T.green, textDecoration: 'underline', cursor: 'pointer',
    },

    panel: { background: T.green, padding: '44px 38px', display: 'flex', flexDirection: 'column', minWidth: 0 },
    panelHeadline: { margin: '12px 0 0', fontSize: '21px', fontWeight: 800, lineHeight: 1.3, color: '#fff', letterSpacing: '-.015em' },
    panelHairline: { height: '1px', background: 'rgba(255,255,255,.14)', margin: '22px 0' },
    bullets: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
    bullet: { display: 'flex', gap: '10px', fontSize: '13.5px', lineHeight: 1.5, color: T.onDarkBody },
    panelBottom: { marginTop: 'auto', paddingTop: '28px' },
    stats: { display: 'flex', gap: '32px', flexWrap: 'wrap' },
    statValue: { fontFamily: MONO, fontSize: '22px', fontWeight: 500, color: T.gold, letterSpacing: '-.02em' },
    statLabel: { fontSize: '12.5px', color: T.onDarkMuted, marginTop: '4px' },
    panelNote: { margin: '20px 0 0', fontSize: '12.5px', lineHeight: 1.55, color: T.onDarkMuted },

    footer: {
        background: T.ink, color: T.onDarkBody, padding: '24px 40px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px',
    },
};
