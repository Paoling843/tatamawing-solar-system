import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState from '../components/LoadingState';
import { Link } from 'react-router-dom';
import AdminHero, { HeroStrip } from '../components/AdminHero';
import { adminTokens, adminUi } from '../styles/adminTheme';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { DownloadIcon, DocumentIcon } from '../components/Icons';

// =====================================================================
// Detailed Analytics — built from the Analytics design.
// Every number comes from GET /api/admin/analytics?days=N (AnalyticsService
// on the backend). The range buttons change N; the PDF reports use the
// same range.
// =====================================================================

const ACCENT = adminTokens.green;

// compare: what the period is compared with (KPI deltas, banner subtitle)
const RANGES = [
    { days: 7, label: '7 days', long: '7 days', compare: 'previous 7 days' },
    { days: 30, label: '30 days', long: '30 days', compare: 'previous 30 days' },
    { days: 90, label: '90 days', long: '90 days', compare: 'previous 90 days' },
    { days: 365, label: 'Year', long: '12 months', compare: 'year before' },
];

// The three groups the panel asked for, with their chart colours
const GROUPS = [
    { key: 'guest_not_continued', label: 'Guest quotation', short: 'Guest', color: '#F2C14E', note: "Didn't go on to request a quotation" },
    { key: 'guest_signed_in', label: 'Signed in to continue', short: 'Signed in', color: '#FFFFFF', note: 'Started as a guest, then signed in' },
    { key: 'external_requests', label: 'External quotation', short: 'External', color: '#8EC1EE', note: 'Wants an installation based on a quote from elsewhere' },
];

const REPORTS = [
    { key: 'quote-sessions', title: 'Guest vs signed-in quotations', sub: 'Each quote-builder visit and whether the user signed in', file: 'guest-vs-signed-in-quotations.pdf' },
    { key: 'external-requests', title: 'External quotation requests', sub: 'Installation requests based on outside quotations', file: 'external-quotation-requests.pdf' },
    { key: 'quotation-history', title: 'Quotation history', sub: 'All requests and their current status', file: 'quotation-history-report.pdf' },
    { key: 'quotation-material', title: 'Material report', sub: 'Materials needed for each approved project', file: 'quotation-material-report.pdf' },
    { key: 'procurement', title: 'Procurement report', sub: 'Purchase requests sent to suppliers', file: 'procurement-report.pdf' },
];

// ₱3,900,000 → "₱3.9M", ₱595,680 → "₱596K"
function compactPeso(n) {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `₱${Math.round(n / 1_000)}K`;
    return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

// The pill under a KPI and the words after it:
// "Up 150%" from the previous 30 days / "4 more" than the previous 30 days
function delta({ value, previous }, kind, compare) {
    const from = `from the ${compare}`;
    const than = `than the ${compare}`;
    if (kind === 'percent') {
        if (previous === 0) {
            return value > 0
                ? { pill: 'New', rest: `none in the ${compare}`, tone: 'up' }
                : { pill: 'Same', rest: `as the ${compare}`, tone: 'flat' };
        }
        const pct = Math.round(((value - previous) / previous) * 100);
        if (pct === 0) return { pill: 'Same', rest: `as the ${compare}`, tone: 'flat' };
        return { pill: `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}%`, rest: from, tone: pct > 0 ? 'up' : 'down' };
    }
    const diff = value - previous;
    if (diff === 0) return { pill: 'Same', rest: `as the ${compare}`, tone: 'flat' };
    return { pill: `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'}`, rest: than, tone: diff > 0 ? 'up' : 'down' };
}

// "June to September" for the months with no activity at all (null if none)
function quietMonths(monthly, totals) {
    const names = monthly.map((m) => new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' }));
    const empty = names.filter((_, i) => totals[i] === 0);
    if (empty.length === 0) return null;
    if (empty.length === 1) return empty[0];
    // A single run of months reads "June to September"; otherwise list them
    const idx = totals.map((t, i) => (t === 0 ? i : -1)).filter((i) => i >= 0);
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    return contiguous ? `${empty[0]} to ${empty[empty.length - 1]}` : empty.join(', ');
}

// Delta pills under each KPI (each text colour is 4.5:1+ on its background)
const TONE_PILL = {
    up: { background: '#E3F1E8', color: '#1F6B45' },
    down: { background: '#FBE9DD', color: '#8A3A0C' },
    flat: { background: '#EEEFEC', color: '#3A4440' },
};

// "Oct 16 – Nov 14, 2026" for the last `days` days, today included
function rangeLabel(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const md = { month: 'short', day: 'numeric' };
    const startText = start.getFullYear() === end.getFullYear()
        ? start.toLocaleDateString('en-US', md)
        : start.toLocaleDateString('en-US', { ...md, year: 'numeric' });
    return `${startText} – ${end.toLocaleDateString('en-US', { ...md, year: 'numeric' })}`;
}

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
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the analytics. Please try again."));
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
        } catch (err) {
            setError(errorMessage(await readBlobError(err), "Couldn't create the report. Please try again."));
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
                <AdminHero
                    style={{ marginBottom: 0 }}
                    eyebrow={`Reporting period · ${rangeLabel(days)}`}
                    title="Analytics"
                    subtitle={`Quotations, sign-ins and installations, compared with the ${range.compare}`}
                    actions={
                        <>
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
                                <DownloadIcon size={16} color="currentColor" />
                                {downloading === 'summary' ? 'Preparing…' : 'Export PDF'}
                            </button>
                        </>
                    }
                >
                    {data && <ReviewStrip queue={data.review_queue} />}
                </AdminHero>

                {error && <div style={styles.error}>{error}</div>}

                {!data ? (
                    <div style={styles.loadingCard}>
                        {loading ? <LoadingState label="Loading analytics…" /> : 'No analytics data.'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
                        <KpiStrip kpis={data.kpis} compare={range.compare} />
                        <PipelineSection funnel={data.funnel} times={data.step_times} external={data.users.external_requests} />
                        <DemandSection data={data} />

                        <section style={{ ...styles.card, ...styles.panes }}>
                            <SizesPane sizes={data.sizes} />
                            <LocationsPane places={data.locations} />
                            <SavingsPane savings={data.savings} />
                        </section>

                        {/* ----- Reports ----- */}
                        <section style={styles.card}>
                            <div style={{ padding: '20px 24px 12px' }}>
                                <SectionTitle title="Reports" sub="PDF downloads for the selected period" />
                            </div>
                            <ul style={styles.reportList}>
                                {REPORTS.map((r) => (
                                    <li key={r.key} style={styles.reportRow}>
                                        <span style={styles.reportIconBox}><DocumentIcon size={17} color={ACCENT} /></span>
                                        <span style={styles.reportTitle}>{r.title}</span>
                                        <span style={styles.reportNote}>{r.sub}</span>
                                        <button
                                            type="button"
                                            aria-label={`Download ${r.title}`}
                                            onClick={() => downloadReport(r)}
                                            disabled={downloading === r.key}
                                            style={styles.secondaryBtn}
                                        >
                                            <DownloadIcon size={14} color="currentColor" />
                                            {downloading === r.key ? 'Preparing…' : 'Download'}
                                        </button>
                                    </li>
                                ))}

                                {/* Individual quotation: pick one, then download (not period-based) */}
                                <li style={{ ...styles.reportRow, paddingBottom: '16px' }}>
                                    <span style={{ ...styles.reportIconBox, background: '#FBEBC4' }}><DocumentIcon size={17} color="#7A4F00" /></span>
                                    <label htmlFor="pick-quotation" style={styles.reportTitle}>Single quotation</label>
                                    <span style={{ ...styles.reportNote, display: 'flex' }}>
                                        <select
                                            id="pick-quotation"
                                            value={selectedQuotationId}
                                            onChange={(e) => setSelectedQuotationId(e.target.value)}
                                            style={styles.select}
                                        >
                                            <option value="">Choose an approved quotation</option>
                                            {approvedQuotations.map((q) => (
                                                <option key={q.quotation.id} value={q.quotation.id}>
                                                    {q.customer?.user?.name} — #{q.quotation.id}
                                                </option>
                                            ))}
                                        </select>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={downloadQuotation}
                                        disabled={downloading === 'quotation'}
                                        style={styles.greenBtn}
                                    >
                                        <DownloadIcon size={14} color="currentColor" />
                                        {downloading === 'quotation' ? 'Preparing…' : 'Download'}
                                    </button>
                                </li>
                            </ul>
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

// The banner's bottom strip: the review queue in one line
function ReviewStrip({ queue }) {
    const clear = queue.pending === 0;
    const oldest = queue.oldest_pending_days === null
        ? '—'
        : `${queue.oldest_pending_days} ${queue.oldest_pending_days === 1 ? 'day' : 'days'}`;

    return (
        <HeroStrip className="review-strip hero-grid--lead" style={styles.reviewStrip}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clear ? '#A8D5C2' : adminTokens.gold }} />
                {clear ? 'Review queue is clear' : `${queue.pending} waiting for review`}
            </span>
            <span style={styles.reviewItem}>Oldest request <strong style={styles.reviewValue}>{oldest}</strong></span>
            <span style={styles.reviewItem}>
                Approval rate <strong style={styles.reviewValue}>{queue.approval_rate_percent === null ? '—' : `${queue.approval_rate_percent}%`}</strong>
            </span>
            <span style={styles.reviewItem}>Rejected <strong style={styles.reviewValue}>{queue.rejected}</strong></span>
            <Link to="/admin/quotations" style={styles.reviewLink}>View queue →</Link>
        </HeroStrip>
    );
}

function KpiStrip({ kpis, compare }) {
    const cards = [
        { label: 'New quotations', value: String(kpis.quotations_created.value), d: delta(kpis.quotations_created, 'percent', compare) },
        { label: 'Quotations approved', value: String(kpis.approved_projects.value), d: delta(kpis.approved_projects, 'count', compare) },
        // Contract value of approved quotations — the system doesn't track payments
        { label: 'Total value of approved projects', value: compactPeso(kpis.revenue.value), d: delta(kpis.revenue, 'percent', compare) },
        { label: 'Installations finished', value: String(kpis.installations_completed.value), d: delta(kpis.installations_completed, 'count', compare) },
    ];

    return (
        <section aria-label="Key metrics" style={{ ...styles.card, ...styles.kpiGrid }}>
            {cards.map((c) => (
                <div key={c.label} style={styles.kpiCell}>
                    <span style={{ fontSize: '13px', color: adminTokens.muted }}>{c.label}</span>
                    <span style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{c.value}</span>
                    <span style={{ fontSize: '13px', color: adminTokens.muted }}>
                        <span style={{ ...styles.deltaPill, ...TONE_PILL[c.d.tone] }}>{c.d.pill}</span> {c.d.rest}
                    </span>
                </div>
            ))}
        </section>
    );
}

function PipelineSection({ funnel, times, external }) {
    const base = Math.max(1, funnel[0].count);
    const last = funnel[funnel.length - 1].count;
    const madeIt = funnel[0].count > 0 ? Math.round((last / funnel[0].count) * 100) : null;
    // The slowest step gets a label (only when there's more than one to compare)
    const known = times.filter((t) => t.days !== null);
    const slowest = known.length > 1 ? known.reduce((a, b) => (b.days > a.days ? b : a)).key : null;

    return (
        <section style={{ ...styles.card, ...styles.panes }}>
            <div style={{ ...styles.pane, flex: '999 1 620px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <h2 style={styles.h2}>Quotation to installation</h2>
                    {madeIt !== null && (
                        <span style={{ fontSize: '13px', color: adminTokens.muted }}>
                            <strong style={{ color: adminTokens.ink }}>{madeIt}%</strong> made it to installation
                        </span>
                    )}
                </div>
                <p style={{ ...styles.sub, margin: '0 0 16px', maxWidth: '720px' }}>
                    How far this period's quotations got. Newer ones may still be in progress, so switch to 90 days or Year for a fuller view.{' '}
                    {external
                        ? `The ${external} external request${external === 1 ? ' skips' : 's skip'} to scheduling and ${external === 1 ? "isn't" : "aren't"} counted.`
                        : "External requests skip to scheduling and aren't counted."}
                </p>
                <div className="scroll-x">
                    <table style={styles.funnelTable}>
                        <thead>
                            <tr style={styles.funnelHead}>
                                <th scope="col" style={{ ...styles.funnelTh, width: '190px' }}>Step</th>
                                <th scope="col" style={styles.funnelTh}><span style={styles.srOnly}>Progress</span></th>
                                <th scope="col" style={{ ...styles.funnelTh, textAlign: 'right', width: '60px', padding: '0 12px 8px' }}>Count</th>
                                <th scope="col" style={{ ...styles.funnelTh, textAlign: 'right', width: '110px', padding: '0 0 8px 12px' }}>Drop-off</th>
                            </tr>
                        </thead>
                        <tbody>
                            {funnel.map((f, i) => {
                                const prev = i > 0 ? funnel[i - 1].count : null;
                                const dropPct = prev ? Math.round(((prev - f.count) / prev) * 100) : null;
                                const high = dropPct !== null && dropPct >= 50;
                                const width = f.count > 0 ? Math.max(1, Math.round((f.count / base) * 100)) : 0;
                                const fill = i === 0 ? '#A8D5C2' : i === funnel.length - 1 ? '#2E8B5E' : ACCENT;

                                return (
                                    <tr key={f.key}>
                                        <td style={{ ...styles.funnelTd, whiteSpace: 'nowrap' }}>{f.label}</td>
                                        <td style={styles.funnelTd}>
                                            <div style={{ height: '16px', background: '#F0F0EC', borderRadius: '3px' }}>
                                                <div style={{ height: '100%', width: `${width}%`, background: fill, borderRadius: '3px' }} />
                                            </div>
                                        </td>
                                        <td style={{ ...styles.funnelTd, padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{f.count}</td>
                                        <td style={{
                                            ...styles.funnelTd, padding: '10px 0 10px 12px', textAlign: 'right',
                                            color: high ? '#B4410F' : adminTokens.muted, fontWeight: high ? 600 : 400,
                                        }}>
                                            {i === 0 ? 'Starting point' : prev ? `${dropPct}%` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ ...styles.pane, ...styles.paneDivider, flex: '1 1 300px', background: '#F3F8F5' }}>
                <SectionTitle title="Time between steps" sub="Average number of days" />
                <dl style={{ margin: '16px 0 0' }}>
                    {times.map((t) => (
                        <div key={t.key} style={styles.timeRow}>
                            <dt style={{ color: '#3A4440' }}>{t.label}</dt>
                            <dd style={{ margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {t.key === slowest && <span style={styles.slowChip}>Slowest</span>}
                                <span style={{ fontSize: '20px', fontWeight: 700 }}>{t.days === null ? '—' : t.days}</span>
                                {t.days !== null && <span style={{ color: adminTokens.muted }}>{t.days === 1 ? 'day' : 'days'}</span>}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

function DemandSection({ data }) {
    // Which month's tooltip is open (mouse over or keyboard focus)
    const [hover, setHover] = useState(null);

    const counts = GROUPS.map((g) => data.users[g.key]);
    const total = counts.reduce((a, b) => a + b, 0);
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

    // Stacked monthly bars on a rounded-up scale with 3 gridline steps
    const monthTotals = data.monthly.map((m) => GROUPS.reduce((sum, g) => sum + m[g.key], 0));
    const top = Math.max(3, Math.ceil(Math.max(...monthTotals) / 3) * 3);
    const ticks = [top, (top / 3) * 2, top / 3, 0];
    const CHART = 180;
    const px = (v) => (v ? Math.max(3, Math.round((v / top) * CHART)) : 0);
    const quiet = quietMonths(data.monthly, monthTotals);
    const fullName = (m) => new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' });

    return (
        <section style={styles.demand}>
            <div style={{ ...styles.pane, flex: '1 1 320px', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                <h2 style={{ ...styles.h2, color: '#FFFFFF' }}>Who's using the system</h2>
                <p style={{ margin: '4px 0 16px', fontSize: '13px', color: adminTokens.stripText }}>
                    {/* Visits are counted per browser tab, not per person */}
                    {total} quotation{total === 1 ? '' : 's'} and request{total === 1 ? '' : 's'} this period
                </p>
                <div
                    role="img"
                    aria-label={`${GROUPS.map((g, i) => `${counts[i]} ${g.label.toLowerCase()}`).join(', ')}, of ${total}`}
                    style={{ display: 'flex', height: '10px', gap: total ? '2px' : 0, marginBottom: '8px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)' }}
                >
                    {GROUPS.map((g, i) => counts[i] > 0 && (
                        <div key={g.key} style={{ flex: counts[i], background: g.color }} />
                    ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                        {GROUPS.map((g, i) => (
                            <tr key={g.key}>
                                <td style={styles.whoTd}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color, flex: 'none' }} />
                                        {g.label}
                                    </div>
                                    <div style={{ color: adminTokens.stripText, fontSize: '13px', paddingLeft: '18px' }}>{g.note}</div>
                                </td>
                                <td style={{ ...styles.whoTd, paddingLeft: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <strong style={{ fontSize: '18px' }}>{counts[i]}</strong>{' '}
                                    <span style={{ color: adminTokens.stripText, display: 'inline-block', width: '36px' }}>{pct(counts[i])}%</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.users.signed_in_customers > 0 && (
                    <p style={{ margin: '12px 0 0', fontSize: '13px', color: adminTokens.stripText }}>
                        {data.users.signed_in_customers} more customer{data.users.signed_in_customers === 1 ? ' was' : 's were'} already signed in when they made a quotation.
                    </p>
                )}
            </div>

            <div style={{ ...styles.pane, flex: '999 1 520px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px 16px' }}>
                    <div>
                        <h2 style={{ ...styles.h2, color: '#FFFFFF' }}>Monthly activity</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: adminTokens.stripText }}>Last 6 months. Hover over a bar for details.</p>
                    </div>
                    <ul aria-label="Legend" style={styles.legend}>
                        {GROUPS.map((g) => (
                            <li key={g.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color }} />
                                {g.short}
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                    <div aria-hidden="true" style={{ ...styles.yAxis, height: `${CHART}px` }}>
                        {ticks.map((t) => <span key={t}>{Math.round(t)}</span>)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                        <div aria-hidden="true" style={{ ...styles.gridLines, height: `${CHART}px` }}>
                            <div style={styles.gridDashed} /><div style={styles.gridDashed} /><div style={styles.gridDashed} />
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.35)' }} />
                        </div>
                        <div style={styles.monthGrid}>
                            {data.monthly.map((m, i) => {
                                const open = hover === i;
                                const stack = GROUPS.reduce((sum, g) => sum + px(m[g.key]), 0);
                                return (
                                    // A button so keyboard users can open the same tooltip with Tab
                                    <button
                                        key={m.month}
                                        type="button"
                                        aria-label={`${fullName(m)}: ${monthTotals[i]} total, ${GROUPS.map((g) => `${m[g.key]} ${g.short.toLowerCase()}`).join(', ')}`}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                        style={{ ...styles.monthBtn, background: open ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                                    >
                                        <div style={{ height: `${CHART}px`, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            <div style={{ width: '40%', maxWidth: '44px', minWidth: '10px', display: 'flex', flexDirection: 'column-reverse', gap: '2px' }}>
                                                {GROUPS.map((g) => m[g.key] > 0 && (
                                                    <div key={g.key} style={{ height: `${px(m[g.key])}px`, background: g.color, borderRadius: '2px' }} />
                                                ))}
                                            </div>
                                        </div>
                                        <span style={{ marginTop: '8px', fontSize: '13px', color: adminTokens.stripText }}>{m.label}</span>
                                        {open && (
                                            <div role="tooltip" style={{ ...styles.tooltip, bottom: `${30 + stack + 8}px` }}>
                                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>{fullName(m)} · {monthTotals[i]} total</div>
                                                {GROUPS.map((g) => <div key={g.key}>{g.short} {m[g.key]}</div>)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {quiet && <p style={{ margin: '12px 0 0 30px', fontSize: '13px', color: adminTokens.stripText }}>No activity {quiet.includes(" to ") ? "from" : "in"} {quiet}.</p>}
            </div>
        </section>
    );
}

function SizesPane({ sizes }) {
    const max = Math.max(1, ...sizes.packages.map((p) => p.count));

    return (
        <div style={{ ...styles.pane, flex: '1 1 300px' }}>
            <SectionTitle title="Quoted system sizes" sub="Hybrid systems, by inverter size" />
            <div style={styles.barList}>
                {sizes.packages.map((p) => (
                    <BarRow key={p.kw} label={`${p.kw} kW`} count={p.count} max={max} labelWidth="56px" />
                ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: '14px', color: adminTokens.muted }}>
                Average quoted size:{' '}
                <strong style={{ color: adminTokens.ink, fontWeight: 700 }}>
                    {sizes.average_kw === null ? '—' : `${sizes.average_kw} kW`}
                </strong>
            </p>
        </div>
    );
}

function LocationsPane({ places }) {
    const max = Math.max(1, ...places.map((p) => p.count));

    return (
        <div style={{ ...styles.pane, ...styles.paneDivider, flex: '1 1 300px' }}>
            <SectionTitle title="Top locations" sub="Where systems will be installed" />
            <div style={styles.barList}>
                {places.length === 0 ? (
                    <span style={{ fontSize: '14px', color: adminTokens.muted }}>No quotations in this period.</span>
                ) : (
                    places.map((p, i) => (
                        <BarRow key={p.name} label={p.name} count={p.count} max={max} labelWidth="minmax(0, 45%)" fill={i === 0 ? '#E0A82E' : '#A8D5C2'} />
                    ))
                )}
            </div>
        </div>
    );
}

function SavingsPane({ savings }) {
    return (
        <div style={{ ...styles.pane, ...styles.paneDivider, flex: '1 1 300px' }}>
            <SectionTitle title="Estimated customer savings" sub={`Based on ${savings.count} quotation${savings.count === 1 ? '' : 's'} this period`} />
            <dl style={{ margin: '14px 0 0' }}>
                <div style={styles.savingsHighlight}>
                    <dt style={{ color: '#1F4D3A' }}>Average monthly savings</dt>
                    <dd style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: ACCENT }}>
                        {savings.avg_monthly_savings === null ? '—' : `₱${Math.round(savings.avg_monthly_savings).toLocaleString('en-PH')}`}
                    </dd>
                </div>
                <div style={styles.savingsRow}>
                    <dt>Average payback period</dt>
                    <dd style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                        {savings.avg_payback_years === null ? '—' : (
                            <>{savings.avg_payback_years} <span style={{ fontSize: '14px', fontWeight: 400, color: adminTokens.muted }}>years</span></>
                        )}
                    </dd>
                </div>
                <div style={{ ...styles.savingsRow, paddingBottom: 0 }}>
                    <dt>Used their own electricity rate</dt>
                    <dd style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                        {savings.own_rate_percent === null ? '—' : `${savings.own_rate_percent}%`}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

// ---------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------

function SectionTitle({ title, sub }) {
    return (
        <div>
            <h2 style={styles.h2}>{title}</h2>
            <p style={{ ...styles.sub, margin: '4px 0 0' }}>{sub}</p>
        </div>
    );
}

function BarRow({ label, count, max, labelWidth, fill = ACCENT }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `${labelWidth} minmax(0, 1fr) 28px`, gap: '12px', alignItems: 'center', fontSize: '14px' }}>
            <span style={{ color: adminTokens.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
            <div style={{ height: '8px', borderRadius: '4px', background: '#F0F0EC', display: 'flex' }}>
                <div style={{ height: '8px', borderRadius: '4px', width: `${(count / max) * 100}%`, background: fill }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 600, color: count ? adminTokens.ink : adminTokens.faint }}>{count}</span>
        </div>
    );
}

const styles = {
    page: {
        display: 'flex', flexDirection: 'column', gap: '20px', color: adminTokens.ink,
        fontVariantNumeric: 'tabular-nums',
    },
    // On the green banner: translucent outline, white pill for the chosen range
    rangeGroup: {
        display: 'flex', flexWrap: 'wrap', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: adminTokens.radius, padding: '3px', gap: '2px',
    },
    rangeBtn: {
        height: '36px', padding: '0 14px', borderRadius: '4px', border: 'none', background: 'transparent',
        fontSize: '14px', fontWeight: 500, color: '#DDE7E2', cursor: 'pointer', fontFamily: 'inherit',
    },
    rangeBtnActive: { background: '#FFFFFF', color: ACCENT, fontWeight: 700 },
    primaryBtn: {
        height: '42px', padding: '0 16px', borderRadius: adminTokens.radius, border: 'none', background: adminTokens.gold,
        fontSize: '14px', fontWeight: 700, color: '#14261F', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: '6px',
    },
    secondaryBtn: {
        height: '34px', minWidth: '44px', padding: '0 12px', borderRadius: adminTokens.radius, border: '1px solid #D6D6D0',
        background: '#FFFFFF', fontSize: '13px', fontWeight: 600, color: adminTokens.ink, cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
    },
    greenBtn: {
        height: '34px', padding: '0 12px', borderRadius: adminTokens.radius, border: 'none', background: ACCENT,
        fontSize: '13px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: '6px',
    },
    // The page lays its blocks out with a gap, so no bottom margin here
    error: { ...adminUi.errorBanner, marginBottom: 0 },
    loadingCard: { ...adminUi.card, padding: '48px', textAlign: 'center', color: adminTokens.muted, fontSize: '15px' },

    reviewStrip: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 28px', padding: '12px 24px', fontSize: '14px',
    },
    reviewItem: { color: adminTokens.stripText },
    reviewValue: { color: '#FFFFFF', fontWeight: 600 },
    reviewLink: { marginLeft: 'auto', fontWeight: 600, textDecoration: 'none', color: adminTokens.gold },

    card: { ...adminUi.card, minWidth: 0 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', overflow: 'hidden' },
    kpiCell: {
        padding: '18px 20px', borderLeft: `1px solid ${adminTokens.line}`, marginLeft: '-1px',
        display: 'flex', flexDirection: 'column', gap: '6px',
    },
    deltaPill: { fontWeight: 600, borderRadius: '4px', padding: '1px 6px', marginRight: '4px' },

    panes: { display: 'flex', flexWrap: 'wrap', overflow: 'hidden' },
    pane: { minWidth: 0, padding: '20px 24px 24px', boxSizing: 'border-box' },
    // Left border pulled 1px out so it disappears when the pane wraps to the start of a row
    paneDivider: { borderLeft: `1px solid ${adminTokens.line}`, marginLeft: '-1px' },
    h2: { margin: 0, fontSize: '16px', fontWeight: 700, color: adminTokens.ink },
    sub: { fontSize: '13px', color: adminTokens.muted, lineHeight: 1.45 },

    funnelTable: { width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '14px' },
    funnelHead: { color: adminTokens.muted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' },
    funnelTh: { textAlign: 'left', fontWeight: 600, padding: '0 12px 8px 0', borderBottom: `1px solid ${adminTokens.line}` },
    funnelTd: { padding: '10px 12px 10px 0', borderBottom: `1px solid ${adminTokens.rowLine}` },
    srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' },
    timeRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px',
        padding: '12px 0', borderTop: '1px solid #E8E8E3',
    },
    slowChip: { fontSize: '12px', fontWeight: 700, color: '#7A4F00', background: '#FBEBC4', borderRadius: '4px', padding: '1px 6px' },

    demand: {
        background: ACCENT, color: '#FFFFFF', borderRadius: adminTokens.heroRadius,
        display: 'flex', flexWrap: 'wrap', overflow: 'hidden',
    },
    whoTd: { padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.12)', verticalAlign: 'top' },
    legend: {
        listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '14px',
        fontSize: '13px', color: '#E4ECE8',
    },
    yAxis: {
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '12px',
        color: '#A9BDB3', textAlign: 'right', width: '24px', marginTop: '-8px', flexShrink: 0,
    },
    gridLines: { position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    gridDashed: { borderTop: '1px dashed rgba(255,255,255,0.12)' },
    monthGrid: { position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' },
    monthBtn: {
        position: 'relative', height: '210px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'default',
        display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#FFFFFF', fontFamily: 'inherit', minWidth: 0,
    },
    tooltip: {
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 2, background: '#FFFFFF',
        color: adminTokens.ink, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', borderRadius: '4px', padding: '8px 10px',
        fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap', lineHeight: 1.6, pointerEvents: 'none',
    },

    barList: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' },
    savingsHighlight: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px',
        padding: '12px 14px', marginBottom: '8px', background: '#E3F1E8', borderRadius: adminTokens.radius,
    },
    savingsRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px',
        padding: '10px 0', borderTop: `1px solid ${adminTokens.rowLine}`,
    },

    reportList: { listStyle: 'none', margin: 0, padding: 0 },
    reportRow: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
        padding: '12px 24px', borderTop: `1px solid ${adminTokens.rowLine}`,
    },
    reportIconBox: {
        width: '32px', height: '32px', borderRadius: adminTokens.radius, background: '#E3F1E8', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flex: 'none',
    },
    reportTitle: { flex: '0 1 280px', fontWeight: 600 },
    reportNote: { flex: '1 1 240px', color: adminTokens.muted, minWidth: 0 },
    select: {
        height: '34px', flex: '0 1 320px', minWidth: 0, width: '100%', padding: '0 8px', borderRadius: adminTokens.radius,
        border: '1px solid #D6D6D0', background: '#FFFFFF', fontSize: '13px', color: adminTokens.ink, fontFamily: 'inherit',
    },
};
