import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';
import { useMessagePanel } from '../context/message-panel-context';
import { computeReturn, signedPeso, SYSTEM_LIFE_YEARS } from '../services/solarEngine';

// Customer's list of quotation requests. Each one is a card; opening it shows
// what the system includes, the estimated bill before/after solar, and
// whether it pays for itself over the system's life.
// Look from "My Quotations.html".

const C = {
    green: '#1f5a3d',
    greenSoft: '#eef6f0',
    greenText: '#3d6b51',
    good: '#2f7a52',
    bad: '#b42318',
    ink: '#17201b',
    body: '#3d4741',
    muted: '#5f6a63',
    sub: '#6b756f',
    border: '#e6e9e6',
    rowLine: '#f0f2f0',
    track: '#eef0ee',
};

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'approved', label: 'Approved' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
];

const STATUS = {
    pending: { label: 'PENDING', bg: '#fdf3d7', fg: '#8a6100' },
    approved: { label: 'APPROVED', bg: '#e3f4e8', fg: '#1c7a3e' },
    rejected: { label: 'REJECTED', bg: '#fde5e3', fg: '#b42318' },
    draft: { label: 'DRAFT', bg: '#f1f3f1', fg: '#4b554f' },
};

const peso = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '—';
    return '₱' + parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const number = (value, digits = 2) =>
    parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatDate = (createdAt) =>
    new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const toNumberOrNull = (value) => (value === null || value === undefined ? null : parseFloat(value));

// Everything the card needs, worked out once from the API row
function describe(qr) {
    const computation = qr.solar_computation ?? {};
    // Once approved, the approved total replaces the estimate
    const total = toNumberOrNull(qr.quotation?.total_amount ?? computation.estimated_cost);
    const monthlySavings = toNumberOrNull(computation.monthly_savings);
    const annualSavings = toNumberOrNull(computation.annual_savings);
    const newBill = toNumberOrNull(computation.new_monthly_bill);
    const currentBill = toNumberOrNull(computation.monthly_bill)
        ?? (newBill !== null && monthlySavings !== null ? newBill + monthlySavings : null);

    const hasSavings = monthlySavings !== null && annualSavings !== null;
    const payback = hasSavings && annualSavings > 0 && total ? total / annualSavings : null;
    const ret = hasSavings && total ? computeReturn(annualSavings, total) : null;

    return {
        total,
        monthlySavings,
        annualSavings,
        currentBill,
        newBill,
        // Two bills entered → monthly_bill is their average
        billIsAverage: (qr.electricity_bills ?? []).filter((bill) => parseFloat(bill.amount) > 0).length > 1,
        rate: toNumberOrNull(computation.electricity_rate),
        rateFromBill: computation.rate_source === 'bill',
        hasSavings,
        payback,
        // Takes longer than the system lasts — shown in red
        slowPayback: payback !== null && payback > SYSTEM_LIFE_YEARS,
        ret,
    };
}

// The coloured note at the top of an opened card
function notice(qr, info) {
    if (qr.status === 'approved') {
        return {
            title: 'Approved.',
            text: 'This quotation is final. Your installation date will appear under Installation Schedule once it is booked.',
            bg: '#e8f4ec', fg: '#1c5a35',
        };
    }
    if (qr.status === 'rejected') {
        return {
            title: 'Not approved.',
            text: qr.notes || 'Contact us if you would like to revise this request.',
            bg: '#fdeceb', fg: '#8c1d13',
        };
    }
    if (qr.status === 'pending') {
        return info.slowPayback
            ? {
                title: 'Under review — payback looks unusually long.',
                text: `The estimated payback is longer than the ${SYSTEM_LIFE_YEARS}-year system life. This may change after review; ask us if your load details need updating.`,
                bg: '#fdf6e3', fg: '#6b4c00',
            }
            : {
                title: 'Under review.',
                text: 'Our team is checking this quotation. You will be notified once it is approved, usually within 2–3 business days.',
                bg: '#fdf6e3', fg: '#6b4c00',
            };
    }
    return { title: 'Draft.', text: 'This request has not been sent yet.', bg: '#f1f3f1', fg: '#4b554f' };
}

export default function CustomerMyQuotationsPage() {
    const navigate = useNavigate();
    const { askAbout } = useMessagePanel();

    const [quotationRequests, setQuotationRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/quotation-requests');
            setQuotationRequests(res.data);
            // Open the newest one so its details are visible straight away
            setExpandedId((current) => current ?? res.data[0]?.id ?? null);
        } catch (err) {
            setError(errorMessage(err, "We couldn't load your quotations. Please try again."));
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
        } catch (err) {
            setError(errorMessage(await readBlobError(err), "We couldn't download your quotation PDF. Please try again."));
        }
    };

    const countFor = (tab) => (tab === 'all'
        ? quotationRequests.length
        : quotationRequests.filter((q) => q.status === tab).length);

    const filteredQuotations = statusFilter === 'all'
        ? quotationRequests
        : quotationRequests.filter((q) => q.status === statusFilter);

    return (
        <CustomerLayout active="My Quotations">
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>My Quotations</h1>
                    <p style={styles.pageLead}>
                        Select a quotation to see what it includes and how much you could save.
                    </p>
                </div>

                <div style={styles.filterTabs}>
                    {TABS.map((tab) => {
                        const active = statusFilter === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setStatusFilter(tab.id)} style={styles.filterTab(active)}>
                                {tab.label}
                                <span style={styles.tabCount(active)}>{countFor(tab.id)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {loading ? (
                <div style={styles.card(false)}>
                    <LoadingState label="Loading your quotations..." />
                </div>
            ) : quotationRequests.length === 0 ? (
                <div className="m-pad" style={styles.emptyState}>
                    <p style={styles.emptyTitle}>No quotations yet</p>
                    <p style={styles.emptyDesc}>You haven't submitted any quotation requests yet.</p>
                    <button className="btn-primary" style={styles.primaryButton} onClick={() => navigate('/quotation/new')}>
                        Request a Quotation
                    </button>
                </div>
            ) : filteredQuotations.length === 0 ? (
                <div className="m-pad" style={styles.emptyState}>No quotations in this category yet.</div>
            ) : (
                <div style={styles.list}>
                    {filteredQuotations.map((qr) => (
                        <QuotationCard
                            key={qr.id}
                            qr={qr}
                            expanded={expandedId === qr.id}
                            onToggle={() => setExpandedId(expandedId === qr.id ? null : qr.id)}
                            onDownload={() => handleDownload(qr.quotation.id)}
                            onAsk={() => askAbout({
                                id: qr.id,
                                reference: formatQuotationRef(qr.id, qr.created_at),
                                label: `${systemType(qr.solar_system_type)} · ${peso(describe(qr).total)}`,
                            })}
                            onSchedule={() => navigate('/customer/schedule')}
                        />
                    ))}
                </div>
            )}

            <Footer />
        </CustomerLayout>
    );
}

function QuotationCard({ qr, expanded, onToggle, onDownload, onAsk, onSchedule }) {
    const info = describe(qr);
    const status = STATUS[qr.status] ?? STATUS.draft;
    const paybackColor = info.slowPayback ? C.bad : C.good;
    const paybackText = info.payback !== null ? `${number(info.payback, 1)} years` : '—';

    return (
        <div style={styles.card(expanded)}>
            <button className="mq-row-toggle" onClick={onToggle} aria-expanded={expanded} style={styles.rowButton}>
                <div>
                    <div style={styles.reference}>{formatQuotationRef(qr.id, qr.created_at)}</div>
                    <div style={styles.smallMuted}>Requested {formatDate(qr.created_at)}</div>
                </div>
                <div>
                    <div style={styles.smallLabel}>System</div>
                    <div style={styles.rowValue}>{systemType(qr.solar_system_type)}</div>
                </div>
                <div>
                    <div style={styles.smallLabel}>Total price</div>
                    <div style={styles.rowPrice}>{peso(info.total)}</div>
                </div>
                <div style={styles.rowSummary}>
                    {info.hasSavings && (
                        <>
                            Saves <strong>{peso(info.monthlySavings)}</strong>/mo · Payback{' '}
                            <strong style={{ color: paybackColor }}>{paybackText}</strong>
                        </>
                    )}
                </div>
                <div style={styles.rowEnd}>
                    <span style={styles.statusBadge(status)}>{status.label}</span>
                    <span style={styles.chevron(expanded)} aria-hidden="true">▼</span>
                </div>
            </button>

            {expanded && (
                <div className="m-pad" style={styles.details}>
                    <Notice {...notice(qr, info)} />

                    <div style={styles.sections}>
                        <WhatYouGet qr={qr} />
                        {info.hasSavings ? (
                            <>
                                <MonthlyBill info={info} />
                                <WorthIt info={info} paybackColor={paybackColor} paybackText={paybackText} />
                            </>
                        ) : (
                            <section className="m-pad" style={styles.section}>
                                <h3 style={styles.sectionTitle}>Savings estimate</h3>
                                <p style={styles.sectionNote}>
                                    This quotation was made before savings estimates were added, so none is available.
                                </p>
                            </section>
                        )}
                    </div>

                    <div style={styles.actions}>
                        <div style={styles.actionGroup}>
                            {qr.status === 'approved' && qr.quotation && (
                                <button className="btn-secondary" onClick={onDownload} style={styles.secondaryButton}>
                                    Download PDF
                                </button>
                            )}
                            <button className="btn-secondary" onClick={onAsk} style={styles.secondaryButton}>
                                Ask about this quote
                            </button>
                        </div>
                        {qr.status === 'approved' && (
                            <button className="btn-primary" onClick={onSchedule} style={styles.primaryButton}>
                                View installation schedule →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Notice({ title, text, bg, fg }) {
    return (
        <div style={{ ...styles.notice, background: bg, color: fg }}>
            <strong>{title}</strong>
            <span>{text}</span>
        </div>
    );
}

function WhatYouGet({ qr }) {
    const computation = qr.solar_computation ?? {};
    const rows = [
        ['Solar panels', computation.panel_capacity_kw ? `${number(computation.panel_capacity_kw)} kW` : '—'],
        ['Inverter', computation.inverter_specification || '—'],
        ['Battery storage', computation.battery_capacity_ah
            ? `${computation.battery_qty > 1 ? `${computation.battery_qty} × ` : ''}${number(computation.battery_capacity_ah)} Ah`
                + (computation.extra_battery_ah ? ` + ${number(computation.extra_battery_ah)} Ah` : '')
            : '—'],
    ];
    // total_load_w (watts × qty) only exists on newer quotations
    if (computation.total_load_w != null) rows.push(['Your total load', `${number(computation.total_load_w)} W`]);
    // total_load_watts holds the daily energy (daytime + nighttime Wh)
    if (computation.total_load_watts != null) rows.push(['Daily energy use', `${number(computation.total_load_watts)} Wh`]);

    return (
        <section className="m-pad" style={styles.section}>
            <h3 style={styles.sectionTitle}>What you get</h3>
            <p style={styles.sectionNote}>Equipment included in this quote</p>
            {rows.map(([label, value], i) => (
                <DataRow key={label} label={label} value={value} last={i === rows.length - 1} />
            ))}
            <p style={styles.hint}>
                kW = how much power the panels can produce. Ah = how much energy the battery can store for
                night use or outages.
            </p>

            {qr.quotation && (
                <div style={styles.breakdown}>
                    <div style={styles.breakdownTitle}>Price breakdown</div>
                    <DataRow label="Base system cost" value={peso(qr.quotation.adjusted_cost)} />
                    <DataRow label="Labor fee" value={peso(qr.quotation.labor_fee)} />
                    <DataRow label="Transportation fee" value={peso(qr.quotation.transportation_fee)} />
                    <DataRow label="Total" value={peso(qr.quotation.total_amount)} last />
                </div>
            )}
        </section>
    );
}

function MonthlyBill({ info }) {
    const hasBill = info.currentBill !== null && info.newBill !== null && info.currentBill > 0;
    const newBillPct = hasBill ? Math.round((info.newBill / info.currentBill) * 100) : 0;
    const savePct = hasBill ? Math.round((info.monthlySavings / info.currentBill) * 100) : null;

    return (
        <section className="m-pad" style={styles.section}>
            <h3 style={styles.sectionTitle}>Your monthly bill</h3>
            <p style={styles.sectionNote}>Estimated, before and after solar</p>

            {hasBill ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <BillBar
                        label={info.billIsAverage ? 'Today (average of your 2 bills)' : 'Today'}
                        amount={info.currentBill}
                        pct={100}
                        color="#d9ddd9"
                    />
                    <BillBar label="With solar" amount={info.newBill} pct={newBillPct} color={C.good} />
                </div>
            ) : (
                <p style={{ ...styles.hint, marginTop: 0 }}>
                    No bill amount was entered with this request, so only the savings are shown.
                </p>
            )}

            <div style={styles.saveTiles}>
                <div style={styles.saveTile}>
                    <div style={styles.saveTileLabel}>You save / month</div>
                    <div style={styles.saveTileValue}>{peso(info.monthlySavings)}</div>
                    {savePct !== null && <div style={styles.saveTileLabel}>{savePct}% off your bill</div>}
                </div>
                <div style={styles.saveTile}>
                    <div style={styles.saveTileLabel}>You save / year</div>
                    <div style={styles.saveTileValue}>{peso(info.annualSavings)}</div>
                </div>
            </div>
            {info.rate !== null && (
                <p style={styles.hint}>
                    Based on {peso(info.rate)}/kWh
                    {info.rateFromBill ? ', worked out from your bill.' : ', SORECO’s rate (no kWh was entered).'}
                </p>
            )}
        </section>
    );
}

function BillBar({ label, amount, pct, color }) {
    return (
        <div>
            <div style={styles.billBarHead}>
                <span style={{ color: C.muted }}>{label}</span>
                <strong>{peso(amount)}</strong>
            </div>
            <div style={styles.track}>
                <div style={{ ...styles.trackFill, width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function WorthIt({ info, paybackColor, paybackText }) {
    const paybackPct = info.payback !== null ? Math.min(100, (info.payback / SYSTEM_LIFE_YEARS) * 100) : 0;
    const net = info.ret?.netGain ?? null;

    return (
        <section className="m-pad" style={styles.section}>
            <h3 style={styles.sectionTitle}>Is it worth it?</h3>
            <p style={styles.sectionNote}>Over the {SYSTEM_LIFE_YEARS}-year system life</p>

            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '6px' }}>ROI — pays for itself in</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: paybackColor }}>{paybackText}</div>
            <div style={{ ...styles.track, margin: '12px 0 6px' }}>
                <div style={{ ...styles.trackFill, width: `${paybackPct}%`, background: paybackColor }} />
            </div>
            <div style={styles.scale}>
                <span>0 yrs</span>
                <span>{SYSTEM_LIFE_YEARS} yrs</span>
            </div>

            <div style={{ marginTop: '14px' }}>
                <DataRow label={`${SYSTEM_LIFE_YEARS}-year savings`} value={peso(info.ret?.lifetimeSavings)} />
                <DataRow
                    label="Net gain after cost"
                    value={net !== null ? signedPeso(net) : '—'}
                    color={net !== null && net < 0 ? C.bad : '#1c7a3e'}
                />
                <DataRow
                    label="Annual return (ROA)"
                    value={info.ret?.roaPercent != null ? `${number(info.ret.roaPercent, 1)}%` : '—'}
                    last
                />
            </div>
            <p style={styles.hint}>
                Net gain = {SYSTEM_LIFE_YEARS}-year savings minus the total price. A positive number means the
                system earns back more than it costs.
            </p>
        </section>
    );
}

function DataRow({ label, value, color, last }) {
    return (
        <div style={{ ...styles.dataRow, borderBottom: last ? 'none' : `1px solid ${C.rowLine}` }}>
            <span style={{ color: C.muted }}>{label}</span>
            <strong style={{ textAlign: 'right', color }}>{value}</strong>
        </div>
    );
}

// "hybrid" → "Hybrid", "off-grid" → "Off grid"
function systemType(type) {
    if (!type) return '—';
    const words = type.replace('-', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

// Shared page footer — declared at module scope so React sees the same
// component type on every render
function Footer() {
    return (
        <div style={styles.footer}>
            <span>
                © {new Date().getFullYear()} TataMawing Solar. All rights reserved. ·{' '}
                <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link> ·{' '}
                <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
            </span>
        </div>
    );
}

const styles = {
    pageHeader: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '20px', marginBottom: '24px',
    },
    pageTitle: { margin: 0, fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 700, letterSpacing: '-0.02em', color: C.ink },
    pageLead: { margin: '6px 0 0', color: C.muted, fontSize: '15px' },
    filterTabs: {
        display: 'flex', flexWrap: 'wrap', gap: '4px', background: '#fff', border: `1px solid ${C.border}`,
        borderRadius: '10px', padding: '4px',
    },
    filterTab: (active) => ({
        border: 0, borderRadius: '7px', padding: '8px 14px', fontSize: '14px', cursor: 'pointer',
        display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'inherit',
        background: active ? C.green : 'transparent', color: active ? '#fff' : '#4b554f',
        fontWeight: active ? 600 : 500,
    }),
    tabCount: (active) => ({
        fontSize: '12px', padding: '1px 7px', borderRadius: '99px',
        background: active ? 'rgba(255,255,255,.2)' : C.track,
    }),
    error: {
        backgroundColor: '#fef2f2', color: '#b42318', padding: '12px', borderRadius: '8px',
        marginBottom: '16px', fontSize: '14px',
    },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    card: (expanded) => ({
        background: '#fff', border: `1px solid ${expanded ? '#bcd3c3' : C.border}`, borderRadius: '14px',
        overflow: 'hidden',
    }),
    rowButton: {
        width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexWrap: 'wrap', gap: '12px 28px', alignItems: 'center', padding: '20px 24px',
        fontFamily: 'inherit', color: C.ink,
    },
    reference: { fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
    smallMuted: { fontSize: '13px', color: C.sub, marginTop: '3px' },
    smallLabel: { fontSize: '12px', color: C.sub },
    rowValue: { fontWeight: 600, fontSize: '15px' },
    rowPrice: { fontWeight: 700, fontSize: '17px' },
    rowSummary: { flex: '1 1 220px', minWidth: 0, fontSize: '14px', color: C.body },
    rowEnd: { display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, marginLeft: 'auto' },
    statusBadge: (status) => ({
        fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '5px 10px', borderRadius: '99px',
        background: status.bg, color: status.fg,
    }),
    chevron: (expanded) => ({
        width: '28px', height: '28px', borderRadius: '50%', background: '#f1f3f1', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#4b554f',
        transform: `rotate(${expanded ? 180 : 0}deg)`, transition: 'transform .2s',
    }),
    details: {
        borderTop: '1px solid #eef0ee', padding: '24px', background: '#fbfcfb',
        display: 'flex', flexDirection: 'column', gap: '20px',
    },
    notice: {
        display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center', padding: '14px 16px',
        borderRadius: '10px', fontSize: '14px', lineHeight: 1.5,
    },
    sections: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px' },
    section: { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', minWidth: 0 },
    sectionTitle: { margin: '0 0 4px', fontSize: '15px', color: C.ink },
    sectionNote: { margin: '0 0 16px', fontSize: '13px', color: C.sub },
    dataRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', fontSize: '14px', color: C.ink },
    hint: { margin: '12px 0 0', fontSize: '12px', color: C.sub, lineHeight: 1.5 },
    breakdown: { marginTop: '18px', paddingTop: '14px', borderTop: `1px solid ${C.border}` },
    breakdownTitle: { fontSize: '13px', fontWeight: 600, color: C.ink, marginBottom: '2px' },
    billBarHead: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: C.ink },
    track: { height: '10px', borderRadius: '99px', background: C.track, overflow: 'hidden' },
    trackFill: { height: '10px', borderRadius: '99px' },
    scale: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b756f' },
    // Side by side when there's room, stacked on narrow phones
    saveTiles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '10px', marginTop: '18px' },
    saveTile: { background: C.greenSoft, borderRadius: '10px', padding: '12px', minWidth: 0 },
    saveTileLabel: { fontSize: '12px', color: C.greenText },
    saveTileValue: { fontSize: '20px', fontWeight: 700, color: C.green, overflowWrap: 'anywhere' },
    actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' },
    actionGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    secondaryButton: {
        height: '42px', padding: '0 16px', border: '1px solid #d9ddd9', borderRadius: '9px', background: '#fff',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: C.ink, fontFamily: 'inherit',
    },
    primaryButton: {
        height: '42px', padding: '0 18px', border: 0, borderRadius: '9px', background: C.green, color: '#fff',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    },
    emptyState: {
        background: '#fff', border: '1px dashed #d9ddd9', borderRadius: '14px', padding: '48px',
        textAlign: 'center', color: C.muted, fontSize: '15px',
    },
    emptyTitle: { fontSize: '16px', fontWeight: 600, color: C.ink, margin: '0 0 8px' },
    emptyDesc: { fontSize: '14px', color: C.muted, margin: '0 0 24px' },
    footer: {
        marginTop: '48px', paddingTop: '20px', borderTop: `1px solid ${C.border}`, display: 'flex',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: C.sub,
    },
    footerLink: { color: C.sub, textDecoration: 'none' },
};
