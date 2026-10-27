import { useEffect, useState } from 'react';
import {
    BoltIcon, SunIcon, BatteryIcon, PlugIcon, LocationIcon, DownloadIcon,
} from './Icons';
import { colors, typography, statusColors } from '../styles/theme';

// Customer-facing summary of one quotation request: the price, the savings,
// the system, how the price adds up and where it will be installed.
// Everything comes from the quotation-requests API row (qr).
//   reference   e.g. "#Q-2026-050"
//   submitted   formatted submission date
//   onDownload    set only when the approved PDF can be downloaded
//   onRequestNew  opens the calculator (offered on rejected quotations)
export default function QuotationDetailsModal({ qr, reference, submitted, onDownload, onRequestNew, onClose }) {
    // Mount hidden, then flip to shown on the next painted frame so the
    // open animation has a "from" state (same as the rejection modal)
    const [shown, setShown] = useState(false);
    useEffect(() => {
        let inner;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setShown(true));
        });
        return () => {
            cancelAnimationFrame(outer);
            if (inner) cancelAnimationFrame(inner);
        };
    }, []);

    const close = () => {
        setShown(false);
        setTimeout(onClose, 240);
    };

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            setShown(false);
            setTimeout(onClose, 240);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const d = describe(qr);
    const badge = statusColors[qr.status] || statusColors.draft;
    const rejected = qr.status === 'rejected';

    return (
        <div className={`overlay-fade${shown ? ' overlay-open' : ''}`} style={styles.overlay} onClick={close}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="qd-title"
                className={`modal-pop${shown ? ' modal-open' : ''}`}
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ---------- Header ---------- */}
                <div className="m-pad-sm" style={styles.header}>
                    <div style={{ minWidth: 0 }}>
                        <div style={styles.tagRow}>
                            <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.text }}>
                                {qr.status.charAt(0).toUpperCase() + qr.status.slice(1)}
                            </span>
                            <span style={styles.ref}>{reference}</span>
                        </div>
                        <h3 id="qd-title" style={styles.title}>Your solar quotation</h3>
                        <div style={styles.subtitle}>Submitted {submitted}</div>
                    </div>
                    <button type="button" onClick={close} aria-label="Close" className="m-tap" style={styles.close}>×</button>
                </div>

                <div className="m-pad-sm" style={styles.body}>
                    {/* ---------- Why it was rejected ---------- */}
                    {rejected && (
                        <div style={styles.rejection}>
                            <div style={styles.rejectionTitle}>Why this quotation was rejected</div>
                            <p style={styles.rejectionText}>{qr.notes || 'No reason was given.'}</p>
                            <div style={styles.rejectionMeta}>
                                Reviewed by the TataMawing estimating team · You can request a new quotation anytime.
                            </div>
                        </div>
                    )}

                    {/* ---------- Price and headline savings ---------- */}
                    <div style={styles.hero}>
                        <div>
                            <div style={styles.heroLabel}>{d.approved ? 'Approved total' : 'Estimated total'}</div>
                            <div style={styles.heroPrice}>{peso(d.total)}</div>
                            {!d.approved && (
                                <div style={styles.heroNote}>The final price is confirmed after our team reviews your request.</div>
                            )}
                        </div>
                        {d.hasSavings && (
                            <div style={styles.heroStats}>
                                <HeroStat label="Saves about" value={`${peso(d.monthlySavings, 0)}`} unit="/ month" />
                                <HeroStat label="ROI — pays for itself in" value={d.payback !== null ? num(d.payback, 1) : '—'} unit="years" />
                            </div>
                        )}
                    </div>

                    {/* ---------- Bill before and after ---------- */}
                    {d.hasSavings && d.currentBill !== null && (
                        <Section title="Your electric bill">
                            <BillBar label="Now" amount={d.currentBill} pct={100} color={colors.textMuted} />
                            <BillBar
                                label="With solar"
                                amount={d.newBill ?? 0}
                                pct={d.currentBill > 0 ? ((d.newBill ?? 0) / d.currentBill) * 100 : 0}
                                color={colors.primary}
                            />
                            <p style={styles.hint}>
                                About {Math.round(d.lowerPct)}% lower each month. Fixed charges on your bill and
                                cloudy months can make the real amount a little higher.
                            </p>
                        </Section>
                    )}

                    {/* ---------- The system ---------- */}
                    <Section title="Your system">
                        <div style={styles.tiles}>
                            <Tile
                                icon={<BoltIcon size={18} color={colors.primary} />}
                                label="Inverter"
                                value={d.inverterKw ? `${d.inverterKw} kW hybrid` : '—'}
                                sub={d.inverterBrand}
                            />
                            <Tile
                                icon={<SunIcon size={18} color={colors.primary} />}
                                label="Solar panels"
                                value={d.panelCount ? `${d.panelCount} panels` : '—'}
                                sub={d.arrayKwp ? `610 W each · ${num(d.arrayKwp, 2)} kW total` : null}
                            />
                            <Tile
                                icon={<BatteryIcon size={18} color={colors.primary} />}
                                label="Battery"
                                value={d.batteryAh
                                    ? `${d.batteryQty > 1 ? `${d.batteryQty} × ` : ''}${num(d.batteryAh)} Ah${d.extraBatteryAh ? ` + ${num(d.extraBatteryAh)} Ah` : ''}`
                                    : '—'}
                                sub={d.batteryWh ? `${num(d.batteryWh)} Wh for night use` : null}
                            />
                            <Tile
                                icon={<PlugIcon size={18} color={colors.primary} />}
                                label="Your total load"
                                value={d.totalLoadW !== null ? `${num(d.totalLoadW)} W` : '—'}
                                sub={d.inverterSizeW !== null ? `${num(d.inverterSizeW)} W with safety buffer` : null}
                            />
                        </div>
                    </Section>

                    {/* ---------- Daily energy use ---------- */}
                    {d.dailyWh !== null && (
                        <Section title="Your daily energy use" aside={`${num(d.dailyWh)} Wh / day`}>
                            {d.dayWh !== null && d.nightWh !== null && d.dailyWh > 0 && (
                                <>
                                    <div style={styles.splitBar} aria-hidden="true">
                                        <span style={{ ...styles.splitDay, width: `${(d.dayWh / d.dailyWh) * 100}%` }} />
                                        <span style={{ ...styles.splitNight, width: `${(d.nightWh / d.dailyWh) * 100}%` }} />
                                    </div>
                                    <div style={styles.splitLegend}>
                                        <Legend color={colors.warning} label="Daytime (8 AM – 4 PM)" value={`${num(d.dayWh)} Wh`} note="powered by the panels" />
                                        <Legend color={colors.primary} label="Nighttime (4 PM – 8 AM)" value={`${num(d.nightWh)} Wh`} note="powered by the battery" />
                                    </div>
                                </>
                            )}
                        </Section>
                    )}

                    {/* ---------- How the price adds up ---------- */}
                    {(d.lineItems.length > 0 || d.approved) && (
                        <Section title="How the price adds up">
                            {d.lineItems.map((item) => (
                                <div key={item.key} style={styles.line}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={styles.lineLabel}>{item.label}</div>
                                        <div style={styles.lineQty}>{item.qty} {item.qty_unit} × {peso(item.unit_price)}</div>
                                    </div>
                                    <div style={styles.lineAmount}>{peso(item.amount)}</div>
                                </div>
                            ))}
                            {d.lineItems.length > 0 && (
                                <div style={{ ...styles.line, ...styles.lineTotal }}>
                                    <div>Estimated total</div>
                                    <div>{peso(d.estimate)}</div>
                                </div>
                            )}

                            {d.approved && (
                                <div style={styles.approvedBox}>
                                    <div style={styles.approvedTitle}>Approved by our team</div>
                                    <PriceRow label="System cost" value={peso(qr.quotation.adjusted_cost)} />
                                    <PriceRow label="Labor fee" value={peso(qr.quotation.labor_fee)} />
                                    <PriceRow label="Transportation" value={peso(qr.quotation.transportation_fee)} />
                                    <PriceRow label="Total" value={peso(qr.quotation.total_amount)} strong />
                                </div>
                            )}
                        </Section>
                    )}

                    {/* ---------- Installation site ---------- */}
                    <Section title="Installation site">
                        <div style={styles.site}>
                            <span style={styles.siteIcon}><LocationIcon size={16} color={colors.primary} /></span>
                            <div style={{ minWidth: 0 }}>
                                <div style={styles.siteAddress}>{qr.installation_address || 'Not given'}</div>
                                {qr.site_description && <p style={styles.siteNote}>{qr.site_description}</p>}
                            </div>
                        </div>
                    </Section>
                </div>

                {/* ---------- Footer ---------- */}
                <div className="m-pad-sm" style={styles.footer}>
                    {onDownload && (
                        <button type="button" className="btn-primary" onClick={onDownload} style={styles.primaryBtn}>
                            <DownloadIcon size={15} color="#fff" />
                            Download PDF
                        </button>
                    )}
                    {!onDownload && rejected && onRequestNew && (
                        <button type="button" className="btn-primary" onClick={onRequestNew} style={styles.primaryBtn}>
                            Request a new quotation
                        </button>
                    )}
                    {!onDownload && !rejected && (
                        <span style={styles.footerNote}>The PDF is available once the quotation is approved.</span>
                    )}
                    <button type="button" onClick={close} style={styles.secondaryBtn}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------

const toNumber = (value) => (value === null || value === undefined || value === '' ? null : parseFloat(value));
const peso = (value, digits = 2) => (toNumber(value) === null
    ? '—'
    : '₱' + toNumber(value).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const num = (value, digits = 0) => (toNumber(value) === null
    ? '—'
    : toNumber(value).toLocaleString('en-PH', { maximumFractionDigits: digits }));

// Everything the modal shows, worked out once from the API row
function describe(qr) {
    const c = qr.solar_computation ?? {};
    const approved = Boolean(qr.quotation);
    const estimate = toNumber(c.estimated_cost);
    // Once approved, the approved total replaces the estimate (same as My Quotations)
    const total = approved ? toNumber(qr.quotation.total_amount) : estimate;

    const monthlySavings = toNumber(c.monthly_savings);
    const annualSavings = toNumber(c.annual_savings);
    const newBill = toNumber(c.new_monthly_bill);
    const currentBill = toNumber(c.monthly_bill)
        ?? (newBill !== null && monthlySavings !== null ? newBill + monthlySavings : null);

    // total_load_watts is the older column and actually holds the daily energy (Wh)
    const dayWh = toNumber(c.total_day_wh);
    const nightWh = toNumber(c.total_night_wh);
    const dailyWh = dayWh !== null && nightWh !== null ? dayWh + nightWh : toNumber(c.total_load_watts);

    return {
        approved,
        estimate,
        total,
        hasSavings: monthlySavings !== null,
        monthlySavings,
        currentBill,
        newBill,
        lowerPct: currentBill > 0 && newBill !== null ? ((currentBill - newBill) / currentBill) * 100 : 0,
        payback: annualSavings > 0 && total ? total / annualSavings : null,
        inverterKw: c.package_kw ?? null,
        inverterBrand: c.inverter_brand ?? c.inverter_specification ?? null,
        panelCount: c.panel_count ?? null,
        arrayKwp: toNumber(c.panel_capacity_kw),
        batteryAh: toNumber(c.battery_ah ?? c.battery_capacity_ah),
        // Units of that battery; older quotations have 1
        batteryQty: toNumber(c.battery_qty) ?? 1,
        // A second, smaller battery in the bank (e.g. the 100 Ah in "314 Ah + 100 Ah")
        extraBatteryAh: toNumber(c.extra_battery_ah),
        batteryWh: toNumber(c.battery_wh),
        // Total load and inverter size only exist on newer quotations
        totalLoadW: toNumber(c.total_load_w),
        inverterSizeW: toNumber(c.inverter_size_w),
        dayWh,
        nightWh,
        dailyWh,
        lineItems: c.line_items ?? [],
    };
}

function Section({ title, aside = null, children }) {
    return (
        <section style={styles.section}>
            <div style={styles.sectionHead}>
                <h4 style={styles.sectionTitle}>{title}</h4>
                {aside && <span style={styles.sectionAside}>{aside}</span>}
            </div>
            {children}
        </section>
    );
}

function HeroStat({ label, value, unit }) {
    return (
        <div style={styles.heroStat}>
            <div style={styles.heroStatLabel}>{label}</div>
            <div>
                <span style={styles.heroStatValue}>{value}</span>
                <span style={styles.heroStatUnit}> {unit}</span>
            </div>
        </div>
    );
}

function Tile({ icon, label, value, sub }) {
    return (
        <div style={styles.tile}>
            <span style={styles.tileIcon}>{icon}</span>
            <div style={styles.tileLabel}>{label}</div>
            <div style={styles.tileValue}>{value}</div>
            {sub && <div style={styles.tileSub}>{sub}</div>}
        </div>
    );
}

function BillBar({ label, amount, pct, color }) {
    return (
        <div style={styles.billRow}>
            <span style={styles.billLabel}>{label}</span>
            <div style={styles.billTrack}>
                <span style={{ ...styles.billFill, width: `${Math.max(pct, 1.5)}%`, background: color }} />
            </div>
            <span style={styles.billAmount}>{peso(amount, 0)}</span>
        </div>
    );
}

function Legend({ color, label, value, note }) {
    return (
        <div style={styles.legend}>
            <span style={{ ...styles.legendDot, background: color }} />
            <div>
                <div style={styles.legendLabel}>{label}</div>
                <div style={styles.legendValue}>{value} <span style={styles.legendNote}>· {note}</span></div>
            </div>
        </div>
    );
}

function PriceRow({ label, value, strong = false }) {
    return (
        <div style={{ ...styles.priceRow, ...(strong ? styles.priceRowStrong : {}) }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 300,
    },
    modal: {
        width: '760px', maxWidth: '100%', maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        backgroundColor: colors.bgCard, borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem',
        padding: '1.375rem 1.625rem 1.125rem', borderBottom: `1px solid ${colors.borderLight}`,
    },
    tagRow: { display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' },
    badge: {
        fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
    },
    ref: { fontSize: '0.8rem', fontWeight: 600, color: colors.textMuted },
    title: { ...typography.h2, fontSize: '1.3rem', margin: '0.6rem 0 0' },
    subtitle: { fontSize: '0.8rem', color: colors.textMuted, marginTop: '0.25rem' },
    close: {
        flex: 'none', width: '34px', height: '34px', borderRadius: '9px', border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard, color: colors.textMuted, fontSize: '1.1rem', cursor: 'pointer',
    },
    body: { overflowY: 'auto', padding: '1.25rem 1.625rem 0.5rem' },

    rejection: {
        marginBottom: '1.25rem', padding: '1rem 1.125rem', borderRadius: '12px',
        background: statusColors.rejected.bg, border: `1px solid ${statusColors.rejected.border}`,
    },
    rejectionTitle: { fontSize: '0.9rem', fontWeight: 700, color: statusColors.rejected.text },
    rejectionText: {
        margin: '0.4rem 0 0', fontSize: '0.88rem', lineHeight: 1.55, color: colors.textDark, whiteSpace: 'pre-wrap',
    },
    rejectionMeta: { marginTop: '0.5rem', fontSize: '0.75rem', color: colors.textMuted },

    hero: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap',
        padding: '1.25rem 1.375rem', borderRadius: '14px', background: colors.primary, color: '#fff',
    },
    heroLabel: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#cfe0d7' },
    heroPrice: { fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.2rem' },
    heroNote: { fontSize: '0.75rem', color: '#cfe0d7', marginTop: '0.3rem', maxWidth: '280px', lineHeight: 1.45 },
    heroStats: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    heroStat: {
        padding: '0.7rem 0.9rem', borderRadius: '11px', background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.16)', minWidth: '140px',
    },
    heroStatLabel: { fontSize: '0.72rem', color: '#cfe0d7', marginBottom: '0.15rem' },
    heroStatValue: { fontSize: '1.2rem', fontWeight: 800 },
    heroStatUnit: { fontSize: '0.78rem', color: '#cfe0d7' },

    section: { marginTop: '1.5rem' },
    sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' },
    sectionTitle: { margin: 0, fontSize: '0.95rem', fontWeight: 700, color: colors.textDark },
    sectionAside: { fontSize: '0.85rem', fontWeight: 600, color: colors.textBody },
    hint: { margin: '0.6rem 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: colors.textMuted },

    billRow: { display: 'grid', gridTemplateColumns: '80px 1fr 90px', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0' },
    billLabel: { fontSize: '0.82rem', fontWeight: 600, color: colors.textBody },
    billTrack: { height: '12px', borderRadius: '999px', background: colors.borderLight, overflow: 'hidden' },
    billFill: { display: 'block', height: '100%', borderRadius: '999px' },
    billAmount: { fontSize: '0.88rem', fontWeight: 700, color: colors.textDark, textAlign: 'right' },

    tiles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '0.75rem' },
    tile: {
        padding: '0.9rem', borderRadius: '12px', border: `1px solid ${colors.primaryBorder}`,
        background: colors.primaryTint,
    },
    tileIcon: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px',
        borderRadius: '9px', background: '#fff', border: `1px solid ${colors.primaryBorder}`,
    },
    tileLabel: { fontSize: '0.72rem', fontWeight: 600, color: colors.textMuted, marginTop: '0.6rem' },
    tileValue: { fontSize: '1rem', fontWeight: 700, color: colors.textDark, marginTop: '0.1rem' },
    tileSub: { fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.2rem', lineHeight: 1.4 },

    splitBar: { display: 'flex', height: '14px', borderRadius: '999px', overflow: 'hidden', background: colors.borderLight },
    splitDay: { display: 'block', height: '100%', background: colors.warning },
    splitNight: { display: 'block', height: '100%', background: colors.primary },
    splitLegend: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
    legend: { display: 'flex', gap: '0.6rem', alignItems: 'flex-start' },
    legendDot: { width: '10px', height: '10px', borderRadius: '50%', marginTop: '0.3rem', flex: 'none' },
    legendLabel: { fontSize: '0.78rem', color: colors.textMuted },
    legendValue: { fontSize: '0.9rem', fontWeight: 700, color: colors.textDark },
    legendNote: { fontSize: '0.75rem', fontWeight: 400, color: colors.textMuted },

    line: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
        padding: '0.6rem 0', borderBottom: `1px solid ${colors.borderLight}`,
    },
    lineLabel: { fontSize: '0.88rem', fontWeight: 600, color: colors.textDark },
    lineQty: { fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.1rem' },
    lineAmount: { fontSize: '0.88rem', fontWeight: 600, color: colors.textDark, whiteSpace: 'nowrap' },
    lineTotal: { borderBottom: 'none', fontSize: '0.95rem', fontWeight: 800, color: colors.textDark },
    approvedBox: {
        marginTop: '0.75rem', padding: '0.9rem 1rem', borderRadius: '12px',
        background: colors.primaryTint, border: `1px solid ${colors.primaryBorder}`,
    },
    approvedTitle: { fontSize: '0.8rem', fontWeight: 700, color: colors.primary, marginBottom: '0.4rem' },
    priceRow: {
        display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.3rem 0',
        fontSize: '0.86rem', color: colors.textBody,
    },
    priceRowStrong: {
        marginTop: '0.3rem', paddingTop: '0.55rem', borderTop: `1px solid ${colors.primaryBorder}`,
        fontWeight: 800, color: colors.textDark,
    },

    site: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
    siteIcon: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        width: '32px', height: '32px', borderRadius: '9px', background: colors.primaryTint,
    },
    siteAddress: { fontSize: '0.92rem', fontWeight: 600, color: colors.textDark, paddingTop: '0.35rem' },
    siteNote: {
        margin: '0.4rem 0 0', fontSize: '0.85rem', lineHeight: 1.55, color: colors.textBody, whiteSpace: 'pre-wrap',
    },

    footer: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap',
        padding: '1rem 1.625rem', borderTop: `1px solid ${colors.borderLight}`, background: colors.bgSubtle,
    },
    footerNote: { fontSize: '0.8rem', color: colors.textMuted },
    primaryBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.1rem',
        borderRadius: '10px', border: 'none', background: colors.primary, color: '#fff',
        fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
    },
    secondaryBtn: {
        marginLeft: 'auto', padding: '0.65rem 1.1rem', borderRadius: '10px', border: `1px solid ${colors.border}`,
        background: colors.bgCard, color: colors.textBody, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
    },
};
