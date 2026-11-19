import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import QuotationDetailsModal from '../components/QuotationDetailsModal';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { adminStatus, statusLabel } from '../styles/adminTheme';
import { formatQuotationRef } from '../utils/references';

const SORT_OPTIONS = ['Newest first', 'Oldest first', 'Highest value', 'Lowest value'];

// Colours from the "Customer · Overview" mockup
const GREEN = '#0F3D2E';
const GOLD = '#F2C14E';
const INK = '#1B2420';
const BODY = '#3A4440';
const MUTED = '#5F6A65';
const LINE = '#E3E3DE';
const STRIP_TEXT = '#C3D3CB';

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

    // ₱1.38M, ₱205.2K, ₱0
    const formatCompact = (amount) => {
        const n = parseFloat(amount) || 0;
        if (n >= 1000000) return `₱${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `₱${(n / 1000).toFixed(1)}K`;
        return `₱${Math.round(n)}`;
    };

    const formatDate = (value) => {
        if (!value) return '—';
        return new Date(value).toLocaleDateString('en-PH', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    // "hybrid" → "Hybrid"
    const systemLabel = (type) => {
        if (!type) return 'Solar';
        return type
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('-');
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

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    const firstName = user?.name?.split(' ')[0];

    const approvedCount = quotationRequests.filter((q) => q.status === 'approved').length;
    const scheduleDate = schedule?.scheduled_date ? formatDate(schedule.scheduled_date) : null;

    // The four numbers along the bottom of the banner
    const stats = [
        { label: 'Total quotations', dot: '#FFFFFF', value: totalCount, note: 'All requests you sent' },
        {
            label: 'Waiting for review', dot: GOLD, value: pendingCount,
            note: pendingCount ? 'We’ll get back to you soon' : 'Nothing pending',
        },
        {
            label: 'Installations scheduled', dot: '#8EC1EE', value: scheduleCount,
            note: !scheduleDate ? 'None yet'
                : schedule.status === 'completed' ? `Installed on ${scheduleDate}` : `Site visit on ${scheduleDate}`,
        },
        {
            label: 'Approved value', dot: '#A8D5C2', value: approvedCompact,
            note: `Across ${approvedCount} approved quotation${approvedCount === 1 ? '' : 's'}`,
        },
    ];

    const statusTabs = ['all', 'approved', 'pending', 'rejected', 'cancelled'];

    return (
        <CustomerLayout active="Overview">
            <div style={styles.page}>
                {/* ---- Banner: greeting, then the four numbers ---- */}
                <section aria-label="Summary" style={styles.hero}>
                    <div style={styles.heroTop}>
                        <div style={{ minWidth: 0 }}>
                            <span style={styles.eyebrow}>{today}</span>
                            <h1 style={styles.heroTitle}>Welcome back{firstName ? `, ${firstName}` : ''}</h1>
                            <p style={styles.heroSub}>Your quotations and installation at a glance</p>
                        </div>
                        <Link to="/quotation/new" className="c-btn c-btn-gold hero-full-phone" style={styles.heroBtn}>
                            Request a quotation
                        </Link>
                    </div>
                    <dl className="hero-grid" style={styles.stats}>
                        {stats.map((s, i) => (
                            <div key={s.label} style={{ ...styles.stat, ...(i ? styles.statDivider : {}) }}>
                                <dt style={styles.statLabel}>
                                    <span aria-hidden="true" style={{ ...styles.statDot, background: s.dot }} />
                                    {s.label}
                                </dt>
                                <dd style={styles.statValue}>{loading ? '—' : s.value}</dd>
                                <dd style={styles.statNote}>{loading ? ' ' : s.note}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {error && <div role="alert" style={styles.error}>{error}</div>}

                {/* ---- Recent quotations ---- */}
                <section style={styles.card}>
                    <div style={styles.cardHead}>
                        <div>
                            <h2 style={styles.cardTitle}>Recent quotations</h2>
                            <p style={styles.cardSub}>
                                {totalCount} quotation{totalCount === 1 ? '' : 's'}
                                {statusFilter !== 'all' && ` · ${filteredQuotations.length} ${statusFilter}`}
                            </p>
                        </div>

                        <div style={styles.controls}>
                            <div role="group" aria-label="Filter by status" style={styles.segments}>
                                {statusTabs.map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className="c-seg"
                                        aria-pressed={statusFilter === tab}
                                        onClick={() => setStatusFilter(tab)}
                                    >
                                        {tab === 'all' ? 'All' : statusLabel(tab)}
                                    </button>
                                ))}
                            </div>

                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className="c-btn c-btn-secondary"
                                    style={{ height: '38px' }}
                                    aria-haspopup="true"
                                    aria-expanded={sortOpen}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSortOpen(!sortOpen);
                                    }}
                                >
                                    <SortGlyph />
                                    {sortBy}
                                </button>

                                <div
                                    className={`menu-pop c-sort-menu${sortOpen ? ' menu-open' : ''}`}
                                    style={styles.sortDropdown}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className="account-item"
                                            style={{ ...styles.dropdownItem, fontWeight: sortBy === option ? 700 : 500 }}
                                            onClick={() => {
                                                setSortBy(option);
                                                setSortOpen(false);
                                            }}
                                        >
                                            <span>{option}</span>
                                            {sortBy === option && <span style={styles.checkMark}>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <LoadingState label="Loading your quotations..." />
                    ) : (
                        <>
                            {/* Scrolls sideways inside the card on narrow screens */}
                            <div className="scroll-x">
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.headRow}>
                                            <th scope="col" style={{ ...styles.th, paddingLeft: '20px' }}>Quotation</th>
                                            <th scope="col" style={styles.th}>System</th>
                                            <th scope="col" style={styles.th}>Submitted</th>
                                            <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                                            <th scope="col" style={{ ...styles.th, paddingRight: '20px' }}>
                                                <span style={styles.srOnly}>Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleQuotations.map((qr) => {
                                            const ref = formatQuotationRef(qr);
                                            const tone = adminStatus[qr.status] || adminStatus.cancelled;
                                            const kw = qr.solar_computation?.panel_capacity_kw;
                                            return (
                                                // Clicking anywhere on the row opens the details (with the
                                                // PDF download and any rejection reason); the View button
                                                // does the same for keyboards
                                                <tr key={qr.id} className="c-row" onClick={() => openDetails(qr)}>
                                                    <td style={{ ...styles.td, paddingLeft: '20px' }}>
                                                        <div style={styles.refCell}>
                                                            <span style={{ fontWeight: 700 }}>{ref}</span>
                                                            <span style={{ ...styles.badge, background: tone.bg, color: tone.fg }}>
                                                                {statusLabel(qr.status)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={{ fontWeight: 600 }}>
                                                            {systemLabel(qr.solar_system_type)}
                                                            {kw ? ` · ${kw} kW` : ''}
                                                        </div>
                                                        {!kw && <div style={styles.subText}>Awaiting computation</div>}
                                                        {qr.monthly_bill && (
                                                            <div style={styles.subText}>
                                                                ₱{parseFloat(qr.monthly_bill).toLocaleString('en-PH', { maximumFractionDigits: 0 })} monthly bill
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ ...styles.td, color: BODY, whiteSpace: 'nowrap' }}>
                                                        {formatDate(qr.submission_date || qr.created_at)}
                                                    </td>
                                                    <td style={{
                                                        ...styles.td,
                                                        textAlign: 'right',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap',
                                                        color: qr.status === 'cancelled' ? '#7A837E' : INK,
                                                    }}>
                                                        {formatCurrency(qr.quotation?.total_amount || qr.solar_computation?.estimated_cost)}
                                                    </td>
                                                    <td style={{ ...styles.td, paddingRight: '20px', textAlign: 'right' }}>
                                                        <button
                                                            type="button"
                                                            className="c-btn c-btn-secondary"
                                                            aria-label={`View ${ref}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDetails(qr);
                                                            }}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {visibleQuotations.length === 0 && (
                                <p style={styles.empty}>
                                    {totalCount === 0
                                        ? 'No quotations yet. Request your first one to get started.'
                                        : 'No quotations with this status.'}
                                </p>
                            )}

                            <div style={styles.cardFoot}>
                                <span style={{ fontSize: '13px', color: MUTED }}>
                                    Showing {visibleQuotations.length} of {totalCount}
                                </span>
                                <Link to="/customer/my-quotations" style={styles.textLink}>All quotations →</Link>
                            </div>
                        </>
                    )}
                </section>

                <footer style={styles.footer}>
                    <span style={{ flex: 1 }}>© {new Date().getFullYear()} TataMawing Solar. All rights reserved.</span>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                </footer>
            </div>

            {detailsFor && (
                <QuotationDetailsModal
                    qr={detailsFor}
                    reference={formatQuotationRef(detailsFor)}
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

// Up-and-down arrows on the sort button
function SortGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4v16" /><path d="m3 16 4 4 4-4" /><path d="M17 20V4" /><path d="m13 8 4-4 4 4" />
        </svg>
    );
}

const styles = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px' },

    hero: { background: GREEN, color: '#FFFFFF', borderRadius: '8px' },
    heroTop: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '16px 24px', padding: '22px 24px 20px',
    },
    eyebrow: { display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: GOLD },
    heroTitle: { margin: '4px 0 0', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
    heroSub: { margin: '2px 0 0', fontSize: '14px', color: STRIP_TEXT },
    heroBtn: { height: '42px', padding: '0 16px', fontSize: '14px' },
    stats: {
        margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        borderTop: '1px solid rgba(255,255,255,0.14)', background: '#0B3326',
        borderRadius: '0 0 8px 8px', overflow: 'hidden',
    },
    // marginLeft -1px hides the divider of whichever cell starts a wrapped row
    stat: { padding: '14px 24px', marginLeft: '-1px' },
    statDivider: { borderLeft: '1px solid rgba(255,255,255,0.12)' },
    statLabel: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: STRIP_TEXT },
    statDot: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' },
    statValue: { margin: '2px 0 0', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
    statNote: { margin: 0, fontSize: '13px', color: STRIP_TEXT, minHeight: '19px' },

    error: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #F0D0CB',
        background: '#FBEAE7', color: '#A4302A', fontSize: '14px',
    },

    card: { background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '6px' },
    cardHead: {
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', padding: '16px 20px',
    },
    cardTitle: { margin: 0, fontSize: '16px', fontWeight: 700, color: INK },
    cardSub: { margin: '2px 0 0', fontSize: '13px', color: MUTED },
    controls: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
    segments: {
        display: 'flex', flexWrap: 'wrap', maxWidth: '100%', border: '1px solid #D6D6D0',
        borderRadius: '6px', padding: '3px', gap: '2px',
    },
    sortDropdown: {
        position: 'absolute',
        top: '44px',
        // Lines up with the button's right edge; on phones, where the button
        // wraps to the left, .c-sort-menu (App.css) lines it up on the left
        right: 0,
        width: '200px',
        maxWidth: 'calc(100vw - 2rem)',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${LINE}`,
        borderRadius: '6px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
        padding: '4px',
        zIndex: 20,
    },
    dropdownItem: {
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px',
        border: 'none', borderRadius: '4px', backgroundColor: 'transparent', color: INK,
        fontSize: '13px', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
    },
    checkMark: { marginLeft: 'auto', color: GREEN, fontSize: '12px' },

    table: { width: '100%', minWidth: '720px', borderCollapse: 'collapse', fontSize: '14px' },
    headRow: {
        fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: MUTED, background: '#FAFAF8',
    },
    th: {
        textAlign: 'left', fontWeight: 600, padding: '9px 12px',
        borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
    },
    td: { padding: '12px', borderBottom: '1px solid #EFEFEA', verticalAlign: 'middle' },
    refCell: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    badge: {
        display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700,
        borderRadius: '4px', padding: '1px 8px', whiteSpace: 'nowrap',
    },
    subText: { fontSize: '13px', color: MUTED },
    srOnly: {
        position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
    },
    empty: { margin: 0, padding: '24px 20px', textAlign: 'center', color: MUTED },
    cardFoot: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 20px' },
    textLink: { fontWeight: 600, textDecoration: 'none', color: GREEN },

    footer: {
        display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 0 0',
        fontSize: '13px', color: MUTED,
    },
    footerLink: { color: MUTED },
};
