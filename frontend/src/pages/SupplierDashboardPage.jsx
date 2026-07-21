import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function SupplierDashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [purchaseRequests, setPurchaseRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPurchaseRequests();
    }, []);

    const fetchPurchaseRequests = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/supplier/purchase-requests');
            setPurchaseRequests(res.data);
        } catch (err) {
            setError('Failed to load purchase requests. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

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
        const statusStyles = {
            pending: { backgroundColor: '#fef9c3', color: '#ca8a04' },
            confirmed: { backgroundColor: '#dcfce7', color: '#16a34a' },
            partially_available: { backgroundColor: '#ffedd5', color: '#ea580c' },
            unavailable: { backgroundColor: '#fef2f2', color: '#dc2626' },
        };

        return statusStyles[status] || statusStyles.pending;
    };

    const formatStatus = (status) => {
        return status
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

        return (
        // Outer container with light green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name on the left */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>

                <button
                    onClick={() => navigate('/supplier/chat')}
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

                {/* Right side — supplier label, user name, logout */}
                <div style={styles.navRight}>
                    {/* Supplier role indicator */}
                    <span style={styles.navRole}>Supplier</span>

                    {/* Logged-in supplier's name */}
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
                <h2 style={styles.pageTitle}>Purchase Requests</h2>
                <p style={styles.pageSubtitle}>
                    View and confirm material availability for solar installation projects.
                </p>

                {/* Show error message if fetch failed */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Show loading state */}
                {loading ? (
                    <div style={styles.loadingText}>Loading purchase requests...</div>
                ) : purchaseRequests.length === 0 ? (
                    // Show empty state if no purchase requests
                    <div style={styles.emptyState}>
                        <p>No purchase requests assigned to you yet.</p>
                    </div>
                ) : (
                    // Show the list of purchase requests
                    <div style={styles.tableWrapper}>

                        {/* Table header */}
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 2 }}>Customer</span>
                            <span style={{ flex: 2 }}>System Type</span>
                            <span style={{ flex: 2 }}>Materials</span>
                            <span style={{ flex: 2 }}>Status</span>
                            <span style={{ flex: 2 }}>Request Date</span>
                            <span style={{ flex: 1 }}>Action</span>
                        </div>

                        {/* One row per purchase request */}
                        {purchaseRequests.map((pr) => (
                            <div key={pr.id} style={styles.tableRow}>

                                {/* Customer name from nested relation */}
                                <span style={{ flex: 2 }}>
                                    {pr.quotation?.quotation_request?.customer?.user?.name || 'N/A'}
                                </span>

                                {/* Solar system type */}
                                <span style={{ flex: 2 }}>
                                    {pr.quotation?.quotation_request?.solar_system_type
                                        ?.charAt(0).toUpperCase() +
                                     pr.quotation?.quotation_request?.solar_system_type
                                        ?.slice(1) || 'N/A'}
                                </span>

                                {/* Number of material items */}
                                <span style={{ flex: 2 }}>
                                    {pr.material_items?.length || 0} items
                                </span>

                                {/* Procurement status badge */}
                                <span style={{ flex: 2 }}>
                                    <span style={{
                                        ...styles.badge,
                                        ...getStatusStyle(pr.procurement_status),
                                    }}>
                                        {formatStatus(pr.procurement_status)}
                                    </span>
                                </span>

                                {/* Request date */}
                                <span style={{ flex: 2 }}>
                                    {formatDate(pr.request_date)}
                                </span>

                                {/* View button — navigates to detail page */}
                                <span style={{ flex: 1 }}>
                                    <button
                                        onClick={() => navigate(`/supplier/purchase-requests/${pr.id}`)}
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

// Styles
const styles = {
    // Full page light green background
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
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
    // Supplier role badge
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
    // Full width content area with padding
    content: {
        width: '100%',
        padding: '2rem',
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
    // Empty state box
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
