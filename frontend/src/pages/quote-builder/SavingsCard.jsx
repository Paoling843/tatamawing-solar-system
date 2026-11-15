import { useState } from 'react';
import {
    DEFAULT_RATE_PER_KWH, PEAK_SUN_HOURS, SYSTEM_LIFE_YEARS, DAYS_PER_MONTH,
    formatWhole, formatDecimal, peso,
} from '../../services/solarEngine';
import { Q, qs } from './calcTheme';

// STEP 3 — "Your estimated savings".
//   Left:   monthly and yearly savings, the payback period and the net gain,
//           and how much of the current bill solar covers (when a bill was entered)
//   Right:  "Are you ahead yet?" — where the customer stands each year
//           (savings so far minus the price), with a tooltip per year
// savings comes from computeSavings() in solarEngine.js; total is the quote total.
// Look from the "Customer · Request quotation, step 3" mockup.
export default function SavingsCard({ savings, total, onEditBills }) {
    // Energy solar covers: the daytime it powers plus the night the battery carries
    const usedKwh = ((savings.dayCoveredWh + savings.nightCoveredWh) / 1000) * DAYS_PER_MONTH;
    const roundOne = (n) => formatDecimal(Math.round(n * 10) / 10);
    const ownRate = savings.rateSource === 'bill';

    return (
        <section aria-labelledby="save-h" style={qs.card}>
            <div style={{ ...qs.cardHead, alignItems: 'center' }}>
                <h2 id="save-h" style={qs.h2}>Your estimated savings</h2>
                <span style={styles.ratePill}>
                    {ownRate ? 'Your rate' : 'SORECO rate'}: ₱{savings.rate.toFixed(2)}/kWh
                </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div style={styles.left}>
                    <div>
                        <div style={{ color: Q.muted }}>Monthly savings</div>
                        <div style={{ ...styles.big, color: Q.green }}>{peso(savings.monthlySavings)}</div>
                        <div style={{ color: Q.body }}>{peso(savings.annualSavings)} a year</div>
                    </div>
                    <div>
                        <div style={{ color: Q.muted }}>Pays for itself in</div>
                        <div style={styles.big}>
                            {savings.paybackYears !== null ? roundOne(savings.paybackYears) : '—'}
                            {savings.paybackYears !== null && <span style={{ fontSize: '18px' }}> years</span>}
                        </div>
                        <div style={{ color: Q.body }}>
                            Net {savings.netGain >= 0 ? 'gain' : 'loss'} over {SYSTEM_LIFE_YEARS} years:{' '}
                            <strong style={{ color: savings.netGain >= 0 ? '#1F6B45' : Q.danger }}>{peso(Math.abs(savings.netGain))}</strong>
                        </div>
                    </div>

                    <BillBar savings={savings} />

                    {!ownRate && onEditBills && (
                        <button type="button" onClick={onEditBills} style={styles.stepLink}>
                            Add your bill in Step 1 to use your own rate instead of SORECO's.{' '}
                            <span style={{ color: Q.green, fontWeight: 600 }}>Go to Step 1 →</span>
                        </button>
                    )}
                </div>

                <figure style={styles.right}>
                    <figcaption style={styles.caption}>
                        <span style={{ fontWeight: 700 }}>Are you ahead yet?</span>
                        <span style={{ fontSize: '13px', color: Q.muted }}>Savings minus what you paid, each year</span>
                    </figcaption>
                    <AheadChart annual={savings.annualSavings} total={total} payback={savings.paybackYears} />
                    <div style={styles.legend}>
                        <span style={styles.legendItem}><span style={{ width: '16px', height: '3px', background: Q.green, borderRadius: '2px' }} />Your position</span>
                        <span style={styles.legendItem}><span style={{ width: '10px', height: '10px', background: '#F6E1A6', borderRadius: '2px' }} />Still paying off</span>
                        <span style={styles.legendItem}><span style={{ width: '10px', height: '10px', background: '#CFE8DA', borderRadius: '2px' }} />In profit</span>
                    </div>
                </figure>
            </div>

            <dl style={styles.stats}>
                <Stat label="Solar produces" value={formatWhole(savings.productionKwh)} unit="kWh a month" />
                <Stat label="You use from solar" value={formatWhole(usedKwh)} unit="kWh a month" divider />
                <Stat label="Still from SORECO" value={formatWhole(savings.gridKwh)} unit="kWh a month" divider good={savings.gridKwh < 0.5} />
                <Stat label="Sun hours" value={formatDecimal(PEAK_SUN_HOURS)} unit="a day" divider />
            </dl>
            <p style={styles.footer}>
                Estimates only. Solar covers your daytime use first, then charges the battery for the night.
                Results vary with weather and usage.
                {!ownRate && <> Based on SORECO's ₱{DEFAULT_RATE_PER_KWH}/kWh rate.</>}
            </p>
        </section>
    );
}

function Stat({ label, value, unit, divider, good }) {
    return (
        <div style={{ padding: '14px 20px', marginLeft: '-1px', ...(divider ? { borderLeft: `1px solid ${Q.rowLine}` } : {}) }}>
            <dt style={{ fontSize: '13px', color: Q.muted }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 700, color: good ? '#1F6B45' : Q.ink }}>
                {value} <span style={{ fontSize: '13px', fontWeight: 500, color: Q.muted }}>{unit}</span>
            </dd>
        </div>
    );
}

// Current bill split into "covered by solar" and "new bill".
// Needs a bill amount from Step 1; without one there is nothing to split.
function BillBar({ savings }) {
    if (savings.monthlyBill === null) return null;

    const coveredPct = savings.monthlyBill > 0 ? (savings.monthlySavings / savings.monthlyBill) * 100 : 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: Q.body }}>
                <span>{savings.billCount > 1 ? 'Average monthly bill' : 'Current monthly bill'}</span>
                <strong>{peso(savings.monthlyBill)}</strong>
            </div>
            <div
                role="img"
                aria-label={`Solar covers ${Math.round(coveredPct)}% of your bill. New bill ${peso(savings.newMonthlyBill)}`}
                style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#F0F0EC', margin: '6px 0 4px' }}
            >
                <span style={{ width: `${Math.min(100, coveredPct)}%`, background: Q.gold }} />
            </div>
            <div style={{ fontSize: '13px', color: Q.muted }}>
                {Math.round(coveredPct)}% lower bill · new bill {peso(savings.newMonthlyBill)}
            </div>
        </div>
    );
}

// Where the customer stands at the end of each year: savings so far minus the
// price. Below ₱0 they're still paying it off; it crosses ₱0 at the payback year.
// Drawn on a 600 × 250 canvas that scales with the card.
const L = 56; const R = 584; const T = 14; const B = 226;

function niceStep(range) {
    const raw = range / 4;
    const pow = 10 ** Math.floor(Math.log10(raw || 1));
    return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) || raw;
}

const shortPeso = (v) => {
    const a = Math.abs(v);
    const text = a >= 1000000 ? `₱${formatDecimal(Math.round(a / 100000) / 10)}M` : a >= 1000 ? `₱${Math.round(a / 1000)}k` : `₱${Math.round(a)}`;
    return v < 0 ? `−${text}` : text;
};

function AheadChart({ annual, total, payback }) {
    const [hover, setHover] = useState(null);
    const netAt = (yr) => annual * yr - total;
    const end = netAt(SYSTEM_LIFE_YEARS);

    const step = niceStep(Math.max(end, 0) - Math.min(-total, 0));
    const lo = Math.floor(Math.min(-total, 0) / step) * step;
    const hi = Math.ceil(Math.max(end, 0) / step) * step || step;
    const X = (yr) => L + (yr / SYSTEM_LIFE_YEARS) * (R - L);
    const Y = (v) => T + ((hi - v) / (hi - lo)) * (B - T);
    const f = (n) => n.toFixed(1);
    const ticks = [];
    for (let v = lo; v <= hi + 1; v += step) ticks.push(v);

    const zeroY = Y(0);
    const pays = payback !== null && payback <= SYSTEM_LIFE_YEARS;
    const payX = pays ? X(payback) : null;
    const lossEnd = pays ? payX : X(SYSTEM_LIFE_YEARS);
    const summary = pays
        ? `You start ${peso(total)} behind. Savings cover the cost in year ${formatDecimal(Math.round(payback * 10) / 10)}. By year ${SYSTEM_LIFE_YEARS} you are ${peso(end)} ahead.`
        : `You start ${peso(total)} behind and are still ${peso(-end)} behind after ${SYSTEM_LIFE_YEARS} years.`;
    const hn = hover === null ? null : netAt(hover);

    return (
        <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
            <p style={qs.srOnly}>{summary}</p>
            <svg viewBox="0 0 600 250" aria-hidden="true" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', fontFamily: 'inherit' }}>
                {ticks.map((v) => (
                    <g key={v}>
                        <line x1={L} x2={R} y1={f(Y(v))} y2={f(Y(v))} stroke={v === 0 ? Q.body : '#EEEEEA'} strokeWidth={v === 0 ? 1.5 : 1} />
                        <text x={L - 8} y={f(Y(v) + 4)} fontSize="11" textAnchor="end" fill={v === 0 ? Q.ink : Q.subtle} fontWeight={v === 0 ? 700 : 400}>
                            {v === 0 ? '₱0' : shortPeso(v)}
                        </text>
                    </g>
                ))}
                {/* Shaded below ₱0 while paying off, above it once in profit */}
                <polygon points={`${f(X(0))},${f(zeroY)} ${f(X(0))},${f(Y(-total))} ${f(lossEnd)},${f(pays ? zeroY : Y(end))} ${f(lossEnd)},${f(zeroY)}`} fill="#F6E1A6" />
                {pays && <polygon points={`${f(payX)},${f(zeroY)} ${f(X(SYSTEM_LIFE_YEARS))},${f(Y(end))} ${f(X(SYSTEM_LIFE_YEARS))},${f(zeroY)}`} fill="#CFE8DA" />}
                <line x1={f(X(0))} y1={f(Y(-total))} x2={f(X(SYSTEM_LIFE_YEARS))} y2={f(Y(end))} stroke={Q.green} strokeWidth="3" strokeLinecap="round" />
                <circle cx={f(X(0))} cy={f(Y(-total))} r="5" fill={Q.green} />
                <circle cx={f(X(SYSTEM_LIFE_YEARS))} cy={f(Y(end))} r="5" fill={Q.green} />
                <text x={f(X(0) + 10)} y={f(Y(-total) + 4)} fontSize="12" fontWeight="700" fill="#6B4500">−{peso(total)}</text>
                <text x={f(X(SYSTEM_LIFE_YEARS))} y={f(Y(end) - 10)} fontSize="12" fontWeight="700" fill={end >= 0 ? Q.green : Q.danger} textAnchor="end">
                    {end >= 0 ? '+' : '−'}{peso(Math.abs(end))}
                </text>
                {pays && (
                    <>
                        <line x1={f(payX)} x2={f(payX)} y1={f(zeroY)} y2={f(zeroY - 30)} stroke={Q.green} strokeWidth="1.5" strokeDasharray="3 3" />
                        <rect x={f(Math.min(Math.max(payX - 56, L), R - 112))} y={f(zeroY - 52)} width="112" height="22" rx="4" fill={Q.green} />
                        <text x={f(Math.min(Math.max(payX, L + 56), R - 56))} y={f(zeroY - 37)} fontSize="12" fontWeight="700" fill="#FFFFFF" textAnchor="middle">
                            Paid off · yr {formatDecimal(Math.round(payback * 10) / 10)}
                        </text>
                        <circle cx={f(payX)} cy={f(zeroY)} r="7" fill="#FFFFFF" stroke={Q.green} strokeWidth="3" />
                    </>
                )}
                {hn !== null && (
                    <>
                        <line x1={f(X(hover))} x2={f(X(hover))} y1={T} y2={B} stroke={Q.body} strokeWidth="1" />
                        <circle cx={f(X(hover))} cy={f(Y(hn))} r="6" fill={hn >= 0 ? '#1F6B45' : '#B07A12'} stroke="#FFFFFF" strokeWidth="2" />
                    </>
                )}
                {[0, 5, 10, 15, 20, 25].map((k) => (
                    <text key={k} x={f(X(k))} y="244" fontSize="11" fill={Q.subtle} textAnchor="middle">{k === 0 ? 'Today' : `Yr ${k}`}</text>
                ))}
            </svg>

            {/* One invisible target per year, for the tooltip (mouse or Tab) */}
            <div style={styles.hits}>
                {Array.from({ length: SYSTEM_LIFE_YEARS + 1 }, (_, k) => {
                    const n = netAt(k);
                    return (
                        <button
                            key={k}
                            type="button"
                            onMouseEnter={() => setHover(k)}
                            onFocus={() => setHover(k)}
                            onBlur={() => setHover(null)}
                            aria-label={`Year ${k}: ${n >= 0 ? `ahead by ${peso(n)}` : `${peso(-n)} left to pay off`}`}
                            style={styles.hit}
                        />
                    );
                })}
            </div>

            {hn !== null && (
                <div
                    role="status"
                    style={{
                        ...styles.tip,
                        left: `${(X(hover) / 600) * 100}%`,
                        transform: hover > 18 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
                    }}
                >
                    <div style={{ fontWeight: 700 }}>{hover === 0 ? 'Today' : `Year ${hover}`}</div>
                    <div style={{ color: Q.body }}>Saved {peso(annual * hover)}</div>
                    <div style={{ fontWeight: 700, color: hn >= 0 ? '#1F6B45' : '#6B4500' }}>
                        {hn >= 0 ? `Ahead by ${peso(hn)}` : `${peso(-hn)} left to pay off`}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    ratePill: { fontSize: '13px', fontWeight: 600, color: Q.body, background: '#F3F4F1', borderRadius: '6px', padding: '5px 10px' },
    left: { flex: '1 1 300px', minWidth: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
    big: { fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap' },
    stepLink: {
        display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: `1px dashed ${Q.control}`,
        borderRadius: '6px', background: 'transparent', color: Q.body, fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
    },
    right: { flex: '2 1 460px', minWidth: 0, margin: 0, padding: '18px 20px 20px', borderLeft: `1px solid ${Q.rowLine}` },
    caption: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px 16px', marginBottom: '4px' },
    legend: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: '8px', fontSize: '13px', color: Q.body },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
    // Lines up with the plot area (x 56–584 of 600, y 14–226 of 250)
    hits: {
        position: 'absolute', left: `${((L - (R - L) / 50) / 600) * 100}%`, right: `${((600 - R - (R - L) / 50) / 600) * 100}%`,
        top: 0, bottom: '10%', display: 'grid', gridTemplateColumns: `repeat(${SYSTEM_LIFE_YEARS + 1}, minmax(0, 1fr))`,
    },
    hit: { padding: 0, border: 'none', background: 'transparent', cursor: 'crosshair' },
    tip: {
        position: 'absolute', top: '-6px', background: '#FFFFFF', border: `1px solid ${Q.line}`, borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(15,61,46,0.12)', padding: '8px 10px', fontSize: '12px', whiteSpace: 'nowrap', pointerEvents: 'none',
    },
    stats: {
        margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        borderTop: `1px solid ${Q.line}`, overflow: 'hidden',
    },
    footer: {
        margin: 0, padding: '12px 20px', borderTop: `1px solid ${Q.rowLine}`, background: Q.headBg,
        borderRadius: '0 0 6px 6px', fontSize: '13px', color: Q.muted,
    },
};
