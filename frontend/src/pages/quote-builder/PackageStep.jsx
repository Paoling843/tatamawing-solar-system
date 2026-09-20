import {
    PACKAGES, BATTERIES, PANEL_WATTS,
    arrayKwp, batteryWh, panelOptions, formatWhole, formatDecimal, peso, recommendationReason,
} from '../../services/solarEngine';
import { C, MONO, SANS, COST_RAMP, s } from './engineStyles';

// STEP 3 — the recommended package. The customer can:
//   - move the inverter UP from the recommended package (never below)
//   - pick a panel count inside the chosen package's range
//   - pick any battery (up or down)
// Every change updates the itemized quote immediately.
export default function PackageStep({
    load, selection, quote, selectedCost, submitting, submitError, resumeNotice,
    onPickPackage, onPanelsChange, onPickBattery, onSelectCost, onBack, onRequestQuote,
}) {
    const { pkg, pkgIndex, recommendedPkgIndex, panels, battery, batteryIndex, recommendedBatteryIndex } = selection;
    const largest = PACKAGES[PACKAGES.length - 1];
    const exceedsMax = load.adjusted > largest.watts;
    const usableWh = batteryWh(battery.ah);

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
        { k: 'Battery', v: `${battery.ah} Ah @ 51.2 V` },
        { k: 'Usable storage', v: `${formatDecimal(usableWh)} Wh` },
        { k: 'Adjusted load', v: `${formatWhole(load.adjusted)} Wh` },
        { k: 'Estimated total', v: peso(quote.total) },
    ];

    const checks = [
        { ok: usableWh >= load.night, title: 'Nighttime load', body: `${formatWhole(load.night)} Wh needed, ${formatDecimal(usableWh)} Wh usable in the bank.` },
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
                        {recommendationReason(load.adjusted)} You can move up from here, never below — the
                        inverter and panel count are floors, the battery is free to move either way.
                    </p>
                </div>
                <div style={styles.adjustedBox}>
                    <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>ADJUSTED TOTAL</div>
                    <div style={styles.adjustedValue}>{formatWhole(load.adjusted)} Wh</div>
                </div>
            </div>

            {resumeNotice && (
                <div style={styles.infoBanner}>{resumeNotice}</div>
            )}

            {exceedsMax && (
                <div style={styles.warning}>
                    <span style={styles.warningIcon}>!</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.warnText }}>Load exceeds the largest package</div>
                        <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: C.warnBody, marginTop: '3px' }}>
                            The adjusted total of {formatWhole(load.adjusted)} Wh is above the {largest.kw} kW capacity,
                            which is the largest tier currently offered. The quotation is built on the {largest.kw} kW
                            package and flagged for an engineer to review.
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
                    <div style={styles.bigLabel}>{pkg.kw} kW</div>
                    <div style={{ fontSize: '13.5px', color: C.muted, marginTop: '4px' }}>Hybrid, DEYE or SOLIS</div>
                    <div style={styles.optionList}>
                        {PACKAGES.map((p, i) => {
                            const locked = i < recommendedPkgIndex;
                            const active = i === pkgIndex;
                            const tag = i === recommendedPkgIndex ? 'recommended' : locked ? 'below floor' : 'upgrade';
                            return (
                                <button
                                    key={p.kw}
                                    type="button"
                                    disabled={locked}
                                    onClick={() => onPickPackage(i)}
                                    style={{ ...s.option(active, locked), opacity: locked ? 0.55 : 1 }}
                                >
                                    <span style={s.radioDot(active)} />
                                    <span style={{ fontFamily: MONO, fontSize: '14px' }}>{p.kw} kW hybrid</span>
                                    <span style={styles.optionTag(i === recommendedPkgIndex)}>{tag}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ================= Panels ================= */}
                <div style={styles.optionCard}>
                    <div style={styles.cardHead}>
                        <span style={s.cardEyebrow}>PANELS · {PANEL_WATTS} W EACH</span>
                        <span style={s.tag(C.mint, C.green)}>{pkg.panelDefault}–{pkg.panelMax}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px' }}>
                        <span style={styles.bigNumber}>{panels}</span>
                        <span style={{ fontSize: '13.5px', color: C.muted }}>panels · {formatDecimal(arrayKwp(panels))} kWp</span>
                    </div>
                    <select
                        value={String(panels)}
                        onChange={(e) => onPanelsChange(parseInt(e.target.value, 10))}
                        style={styles.panelSelect}
                    >
                        {panelOptions(pkg).map((n) => (
                            <option key={n} value={String(n)}>
                                {n} panels · {formatDecimal(arrayKwp(n))} kWp{n === pkg.panelDefault ? ' (default)' : ''}
                            </option>
                        ))}
                    </select>
                    <p style={styles.cardFootnote}>
                        The {pkg.kw} kW package ships with {pkg.panelDefault} panels and accepts up to {pkg.panelMax}.
                    </p>
                </div>

                {/* ================= Battery ================= */}
                <div style={styles.optionCard}>
                    <div style={styles.cardHead}>
                        <span style={s.cardEyebrow}>BATTERY · 51.2 V</span>
                        <span style={s.tag(C.warnBg, C.warnIcon)}>FREE CHOICE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px' }}>
                        <span style={styles.bigNumber}>{battery.ah}</span>
                        <span style={{ fontSize: '13.5px', color: C.muted }}>Ah · {formatDecimal(usableWh)} Wh usable</span>
                    </div>
                    <div style={styles.optionList}>
                        {BATTERIES.map((b, i) => {
                            const active = i === batteryIndex;
                            return (
                                <button key={b.ah} type="button" onClick={() => onPickBattery(i)} style={s.option(active, false)}>
                                    <span style={s.radioDot(active)} />
                                    <span style={{ fontFamily: MONO, fontSize: '14px' }}>
                                        {b.ah} Ah · {formatDecimal(batteryWh(b.ah))} Wh
                                    </span>
                                    <span style={styles.optionTag(true)}>{i === recommendedBatteryIndex ? 'matched' : ''}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p style={styles.cardFootnote}>
                        {load.night > 0
                            ? `Your ${formatWhole(load.night)} Wh of nighttime draw needs at least ${BATTERIES[recommendedBatteryIndex].ah} Ah. All four banks stay selectable either way.`
                            : 'No nighttime load was entered, so the smallest bank is offered as a starting point.'}
                    </p>
                </div>
            </div>

            {/* ================= Where the price goes ================= */}
            <div style={{ ...s.card, marginTop: '20px', overflow: 'hidden' }}>
                <div style={styles.priceHead}>
                    <div>
                        <div style={s.cardTitle}>Where the price goes</div>
                        <div style={{ ...s.cardNote, color: C.muted, maxWidth: '560px' }}>
                            Each band below is one cost, sized to its share of the total. The figures update whenever
                            you change the panel count or the battery.
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
                        <div key={item.key} id={`cost-row-${item.key}`} style={styles.costRow(active, item.color)}>
                            <div style={{ ...styles.swatch, background: item.color }} />
                            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                <div style={styles.costLine}>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink, letterSpacing: '-.012em' }}>{item.label}</div>
                                    <div style={{ fontFamily: MONO, fontSize: '16px', color: C.ink, whiteSpace: 'nowrap' }}>{peso(item.amount)}</div>
                                </div>
                                <div style={{ ...styles.costLine, marginTop: '4px' }}>
                                    <div style={{ fontSize: '13px', lineHeight: 1.5, color: C.muted }}>{item.description}</div>
                                    <div style={{ fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' }}>
                                        {Math.round((item.amount / quote.total) * 100)}% of total
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '7px', flexWrap: 'wrap' }}>
                                    <span style={styles.qtyChip}>{item.qtyLabel}</span>
                                    {item.unitLabel && (
                                        <span style={{ fontSize: '12.5px', color: C.muted, whiteSpace: 'nowrap' }}>{item.unitLabel}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div style={styles.priceFoot}>
                    <div style={{ fontWeight: 700, color: C.ink, fontSize: '15px' }}>Total installed price</div>
                    <div style={{ fontFamily: MONO, color: C.ink, fontSize: '18px', whiteSpace: 'nowrap' }}>{peso(quote.total)}</div>
                </div>
            </div>

            {/* ================= Summary + coverage check ================= */}
            <div style={{ ...s.card, marginTop: '20px', display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
                <div style={{ flex: '1 1 480px', minWidth: 0, padding: '26px 28px' }}>
                    <div style={s.cardEyebrow}>CONFIGURATION SUMMARY</div>
                    <div style={styles.summaryGrid}>
                        {summary.map((row) => (
                            <div key={row.k} style={styles.summaryRow}>
                                <span style={{ color: C.muted }}>{row.k}</span>
                                <span style={{ fontFamily: MONO, color: C.ink, textAlign: 'right' }}>{row.v}</span>
                            </div>
                        ))}
                    </div>

                    {submitError && <div style={styles.error}>{submitError}</div>}

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

                <aside style={styles.coverage}>
                    <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>COVERAGE CHECK</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                        {checks.map((check) => (
                            <div key={check.title} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                                <span style={styles.checkIcon(check.ok)}>{check.ok ? '✓' : '!'}</span>
                                <div>
                                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>{check.title}</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: '#9aada4', marginTop: '2px' }}>{check.body}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '11.5px', lineHeight: 1.55, color: '#7d948a' }}>
                        Prices shown are customer-facing sales prices. Supplier comparison is handled separately by the admin.
                    </div>
                </aside>
            </div>
        </div>
    );
}

const styles = {
    titleRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '36px', flexWrap: 'wrap', marginTop: '16px' },
    adjustedBox: { background: C.green, borderRadius: '12px', padding: '20px 24px' },
    adjustedValue: { fontFamily: MONO, fontSize: '28px', fontWeight: 500, letterSpacing: '-.03em', color: C.yellow, marginTop: '8px', whiteSpace: 'nowrap' },
    infoBanner: {
        background: C.mint, border: '1px solid #c7d3cc', borderRadius: '12px', padding: '14px 18px',
        marginTop: '24px', fontSize: '14px', color: C.green, lineHeight: 1.5,
    },
    warning: {
        display: 'flex', gap: '13px', alignItems: 'flex-start', background: C.warnBg,
        border: `1px solid ${C.warnBorder}`, borderRadius: '12px', padding: '16px 18px', marginTop: '24px',
    },
    warningIcon: {
        flex: 'none', width: '20px', height: '20px', borderRadius: '50%', background: C.warnIcon, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginTop: '1px',
    },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(272px, 100%), 1fr))', gap: '20px', marginTop: '36px', alignItems: 'start' },
    optionCard: { ...s.card, padding: '24px', display: 'flex', flexDirection: 'column' },
    cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
    bigLabel: { fontSize: '23px', fontWeight: 800, letterSpacing: '-.025em', color: C.ink, marginTop: '14px' },
    bigNumber: { fontFamily: MONO, fontSize: '30px', fontWeight: 500, letterSpacing: '-.03em', color: C.ink },
    optionList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' },
    optionTag: (highlight) => ({
        marginLeft: 'auto', fontFamily: MONO, fontSize: '10px', letterSpacing: '.06em',
        color: highlight ? C.green : C.dim,
    }),
    panelSelect: {
        marginTop: '20px', border: `1px solid ${C.fieldBorder}`, borderRadius: '9px', padding: '13px',
        fontFamily: MONO, fontSize: '14.5px', color: C.ink, outline: 'none', background: C.fieldBg,
        cursor: 'pointer', width: '100%',
    },
    cardFootnote: { margin: '14px 0 0', fontSize: '13px', lineHeight: 1.55, color: C.muted },
    priceHead: {
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px',
        padding: '20px 26px', borderBottom: `1px solid ${C.borderSoft}`, flexWrap: 'wrap',
    },
    priceTotal: { fontFamily: MONO, fontSize: '29px', fontWeight: 500, letterSpacing: '-.03em', color: C.green, whiteSpace: 'nowrap', marginTop: '4px' },
    bar: { display: 'flex', height: '14px', borderRadius: '99px', overflow: 'hidden', gap: '2px' },
    band: (item, selected) => ({
        flex: `${item.amount} 0 0`, background: item.color, cursor: 'pointer',
        transition: 'box-shadow .18s, filter .18s',
        boxShadow: selected === item.key ? `inset 0 0 0 2px ${C.ink}` : 'none',
        filter: selected === null || selected === item.key ? 'none' : 'saturate(.45)',
    }),
    costRow: (active, color) => ({
        display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '18px 26px',
        borderTop: `1px solid ${C.rowBorder}`, transition: 'background .18s',
        background: active ? '#f6f9f5' : 'transparent', boxShadow: active ? `inset 3px 0 0 ${color}` : 'none',
    }),
    swatch: { flex: 'none', width: '11px', height: '11px', borderRadius: '3px', marginTop: '5px' },
    costLine: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '18px' },
    qtyChip: { fontSize: '12.5px', color: C.ink, background: C.softBg, borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap' },
    priceFoot: {
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '20px',
        padding: '20px 26px', background: C.fieldBg, flexWrap: 'wrap',
    },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '0 32px', marginTop: '12px' },
    summaryRow: {
        display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 0',
        borderBottom: `1px solid ${C.rowBorder}`, fontSize: '14px',
    },
    error: {
        marginTop: '18px', background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText,
        borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', lineHeight: 1.5, fontFamily: SANS,
    },
    coverage: { flex: '1 1 280px', minWidth: 0, background: C.darkPanel, padding: '26px', display: 'flex', flexDirection: 'column' },
    checkIcon: (ok) => ({
        flex: 'none', width: '19px', height: '19px', borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '11px', marginTop: '1px',
        background: ok ? C.yellow : '#c0392b', color: ok ? C.ink : '#fff',
    }),
};
