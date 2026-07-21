import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from "../api/axios";

export default function AdminDashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    

    useEffect(() => {
        fetchQuotations();
    }, [statusFilter]);

    const fetchQuotations = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get(`/admin/quotation-requests?status=${statusFilter}`);
            
            setQuotations(res.data);
        } catch (err) {
            setError('Failed to load quotations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    }

    const formatCurrency = (amount) => {
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusStyle = (status) => {
        const statusStyle = {
            pending: { backgroundColor: '#fef9c3', color: '#ca8a04' },
            approved: { backgroundColor: '#dcfce7', color: '#16a34a' },
            rejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
            draft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
        };
        return statusStyle[status] || statusStyle.draft;
    };

    return (
        // Outer container with light green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name on the left */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>

                <button
                    onClick={() => navigate('/admin/inbox')}
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
                    💬 Messages
                </button>
                {/* Link to schedules page */}
                    <button
                        onClick={() => navigate('/admin/schedules')}
                        style={styles.navBtn}
                    >
                        📅 Schedules
                    </button>

                {/* Link to FAQ management */}
                    <button
                        onClick={() => navigate('/admin/faqs')}
                        style={styles.navBtn}
                    >
                        ❓ FAQs
                    </button>

                    {/* Link to reports page */}
                    <button
                        onClick={() => navigate('/admin/reports')}
                        style={styles.navBtn}
                    >
                        📊 Reports
                    </button>

                {/* Right side — admin label, user name, logout */}
                <div style={styles.navRight}>
                    {/* Admin role indicator */}
                    <span style={styles.navRole}>Admin</span>

                    {/* Logged-in admin's name */}
                    <span style={styles.navUser}>Hello, {user?.name}</span>

                    {/* Logout button */}
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div style={styles.content}>

                {/* Page header */}
                <h2 style={styles.pageTitle}>Quotation Requests</h2>
                <p style={styles.pageSubtitle}>
                    Review and manage customer solar quotation requests.
                </p>

                {/* Status filter tabs */}
                <div style={styles.tabs}>
                    {/* Map over each status option to create a tab button */}
                    {['pending', 'approved', 'rejected', 'draft'].map((status) => (
                        <button
                            key={status}
                            // When clicked, update the filter and re-fetch
                            onClick={() => setStatusFilter(status)}
                            style={{
                                ...styles.tab,
                                // Highlight the active tab with green background
                                ...(statusFilter === status ? styles.tabActive : {}),
                            }}
                        >
                            {/* Capitalize the first letter of each tab label */}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Show error message if fetch failed */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Show loading spinner while fetching */}
                {loading ? (
                    <div style={styles.loadingText}>Loading quotations...</div>
                ) : quotations.length === 0 ? (
                    // Show empty state message if no quotations match the filter
                    <div style={styles.emptyState}>
                        <p>No {statusFilter} quotations found.</p>
                    </div>
                ) : (
                    // Show the list of quotations
                    <div style={styles.tableWrapper}>

                        {/* Table header row */}
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 2 }}>Customer</span>
                            <span style={{ flex: 2 }}>System Type</span>
                            <span style={{ flex: 2 }}>Estimated Cost</span>
                            <span style={{ flex: 1 }}>Status</span>
                            <span style={{ flex: 2 }}>Date Submitted</span>
                            <span style={{ flex: 1 }}>Action</span>
                        </div>

                        {/* One row per quotation request */}
                        {quotations.map((quotation) => (
                            <div key={quotation.id} style={styles.tableRow}>

                                {/* Customer name from nested user relation */}
                                <span style={{ flex: 2 }}>
                                    {quotation.customer?.user?.name || 'Unknown'}
                                </span>

                                {/* Solar system type — capitalize first letter */}
                                <span style={{ flex: 2 }}>
                                    {quotation.solar_system_type.charAt(0).toUpperCase() +
                                     quotation.solar_system_type.slice(1)}
                                </span>

                                {/* Estimated cost from the solar computation */}
                                <span style={{ flex: 2 }}>
                                    {quotation.solar_computation
                                        ? formatCurrency(quotation.solar_computation.estimated_cost)
                                        : 'N/A'
                                    }
                                </span>

                                {/* Status badge with dynamic color */}
                                <span style={{ flex: 1 }}>
                                    <span style={{
                                        ...styles.badge,
                                        ...getStatusStyle(quotation.status),
                                    }}>
                                        {quotation.status.charAt(0).toUpperCase() +
                                         quotation.status.slice(1)}
                                    </span>
                                </span>

                                {/* Formatted submission date */}
                                <span style={{ flex: 2 }}>
                                    {formatDate(quotation.submission_date)}
                                </span>

                                {/* View button — navigates to the detail page */}
                                <span style={{ flex: 1 }}>
                                    <button
                                        // Navigate to the detail page with this quotation's id
                                        onClick={() => navigate(`/admin/quotation-requests/${quotation.id}`)}
                                        style={styles.viewBtn}
                                    >
                                        View
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Styles object
const styles = {
    // Light green full-page background
    container: {
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        margin: 'flex',
    },
    // Green navbar
    navbar: {
        backgroundColor: '#16a34a',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // White app name
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    // Right side of navbar
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    // Admin role badge in navbar
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    // White username text
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Transparent logout button
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Centered content area
    content: {
        // Remove maxWidth entirely so content stretches full width
        width: '100%',
        // Keep padding so content doesn't touch the edges
        padding: '2rem',
        // Remove margin: '0 auto' since we no longer need centering
        boxSizing: 'border-box',
    },
    // Page heading
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    // Page description
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Tab buttons container
    tabs: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0',
    },
    // Individual tab button
    tab: {
        padding: '0.625rem 1.25rem',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: '#6b7280',
        fontWeight: '500',
        marginBottom: '-2px',
    },
    // Active tab styling
    tabActive: {
        color: '#16a34a',
        borderBottom: '2px solid #16a34a',
        fontWeight: '600',
    },
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // Loading text
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    // Empty state message
    emptyState: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // White table container
    tableWrapper: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    // Table header row
    tableHeader: {
        display: 'flex',
        padding: '1rem 1.5rem',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    // Each data row
    tableRow: {
        display: 'flex',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #f3f4f6',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#374151',
    },
    // Status badge pill
    badge: {
        padding: '0.25rem 0.625rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    // Green view button
    viewBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
};