import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import {
    DocumentIcon, ClockIcon, CalendarIcon, PesoIcon,
    EyeIcon, DownloadIcon, HelpIcon,
} from '../components/Icons';
import { colors, typography, statusColors } from '../styles/theme';

const SORT_OPTIONS = ['Newest first', 'Oldest first', 'Highest value', 'Lowest value'];

export default function CustomerDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quotationRequests, setQuotationRequests] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('Newest first');
    const [sortOpen, setSortOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [rejectionFor, setRejectionFor] = useState(null);
    const [rejectionShown, setRejectionShown] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [quotationsRes, scheduleRes] = await Promise.all([
                api.get('/quotation-requests'),
                api.get('/customer/schedules'),
            ]);
            setQuotationRequests(quotationsRes.data);
            if (scheduleRes.data.length > 0) {
                setSchedule(scheduleRes.data[0]);
            }
        } catch {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchDashboardData);
    }, [fetchDashboardData]);

    // Any open dropdown closes on the next click anywhere else on the page.
    useEffect(() => {
        if (openMenuId === null && !sortOpen) return;
        const closeAll = () => {
            setOpenMenuId(null);
            setSortOpen(false);
        };
        document.addEventListener('click', closeAll);
        return () => document.removeEventListener('click', closeAll);
    }, [openMenuId, sortOpen]);

    // The modal mounts hidden, then flips to shown on the next painted frame
    // so the browser has a "from" state to transition away from.
    useEffect(() => {
        if (!rejectionFor) return;
        let inner;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setRejectionShown(true));
        });
        return () => {
            cancelAnimationFrame(outer);
            if (inner) cancelAnimationFrame(inner);
        };
    }, [rejectionFor]);

    const closeRejection = () => {
        setRejectionShown(false);
        setTimeout(() => setRejectionFor(null), 240);
    };

    const handleDownloadQuotation = async (quotationId) => {
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
        if (!amount) return 'N/A';
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatCompact = (amount) => {
        const n = parseFloat(amount) || 0;
        if (n >= 1000000) return { value: (n / 1000000).toFixed(1), unit: 'million ₱' };
        if (n >= 1000) return { value: (n / 1000).toFixed(1), unit: 'thousand ₱' };
        return { value: String(Math.round(n)), unit: '₱' };
    };

    const formatReference = (id, createdAt) => {
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(id).padStart(3, '0');
        return `#Q-${year}-${paddedId}`;
    };

    const formatDate = (value) => {
        if (!value) return '—';
        return new Date(value).toLocaleDateString('en-PH', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const systemLabel = (type) => {
        if (!type) return 'Solar System';
        return type
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('-') + ' System';
    };

    const rowValue = (qr) =>
        parseFloat(qr.quotation?.total_amount || qr.solar_computation?.estimated_cost || 0);

    const toggleMenu = (event, id) => {
        event.stopPropagation();
        setSortOpen(false);
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const toggleDetails = (id) => {
        setOpenMenuId(null);
        setExpandedId(expandedId === id ? null : id);
    };

    const filteredQuotations = statusFilter === 'all'
        ? quotationRequests
        : quotationRequests.filter(q => q.status === statusFilter);

    const visibleQuotations = [...filteredQuotations].sort((a, b) => {
        if (sortBy === 'Oldest first') {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        if (sortBy === 'Highest value') return rowValue(b) - rowValue(a);
        if (sortBy === 'Lowest value') return rowValue(a) - rowValue(b);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const totalCount = quotationRequests.length;
    const pendingCount = quotationRequests.filter(q => q.status === 'pending').length;
    const scheduleCount = schedule ? 1 : 0;
    const approvedValue = quotationRequests
        .filter(q => q.status === 'approved')
        .reduce((sum, q) => sum + rowValue(q), 0);
    const approvedCompact = formatCompact(approvedValue);

    const today = new Date().toLocaleDateString('en-PH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).toUpperCase();

    const solarQuote = '"The sun provides more than enough energy in one hour to power the whole world for a year."';

    const stats = [
        {
            label: 'Total Quotations', icon: <DocumentIcon size={16} color={colors.textFaint} />,
            value: totalCount, unit: '', note: 'All requests submitted',
        },
        {
            label: 'Pending Quotations', icon: <ClockIcon size={16} color={colors.textFaint} />,
            value: pendingCount, unit: '', note: 'Awaiting review',
        },
        {
            label: 'Scheduled Installations', icon: <CalendarIcon size={16} color={colors.textFaint} />,
            value: scheduleCount, unit: '', note: 'Upcoming site visits',
        },
        {
            label: 'Approved Value', icon: <PesoIcon size={16} color={colors.textFaint} />,
            value: approvedCompact.value, unit: approvedCompact.unit,
            note: 'Across approved quotations',
        },
    ];

    return (
        <CustomerLayout active="Overview">

            <div style={styles.welcomeSection}>
                <div style={styles.eyebrow}>{today}</div>
                <h1 style={styles.welcomeTitle}>
                    Welcome back, {user?.name?.split(' ')[0]}.
                </h1>
                <p style={styles.welcomeQuote}>{solarQuote}</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {loading ? (
                <LoadingState label="Loading dashboard..." />
            ) : (
                <>
                    <div className="responsive-grid-4" style={styles.statStrip}>
                        {stats.map((s) => (
                            <div key={s.label} style={styles.statCell}>
                                <div style={styles.statTop}>
                                    <span style={styles.statLabel}>{s.label}</span>
                                    <span style={styles.statIcon}>{s.icon}</span>
                                </div>
                                <div style={styles.statValueRow}>
                                    <span style={styles.statValue}>{s.value}</span>
                                    {s.unit && <span style={styles.statUnit}>{s.unit}</span>}
                                </div>
                                <div style={styles.statNote}>{s.note}</div>
                            </div>
                        ))}
                    </div>

                    <div style={styles.tableCard}>

                        <div style={styles.tableCardHeader}>
                            <div>
                                <h2 style={styles.tableTitle}>Recent Quotations</h2>
                                <div style={styles.tableSubtitle}>
                                    {totalCount} total
                                    {statusFilter !== 'all' &&
                                        ` · ${filteredQuotations.length} ${statusFilter}`}
                                </div>
                            </div>

                            <div style={styles.headerControls}>
                                <div style={styles.filterTabs}>
                                    {['all', 'approved', 'pending', 'rejected'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setStatusFilter(tab)}
                                            style={{
                                                ...styles.filterTab,
                                                ...(statusFilter === tab
                                                    ? styles.filterTabActive : {}),
                                            }}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <div style={styles.sortWrap}>
                                    <button
                                        style={{
                                            ...styles.sortBtn,
                                            backgroundColor: sortOpen
                                                ? colors.bgSubtle : colors.bgCard,
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(null);
                                            setSortOpen(!sortOpen);
                                        }}
                                    >
                                        <span style={styles.sortTag}>SORT</span>
                                        <span>{sortBy}</span>
                                        <span style={styles.caret}>▾</span>
                                    </button>

                                    <div
                                        className={`menu-pop${sortOpen ? ' menu-open' : ''}`}
                                        style={styles.sortDropdown}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                key={option}
                                                style={{
                                                    ...styles.dropdownItem,
                                                    fontWeight: sortBy === option ? 600 : 500,
                                                }}
                                                onClick={() => {
                                                    setSortBy(option);
                                                    setSortOpen(false);
                                                }}
                                            >
                                                <span>{option}</span>
                                                {sortBy === option && (
                                                    <span style={styles.checkMark}>✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="table-scroll">
                            <div>
                                <div style={styles.tableHeader}>
                                    <div>Reference</div>
                                    <div>System</div>
                                    <div>Submitted</div>
                                    <div style={{ textAlign: 'right' }}>Value</div>
                                    <div />
                                </div>

                                {visibleQuotations.length === 0 ? (
                                    <div style={styles.emptyState}>
                                        No quotations found. Submit your first quotation request!
                                    </div>
                                ) : (
                                    visibleQuotations.map((qr) => {
                                        const badge = statusColors[qr.status] || statusColors.draft;
                                        const canDownload =
                                            qr.status === 'approved' && !!qr.quotation;

                                        return (
                                            <div key={qr.id}>
                                                <div style={styles.tableRow}>
                                                    <div style={styles.refCell}>
                                                        <span style={styles.referenceText}>
                                                            {formatReference(qr.id, qr.created_at)}
                                                        </span>
                                                        <span style={{
                                                            ...styles.statusBadge,
                                                            backgroundColor: badge.bg,
                                                            color: badge.text,
                                                        }}>
                                                            {qr.status.charAt(0).toUpperCase() +
                                                                qr.status.slice(1)}
                                                        </span>
                                                    </div>

                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={styles.systemName}>
                                                            {systemLabel(qr.solar_system_type)}
                                                        </div>
                                                        <div style={styles.systemSpec}>
                                                            {qr.solar_computation?.panel_capacity_kw
                                                                ? `${qr.solar_computation.panel_capacity_kw} kW array`
                                                                : 'Awaiting computation'}
                                                            {qr.monthly_bill
                                                                ? ` · ₱${parseFloat(qr.monthly_bill).toLocaleString('en-PH')} monthly bill`
                                                                : ''}
                                                        </div>
                                                    </div>

                                                    <div style={styles.dateCell}>
                                                        {formatDate(qr.submission_date || qr.created_at)}
                                                    </div>

                                                    <div style={styles.valueCell}>
                                                        {formatCurrency(
                                                            qr.quotation?.total_amount ||
                                                            qr.solar_computation?.estimated_cost
                                                        )}
                                                    </div>

                                                    <div style={styles.actionCell}>
                                                        <button
                                                            style={{
                                                                ...styles.actionDots,
                                                                backgroundColor: openMenuId === qr.id
                                                                    ? colors.borderLight : 'transparent',
                                                            }}
                                                            onClick={(e) => toggleMenu(e, qr.id)}
                                                            aria-label="Row actions"
                                                        >
                                                            ⋯
                                                        </button>

                                                        <div
                                                            className={`menu-pop${openMenuId === qr.id ? ' menu-open' : ''}`}
                                                            style={styles.rowDropdown}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                                <button
                                                                    style={styles.dropdownItem}
                                                                    onClick={() => toggleDetails(qr.id)}
                                                                >
                                                                    <span style={styles.itemIcon}>
                                                                        <EyeIcon size={14} color={colors.textMuted} />
                                                                    </span>
                                                                    <span>
                                                                        {expandedId === qr.id
                                                                            ? 'Hide Details' : 'View Details'}
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    style={{
                                                                        ...styles.dropdownItem,
                                                                        opacity: canDownload ? 1 : 0.45,
                                                                        cursor: canDownload
                                                                            ? 'pointer' : 'not-allowed',
                                                                    }}
                                                                    disabled={!canDownload}
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleDownloadQuotation(qr.quotation.id);
                                                                    }}
                                                                >
                                                                    <span style={styles.itemIcon}>
                                                                        <DownloadIcon size={14} color={colors.textMuted} />
                                                                    </span>
                                                                    <span>Download PDF</span>
                                                                </button>

                                                                {qr.status === 'rejected' && (
                                                                    <button
                                                                        style={styles.dropdownItem}
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            setRejectionFor(qr);
                                                                        }}
                                                                    >
                                                                        <span style={styles.itemIcon}>
                                                                            <HelpIcon size={14} color={colors.textMuted} />
                                                                        </span>
                                                                        <span>View rejection reason</span>
                                                                    </button>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {expandedId === qr.id && (
                                                    <div
                                                        className="details-reveal"
                                                        style={styles.detailsPanel}
                                                    >
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

                                                        {qr.quotation && (
                                                            <div style={styles.costRow}>
                                                                <span style={styles.detailLabel}>
                                                                    Labor Fee
                                                                    <span style={styles.costValue}>
                                                                        {formatCurrency(qr.quotation.labor_fee)}
                                                                    </span>
                                                                </span>
                                                                <span style={styles.detailLabel}>
                                                                    Transportation
                                                                    <span style={styles.costValue}>
                                                                        {formatCurrency(qr.quotation.transportation_fee)}
                                                                    </span>
                                                                </span>
                                                                <span style={styles.detailLabel}>
                                                                    Total Amount
                                                                    <span style={styles.costValue}>
                                                                        {formatCurrency(qr.quotation.total_amount)}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div style={styles.tableFooter}>
                            <span style={styles.tableFooterText}>
                                Showing {visibleQuotations.length} of {totalCount}
                            </span>
                            <span
                                style={styles.tableFooterLink}
                                onClick={() => navigate('/customer/quotations')}
                            >
                                All quotations →
                            </span>
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <div style={styles.footerLeft}>
                            <span style={styles.footerText}>
                                © 2024 TataMawing Solar. All rights reserved.
                            </span>
                            <div style={styles.footerLinks}>
                                <span style={styles.footerLink}>Privacy Policy</span>
                                <span style={styles.footerLink}>Terms of Service</span>
                                <span style={styles.footerLink}>Sustainability Report</span>
                            </div>
                        </div>
                        <div style={styles.systemStatus}>
                            <span style={styles.statusDot} />
                            <span style={styles.statusText}>All Nodes Active</span>
                        </div>
                    </div>
                </>
            )}

            {rejectionFor && (
                <div
                    className={`overlay-fade${rejectionShown ? ' overlay-open' : ''}`}
                    style={styles.modalOverlay}
                    onClick={closeRejection}
                >
                    <div
                        className={`modal-pop${rejectionShown ? ' modal-open' : ''}`}
                        style={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={styles.modalHeader}>
                            <div>
                                <div style={styles.modalTag}>
                                    <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: statusColors.rejected.bg,
                                        color: statusColors.rejected.text,
                                    }}>
                                        Rejected
                                    </span>
                                    <span style={styles.modalRef}>
                                        {formatReference(rejectionFor.id, rejectionFor.created_at)}
                                    </span>
                                </div>
                                <h3 style={styles.modalTitle}>
                                    Why this quotation was rejected
                                </h3>
                                <div style={styles.modalSubtitle}>
                                    Reviewed by the TataMawing estimating team ·{' '}
                                    {formatDate(rejectionFor.updated_at || rejectionFor.created_at)}
                                </div>
                            </div>
                            <button
                                style={styles.modalClose}
                                onClick={closeRejection}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.modalNote}>
                                <div style={styles.modalNoteLabel}>Reason Given</div>
                                <div style={styles.modalNoteBody}>
                                    {rejectionFor.notes || 'No reason provided.'}
                                </div>
                            </div>
                            <div style={styles.modalNote}>
                                <div style={styles.modalNoteLabel}>System Requested</div>
                                <div style={styles.modalNoteBody}>
                                    {systemLabel(rejectionFor.solar_system_type)}
                                    {rejectionFor.solar_computation?.panel_capacity_kw
                                        ? ` · ${rejectionFor.solar_computation.panel_capacity_kw} kW array`
                                        : ''}
                                </div>
                            </div>
                            <div style={styles.modalNote}>
                                <div style={styles.modalNoteLabel}>Submitted</div>
                                <div style={styles.modalNoteBody}>
                                    {formatDate(rejectionFor.submission_date || rejectionFor.created_at)}
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                className="btn-primary"
                                style={styles.modalPrimaryBtn}
                                onClick={() => {
                                    closeRejection();
                                    navigate('/quotation/new');
                                }}
                            >
                                Request a new quotation
                            </button>
                            <span style={styles.modalHint}>
                                Notes are kept with the quotation record
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}

const styles = {
    welcomeSection: {
        marginBottom: '1.5rem',
    },
    eyebrow: {
        ...typography.label,
        fontSize: '0.7rem',
        letterSpacing: '0.12em',
        color: colors.textMuted,
        marginBottom: '0.5rem',
    },
    welcomeTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    welcomeQuote: {
        fontSize: '0.875rem',
        color: colors.primary,
        fontStyle: 'italic',
        margin: 0,
    },
    error: {
        backgroundColor: colors.dangerTint,
        color: colors.danger,
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },

    statStrip: {
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
        gap: '1px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    statCell: {
        backgroundColor: colors.bgCard,
        padding: '1.25rem 1.375rem',
        boxShadow: `1px 0 0 ${colors.borderLight}`,
    },
    statTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
    },
    statLabel: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: colors.textMuted,
    },
    statIcon: {
        display: 'flex',
        alignItems: 'center',
    },
    statValueRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
        marginTop: '0.875rem',
    },
    statValue: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: colors.textDark,
    },
    statUnit: {
        fontSize: '0.75rem',
        color: colors.textMuted,
    },
    statNote: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        marginTop: '0.375rem',
    },

    tableCard: {
        backgroundColor: colors.bgCard,
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem',
        border: `1px solid ${colors.border}`,
    },
    tableCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        flexWrap: 'wrap',
        padding: '1.25rem 1.375rem 1rem',
    },
    tableTitle: {
        ...typography.h2,
        margin: 0,
    },
    tableSubtitle: {
        fontSize: '0.8rem',
        color: colors.textMuted,
        marginTop: '0.2rem',
    },
    headerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        flexWrap: 'wrap',
    },
    filterTabs: {
        display: 'flex',
        gap: '0.25rem',
        backgroundColor: colors.bgSubtle,
        border: `1px solid ${colors.border}`,
        borderRadius: '9px',
        padding: '3px',
    },
    filterTab: {
        padding: '0.375rem 0.875rem',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: colors.textMuted,
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    filterTabActive: {
        backgroundColor: colors.bgCard,
        color: colors.textDark,
        fontWeight: 600,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    sortWrap: {
        position: 'relative',
    },
    sortBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: '9px',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: colors.textBody,
        cursor: 'pointer',
    },
    sortTag: {
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        color: colors.textMuted,
    },
    caret: {
        fontSize: '0.6rem',
        color: colors.textMuted,
    },
    sortDropdown: {
        position: 'absolute',
        top: '2.5rem',
        right: 0,
        width: '210px',
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: '11px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
        padding: '6px',
        zIndex: 20,
    },
    rowDropdown: {
        position: 'absolute',
        top: '2.125rem',
        right: 0,
        width: '224px',
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: '11px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
        padding: '6px',
        zIndex: 30,
        textAlign: 'left',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        width: '100%',
        padding: '0.55rem 0.625rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: colors.textBody,
        fontSize: '0.825rem',
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
    },
    itemIcon: {
        display: 'flex',
        alignItems: 'center',
        opacity: 0.7,
    },
    checkMark: {
        marginLeft: 'auto',
        color: colors.primary,
        fontSize: '0.75rem',
    },

    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '150px 1fr 130px 160px 56px',
        gap: '1rem',
        padding: '0.625rem 1.375rem',
        borderTop: `1px solid ${colors.borderLight}`,
        borderBottom: `1px solid ${colors.borderLight}`,
        backgroundColor: colors.bgSubtle,
        fontSize: '0.65rem',
        color: colors.textMuted,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    },
    tableRow: {
        display: 'grid',
        gridTemplateColumns: '150px 1fr 130px 160px 56px',
        gap: '1rem',
        alignItems: 'center',
        padding: '1rem 1.375rem',
        borderBottom: `1px solid ${colors.borderLight}`,
        fontSize: '0.875rem',
        color: colors.textBody,
        position: 'relative',
    },
    refCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.3rem',
    },
    referenceText: {
        fontWeight: 600,
        color: colors.textDark,
    },
    statusBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 600,
    },
    systemName: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: colors.textDark,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    systemSpec: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        marginTop: '0.2rem',
    },
    dateCell: {
        fontSize: '0.8rem',
        color: colors.textMuted,
    },
    valueCell: {
        fontSize: '0.9rem',
        color: colors.textDark,
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
    },
    actionCell: {
        display: 'flex',
        justifyContent: 'flex-end',
        position: 'relative',
    },
    actionDots: {
        width: '30px',
        height: '30px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1.15rem',
        lineHeight: 1,
        cursor: 'pointer',
        color: colors.textMuted,
    },

    detailsPanel: {
        padding: '1.125rem 1.375rem',
        backgroundColor: colors.bgSubtle,
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    detailsGrid: {
        gap: '1rem',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    detailLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    detailValue: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: colors.textDark,
        textTransform: 'none',
        letterSpacing: 'normal',
    },
    costRow: {
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${colors.border}`,
    },
    costValue: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: colors.textDark,
        textTransform: 'none',
        letterSpacing: 'normal',
    },

    emptyState: {
        textAlign: 'center',
        color: colors.textMuted,
        padding: '3rem',
        fontSize: '0.875rem',
    },
    tableFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.375rem',
        borderTop: `1px solid ${colors.borderLight}`,
    },
    tableFooterText: {
        fontSize: '0.8rem',
        color: colors.textMuted,
    },
    tableFooterLink: {
        fontSize: '0.8rem',
        fontWeight: 600,
        color: colors.primary,
        cursor: 'pointer',
    },

    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17,24,39,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 300,
    },
    modal: {
        width: '560px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: colors.bgCard,
        borderRadius: '14px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1.25rem',
        padding: '1.5rem 1.625rem 1.25rem',
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    modalTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
    },
    modalRef: {
        fontSize: '0.8rem',
        color: colors.textMuted,
    },
    modalTitle: {
        ...typography.h2,
        fontSize: '1.25rem',
        margin: '0.75rem 0 0',
    },
    modalSubtitle: {
        fontSize: '0.8rem',
        color: colors.textMuted,
        marginTop: '0.375rem',
    },
    modalClose: {
        flex: 'none',
        width: '32px',
        height: '32px',
        borderRadius: '9px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        color: colors.textMuted,
        fontSize: '1rem',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '0.5rem 1.625rem 0.25rem',
    },
    modalNote: {
        display: 'grid',
        gridTemplateColumns: '150px 1fr',
        gap: '1.25rem',
        padding: '1rem 0',
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    modalNoteLabel: {
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: colors.textMuted,
        textTransform: 'uppercase',
        paddingTop: '0.15rem',
    },
    modalNoteBody: {
        fontSize: '0.875rem',
        color: colors.textBody,
        lineHeight: 1.55,
    },
    modalActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        flexWrap: 'wrap',
        padding: '1.125rem 1.625rem 1.375rem',
    },
    modalPrimaryBtn: {
        padding: '0.7rem 1.125rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '9px',
        fontSize: '0.825rem',
        fontWeight: 700,
        cursor: 'pointer',
    },
    modalSecondaryBtn: {
        padding: '0.7rem 1.125rem',
        backgroundColor: colors.bgCard,
        color: colors.textBody,
        border: `1px solid ${colors.border}`,
        borderRadius: '9px',
        fontSize: '0.825rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modalHint: {
        marginLeft: 'auto',
        fontSize: '0.75rem',
        color: colors.textMuted,
    },

    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: `1px solid ${colors.border}`,
        marginTop: '1rem',
    },
    footerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerText: {
        fontSize: '0.75rem',
        color: colors.textMuted,
    },
    footerLinks: {
        display: 'flex',
        gap: '1rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        cursor: 'pointer',
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
        backgroundColor: colors.success,
    },
    statusText: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        fontWeight: 500,
    },
};
