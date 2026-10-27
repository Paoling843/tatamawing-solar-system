import {
    APPLIANCES, HP_OPTIONS, DAY_SLOTS, NIGHT_SLOTS, PACKAGES,
    computeRow, formatHour, formatWhole, formatDecimal, monthLabel,
    recommendationReason,
} from '../../services/solarEngine';
import { C, NUM, SANS, s } from './engineStyles';

// Column widths shared by the table header and every appliance row
const GRID = 'minmax(0,1.9fr) minmax(0,0.85fr) minmax(0,0.8fr) minmax(0,0.5fr) minmax(0,1.7fr) minmax(0,1.7fr) 38px';

// STEP 1 — the appliance list, a live total on the side, and the two
// reference bills. All state lives in QuotationFormPage; this component only
// displays it and reports changes back through the on... callbacks.
export default function ApplianceLoadStep({
    rows, load, selection, timeFormat, touched, attempted, loadReady,
    bills, onTimeFormatChange, onRowChange, onTouch, onAddRow, onRemoveRow,
    onBillChange, onContinue,
}) {
    const hour = (h) => formatHour(h, timeFormat);

    // A "Required" error shows only after the customer has left the field
    // (touched) or pressed Continue (attempted) — never on a brand-new row.
    const seen = (row, key) => Boolean(touched[`${row.id}:${key}`]) || attempted;

    return (
        <div className="se-page" style={s.stepPage('1480px')}>
            <div style={s.eyebrow}>STEP 01 · APPLIANCE LOAD</div>
            <h1 className="se-h1" style={s.h1}>What does the household actually run?</h1>
            <p style={s.lead}>
                Daytime is 08:00–16:00, when the panels produce power. Nighttime is 16:00–08:00, covered
                by the battery.
            </p>
            {/* Privacy notice for the anonymous calculator tracking (quoteTracker.js) */}
            <p style={styles.privacyNote}>
                Visits are counted anonymously. Nothing that identifies you is saved until you send a request.{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.green, fontWeight: 600 }}>
                    Privacy Policy
                </a>
            </p>
            <p style={styles.privacyNote}>
                Fields marked with <span style={{ ...s.requiredMark, marginLeft: 0 }}>*</span> are required.
            </p>

            <div style={{ ...styles.layout, marginTop: '36px' }}>
                {/* ================= Appliance list ================= */}
                <div className="se-load-list" style={styles.listCard}>
                    <div style={styles.listHead}>
                        <div>
                            <div style={s.cardTitle}>Appliance list</div>
                            <div style={s.cardNote}>
                                {timeFormat === '12'
                                    ? 'Times are shown as AM / PM and submitted on the 24-hour clock.'
                                    : 'Times are shown and submitted on the 24-hour clock.'}
                            </div>
                        </div>
                        <TimeFormatToggle value={timeFormat} onChange={onTimeFormatChange} />
                    </div>

                    <div className="se-table-scroll">
                        {/* Fits a normal laptop screen; tablets scroll it sideways,
                            and on phones (engine.css) each row becomes a card */}
                        <div className="se-appl-table" style={{ minWidth: '860px' }}>
                            <div className="se-appl-head" style={styles.tableHead}>
                                <div>APPLIANCE</div>
                                <div>HP</div>
                                <div style={{ textAlign: 'right' }}>WATTS<span aria-hidden="true" style={s.requiredMark}>*</span></div>
                                <div style={{ textAlign: 'right' }}>QTY<span aria-hidden="true" style={s.requiredMark}>*</span></div>
                                <div>DAYTIME · {hour(8)}–{hour(16)}</div>
                                <div>NIGHTTIME · {hour(16)}–{hour(8)}</div>
                                <div />
                            </div>

                            {rows.length === 0 && (
                                <div style={styles.empty}>
                                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: C.ink }}>No appliances yet</div>
                                    <div style={{ fontSize: '13px', color: C.muted, marginTop: '5px' }}>
                                        Add an appliance below, then set its wattage, quantity and hours.
                                    </div>
                                </div>
                            )}

                            {rows.map((row, i) => (
                                <ApplianceRow
                                    key={row.id}
                                    row={row}
                                    isLast={i === rows.length - 1}
                                    hour={hour}
                                    wattsInvalid={seen(row, 'watts')}
                                    qtyInvalid={seen(row, 'qty')}
                                    onChange={(key, value) => onRowChange(row.id, key, value)}
                                    onTouch={(key) => onTouch(row.id, key)}
                                    onRemove={() => onRemoveRow(row.id)}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={styles.listFoot}>
                        <button className="se-btn-outline" onClick={onAddRow} style={styles.addButton}>
                            <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Add appliance
                        </button>
                        <span style={{ fontSize: '13px', color: C.sub }}>
                            Aircon and water pump: hp × 800 W. Others: the wattage on the unit's label.
                        </span>
                    </div>
                </div>

                {/* ================= Live totals (sidebar) ================= */}
                <div className="se-load-sidebar" style={styles.sidebar}>
                    <div style={styles.totalCard}>
                        <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>INVERTER SIZE</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
                            <span style={styles.totalValue}>{formatWhole(load.inverterSize)}</span>
                            <span style={{ fontSize: '13px', color: C.onDarkMuted }}>W</span>
                        </div>
                        <div style={styles.totalDivider} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                            <TotalLine label="Total load" value={`${formatWhole(load.totalLoad)} W`} />
                            <TotalLine label="Safety buffer" value="+2,000 W" />
                        </div>
                    </div>

                    <div style={{ ...s.card, borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: C.ink }}>Recommendation preview</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                            <span style={{ fontFamily: NUM, fontSize: '22px', color: C.green }}>
                                {PACKAGES[selection.recommendedPkgIndex].kw} kW
                            </span>
                            <span style={{ fontSize: '13px', color: C.sub }}>hybrid inverter</span>
                        </div>
                        <p style={{ margin: '10px 0 0', fontSize: '13px', lineHeight: 1.55, color: C.muted }}>
                            {recommendationReason(load)}
                        </p>
                    </div>
                </div>
            </div>

            {/* ================= Reference bills ================= */}
            <div style={{ ...s.card, overflow: 'hidden', marginTop: '28px' }}>
                <div style={{ padding: '18px 26px', borderBottom: `1px solid ${C.borderSoft}` }}>
                    <div style={s.cardTitle}>Recent electricity bills</div>
                    <div style={s.cardNote}>
                        Only used to estimate your savings in Step 3. Adding the kWh lets us use your actual rate.
                    </div>
                </div>
                <div style={styles.billGrid}>
                    {bills.map((bill, i) => (
                        <BillCard
                            key={i}
                            index={i}
                            bill={bill}
                            mostRecentPeriod={bills[0].period}
                            onChange={(key, e) => onBillChange(i, key, e)}
                        />
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button
                    className={loadReady ? 'se-btn-primary' : undefined}
                    onClick={onContinue}
                    style={styles.continueButton(loadReady)}
                >
                    Compute recommendation <span style={{ fontSize: '17px' }}>→</span>
                </button>
                {!loadReady && attempted && (
                    <span style={{ fontSize: '13.5px', color: C.errorText }}>
                        {rows.length
                            ? 'Fill in the wattage and quantity on every appliance to continue.'
                            : 'Add at least one appliance to continue.'}
                    </span>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------

function TimeFormatToggle({ value, onChange }) {
    const options = [{ id: '24', label: '24-hour' }, { id: '12', label: 'AM / PM' }];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <span style={{ ...s.cardEyebrow, whiteSpace: 'nowrap' }}>TIME FORMAT</span>
            <div style={styles.toggle}>
                {options.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        style={styles.toggleOption(value === option.id)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function ApplianceRow({ row, isLast, hour, wattsInvalid, qtyInvalid, onChange, onTouch, onRemove }) {
    // Recompute this row's numbers so we can show watts and hours
    const c = computeRow(row);
    const wattsMissing = !c.usesHp && !(Number(row.watts) > 0) && wattsInvalid;
    const qtyMissing = !(Number(row.qty) > 0) && qtyInvalid;

    // Hour dropdown options. "From" can't be the last slot, and "to" only
    // lists hours after the chosen "from".
    const nightLabel = (h) => hour(h) + (h >= 24 ? ' +1' : '');
    const dayFromOptions = DAY_SLOTS.slice(0, -1);
    const dayToOptions = DAY_SLOTS.filter((h) => h > (row.dayFrom === '' ? DAY_SLOTS[0] : Number(row.dayFrom)));
    const nightFromOptions = NIGHT_SLOTS.slice(0, -1);
    const nightToOptions = NIGHT_SLOTS.filter((h) => h > (row.nightFrom === '' ? NIGHT_SLOTS[0] : Number(row.nightFrom)));

    return (
        // On phones (engine.css) this grid row becomes a card: appliance on top,
        // then HP / watts / qty side by side, then the day and night hours.
        // The small labels only show there, since the table header is hidden.
        <div className="se-appl-row" style={{ ...styles.row, borderBottom: isLast ? 'none' : `1px solid ${C.rowBorder}` }}>
            {/* Appliance (+ custom name for "Other") */}
            <div className="se-appl-name" style={styles.cellStack}>
                <span className="se-m-label">Appliance</span>
                <select value={row.appliance} onChange={(e) => onChange('appliance', e.target.value)} style={s.select}>
                    {APPLIANCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                {row.appliance === 'other' && (
                    <input
                        value={row.customName}
                        onChange={(e) => onChange('customName', e.target.value)}
                        placeholder="Name the appliance"
                        style={{ ...s.select, cursor: 'text', padding: '10px 11px', fontSize: '13.5px' }}
                    />
                )}
            </div>

            {/* HP — only for aircon and water pump */}
            <div className="se-appl-hp" style={styles.cellStack}>
                <span className="se-m-label">HP</span>
                {c.usesHp ? (
                    <select value={row.hp} onChange={(e) => onChange('hp', e.target.value)} style={{ ...s.monoSelect, padding: '10px 9px', fontSize: '13.5px' }}>
                        {HP_OPTIONS.map((hp) => <option key={hp} value={String(hp)}>{hp} hp</option>)}
                    </select>
                ) : (
                    <div style={styles.naCell}>n/a</div>
                )}
            </div>

            {/* Watts — computed from HP, or typed in */}
            {c.usesHp ? (
                <div className="se-appl-watts" style={styles.cellStack}>
                    <span className="se-m-label">Watts</span>
                    <div style={styles.computedWatts}>{formatWhole(c.watts)} W</div>
                </div>
            ) : (
                <div className="se-appl-watts" style={{ ...styles.cellStack, gap: '5px' }}>
                    <span className="se-m-label">Watts<span aria-hidden="true" style={s.requiredMark}>*</span></span>
                    <input
                        value={row.watts}
                        onChange={(e) => onChange('watts', e.target.value)}
                        onBlur={() => onTouch('watts')}
                        inputMode="numeric"
                        placeholder="required"
                        aria-required="true"
                        aria-invalid={wattsMissing}
                        style={s.numberInput(wattsMissing)}
                    />
                    {wattsMissing && <span style={s.requiredNote}>Required</span>}
                </div>
            )}

            {/* Quantity */}
            <div className="se-appl-qty" style={{ ...styles.cellStack, gap: '5px' }}>
                <span className="se-m-label">Qty<span aria-hidden="true" style={s.requiredMark}>*</span></span>
                <input
                    value={row.qty}
                    onChange={(e) => onChange('qty', e.target.value)}
                    onBlur={() => onTouch('qty')}
                    inputMode="numeric"
                    placeholder="req."
                    aria-required="true"
                    aria-invalid={qtyMissing}
                    style={s.numberInput(qtyMissing)}
                />
                {qtyMissing && <span style={s.requiredNote}>Required</span>}
            </div>

            {/* Daytime hours */}
            <HourRange
                className="se-appl-day"
                title={`Daytime · ${hour(8)}–${hour(16)}`}
                from={row.dayFrom}
                to={row.dayTo}
                fromOptions={dayFromOptions}
                toOptions={dayToOptions}
                label={hour}
                hours={c.dayHours}
                onFrom={(value) => onChange('dayFrom', value)}
                onTo={(value) => onChange('dayTo', value)}
            />

            {/* Nighttime hours */}
            <HourRange
                className="se-appl-night"
                title={`Nighttime · ${hour(16)}–${hour(8)}`}
                from={row.nightFrom}
                to={row.nightTo}
                fromOptions={nightFromOptions}
                toOptions={nightToOptions}
                label={nightLabel}
                hours={c.nightHours}
                onFrom={(value) => onChange('nightFrom', value)}
                onTo={(value) => onChange('nightTo', value)}
            />

            <button className="se-btn-remove se-appl-remove" onClick={onRemove} aria-label="Remove appliance" style={styles.removeButton}>
                ×
            </button>
        </div>
    );
}

function HourRange({ className, title, from, to, fromOptions, toOptions, label, hours, onFrom, onTo }) {
    const selectStyle = { ...s.monoSelect, flex: '1 1 0', textAlign: 'center' };

    return (
        <div className={className} style={styles.cellStack}>
            <span className="se-m-label">{title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                <select value={from} onChange={(e) => onFrom(e.target.value)} style={selectStyle}>
                    <option value="">—</option>
                    {fromOptions.map((h) => <option key={h} value={String(h)}>{label(h)}</option>)}
                </select>
                <span style={{ flex: 'none', color: C.dim, fontSize: '12px' }}>→</span>
                <select value={to} onChange={(e) => onTo(e.target.value)} style={selectStyle}>
                    <option value="">—</option>
                    {toOptions.map((h) => <option key={h} value={String(h)}>{label(h)}</option>)}
                </select>
            </div>
            <div style={{ fontFamily: NUM, fontSize: '12px', color: hours ? C.green : C.dim }}>
                {hours ? `${formatDecimal(hours)} h` : 'not used'}
            </div>
        </div>
    );
}

function TotalLine({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13.5px' }}>
            <span style={{ color: C.onDark, whiteSpace: 'nowrap' }}>{label}</span>
            <span style={{ fontFamily: NUM, color: '#fff', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}

function BillCard({ index, bill, mostRecentPeriod, onChange }) {
    // Bill 2's month isn't picked: it's always the month right before bill 1
    // (QuotationFormPage keeps it in step), so it's shown as fixed text.
    const isEarlierBill = index === 1;

    const fieldStyle = {
        border: `1px solid ${C.fieldBorder}`, borderRadius: '8px', padding: '10px 9px', fontFamily: NUM,
        fontSize: '13px', color: C.ink, outline: 'none', background: '#fff', minWidth: 0, width: '100%',
    };

    return (
        <div style={styles.billCard}>
            <div style={s.cardEyebrow}>{index === 0 ? 'MOST RECENT BILL' : 'THE MONTH BEFORE'}</div>
            <div className="se-bill-fields" style={styles.billFields}>
                {isEarlierBill ? (
                    <div style={styles.billLabel}>
                        <span style={styles.billLabelText}>Billing month</span>
                        <div style={{ ...fieldStyle, background: C.softBg, color: mostRecentPeriod ? C.ink : C.dim }}>
                            {mostRecentPeriod ? monthLabel(bill.period) : '—'}
                        </div>
                        <span style={{ fontSize: '12.5px', color: C.sub }}>
                            {mostRecentPeriod ? 'Set automatically' : 'Set the most recent bill first'}
                        </span>
                    </div>
                ) : (
                    <label style={styles.billLabel}>
                        <span style={styles.billLabelText}>Billing month</span>
                        <input
                            type="month"
                            value={bill.period}
                            onChange={(e) => onChange('period', e)}
                            style={fieldStyle}
                        />
                    </label>
                )}
                <label style={styles.billLabel}>
                    <span style={styles.billLabelText}>Bill amount ₱</span>
                    <input
                        value={bill.amount}
                        onChange={(e) => onChange('amount', e)}
                        inputMode="decimal"
                        placeholder="0.00"
                        style={{ ...fieldStyle, textAlign: 'right' }}
                    />
                </label>
                <label style={styles.billLabel}>
                    <span style={styles.billLabelText}>kWh used</span>
                    <input
                        value={bill.kwh}
                        onChange={(e) => onChange('kwh', e)}
                        inputMode="decimal"
                        placeholder="—"
                        style={{ ...fieldStyle, textAlign: 'right' }}
                    />
                </label>
            </div>
        </div>
    );
}

const styles = {
    privacyNote: { margin: '10px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: C.sub, maxWidth: '660px' },
    layout: { display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'flex-start', marginTop: '36px' },
    listCard: { ...s.card, flex: '1 1 760px', minWidth: 0, overflow: 'hidden' },
    listHead: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
        padding: '18px 26px', borderBottom: `1px solid ${C.borderSoft}`, flexWrap: 'wrap',
    },
    toggle: { display: 'flex', background: C.softBg, border: `1px solid ${C.border}`, borderRadius: '9px', padding: '3px' },
    toggleOption: (active) => ({
        padding: '8px 15px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', border: 'none',
        fontFamily: SANS, fontWeight: active ? 700 : 500, color: active ? C.ink : C.muted,
        background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(16,33,26,.12)' : 'none',
    }),
    tableHead: {
        display: 'grid', gridTemplateColumns: GRID, gap: '16px', padding: '16px 26px 14px',
        background: C.fieldBg, borderBottom: `1px solid ${C.borderSoft}`, fontFamily: NUM,
        fontSize: '11.5px', lineHeight: 1.5, fontWeight: 600, letterSpacing: '.05em', color: C.faint, alignItems: 'end',
    },
    empty: { padding: '34px 26px', textAlign: 'center' },
    row: { display: 'grid', gridTemplateColumns: GRID, gap: '16px', padding: '20px 26px', alignItems: 'start' },
    cellStack: { display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 },
    naCell: { display: 'flex', alignItems: 'center', minHeight: '42px', fontFamily: NUM, fontSize: '12px', color: C.dim },
    computedWatts: {
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '42px',
        fontFamily: NUM, fontSize: '14px', color: C.muted,
    },
    removeButton: {
        width: '36px', height: '36px', alignSelf: 'center', borderRadius: '8px', border: `1px solid ${C.border}`,
        background: '#fff', color: C.sub, fontSize: '14px', cursor: 'pointer',
    },
    listFoot: {
        display: 'flex', alignItems: 'center', gap: '16px', padding: '22px 26px',
        borderTop: `1px solid ${C.rowBorder}`, flexWrap: 'wrap',
    },
    addButton: {
        display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', color: C.green,
        border: '1px solid #c7d3cc', borderRadius: '9px', padding: '11px 16px', fontFamily: SANS,
        fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none',
    },
    sidebar: { flex: '1 1 300px', position: 'sticky', top: '96px', display: 'flex', flexDirection: 'column', gap: '16px' },
    totalCard: { background: C.green, borderRadius: '12px', padding: '24px' },
    totalValue: { fontFamily: NUM, fontSize: '34px', fontWeight: 600, letterSpacing: '-.03em', color: C.yellow },
    totalDivider: { height: '1px', background: 'rgba(255,255,255,.14)', margin: '20px 0' },
    billGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '16px', padding: '22px 26px' },
    billCard: { background: C.fieldBg, border: `1px solid ${C.borderSoft}`, borderRadius: '11px', padding: '18px 20px' },
    billFields: { display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)', gap: '14px', marginTop: '14px' },
    billLabel: { display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 },
    billLabelText: { fontSize: '12.5px', fontWeight: 600, color: C.body },
    continueButton: (ready) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: 'none',
        borderRadius: '11px', padding: '16px 24px', fontFamily: SANS, fontSize: '15px', fontWeight: 800,
        cursor: ready ? 'pointer' : 'not-allowed', background: ready ? C.green : '#d3d8d2', color: ready ? '#fff' : C.muted,
    }),
};
