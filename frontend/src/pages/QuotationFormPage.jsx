import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function QuotationFormPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [solarSystemType, setSolarSystemType] = useState('off-grid');
    const [monthlyBill, setMonthlyBill] = useState('');
    const [appliances, setAppliances] = useState([
        {
            id: Date.now(),
            appliance_name: '',
            wattage: '',
            quantity: 1,
            usage_hours_per_day: '',
        }
    ]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const addAppliance = () => {
        setAppliances([
            ...appliances,
            {
                id: Date.now(),
                appliance_name: '',
                wattage: '',
                quantity: 1,
                usage_hours_per_day: '',

            }
        ]);
    };

    const removeAppliance = (id) => {
        setAppliances(appliances.filter((a) => a.id !== id));
    };

    const handleApplianceChange = (id, field, value) => {
        setAppliances(appliances.map((a) => 
            a.id === id ? { ...a, [field]: value} : a
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/quotation-requests', {
                solar_system_type: solarSystemType,
                monthly_bill: monthlyBill || null,
                appliances: appliances.map(({ id, ...rest }) => rest),
            });

            navigate('/quotation/result', {
                state: {
                    quotationRequest: res.data.quotation_request,
                    computation: res.data.computation,
                }
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to compute quotation. Please try again.')
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        // Outer container with light green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name on the left */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>


                    {/* Link to FAQ page */}
                    <button
                        onClick={() => navigate('/faqs')}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        ❓ FAQs
                    </button>

                    <button
                        onClick={() => navigate('/customer/chat')}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        💬 Chat
                    </button>
                    <button
                        onClick={() => navigate('/customer/schedule')}
                        style={{
                            backgroundColor: 'transparent',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.5)',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        📅 My Schedule
                    </button>

                {/* User info and logout on the right */}
                <div style={styles.navRight}>
                    {/* Show the logged-in user's name */}
                    <span style={styles.navUser}>Hello, {user?.name}</span>

                    {/* Logout button */}
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>

            </div>

            {/* Main content area */}
            <div style={styles.content}>

                {/* Page title */}
                <h2 style={styles.pageTitle}>Solar Power Quotation Request</h2>
                <p style={styles.pageSubtitle}>
                    Fill in your appliance details and we'll compute your solar system requirements.
                </p>

                {/* Show error message if present */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Main form */}
                <form onSubmit={handleSubmit}>

                    {/* Solar system type selection */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Solar System Type</h3>

                        {/* Three radio buttons for system type selection */}
                        <div style={styles.radioGroup}>

                            {/* On-grid option */}
                            <label style={styles.radioLabel}>
                                <input
                                    type="radio"
                                    // name groups all radio buttons so only one can be selected
                                    name="solar_system_type"
                                    value="on-grid"
                                    // Controlled — checked when solarSystemType matches
                                    checked={solarSystemType === 'on-grid'}
                                    // Update state when this option is selected
                                    onChange={(e) => setSolarSystemType(e.target.value)}
                                    style={styles.radio}
                                />
                                <div>
                                    {/* Option title */}
                                    <strong>On-Grid</strong>
                                    {/* Brief description to help the customer choose */}
                                    <p style={styles.radioDesc}>
                                        Connected to the utility grid. No battery storage needed.
                                        Best for areas with reliable electricity.
                                    </p>
                                </div>
                            </label>

                            {/* Off-grid option */}
                            <label style={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="solar_system_type"
                                    value="off-grid"
                                    checked={solarSystemType === 'off-grid'}
                                    onChange={(e) => setSolarSystemType(e.target.value)}
                                    style={styles.radio}
                                />
                                <div>
                                    <strong>Off-Grid</strong>
                                    <p style={styles.radioDesc}>
                                        Fully independent from the grid. Requires battery storage.
                                        Best for remote areas without reliable electricity.
                                    </p>
                                </div>
                            </label>

                            {/* Hybrid option */}
                            <label style={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="solar_system_type"
                                    value="hybrid"
                                    checked={solarSystemType === 'hybrid'}
                                    onChange={(e) => setSolarSystemType(e.target.value)}
                                    style={styles.radio}
                                />
                                <div>
                                    <strong>Hybrid</strong>
                                    <p style={styles.radioDesc}>
                                        Combines grid connection with battery backup.
                                        Best of both worlds.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Monthly bill input */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Current Monthly Electricity Bill</h3>
                        <p style={styles.cardDesc}>Optional — helps us validate our estimate against your actual usage.</p>

                        {/* Monthly bill input with peso sign */}
                        <div style={styles.pesoWrapper}>
                            {/* Peso sign prefix */}
                            <span style={styles.pesoSign}>₱</span>
                            <input
                                type="number"
                                // Minimum bill of 0
                                min="0"
                                value={monthlyBill}
                                onChange={(e) => setMonthlyBill(e.target.value)}
                                style={styles.pesoInput}
                                placeholder="e.g. 2500"
                            />
                        </div>
                    </div>

                    {/* Appliance list section */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Appliances</h3>
                        <p style={styles.cardDesc}>
                            List all appliances you want to power with solar energy.
                        </p>

                        {/* Column headers for the appliance table */}
                        <div style={styles.applianceHeader}>
                            <span style={{ flex: 3 }}>Appliance Name</span>
                            <span style={{ flex: 2 }}>Watts</span>
                            <span style={{ flex: 1 }}>Qty</span>
                            <span style={{ flex: 2 }}>Hours/Day</span>
                            {/* Empty column for the remove button */}
                            <span style={{ flex: 1 }}></span>
                        </div>

                        {/* Render one row for each appliance in the list */}
                        {appliances.map((appliance) => (
                            // Use appliance.id as the key so React can track rows efficiently
                            <div key={appliance.id} style={styles.applianceRow}>

                                {/* Appliance name input */}
                                <input
                                    type="text"
                                    value={appliance.appliance_name}
                                    // Update this appliance's name field when changed
                                    onChange={(e) => handleApplianceChange(appliance.id, 'appliance_name', e.target.value)}
                                    style={{ ...styles.applianceInput, flex: 3 }}
                                    placeholder="e.g. LED Bulb"
                                    required
                                />

                                {/* Wattage input */}
                                <input
                                    type="number"
                                    min="0"
                                    value={appliance.wattage}
                                    onChange={(e) => handleApplianceChange(appliance.id, 'wattage', e.target.value)}
                                    style={{ ...styles.applianceInput, flex: 2 }}
                                    placeholder="e.g. 10"
                                    required
                                />

                                {/* Quantity input */}
                                <input
                                    type="number"
                                    // Minimum quantity is 1
                                    min="1"
                                    value={appliance.quantity}
                                    onChange={(e) => handleApplianceChange(appliance.id, 'quantity', e.target.value)}
                                    style={{ ...styles.applianceInput, flex: 1 }}
                                    required
                                />

                                {/* Usage hours per day input */}
                                <input
                                    type="number"
                                    min="0"
                                    // Maximum is 24 hours per day
                                    max="24"
                                    value={appliance.usage_hours_per_day}
                                    onChange={(e) => handleApplianceChange(appliance.id, 'usage_hours_per_day', e.target.value)}
                                    style={{ ...styles.applianceInput, flex: 2 }}
                                    placeholder="e.g. 8"
                                    required
                                />

                                {/* Remove button — only show if there's more than one appliance */}
                                {/* Prevents the customer from removing all rows */}
                                {appliances.length > 1 && (
                                    <button
                                        // type="button" prevents this from submitting the form
                                        type="button"
                                        onClick={() => removeAppliance(appliance.id)}
                                        style={styles.removeBtn}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add appliance button */}
                        <button
                            // type="button" prevents form submission
                            type="button"
                            onClick={addAppliance}
                            style={styles.addBtn}
                        >
                            + Add Appliance
                        </button>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        style={{
                            ...styles.submitBtn,
                            // Dim the button when loading
                            opacity: loading ? 0.7 : 1,
                            // Show not-allowed cursor when loading
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                        // Only disable when loading
                        {...(loading ? { disabled: true } : {})}
                    >
                        {/* Change button text based on loading state */}
                        {loading ? 'Computing...' : 'Compute Solar Requirements'}
                    </button>

                </form>
            </div>
        </div>
    );
}

const styles = {
    // Light green full-page background
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
    },
    // Green navigation bar at the top
    navbar: {
        backgroundColor: '#16a34a',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // White app name in the navbar
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    // Right side of navbar containing user name and logout
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    // White user name text
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Transparent logout button with white border
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Centered content area with max width
    content: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1rem',
    },
    // Page heading
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    // Page description below the heading
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // White card sections
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // Card section title
    cardTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginBottom: '0.25rem',
        marginTop: 0,
    },
    // Card section description
    cardDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1rem',
    },
    // Container for the three radio button options
    radioGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    // Each radio option row
    radioLabel: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        cursor: 'pointer',
        padding: '0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
    },
    // The radio input itself
    radio: {
        marginTop: '0.2rem',
    },
    // Description text under each radio option title
    radioDesc: {
        color: '#6b7280',
        fontSize: '0.8rem',
        margin: '0.25rem 0 0 0',
    },
    // Wrapper for the peso sign + input
    pesoWrapper: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '250px',
    },
    // The ₱ prefix sign
    pesoSign: {
        padding: '0.625rem 0.75rem',
        backgroundColor: '#f9fafb',
        color: '#374151',
        borderRight: '1px solid #d1d5db',
        fontSize: '1rem',
    },
    // The monthly bill number input
    pesoInput: {
        border: 'none',
        padding: '0.625rem',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
    },
    // Column headers row for the appliance table
    applianceHeader: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    // Each appliance input row
    applianceRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        alignItems: 'center',
    },
    // Individual input inside an appliance row
    applianceInput: {
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        minWidth: 0,
    },
    // Red remove button for each appliance row
    removeBtn: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        flex: 1,
    },
    // Green add appliance button
    addBtn: {
        backgroundColor: 'transparent',
        color: '#16a34a',
        border: '1px dashed #16a34a',
        borderRadius: '8px',
        padding: '0.625rem 1rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        width: '100%',
        marginTop: '0.5rem',
    },
    // Large green submit button at the bottom
    submitBtn: {
        width: '100%',
        padding: '1rem',
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '2rem',
    },
};