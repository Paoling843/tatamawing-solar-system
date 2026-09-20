import { formatWhole, formatDecimal } from '../../services/solarEngine';
import { C, MONO, SANS, s } from './engineStyles';

const GRID = 'minmax(0,1.7fr) minmax(0,0.9fr) minmax(0,0.75fr) minmax(0,0.45fr) minmax(0,1.25fr) minmax(0,1.25fr)';

// STEP 2 — shows the arithmetic behind the total: one line per appliance
// with "watts × qty × hours" spelled out, then the four-box ledger.
export default function ComputationStep({ rows, load, onBack, onNext }) {
    const ledger = [
        { label: 'TOTAL DAYTIME', value: load.day, formula: 'sum of daytime Wh · 08:00–16:00' },
        { label: 'TOTAL NIGHTTIME', value: load.night, formula: 'sum of nighttime Wh · 16:00–08:00' },
        { label: 'GRAND TOTAL', value: load.grand, formula: 'day + night' },
        { label: 'ADJUSTED TOTAL', value: load.adjusted, formula: 'grand + 2,000 buffer', highlight: true },
    ];

    return (
        <div className="se-page" style={s.stepPage('1160px')}>
            <div style={s.eyebrow}>STEP 02 · COMPUTATION</div>
            <h1 className="se-h1" style={s.h1}>How the total was reached.</h1>
            <p style={s.lead}>
                Every appliance is split into the energy it draws while the sun is up and the energy it draws
                after dark. Each figure is its wattage × how many units you have × the hours it runs in that
                window; the daytime and nighttime columns are then summed on their own. Nothing is rounded
                until the final figure.
            </p>

            {/* ----- Per-appliance breakdown ----- */}
            <div style={{ ...s.card, overflow: 'hidden', marginTop: '36px' }}>
                <div className="se-table-scroll">
                    <div style={{ minWidth: '760px' }}>
                        <div style={styles.head}>
                            <div>APPLIANCE</div>
                            <div>BASIS</div>
                            <div style={{ textAlign: 'right' }}>WATTS</div>
                            <div style={{ textAlign: 'right' }}>QTY</div>
                            <div style={{ textAlign: 'right' }}>DAYTIME Wh</div>
                            <div style={{ textAlign: 'right' }}>NIGHTTIME Wh</div>
                        </div>

                        {rows.map((row, i) => {
                            // load.rows[i] holds the computed numbers for rows[i]
                            const c = load.rows[i];
                            return (
                                <div key={row.id} style={styles.row}>
                                    <div style={styles.name}>{c.name}</div>
                                    <div style={{ fontSize: '13px', color: C.muted }}>
                                        {c.usesHp ? `${Number(row.hp)} hp` : 'entered'}
                                    </div>
                                    <div style={styles.figure}>{formatWhole(c.watts)} W</div>
                                    <div style={styles.figure}>{c.qty}</div>
                                    <EnergyCell wh={c.dayWh} watts={c.watts} qty={c.qty} hours={c.dayHours} emptyText="no daytime use" />
                                    <EnergyCell wh={c.nightWh} watts={c.watts} qty={c.qty} hours={c.nightHours} emptyText="no nighttime use" />
                                </div>
                            );
                        })}

                        <div style={styles.totals}>
                            <div style={{ fontFamily: SANS, fontWeight: 700, color: C.ink }}>Totals</div>
                            <div /><div /><div />
                            <div style={{ textAlign: 'right', color: C.ink }}>{formatWhole(load.day)}</div>
                            <div style={{ textAlign: 'right', color: C.ink }}>{formatWhole(load.night)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ----- Four-box ledger ----- */}
            <div style={styles.ledger}>
                {ledger.map((box, i) => (
                    <div key={box.label} style={styles.ledgerBox(box.highlight, i < ledger.length - 1)}>
                        <div style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em', color: box.highlight ? C.onDark : C.muted }}>
                            {box.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '12px' }}>
                            <span style={{ fontFamily: MONO, fontSize: '27px', fontWeight: 500, letterSpacing: '-.03em', color: box.highlight ? C.yellow : C.ink }}>
                                {formatWhole(box.value)}
                            </span>
                            <span style={{ fontSize: '12px', color: box.highlight ? C.onDark : C.muted }}>Wh</span>
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: '11.5px', color: box.highlight ? C.onDark : C.muted, marginTop: '6px' }}>
                            {box.formula}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button className="se-btn-secondary" onClick={onBack} style={s.secondaryButton}>Edit appliances</button>
                <button className="se-btn-primary" onClick={onNext} style={s.primaryButton}>
                    See recommended package <span style={{ fontSize: '17px' }}>→</span>
                </button>
            </div>
        </div>
    );
}

// One Wh figure with its formula underneath, e.g. "2,400 × 1 × 8 h"
function EnergyCell({ wh, watts, qty, hours, emptyText }) {
    return (
        <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontFamily: MONO, color: C.ink }}>{formatWhole(wh)}</div>
            <div style={{ fontFamily: MONO, fontSize: '11px', color: C.muted, marginTop: '4px' }}>
                {hours ? `${formatWhole(watts)} × ${qty} × ${formatDecimal(hours)} h` : emptyText}
            </div>
        </div>
    );
}

const styles = {
    head: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '13px 20px', background: C.fieldBg,
        borderBottom: `1px solid ${C.borderSoft}`, fontFamily: MONO, fontSize: '10px', lineHeight: 1.5,
        letterSpacing: '.08em', color: C.muted, alignItems: 'end',
    },
    row: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '15px 20px',
        borderBottom: `1px solid ${C.rowBorder}`, fontSize: '14px', alignItems: 'start',
    },
    name: { color: C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    figure: { fontFamily: MONO, textAlign: 'right', color: C.body },
    totals: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '16px 20px', background: C.fieldBg,
        fontFamily: MONO, fontSize: '14px',
    },
    ledger: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', background: '#fff',
        border: `1px solid ${C.border}`, borderRadius: '13px', overflow: 'hidden', marginTop: '20px',
    },
    ledgerBox: (highlight, hasDivider) => ({
        padding: '22px 24px',
        background: highlight ? C.green : 'transparent',
        borderRight: hasDivider ? `1px solid ${C.borderSoft}` : 'none',
    }),
};
