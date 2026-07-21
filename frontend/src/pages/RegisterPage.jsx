import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
    });

    const [error, setError] = useState('');

    const [errors, setErrors] = useState({});

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value }); 
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

const handleSubmit = async (e) => {
    // Prevent default browser form submission
    e.preventDefault();

    // Clear previous errors
    setError('');
    setErrors({});

    // Show loading state
    setLoading(true);

    try {
        // Step 1 — register the new user
        await api.post('/register', form);

        // Step 2 — log in using the fixed AuthContext login function
        // login() now correctly returns just the user object
        const user = await login(form.email, form.password);

        // Step 3 — redirect based on the user's role
        if (user?.role === 'customer') navigate('/customer/dashboard');
        else if (user?.role === 'admin') navigate('/admin/dashboard');
        else if (user?.role === 'supplier') navigate('/supplier/dashboard');

    } catch (err) {
        // Handle validation errors from Laravel
        if (err.response?.status === 422) {
            setErrors(err.response.data.errors || {});
        } else {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
    } finally {
        // Always stop loading when done
        setLoading(false);
    }
};

       return (
        // Outer container — centers the card on the page
        <div style={styles.container}>
            {/* Card — the white box containing the form */}
            <div style={styles.card}>
                {/* App title */}
                <h1 style={styles.title}>TataMawing Solar</h1>

                {/* Page subtitle */}
                <h2 style={styles.subtitle}>Create an account</h2>

                {/* Show general error message if present */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Form — calls handleSubmit when submitted */}
                <form onSubmit={handleSubmit}>

                    {/* Full name field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Full Name</label>
                        <input
                            type="text"
                            // name must match the key in the form state
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                // Add red border if this field has a validation error
                                ...(errors.name ? styles.inputError : {})
                            }}
                            required
                        />
                        {/* Show field-level error message below the input if it exists */}
                        {errors.name && <p style={styles.fieldError}>{errors.name[0]}</p>}
                    </div>

                    {/* Email field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                ...(errors.email ? styles.inputError : {})
                            }}
                            required
                        />
                        {errors.email && <p style={styles.fieldError}>{errors.email[0]}</p>}
                    </div>

                    {/* Role selector — determines which extra fields are shown */}
                    <div style={styles.field}>
                        <label style={styles.label}>Register as</label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            style={styles.input}
                        >
                            {/* Customers are the main public-facing users */}
                            <option value="customer">Customer</option>
                            {/* Suppliers are businesses providing materials */}
                            <option value="supplier">Supplier</option>
                            {/* Admin accounts are typically created internally,
                                but we include this for testing purposes */}
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* Customer-specific fields — only shown when role is 'customer' */}
                    {form.role === 'customer' && (
                        <>
                            {/* Contact number field */}
                            <div style={styles.field}>
                                <label style={styles.label}>Contact Number</label>
                                <input
                                    type="text"
                                    name="contact_number"
                                    value={form.contact_number}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...(errors.contact_number ? styles.inputError : {})
                                    }}
                                />
                                {errors.contact_number && <p style={styles.fieldError}>{errors.contact_number[0]}</p>}
                            </div>

                            {/* Address field */}
                            <div style={styles.field}>
                                <label style={styles.label}>Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...(errors.address ? styles.inputError : {})
                                    }}
                                />
                                {errors.address && <p style={styles.fieldError}>{errors.address[0]}</p>}
                            </div>

                            {/* Installation location field */}
                            <div style={styles.field}>
                                <label style={styles.label}>Installation Location</label>
                                <input
                                    type="text"
                                    name="install_location"
                                    value={form.install_location}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...(errors.install_location ? styles.inputError : {})
                                    }}
                                    // Placeholder gives the user an example of what to enter
                                    placeholder="e.g. Bulan, Sorsogon"
                                />
                                {errors.install_location && <p style={styles.fieldError}>{errors.install_location[0]}</p>}
                            </div>
                        </>
                    )}

                    {/* Supplier-specific fields — only shown when role is 'supplier' */}
                    {form.role === 'supplier' && (
                        <>
                            {/* Company name field */}
                            <div style={styles.field}>
                                <label style={styles.label}>Company Name</label>
                                <input
                                    type="text"
                                    name="company_name"
                                    value={form.company_name}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...(errors.company_name ? styles.inputError : {})
                                    }}
                                />
                                {errors.company_name && <p style={styles.fieldError}>{errors.company_name[0]}</p>}
                            </div>

                            {/* Contact person field */}
                            <div style={styles.field}>
                                <label style={styles.label}>Contact Person</label>
                                <input
                                    type="text"
                                    name="contact_person"
                                    value={form.contact_person}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...(errors.contact_person ? styles.inputError : {})
                                    }}
                                />
                                {errors.contact_person && <p style={styles.fieldError}>{errors.contact_person[0]}</p>}
                            </div>
                        </>
                    )}

                    {/* Password field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            style={{
                                ...styles.input,
                                ...(errors.password ? styles.inputError : {})
                            }}
                            required
                        />
                        {errors.password && <p style={styles.fieldError}>{errors.password[0]}</p>}
                    </div>

                    {/* Password confirmation field — must match the password field */}
                    <div style={styles.field}>
                        <label style={styles.label}>Confirm Password</label>
                        <input
                            type="password"
                            // This name must match what Laravel expects for confirmation
                            name="password_confirmation"
                            value={form.password_confirmation}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        />
                    </div>

                    {/* Submit button — disabled while loading to prevent double submission */}
                    <button
                        type="submit"
                        style={styles.button}
                        disabled={loading}
                    >
                        {/* Show different text depending on loading state */}
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                {/* Link back to login for users who already have an account */}
                <p style={styles.link}>
                    Already have an account?{' '}
                    <Link to="/login">Sign in here</Link>
                </p>
            </div>
        </div>
       );
}
// Inline styles — same green theme as the login page for visual consistency
const styles = {
    // Full-height green-tinted background
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        // Add vertical padding so the card doesn't touch the screen edges on small screens
        padding: '2rem 1rem',
    },
    // White card with shadow
    card: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '450px',
    },
    // Green title
    title: {
        color: '#16a34a',
        textAlign: 'center',
        marginBottom: '0.25rem',
        fontSize: '1.5rem',
    },
    // Grey subtitle
    subtitle: {
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '1.5rem',
        fontSize: '1rem',
        fontWeight: 'normal',
    },
    // Red error box for general errors
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
    // Label above each input
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    // Full-width input styling
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
        // Needed for select elements to match input height
        appearance: 'auto',
    },
    // Red border override for inputs with validation errors
    inputError: {
        border: '1px solid #dc2626',
    },
    // Small red text shown below an input with a validation error
    fieldError: {
        color: '#dc2626',
        fontSize: '0.75rem',
        marginTop: '0.25rem',
        // Remove default paragraph margin
        margin: '0.25rem 0 0 0',
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
    // Centered small text for the login link
    link: {
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280',
    },
};
