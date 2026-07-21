import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState ({ email: '', password: ''});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>TataMawing Solar</h1>

                <h2 style={styles.subtitle}>Sign in to you account.</h2>

                {error && <div style={styles.error}>{error}</div>}

                {/* Form — calls handleSubmit when submitted */}
                <form onSubmit={handleSubmit}>
                    {/* Email input field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <input
                            // type="email" enables browser email validation
                            type="email"
                            // name must match the key in the form state object
                            name="email"
                            // Controlled input — value always reflects form state
                            value={form.email}
                            // Update form state on every keystroke
                            onChange={handleChange}
                            style={styles.input}
                            // Browser won't submit if this is empty
                            required
                        />
                    </div>

                    {/* Password input field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Password</label>
                        <input
                            // type="password" masks the input characters
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        />
                    </div>

                    {/* Submit button — disabled while loading to prevent double submission */}
                    <button
                        type="submit"
                        style={styles.button}
                        {...(loading ? { disabled: true } : {})}
                    >
                        {/* Show different text depending on loading state */}
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Link to the registration page for users without an account */}
                <p style={styles.link}>
                    Don't have an account?{' '}
                    <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    
    // Full-height green-tinted background, centers content
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
    },
    // White card with shadow and rounded corners
    card: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
    },
    // Green title matching TataMawing's solar theme
    title: {
        color: '#16a34a',
        textAlign: 'center',
        marginBottom: '0.25rem',
        fontSize: '1.5rem',
    },
    // Smaller grey subtitle below the title
    subtitle: {
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '1.5rem',
        fontSize: '1rem',
        fontWeight: 'normal',
    },
    // Red-tinted error box for displaying login errors
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    // Wrapper for each label + input pair
    field: {
        marginBottom: '1rem',
    },
    // Label styling above each input
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    // Full-width input with border and rounded corners
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    // Full-width green submit button
    button: {
        width: '100%',
        padding: '0.75rem',
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
    // Centered small text for the register link
    link: {
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280',
    },
};