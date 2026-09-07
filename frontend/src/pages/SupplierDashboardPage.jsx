import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SupplierLayout from "../components/SupplierLayout";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { PackageIcon } from "../components/Icons";
import api from "../api/axios";
import { colors, typography } from "../styles/theme";

export default function SupplierDashboardPage() {
    const navigate = useNavigate();
    const [purchaseRequests, setPurchaseRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    const fetchPurchaseRequests = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/supplier/purchase-requests');
            setPurchaseRequests(res.data);
        } catch {
            setError('Failed to load purchase requests. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchPurchaseRequests);
    }, [fetchPurchaseRequests]);

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
        <SupplierLayout active="Purchase Requests">

            {/* Page header */}
            <h1 style={styles.pageTitle}>Purchase Requests</h1>
            <p style={styles.pageSubtitle}>
                View and confirm material availability for solar installation projects.
            </p>

            {/* Show error message if fetch failed */}
            {error && <div style={styles.error}>{error}</div>}

            {/* Show loading state */}
            {loading ? (
                <LoadingState label="Loading purchase requests..." />
            ) : purchaseRequests.length === 0 ? (
                // Show empty state if no purchase requests
                <EmptyState
                    icon={<PackageIcon size={32} color={colors.textFaint} />}
                    title="No purchase requests yet"
                    description="Purchase requests assigned to you by the admin will appear here."
                />
            ) : (
                // Show the list of purchase requests
                <div className="table-scroll">
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
                                    className="btn-primary"
                                    onClick={() => navigate(`/supplier/purchase-requests/${pr.id}`)}
                                    style={styles.viewBtn}
                                >
                                    View
                                </button>
                            </span>
                        </div>
                    ))}
                </div>
                </div>
            )}
        </SupplierLayout>
    );

}

// Styles
const styles = {
    // Page heading
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    // Page description
    pageSubtitle: {
        color: colors.textMuted,
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
    // White table container
    tableWrapper: {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
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
    // Primary view button
    viewBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        padding: '0.375rem 0.75rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
};
