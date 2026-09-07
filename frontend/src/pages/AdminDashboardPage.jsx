import { useState, useEffect, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';

import api from '../api/axios';

import { CalendarIcon, DownloadIcon, DocumentIcon, CheckIcon, ClockIcon, LeafIcon } from '../components/Icons';
import { colors, typography } from '../styles/theme';

export default function AdminDashboardPage() {
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);

    const [statusFilter, setStatusFilter] = useState('all');

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [selectedQuotation, setSelectedQuotation] = useState(null);


    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const url = statusFilter === 'all'
                ? '/admin/quotation-requests'
                : `/admin/quotation-requests?status=${statusFilter}`;
            const res = await api.get(url);
            setQuotations(res.data);
        } catch {
            setError('Failed to load quotations. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchQuotations);
    }, [fetchQuotations]);

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatReference = (id, createdAt) => {
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(id).padStart(3, '0');
        return `#Q-${year}-${paddedId}`;
    };

    const totalCount = quotations.length;
    const approvedCount = quotations.filter(q => q.status === 'approved').length;
    const pendingCount = quotations.filter(q => q.status === 'pending').length;

    return (
        <AdminLayout active="Overview">

            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Operational Overview</h1>
                    <p style={styles.pageSubtitle}>
                        Real-time procurement metrics and eco-impact tracking.
                    </p>
                </div>
                <div style={styles.headerActions}>
                    <button className="btn-secondary" style={{ ...styles.lastDaysBtn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarIcon size={15} color="currentColor" /> Last 30 Days
                    </button>
                    <button
                        className="btn-primary"
                        style={{ ...styles.exportBtn, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => navigate('/admin/reports')}
                    >
                        <DownloadIcon size={15} color="currentColor" /> Export Report
                    </button>
                </div>
            </div>

            <div className="responsive-grid-4" style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryCardHeader}>
                        <span style={styles.summaryCardIcon}><DocumentIcon size={24} color="#f59e0b" /></span>
                    </div>
                    <p style={styles.summaryLabel}>Total Requests</p>
                    <p style={styles.summaryValue}>{totalCount.toLocaleString()}</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#f59e0b' }} />
                </div>

                <div style={styles.summaryCard}>
                    <div style={styles.summaryCardHeader}>
                        <span style={styles.summaryCardIcon}><CheckIcon size={24} color={colors.success} /></span>
                    </div>
                    <p style={styles.summaryLabel}>Approved Projects</p>
                    <p style={styles.summaryValue}>{approvedCount.toLocaleString()}</p>
                    <div style={{ ...styles.accentBar, backgroundColor: colors.success }} />
                </div>

                <div style={styles.summaryCard}>
                    <div style={styles.summaryCardHeader}>
                        <span style={styles.summaryCardIcon}><ClockIcon size={24} color="#f59e0b" /></span>
                    </div>
                    <p style={styles.summaryLabel}>Pending Procurement</p>
                    <p style={styles.summaryValue}>{pendingCount.toLocaleString()}</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#f59e0b' }} />
                </div>

                <div style={{ ...styles.summaryCard, backgroundColor: colors.primary }}>
                    <div style={styles.summaryCardHeader}>
                        <span style={styles.summaryCardIcon}><LeafIcon size={24} color="white" /></span>
                    </div>
                    <p style={{ ...styles.summaryLabel, color: 'rgba(255,255,255,0.7)' }}>
                        Eco-Impact Score
                    </p>
                    <p style={{ ...styles.summaryValue, color: 'white', fontSize: '2rem' }}>
                        94.8
                        <span style={{ fontSize: '0.9rem', fontWeight: '400' }}> / 100</span>
                    </p>
                </div>
            </div>

            <div style={styles.tableCard}>
                <div style={styles.tableCardHeader}>
                    <div>
                        <h2 style={styles.tableTitle}>Recent Quotations</h2>
                        <p style={styles.tableSubtitle}>
                            Manage and review latest quotation requests
                        </p>
                    </div>

                    <div style={styles.filterTabs}>
                        {['all', 'approved', 'pending', 'rejected'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setStatusFilter(tab);
                                    setSelectedQuotation(null);
                                }}
                                style={{
                                    ...styles.filterTab,
                                    ...(statusFilter === tab ? styles.filterTabActive : {}),
                                }}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                {loading ? (
                    <LoadingState label="Loading quotations..." />
                ) : quotations.length === 0 ? (
                    <EmptyState
                        icon={<DocumentIcon size={32} color={colors.textFaint} />}
                        title="No quotations found"
                        description="Quotation requests will appear here once customers submit them."
                    />
                ) : (
                    <div className="table-scroll">
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 1.5 }}>REFERENCE</span>
                            <span style={{ flex: 2 }}>CUSTOMER NAME</span>
                            <span style={{ flex: 1.5 }}>SYSTEM TYPE</span>
                            <span style={{ flex: 1.5 }}>VALUE</span>
                            <span style={{ flex: 1 }}>STATUS</span>
                            <span style={{ flex: 0.5, textAlign: 'right' }}>ACTIONS</span>
                        </div>

                        {quotations.map((quotation) => (
                            <div
                                key={quotation.id}
                                style={{
                                    ...styles.tableRow,
                                    ...(selectedQuotation?.id === quotation.id
                                        ? styles.tableRowSelected : {}),
                                }}
                                onClick={() => setSelectedQuotation(
                                    selectedQuotation?.id === quotation.id
                                        ? null
                                        : quotation
                                )}
                            >
                                <span style={{ flex: 1.5 }}>
                                    <span style={styles.referenceText}>
                                        {formatReference(quotation.id, quotation.created_at)}
                                    </span>
                                </span>

                                <span style={{ flex: 2 }}>
                                    <span style={styles.customerName}>
                                        {quotation.customer?.user?.name || 'N/A'}
                                    </span>
                                    <br />
                                    <span style={styles.customerLocation}>
                                        {quotation.customer?.install_location || ''}
                                    </span>
                                </span>

                                <span style={{ flex: 1.5, textTransform: 'capitalize' }}>
                                    {quotation.solar_system_type?.replace('-', ' ')}
                                </span>

                                <span style={{ flex: 1.5 }}>
                                    {formatCurrency(
                                        quotation.solar_computation?.estimated_cost
                                    )}
                                </span>

                                <span style={{ flex: 1 }}>
                                    <Badge status={quotation.status} />
                                </span>

                                <span style={{ flex: 0.5, textAlign: 'right' }}>
                                    <button
                                        style={styles.actionDots}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/quotation-requests/${quotation.id}`);
                                        }}
                                    >
                                        ⋯
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && quotations.length > 0 && (
                    <div style={styles.paginationRow}>
                        <span style={styles.paginationText}>
                            Showing {quotations.length} of {quotations.length} results
                        </span>
                    </div>
                )}
            </div>

            {selectedQuotation && (
                <div style={styles.detailPanel}>
                    <h3 style={styles.detailTitle}>
                        Quotation {formatReference(
                            selectedQuotation.id,
                            selectedQuotation.created_at
                        )}
                    </h3>

                    <div className="responsive-grid-2" style={styles.detailGrid}>

                        <div>
                            <h4 style={styles.detailSectionTitle}>Customer Information</h4>
                            <p style={styles.detailText}>
                                Name: {selectedQuotation.customer?.user?.name}
                            </p>
                            <p style={styles.detailText}>
                                Contact: {selectedQuotation.customer?.contact_number}
                            </p>
                            <p style={styles.detailText}>
                                Address: {selectedQuotation.customer?.address}
                            </p>

                            <h4 style={{ ...styles.detailSectionTitle, marginTop: '1rem' }}>
                                Appliance List
                            </h4>
                            <div className="table-scroll" style={styles.applianceTable}>
                                <div style={styles.applianceHeader}>
                                    <span style={{ flex: 2 }}>APPLIANCE</span>
                                    <span style={{ flex: 1 }}>QTY.</span>
                                    <span style={{ flex: 1 }}>WATTS</span>
                                    <span style={{ flex: 1 }}>HOURS/DAY</span>
                                </div>
                                {selectedQuotation.appliance_items?.map((item) => (
                                    <div key={item.id} style={styles.applianceRow}>
                                        <span style={{ flex: 2 }}>{item.appliance_name}</span>
                                        <span style={{ flex: 1 }}>{item.quantity}</span>
                                        <span style={{ flex: 1 }}>{item.wattage}W</span>
                                        <span style={{ flex: 1 }}>{item.usage_hours_per_day}H</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 style={styles.detailSectionTitle}>Cost Breakdown</h4>

                            {selectedQuotation.quotation ? (
                                <>
                                    <div style={styles.costRow}>
                                        <span>Materials</span>
                                        <span>{formatCurrency(selectedQuotation.quotation.adjusted_cost)}</span>
                                    </div>
                                    <div style={styles.costRow}>
                                        <span>Labor</span>
                                        <span>{formatCurrency(selectedQuotation.quotation.labor_fee)}</span>
                                    </div>
                                    <div style={styles.costRow}>
                                        <span>Others</span>
                                        <span>{formatCurrency(selectedQuotation.quotation.transportation_fee)}</span>
                                    </div>
                                    <div style={{ ...styles.costRow, ...styles.costTotal }}>
                                        <span>Total:</span>
                                        <span>{formatCurrency(selectedQuotation.quotation.total_amount)}</span>
                                    </div>
                                </>
                            ) : selectedQuotation.solar_computation ? (
                                <>
                                    <div style={styles.costRow}>
                                        <span>Estimated Cost</span>
                                        <span>{formatCurrency(selectedQuotation.solar_computation.estimated_cost)}</span>
                                    </div>
                                    <p style={styles.detailNote}>
                                        *Pending admin review and final cost adjustment
                                    </p>
                                </>
                            ) : (
                                <p style={styles.detailText}>No cost data available.</p>
                            )}

                            {selectedQuotation.status === 'pending' && (
                                <>
                                    <h4 style={{ ...styles.detailSectionTitle, marginTop: '1.5rem' }}>
                                        Admin Controls
                                    </h4>
                                    <div style={styles.adminControls}>
                                        <button
                                            className="btn-primary"
                                            style={styles.approveControlBtn}
                                            onClick={() => navigate(`/admin/quotation-requests/${selectedQuotation.id}`)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="btn-danger"
                                            style={styles.rejectControlBtn}
                                            onClick={() => navigate(`/admin/quotation-requests/${selectedQuotation.id}`)}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            className="btn-primary"
                                            style={styles.editControlBtn}
                                            onClick={() => navigate(`/admin/quotation-requests/${selectedQuotation.id}`)}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.footer}>
                <span>© 2024 TataMawing Solar. All rights reserved.</span>
                <div style={styles.footerLinks}>
                    <span style={styles.footerLink}>Privacy Policy</span>
                    <span style={styles.footerLink}>Terms of Service</span>
                    <span style={styles.footerLink}>Sustainability Report</span>
                </div>
            </div>
        </AdminLayout>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        ...typography.small,
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
    },
    lastDaysBtn: {
        padding: '0.5rem 1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: '#374151',
        fontSize: '0.875rem',
    },
    exportBtn: {
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: colors.primary,
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    summaryGrid: {
        marginBottom: '1.5rem',
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
    },
    summaryCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
    },
    summaryCardIcon: {
        fontSize: '1.5rem',
    },
    summaryLabel: {
        fontSize: '0.8rem',
        color: '#6b7280',
        margin: '0 0 0.25rem 0',
    },
    summaryValue: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    accentBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
    },
    tableCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
    },
    tableCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    tableTitle: {
        ...typography.h2,
        margin: '0 0 0.25rem 0',
    },
    tableSubtitle: {
        fontSize: '0.8rem',
        color: '#6b7280',
        margin: 0,
    },
    filterTabs: {
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: '#f3f4f6',
        padding: '4px',
        borderRadius: '8px',
    },
    filterTab: {
        padding: '0.375rem 0.875rem',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: '#6b7280',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    filterTabActive: {
        backgroundColor: 'white',
        color: '#111827',
        fontWeight: '600',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    tableHeader: {
        display: 'flex',
        padding: '0.75rem 1rem',
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid #f3f4f6',
    },
    tableRow: {
        display: 'flex',
        padding: '1rem',
        borderBottom: '1px solid #f9fafb',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#374151',
        cursor: 'pointer',
    },
    tableRowSelected: {
        backgroundColor: '#f0f7f4',
    },
    referenceText: {
        fontWeight: '600',
        color: '#111827',
    },
    customerName: {
        fontWeight: '500',
        color: '#111827',
        fontSize: '0.875rem',
    },
    customerLocation: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    actionDots: {
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: '#9ca3af',
        padding: '0 0.25rem',
    },
    paginationRow: {
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paginationText: {
        fontSize: '0.8rem',
        color: colors.primary,
    },
    detailPanel: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
    },
    detailTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '1.25rem',
        marginTop: 0,
    },
    detailGrid: {},
    detailSectionTitle: {
        fontSize: '0.9rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '0.75rem',
        marginTop: 0,
    },
    detailText: {
        fontSize: '0.875rem',
        color: '#374151',
        marginBottom: '0.25rem',
        margin: '0 0 0.25rem 0',
    },
    applianceTable: {
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '0.5rem',
    },
    applianceHeader: {
        display: 'flex',
        padding: '0.5rem 0.75rem',
        backgroundColor: '#f9fafb',
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    applianceRow: {
        display: 'flex',
        padding: '0.625rem 0.75rem',
        borderTop: '1px solid #f3f4f6',
        fontSize: '0.875rem',
        color: '#374151',
    },
    costRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.375rem 0',
        fontSize: '0.875rem',
        color: '#374151',
    },
    costTotal: {
        fontWeight: '700',
        fontSize: '1rem',
        color: '#111827',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '0.75rem',
        marginTop: '0.5rem',
    },
    detailNote: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        marginTop: '0.5rem',
        margin: '0.5rem 0 0 0',
    },
    adminControls: {
        display: 'flex',
        gap: '0.75rem',
        marginTop: '0.5rem',
        flexWrap: 'wrap',
    },
    approveControlBtn: {
        padding: '0.625rem 1.25rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    rejectControlBtn: {
        padding: '0.625rem 1.25rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    editControlBtn: {
        padding: '0.625rem 1.25rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.8rem',
        color: '#9ca3af',
        marginTop: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    footerLinks: {
        display: 'flex',
        gap: '1.5rem',
    },
    footerLink: {
        cursor: 'pointer',
    },
};
