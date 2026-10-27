import { formatWhole, formatDecimal, panelsForInverterSize } from '../../services/solarEngine';
import { C, NUM, SANS, s } from './engineStyles';

const GRID = 'minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,0.75fr) minmax(0,0.45fr) minmax(0,0.95fr) minmax(0,1.2fr) minmax(0,1.2fr)';

// STEP 2 — shows the arithmetic behind the total: one line per appliance
// with "watts × qty" and "watts × qty × hours" spelled out, then the ledger.
export default function ComputationStep({ rows, load, onBack, onNext }) {
    const ledger = [
        { label: 'TOTAL DAYTIME', value: load.day, unit: 'Wh', formula: 'sum of daytime Wh · 08:00–16:00' },
        { label: 'TOTAL NIGHTTIME', value: load.night, unit: 'Wh', formula: 'sum of nighttime Wh · 16:00–08:00' },
        { label: 'TOTAL LOAD', value: load.inverterSize, unit: 'W', formula: 'sizes the inverter', highlight: true },
        { label: 'PANELS', value: panelsForInverterSize(load.inverterSize), unit: 'panels', formula: 'total load ÷ 610 W, rounded down' },
    ];

    return (
        <div className="se-page" style={s.stepPage('1160px')}>
            <div style={s.eyebrow}>STEP 02 · COMPUTATION</div>
            <h1 className="se-h1" style={s.h1}>How the total was reached.</h1>
            <p style={s.lead}>
                Daytime and nighttime energy are each wattage × quantity × hours used. Total load is wattage ×
                quantity, everything running at once, and sizes the inverter.
            </p>

            {/* ----- Per-appliance breakdown ----- */}
            <div style={{ ...s.card, overflow: 'hidden', marginTop: '36px' }}>
                <div className="se-table-scroll">
                    <div style={{ minWidth: '860px' }}>
                        <div style={styles.head}>
                            <div>APPLIANCE</div>
                            <div>BASIS</div>
                            <div style={{ textAlign: 'right' }}>WATTS</div>
                            <div style={{ textAlign: 'right' }}>QTY</div>
                            <div style={{ textAlign: 'right' }}>TOTAL LOAD</div>
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
                                    <FormulaCell value={`${formatWhole(c.rowWatts)} W`} formula={`${formatWhole(c.watts)} × ${c.qty}`} />
                                    <EnergyCell wh={c.dayWh} watts={c.watts} qty={c.qty} hours={c.dayHours} emptyText="no daytime use" />
                                    <EnergyCell wh={c.nightWh} watts={c.watts} qty={c.qty} hours={c.nightHours} emptyText="no nighttime use" />
                                </div>
                            );
                        })}

                        <div style={styles.totals}>
                            <div style={{ fontFamily: SANS, fontWeight: 700, color: C.ink }}>Totals</div>
                            <div /><div /><div />
                            <div style={{ textAlign: 'right', color: C.ink }}>{formatWhole(load.totalLoad)} W</div>
                            <div style={{ textAlign: 'right', color: C.ink }}>{formatWhole(load.day)}</div>
                            <div style={{ textAlign: 'right', color: C.ink }}>{formatWhole(load.night)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ----- Four-box ledger ----- */}
            <div style={styles.ledger}>
                {ledger.map((box) => (
                    <div key={box.label} style={styles.ledgerBox(box.highlight)}>
                        <div style={{ fontFamily: NUM, fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', color: box.highlight ? C.onDark : C.muted }}>
                            {box.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '12px' }}>
                            <span style={{ fontFamily: NUM, fontSize: '27px', fontWeight: 600, letterSpacing: '-.03em', color: box.highlight ? C.yellow : C.ink }}>
                                {formatWhole(box.value)}
                            </span>
                            <span style={{ fontSize: '12px', color: box.highlight ? C.onDark : C.muted }}>{box.unit}</span>
                        </div>
                        <div style={{ fontFamily: NUM, fontSize: '12.5px', color: box.highlight ? C.onDark : C.muted, marginTop: '6px' }}>
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
        <FormulaCell
            value={formatWhole(wh)}
            formula={hours ? `${formatWhole(watts)} × ${qty} × ${formatDecimal(hours)} h` : emptyText}
        />
    );
}

// A figure with the formula that produced it underneath
function FormulaCell({ value, formula }) {
    return (
        <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontFamily: NUM, color: C.ink }}>{value}</div>
            <div style={{ fontFamily: NUM, fontSize: '12px', color: C.muted, marginTop: '4px' }}>{formula}</div>
        </div>
    );
}

const styles = {
    head: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '13px 20px', background: C.fieldBg,
        borderBottom: `1px solid ${C.borderSoft}`, fontFamily: NUM, fontSize: '11.5px', lineHeight: 1.5,
        fontWeight: 600, letterSpacing: '.05em', color: C.muted, alignItems: 'end',
    },
    row: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '15px 20px',
        borderBottom: `1px solid ${C.rowBorder}`, fontSize: '14px', alignItems: 'start',
    },
    name: { color: C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    figure: { fontFamily: NUM, textAlign: 'right', color: C.body },
    totals: {
        display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '16px 20px', background: C.fieldBg,
        fontFamily: NUM, fontSize: '14px',
    },
    // 1px gaps on a border-coloured background draw the dividers, so boxes
    // that wrap onto new rows (or stack on phones) never keep a stray border.
    // Flex items grow to fill each row, so no empty grey cell is left over.
    ledger: {
        display: 'flex', flexWrap: 'wrap', gap: '1px', background: C.borderSoft,
        border: `1px solid ${C.border}`, borderRadius: '13px', overflow: 'hidden', marginTop: '20px',
    },
    ledgerBox: (highlight) => ({
        flex: '1 1 140px',
        padding: '22px 24px',
        background: highlight ? C.green : '#fff',
    }),
};
