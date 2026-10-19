import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import QuotationDetailsModal from '../components/QuotationDetailsModal';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import {
    DocumentIcon, ClockIcon, CalendarIcon, PesoIcon,
    EyeIcon,
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
    // The quotation shown in the details modal, or null
    const [detailsFor, setDetailsFor] = useState(null);

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

    // The sort dropdown closes on the next click anywhere else on the page.
    useEffect(() => {
        if (!sortOpen) return;
        const close = () => setSortOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [sortOpen]);

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

    const openDetails = (qr) => {
        setSortOpen(false);
        setDetailsFor(qr);
    };
    const closeDetails = useCallback(() => setDetailsFor(null), []);

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

                                        return (
                                            <div key={qr.id}>
                                                {/* Clicking anywhere on the row opens the details
                                                    (with the PDF download and any rejection reason) */}
                                                <div
                                                    className="mq-row-toggle"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`View details of ${formatReference(qr.id, qr.created_at)}`}
                                                    onClick={() => openDetails(qr)}
                                                    onKeyDown={(e) => {
                                                        if (e.target !== e.currentTarget) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            openDetails(qr);
                                                        }
                                                    }}
                                                    style={{ ...styles.tableRow, cursor: 'pointer' }}
                                                >
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

                                                    {/* Looks like a button, but the whole row is the
                                                        button, so this is only a visual cue */}
                                                    <div style={styles.actionCell}>
                                                        <span className="qd-view" style={styles.viewBtn} aria-hidden="true">
                                                            <EyeIcon size={14} color={colors.primary} />
                                                            View
                                                        </span>
                                                    </div>
                                                </div>
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
                                © {new Date().getFullYear()} TataMawing Solar. All rights reserved.
                            </span>
                            <div style={styles.footerLinks}>
                                <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                                <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                            </div>
                        </div>
                        <div style={styles.systemStatus}>
                            <span style={styles.statusDot} />
                            <span style={styles.statusText}>All Nodes Active</span>
                        </div>
                    </div>
                </>
            )}

            {detailsFor && (
                <QuotationDetailsModal
                    qr={detailsFor}
                    reference={formatReference(detailsFor.id, detailsFor.created_at)}
                    submitted={formatDate(detailsFor.submission_date || detailsFor.created_at)}
                    onDownload={detailsFor.status === 'approved' && detailsFor.quotation
                        ? () => handleDownloadQuotation(detailsFor.quotation.id)
                        : null}
                    onRequestNew={() => navigate('/quotation/new')}
                    onClose={closeDetails}
                />
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
    checkMark: {
        marginLeft: 'auto',
        color: colors.primary,
        fontSize: '0.75rem',
    },

    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '150px 1fr 130px 160px 88px',
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
        gridTemplateColumns: '150px 1fr 130px 160px 88px',
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
    viewBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '8px',
        border: `1px solid ${colors.primaryBorder}`,
        backgroundColor: colors.primaryTint,
        color: colors.primary,
        fontSize: '0.8rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
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
        backgroundColor: colors.success,
    },
    statusText: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        fontWeight: 500,
    },
};
