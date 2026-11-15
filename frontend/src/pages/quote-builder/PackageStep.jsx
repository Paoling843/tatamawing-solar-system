import {
    PACKAGES, BATTERIES, PANEL_WATTS,
    arrayKwp, batteryBank, bankWh, bankLabel, panelOptions, panelsForInverterSize,
    formatWhole, formatDecimal, peso,
} from '../../services/solarEngine';
import { Em, RecommendationReason } from './ReasonText';
import SavingsCard from './SavingsCard';
import StepBanner from './StepBanner';
import { Q, qs } from './calcTheme';

// Colours of the price bar and its legend squares, biggest cost first
const COST_COLORS = ['#0F3D2E', '#1F6B45', '#2E8B5E', '#5FA382', '#A8D5C2', '#F2C14E', '#D49A23'];

// STEP 3 — the recommended package. The customer can:
//   - move the inverter UP from the recommended package (never below)
//   - pick a panel count inside the chosen package's range
//   - pick any battery (up or down)
// Every change updates the itemized quote immediately.
// Look from the "Customer · Request quotation, step 3" mockup.
export default function PackageStep({
    load, selection, quote, savings, selectedCost, submitting, submitError, resumeNotice, onSwitchAccount,
    onPickPackage, onPanelsChange, onPickBattery, onSelectCost, onBack, onEditBills, onRequestQuote,
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
    const isRecommended = pkgIndex === recommendedPkgIndex && panels === recommendedPanels && batteryIndex === recommendedBatteryIndex;

    // Inverter size ÷ 610 W before it's kept inside the package's panel range
    const sizedPanels = panelsForInverterSize(load.inverterSize);
    // The result (the panel count) is in bold
    const panelMath = `${formatWhole(load.inverterSize)} W ÷ ${PANEL_WATTS} W = `;
    const panelReason = sizedPanels < recommendedPanels
        ? <>{panelMath}{sizedPanels}, but the {pkg.kw} kW package starts at <Em>{recommendedPanels} panels</Em>.</>
        : sizedPanels > recommendedPanels
            ? <>{panelMath}{sizedPanels}, but the {pkg.kw} kW package takes up to <Em>{recommendedPanels} panels</Em>.</>
            : <>{panelMath}<Em>{recommendedPanels} panels</Em>. Add more if you like.</>;

    // Biggest cost first, so the bar colours, band widths and the list below
    // all read in the same order.
    const ranked = [...quote.items]
        .sort((a, b) => b.amount - a.amount)
        .map((item, n) => ({ ...item, color: COST_COLORS[n % COST_COLORS.length] }));

    // Clicking a band highlights its cost line and scrolls it into view.
    // Clicking the same band again clears the highlight.
    const pickCost = (key) => {
        const next = selectedCost === key ? null : key;
        onSelectCost(next);
        if (next) {
            document.getElementById(`cost-row-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // "Use recommended": the recommended inverter (which also resets the
    // panels to its recommended count) and the recommended battery
    const useRecommended = () => {
        onPickPackage(recommendedPkgIndex);
        onPickBattery(recommendedBatteryIndex);
    };

    const summary = [
        { k: 'Inverter', v: `${pkg.kw} kW hybrid` },
        { k: 'Panels', v: `${panels} × 610 W` },
        { k: 'Array size', v: `${formatDecimal(arrayKwp(panels))} kWp` },
        { k: 'Battery', v: `${batteryLabel} @ 51.2 V` },
        { k: 'Usable storage', v: `${formatDecimal(usableWh)} Wh` },
        { k: 'Inverter size needed', v: `${formatWhole(load.inverterSize)} W` },
        { k: 'Estimated total', v: peso(quote.total) },
        { k: 'Monthly savings', v: peso(savings.monthlySavings) },
    ];

    const checks = [
        { ok: usableWh >= load.night, title: 'Nighttime use', body: `${formatWhole(load.night)} Wh needed, ${formatDecimal(usableWh)} Wh usable in the battery.` },
        { ok: pkgIndex >= recommendedPkgIndex, title: 'Inverter size', body: `${pkg.kw} kW covers your ${formatWhole(load.inverterSize)} W. We can't go below ${PACKAGES[recommendedPkgIndex].kw} kW.` },
        { ok: panels >= pkg.panelDefault, title: 'Panel count', body: `${panels} selected. The package needs at least ${pkg.panelDefault}.` },
    ];

    return (
        <div className="se-step" style={qs.page}>
            <StepBanner
                screen="package"
                title="Your recommended package"
                subtitle={`${pkg.kw} kW hybrid, sized to your ${formatWhole(load.inverterSize)} W load. You can upgrade any part below.`}
                aside={(
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.asideLabel}>Estimated total</div>
                        <div style={styles.asideTotal}>{peso(quote.total)}</div>
                        <div style={{ fontSize: '13px', color: Q.stripText }}>Saves about {peso(Math.round(savings.monthlySavings))} a month</div>
                    </div>
                )}
            />

            {resumeNotice && <p role="status" style={qs.notice}>{resumeNotice}</p>}

            {exceedsMax && (
                <div role="alert" style={{ ...qs.alert, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={styles.warningIcon} aria-hidden="true">!</span>
                    <div>
                        <strong>Load exceeds the largest package.</strong>{' '}
                        {formatWhole(load.inverterSize)} W is above our largest {largest.kw} kW package. The quote
                        uses the {largest.kw} kW and an engineer will review it.
                    </div>
                </div>
            )}

            {/* ================= Choose your parts ================= */}
            <section aria-labelledby="parts-h" style={qs.card}>
                <div style={{ ...qs.cardHead, borderBottom: 'none' }}>
                    <div>
                        <h2 id="parts-h" style={qs.h2}>Choose your parts</h2>
                        <p style={qs.sub}>We picked the smallest setup that covers your appliances.</p>
                    </div>
                    <button type="button" className="c-btn c-btn-secondary" onClick={useRecommended} disabled={isRecommended}>
                        Use recommended
                    </button>
                </div>
                <div style={styles.parts}>
                    {/* ----- Inverter ----- */}
                    <PartCard
                        title="Inverter"
                        tag="Upgrade only"
                        pick={`${pkg.kw} kW hybrid · ${pkg.brand}`}
                        reason={<RecommendationReason load={load} />}
                    >
                        {PACKAGES.map((p, i) => {
                            const locked = i < recommendedPkgIndex;
                            const recommended = i === recommendedPkgIndex;
                            return (
                                <Option
                                    key={p.kw}
                                    name="inverter"
                                    checked={i === pkgIndex}
                                    disabled={locked}
                                    onPick={() => onPickPackage(i)}
                                    label={`${p.kw} kW hybrid`}
                                    sub={`${formatWhole(p.watts)} W max · ${p.brand}`}
                                    tag={recommended ? 'Recommended' : locked ? 'Too small' : 'Upgrade'}
                                    tagKind={recommended ? 'rec' : locked ? 'low' : 'up'}
                                />
                            );
                        })}
                    </PartCard>

                    {/* ----- Panels ----- */}
                    <PartCard
                        title={`Panels · ${PANEL_WATTS} W each`}
                        tag={`${pkg.panelDefault} to ${pkg.panelMax}`}
                        pick={`${panels} panels · ${formatDecimal(arrayKwp(panels))} kWp`}
                        reason={panelReason}
                        columns={2}
                    >
                        {panelOptions(pkg).map((n) => {
                            const recommended = n === recommendedPanels;
                            const minimum = n === pkg.panelDefault;
                            return (
                                <Option
                                    key={n}
                                    name="panels"
                                    checked={n === panels}
                                    onPick={() => onPanelsChange(n)}
                                    label={`${n} panels`}
                                    sub={`${formatDecimal(arrayKwp(n))} kWp`}
                                    tag={recommended ? 'Recommended' : minimum ? 'Minimum' : null}
                                    tagKind={recommended ? 'rec' : 'up'}
                                />
                            );
                        })}
                    </PartCard>

                    {/* ----- Battery ----- */}
                    <PartCard
                        title="Battery · 51.2 V"
                        tag="Any size"
                        pick={`${batteryLabel} · ${formatDecimal(usableWh)} Wh usable`}
                        reason={load.night > 0 ? (
                            <>
                                About {formatWhole(load.night)} Wh at night needs at least <Em>{recommendedBatteryLabel}</Em>.
                                {recommendedIsBank ? ' We added more batteries to cover it.' : ''} Any battery can be picked.
                            </>
                        ) : (
                            <>No nighttime use, so the <Em>smallest battery</Em> is enough.</>
                        )}
                    >
                        {BATTERIES.map((b, i) => {
                            // The bank this battery would come as (more than one unit only
                            // for a 314 Ah on a big night, e.g. "314 Ah + 100 Ah")
                            const bank = batteryBank(b, load.night);
                            return (
                                <Option
                                    key={b.ah}
                                    name="battery"
                                    checked={i === batteryIndex}
                                    onPick={() => onPickBattery(i)}
                                    label={bankLabel(b, bank)}
                                    sub={`${formatDecimal(bankWh(b, bank))} Wh usable`}
                                    tag={i === recommendedBatteryIndex ? 'Recommended' : null}
                                    tagKind="rec"
                                />
                            );
                        })}
                    </PartCard>
                </div>
            </section>

            {/* ================= Where the money goes ================= */}
            <section aria-labelledby="price-h" style={qs.card}>
                <div style={{ ...qs.cardHead, alignItems: 'flex-end', borderBottom: 'none', paddingBottom: '14px' }}>
                    <div>
                        <h2 id="price-h" style={qs.h2}>Where the money goes</h2>
                        <p style={qs.sub}>Each bar is one cost, sized by its share of the total. Tap one to find it below.</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', color: Q.muted }}>Total installed price</div>
                        <div style={{ fontSize: '26px', fontWeight: 700 }}>{peso(quote.total)}</div>
                    </div>
                </div>
                <div style={styles.bar}>
                    {ranked.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => pickCost(item.key)}
                            aria-pressed={selectedCost === item.key}
                            aria-label={`${item.label}, ${peso(item.amount)}`}
                            title={`${item.label} · ${peso(item.amount)}`}
                            style={styles.band(item, selectedCost)}
                        />
                    ))}
                </div>
                <div className="se-table-scroll">
                    <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse' }}>
                        <tbody>
                            {ranked.map((item) => {
                                const active = selectedCost === item.key;
                                return (
                                    <tr key={item.key} id={`cost-row-${item.key}`} style={styles.costRow(active, item.color)}>
                                        <th scope="row" style={{ ...styles.costCell, paddingLeft: '20px', textAlign: 'left', fontWeight: 600 }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                                <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color, flex: 'none' }} />
                                                {item.label}
                                            </span>
                                        </th>
                                        <td style={{ ...styles.costCell, color: Q.muted }}>
                                            {item.qtyLabel} × {peso(item.unitPrice)}
                                        </td>
                                        <td style={{ ...styles.costCell, textAlign: 'right', color: Q.muted, whiteSpace: 'nowrap' }}>
                                            {Math.round((item.amount / quote.total) * 100)}%
                                        </td>
                                        <td style={{ ...styles.costCell, paddingRight: '20px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {peso(item.amount)}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr style={{ background: Q.tint }}>
                                <th scope="row" colSpan={3} style={{ ...styles.costCell, padding: '13px 12px 13px 20px', textAlign: 'left', fontWeight: 700, color: Q.green }}>
                                    Total installed price
                                </th>
                                <td style={{ ...styles.costCell, padding: '13px 20px 13px 12px', textAlign: 'right', fontSize: '18px', fontWeight: 700, color: Q.green, whiteSpace: 'nowrap' }}>
                                    {peso(quote.total)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ================= Estimated savings ================= */}
            <SavingsCard savings={savings} total={quote.total} onEditBills={onEditBills} />

            {/* ================= Review and send ================= */}
            <section aria-labelledby="rev-h" style={{ ...qs.card, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
                <div style={{ flex: '3 1 420px', minWidth: 0, padding: '18px 20px 20px' }}>
                    <h2 id="rev-h" style={{ ...qs.h2, marginBottom: '10px' }}>Review and send</h2>
                    <dl style={styles.summary}>
                        {summary.map((row) => (
                            <div key={row.k} style={styles.summaryRow}>
                                <dt style={{ color: Q.body }}>{row.k}</dt>
                                <dd style={{ margin: 0, fontWeight: 700, textAlign: 'right' }}>{row.v}</dd>
                            </div>
                        ))}
                    </dl>

                    {submitError && (
                        <div role="alert" style={{ ...qs.alert, marginTop: '16px' }}>
                            {submitError}
                            {/* Only when the admin is signed in: switch to a customer without losing the inputs */}
                            {onSwitchAccount && (
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" className="c-btn c-btn-secondary" onClick={onSwitchAccount}>
                                        Log out and continue
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
                        <button type="button" className="c-btn c-btn-secondary" onClick={onBack} style={{ ...qs.bigBtn, fontWeight: 600, padding: '0 16px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                            </svg>
                            Back to computation
                        </button>
                        <button type="button" className="c-btn c-btn-primary" onClick={onRequestQuote} disabled={submitting} style={qs.bigBtn}>
                            {submitting ? 'Sending request…' : 'Send quotation request'}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" />
                            </svg>
                        </button>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '13px', color: Q.muted }}>
                        All prices are sales prices. We'll review your request and confirm the final amount.
                    </p>
                </div>

                <div style={styles.coverage}>
                    <h3 style={styles.coverageTitle}>Coverage check</h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {checks.map((check) => (
                            <li key={check.title} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <span style={styles.checkIcon(check.ok)}>
                                    {check.ok ? (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M20 6 9 17l-5-5" />
                                        </svg>
                                    ) : <span aria-hidden="true">!</span>}
                                    <span style={qs.srOnly}>{check.ok ? 'OK' : 'Check this'}</span>
                                </span>
                                <span>
                                    <span style={{ display: 'block', fontWeight: 700 }}>{check.title}</span>
                                    <span style={{ display: 'block', fontSize: '13px', color: Q.stripText }}>{check.body}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}

// One of the three part cards: its name and range tag, what's picked and
// why, then the options as radio buttons
function PartCard({ title, tag, pick, reason, columns = 1, children }) {
    return (
        <fieldset style={styles.partCard}>
            <legend style={qs.srOnly}>{title}</legend>
            <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${Q.rowLine}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.partTitle}>{title}</span>
                    <span style={styles.partTag}>{tag}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 700, overflowWrap: 'anywhere' }}>{pick}</div>
                <div style={{ fontSize: '13px', color: Q.muted }}>{reason}</div>
            </div>
            <div style={{
                padding: '12px 16px 16px', display: 'grid', gap: '6px',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                ...(columns > 1 ? { maxHeight: '320px', overflowY: 'auto' } : {}),
            }}>
                {children}
            </div>
        </fieldset>
    );
}

function Option({ name, checked, disabled = false, onPick, label, sub, tag, tagKind }) {
    return (
        <label style={styles.option(checked, disabled)}>
            <input
                type="radio"
                name={name}
                checked={checked}
                disabled={disabled}
                onChange={onPick}
                style={{ margin: '2px 0 0', width: '16px', height: '16px', accentColor: Q.green, flex: 'none' }}
            />
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '12px', color: Q.muted }}>{sub}</span>
                {tag && <span style={styles.optTag(tagKind)}>{tag}</span>}
            </span>
        </label>
    );
}

const styles = {
    asideLabel: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: Q.stripText },
    asideTotal: { fontSize: '30px', fontWeight: 700, lineHeight: 1.15, color: Q.gold, whiteSpace: 'nowrap' },
    warningIcon: {
        flex: 'none', width: '20px', height: '20px', borderRadius: '50%', background: Q.danger, color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, marginTop: '1px',
    },
    parts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '14px', padding: '0 20px 20px', alignItems: 'start' },
    partCard: { margin: 0, padding: 0, border: `1px solid ${Q.line}`, borderRadius: '6px', minWidth: 0, display: 'flex', flexDirection: 'column' },
    partTitle: { fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: Q.muted },
    partTag: { fontSize: '12px', fontWeight: 600, color: Q.body, background: '#EEEFEC', borderRadius: '4px', padding: '1px 8px', whiteSpace: 'nowrap' },
    option: (on, off) => ({
        display: 'flex', alignItems: 'flex-start', gap: '10px', minHeight: '44px', boxSizing: 'border-box',
        borderRadius: '6px', cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.55 : 1,
        ...(on
            ? { border: `2px solid ${Q.green}`, background: Q.tintSoft, padding: '7px 9px' }
            : { border: `1px solid ${Q.line}`, background: '#FFFFFF', padding: '8px 10px' }),
    }),
    optTag: (kind) => (kind === 'rec'
        ? { marginTop: '2px', fontSize: '11px', fontWeight: 700, color: Q.onGold, background: Q.gold, borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }
        : kind === 'low'
            ? { fontSize: '11px', fontWeight: 700, color: '#A3261B', whiteSpace: 'nowrap' }
            : { fontSize: '11px', fontWeight: 600, color: Q.muted, whiteSpace: 'nowrap' }),
    bar: { display: 'flex', gap: '2px', height: '14px', margin: '0 20px 16px', borderRadius: '4px', overflow: 'hidden' },
    band: (item, selected) => ({
        flex: `${item.amount} 0 0`, minWidth: '4px', padding: 0, border: 'none', background: item.color, cursor: 'pointer',
        boxShadow: selected === item.key ? `inset 0 0 0 2px ${Q.ink}` : 'none',
        filter: selected === null || selected === item.key ? 'none' : 'saturate(.45)',
        transition: 'box-shadow .15s, filter .15s',
    }),
    costRow: (active, color) => ({
        background: active ? Q.tintSoft : 'transparent',
        boxShadow: active ? `inset 3px 0 0 ${color}` : 'none',
        transition: 'background .15s',
    }),
    costCell: { padding: '11px 12px', borderTop: `1px solid ${Q.rowLine}` },
    summary: { margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', columnGap: '28px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: `1px solid ${Q.rowLine}` },
    coverage: { flex: '2 1 300px', minWidth: 0, background: Q.green, color: '#FFFFFF', padding: '18px 20px 20px' },
    coverageTitle: {
        margin: '0 0 12px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: Q.gold,
    },
    checkIcon: (ok) => ({
        width: '22px', height: '22px', borderRadius: '50%', background: ok ? Q.done : '#F08A7E', color: Q.green,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: '1px',
        fontSize: '13px', fontWeight: 700,
    }),
};
