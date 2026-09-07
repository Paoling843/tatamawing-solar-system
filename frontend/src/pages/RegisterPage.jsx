import { useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';

import api from '../api/axios';

import { useAuth } from '../context/auth-context';
import { SunIcon, UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon, PhoneIcon, HomeIcon, LocationIcon, BuildingIcon } from '../components/Icons';

export default function RegisterPage() {
    const { login } = useAuth();

    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'customer',
        contact_number: '',
        address: '',
        install_location: '',
        company_name: '',
        contact_person: '',
        department: '',
    });

    const [errors, setErrors] = useState({});

    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const [agreed, setAgreed] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleRoleChange = (role) => {
        setForm({ ...form, role });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!agreed) {
            setError('Please agree to the Terms of Service and Privacy Policy.');
            return;
        }

        setError('');
        setErrors({});
        setLoading(true);

        try {
            await api.post('/register', form);

            const user = await login(form.email, form.password);

            if (user.role === 'customer') navigate('/customer/dashboard');
            else if (user.role === 'admin') navigate('/admin/dashboard');
            else if (user.role === 'supplier') navigate('/supplier/dashboard');
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                setError(err.response?.data?.message || 'Registration failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>

            <div style={styles.navbar}>
                <span style={styles.logo}>TataMawing</span>
            </div>

            <div style={styles.main}>

                <div style={styles.card}>

                    <div style={styles.leftSide}>
                        <div style={styles.logoPlaceholder}>
                            <div style={styles.sunIcon}><SunIcon size={128} color="#f59e0b" /></div>
                            <div style={styles.brandName}>TATA MAWING</div>
                            <div style={styles.brandSub}>Solar and Ice</div>
                            <div style={styles.brandLocation}>Bulan, Sorsogon</div>
                        </div>
                    </div>

                    <div style={styles.rightSide}>

                        <h2 style={styles.heading}>Create Account</h2>
                        <p style={styles.subheading}>
                            Start your journey with TataMawing Solar today.
                        </p>

                        {error && (
                            <div style={styles.error}>{error}</div>
                        )}

                        <form onSubmit={handleSubmit}>

                            <div style={styles.field}>
                                <label style={styles.label}>Full Name</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}><UserIcon size={16} color="#9ca3af" /></span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        style={styles.input}
                                        placeholder="Alex Rivers"
                                        required
                                    />
                                </div>
                                {errors.name && (
                                    <p style={styles.fieldError}>{errors.name[0]}</p>
                                )}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Email Address</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}><MailIcon size={16} color="#9ca3af" /></span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        style={styles.input}
                                        placeholder="alex@example.com"
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <p style={styles.fieldError}>{errors.email[0]}</p>
                                )}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Password</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}><LockIcon size={16} color="#9ca3af" /></span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        style={styles.input}
                                        placeholder="••••••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={styles.eyeBtn}
                                    >
                                        {showPassword ? <EyeOffIcon size={16} color="#9ca3af" /> : <EyeIcon size={16} color="#9ca3af" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p style={styles.fieldError}>{errors.password[0]}</p>
                                )}
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Confirm Password</label>
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputIcon}><LockIcon size={16} color="#9ca3af" /></span>
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        value={form.password_confirmation}
                                        onChange={handleChange}
                                        style={styles.input}
                                        placeholder="••••••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Select Your Role</label>
                                <div style={styles.roleTabsWrapper}>
                                    {['customer', 'supplier', 'admin'].map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => handleRoleChange(role)}
                                            style={{
                                                ...styles.roleTab,
                                                ...(form.role === role
                                                    ? styles.roleTabActive
                                                    : {}),
                                            }}
                                        >
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.role === 'customer' && (
                                <>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Contact Number</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}><PhoneIcon size={16} color="#9ca3af" /></span>
                                            <input
                                                type="text"
                                                name="contact_number"
                                                value={form.contact_number}
                                                onChange={handleChange}
                                                style={styles.input}
                                                placeholder="09XXXXXXXXX"
                                            />
                                        </div>
                                        {errors.contact_number && (
                                            <p style={styles.fieldError}>
                                                {errors.contact_number[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>Address</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}><HomeIcon size={16} color="#9ca3af" /></span>
                                            <input
                                                type="text"
                                                name="address"
                                                value={form.address}
                                                onChange={handleChange}
                                                style={styles.input}
                                                placeholder="Your address"
                                            />
                                        </div>
                                        {errors.address && (
                                            <p style={styles.fieldError}>
                                                {errors.address[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>
                                            Installation Location
                                        </label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}><LocationIcon size={16} color="#9ca3af" /></span>
                                            <input
                                                type="text"
                                                name="install_location"
                                                value={form.install_location}
                                                onChange={handleChange}
                                                style={styles.input}
                                                placeholder="e.g. Bulan, Sorsogon"
                                            />
                                        </div>
                                        {errors.install_location && (
                                            <p style={styles.fieldError}>
                                                {errors.install_location[0]}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {form.role === 'supplier' && (
                                <>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Company Name</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}><BuildingIcon size={16} color="#9ca3af" /></span>
                                            <input
                                                type="text"
                                                name="company_name"
                                                value={form.company_name}
                                                onChange={handleChange}
                                                style={styles.input}
                                                placeholder="Your company name"
                                            />
                                        </div>
                                        {errors.company_name && (
                                            <p style={styles.fieldError}>
                                                {errors.company_name[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>Contact Person</label>
                                        <div style={styles.inputWrapper}>
                                            <span style={styles.inputIcon}><UserIcon size={16} color="#9ca3af" /></span>
                                            <input
                                                type="text"
                                                name="contact_person"
                                                value={form.contact_person}
                                                onChange={handleChange}
                                                style={styles.input}
                                                placeholder="Contact person name"
                                            />
                                        </div>
                                        {errors.contact_person && (
                                            <p style={styles.fieldError}>
                                                {errors.contact_person[0]}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {form.role === 'admin' && (
                                <div style={styles.field}>
                                    <label style={styles.label}>Department</label>
                                    <div style={styles.inputWrapper}>
                                        <span style={styles.inputIcon}><BuildingIcon size={16} color="#9ca3af" /></span>
                                        <input
                                            type="text"
                                            name="department"
                                            value={form.department}
                                            onChange={handleChange}
                                            style={styles.input}
                                            placeholder="e.g. Operations"
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={styles.checkboxRow}>
                                <input
                                    type="checkbox"
                                    id="agree"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    style={styles.checkbox}
                                />
                                <label htmlFor="agree" style={styles.checkboxLabel}>
                                    I agree to the{' '}
                                    <span style={styles.termsLink}>Terms of Service</span>
                                    {' '}and{' '}
                                    <span style={styles.termsLink}>Privacy Policy</span>.
                                </label>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    ...styles.submitBtn,
                                    opacity: loading ? 0.8 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                                {...(loading ? { disabled: true } : {})}
                            >
                                {loading ? 'Creating account...' : 'Create Account →'}
                            </button>
                        </form>

                        <p style={styles.loginLink}>
                            Already have an account?{' '}
                            <Link to="/login" style={styles.link}>Login</Link>
                        </p>
                    </div>
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerLeft}>
                        © 2024 TataMawing Solar. All rights reserved.
                    </span>
                    <div style={styles.footerLinks}>
                        <span style={styles.footerLink}>Privacy Policy</span>
                        <span style={styles.footerLink}>Terms of Use</span>
                        <span style={styles.footerLink}>Help Center</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f0f7f4',
        display: 'flex',
        flexDirection: 'column',
    },

    navbar: {
        padding: '1rem 2rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
    },

    logo: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1a4a3a',
    },

    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
    },

    card: {
        width: '100%',
        maxWidth: '1000px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        overflow: 'hidden',
        marginBottom: '1.5rem',
    },

    leftSide: {
        flex: 1,
        backgroundColor: '#f0f7f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        minHeight: '600px',
    },

    logoPlaceholder: {
        textAlign: 'center',
    },

    sunIcon: {
        fontSize: '8rem',
        lineHeight: 1,
        marginBottom: '1rem',
        color: '#f59e0b',
    },

    brandName: {
        fontSize: '2rem',
        fontWeight: '900',
        color: '#111827',
        lineHeight: 1.1,
        letterSpacing: '-1px',
    },

    brandSub: {
        fontSize: '1.1rem',
        color: '#16a34a',
        fontWeight: '600',
        marginTop: '0.25rem',
    },

    brandLocation: {
        fontSize: '0.875rem',
        color: '#6b7280',
        marginTop: '0.25rem',
    },

    rightSide: {
        flex: 1,
        padding: '3rem 2.5rem',
        overflowY: 'auto',
    },

    heading: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#1a4a3a',
        marginBottom: '0.25rem',
    },

    subheading: {
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '1.5rem',
    },

    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },

    field: {
        marginBottom: '1rem',
    },

    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '0.4rem',
    },

    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '0 0.75rem',
        height: '46px',
    },

    inputIcon: {
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginRight: '0.5rem',
        flexShrink: 0,
    },

    input: {
        flex: 1,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        fontSize: '0.875rem',
        color: '#111827',
    },

    eyeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: '#9ca3af',
        padding: 0,
        flexShrink: 0,
    },

    fieldError: {
        color: '#dc2626',
        fontSize: '0.75rem',
        margin: '0.25rem 0 0 0',
    },

    roleTabsWrapper: {
        display: 'flex',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        overflow: 'hidden',
    },

    roleTab: {
        flex: 1,
        padding: '0.625rem',
        border: 'none',
        backgroundColor: 'white',
        color: '#6b7280',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },

    roleTabActive: {
        backgroundColor: '#1a4a3a',
        color: 'white',
        fontWeight: '600',
    },

    checkboxRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        marginTop: '0.5rem',
    },

    checkbox: {
        width: '16px',
        height: '16px',
        marginTop: '2px',
        cursor: 'pointer',
        flexShrink: 0,
    },

    checkboxLabel: {
        fontSize: '0.8rem',
        color: '#6b7280',
        lineHeight: '1.4',
    },

    termsLink: {
        color: '#0ea5e9',
        cursor: 'pointer',
    },

    submitBtn: {
        width: '100%',
        height: '50px',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '1rem',
    },

    loginLink: {
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#6b7280',
    },

    link: {
        color: '#111827',
        fontWeight: '600',
        textDecoration: 'none',
    },

    footer: {
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 0.5rem',
    },

    footerLeft: {
        fontSize: '0.8rem',
        color: '#9ca3af',
    },

    footerLinks: {
        display: 'flex',
        gap: '1.5rem',
    },

    footerLink: {
        fontSize: '0.8rem',
        color: '#9ca3af',
        cursor: 'pointer',
    },
};