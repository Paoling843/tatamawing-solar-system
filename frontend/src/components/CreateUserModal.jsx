import { useEffect, useState } from 'react';
import api from '../api/axios';
import { errorMessage, fieldErrors } from '../utils/errorMessage';
import { EyeIcon, EyeOffIcon } from './Icons';
import { adminTokens } from '../styles/adminTheme';
import { smallGreenButton, whiteButton } from '../styles/theme';

// "+ Create New User" on the Users page: a customer (e.g. someone who asked
// in person) or another admin. The admin sets a starting password and passes
// it on; the person can change it in My Profile. POST /api/admin/users.
//   open, onClose, onCreated(userRow)

const EMPTY = { role: 'customer', first_name: '', last_name: '', email: '', mobile: '', password: '' };

// 10 characters, always with letters and numbers (the password rule)
const generatePassword = () => {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const pick = (set) => set[Math.floor(Math.random() * set.length)];
    const chars = [pick(letters), pick(digits), ...Array.from({ length: 8 }, () => pick(letters + digits))];
    return chars.sort(() => Math.random() - 0.5).join('');
};

export default function CreateUserModal({ open, onClose, onCreated }) {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Esc closes it, unless it's saving
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !saving) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, saving, onClose]);

    if (!open) return null;

    const isCustomer = form.role === 'customer';
    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((errs) => ({ ...errs, [key === 'mobile' ? 'contact_number' : key]: null }));
    };

    const close = () => {
        if (saving) return;
        setForm(EMPTY);
        setErrors({});
        setFormError('');
        setShowPassword(false);
        onClose();
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setFormError('');
        try {
            const res = await api.post('/admin/users', {
                role: form.role,
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                contact_number: isCustomer ? `+63${form.mobile.replace(/\D/g, '')}` : null,
                password: form.password,
            });
            onCreated(res.data.user, form.password);
            setForm(EMPTY);
            setShowPassword(false);
        } catch (err) {
            const fields = fieldErrors(err);
            setErrors(fields);
            if (!Object.keys(fields).length) {
                setFormError(errorMessage(err, "Couldn't create the account. Please try again."));
            }
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, input, errorKey = key) => (
        <label style={styles.field}>
            <span style={styles.label}>{label}</span>
            {input}
            {errors[errorKey] && <span style={styles.fieldError}>{errors[errorKey]}</span>}
        </label>
    );

    return (
        <div style={styles.overlay} onClick={close}>
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-title"
                style={styles.card}
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                noValidate
            >
                <h3 id="create-user-title" style={styles.title}>Create a new user</h3>
                <p style={styles.lead}>Set a starting password and share it with them. They can change it in My Profile.</p>

                {formError && <div role="alert" style={styles.formError}>{formError}</div>}

                {/* Account type */}
                <div role="radiogroup" aria-label="Account type" style={styles.segmented}>
                    {[['customer', 'Customer'], ['admin', 'Admin']].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={form.role === value}
                            onClick={() => setForm((f) => ({ ...f, role: value }))}
                            style={{ ...styles.segment, ...(form.role === value ? styles.segmentOn : {}) }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={styles.row}>
                    {field('First name', 'first_name', (
                        <input value={form.first_name} onChange={set('first_name')} style={styles.input(errors.first_name)} autoFocus />
                    ))}
                    {field('Last name', 'last_name', (
                        <input value={form.last_name} onChange={set('last_name')} style={styles.input(errors.last_name)} />
                    ))}
                </div>

                {field('Email', 'email', (
                    <input type="email" value={form.email} onChange={set('email')} style={styles.input(errors.email)} />
                ))}

                {isCustomer && field('Mobile number', 'mobile', (
                    <span style={styles.mobileWrap}>
                        <span style={styles.prefix}>+63</span>
                        <input
                            inputMode="numeric"
                            placeholder="917 123 4567"
                            value={form.mobile}
                            onChange={set('mobile')}
                            style={{ ...styles.input(errors.contact_number), flex: 1, minWidth: 0 }}
                        />
                    </span>
                ), 'contact_number')}

                {field('Starting password', 'password', (
                    <span style={styles.mobileWrap}>
                        <span style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={set('password')}
                                style={{ ...styles.input(errors.password), paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                style={styles.eyeBtn}
                            >
                                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                            </button>
                        </span>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setForm((f) => ({ ...f, password: generatePassword() }));
                                setShowPassword(true);
                                setErrors((errs) => ({ ...errs, password: null }));
                            }}
                            style={styles.generateBtn}
                        >
                            Generate
                        </button>
                    </span>
                ))}
                <span style={styles.hint}>At least 8 characters, with letters and numbers.</span>

                <div style={styles.actions}>
                    <button type="button" className="btn-secondary" onClick={close} disabled={saving} style={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving} style={styles.submitBtn}>
                        {saving ? 'Creating…' : 'Create account'}
                    </button>
                </div>
            </form>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    },
    card: {
        backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '460px',
        maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', gap: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box',
    },
    title: { fontSize: '1.1rem', fontWeight: 700, color: adminTokens.ink, margin: 0 },
    lead: { fontSize: '0.85rem', color: adminTokens.muted, margin: '-0.4rem 0 0', lineHeight: 1.5 },
    formError: {
        backgroundColor: '#fbeae7', color: '#a4302a', border: '1px solid #f0d0cb',
        padding: '10px 12px', borderRadius: '10px', fontSize: '0.85rem',
    },
    segmented: { display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#f2f4f0', borderRadius: '10px' },
    segment: {
        flex: 1, padding: '8px 10px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent',
        fontSize: '0.875rem', fontWeight: 600, color: adminTokens.muted, fontFamily: 'inherit', cursor: 'pointer',
    },
    segmentOn: { backgroundColor: 'white', color: adminTokens.green, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
    row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 },
    label: { fontSize: '0.8rem', fontWeight: 600, color: adminTokens.body },
    input: (invalid) => ({
        width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit',
        border: `1px solid ${invalid ? '#e3a59d' : '#dcdfd8'}`, borderRadius: '10px',
        backgroundColor: invalid ? '#fdf6f4' : 'white', color: adminTokens.ink, outline: 'none',
    }),
    fieldError: { fontSize: '0.78rem', color: adminTokens.danger },
    mobileWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
    prefix: {
        padding: '10px 12px', borderRadius: '10px', backgroundColor: '#f2f4f0', fontSize: '0.9rem',
        fontWeight: 600, color: adminTokens.body,
    },
    eyeBtn: {
        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '30px', height: '30px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none',
        color: adminTokens.muted, cursor: 'pointer',
    },
    generateBtn: { ...whiteButton, padding: '10px 12px', fontSize: '0.85rem' },
    hint: { fontSize: '0.78rem', color: adminTokens.muted, marginTop: '-0.5rem' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' },
    cancelBtn: { ...whiteButton, minHeight: '40px' },
    submitBtn: { ...smallGreenButton, minHeight: '40px', padding: '10px 18px', borderRadius: '10px', fontSize: '14px' },
};
