import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminTokens, adminText, adminUi } from '../styles/adminTheme';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Badge from '../components/Badge';
import { GridIcon, BoltIcon, BatteryIcon, PlugIcon, PackageIcon, CartIcon } from '../components/Icons';
import api from '../api/axios';
import { formatOrderRef } from '../utils/references';
import { colors } from '../styles/theme';

export default function AdminPurchaseRequestsPage() {
    const navigate = useNavigate();

    const [purchaseRequests, setPurchaseRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');


    const fetchPurchaseRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/purchase-requests');
            setPurchaseRequests(res.data);
        } catch {
            setError('Failed to load purchase requests.');
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

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            confirmed: 'Approved',
            partially_available: 'Partial',
            unavailable: 'Not available',
        };
        return labels[status];
    };

    const getMaterialIcon = (materialName) => {
        const name = materialName?.toLowerCase() || '';
        if (name.includes('panel') || name.includes('solar')) return <GridIcon size={18} color={adminTokens.green} />;
        if (name.includes('inverter')) return <BoltIcon size={18} color={adminTokens.green} />;
        if (name.includes('battery')) return <BatteryIcon size={18} color={adminTokens.green} />;
        if (name.includes('cable') || name.includes('wire')) return <PlugIcon size={18} color={adminTokens.green} />;
        return <PackageIcon size={18} color={adminTokens.green} />;
    };

    const filteredRequests = purchaseRequests.filter(pr => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'confirmed') return pr.procurement_status === 'confirmed';
        if (statusFilter === 'pending') return pr.procurement_status === 'pending';
        return true;
    });

    return (
        <AdminLayout active="Purchase Request">

            <h1 style={styles.pageTitle}>Purchase Request</h1>
            <p style={styles.pageSubtitle}>Track material procurement for approved installations</p>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.tableCard}>

                <div style={styles.tableCardHeader}>
                    <h2 style={styles.tableTitle}>Active Material Logistics</h2>

                    <div style={styles.filterTabs}>
                        {[
                            { key: 'all', label: 'All Orders' },
                            { key: 'confirmed', label: 'In Transit' },
                            { key: 'pending', label: 'Delayed' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                style={{
                                    ...styles.filterTab,
                                    ...(statusFilter === tab.key ? styles.filterTabActive : {}),
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <LoadingState label="Loading purchase requests..." />
                ) : filteredRequests.length === 0 ? (
                    <EmptyState
                        icon={<PackageIcon size={32} color={colors.textFaint} />}
                        title="No purchase requests found"
                        description="Purchase requests will appear here once an admin generates one from an approved quotation."
                    />
                ) : (
                    <div className="table-scroll">
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 1.2 }}>ORDER ID</span>
                            <span style={{ flex: 3 }}>MATERIAL</span>
                            <span style={{ flex: 1.5 }}>ETA</span>
                            <span style={{ flex: 1.5 }}>STATUS</span>
                            <span style={{ flex: 0.5, textAlign: 'right' }}>ACTIONS</span>
                        </div>

                        {filteredRequests.map((pr) => (
                            <div
                                key={pr.id}
                                style={{ ...styles.tableRow, cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/purchase-requests/${pr.id}`)}
                            >

                                <span style={{ flex: 1.2 }}>
                                    <span style={styles.orderIdText}>
                                        {formatOrderRef(pr.id)}
                                    </span>
                                </span>

                                <span style={{ flex: 3 }}>
                                    <div style={styles.materialCell}>
                                        <div style={styles.materialIcon}>
                                            {getMaterialIcon(pr.material_items?.[0]?.material_name)}
                                        </div>
                                        <div>
                                            <p style={styles.materialName}>
                                                {pr.material_items?.[0]?.material_name || 'N/A'}
                                            </p>
                                            <p style={styles.materialDesc}>
                                                {pr.material_items?.length > 1
                                                    ? `+${pr.material_items.length - 1} more items`
                                                    : `${pr.material_items?.[0]?.quantity || ''} ${pr.material_items?.[0]?.unit || ''}`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </span>

                                <span style={{ flex: 1.5 }}>
                                    {formatDate(pr.request_date)}
                                </span>

                                <span style={{ flex: 1.5 }}>
                                    <Badge
                                        status={pr.procurement_status}
                                        label={getStatusLabel(pr.procurement_status)}
                                    />
                                </span>

                                <span style={{ flex: 0.5, textAlign: 'right' }}>
                                    <button
                                        style={styles.actionDots}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/purchase-requests/${pr.id}`);
                                        }}
                                    >
                                        ⋯
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                className="btn-primary"
                style={styles.fab}
                onClick={() => navigate('/admin/dashboard')}
                title="Go to dashboard to generate purchase requests"
            >
                <CartIcon size={22} color="white" />
            </button>
        </AdminLayout>
    );
}

const styles = {
    pageTitle: adminText.pageTitle,
    pageSubtitle: { ...adminText.pageSubtitle, marginBottom: '1.5rem' },
    error: adminUi.errorBanner,
    tableCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #eef0ec',
        position: 'relative',
    },
    tableCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    tableTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#16211c',
        margin: 0,
    },
    filterTabs: {
        display: 'flex',
        gap: '0.25rem',
        border: '1px solid #e6e8e2',
        borderRadius: '8px',
        padding: '3px',
    },
    filterTab: {
        padding: '0.375rem 0.875rem',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: '#5d6862',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    filterTabActive: {
        backgroundColor: 'white',
        color: '#16211c',
        fontWeight: '600',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    tableHeader: {
        display: 'flex',
        padding: '0.75rem 1rem',
        fontSize: '0.7rem',
        color: '#5d6862',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid #eef0ec',
    },
    tableRow: {
        display: 'flex',
        padding: '1rem',
        borderBottom: '1px solid #f9faf8',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#293530',
    },
    orderIdText: {
        fontWeight: '600',
        color: '#293530',
        fontFamily: 'monospace',
    },
    materialCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    materialIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        backgroundColor: '#f0f7f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        flexShrink: 0,
    },
    materialName: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#16211c',
        margin: '0 0 0.125rem 0',
    },
    materialDesc: {
        fontSize: '0.75rem',
        color: '#5d6862',
        margin: 0,
    },
    actionDots: {
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: '#5d6862',
    },
    fab: {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        backgroundColor: adminTokens.green,
        color: 'white',
        border: 'none',
        fontSize: '1.25rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};
