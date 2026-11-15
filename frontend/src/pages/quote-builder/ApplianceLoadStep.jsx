import {
    APPLIANCES, HP_OPTIONS, DAY_SLOTS, NIGHT_SLOTS, PACKAGES, DEFAULT_RATE_PER_KWH,
    computeRow, exceedsLargestPackage, formatHour, formatWhole, formatDecimal, monthLabel, peso,
} from '../../services/solarEngine';
import StepBanner from './StepBanner';
import { Q, qs } from './calcTheme';

// STEP 1 — the appliance list, the live recommendation, and the two
// reference bills. All state lives in QuotationFormPage; this component only
// displays it and reports changes back through the on... callbacks.
// Look from the "Customer · Request quotation, step 1" mockup.
export default function ApplianceLoadStep({
    rows, load, selection, savings, timeFormat, touched, attempted, loadReady,
    bills, onTimeFormatChange, onRowChange, onTouch, onAddRow, onRemoveRow,
    onBillChange, onContinue,
}) {
    const hour = (h) => formatHour(h, timeFormat);

    // A "Required" error shows only after the customer has left the field
    // (touched) or pressed Continue (attempted) — never on a brand-new row.
    const seen = (row, key) => Boolean(touched[`${row.id}:${key}`]) || attempted;

    const hasLoad = load.totalLoad > 0;
    const recommended = PACKAGES[selection.recommendedPkgIndex];
    const tooBig = exceedsLargestPackage(load.inverterSize);
    const named = rows.filter((row) => computeRow(row).rowWatts > 0).length;

    return (
        <div className="se-step" style={qs.page}>
            <StepBanner screen="load" title="Request a quotation" subtitle="Tell us what you want to run on solar" />

            {/* ================= Appliances ================= */}
            <section aria-labelledby="appl-h" style={qs.card}>
                <div style={qs.cardHead}>
                    <div style={{ minWidth: 0 }}>
                        <h2 id="appl-h" style={qs.h2}>Your appliances</h2>
                        <p style={qs.sub}>Add each appliance and the hours you use it. We use this to size your system.</p>
                        {/* Reminders: the anonymous calculator tracking (quoteTracker.js) and required fields */}
                        <p style={styles.smallNote}>
                            Your visit stays anonymous until you send a request.{' '}
                            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: Q.green, fontWeight: 600 }}>
                                Privacy Policy
                            </a>
                            {' · '}Fields with <span style={styles.req}>*</span> are required.
                        </p>
                    </div>
                    <TimeFormatToggle value={timeFormat} onChange={onTimeFormatChange} />
                </div>

                {rows.length === 0 ? (
                    <p style={{ margin: 0, padding: '28px 20px', textAlign: 'center', color: Q.muted }}>
                        <strong style={{ color: Q.ink }}>No appliances yet.</strong> Add an appliance below, then set its wattage, quantity and hours.
                    </p>
                ) : (
                    <ol style={styles.list}>
                        {rows.map((row, i) => (
                            <ApplianceRow
                                key={row.id}
                                n={i + 1}
                                row={row}
                                hour={hour}
                                wattsInvalid={seen(row, 'watts')}
                                qtyInvalid={seen(row, 'qty')}
                                onChange={(key, value) => onRowChange(row.id, key, value)}
                                onTouch={(key) => onTouch(row.id, key)}
                                onRemove={() => onRemoveRow(row.id)}
                            />
                        ))}
                    </ol>
                )}

                <div style={styles.listFoot}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                        <button type="button" className="c-btn c-btn-secondary" onClick={onAddRow} style={{ height: '40px', fontSize: '14px' }}>
                            <PlusGlyph />
                            Add appliance
                        </button>
                        <span style={{ fontSize: '13px', color: Q.muted }}>
                            Aircon and water pump: hp × 800 W. Others: the wattage on the unit's label.
                        </span>
                    </div>
                    <div style={styles.totalPill}>
                        <span style={{ color: '#1F4D3A' }}>Total daily use</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: Q.green }}>{formatWhole(load.grand)} Wh</span>
                    </div>
                </div>
            </section>

            {/* ================= Live recommendation ================= */}
            <section aria-labelledby="rec-h" style={qs.card}>
                <div style={{ ...qs.cardHead, display: 'block' }}>
                    <h2 id="rec-h" style={qs.h2}>Recommended system</h2>
                    <p style={qs.sub}>Worked out from your appliances. It updates as you edit the list.</p>
                </div>
                {hasLoad ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px' }}>
                        <div style={{ flex: '3 1 420px', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '8px' }}>
                            <SumBox label="Total load" value={`${formatWhole(load.totalLoad)} W`} note="All appliances on at once" />
                            <span aria-hidden="true" style={styles.op}>+</span>
                            <SumBox label="Safety buffer" value="2,000 W" note="For startup surges" />
                            <span aria-hidden="true" style={styles.op}>=</span>
                            <SumBox label="Inverter size needed" value={`${formatWhole(load.inverterSize)} W`} note="Minimum to run everything" highlight />
                        </div>
                        <div style={styles.pkgCard}>
                            <div style={styles.pkgEyebrow}>Our package for you</div>
                            <div style={{ marginTop: '2px', fontSize: '26px', fontWeight: 700 }}>
                                {recommended.kw} kW hybrid inverter
                            </div>
                            <div style={{ color: Q.stripText }}>
                                {tooBig
                                    ? `Bigger than our ${recommended.kw} kW package. Our engineer will check it after review.`
                                    : `Covers up to ${formatWhole(recommended.watts)} W, enough for your ${formatWhole(load.inverterSize)} W`}
                            </div>
                            <div
                                role="img"
                                aria-label={`Packages ${PACKAGES[0].kw} to ${PACKAGES[PACKAGES.length - 1].kw} kW, ${recommended.kw} kW selected`}
                                style={{ display: 'flex', gap: '4px', marginTop: '12px' }}
                            >
                                {PACKAGES.map((p, i) => (
                                    <span key={p.kw} style={styles.pkgChip(i === selection.recommendedPkgIndex)}>{p.kw} kW</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p style={{ margin: 0, padding: '24px 20px', color: Q.muted }}>
                        Add watts and quantity for at least one appliance to see a recommendation.
                    </p>
                )}
            </section>

            {/* ================= Reference bills ================= */}
            <section aria-labelledby="bill-h" style={qs.card}>
                <div style={qs.cardHead}>
                    <div style={{ minWidth: 0 }}>
                        <h2 id="bill-h" style={{ ...qs.h2, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            Recent electricity bills
                            <span style={styles.optionalChip}>Optional</span>
                        </h2>
                        <p style={qs.sub}>Only used to estimate your savings. With the kWh, we can use your exact rate.</p>
                    </div>
                    <span style={styles.ratePill(savings.rateSource === 'bill')}>
                        {savings.rateSource === 'bill'
                            ? `Your rate: ₱${savings.rate.toFixed(2)}/kWh`
                            : `No bill yet: we'll use SORECO's ${peso(DEFAULT_RATE_PER_KWH)}/kWh`}
                    </span>
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
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                {!loadReady && attempted ? (
                    <span role="alert" style={{ ...qs.alert, padding: '9px 12px' }}>
                        {rows.length
                            ? 'Fill in the wattage and quantity on every appliance to continue.'
                            : 'Add at least one appliance to continue.'}
                    </span>
                ) : (
                    <span style={{ color: Q.muted }}>
                        {loadReady
                            ? `${named} appliance${named === 1 ? '' : 's'} · ${formatWhole(load.grand)} Wh a day`
                            : 'Add at least one appliance with watts and quantity.'}
                    </span>
                )}
                {/* Still pressable when not ready, so it can show what's missing */}
                <button
                    type="button"
                    className="c-btn c-btn-primary"
                    aria-disabled={!loadReady}
                    onClick={onContinue}
                    style={qs.bigBtn}
                >
                    Compute recommendation
                    <ArrowGlyph />
                </button>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------

function TimeFormatToggle({ value, onChange }) {
    const options = [{ id: '24', label: '24-hour' }, { id: '12', label: 'AM / PM' }];

    return (
        <div role="group" aria-label="Time format" style={styles.segments}>
            {options.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    className="c-seg"
                    aria-pressed={value === option.id}
                    onClick={() => onChange(option.id)}
                    style={{ height: '32px', padding: '0 12px' }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function ApplianceRow({ n, row, hour, wattsInvalid, qtyInvalid, onChange, onTouch, onRemove }) {
    // Recompute this row's numbers so we can show watts and hours
    const c = computeRow(row);
    const wattsMissing = !c.usesHp && !(Number(row.watts) > 0) && wattsInvalid;
    const qtyMissing = !(Number(row.qty) > 0) && qtyInvalid;
    const wh = c.dayWh + c.nightWh;

    // Hour dropdown options. "From" can't be the last slot, and "to" only
    // lists hours after the chosen "from".
    const nightLabel = (h) => hour(h) + (h >= 24 ? ' +1' : '');
    const dayFromOptions = DAY_SLOTS.slice(0, -1);
    const dayToOptions = DAY_SLOTS.filter((h) => h > (row.dayFrom === '' ? DAY_SLOTS[0] : Number(row.dayFrom)));
    const nightFromOptions = NIGHT_SLOTS.slice(0, -1);
    const nightToOptions = NIGHT_SLOTS.filter((h) => h > (row.nightFrom === '' ? NIGHT_SLOTS[0] : Number(row.nightFrom)));

    // The 24 hours from 8 AM, coloured where the appliance is on (a picture only)
    const inRange = (h, from, to) => from !== '' && to !== '' && h >= Number(from) && h < Number(to);
    const bar = Array.from({ length: 24 }, (_, k) => {
        const h = 8 + k;
        const day = h < 16;
        const used = day ? inRange(h, row.dayFrom, row.dayTo) : inRange(h, row.nightFrom, row.nightTo);
        return used ? (day ? '#D49A23' : '#3F7CC0') : (day ? '#F6E7C1' : '#DCE7F3');
    });

    return (
        <li style={styles.applCard}>
            <div style={styles.applHead}>
                <span aria-hidden="true" style={styles.numTile}>{n}</span>
                <div style={{ flex: '1 1 260px', display: 'flex', flexWrap: 'wrap', gap: '8px', minWidth: 0 }}>
                    <label style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <span style={qs.srOnly}>Appliance {n}</span>
                        <select
                            value={row.appliance}
                            onChange={(e) => onChange('appliance', e.target.value)}
                            style={{ ...qs.field(false), fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {APPLIANCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                    </label>
                    {row.appliance === 'other' && (
                        <label style={{ flex: '1 1 200px', minWidth: 0 }}>
                            <span style={qs.srOnly}>Name of appliance {n}</span>
                            <input
                                value={row.customName}
                                onChange={(e) => onChange('customName', e.target.value)}
                                placeholder="Name the appliance, e.g. Refrigerator"
                                style={{ ...qs.field(false), fontSize: '15px' }}
                            />
                        </label>
                    )}
                </div>
                <span style={{ fontSize: '13px', color: wh ? '#1F6B45' : Q.subtle, whiteSpace: 'nowrap' }}>
                    {wh ? `About ${formatWhole(wh)} Wh a day` : 'Fill in watts, quantity and hours'}
                </span>
                <button
                    type="button"
                    className="c-btn c-btn-danger"
                    onClick={onRemove}
                    aria-label={`Remove ${c.name || `appliance ${n}`}`}
                    style={{ borderColor: 'transparent' }}
                >
                    <TrashGlyph />
                    Remove
                </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px', padding: '16px' }}>
                {/* ----- Power ----- */}
                <fieldset style={{ flex: '1 1 280px', margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
                    <legend style={qs.legend}>Power</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                        <label style={styles.fieldWrap}>
                            <span style={qs.label}>Horsepower</span>
                            {c.usesHp ? (
                                <select value={row.hp} onChange={(e) => onChange('hp', e.target.value)} style={{ ...qs.field(false), cursor: 'pointer' }}>
                                    {HP_OPTIONS.map((hp) => <option key={hp} value={String(hp)}>{hp} hp</option>)}
                                </select>
                            ) : (
                                <span style={styles.notNeeded}>Not needed</span>
                            )}
                        </label>
                        <label style={styles.fieldWrap}>
                            <span style={qs.label}>Watts <span aria-hidden="true" style={styles.req}>*</span></span>
                            {c.usesHp ? (
                                <span style={{ ...qs.readonly, justifyContent: 'space-between', fontWeight: 600 }}>
                                    {formatWhole(c.watts)} W
                                    <span style={{ fontSize: '12px', fontWeight: 400, color: Q.muted }}>auto</span>
                                </span>
                            ) : (
                                <>
                                    <input
                                        value={row.watts}
                                        onChange={(e) => onChange('watts', e.target.value)}
                                        onBlur={() => onTouch('watts')}
                                        inputMode="numeric"
                                        placeholder="e.g. 150"
                                        aria-required="true"
                                        aria-invalid={wattsMissing}
                                        style={qs.field(wattsMissing)}
                                    />
                                    {wattsMissing && <span style={qs.error}>Required</span>}
                                </>
                            )}
                        </label>
                        <label style={styles.fieldWrap}>
                            <span style={qs.label}>Quantity <span aria-hidden="true" style={styles.req}>*</span></span>
                            <input
                                value={row.qty}
                                onChange={(e) => onChange('qty', e.target.value)}
                                onBlur={() => onTouch('qty')}
                                inputMode="numeric"
                                placeholder="e.g. 1"
                                aria-required="true"
                                aria-invalid={qtyMissing}
                                style={qs.field(qtyMissing)}
                            />
                            {qtyMissing && <span style={qs.error}>Required</span>}
                        </label>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: Q.muted }}>
                        {c.usesHp ? 'Watts = horsepower × 800 W.' : "Use the wattage on the appliance's label."}
                    </p>
                </fieldset>

                {/* ----- Hours ----- */}
                <fieldset style={{ flex: '2 1 460px', margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
                    <legend style={qs.legend}>When do you use it?</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '10px' }}>
                        <HourRange
                            day
                            title="Daytime"
                            range={`${hour(8)} – ${hour(16)}`}
                            from={row.dayFrom}
                            to={row.dayTo}
                            fromOptions={dayFromOptions}
                            toOptions={dayToOptions}
                            label={hour}
                            hours={c.dayHours}
                            onFrom={(value) => onChange('dayFrom', value)}
                            onTo={(value) => onChange('dayTo', value)}
                        />
                        <HourRange
                            title="Nighttime"
                            range={`${hour(16)} – ${hour(8)}`}
                            from={row.nightFrom}
                            to={row.nightTo}
                            fromOptions={nightFromOptions}
                            toOptions={nightToOptions}
                            label={nightLabel}
                            hours={c.nightHours}
                            onFrom={(value) => onChange('nightFrom', value)}
                            onTo={(value) => onChange('nightTo', value)}
                        />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <div role="img" aria-label={`Used ${formatDecimal(c.dayHours + c.nightHours)} hours a day`} style={styles.dayBar}>
                            {bar.map((color, k) => <span key={k} style={{ background: color }} />)}
                        </div>
                        <div aria-hidden="true" style={styles.dayBarScale}>
                            <span>{hour(8)}</span><span>{hour(16)}</span><span>{hour(0)}</span><span>{hour(8)}</span>
                        </div>
                    </div>
                </fieldset>
            </div>
        </li>
    );
}

const SUN = 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z';
const MOON = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';

function HourRange({ day, title, range, from, to, fromOptions, toOptions, label, hours, onFrom, onTo }) {
    const halfSet = from !== '' && to === '';
    const selectStyle = { ...qs.field(false), height: '38px', padding: '0 6px', cursor: 'pointer' };

    return (
        <div style={styles.period(day, hours > 0)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={day ? '#B07A12' : '#3F7CC0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={day ? SUN : MOON} />
                    </svg>
                    {title}
                </span>
                <span style={{ fontSize: '12px', color: Q.muted }}>{range}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: '6px' }}>
                <label>
                    <span style={qs.srOnly}>{title} start</span>
                    <select value={from} onChange={(e) => onFrom(e.target.value)} style={selectStyle}>
                        <option value="">—</option>
                        {fromOptions.map((h) => <option key={h} value={String(h)}>{label(h)}</option>)}
                    </select>
                </label>
                <span aria-hidden="true" style={{ color: Q.subtle }}>to</span>
                <label>
                    <span style={qs.srOnly}>{title} end</span>
                    <select value={to} onChange={(e) => onTo(e.target.value)} style={selectStyle}>
                        <option value="">—</option>
                        {toOptions.map((h) => <option key={h} value={String(h)}>{label(h)}</option>)}
                    </select>
                </label>
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600, color: hours ? Q.ink : halfSet ? '#A4410E' : Q.subtle }}>
                {hours ? `${formatDecimal(hours)} hour${hours === 1 ? '' : 's'}` : halfSet ? 'Pick an end time' : 'Not used'}
            </div>
        </div>
    );
}

function SumBox({ label, value, note, highlight }) {
    return (
        <div style={styles.sumBox(highlight)}>
            <div style={{ fontSize: '13px', color: highlight ? '#1F4D3A' : Q.muted }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: highlight ? Q.green : Q.ink }}>{value}</div>
            <div style={{ fontSize: '12px', color: highlight ? '#1F4D3A' : Q.subtle }}>{note}</div>
        </div>
    );
}

function BillCard({ index, bill, mostRecentPeriod, onChange }) {
    // Bill 2's month isn't picked: it's always the month right before bill 1
    // (QuotationFormPage keeps it in step), so it's shown as fixed text.
    const isEarlierBill = index === 1;
    const waiting = isEarlierBill && !mostRecentPeriod;

    return (
        <fieldset style={{ ...styles.billCard, background: waiting ? Q.headBg : '#FFFFFF' }}>
            <legend style={{ ...qs.legend, padding: '0 6px', marginLeft: '-6px', marginBottom: 0 }}>
                {index === 0 ? 'Most recent bill' : 'The month before'}
            </legend>
            <div className="se-bill-fields" style={styles.billFields}>
                {isEarlierBill ? (
                    <div style={styles.fieldWrap}>
                        <span style={qs.label}>Billing month</span>
                        <span style={{ ...qs.readonly, color: mostRecentPeriod ? Q.ink : Q.subtle }}>
                            {mostRecentPeriod ? monthLabel(bill.period) : '—'}
                        </span>
                    </div>
                ) : (
                    <label style={styles.fieldWrap}>
                        <span style={qs.label}>Billing month</span>
                        <input type="month" value={bill.period} onChange={(e) => onChange('period', e)} style={qs.field(false)} />
                    </label>
                )}
                <label style={styles.fieldWrap}>
                    <span style={qs.label}>Amount (₱)</span>
                    <input value={bill.amount} onChange={(e) => onChange('amount', e)} inputMode="decimal" placeholder="0.00" style={qs.field(false)} />
                </label>
                <label style={styles.fieldWrap}>
                    <span style={qs.label}>kWh used</span>
                    <input value={bill.kwh} onChange={(e) => onChange('kwh', e)} inputMode="decimal" placeholder="On the bill" style={qs.field(false)} />
                </label>
            </div>
            {isEarlierBill && (
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: Q.muted }}>
                    {mostRecentPeriod
                        ? 'Set automatically. Adding a second month makes the estimate steadier.'
                        : 'Fill in the most recent bill first. We fill in this month for you.'}
                </p>
            )}
        </fieldset>
    );
}

function PlusGlyph() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
    );
}

function TrashGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" />
        </svg>
    );
}

export function ArrowGlyph() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    );
}

const styles = {
    smallNote: { margin: '6px 0 0', fontSize: '13px', color: Q.muted },
    req: { color: Q.danger, fontWeight: 700 },
    segments: { display: 'flex', border: `1px solid ${Q.control}`, borderRadius: '6px', padding: '3px', gap: '2px' },
    list: { listStyle: 'none', margin: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
    applCard: { border: `1px solid ${Q.line}`, borderRadius: '6px' },
    applHead: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', padding: '14px 16px',
        borderBottom: `1px solid ${Q.rowLine}`, background: Q.headBg, borderRadius: '6px 6px 0 0',
    },
    numTile: {
        width: '26px', height: '26px', borderRadius: '6px', background: Q.green, color: '#FFFFFF', fontSize: '13px',
        fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    },
    fieldWrap: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
    notNeeded: {
        height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 10px',
        border: `1px dashed ${Q.line}`, borderRadius: '6px', color: Q.subtle, fontSize: '13px',
    },
    period: (day, used) => ({
        border: `1px solid ${used ? (day ? '#F1DFB0' : '#C9DBEE') : Q.line}`,
        background: used ? (day ? '#FFFBF0' : '#F4F8FC') : '#FFFFFF',
        borderRadius: '6px', padding: '10px 12px', minWidth: 0,
    }),
    dayBar: {
        display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '1px', height: '14px',
        borderRadius: '3px', overflow: 'hidden',
    },
    dayBarScale: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: Q.subtle, marginTop: '3px' },
    listFoot: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        padding: '14px 20px 18px', borderTop: `1px solid ${Q.line}`,
    },
    totalPill: { display: 'flex', alignItems: 'baseline', gap: '10px', padding: '8px 14px', background: Q.tint, borderRadius: '6px' },
    op: { alignSelf: 'center', fontSize: '20px', fontWeight: 700, color: Q.subtle },
    sumBox: (highlight) => ({
        flex: '1 1 110px', border: `1px solid ${highlight ? Q.tintBorder : Q.line}`, background: highlight ? Q.tintSoft : '#FFFFFF',
        borderRadius: '6px', padding: '12px 14px', minWidth: 0,
    }),
    pkgCard: { flex: '2 1 280px', minWidth: 0, background: Q.green, color: '#FFFFFF', borderRadius: '6px', padding: '16px 18px' },
    pkgEyebrow: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: Q.gold },
    pkgChip: (on) => ({
        flex: 1, textAlign: 'center', padding: '4px 0', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
        background: on ? Q.gold : 'rgba(255,255,255,0.1)', color: on ? Q.onGold : Q.stripText,
    }),
    optionalChip: { fontSize: '12px', fontWeight: 600, color: Q.muted, background: '#EEEFEC', borderRadius: '4px', padding: '1px 8px' },
    ratePill: (own) => ({
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px',
        background: own ? Q.tint : '#F3F4F1', color: own ? '#1F6B45' : Q.body, fontSize: '13px', fontWeight: 600,
    }),
    billGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '16px', padding: '20px' },
    billCard: { margin: 0, padding: '14px 16px', border: `1px solid ${Q.line}`, borderRadius: '6px', minWidth: 0 },
    billFields: { display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', gap: '10px' },
};
