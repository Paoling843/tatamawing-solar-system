import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { formatQuotationRef, formatScheduleRef } from '../utils/references';

// The customer's installations, one card each: a date tile, the date and
// status, and a Details button that opens the technician, location and total.
// Look from the "Customer · Installation schedule" mockup.

const C = {
    green: '#0F3D2E',
    ink: '#1B2420',
    body: '#3A4440',
    muted: '#5F6A65',
    line: '#E3E3DE',
    rowLine: '#EFEFEA',
    stripText: '#C3D3CB',
};

// Pill colours and the card's left edge, per status the admin sets
const STATUS = {
    scheduled: { label: 'Scheduled', bg: '#E6EFF9', fg: '#1F4E80', accent: '#3F7CC0' },
    in_progress: { label: 'In progress', bg: '#FBEBC4', fg: '#6B4500', accent: '#D49A23' },
    completed: { label: 'Complete', bg: '#E3F1E8', fg: '#1F6B45', accent: '#2E8B5E' },
    delayed: { label: 'Delayed', bg: '#FBE4E1', fg: '#A3261B', accent: '#C8372B' },
};

// "2026-10-31" (or a full timestamp) → a Date at local midnight
const toDay = (dateString) => {
    const d = new Date(`${String(dateString).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? new Date(dateString) : d;
};

const daysFromToday = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((toDay(dateString) - today) / 86400000);
};

const peso = (amount) => (amount
    ? `₱${parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—');

export default function CustomerSchedulePage() {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Which card's details are open
    const [expandedId, setExpandedId] = useState(null);

    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/customer/schedules');
            setSchedules(res.data);
            // The first one opens straight away, as in the mockup
            setExpandedId((current) => current ?? res.data[0]?.id ?? null);
        } catch (err) {
            setError(errorMessage(err, "We couldn't load your installation schedule. Please try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchSchedules);
    }, [fetchSchedules]);

    // "Today", "Tomorrow", "In 5 days", "15 days ago"
    const getDaysUntil = (dateString) => {
        const diffDays = daysFromToday(dateString);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return `${Math.abs(diffDays)} day${diffDays === -1 ? '' : 's'} ago`;
        return `In ${diffDays} days`;
    };

    // The linked quotation's reference (TMS-QT-2026-0049). A schedule
    // booked directly by Admin (no quotation) shows its own (TMS-INS-2026-0003).
    const formatReference = (schedule) => {
        const request = schedule.quotation?.quotation_request;
        if (request) return formatQuotationRef(request);
        return formatScheduleRef(schedule);
    };

    const getSystemType = (schedule) => {
        if (!schedule.quotation) return 'Installation only';
        const type = schedule.quotation?.quotation_request?.solar_system_type;
        if (!type) return 'Solar system';
        return `${type.charAt(0).toUpperCase()}${type.slice(1).replace('-', ' ')} system`;
    };

    // The first fact in the details follows the status the admin sets. The
    // date only gives the countdown while it's still "scheduled" — a passed
    // date alone doesn't mean it's installed.
    const firstFact = (schedule) => {
        if (schedule.status === 'completed') return ['Status', 'Installation complete'];
        if (schedule.status === 'in_progress') return ['Scheduled date', `${getDaysUntil(schedule.scheduled_date)} · in progress`];
        if (schedule.status === 'delayed') return ['Status', "Delayed — we'll let you know the new date"];
        if (daysFromToday(schedule.scheduled_date) < 0) return ['Status', 'Waiting for an update'];
        return ['Scheduled date', getDaysUntil(schedule.scheduled_date)];
    };

    return (
        <CustomerLayout active="Installation Schedule">
            <div style={styles.page}>
                <section aria-label="Summary" style={styles.hero}>
                    <h1 style={styles.heroTitle}>Installation schedule</h1>
                    <p style={styles.heroSub}>Your upcoming and finished solar installations</p>
                </section>

                {error && <div role="alert" style={styles.error}>{error}</div>}

                {loading ? (
                    <div style={styles.plainCard}>
                        <LoadingState label="Loading your schedule..." />
                    </div>
                ) : schedules.length === 0 ? (
                    <div style={styles.emptyState}>
                        <h2 style={styles.emptyTitle}>No installation scheduled yet</h2>
                        <p style={styles.emptyDesc}>
                            Your installation will be scheduled by TataMawing after
                            your quotation is approved and materials are confirmed.
                        </p>
                        <button
                            type="button"
                            className="c-btn c-btn-primary"
                            onClick={() => navigate('/quotation/new')}
                            style={{ height: '40px', fontSize: '14px' }}
                        >
                            Request a quotation
                        </button>
                    </div>
                ) : (
                    <ol style={styles.list}>
                        {schedules.map((schedule) => {
                            const status = STATUS[schedule.status] || STATUS.scheduled;
                            const day = toDay(schedule.scheduled_date);
                            const open = expandedId === schedule.id;
                            const detailsId = `schedule-${schedule.id}-details`;
                            const facts = [
                                firstFact(schedule),
                                ['Technician', schedule.assigned_technician || '—'],
                                ['Location', schedule.quotation?.quotation_request?.installation_address
                                    || schedule.quotation?.quotation_request?.customer?.install_location
                                    || schedule.customer?.install_location || '—'],
                                ['Total amount', peso(schedule.quotation?.total_amount)],
                            ];

                            return (
                                <li key={schedule.id} style={{ ...styles.card, borderLeftColor: status.accent }}>
                                    <div style={styles.cardTop}>
                                        <div style={styles.dateTile} aria-hidden="true">
                                            <div style={styles.dateTileMonth}>
                                                {day.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                            </div>
                                            <div style={styles.dateTileDay}>{day.getDate()}</div>
                                        </div>
                                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                                            <div style={styles.titleRow}>
                                                <h2 style={styles.fullDate}>
                                                    {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </h2>
                                                <span style={{ ...styles.badge, background: status.bg, color: status.fg }}>{status.label}</span>
                                            </div>
                                            <div style={{ color: C.muted }}>
                                                {formatReference(schedule)} · {getSystemType(schedule)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="c-btn c-btn-secondary"
                                            onClick={() => setExpandedId(open ? null : schedule.id)}
                                            aria-expanded={open}
                                            aria-controls={detailsId}
                                        >
                                            {open ? 'Hide details' : 'Details'}
                                        </button>
                                    </div>

                                    {open && (
                                        <div id={detailsId} style={styles.details}>
                                            <dl style={styles.facts}>
                                                {facts.map(([label, value]) => (
                                                    <div key={label} style={{ minWidth: 0 }}>
                                                        <dt style={styles.factLabel}>{label}</dt>
                                                        <dd style={styles.factValue}>{value}</dd>
                                                    </div>
                                                ))}
                                            </dl>

                                            {schedule.notes && (
                                                <p style={styles.notes}><strong>Notes:</strong> {schedule.notes}</p>
                                            )}

                                            {/* Only useful before the work is done */}
                                            {schedule.status !== 'completed' && (
                                                <p style={styles.reminder}>
                                                    <HomeGlyph />
                                                    <span>
                                                        Please make sure someone is home on the installation day.
                                                        The technician will contact you before arriving.
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}

                <footer style={styles.footer}>
                    <span style={{ flex: 1 }}>© {new Date().getFullYear()} TataMawing Solar. All rights reserved.</span>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                </footer>
            </div>
        </CustomerLayout>
    );
}

function HomeGlyph() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: '1px' }}>
            <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
    );
}

const styles = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px' },

    hero: { background: C.green, color: '#FFFFFF', borderRadius: '8px', padding: '22px 24px 20px' },
    heroTitle: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
    heroSub: { margin: '2px 0 0', fontSize: '14px', color: C.stripText },

    error: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #F0D0CB',
        background: '#FBEAE7', color: '#A4302A', fontSize: '14px',
    },
    plainCard: { background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: '6px' },

    list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
    // The thick left edge takes the status colour
    card: {
        background: '#FFFFFF', border: `1px solid ${C.line}`, borderLeftWidth: '4px', borderLeftStyle: 'solid',
        borderRadius: '6px', overflow: 'hidden',
    },
    cardTop: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 24px', padding: '16px 20px' },
    dateTile: { width: '56px', flex: 'none', border: `1px solid ${C.line}`, borderRadius: '6px', overflow: 'hidden', textAlign: 'center' },
    dateTileMonth: { background: C.green, color: '#FFFFFF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', padding: '2px 0' },
    dateTileDay: { fontSize: '22px', fontWeight: 700, lineHeight: 1.3, color: C.ink },
    titleRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    fullDate: { margin: 0, fontSize: '16px', fontWeight: 700, color: C.ink },
    badge: { fontSize: '12px', fontWeight: 700, borderRadius: '4px', padding: '1px 8px', whiteSpace: 'nowrap' },

    details: {
        borderTop: `1px solid ${C.rowLine}`, background: '#FAFAF8', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: '14px',
    },
    facts: { margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px 20px' },
    factLabel: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.muted },
    factValue: { margin: '2px 0 0', fontSize: '16px', fontWeight: 600, color: C.ink, overflowWrap: 'anywhere' },
    notes: {
        margin: 0, padding: '10px 14px', background: '#FFFFFF', border: `1px solid ${C.line}`,
        borderRadius: '6px', color: C.body,
    },
    reminder: {
        margin: 0, display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px',
        background: '#FDF6E3', border: '1px solid #F1DFB0', borderRadius: '6px', color: '#5C3D00',
    },

    emptyState: {
        background: '#FFFFFF', border: '1px dashed #D6D6D0', borderRadius: '6px', padding: '40px 20px',
        textAlign: 'center', color: C.muted,
    },
    emptyTitle: { fontSize: '16px', fontWeight: 700, color: C.ink, margin: '0 0 6px' },
    emptyDesc: { maxWidth: '420px', margin: '0 auto 18px' },

    footer: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 0 0', fontSize: '13px', color: C.muted },
    footerLink: { color: C.muted },
};
