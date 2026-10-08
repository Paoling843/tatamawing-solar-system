import { useState, useEffect, Fragment, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { typography } from '../styles/theme';
import { computeReturn, signedPeso, SYSTEM_LIFE_YEARS } from '../services/solarEngine';

export default function CustomerMyQuotationsPage() {
    const navigate = useNavigate();

    const [quotationRequests, setQuotationRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);


    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/quotation-requests');
            setQuotationRequests(res.data);
        } catch {
            setError('Failed to load your quotations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchQuotations);
    }, [fetchQuotations]);

    const handleDownload = async (quotationId) => {
        try {
            const res = await api.get(
                `/customer/reports/quotation/${quotationId}`,
                { responseType: 'blob' }
            );
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `quotation-${quotationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            setError('Failed to download quotation PDF.');
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '—';
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

    const toggleMenu = (id) => {
        setOpenMenuId(openMenuId === id ? null: id) 
    };

    const toggleDetails = (id) => {
        setExpandedId(expandedId === id ? null : id)
        setOpenMenuId(null);
    };

    const getStatusStyle = (status) => {
        const statusStyles = {
            pending: { backgroundColor: '#fef9c3', color: '#ca8a04' },
            approved: { backgroundColor: '#dcfce7', color: '#16a34a' },
            rejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
            draft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
        };
        return statusStyles[status] || statusStyles.draft;
    };

    const filteredQuotations = statusFilter === 'all'
        ? quotationRequests
        : quotationRequests.filter(q => q.status === statusFilter);

    return (
        <CustomerLayout active="My Quotations">
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>My Quotations</h1>

                <div style={styles.filterTabs}>
                    {['all', 'approved', 'pending', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
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

            <div style={styles.tableCard}>
                {loading ? (
                    <LoadingState label="Loading your quotations..." />
                ) : filteredQuotations.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No quotations found</p>
                        <p style={styles.emptyDesc}>
                            You haven't submitted any quotation requests yet.
                        </p>
                        <button
                            className="btn-primary"
                            style={styles.emptyBtn}
                            onClick={() => navigate('/quotation/new')}
                        >
                            Request a Quotation
                        </button>
                    </div>
                ) : (
                <div className="table-scroll">
                    <div>
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 1.5 }}>REFERENCE</span>
                            <span style={{ flex: 1.5 }}>SYSTEM TYPE</span>
                            <span style={{ flex: 1.5 }}>VALUE</span>
                            <span style={{ flex: 1 }}>STATUS</span>
                            <span style={{ flex: 0.5, textAlign: 'right' }}>ACTIONS</span>
                        </div>
                            {filteredQuotations.map((qr, index) => {
                                const isLastRow = index === filteredQuotations.length - 1;

                                return (
                                <Fragment key={qr.id}>
                                    <div style={styles.tableRow}>
                                        <span style={{ flex: 1.5 }}>
                                            <span style={styles.referenceText}>
                                                {formatReference(qr.id, qr.created_at)}
                                            </span>
                                        </span>

                                        <span style={{ flex: 1.5 }}>
                                            <span style={styles.systemType}>
                                                {qr.solar_system_type?.replace('-', ' ').toUpperCase()}
                                            </span>
                                        </span>

                                        <span style={{ flex: 1.5, fontWeight: '500', color: '#111827'}}>
                                            {formatCurrency(
                                                qr.quotation?.total_amount ||
                                                qr.solar_computation?.estimated_cost
                                            )}
                                        </span>

                                        <span style={{ flex: 1 }}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                ...getStatusStyle(qr.status),
                                            }}>
                                                {qr.status?.toUpperCase()}
                                            </span>
                                        </span>

                                        <span style={{ flex: 0.5, textAlign: 'right', position: 'relative'}}>
                                            <button
                                                style={styles.actionDots}
                                                onClick={() => toggleMenu(qr.id)}
                                                aria-label="Actions"
                                            >
                                                ⋯
                                            </button>
                                            {openMenuId === qr.id && (
                                                <div
                                                    style={{
                                                        ...styles.menuDropdown,
                                                        ...(isLastRow ? styles.menuDropdownUp : {}),
                                                    }}
                                                >
                                                    <button
                                                        style={styles.menuItem}
                                                        onClick={() => toggleDetails(qr.id)}
                                                    >
                                                        {expandedId === qr.id ? 'Hide Details' : 'View Details'}
                                                    </button>
                                                    {qr.status === 'approved' && qr.quotation && (
                                                        <button
                                                            style={styles.menuItem}
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                handleDownload(qr.quotation.id);
                                                            }}
                                                        >
                                                            Download PDF
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </span>
                                    </div>

                                    {expandedId === qr.id && (
                                        <div style={styles.detailsPanel}>
                                            {qr.status === 'rejected' && (
                                                <div style={styles.rejectionBox}>
                                                    <span style={styles.rejectionLabel}>Reason for Rejection</span>
                                                    <p style={styles.rejectionText}>
                                                        {qr.notes || 'No reason provided.'}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="responsive-grid-4" style={styles.detailsGrid}>
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>Total Load</span>
                                                    <span style={styles.detailValue}>
                                                        {qr.solar_computation?.total_load_watts
                                                            ? `${qr.solar_computation.total_load_watts} W`
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>Panel Capacity</span>
                                                    <span style={styles.detailValue}>
                                                        {qr.solar_computation?.panel_capacity_kw
                                                            ? `${qr.solar_computation.panel_capacity_kw} kW`
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>Inverter</span>
                                                    <span style={styles.detailValue}>
                                                        {qr.solar_computation?.inverter_specification || '—'}
                                                    </span>
                                                </div>
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>Battery Capacity</span>
                                                    <span style={styles.detailValue}>
                                                        {qr.solar_computation?.battery_capacity_ah
                                                            ? `${qr.solar_computation.battery_capacity_ah} Ah`
                                                            : '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Savings estimate — older quotations don't have one */}
                                            {qr.solar_computation?.monthly_savings != null && (() => {
                                                const computation = qr.solar_computation;
                                                // Once approved, payback uses the approved total
                                                const total = qr.quotation?.total_amount ?? computation.estimated_cost;
                                                const annual = parseFloat(computation.annual_savings);
                                                const payback = annual > 0 ? (parseFloat(total) / annual).toFixed(1) : null;
                                                const ret = computeReturn(annual, parseFloat(total));

                                                return (
                                                    <div className="responsive-grid-4" style={{ ...styles.detailsGrid, marginTop: '12px' }}>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>Est. Monthly Savings</span>
                                                            <span style={styles.detailValue}>{formatCurrency(computation.monthly_savings)}</span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>Est. Annual Savings</span>
                                                            <span style={styles.detailValue}>{formatCurrency(computation.annual_savings)}</span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>Payback Period</span>
                                                            <span style={styles.detailValue}>{payback !== null ? `${payback} years` : '—'}</span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>Est. New Monthly Bill</span>
                                                            <span style={styles.detailValue}>
                                                                {computation.new_monthly_bill != null ? formatCurrency(computation.new_monthly_bill) : '—'}
                                                            </span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>Annual ROA</span>
                                                            <span style={styles.detailValue}>
                                                                {ret.roaPercent !== null ? `${ret.roaPercent.toFixed(1)}%` : '—'}
                                                            </span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>{SYSTEM_LIFE_YEARS}-Year Savings</span>
                                                            <span style={styles.detailValue}>{formatCurrency(ret.lifetimeSavings)}</span>
                                                        </div>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>{SYSTEM_LIFE_YEARS}-Year Net Gain</span>
                                                            <span style={styles.detailValue}>{signedPeso(ret.netGain)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {qr.quotation && (
                                                <div style={styles.costBreakdown}>
                                                    <div style={styles.costRow}>
                                                        <span>Base System Cost</span>
                                                        <span>{formatCurrency(qr.quotation.adjusted_cost)}</span>
                                                    </div>
                                                    <div style={styles.costRow}>
                                                        <span>Labor Fee</span>
                                                        <span>{formatCurrency(qr.quotation.labor_fee)}</span>
                                                    </div>
                                                    <div style={styles.costRow}>
                                                        <span>Transportation Fee</span>
                                                        <span>{formatCurrency(qr.quotation.transportation_fee)}</span>
                                                    </div>
                                                    <div style={{ ...styles.costRow, ...styles.costRowTotal }}>
                                                        <span>Total Amount</span>
                                                        <span>{formatCurrency(qr.quotation.total_amount)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </CustomerLayout>
    );
}

// Shared page footer — declared at module scope so React sees the same
// component type on every render
function Footer() {
    return (
        <div style={styles.footer}>
            <div style={styles.footerLeft}>
                <span style={styles.footerText}>
                    © {new Date().getFullYear()} TataMawing Solar. All rights reserved.
                </span>
                <div style={styles.footerLinks}>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                    <span style={styles.footerLink}>Sustainability Report</span>
                </div>
            </div>
            <div style={styles.systemStatus}>
                <div style={styles.statusDot} />
                <span style={styles.statusText}>All Nodes Active</span>
            </div>
        </div>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    pageTitle: {
        ...typography.h1,
        margin: 0,
    },
    filterTabs: {
        display: 'flex',
        gap: '0.25rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '3px',
        backgroundColor: 'white',
    },
    filterTab: {
        padding: '0.375rem 1rem',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: '#6b7280',
        fontSize: '0.875rem',
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
    tableCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        marginBottom: '1.5rem',
        overflow: 'hidden',
    },
    tableHeader: {
        display: 'flex',
        padding: '0.875rem 1.5rem',
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: '1px solid #f3f4f6',
        backgroundColor: '#fafafa',
    },
    tableRow: {
        display: 'flex',
        padding: '1.125rem 1.5rem',
        borderBottom: '1px solid #f9fafb',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#374151',
    },
    referenceText: {
        fontWeight: '700',
        color: '#111827',
        fontSize: '0.9rem',
    },
    customerName: {
        fontWeight: '500',
        color: '#111827',
    },
    customerLocation: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    systemType: {
        fontWeight: '600',
        color: '#374151',
        fontSize: '0.85rem',
    },
    statusBadge: {
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: '700',
    },
    actionDots: {
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: '#9ca3af',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
        fontSize: '0.875rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
    },
    emptyTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.5rem',
    },
    emptyDesc: {
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginBottom: '1.5rem',
    },
    emptyBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '1rem',
    },
    footerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    footerLinks: {
        display: 'flex',
        gap: '1rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        cursor: 'pointer',
        textDecoration: 'none',
    },
    systemStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
    },
    statusText: {
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
    },
        menuDropdown: {
        position: 'absolute',
        right: '0.5rem',
        top: '100%',
        backgroundColor: 'white',
        border: '1px solid #f3f4f6',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 10,
        minWidth: '140px',
    },
    menuDropdownUp: {
        top: 'auto',
        bottom: '100%',
    },
    menuItem: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        padding: '0.625rem 0.875rem',
        fontSize: '0.875rem',
        color: '#111827',
        cursor: 'pointer',
    },
    detailsPanel: {
        backgroundColor: '#f9fafb',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #f9fafb',
    },
    rejectionBox: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
    },
    rejectionLabel: {
        display: 'block',
        fontSize: '0.7rem',
        fontWeight: '700',
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        marginBottom: '0.25rem',
    },
    rejectionText: {
        margin: 0,
        fontSize: '0.875rem',
        color: '#991b1b',
        lineHeight: '1.4',
    },
    detailsGrid: {
        marginBottom: '1rem',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    detailLabel: {
        fontSize: '0.7rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: '0.9375rem',
        color: '#111827',
        fontWeight: '500',
    },
    costBreakdown: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '0.75rem',
    },
    costRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: '#374151',
        padding: '0.25rem 0',
    },
    costRowTotal: {
        fontWeight: '700',
        color: '#111827',
        borderTop: '1px solid #e5e7eb',
        marginTop: '0.25rem',
        paddingTop: '0.5rem',
    },

};