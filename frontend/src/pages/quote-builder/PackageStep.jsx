import {
    PACKAGES, BATTERIES, PANEL_WATTS,
    arrayKwp, batteryBank, bankWh, bankLabel, panelOptions, panelsForInverterSize,
    formatWhole, formatDecimal, peso, recommendationReason,
} from '../../services/solarEngine';
import { C, NUM, SANS, COST_RAMP, s } from './engineStyles';
import SavingsCard from './SavingsCard';
import { smallGreenButton } from '../../styles/theme';
import {
    BoltIcon, SunIcon, WrenchIcon, GridIcon, ShieldIcon, BatteryIcon,
} from '../../components/Icons';

// STEP 3 — the recommended package. The customer can:
//   - move the inverter UP from the recommended package (never below)
//   - pick a panel count inside the chosen package's range
//   - pick any battery (up or down)
// Every change updates the itemized quote immediately.
export default function PackageStep({
    load, selection, quote, savings, selectedCost, submitting, submitError, resumeNotice, onSwitchAccount,
    onPickPackage, onPanelsChange, onPickBattery, onSelectCost, onBack, onRequestQuote,
}) {
    const {
        pkg, pkgIndex, recommendedPkgIndex, recommendedPanels, panels,
        batteryIndex, batteryLabel, batteryWhTotal, recommendedBatteryIndex, recommendedBank, recommendedBatteryLabel,
    } = selection;
    const largest = PACKAGES[PACKAGES.length - 1];
    const exceedsMax = load.inverterSize > largest.watts;
    // The whole battery bank (e.g. 314 Ah + 100 Ah when the night needs it)
    const usableWh = batteryWhTotal;
    const recommendedIsBank = recommendedBank.qty > 1 || recommendedBank.extra !== null;

    // Inverter size ÷ 610 W before it's kept inside the package's panel range
    const sizedPanels = panelsForInverterSize(load.inverterSize);
    const panelNote = sizedPanels < recommendedPanels
        ? `, raised to the ${pkg.kw} kW minimum`
        : sizedPanels > recommendedPanels ? `, capped at the ${pkg.kw} kW maximum` : '';

    // Biggest cost first, so the bar colours, band widths and the list below
    // all read in the same order.
    const ranked = [...quote.items]
        .sort((a, b) => b.amount - a.amount)
        .map((item, n) => ({ ...item, color: COST_RAMP[n % COST_RAMP.length] }));

    // Clicking a band highlights its cost line and scrolls it into view.
    // Clicking the same band again clears the highlight.
    const pickCost = (key) => {
        const next = selectedCost === key ? null : key;
        onSelectCost(next);
        if (next) {
            document.getElementById(`cost-row-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const summary = [
        { k: 'Inverter', v: `${pkg.kw} kW hybrid` },
        { k: 'Panels', v: `${panels} × 610 W` },
        { k: 'Array size', v: `${formatDecimal(arrayKwp(panels))} kWp` },
        { k: 'Battery', v: `${batteryLabel} @ 51.2 V` },
        { k: 'Usable storage', v: `${formatDecimal(usableWh)} Wh` },
        { k: 'Inverter size', v: `${formatWhole(load.inverterSize)} W` },
        { k: 'Estimated total', v: peso(quote.total) },
        { k: 'Monthly savings', v: peso(savings.monthlySavings) },
        { k: 'Annual ROA', v: savings.roaPercent !== null ? `${formatDecimal(Math.round(savings.roaPercent * 10) / 10)}%` : '—' },
    ];

    const checks = [
        { ok: usableWh >= load.night, title: 'Nighttime load', body: `${formatWhole(load.night)} Wh needed, ${formatDecimal(usableWh)} Wh usable in the battery.` },
        { ok: pkgIndex >= recommendedPkgIndex, title: 'Inverter floor', body: `Cannot go below the recommended ${PACKAGES[recommendedPkgIndex].kw} kW.` },
        { ok: panels >= pkg.panelDefault, title: 'Panel minimum', body: `${pkg.panelDefault} panels ship with this package; ${panels} selected.` },
    ];

    return (
        <div className="se-page" style={s.stepPage('1160px')}>
            <div style={s.eyebrow}>STEP 03 · RECOMMENDED PACKAGE</div>
            <div style={styles.titleRow}>
                <div>
                    <h1 className="se-h1" style={{ ...s.h1, margin: 0 }}>{pkg.kw} kW hybrid, sized to your load.</h1>
                    <p style={{ ...s.lead, maxWidth: '640px' }}>
                        Sized from your appliance list. You can pick a bigger inverter, add panels, or change the battery.
                    </p>
                </div>
                <div style={styles.adjustedBox}>
                    <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>INVERTER SIZE</div>
                    <div style={styles.adjustedValue}>{formatWhole(load.inverterSize)} W</div>
                </div>
            </div>

            {resumeNotice && (
                <div style={styles.infoBanner}>{resumeNotice}</div>
            )}

            {exceedsMax && (
                <div style={styles.warning}>
                    <span style={styles.warningIcon}>!</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>Load exceeds the largest package</div>
                        <div style={{ marginTop: '3px' }}>
                            {formatWhole(load.inverterSize)} W is above our largest {largest.kw} kW package. The quote
                            uses the {largest.kw} kW and an engineer will review it.
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.cards}>
                {/* ================= Inverter ================= */}
                <div style={styles.optionCard}>
                    <div style={styles.cardHead}>
                        <span style={s.cardEyebrow}>INVERTER</span>
                        <span style={s.tag(C.mint, C.green)}>UPGRADE ONLY</span>
                    </div>
                    <div style={styles.figureRow}>
                        <span style={styles.bigNumber}>{pkg.kw}</span>
                        <span style={{ fontSize: '13.5px', color: C.muted }}>kW hybrid · {pkg.brand}</span>
                        {pkgIndex === recommendedPkgIndex ? (
                            <RecommendedPill />
                        ) : (
                            <button type="button" className="btn-primary" onClick={() => onPickPackage(recommendedPkgIndex)} style={styles.useRecommended}>
                                Use recommended ({PACKAGES[recommendedPkgIndex].kw} kW)
                            </button>
                        )}
                    </div>
                    {/* The inverter size that picked the package (was a box at the top of the page) */}
                    <div style={styles.cardNote}>Sized for {formatWhole(load.inverterSize)} W</div>
                    <div style={styles.optionList}>
                        {PACKAGES.map((p, i) => {
                            const locked = i < recommendedPkgIndex;
                            const active = i === pkgIndex;
                            const recommended = i === recommendedPkgIndex;
                            return (
                                <button
                                    key={p.kw}
                                    type="button"
                                    disabled={locked}
                                    onClick={() => onPickPackage(i)}
                                    style={{
                                        ...s.option(active, locked),
                                        opacity: locked ? 0.55 : 1,
                                        ...(recommended ? styles.recommendedRow : {}),
                                    }}
                                >
                                    <span style={s.radioDot(active)} />
                                    <span style={{ fontFamily: NUM, fontSize: '14px' }}>{p.kw} kW hybrid</span>
                                    {recommended
                                        ? <RecommendedPill />
                                        : <span style={styles.optionTag(false)}>{locked ? 'below floor' : 'upgrade'}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p style={styles.cardFootnote}>{recommendationReason(load)}</p>
                </div>

                {/* ================= Panels ================= */}
                <div style={styles.optionCard}>
                    <div style={styles.cardHead}>
                        <span style={s.cardEyebrow}>PANELS · {PANEL_WATTS} W EACH</span>
                        <span style={s.tag(C.mint, C.green)}>{pkg.panelDefault}–{pkg.panelMax}</span>
                    </div>
                    <div style={styles.figureRow}>
                        <span style={styles.bigNumber}>{panels}</span>
                        <span style={{ fontSize: '13.5px', color: C.muted }}>panels · {formatDecimal(arrayKwp(panels))} kWp</span>
                        {panels === recommendedPanels ? (
                            <RecommendedPill />
                        ) : (
                            <button type="button" className="btn-primary" onClick={() => onPanelsChange(recommendedPanels)} style={styles.useRecommended}>
                                Use recommended ({recommendedPanels})
                            </button>
                        )}
                    </div>
                    {/* Client's wording: the recommended count is a floor, not a cap */}
                    <div style={styles.cardNote}>Minimum recommended, subject to upgrade</div>
                    {/* Same radio rows as the inverter and battery. A package takes up to
                        9 counts, so the list scrolls after about 5 rows to keep the three
                        cards the same height. */}
                    <div style={{ ...styles.optionList, ...styles.panelList }}>
                        {panelOptions(pkg).map((n) => {
                            const active = n === panels;
                            const recommended = n === recommendedPanels;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => onPanelsChange(n)}
                                    style={{ ...s.option(active, false), ...(recommended ? styles.recommendedRow : {}) }}
                                >
                                    <span style={s.radioDot(active)} />
                                    <span style={{ fontFamily: NUM, fontSize: '14px' }}>
                                        {n} panels · {formatDecimal(arrayKwp(n))} kWp
                                    </span>
                                    {recommended
                                        ? <RecommendedPill />
                                        : <span style={styles.optionTag(false)}>{n === pkg.panelDefault ? 'minimum' : ''}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p style={styles.cardFootnote}>
                        {formatWhole(load.inverterSize)} W ÷ {PANEL_WATTS} W = {recommendedPanels} panels, rounded
                        down{panelNote}.
                    </p>
                </div>

                {/* ================= Battery ================= */}
                <div style={styles.optionCard}>
                    <div style={styles.cardHead}>
                        <span style={s.cardEyebrow}>BATTERY · 51.2 V</span>
                        <span style={s.tag(C.warnBg, C.warnIcon)}>FREE CHOICE</span>
                    </div>
                    <div style={styles.figureRow}>
                        {/* "314 Ah", or a whole bank like "314 Ah + 100 Ah" (a bit smaller so it fits) */}
                        <span style={{ ...styles.bigNumber, ...(selection.bank.qty > 1 || selection.bank.extra ? styles.bigNumberBank : {}) }}>
                            {batteryLabel}
                        </span>
                        <span style={{ fontSize: '13.5px', color: C.muted }}>{formatDecimal(usableWh)} Wh usable</span>
                        {batteryIndex === recommendedBatteryIndex ? (
                            <RecommendedPill />
                        ) : (
                            <button type="button" className="btn-primary" onClick={() => onPickBattery(recommendedBatteryIndex)} style={styles.useRecommended}>
                                Use recommended ({recommendedBatteryLabel})
                            </button>
                        )}
                    </div>
                    <div style={styles.cardNote}>
                        {load.night <= 0
                            ? 'No nighttime load'
                            : usableWh >= load.night
                                ? `Covers ${formatWhole(load.night)} Wh at night`
                                : `Covers ${formatWhole(usableWh)} of ${formatWhole(load.night)} Wh at night`}
                    </div>
                    <div style={styles.optionList}>
                        {BATTERIES.map((b, i) => {
                            const active = i === batteryIndex;
                            const recommended = i === recommendedBatteryIndex;
                            // The bank this battery would come as (more than one unit only
                            // for a 314 Ah on a big night, e.g. "314 Ah + 100 Ah")
                            const bank = batteryBank(b, load.night);
                            return (
                                <button
                                    key={b.ah}
                                    type="button"
                                    onClick={() => onPickBattery(i)}
                                    style={{ ...s.option(active, false), ...(recommended ? styles.recommendedRow : {}) }}
                                >
                                    <span style={s.radioDot(active)} />
                                    <span style={{ fontFamily: NUM, fontSize: '14px' }}>
                                        {bankLabel(b, bank)} · {formatDecimal(bankWh(b, bank))} Wh
                                    </span>
                                    {recommended && <RecommendedPill />}
                                </button>
                            );
                        })}
                    </div>
                    <p style={styles.cardFootnote}>
                        {load.night > 0
                            ? `${formatWhole(load.night)} Wh at night needs at least ${recommendedBatteryLabel}.${recommendedIsBank ? ' One 314 Ah can\'t cover it, so the rest is covered by the cheapest battery that fits.' : ''} Any battery can be picked.`
                            : 'No nighttime load, so the smallest battery is suggested.'}
                    </p>
                </div>
            </div>

            {/* ================= Where the price goes ================= */}
            <div style={{ ...s.card, marginTop: '20px', overflow: 'hidden' }}>
                <div className="se-pad" style={styles.priceHead}>
                    <div>
                        <div style={s.cardTitle}>Where the price goes</div>
                        <div style={{ ...s.cardNote, color: C.muted, maxWidth: '560px' }}>
                            Each band is one cost, sized to its share of the total.
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={s.cardEyebrow}>TOTAL</div>
                        <div style={styles.priceTotal}>{peso(quote.total)}</div>
                    </div>
                </div>

                <div style={{ padding: '22px 26px 20px' }}>
                    <div style={styles.bar}>
                        {ranked.map((item) => (
                            <div
                                key={item.key}
                                role="button"
                                tabIndex={0}
                                onClick={() => pickCost(item.key)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCost(item.key); } }}
                                title={`${item.label} · ${peso(item.amount)}`}
                                style={styles.band(item, selectedCost)}
                            />
                        ))}
                    </div>
                    <div style={{ fontSize: '12.5px', color: C.muted, marginTop: '9px' }}>Tap a band to jump to that cost.</div>
                </div>

                {ranked.map((item) => {
                    const active = selectedCost === item.key;
                    return (
                        <div key={item.key} id={`cost-row-${item.key}`} className="se-pad" style={styles.costRow(active, item.color)}>
                            {/* Only the material, its cost and its share of the total */}
                            <div style={{ ...styles.costLine, flex: '1 1 auto', minWidth: 0, alignItems: 'center' }}>
                                <div style={styles.materialName}>
                                    <MaterialIcon itemKey={item.key} color={item.color} />
                                    <span>{item.label}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: NUM, fontSize: '16px', color: C.ink, whiteSpace: 'nowrap' }}>{peso(item.amount)}</div>
                                    <div style={{ fontSize: '12px', color: C.muted, whiteSpace: 'nowrap', marginTop: '2px' }}>
                                        {Math.round((item.amount / quote.total) * 100)}% of total
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="se-pad" style={styles.priceFoot}>
                    <div style={{ fontWeight: 700, color: C.ink, fontSize: '15px' }}>Total installed price</div>
                    <div style={{ fontFamily: NUM, color: C.ink, fontSize: '18px', whiteSpace: 'nowrap' }}>{peso(quote.total)}</div>
                </div>
            </div>

            {/* ================= Estimated savings ================= */}
            <SavingsCard savings={savings} total={quote.total} />

            {/* ================= Summary + coverage check ================= */}
            <div style={{ ...s.card, marginTop: '20px', display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
                <div className="se-pad" style={{ flex: '1 1 480px', minWidth: 0, padding: '26px 28px' }}>
                    <div style={s.cardEyebrow}>CONFIGURATION SUMMARY</div>
                    <div style={styles.summaryGrid}>
                        {summary.map((row) => (
                            <div key={row.k} style={styles.summaryRow}>
                                <span style={{ color: C.muted }}>{row.k}</span>
                                <span style={{ fontFamily: NUM, color: C.ink, textAlign: 'right' }}>{row.v}</span>
                            </div>
                        ))}
                    </div>

                    {submitError && (
                        <div style={styles.error}>
                            {submitError}
                            {/* Only when the admin is signed in: switch to a customer without losing the inputs */}
                            {onSwitchAccount && (
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" className="se-btn-secondary" onClick={onSwitchAccount} style={{ ...s.secondaryButton, padding: '9px 14px', fontSize: '13px' }}>
                                        Log out and continue
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '22px', flexWrap: 'wrap' }}>
                        <button className="se-btn-secondary" onClick={onBack} style={{ ...s.secondaryButton, padding: '13px 20px', fontSize: '14px' }}>
                            Back to computation
                        </button>
                        <button
                            className="se-btn-primary"
                            onClick={onRequestQuote}
                            disabled={submitting}
                            style={{ ...s.primaryButton, padding: '13px 22px', fontSize: '14px' }}
                        >
                            {submitting ? 'Sending request…' : 'Request quotation'}
                        </button>
                    </div>
                </div>

                <aside className="se-pad" style={styles.coverage}>
                    <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>COVERAGE CHECK</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                        {checks.map((check) => (
                            <div key={check.title} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                                <span style={styles.checkIcon(check.ok)}>{check.ok ? '✓' : '!'}</span>
                                <div>
                                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>{check.title}</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: C.onDark, marginTop: '2px' }}>{check.body}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '12.5px', lineHeight: 1.55, color: C.onDarkMuted }}>
                        All prices shown are sales prices.
                    </div>
                </aside>
            </div>
        </div>
    );
}

// Icon for each quote line, keyed by the line's key from buildQuote()
const MATERIAL_ICONS = {
    inverter: BoltIcon,
    panels: SunIcon,
    installation: WrenchIcon,
    mounting: GridIcon,
    safety: ShieldIcon,
    battery: BatteryIcon,
    battery_extra: BatteryIcon,
};

// The material's icon on a tile in its bar colour. The lightest colour
// (the yellow) gets a dark icon so it stays visible.
function MaterialIcon({ itemKey, color }) {
    const Icon = MATERIAL_ICONS[itemKey] ?? GridIcon;
    const light = color.toLowerCase() === '#f4c542' || color.toLowerCase() === '#79ac99';
    return (
        <span style={{ ...styles.materialIcon, background: color }} aria-hidden="true">
            <Icon size={18} color={light ? C.ink : '#fff'} />
        </span>
    );
}

// Green pill that marks the option the engine recommends
function RecommendedPill() {
    return <span style={styles.recommendedPill}>★ RECOMMENDED</span>;
}


const styles = {
    titleRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '36px', flexWrap: 'wrap', marginTop: '16px' },
    infoBanner: { ...s.reminder, marginTop: '24px' },
    warning: { ...s.alert, display: 'flex', gap: '13px', alignItems: 'flex-start', marginTop: '24px' },
    warningIcon: {
        flex: 'none', width: '20px', height: '20px', borderRadius: '50%', background: C.errorText, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginTop: '1px',
    },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(272px, 100%), 1fr))', gap: '20px', marginTop: '36px', alignItems: 'start' },
    optionCard: { ...s.card, padding: '24px', display: 'flex', flexDirection: 'column' },
    cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
    adjustedBox: { background: C.green, borderRadius: '12px', padding: '20px 24px' },
    adjustedValue: { fontFamily: NUM, fontSize: '28px', fontWeight: 600, letterSpacing: '-.03em', color: C.yellow, marginTop: '8px', whiteSpace: 'nowrap' },
    // Every card's top: big number, its unit, then the recommended pill or a "Use recommended" link
    figureRow: { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginTop: '14px' },
    // Green line under the figure: what the recommendation is based on
    cardNote: { marginTop: '6px', fontSize: '13px', fontWeight: 600, color: C.green },
    bigNumber: { fontFamily: NUM, fontSize: '30px', fontWeight: 600, letterSpacing: '-.03em', color: C.ink },
    // A battery bank's label ("314 Ah + 100 Ah") is longer, so it's set a bit smaller
    bigNumberBank: { fontSize: '24px' },
    optionList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' },
    // Green ring around the recommended row. A box-shadow, not a thicker
    // border, so the row doesn't change size when it's highlighted.
    recommendedRow: { boxShadow: `0 0 0 2px ${C.green}` },
    recommendedPill: {
        marginLeft: 'auto', alignSelf: 'center', fontFamily: NUM, fontSize: '11px', fontWeight: 700,
        letterSpacing: '.06em', background: C.green, color: '#fff', borderRadius: '20px',
        padding: '4px 9px', whiteSpace: 'nowrap',
    },
    useRecommended: { ...smallGreenButton, marginLeft: 'auto', alignSelf: 'center', fontFamily: SANS },
    optionTag: (highlight) => ({
        marginLeft: 'auto', fontFamily: NUM, fontSize: '11.5px', fontWeight: 600, letterSpacing: '.06em',
        color: highlight ? C.green : C.dim,
    }),
    // About 5 rows tall, then scrolls. The 3px padding keeps the recommended
    // row's ring (a box-shadow outside the row) from being clipped.
    panelList: { maxHeight: '262px', overflowY: 'auto', padding: '3px', margin: '17px -3px 0' },
    // The explanation under each card (why this package / panel count / battery): a green reminder
    cardFootnote: { ...s.reminder, margin: '14px 0 0', fontSize: '13px', lineHeight: 1.55 },
    priceHead: {
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px',
        padding: '20px 26px', borderBottom: `1px solid ${C.borderSoft}`, flexWrap: 'wrap',
    },
    priceTotal: { fontFamily: NUM, fontSize: '29px', fontWeight: 600, letterSpacing: '-.03em', color: C.green, whiteSpace: 'nowrap', marginTop: '4px' },
    bar: { display: 'flex', height: '14px', borderRadius: '99px', overflow: 'hidden', gap: '2px' },
    band: (item, selected) => ({
        flex: `${item.amount} 0 0`, background: item.color, cursor: 'pointer',
        transition: 'box-shadow .18s, filter .18s',
        boxShadow: selected === item.key ? `inset 0 0 0 2px ${C.ink}` : 'none',
        filter: selected === null || selected === item.key ? 'none' : 'saturate(.45)',
    }),
    costRow: (active, color) => ({
        display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 26px',
        borderTop: `1px solid ${C.rowBorder}`, transition: 'background .18s',
        background: active ? '#f6f9f5' : 'transparent', boxShadow: active ? `inset 3px 0 0 ${color}` : 'none',
    }),
    materialName: {
        display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0,
        fontSize: '15px', fontWeight: 700, color: C.ink, letterSpacing: '-.012em',
    },
    // Rounded tile in the cost's bar colour, so each row matches its band in the bar above
    materialIcon: {
        flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', borderRadius: '10px', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.06)',
    },
    costLine: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '18px' },
    priceFoot: {
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '20px',
        padding: '20px 26px', background: C.fieldBg, flexWrap: 'wrap',
    },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '0 32px', marginTop: '12px' },
    summaryRow: {
        display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 0',
        borderBottom: `1px solid ${C.rowBorder}`, fontSize: '14px',
    },
    error: { ...s.alert, marginTop: '18px' },
    coverage: { flex: '1 1 280px', minWidth: 0, background: C.darkPanel, padding: '26px', display: 'flex', flexDirection: 'column' },
    checkIcon: (ok) => ({
        flex: 'none', width: '19px', height: '19px', borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '12px', marginTop: '1px',
        background: ok ? C.yellow : '#c0392b', color: ok ? C.ink : '#fff',
    }),
};
