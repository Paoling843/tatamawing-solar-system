import { formatWhole, formatDecimal, formatHour, panelsForInverterSize, PANEL_WATTS } from '../../services/solarEngine';
import StepBanner from './StepBanner';
import { ArrowGlyph } from './ApplianceLoadStep';
import { Q, qs } from './calcTheme';

// STEP 2 — shows the arithmetic behind the total: one line per appliance
// with "watts × qty" and "watts × qty × hours" spelled out, then the four
// numbers that decide the package.
// Look from the "Customer · Request quotation, step 2" mockup.
export default function ComputationStep({ rows, load, timeFormat = '24', onBack, onNext }) {
    const hour = (h) => formatHour(h, timeFormat);
    const panels = panelsForInverterSize(load.inverterSize);

    return (
        <div className="se-step" style={qs.page}>
            <StepBanner
                screen="compute"
                title="How we worked out your system"
                subtitle="Check the numbers before we match you with a package"
            />

            {/* ----- Per-appliance breakdown ----- */}
            <section aria-labelledby="calc-h" style={qs.card}>
                <div style={{ ...qs.cardHead, borderBottom: 'none' }}>
                    <div>
                        <h2 id="calc-h" style={qs.h2}>Your appliances</h2>
                        <p style={qs.sub}>Two numbers come from each appliance:</p>
                    </div>
                    <dl style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={styles.keyChip('#F3F8F5', '#DCEAE2')}>
                            <dt style={{ fontWeight: 700, color: Q.green }}>Load</dt>
                            <dd style={{ margin: 0, color: Q.body }}>watts × quantity</dd>
                        </div>
                        <div style={styles.keyChip('#FFFBF0', '#F1DFB0')}>
                            <dt style={{ fontWeight: 700, color: '#6B4500' }}>Energy</dt>
                            <dd style={{ margin: 0, color: Q.body }}>watts × quantity × hours used</dd>
                        </div>
                    </dl>
                </div>
                <div className="se-table-scroll">
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.headRow}>
                                <th scope="col" style={{ ...styles.th, paddingLeft: '20px' }}>Appliance</th>
                                <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Watts</th>
                                <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Qty</th>
                                <th scope="col" style={{ ...styles.th, textAlign: 'right', color: Q.green }}>Load</th>
                                <th scope="col" style={{ ...styles.th, textAlign: 'right', color: '#6B4500' }}>Daytime energy</th>
                                <th scope="col" style={{ ...styles.th, textAlign: 'right', color: '#1F4E80', paddingRight: '20px' }}>Nighttime energy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => {
                                // load.rows[i] holds the computed numbers for rows[i]
                                const c = load.rows[i];
                                return (
                                    <tr key={row.id}>
                                        <th scope="row" style={{ ...styles.td, paddingLeft: '20px', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 400, color: Q.muted }}>
                                                {c.usesHp ? `${Number(row.hp)} hp × 800 W` : 'From the label'}
                                            </div>
                                        </th>
                                        <td style={styles.tdNum}>{formatWhole(c.watts)} W</td>
                                        <td style={styles.tdNum}>{c.qty}</td>
                                        <FormulaCell value={`${formatWhole(c.rowWatts)} W`} formula={`${formatWhole(c.watts)} × ${c.qty}`} />
                                        <EnergyCell wh={c.dayWh} watts={c.watts} qty={c.qty} hours={c.dayHours} />
                                        <EnergyCell wh={c.nightWh} watts={c.watts} qty={c.qty} hours={c.nightHours} last />
                                    </tr>
                                );
                            })}
                            <tr style={{ background: Q.headBg }}>
                                <th scope="row" colSpan={3} style={{ ...styles.totalCell, paddingLeft: '20px', textAlign: 'left' }}>Total</th>
                                <td style={{ ...styles.totalCell, textAlign: 'right' }}>{formatWhole(load.totalLoad)} W</td>
                                <td style={{ ...styles.totalCell, textAlign: 'right', color: load.day ? Q.ink : Q.subtle }}>{formatWhole(load.day)} Wh</td>
                                <td style={{ ...styles.totalCell, textAlign: 'right', paddingRight: '20px', color: load.night ? Q.ink : Q.subtle }}>
                                    {formatWhole(load.night)} Wh
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ----- The four numbers ----- */}
            <section aria-labelledby="res-h" style={qs.card}>
                <div style={{ padding: '18px 20px 14px' }}>
                    <h2 id="res-h" style={qs.h2}>What your home needs</h2>
                    <p style={qs.sub}>These four numbers decide your package</p>
                </div>
                <dl style={styles.needs}>
                    <Need
                        label="Daytime energy"
                        value={formatWhole(load.day)}
                        unit="Wh"
                        note={`Used ${hour(8)} – ${hour(16)}, covered by the panels${load.day ? '' : '. Nothing set yet.'}`}
                        style={{ borderLeft: '4px solid #D49A23' }}
                        dim={!load.day}
                    />
                    <Need
                        label="Nighttime energy"
                        value={formatWhole(load.night)}
                        unit="Wh"
                        note={`Used ${hour(16)} – ${hour(8)}, from the battery${load.night ? '' : '. Nothing set yet.'}`}
                        style={styles.needDivider}
                        dim={!load.night}
                    />
                    <Need
                        label="Inverter size"
                        value={formatWhole(load.inverterSize)}
                        unit="W"
                        note={`${formatWhole(load.totalLoad)} W load + 2,000 W safety buffer`}
                        dark
                    />
                    <Need
                        label="Solar panels"
                        value={panels}
                        unit="panels"
                        note={`${formatWhole(load.inverterSize)} W ÷ ${PANEL_WATTS} W per panel, rounded down`}
                        style={styles.needDivider}
                    />
                </dl>
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <button type="button" className="c-btn c-btn-secondary" onClick={onBack} style={{ ...qs.bigBtn, fontWeight: 600, padding: '0 16px' }}>
                    <BackGlyph />
                    Edit appliances
                </button>
                <button type="button" className="c-btn c-btn-primary" onClick={onNext} style={qs.bigBtn}>
                    See recommended package
                    <ArrowGlyph />
                </button>
            </div>
        </div>
    );
}

// One Wh figure with its formula underneath, e.g. "2,400 × 1 × 8 h"
function EnergyCell({ wh, watts, qty, hours, last }) {
    if (!hours) {
        return (
            <td style={{ ...styles.tdNum, ...(last ? { paddingRight: '20px' } : {}) }}>
                <div style={{ fontWeight: 700, color: Q.subtle }}>Not used</div>
            </td>
        );
    }
    return (
        <FormulaCell
            value={`${formatWhole(wh)} Wh`}
            formula={`${formatWhole(watts)} × ${qty} × ${formatDecimal(hours)} h`}
            last={last}
        />
    );
}

// A figure with the formula that produced it underneath
function FormulaCell({ value, formula, last }) {
    return (
        <td style={{ ...styles.tdNum, ...(last ? { paddingRight: '20px' } : {}) }}>
            <div style={{ fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: '12px', color: Q.subtle }}>{formula}</div>
        </td>
    );
}

function Need({ label, value, unit, note, dark, dim, style }) {
    return (
        <div style={{ padding: '16px 20px', minWidth: 0, ...(dark ? { background: Q.green, color: '#FFFFFF' } : {}), ...style }}>
            <dt style={{ fontSize: '13px', fontWeight: 600, color: dark ? Q.stripText : Q.muted }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontSize: '28px', fontWeight: 700, lineHeight: 1.2, color: dark ? Q.gold : dim ? Q.subtle : Q.ink }}>
                {value} <span style={{ fontSize: '15px', fontWeight: 600, color: dark ? '#FFFFFF' : Q.muted }}>{unit}</span>
            </dd>
            <dd style={{ margin: '2px 0 0', fontSize: '13px', color: dark ? Q.stripText : Q.muted }}>{note}</dd>
        </div>
    );
}

function BackGlyph() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
        </svg>
    );
}

const styles = {
    keyChip: (bg, border) => ({
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: bg,
        border: `1px solid ${border}`, borderRadius: '6px',
    }),
    table: { width: '100%', minWidth: '860px', borderCollapse: 'collapse' },
    headRow: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: Q.muted, background: Q.headBg },
    th: { textAlign: 'left', fontWeight: 600, padding: '10px 12px', borderTop: `1px solid ${Q.line}`, borderBottom: `1px solid ${Q.line}` },
    td: { padding: '14px 12px', borderBottom: `1px solid ${Q.rowLine}`, verticalAlign: 'top' },
    tdNum: { padding: '14px 12px', borderBottom: `1px solid ${Q.rowLine}`, verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' },
    totalCell: { padding: '12px', fontWeight: 700 },
    // marginLeft -1px hides the divider of whichever cell starts a wrapped row
    needs: {
        margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        borderTop: `1px solid ${Q.line}`, overflow: 'hidden', borderRadius: '0 0 6px 6px',
    },
    needDivider: { borderLeft: `1px solid ${Q.rowLine}` },
};
