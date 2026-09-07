import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../context/auth-context";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "../components/Icons";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState ({ email: '', password: ''});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setLoading(true);

        try{
            const user = await login(form.email, form.password);

            if (user.role === 'customer') navigate('/customer/dashboard');
            else if (user.role === 'admin') navigate('/admin/dashboard');
            else if (user.role === 'supplier') navigate('/supplier/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.')
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
            <div style={styles.formContainer}>

                <h1 style={styles.heading}>Welcome back</h1>
                <p style={styles.subheading}>
                    Please enter your details to access the dashboard.
                </p>

                {error && (
                    <div style={styles.error}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>

                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <div style={styles.inputWrapper}>
                            <span style={styles.inputIcon}><MailIcon size={16} color="#9ca3af" /></span>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                style={styles.input}
                                placeholder="yourname@gmail.com"
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.field}>
                        <div style={styles.passwordLabelRow}>
                            <label style={styles.label}>Password</label>
                            <span style={styles.forgotLink}>
                                Forgot Password?
                            </span>
                        </div>
                        <div style={styles.inputWrapper}>
                            <span style={styles.inputIcon}><LockIcon size={16} color="#9ca3af" /></span>
                            <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                {showPassword ? <EyeOffIcon size={16} color="#9ca3af" /> : <EyeIcon size={16} color="#9ca3af" />}
                            </button>
                        </div>
                    </div>

                    <div style={styles.checkboxRow}>
                        <input
                            type="checkbox"
                            id="remember"
                            style={styles.checkbox}
                        />
                        <label
                            htmlFor="remember"
                            style={styles.checkboxLabel}
                        >
                            Keep me logged in for 30 days
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
                        {loading ? 'Signing In...' : 'Access Dashboard →'}
                    </button>
                </form>

                <p style={styles.registerLink}>
                    Don't have an account yet?{' '}
                    <Link to="/register" style={styles.link}>
                        Request access
                    </Link>
                </p>

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
    // Full page light grey background
    page: {
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f8f9fb',
        display: 'flex',
        flexDirection: 'column',
    },
    // Top navbar with just the logo
    navbar: {
        padding: '1.25rem 2rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
    },
    // Dark green TataMawing logo text
    logo: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1a4a3a',
        fontFamily: 'Arial, sans-serif',
    },
    // Centers the form vertically and horizontally
    main: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
    },
    // Form container — no card, just a max width box
    formContainer: {
        width: '100%',
        maxWidth: '380px',
    },
    // Large bold heading
    heading: {
        fontSize: '2.25rem',
        fontWeight: '800',
        color: '#111827',
        marginBottom: '0.5rem',
        fontFamily: 'Arial, sans-serif',
    },
    // Grey subtitle below heading
    subheading: {
        fontSize: '0.9rem',
        color: '#6b7280',
        marginBottom: '2rem',
    },
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    // Each field wrapper
    field: {
        marginBottom: '1.25rem',
    },
    // Field label
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '0.5rem',
    },
    // Password label row — label on left, forgot on right
    passwordLabelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
    },
    // Forgot password link text
    forgotLink: {
        fontSize: '0.8rem',
        color: '#0ea5e9',
        cursor: 'pointer',
    },
    // Input wrapper — contains icon + input + optional eye button
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '0 0.75rem',
        height: '48px',
    },
    // Icon inside the input
    inputIcon: {
        fontSize: '0.9rem',
        color: '#9ca3af',
        marginRight: '0.5rem',
        flexShrink: 0,
    },
    // The actual input element — no background since wrapper handles it
    input: {
        flex: 1,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        fontSize: '0.9rem',
        color: '#111827',
    },
    // Eye button to show/hide password
    eyeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: '#9ca3af',
        padding: '0',
        flexShrink: 0,
    },
    // Checkbox row
    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem',
    },
    // Checkbox input
    checkbox: {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
    },
    // Checkbox label text
    checkboxLabel: {
        fontSize: '0.875rem',
        color: '#374151',
        cursor: 'pointer',
    },
    // Dark green submit button
    submitBtn: {
        width: '100%',
        height: '50px',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
    },
    // Register link text
    registerLink: {
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Clickable link style
    link: {
        color: '#0ea5e9',
        textDecoration: 'none',
    },
    // Footer links container
    footerLinks: {
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
    },
    // Each footer link
    footerLink: {
        fontSize: '0.8rem',
        color: '#9ca3af',
        cursor: 'pointer',
    },
};