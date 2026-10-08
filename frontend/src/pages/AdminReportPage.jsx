import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';
import { DownloadIcon, DocumentIcon } from '../components/Icons';
import { colors } from '../styles/theme';

// =====================================================================
// Detailed Analytics — built from the Analytics design.
// Every number comes from GET /api/admin/analytics?days=N (AnalyticsService
// on the backend). The range buttons change N; the PDF reports use the
// same range.
// =====================================================================

const ACCENT = colors.primary;

const RANGES = [
    { days: 7, label: '7 days', long: '7 days' },
    { days: 30, label: '30 days', long: '30 days' },
    { days: 90, label: '90 days', long: '90 days' },
    { days: 365, label: 'Year', long: '12 months' },
];

// The three groups the panel asked for, with their chart colours
const GROUPS = [
    { key: 'guest_not_continued', label: 'Guest quotation', color: '#F5C04A', note: 'did not continue the quotation request' },
    { key: 'guest_signed_in', label: 'Signed in to continue', color: '#FFFFFF', note: 'made a quotation as a guest, then signed in' },
    { key: 'external_requests', label: 'External quotation', color: '#8EC5F2', note: 'asked to schedule an installation for an outside quotation' },
];

const REPORTS = [
    { key: 'quote-sessions', title: 'Guest vs signed-in quotations', sub: 'Every quote-builder visit and whether the user signed in', file: 'guest-vs-signed-in-quotations.pdf' },
    { key: 'external-requests', title: 'External quotation requests', sub: 'Schedule requests for outside quotations', file: 'external-quotation-requests.pdf' },
    { key: 'quotation-history', title: 'Quotation history', sub: 'All requests with statuses', file: 'quotation-history-report.pdf' },
    { key: 'quotation-material', title: 'Material report', sub: 'Materials per project', file: 'quotation-material-report.pdf' },
    { key: 'procurement', title: 'Procurement report', sub: 'Purchase requests and supplier responses', file: 'procurement-report.pdf' },
];

// ₱3,900,000 → "₱3.9M", ₱595,680 → "₱596K"
function compactPeso(n) {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `₱${Math.round(n / 1_000)}K`;
    return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

// "+14% vs previous 30 days" / "−2 vs previous 30 days" / "Same as previous 30 days"
function delta({ value, previous }, kind, rangeLong) {
    const suffix = `vs previous ${rangeLong}`;
    if (kind === 'percent') {
        if (previous === 0) {
            return value > 0
                ? { text: `New — none in the previous ${rangeLong}`, tone: 'up' }
                : { text: `Same as previous ${rangeLong}`, tone: 'flat' };
        }
        const pct = Math.round(((value - previous) / previous) * 100);
        if (pct === 0) return { text: `Same as previous ${rangeLong}`, tone: 'flat' };
        return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% ${suffix}`, tone: pct > 0 ? 'up' : 'down' };
    }
    const diff = value - previous;
    if (diff === 0) return { text: `Same as previous ${rangeLong}`, tone: 'flat' };
    return { text: `${diff > 0 ? '+' : '−'}${Math.abs(diff)} ${suffix}`, tone: diff > 0 ? 'up' : 'down' };
}

const TONE_COLOR = { up: '#15803D', down: '#B45309', flat: '#6B7280' };

export default function AdminReportPage() {
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [approvedQuotations, setApprovedQuotations] = useState([]);
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [downloading, setDownloading] = useState('');

    const range = RANGES.find((r) => r.days === days);

    const fetchAnalytics = useCallback(async (period) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/analytics', { params: { days: period } });
            setData(res.data);
        } catch {
            setError('Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Deferred so the state updates land after the effect returns
        Promise.resolve().then(() => fetchAnalytics(days));
    }, [days, fetchAnalytics]);

    // Approved quotations, for the "Individual quotation" report picker
    useEffect(() => {
        Promise.resolve().then(async () => {
            try {
                const res = await api.get('/admin/quotation-requests', { params: { status: 'approved' } });
                setApprovedQuotations(res.data.filter((q) => q.quotation));
            } catch {
                setApprovedQuotations([]);
            }
        });
    }, []);

    const download = async (key, url, filename) => {
        setError('');
        setDownloading(key);
        try {
            const res = await api.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            setError('Failed to generate the report. Please try again.');
        } finally {
            setDownloading('');
        }
    };

    const downloadReport = (report) =>
        download(report.key, `/admin/reports/${report.key}?days=${days}`, report.file.replace('.pdf', `-${days}-days.pdf`));

    const downloadQuotation = () => {
        if (!selectedQuotationId) {
            setError('Pick a quotation to export first.');
            return;
        }
        download('quotation', `/admin/reports/quotation/${selectedQuotationId}`, `quotation-${selectedQuotationId}.pdf`);
    };

    return (
        <AdminLayout active="Analytics">
            <div style={styles.page}>
                {/* ----- Header ----- */}
                <div style={styles.headerRow}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h1 style={styles.title}>Detailed Analytics</h1>
                        <p style={styles.subtitle}>Quotations, sign-ins and installations at a glance.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div role="group" aria-label="Date range" style={styles.rangeGroup}>
                            {RANGES.map((r) => {
                                const active = r.days === days;
                                return (
                                    <button
                                        key={r.days}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setDays(r.days)}
                                        style={{ ...styles.rangeBtn, ...(active ? styles.rangeBtnActive : {}) }}
                                    >
                                        {r.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => download('summary', `/admin/reports/analytics-summary?days=${days}`, `analytics-summary-${days}-days.pdf`)}
                            disabled={downloading === 'summary'}
                            style={styles.primaryBtn}
                        >
                            {downloading === 'summary' ? 'Preparing…' : 'Export PDF'}
                        </button>
                    </div>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                {!data ? (
                    <div style={styles.loadingCard}>{loading ? 'Loading analytics…' : 'No analytics data.'}</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
                        <UsersSection data={data} rangeLong={range.long} />
                        <KpiCards kpis={data.kpis} rangeLong={range.long} />
                        <FunnelSection funnel={data.funnel} external={data.users.external_requests} />

                        <div style={styles.threeUp}>
                            <StepTimes times={data.step_times} />
                            <SizesCard sizes={data.sizes} />
                            <LocationsCard places={data.locations} />
                        </div>

                        <div style={styles.twoUp}>
                            <SavingsCard savings={data.savings} />
                            <ReviewQueueCard queue={data.review_queue} />
                        </div>

                        {/* ----- Reports ----- */}
                        <section style={styles.card}>
                            <SectionTitle title="Download reports" sub={`PDF exports for the last ${range.long}`} />
                            <div style={styles.reportGrid}>
                                {REPORTS.map((r) => (
                                    <button
                                        key={r.key}
                                        type="button"
                                        aria-label={`Download ${r.title}`}
                                        onClick={() => downloadReport(r)}
                                        disabled={downloading === r.key}
                                        style={styles.reportBtn}
                                    >
                                        <ReportIcons busy={downloading === r.key} />
                                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{r.title}</span>
                                        <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.4 }}>{r.sub}</span>
                                    </button>
                                ))}

                                {/* Individual quotation: pick one, then download (not period-based) */}
                                <div style={{ ...styles.reportBtn, cursor: 'default' }}>
                                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <span style={styles.reportIconBox}><DocumentIcon size={18} color={ACCENT} /></span>
                                    </span>
                                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>Individual quotation</span>
                                    <select
                                        aria-label="Quotation to export"
                                        value={selectedQuotationId}
                                        onChange={(e) => setSelectedQuotationId(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Pick an approved quotation…</option>
                                        {approvedQuotations.map((q) => (
                                            <option key={q.quotation.id} value={q.quotation.id}>
                                                {q.customer?.user?.name} — #{q.quotation.id}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={downloadQuotation}
                                        disabled={downloading === 'quotation'}
                                        style={{ ...styles.secondaryBtn, height: '38px', width: '100%' }}
                                    >
                                        {downloading === 'quotation' ? 'Preparing…' : 'Download PDF'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

function UsersSection({ data, rangeLong }) {
    const counts = GROUPS.map((g) => data.users[g.key]);
    const total = counts.reduce((a, b) => a + b, 0);
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const max = Math.max(1, ...data.monthly.flatMap((m) => GROUPS.map((g) => m[g.key])));
    const BAR_MAX = 150;

    return (
        <section style={styles.hero}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Who's using the system</h2>
                    <p style={{ margin: 0, fontSize: '14px', color: '#C9DDD2' }}>
                        {/* Visits are counted per browser tab, not per person */}
                        {total} quotation{total === 1 ? '' : 's'} and request{total === 1 ? '' : 's'} in the last {rangeLong}
                    </p>
                </div>

                <div style={styles.groupGrid}>
                    {GROUPS.map((g, i) => (
                        <div key={g.key} style={styles.groupCard}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E3EEE8', lineHeight: 1.3 }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                                {g.label}
                            </span>
                            <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.02em' }}>{counts[i]}</span>
                            <span style={{ fontSize: '13px', color: '#C9DDD2', lineHeight: 1.4 }}>{pct(counts[i])}% · {g.note}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', gap: total ? '2px' : 0, background: 'rgba(255,255,255,0.15)' }}>
                    {GROUPS.map((g, i) => counts[i] > 0 && (
                        <div key={g.key} style={{ width: `${pct(counts[i])}%`, background: g.color }} title={`${g.label}: ${counts[i]}`} />
                    ))}
                </div>

                {data.users.signed_in_customers > 0 && (
                    <span style={{ fontSize: '13px', color: '#C9DDD2' }}>
                        Plus {data.users.signed_in_customers} customer{data.users.signed_in_customers === 1 ? ' who was' : 's who were'} already signed in when they made their quotation.
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E3EEE8' }}>Last 6 months</span>
                <div
                    role="img"
                    aria-label={data.monthly.map((m) => `${m.label}: ${GROUPS.map((g) => `${m[g.key]} ${g.label.toLowerCase()}`).join(', ')}`).join('; ')}
                    style={{ ...styles.monthGrid, height: '190px', alignItems: 'end', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
                >
                    {data.monthly.map((m) => (
                        <div key={m.month} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', height: '100%' }}>
                            {GROUPS.map((g) => (
                                <div key={g.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', height: '100%' }}>
                                    <span style={{ fontSize: '11px', color: g.color }}>{m[g.key]}</span>
                                    <div style={{ width: '14px', height: `${Math.round((m[g.key] / max) * BAR_MAX)}px`, background: g.color, borderRadius: '4px 4px 0 0' }} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div style={{ ...styles.monthGrid, fontSize: '12px', color: '#C9DDD2', textAlign: 'center' }}>
                    {data.monthly.map((m) => <span key={m.month}>{m.label}</span>)}
                </div>
            </div>
        </section>
    );
}

function KpiCards({ kpis, rangeLong }) {
    const cards = [
        { label: 'Quotations created', value: String(kpis.quotations_created.value), d: delta(kpis.quotations_created, 'percent', rangeLong) },
        { label: 'Approved projects', value: String(kpis.approved_projects.value), d: delta(kpis.approved_projects, 'count', rangeLong) },
        // Contract value of approved quotations — the system doesn't track payments
        { label: 'Value of approved projects', value: compactPeso(kpis.revenue.value), d: delta(kpis.revenue, 'percent', rangeLong) },
        { label: 'Installations completed', value: String(kpis.installations_completed.value), d: delta(kpis.installations_completed, 'count', rangeLong) },
    ];

    return (
        <div style={styles.kpiGrid}>
            {cards.map((c) => (
                <div key={c.label} style={styles.kpiCard}>
                    <span style={{ fontSize: '14px', color: '#4B5563' }}>{c.label}</span>
                    <span style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>{c.value}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: TONE_COLOR[c.d.tone] }}>{c.d.text}</span>
                </div>
            ))}
        </div>
    );
}

function FunnelSection({ funnel, external }) {
    const base = Math.max(1, funnel[0].count);

    return (
        <section style={{ ...styles.card, gap: '18px' }}>
            <SectionTitle
                title="From quotation to installation"
                sub={`Quote-builder visits from this period, followed to installation. Recent visits may not have reached installation yet — use 90 days or Year for the full picture. ${external ?`The ${external} external-quotation request${external === 1 ? '' : 's'} go${external === 1 ? 'es' : ''} straight to scheduling and ${external === 1 ? "isn't" : "aren't"} counted here.` : 'External-quotation requests go straight to scheduling and aren\'t counted here.'}`}
            />
            <div style={styles.funnelGrid}>
                {funnel.map((f, i) => {
                    const prev = i > 0 ? funnel[i - 1].count : null;
                    const dropPct = prev ? Math.round(((prev - f.count) / prev) * 100) : null;
                    const height = f.count > 0 ? Math.max(4, Math.round((f.count / base) * 100)) : 0;

                    return (
                        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ height: '120px', background: '#F1F3F2', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: `${height}%`, background: i === 0 ? '#A8D3BE' : ACCENT }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '22px', fontWeight: 700 }}>{f.count}</span>
                                <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.35 }}>{f.label}</span>
                                <span style={{
                                    fontSize: '12px', fontWeight: 600,
                                    color: i === 0 ? '#6B7280' : dropPct >= 50 ? '#B45309' : '#4B5563',
                                }}>
                                    {i === 0 ? 'Starting point' : prev ? `${dropPct}% dropped off` : '—'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function StepTimes({ times }) {
    return (
        <section style={{ ...styles.card, gap: '16px' }}>
            <SectionTitle title="Average time between steps" sub="Where the process slows down" />
            <div>
                {times.map((t) => (
                    <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #F0F1F0', gap: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#374151' }}>{t.label}</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {t.days === null ? '—' : t.days}{' '}
                            {t.days !== null && <span style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{t.days === 1 ? 'day' : 'days'}</span>}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SizesCard({ sizes }) {
    const max = Math.max(1, ...sizes.packages.map((p) => p.count));

    return (
        <section style={{ ...styles.card, gap: '14px' }}>
            <SectionTitle title="Quoted system sizes" sub="Hybrid systems by inverter package" />
            {sizes.packages.map((p) => (
                <BarRow key={p.kw} label={`${p.kw} kW`} count={p.count} max={max} labelWidth="56px" />
            ))}
            <span style={styles.cardFoot}>
                Average quoted size:{' '}
                <strong style={{ color: '#111827', fontWeight: 600 }}>{sizes.average_kw === null ? '—' : `${sizes.average_kw} kW`}</strong>
            </span>
        </section>
    );
}

function LocationsCard({ places }) {
    const max = Math.max(1, ...places.map((p) => p.count));

    return (
        <section style={{ ...styles.card, gap: '14px' }}>
            <SectionTitle title="Top locations" sub="Where the systems will be installed" />
            {places.length === 0 ? (
                <span style={{ fontSize: '14px', color: '#6B7280' }}>No quotations in this period.</span>
            ) : (
                places.map((p) => <BarRow key={p.name} label={p.name} count={p.count} max={max} labelWidth="150px" />)
            )}
        </section>
    );
}

function SavingsCard({ savings }) {
    const rows = [
        ['Average monthly savings', savings.avg_monthly_savings === null ? '—' : `₱${Math.round(savings.avg_monthly_savings).toLocaleString('en-PH')}`],
        ['Average payback period', savings.avg_payback_years === null ? '—' : `${savings.avg_payback_years} years`],
        ['Average annual return (ROA)', savings.avg_roa_percent === null ? '—' : `${savings.avg_roa_percent}%`],
        ['Entered their own rate (bill + kWh)', savings.own_rate_percent === null ? '—' : `${savings.own_rate_percent}%`],
    ];

    return (
        <section style={{ ...styles.card, gap: '12px' }}>
            <SectionTitle title="Estimated savings of quoted systems" sub={`Across ${savings.count} quotation${savings.count === 1 ? '' : 's'} in this period`} />
            <StatRows rows={rows} />
        </section>
    );
}

function ReviewQueueCard({ queue }) {
    const rows = [
        ['Waiting for review now', String(queue.pending)],
        ['Oldest waiting request', queue.oldest_pending_days === null ? '—' : `${queue.oldest_pending_days} ${queue.oldest_pending_days === 1 ? 'day' : 'days'}`],
        ['Approval rate', queue.approval_rate_percent === null ? '—' : `${queue.approval_rate_percent}%`],
        ['Rejected this period', String(queue.rejected)],
    ];

    return (
        <section style={{ ...styles.card, gap: '12px' }}>
            <SectionTitle title="Review queue" sub="Quotation requests waiting for an admin" />
            <StatRows rows={rows} />
        </section>
    );
}

// ---------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------

function SectionTitle({ title, sub }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{title}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#4B5563', lineHeight: 1.45 }}>{sub}</p>
        </div>
    );
}

function BarRow({ label, count, max, labelWidth }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `${labelWidth} minmax(0, 1fr) 32px`, gap: '10px', alignItems: 'center', fontSize: '14px' }}>
            <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
            <div style={{ height: '10px', borderRadius: '5px', background: '#F1F3F2', display: 'flex' }}>
                <div style={{ height: '10px', borderRadius: '5px', width: `${(count / max) * 100}%`, background: ACCENT }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>{count}</span>
        </div>
    );
}

function StatRows({ rows }) {
    return (
        <div>
            {rows.map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F0F1F0' }}>
                    <span style={{ fontSize: '14px', color: '#374151' }}>{label}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap' }}>{value}</span>
                </div>
            ))}
        </div>
    );
}

function ReportIcons({ busy }) {
    return (
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={styles.reportIconBox}><DocumentIcon size={18} color={ACCENT} /></span>
            <span style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {busy ? 'Preparing…' : <DownloadIcon size={18} color="#4B5563" />}
            </span>
        </span>
    );
}

const styles = {
    page: {
        display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', color: '#111827',
        fontVariantNumeric: 'tabular-nums',
    },
    headerRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' },
    title: { margin: 0, fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' },
    subtitle: { margin: 0, fontSize: '15px', color: '#4B5563' },
    rangeGroup: { display: 'flex', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '10px', padding: '3px', gap: '2px' },
    rangeBtn: {
        height: '36px', padding: '0 14px', borderRadius: '8px', border: 'none', background: 'transparent',
        fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
    },
    rangeBtnActive: { background: ACCENT, color: '#FFFFFF', fontWeight: 600 },
    primaryBtn: {
        height: '44px', padding: '0 18px', borderRadius: '10px', border: 'none', background: ACCENT,
        fontSize: '15px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
    },
    secondaryBtn: {
        padding: '0 16px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF',
        fontSize: '14px', fontWeight: 600, color: '#111827', cursor: 'pointer', fontFamily: 'inherit',
    },
    error: {
        background: colors.dangerTint, color: colors.danger, border: '1px solid #fecaca', borderRadius: '10px',
        padding: '10px 14px', fontSize: '14px',
    },
    loadingCard: {
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '48px',
        textAlign: 'center', color: '#6B7280', fontSize: '15px',
    },
    hero: {
        background: ACCENT, borderRadius: '18px', padding: '28px', color: '#FFFFFF', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '28px',
    },
    groupGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '10px' },
    groupCard: {
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px',
    },
    monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '12px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' },
    kpiCard: {
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px',
    },
    card: {
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px',
        display: 'flex', flexDirection: 'column', minWidth: 0,
    },
    cardFoot: { fontSize: '13px', color: '#4B5563', borderTop: '1px solid #F0F1F0', paddingTop: '12px', marginTop: 'auto' },
    funnelGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '10px' },
    threeUp: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '16px' },
    twoUp: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: '16px' },
    reportGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '12px', marginTop: '16px' },
    reportBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '16px',
        border: '1px solid #E5E7EB', borderRadius: '12px', background: '#FFFFFF', cursor: 'pointer',
        textAlign: 'left', fontFamily: 'inherit',
    },
    reportIconBox: {
        width: '36px', height: '36px', borderRadius: '10px', background: '#EAF3EE', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
    },
    select: {
        width: '100%', height: '38px', borderRadius: '10px', border: '1px solid #D1D5DB', padding: '0 10px',
        fontSize: '13px', fontFamily: 'inherit', background: '#FFFFFF', color: '#111827',
    },
};
