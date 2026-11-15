import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';
import { useMessagePanel } from '../context/message-panel-context';
import { computeReturn, signedPeso, SYSTEM_LIFE_YEARS } from '../services/solarEngine';

// Customer's list of quotation requests. Each one is a card; opening it shows
// what the system includes, the estimated savings, and whether it pays for
// itself over the system's life.
// Look from the "Customer · My quotations" mockup.

const C = {
    green: '#0F3D2E',
    gold: '#F2C14E',
    good: '#1F6B45',
    goodBar: '#2E8B5E',
    bad: '#B42318',
    ink: '#1B2420',
    body: '#3A4440',
    muted: '#5F6A65',
    subtle: '#7A837E',
    line: '#E3E3DE',
    rowLine: '#EFEFEA',
    tint: '#E3F1E8',
    stripText: '#C3D3CB',
};

// Status colours: the pill on white, and the dot on the green banner
const STATUS = {
    approved: { label: 'Approved', bg: '#E3F1E8', fg: '#1F6B45', darkDot: '#A8D5C2' },
    pending: { label: 'Pending', bg: '#FBEBC4', fg: '#6B4500', darkDot: '#F2C14E' },
    rejected: { label: 'Rejected', bg: '#FBE4E1', fg: '#A3261B', darkDot: '#F08A7E' },
    cancelled: { label: 'Cancelled', bg: '#EEEFEC', fg: '#3A4440', darkDot: '#B9C4BE' },
    draft: { label: 'Draft', bg: '#EEEFEC', fg: '#3A4440', darkDot: '#B9C4BE' },
};

const TABS = [
    { id: 'all', label: 'All', dot: '#FFFFFF' },
    ...['approved', 'pending', 'rejected', 'cancelled'].map((id) => ({ id, label: STATUS[id].label, dot: STATUS[id].darkDot })),
];

// The customer can cancel while it's waiting for review, or after approval
// until the installation starts (the server checks this too)
const canCancel = (qr) => {
    if (qr.status === 'pending') return true;
    const installStatus = qr.quotation?.installation_schedule?.status;
    return qr.status === 'approved' && !['in_progress', 'completed'].includes(installStatus);
};

const peso = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '—';
    return '₱' + parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const number = (value, digits = 2) =>
    parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatDate = (createdAt) =>
    new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
            text: "This quotation is final. Your installation date will show under Installation schedule once it's booked.",
            bg: '#E3F1E8', fg: '#1F4D3A',
        };
    }
    if (qr.status === 'cancelled') {
        return {
            title: 'Cancelled.',
            text: qr.cancellation_reason
                ? `You cancelled this request. Your reason: "${qr.cancellation_reason}"`
                : 'You cancelled this request. You can request a new quotation anytime.',
            bg: '#EEEFEC', fg: '#3A4440',
        };
    }
    if (qr.status === 'rejected') {
        return {
            title: 'Not approved.',
            text: qr.notes || 'Contact us if you would like to revise this request.',
            bg: '#FBE4E1', fg: '#8C1D13',
        };
    }
    if (qr.status === 'pending') {
        return info.slowPayback
            ? {
                title: 'Under review — payback looks unusually long.',
                text: `The estimated payback is longer than the ${SYSTEM_LIFE_YEARS}-year system life. This may change after review; ask us if your load details need updating.`,
                bg: '#FDF6E3', fg: '#6B4500',
            }
            : {
                title: 'Under review.',
                text: 'Our team is checking this quotation. You will be notified once it is approved, usually within 2–3 business days.',
                bg: '#FDF6E3', fg: '#6B4500',
            };
    }
    return { title: 'Draft.', text: 'This request has not been sent yet.', bg: '#EEEFEC', fg: '#3A4440' };
}

export default function CustomerMyQuotationsPage() {
    const navigate = useNavigate();
    const { askAbout } = useMessagePanel();

    const [quotationRequests, setQuotationRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    // The request waiting for "Cancel request" to be confirmed
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [success, setSuccess] = useState('');

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

    const askCancel = (qr) => {
        setError('');
        setSuccess('');
        setCancelReason('');
        setCancelTarget(qr);
    };

    const confirmCancel = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        try {
            const res = await api.post(`/quotation-requests/${cancelTarget.id}/cancel`, {
                reason: cancelReason.trim() || null,
            });
            const updated = res.data.quotation_request;
            setQuotationRequests((list) => list.map((q) => (q.id === updated.id ? updated : q)));
            setSuccess(`${formatQuotationRef(cancelTarget.id, cancelTarget.created_at)} was cancelled.`);
        } catch (err) {
            setError(errorMessage(err, "We couldn't cancel this request. Please try again."));
        } finally {
            setCancelling(false);
            setCancelTarget(null);
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
            <div style={styles.page}>
                {/* ---- Banner, with the status filter along its bottom ---- */}
                <section aria-label="Summary" style={styles.hero}>
                    <div style={styles.heroTop}>
                        <h1 style={styles.heroTitle}>My quotations</h1>
                        <p style={styles.heroSub}>Open a quotation to see what it includes and how much you could save</p>
                    </div>
                    <div role="group" aria-label="Filter by status" style={styles.tiles}>
                        {TABS.map((tab, i) => {
                            const on = statusFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    className="c-tile"
                                    aria-pressed={on}
                                    onClick={() => setStatusFilter(tab.id)}
                                    style={{ ...styles.tile, ...(i ? styles.tileDivider : {}), ...(on ? styles.tileOn : {}) }}
                                >
                                    <span style={{ ...styles.tileLabel, color: on ? '#FFFFFF' : C.stripText }}>
                                        <span aria-hidden="true" style={{ ...styles.tileDot, background: tab.dot }} />
                                        {tab.label}
                                    </span>
                                    <span style={styles.tileCount}>{loading ? '—' : countFor(tab.id)}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {error && <div role="alert" style={styles.error}>{error}</div>}
                {success && <div role="status" style={styles.success}>{success}</div>}

                {loading ? (
                    <div style={styles.card(false)}>
                        <LoadingState label="Loading your quotations..." />
                    </div>
                ) : quotationRequests.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No quotations yet</p>
                        <p style={styles.emptyDesc}>You haven't submitted any quotation requests yet.</p>
                        <button type="button" className="c-btn c-btn-primary" style={{ height: '40px', fontSize: '14px' }} onClick={() => navigate('/quotation/new')}>
                            Request a quotation
                        </button>
                    </div>
                ) : filteredQuotations.length === 0 ? (
                    <div style={styles.emptyState}>No quotations with this status.</div>
                ) : (
                    <ol style={styles.list}>
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
                                onCancel={() => askCancel(qr)}
                            />
                        ))}
                    </ol>
                )}

                <footer style={styles.footer}>
                    <span style={{ flex: 1 }}>© {new Date().getFullYear()} TataMawing Solar. All rights reserved.</span>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                </footer>
            </div>

            <ConfirmDialog
                open={Boolean(cancelTarget)}
                title="Cancel this quotation request?"
                message={cancelTarget?.quotation?.installation_schedule
                    ? 'Your booked installation will be removed too. You can\'t undo this.'
                    : 'We\'ll stop working on it. You can\'t undo this.'}
                confirmLabel={cancelling ? 'Cancelling…' : 'Cancel request'}
                cancelLabel="Keep it"
                danger
                busy={cancelling}
                onConfirm={confirmCancel}
                onCancel={() => setCancelTarget(null)}
            >
                <label style={styles.reasonLabel} htmlFor="cancel-reason">
                    Reason <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="e.g. I found another installer"
                    disabled={cancelling}
                    style={styles.reasonBox}
                />
            </ConfirmDialog>
        </CustomerLayout>
    );
}

function QuotationCard({ qr, expanded, onToggle, onDownload, onAsk, onSchedule, onCancel }) {
    const info = describe(qr);
    const status = STATUS[qr.status] ?? STATUS.draft;
    const paybackColor = info.slowPayback ? C.bad : C.good;
    const paybackText = info.payback !== null ? `${number(info.payback, 1)} years` : '—';
    const kw = qr.solar_computation?.panel_capacity_kw;
    const detailsId = `quotation-${qr.id}-details`;

    return (
        <li style={styles.card(expanded)}>
            <button
                type="button"
                className="c-card-toggle"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={detailsId}
                style={styles.rowButton}
            >
                <span>
                    <span style={styles.reference}>{formatQuotationRef(qr.id, qr.created_at)}</span>
                    <span style={styles.smallMuted}>Requested {formatDate(qr.created_at)}</span>
                </span>
                <span>
                    <span style={styles.smallLabel}>System</span>
                    <span style={{ fontWeight: 600 }}>
                        {systemType(qr.solar_system_type)}{kw ? ` · ${number(kw)} kW` : ''}
                    </span>
                </span>
                <span>
                    <span style={styles.smallLabel}>Total price</span>
                    <span style={{ ...styles.rowPrice, color: qr.status === 'cancelled' ? C.subtle : C.ink }}>{peso(info.total)}</span>
                </span>
                <span style={{ color: C.body }}>
                    {info.hasSavings && (
                        <>
                            Saves <strong>{peso(info.monthlySavings)}</strong>/mo · Payback{' '}
                            <strong style={{ color: paybackColor }}>{paybackText}</strong>
                        </>
                    )}
                </span>
                <span style={styles.rowEnd}>
                    <span style={{ ...styles.badge, background: status.bg, color: status.fg }}>{status.label}</span>
                    <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.body} strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                        style={{ transition: 'transform .15s', transform: `rotate(${expanded ? 180 : 0}deg)`, flex: 'none' }}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </span>
            </button>

            {expanded && (
                <div id={detailsId} style={styles.details}>
                    <Notice {...notice(qr, info)} />

                    {/* Three columns in one box; they stack on narrow screens */}
                    <div style={styles.panels}>
                        <WhatYouGet qr={qr} />
                        {info.hasSavings ? (
                            <>
                                <Savings info={info} />
                                <WorthIt info={info} paybackColor={paybackColor} paybackText={paybackText} />
                            </>
                        ) : (
                            <section style={{ ...styles.panel, ...styles.panelDivider }}>
                                <h3 style={styles.panelTitle}>Your savings</h3>
                                <p style={styles.panelNote}>
                                    This quotation was made before savings estimates were added, so none is available.
                                </p>
                            </section>
                        )}
                    </div>

                    {qr.quotation && (
                        <table style={styles.priceTable}>
                            <caption style={styles.priceCaption}>Price</caption>
                            <tbody>
                                {[
                                    ['Base system cost', qr.quotation.adjusted_cost],
                                    ['Labor fee', qr.quotation.labor_fee],
                                    ['Transportation fee', qr.quotation.transportation_fee],
                                ].map(([label, amount]) => (
                                    <tr key={label}>
                                        <th scope="row" style={styles.priceLabel}>{label}</th>
                                        <td style={styles.priceValue}>{peso(amount)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <th scope="row" style={{ ...styles.priceLabel, ...styles.priceTotalRow, fontWeight: 700, color: C.ink }}>Total</th>
                                    <td style={{ ...styles.priceValue, ...styles.priceTotalRow, fontWeight: 700, fontSize: '16px' }}>
                                        {peso(qr.quotation.total_amount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}

                    <div style={styles.actions}>
                        <div style={styles.actionGroup}>
                            {qr.status === 'approved' && qr.quotation && (
                                <button type="button" className="c-btn c-btn-secondary" onClick={onDownload}>
                                    Download PDF
                                </button>
                            )}
                            <button type="button" className="c-btn c-btn-secondary" onClick={onAsk}>
                                Ask about this quotation
                            </button>
                            {canCancel(qr) && (
                                <button type="button" className="c-btn c-btn-danger" onClick={onCancel}>
                                    Cancel request
                                </button>
                            )}
                        </div>
                        {qr.status === 'approved' && (
                            <button type="button" className="c-btn c-btn-primary" onClick={onSchedule}>
                                View installation schedule →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

function Notice({ title, text, bg, fg }) {
    return (
        <p style={{ ...styles.notice, background: bg, color: fg }}>
            <strong>{title}</strong> {text}
        </p>
    );
}

function WhatYouGet({ qr }) {
    const computation = qr.solar_computation ?? {};
    const rows = [
        ['Solar panels', computation.panel_capacity_kw ? `${number(computation.panel_capacity_kw)} kW` : '—'],
        ['Inverter', computation.inverter_specification || '—'],
        ['Battery storage', computation.battery_capacity_ah
            ? `${computation.battery_qty > 1 ? `${computation.battery_qty} × ` : ''}${number(computation.battery_capacity_ah, 0)} Ah`
                + (computation.extra_battery_ah ? ` + ${number(computation.extra_battery_ah, 0)} Ah` : '')
            : '—'],
    ];
    // total_load_w (watts × qty) only exists on newer quotations
    if (computation.total_load_w != null) rows.push(['Your total load', `${number(computation.total_load_w, 0)} W`]);
    // total_load_watts holds the daily energy (daytime + nighttime Wh)
    if (computation.total_load_watts != null) rows.push(['Daily energy use', `${number(computation.total_load_watts, 0)} Wh`]);

    return (
        <section style={styles.panel}>
            <h3 style={styles.panelTitle}>What you get</h3>
            <p style={styles.panelNote}>Equipment in this quotation</p>
            <dl style={{ margin: 0 }}>
                {rows.map(([label, value]) => <DataRow key={label} label={label} value={value} />)}
            </dl>
        </section>
    );
}

function Savings({ info }) {
    const hasBill = info.currentBill !== null && info.newBill !== null && info.currentBill > 0;
    const newBillPct = hasBill ? Math.round((info.newBill / info.currentBill) * 100) : 0;
    const savePct = hasBill ? Math.round((info.monthlySavings / info.currentBill) * 100) : null;

    return (
        <section style={{ ...styles.panel, ...styles.panelDivider }}>
            <h3 style={styles.panelTitle}>Your savings</h3>
            <p style={styles.panelNote}>
                {info.rate !== null
                    ? `Estimated, at ${peso(info.rate)}/kWh (${info.rateFromBill ? 'from your bill' : 'SORECO rate'})`
                    : 'Estimated'}
            </p>

            {/* Before and after solar, when a bill was entered */}
            {hasBill && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                    <BillBar
                        label={info.billIsAverage ? 'Your bill today (average of 2)' : 'Your bill today'}
                        amount={info.currentBill}
                        pct={100}
                        color="#D6D6D0"
                    />
                    <BillBar label="With solar" amount={info.newBill} pct={newBillPct} color={C.goodBar} />
                </div>
            )}

            <div style={styles.saveTiles}>
                <div style={styles.saveTile}>
                    <div style={styles.saveTileLabel}>Per month</div>
                    <div style={styles.saveTileValue}>{peso(info.monthlySavings)}</div>
                    {savePct !== null && <div style={styles.saveTileLabel}>{savePct}% off your bill</div>}
                </div>
                <div style={styles.saveTile}>
                    <div style={styles.saveTileLabel}>Per year</div>
                    <div style={styles.saveTileValue}>{peso(info.annualSavings)}</div>
                </div>
            </div>
            {!hasBill && (
                <p style={styles.hint}>
                    You didn't enter a bill amount or kWh, so we used the SORECO rate and only show savings.
                </p>
            )}
        </section>
    );
}

function BillBar({ label, amount, pct, color }) {
    return (
        <div>
            <div style={styles.billBarHead}>
                <span style={{ color: C.body }}>{label}</span>
                <strong>{peso(amount)}</strong>
            </div>
            <div style={styles.track} role="img" aria-label={`${label}: ${peso(amount)}`}>
                <div style={{ ...styles.trackFill, width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function WorthIt({ info, paybackColor, paybackText }) {
    const paybackPct = info.payback !== null ? Math.min(100, (info.payback / SYSTEM_LIFE_YEARS) * 100) : 0;
    const net = info.ret?.netGain ?? null;

    return (
        <section style={{ ...styles.panel, ...styles.panelDivider }}>
            <h3 style={styles.panelTitle}>Is it worth it?</h3>
            <p style={styles.panelNote}>Over the system's {SYSTEM_LIFE_YEARS}-year life</p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: info.slowPayback ? C.bad : C.green }}>{paybackText}</span>
                <span style={{ color: C.muted }}>to pay for itself</span>
            </div>
            <div
                role="img"
                aria-label={info.payback !== null ? `Pays for itself in ${number(info.payback, 1)} of ${SYSTEM_LIFE_YEARS} years` : 'Payback not available'}
                style={{ ...styles.track, margin: '8px 0 4px' }}
            >
                <div style={{ ...styles.trackFill, width: `${paybackPct}%`, background: info.slowPayback ? C.bad : C.goodBar }} />
            </div>
            <div style={styles.scale}>
                <span>0 yrs</span>
                <span>{SYSTEM_LIFE_YEARS} yrs</span>
            </div>

            <dl style={{ margin: '10px 0 0' }}>
                <DataRow label={`${SYSTEM_LIFE_YEARS}-year savings`} value={peso(info.ret?.lifetimeSavings)} strong />
                <DataRow
                    label="Net gain after cost"
                    value={net !== null ? signedPeso(net) : '—'}
                    color={net !== null && net < 0 ? C.bad : paybackColor}
                    strong
                />
            </dl>
        </section>
    );
}

function DataRow({ label, value, color, strong }) {
    return (
        <div style={styles.dataRow}>
            <dt style={{ color: C.body }}>{label}</dt>
            <dd style={{ margin: 0, fontWeight: strong ? 700 : 600, textAlign: 'right', color }}>{value}</dd>
        </div>
    );
}

// "hybrid" → "Hybrid", "off-grid" → "Off grid"
function systemType(type) {
    if (!type) return '—';
    const words = type.replace('-', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

const styles = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px' },

    hero: { background: C.green, color: '#FFFFFF', borderRadius: '8px' },
    heroTop: { padding: '22px 24px 20px' },
    heroTitle: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
    heroSub: { margin: '2px 0 0', fontSize: '14px', color: C.stripText },
    tiles: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        borderTop: '1px solid rgba(255,255,255,0.14)', background: '#0B3326',
        borderRadius: '0 0 8px 8px', overflow: 'hidden',
    },
    // marginLeft -1px hides the divider of whichever tile starts a wrapped row
    tile: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2px',
        padding: '14px 18px', marginLeft: '-1px', border: 'none', textAlign: 'left', cursor: 'pointer',
        color: '#FFFFFF', background: 'transparent', fontFamily: 'inherit',
    },
    tileDivider: { borderLeft: '1px solid rgba(255,255,255,0.12)' },
    tileOn: { background: 'rgba(255,255,255,0.1)', boxShadow: `inset 0 -3px 0 ${C.gold}` },
    tileLabel: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', whiteSpace: 'nowrap' },
    tileDot: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' },
    tileCount: { fontSize: '24px', fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' },

    error: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #F0D0CB',
        background: '#FBEAE7', color: '#A4302A', fontSize: '14px',
    },
    success: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #C6E3CF',
        background: '#E3F1E8', color: '#1F6B45', fontSize: '14px', fontWeight: 600,
    },

    list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
    card: (expanded) => ({
        background: '#FFFFFF', border: `1px solid ${expanded ? '#B9D3C5' : C.line}`, borderRadius: '6px', overflow: 'hidden',
    }),
    rowButton: {
        width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        alignItems: 'center', gap: '12px 20px', padding: '14px 20px', border: 'none', background: 'transparent',
        textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: C.ink, fontFamily: 'inherit',
    },
    reference: { display: 'block', fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums' },
    smallMuted: { fontSize: '13px', color: C.muted },
    smallLabel: { display: 'block', fontSize: '12px', color: C.muted },
    rowPrice: { fontWeight: 700, fontSize: '16px', fontVariantNumeric: 'tabular-nums' },
    rowEnd: { display: 'flex', alignItems: 'center', gap: '12px', justifySelf: 'end' },
    badge: {
        display: 'inline-flex', alignItems: 'center', fontSize: '12px', fontWeight: 700,
        borderRadius: '4px', padding: '1px 8px', whiteSpace: 'nowrap',
    },

    details: {
        borderTop: `1px solid ${C.line}`, padding: '18px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: '18px',
    },
    notice: { margin: 0, padding: '10px 14px', borderRadius: '6px', lineHeight: 1.5 },

    panels: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
        border: `1px solid ${C.line}`, borderRadius: '6px', overflow: 'hidden',
    },
    // marginLeft -1px hides the divider of whichever column starts a wrapped row
    panel: { padding: '16px 18px', marginLeft: '-1px', minWidth: 0 },
    panelDivider: { borderLeft: `1px solid ${C.line}` },
    panelTitle: { margin: 0, fontSize: '15px', fontWeight: 700, color: C.ink },
    panelNote: { margin: '2px 0 10px', fontSize: '13px', color: C.muted },
    dataRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderTop: `1px solid ${C.rowLine}` },
    hint: { margin: '10px 0 0', fontSize: '13px', color: C.muted, lineHeight: 1.45 },
    billBarHead: { display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', marginBottom: '4px' },
    track: { height: '8px', borderRadius: '4px', background: '#F0F0EC', overflow: 'hidden' },
    trackFill: { height: '100%', borderRadius: '4px' },
    scale: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.subtle },
    saveTiles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: '8px' },
    saveTile: { background: C.tint, borderRadius: '6px', padding: '10px 12px', minWidth: 0 },
    saveTileLabel: { fontSize: '12px', color: '#1F4D3A' },
    saveTileValue: { fontSize: '20px', fontWeight: 700, color: C.green, overflowWrap: 'anywhere' },

    priceTable: { width: '100%', maxWidth: '460px', borderCollapse: 'collapse' },
    priceCaption: { textAlign: 'left', fontSize: '15px', fontWeight: 700, paddingBottom: '6px', color: C.ink },
    priceLabel: { textAlign: 'left', fontWeight: 400, color: C.body, padding: '7px 0', borderTop: `1px solid ${C.rowLine}` },
    priceValue: { textAlign: 'right', padding: '7px 0', borderTop: `1px solid ${C.rowLine}`, fontVariantNumeric: 'tabular-nums' },
    priceTotalRow: { padding: '9px 0', borderTop: '1px solid #D6D6D0' },

    actions: {
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px',
        paddingTop: '16px', borderTop: `1px solid ${C.line}`,
    },
    actionGroup: { display: 'flex', flexWrap: 'wrap', gap: '8px' },

    reasonLabel: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' },
    reasonBox: {
        width: '100%', boxSizing: 'border-box', border: '1px solid #D6D6D0', borderRadius: '6px',
        padding: '10px 12px', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1.25rem',
    },
    emptyState: {
        background: '#FFFFFF', border: '1px dashed #D6D6D0', borderRadius: '6px', padding: '40px 20px',
        textAlign: 'center', color: C.muted,
    },
    emptyTitle: { fontSize: '16px', fontWeight: 700, color: C.ink, margin: '0 0 6px' },
    emptyDesc: { margin: '0 0 18px' },
    footer: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 0 0', fontSize: '13px', color: C.muted },
    footerLink: { color: C.muted },
};
