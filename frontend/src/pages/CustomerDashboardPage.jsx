import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import QuotationDetailsModal from '../components/QuotationDetailsModal';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import {
    DocumentIcon, ClockIcon, CalendarIcon, PesoIcon,
    EyeIcon,
} from '../components/Icons';
import { colors, statusColors, smallGreenButton } from '../styles/theme';

const SORT_OPTIONS = ['Newest first', 'Oldest first', 'Highest value', 'Lowest value'];

// Dashboard colours
const GREEN = '#0f3b2c';
const SUN = '#f4c542';
const INK = '#14201a';
const MUTED = '#5a6a62';
const LINE = '#e3e8e2';

export default function CustomerDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [quotationRequests, setQuotationRequests] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Shown inside the details window, where the Download button is
    const [downloadError, setDownloadError] = useState('');

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
        } catch (err) {
            setError(errorMessage(err, "We couldn't load your dashboard. Please try again."));
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
        setDownloadError('');
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
        } catch (err) {
            setDownloadError(errorMessage(await readBlobError(err), "We couldn't download your quotation PDF. Please try again."));
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
        setDownloadError('');
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

    const solarQuote = '';

    // tint: the icon's square; tone: the icon and the number
    const stats = [
        {
            label: 'Total Quotations', tint: '#e3f1ea', tone: '#1d6b4f',
            icon: <DocumentIcon size={20} color="#1d6b4f" />,
            value: totalCount, unit: '', note: 'All requests submitted',
        },
        {
            label: 'Pending Quotations', tint: '#fdf0d2', tone: '#a15c07',
            icon: <ClockIcon size={20} color="#a15c07" />,
            value: pendingCount, unit: '', note: 'Awaiting review',
        },
        {
            label: 'Scheduled Installations', tint: '#e0ecfb', tone: '#1f5fae',
            icon: <CalendarIcon size={20} color="#1f5fae" />,
            value: scheduleCount, unit: '', note: 'Upcoming site visits',
        },
        {
            // The one solid green card, so the total stands out
            label: 'Approved Value', tint: SUN, tone: '#ffffff', solid: true,
            icon: <PesoIcon size={20} color={GREEN} />,
            value: approvedCompact.value, unit: approvedCompact.unit,
            note: 'Across approved quotations',
        },
    ];

    return (
        <CustomerLayout active="Overview">
        <div style={styles.page}>

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
                            <div key={s.label} className="m-pad" style={{ ...styles.statCell, ...(s.solid ? styles.statCellSolid : {}) }}>
                                <div style={styles.statTop}>
                                    <span style={{ ...styles.statLabel, ...(s.solid ? styles.onGreen : {}) }}>{s.label}</span>
                                    <span style={{ ...styles.statIcon, backgroundColor: s.tint }}>{s.icon}</span>
                                </div>
                                <div style={styles.statValueRow}>
                                    <span style={{ ...styles.statValue, color: s.tone }}>{s.value}</span>
                                    {s.unit && <span style={{ ...styles.statUnit, ...(s.solid ? styles.onGreen : {}) }}>{s.unit}</span>}
                                </div>
                                <div style={{ ...styles.statNote, ...(s.solid ? styles.onGreen : {}) }}>{s.note}</div>
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
                                    {['all', 'approved', 'pending', 'rejected', 'cancelled'].map((tab) => (
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

                        {/* Scrolls sideways inside the card on narrow screens */}
                        <div className="scroll-x">
                            <div style={{ minWidth: '820px' }}>
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
                                        const { bg: badgeBg, text: badgeText } = statusColors[qr.status] || statusColors.draft;
                                        const kw = qr.solar_computation?.panel_capacity_kw;

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
                                                            backgroundColor: badgeBg,
                                                            color: badgeText,
                                                        }}>
                                                            <span style={{ ...styles.statusDot, backgroundColor: badgeText }} />
                                                            {qr.status.charAt(0).toUpperCase() +
                                                                qr.status.slice(1)}
                                                        </span>
                                                    </div>

                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={styles.systemName}>
                                                            {systemLabel(qr.solar_system_type)}
                                                        </div>
                                                        <div style={styles.systemSpec}>
                                                            {kw
                                                                ? <><span style={styles.systemKw}>{kw} kW</span> array</>
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
                                                            <EyeIcon size={16} color={GREEN} />
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

                        <div className="m-wrap" style={styles.tableFooter}>
                            <span style={styles.tableFooterText}>
                                Showing {visibleQuotations.length} of {totalCount}
                            </span>
                            <Link to="/customer/my-quotations" className="btn-primary m-tap" style={smallGreenButton}>
                                All quotations →
                            </Link>
                        </div>
                    </div>

                    <div className="m-wrap" style={styles.footer}>
                        <div className="m-wrap" style={styles.footerLeft}>
                            <span style={styles.footerText}>
                                © {new Date().getFullYear()} TataMawing Solar. All rights reserved.
                            </span>
                            <div style={styles.footerLinks}>
                                <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                                <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>

            {detailsFor && (
                <QuotationDetailsModal
                    qr={detailsFor}
                    reference={formatReference(detailsFor.id, detailsFor.created_at)}
                    submitted={formatDate(detailsFor.submission_date || detailsFor.created_at)}
                    onDownload={detailsFor.status === 'approved' && detailsFor.quotation
                        ? () => handleDownloadQuotation(detailsFor.quotation.id)
                        : null}
                    onRequestNew={() => navigate('/quotation/new')}
                    error={downloadError}
                    onClose={closeDetails}
                />
            )}
        </CustomerLayout>
    );
}

const styles = {
    // Keeps the cards from stretching too far on very wide screens
    page: { maxWidth: '1240px', width: '100%' },

    welcomeSection: {
        backgroundColor: GREEN,
        color: '#ffffff',
        borderRadius: '18px',
        padding: 'clamp(1.5rem, 4vw, 2rem) clamp(1.25rem, 4vw, 2.25rem)',
        marginBottom: '1.5rem',
    },
    eyebrow: {
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        color: SUN,
        marginBottom: '0.5rem',
    },
    welcomeTitle: {
        margin: 0,
        fontSize: '1.75rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: '#ffffff',
    },
    welcomeQuote: {
        fontSize: '0.875rem',
        color: '#d3e2d9',
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
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    statCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minWidth: 0,
        backgroundColor: '#ffffff',
        border: `1px solid ${LINE}`,
        borderRadius: '16px',
        padding: '1.5rem',
    },
    statCellSolid: {
        backgroundColor: GREEN,
        borderColor: GREEN,
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
        color: '#3d4d45',
    },
    onGreen: {
        color: '#cfe0d6',
    },
    statIcon: {
        width: '44px',
        height: '44px',
        flexShrink: 0,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValueRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
        flexWrap: 'wrap',
    },
    statUnit: {
        fontSize: '0.75rem',
        color: MUTED,
    },
    statValue: {
        fontSize: 'clamp(1.5rem, 6vw, 2rem)',
        fontWeight: 700,
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
    },
    statNote: {
        fontSize: '0.75rem',
        color: MUTED,
    },

    tableCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        border: `1px solid ${LINE}`,
    },
    tableCardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        padding: '1.5rem 1.75rem',
    },
    tableTitle: {
        margin: 0,
        fontSize: '1.125rem',
        fontWeight: 700,
        color: INK,
    },
    tableSubtitle: {
        fontSize: '0.8rem',
        color: MUTED,
        marginTop: '4px',
    },
    headerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
    },
    filterTabs: {
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: '100%',
        gap: '4px',
        backgroundColor: '#eef2ec',
        borderRadius: '12px',
        padding: '4px',
    },
    filterTab: {
        padding: '0.375rem 0.875rem',
        border: 'none',
        borderRadius: '9px',
        backgroundColor: 'transparent',
        color: '#4a5a52',
        fontSize: '0.8rem',
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    filterTabActive: {
        backgroundColor: GREEN,
        color: '#ffffff',
        fontWeight: 600,
    },
    sortWrap: {
        position: 'relative',
    },
    sortBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid #dfe5de',
        borderRadius: '10px',
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: 'inherit',
        color: INK,
        cursor: 'pointer',
    },
    sortTag: {
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        color: MUTED,
        fontWeight: 600,
    },
    caret: {
        fontSize: '0.6rem',
        color: MUTED,
    },
    sortDropdown: {
        position: 'absolute',
        top: '2.5rem',
        // Opens to the right of the button, so it stays on screen when the
        // controls wrap to the left edge on phones
        left: 0,
        width: '210px',
        maxWidth: 'calc(100vw - 2rem)',
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
        fontFamily: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
    },
    checkMark: {
        marginLeft: 'auto',
        color: GREEN,
        fontSize: '0.75rem',
    },

    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '200px minmax(0, 1fr) 160px 160px 110px',
        gap: '1rem',
        padding: '0.75rem 1.75rem',
        backgroundColor: GREEN,
        fontSize: '0.65rem',
        color: '#cfe0d6',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    },
    tableRow: {
        display: 'grid',
        gridTemplateColumns: '200px minmax(0, 1fr) 160px 160px 110px',
        gap: '1rem',
        alignItems: 'center',
        padding: '1.25rem 1.75rem',
        borderBottom: '1px solid #edf1ec',
        color: INK,
        position: 'relative',
        fontSize: '0.875rem',
    },
    refCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.5rem',
    },
    referenceText: {
        fontWeight: 600,
        color: INK,
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 600,
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
    },
    systemName: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: INK,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    systemSpec: {
        fontSize: '0.75rem',
        color: MUTED,
        marginTop: '4px',
    },
    systemKw: {
        fontWeight: 600,
        color: '#1d6b4f',
    },
    dateCell: {
        fontSize: '0.8rem',
        color: '#3d4d45',
    },
    valueCell: {
        fontSize: '0.9rem',
        color: GREEN,
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
        gap: '8px',
        padding: '0.4rem 0.75rem',
        borderRadius: '10px',
        border: `1.5px solid ${GREEN}`,
        color: GREEN,
        fontSize: '0.8rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },

    emptyState: {
        textAlign: 'center',
        color: MUTED,
        padding: '2.5rem 1.75rem',
        fontSize: '0.875rem',
    },
    tableFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.125rem 1.75rem',
    },
    tableFooterText: {
        fontSize: '0.8rem',
        color: MUTED,
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
};
