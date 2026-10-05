import {
    DEFAULT_RATE_PER_KWH, PEAK_SUN_HOURS, SYSTEM_LIFE_YEARS,
    formatWhole, formatDecimal, peso,
} from '../../services/solarEngine';
import { C, s } from './engineStyles';

// STEP 3 — "Your estimated savings" card, from the Solar Savings Card design.
//   Left:   monthly savings, and how much of the current bill solar covers
//   Right:  payback period, with a chart of total savings vs. the system cost
//   Bottom: annual return (ROA), solar produced/used, sun hours
// savings comes from computeSavings() in solarEngine.js; total is the quote total.
export default function SavingsCard({ savings, total }) {
    const usedKwh = Math.min(savings.usageKwh, savings.productionKwh);
    const roundOne = (n) => formatDecimal(Math.round(n * 10) / 10);

    return (
        <div style={{ ...s.card, marginTop: '20px', overflow: 'hidden' }}>
            <header style={styles.header}>
                <h2 style={styles.title}>Your estimated savings</h2>
                <span style={styles.ratePill}>
                    {savings.rateSource === 'bill' ? 'Your rate' : 'Typical rate'}:{' '}
                    <strong style={{ fontWeight: 600 }}>₱{savings.rate.toFixed(2)}/kWh</strong>
                </span>
            </header>

            {/* 1px gaps on a border-coloured background draw the dividers,
                whether the two columns sit side by side or stack */}
            <div style={styles.split}>
                <div style={styles.column}>
                    <Figure label="Monthly savings" value={peso(savings.monthlySavings)} accent />
                    <span style={{ fontSize: '15px', color: C.muted, marginTop: '-18px' }}>
                        {peso(savings.annualSavings)} per year
                    </span>

                    <BillBar savings={savings} />
                </div>

                <div style={{ ...styles.column, gap: '16px' }}>
                    <Figure
                        label="Payback period"
                        value={savings.paybackYears !== null ? roundOne(savings.paybackYears) : '—'}
                        unit={savings.paybackYears !== null ? 'years' : null}
                    />
                    <PaybackChart savings={savings} total={total} />
                    <div style={styles.legend}>
                        <span style={styles.legendItem}>
                            <span style={{ width: '16px', height: '3px', background: C.green, borderRadius: '2px' }} />
                            Total savings
                        </span>
                        <span style={styles.legendItem}>
                            <span style={{ width: '16px', height: 0, borderTop: `2px dashed ${C.muted}` }} />
                            System cost
                        </span>
                        {!netGainFitsChart(savings, total) && (
                            <span style={{ marginLeft: 'auto', fontWeight: 600, color: savings.netGain >= 0 ? C.ink : C.errorText }}>
                                {netGainLabel(savings)} over {SYSTEM_LIFE_YEARS} years
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.stats}>
                <Stat label="Annual return (ROA)" value={savings.roaPercent !== null ? `${roundOne(savings.roaPercent)}%` : '—'} />
                <Stat label="Solar produced" value={formatWhole(savings.productionKwh)} unit="kWh/mo" />
                <Stat label="Solar used" value={formatWhole(usedKwh)} unit="kWh/mo" />
                <Stat label="Sun hours" value={formatDecimal(PEAK_SUN_HOURS)} unit="per day" />
            </div>

            <footer style={styles.footer}>
                Estimate only. Savings are limited to the solar power you use and can't exceed your bill.
                Weather and usage will change actual results.
                {savings.rateSource === 'default' && (
                    <> A typical rate of ₱{DEFAULT_RATE_PER_KWH}/kWh is used — add a bill amount and its kWh in
                        Step 1 to use your own rate.</>
                )}
            </footer>
        </div>
    );
}

function Figure({ label, value, unit, accent }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: C.body }}>{label}</span>
            <span style={{ ...styles.bigNumber, color: accent ? C.green : C.ink }}>
                {value}
                {unit && <span style={{ fontSize: '24px', fontWeight: 500, color: C.muted }}> {unit}</span>}
            </span>
        </div>
    );
}

function Stat({ label, value, unit }) {
    return (
        <div style={styles.stat}>
            <span style={{ fontSize: '13px', color: C.muted }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 600, color: C.ink }}>
                {value}
                {unit && <span style={{ fontSize: '14px', fontWeight: 500, color: C.muted }}> {unit}</span>}
            </span>
        </div>
    );
}

// Current bill split into "covered by solar" and "new bill".
// Needs a bill amount from Step 1; without one there is nothing to split.
function BillBar({ savings }) {
    if (savings.monthlyBill === null) {
        return (
            <div style={styles.billPlaceholder}>
                Add your monthly bill amount in Step 1 to see how much of it solar covers.
            </div>
        );
    }

    const coveredPct = savings.monthlyBill > 0 ? (savings.monthlySavings / savings.monthlyBill) * 100 : 0;
    const newPct = 100 - coveredPct;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.body }}>
                <span>{savings.billCount > 1 ? 'Average monthly bill' : 'Current monthly bill'}</span>
                <strong style={{ fontWeight: 600, color: C.ink }}>{peso(savings.monthlyBill)}</strong>
            </div>
            <div style={styles.bar}>
                {coveredPct > 0 && (
                    <BarSegment pct={coveredPct} background={C.yellow} label="Covered by solar" value={peso(savings.monthlySavings)} />
                )}
                {newPct > 0 && (
                    <BarSegment pct={newPct} background={C.border} label="New bill" value={peso(savings.newMonthlyBill)} />
                )}
            </div>
            <span style={{ fontSize: '13px', color: C.muted }}>{Math.round(coveredPct)}% lower bill</span>
        </div>
    );
}

function BarSegment({ pct, background, label, value }) {
    // A sliver of the bar has no room for its text
    const roomy = pct >= 22;

    return (
        <div style={{ ...styles.segment, width: `${pct}%`, background }} title={`${label}: ${value}`}>
            {roomy && (
                <>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>{value}</span>
                </>
            )}
        </div>
    );
}

function netGainLabel(savings) {
    return savings.netGain >= 0 ? `Net gain ${peso(savings.netGain)}` : `Net loss ${peso(-savings.netGain)}`;
}

// True when the gap between the cost line and the end of the savings line
// (155 units tall at most) has room for the net gain label above the cost line
function netGainFitsChart(savings, total) {
    const max = Math.max(savings.lifetimeSavings, total, 1);
    return savings.netGain > 0 && (155 * savings.netGain) / max >= 30;
}

// Total savings (a straight line, since savings are the same every year) against
// the system cost. Where they cross is the payback year; the shaded area after it
// is the net gain. Drawn on a fixed 480 × 230 canvas that scales with the card.
function PaybackChart({ savings, total }) {
    const left = 40;
    const right = 460;
    const base = 190;
    const top = 35;

    const lifetime = savings.lifetimeSavings;
    const max = Math.max(lifetime, total, 1);
    const yOf = (value) => base - ((base - top) * value) / max;

    const costY = yOf(total);
    const endY = yOf(lifetime);
    const pays = savings.paybackYears !== null && savings.paybackYears <= SYSTEM_LIFE_YEARS;
    const crossX = pays ? left + ((right - left) * savings.paybackYears) / SYSTEM_LIFE_YEARS : null;

    // The net gain label fits in the shaded area only when it's tall enough;
    // otherwise the card shows it in the legend instead (see netGainFitsChart)
    const showGainLabel = netGainFitsChart(savings, total);
    // Keep the payback year label clear of the "Year 0" and "Year 25" labels
    const showCrossLabel = pays && crossX > left + 62 && crossX < right - 62;

    const summary = pays
        ? `Total savings pass the system cost at year ${formatDecimal(Math.round(savings.paybackYears * 10) / 10)} and reach ${peso(lifetime)} by year ${SYSTEM_LIFE_YEARS}`
        : `Total savings reach ${peso(lifetime)} by year ${SYSTEM_LIFE_YEARS}, below the system cost of ${peso(total)}`;

    return (
        <svg viewBox="0 0 480 230" width="100%" role="img" aria-label={summary} style={{ display: 'block', fontFamily: 'inherit' }}>
            <line x1={left} y1={base} x2={right} y2={base} stroke={C.fieldBorder} strokeWidth="1" />
            {pays && (
                <polygon points={`${crossX},${costY} ${right},${endY} ${right},${costY}`} fill={C.green} fillOpacity="0.14" />
            )}
            <line x1={left} y1={costY} x2={right} y2={costY} stroke={C.muted} strokeWidth="1.5" strokeDasharray="5 4" />
            <line x1={left} y1={base} x2={right} y2={endY} stroke={C.green} strokeWidth="3" strokeLinecap="round" />
            {pays && (
                <>
                    <line x1={crossX} y1={costY} x2={crossX} y2={base} stroke={C.ink} strokeWidth="1" strokeDasharray="2 3" />
                    <circle cx={crossX} cy={costY} r="6" fill="#fff" stroke={C.ink} strokeWidth="2" />
                </>
            )}

            <text x={left + 4} y={Math.max(costY - 8, 14)} fontSize="12" fill={C.muted}>System cost {peso(total)}</text>
            <text x={right - 4} y={Math.max(endY - 9, 14)} fontSize="12" fill={C.green} fontWeight="600" textAnchor="end">
                Total saved {peso(lifetime)}
            </text>
            {showGainLabel && (
                <text x={right - 8} y={costY - 12} fontSize="12" fill={C.ink} fontWeight="600" textAnchor="end">
                    {netGainLabel(savings)}
                </text>
            )}

            <text x={left} y="210" fontSize="12" fill={C.muted}>Year 0</text>
            {showCrossLabel && (
                <text x={crossX} y="210" fontSize="12" fill={C.ink} fontWeight="600" textAnchor="middle">
                    Year {formatDecimal(Math.round(savings.paybackYears * 10) / 10)}
                </text>
            )}
            <text x={right} y="210" fontSize="12" fill={C.muted} textAnchor="end">Year {SYSTEM_LIFE_YEARS}</text>
        </svg>
    );
}

const styles = {
    header: {
        padding: '24px 28px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'center', gap: '12px 24px', borderBottom: `1px solid ${C.border}`,
    },
    title: { margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.015em', color: C.ink },
    ratePill: { fontSize: '14px', color: C.body, background: C.softBg, padding: '6px 12px', borderRadius: '999px' },
    // Flex items grow to fill each row, so the 1px-gap dividers never leave
    // an empty grey cell when the items wrap
    split: { display: 'flex', flexWrap: 'wrap', gap: '1px', background: C.border },
    column: {
        flex: '1 1 340px', background: '#fff', padding: '28px', display: 'flex', flexDirection: 'column',
        gap: '22px', fontVariantNumeric: 'tabular-nums', minWidth: 0,
    },
    bigNumber: { fontSize: '52px', lineHeight: 1.05, fontWeight: 700, letterSpacing: '-.03em', whiteSpace: 'nowrap' },
    bar: { display: 'flex', height: '64px', borderRadius: '10px', overflow: 'hidden' },
    segment: {
        color: C.ink, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 14px', boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap',
    },
    billPlaceholder: {
        border: `1px dashed ${C.fieldBorder}`, borderRadius: '10px', padding: '16px',
        fontSize: '13.5px', lineHeight: 1.5, color: C.muted, background: C.fieldBg,
    },
    legend: { display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '13px', color: C.body },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    stats: { display: 'flex', flexWrap: 'wrap', gap: '1px', background: C.border, borderTop: `1px solid ${C.border}` },
    stat: {
        flex: '1 1 200px', background: '#fff', padding: '18px 28px', display: 'flex', flexDirection: 'column',
        gap: '2px', fontVariantNumeric: 'tabular-nums',
    },
    footer: {
        padding: '16px 28px', background: C.fieldBg, borderTop: `1px solid ${C.border}`,
        fontSize: '13px', lineHeight: 1.6, color: C.muted,
    },
};
