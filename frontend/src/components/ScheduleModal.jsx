import { useEffect, useState } from 'react';
import { colors } from '../styles/theme';

// Shared "Schedule an installation" dialog, from the Schedule design.
// Used for every place an admin books or moves an installation:
//   - Schedule page: new booking (manual or from a quotation) and reschedule
//   - Quotation detail page: schedule an approved quotation
//   - Dashboard: confirm an external installation request
//
// Three steps: pick a date → pick a start time → assign a technician, plus
// optional notes. The two columns sit side by side on wide screens and stack
// into one scrolling column on narrow ones.
//
// Props
//   title, contextLabel, badge   header text ("For quotation" + "#Q-…" pill)
//   schedules                    existing installations — booked-day dots and technician load
//   excludeScheduleId            the schedule being moved, so it doesn't count against itself
//   initial                      { scheduled_date, scheduled_time, assigned_technician, notes }
//   showNotes                    false where the API doesn't accept notes (reschedule)
//   intro                        extra content above the calendar (customer picker, notes, …)
//   extraValid                   extra condition for enabling Confirm (e.g. customer chosen)
//   confirmLabel, submitting, error, onSubmit(values), onClose

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// Start times offered as buttons (lunch hour left out)
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const ACCENT = colors.primary;
const BOOKED_DOT = '#d97706';

function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// "13:00" or "13:00:00" → "1:00 PM"
function formatTime12(time) {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Installations are booked from tomorrow onwards (local time)
function tomorrowKey() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
}

const scheduleDateKey = (schedule) => (schedule.scheduled_date || '').split('T')[0];
const techKey = (name) => name.trim().toLowerCase();

function initials(name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || '')).toUpperCase();
}

export default function ScheduleModal({
    title = 'Schedule an installation',
    contextLabel,
    badge,
    schedules = [],
    excludeScheduleId = null,
    initial = {},
    showNotes = true,
    intro = null,
    extraValid = true,
    confirmLabel = 'Confirm schedule',
    submitting = false,
    error = '',
    onSubmit,
    onClose,
}) {
    const minKey = tomorrowKey();
    const todayKey = toDateKey(new Date());

    const [values, setValues] = useState(() => ({
        scheduled_date: initial.scheduled_date && initial.scheduled_date >= minKey ? initial.scheduled_date : '',
        scheduled_time: initial.scheduled_time ? initial.scheduled_time.slice(0, 5) : '',
        assigned_technician: initial.assigned_technician || '',
        notes: initial.notes || '',
    }));

    // Open on the chosen day's month, or the first bookable month
    const [view, setView] = useState(() => {
        const start = parseKey(values.scheduled_date || minKey);
        return { year: start.getFullYear(), month: start.getMonth() };
    });

    const otherSchedules = schedules.filter((s) => s.id !== excludeScheduleId);

    // Technicians the business already uses, taken from past bookings
    const knownTechs = [];
    const seen = new Set();
    [...otherSchedules.map((s) => s.assigned_technician || ''), initial.assigned_technician || '']
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((name) => {
            if (!seen.has(techKey(name))) {
                seen.add(techKey(name));
                knownTechs.push(name);
            }
        });
    knownTechs.sort((a, b) => a.localeCompare(b));

    // The name box shows when the admin asks for it, or when there are no
    // known technicians yet (schedules may still be loading)
    const [addingTech, setAddingTech] = useState(false);
    const showNameInput = addingTech || knownTechs.length === 0;

    const set = (patch) => setValues((v) => ({ ...v, ...patch }));

    // Esc closes the dialog
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    // ----- Calendar -----
    const firstOfMonth = new Date(view.year, view.month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cellCount = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const bookedOn = (key) => otherSchedules.filter((s) => scheduleDateKey(s) === key);

    const cells = Array.from({ length: cellCount }, (_, i) => {
        const date = new Date(view.year, view.month, i - startOffset + 1);
        const key = toDateKey(date);
        const inMonth = date.getMonth() === view.month;
        return {
            key,
            label: date.getDate(),
            inMonth,
            disabled: !inMonth || key < minKey,
            isToday: key === todayKey,
            selected: inMonth && key === values.scheduled_date,
            booked: bookedOn(key).length,
            aria: date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
        };
    });

    const minDate = parseKey(minKey);
    const canGoBack = view.year > minDate.getFullYear()
        || (view.year === minDate.getFullYear() && view.month > minDate.getMonth());

    const shiftMonth = (delta) => {
        setView(({ year, month }) => {
            const d = new Date(year, month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    const dayBookings = values.scheduled_date ? bookedOn(values.scheduled_date) : [];
    const dayLong = values.scheduled_date
        ? parseKey(values.scheduled_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
        : '';
    const dayShort = values.scheduled_date
        ? parseKey(values.scheduled_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
        : '';

    // ----- Times (an existing time outside the slots is kept as its own button) -----
    const timeOptions = values.scheduled_time && !TIME_SLOTS.includes(values.scheduled_time)
        ? [values.scheduled_time, ...TIME_SLOTS]
        : TIME_SLOTS;

    // ----- Technician load on the chosen day -----
    const techMeta = (name) => {
        if (!values.scheduled_date) return 'Pick a date to see availability';
        const jobs = dayBookings.filter((s) => techKey(s.assigned_technician || '') === techKey(name)).length;
        return jobs === 0 ? 'Free all day' : `${jobs} job${jobs === 1 ? '' : 's'} that day`;
    };

    const technician = values.assigned_technician.trim();
    const ready = Boolean(values.scheduled_date && values.scheduled_time && technician.length >= 2 && extraValid);
    const summaryParts = [dayShort, formatTime12(values.scheduled_time), technician].filter(Boolean);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!ready || submitting) return;
        onSubmit({
            scheduled_date: values.scheduled_date,
            scheduled_time: values.scheduled_time,
            assigned_technician: technician,
            notes: values.notes.trim(),
        });
    };

    return (
        <div style={styles.overlay} onClick={() => !submitting && onClose()}>
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-modal-title"
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                style={styles.dialog}
            >
                <header style={styles.header}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <h2 id="schedule-modal-title" style={styles.title}>{title}</h2>
                        {(contextLabel || badge) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '14px', color: '#4b5563' }}>
                                {contextLabel && <span>{contextLabel}</span>}
                                {badge && <span style={styles.badge}>{badge}</span>}
                            </div>
                        )}
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} disabled={submitting} style={styles.closeBtn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>

                <div style={styles.body}>
                    {error && <div style={styles.error}>{error}</div>}

                    {/* 1px gaps on a border-coloured background draw the divider,
                        whether the columns sit side by side or stack */}
                    <div style={styles.columns}>
                        {/* ----- Step 1: date ----- */}
                        <div style={{ ...styles.column, flex: '1 1 380px', gap: '14px' }}>
                            {intro}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <StepLabel n={1} done={Boolean(values.scheduled_date)}>Pick a date</StepLabel>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} disabled={!canGoBack} style={styles.navBtn}>
                                        <Chevron dir="left" color={canGoBack ? '#374151' : '#9ca3af'} />
                                    </button>
                                    <span style={{ fontSize: '15px', fontWeight: 600, minWidth: '112px', textAlign: 'center' }}>
                                        {MONTHS[view.month]} {view.year}
                                    </span>
                                    <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} style={styles.navBtn}>
                                        <Chevron dir="right" color="#374151" />
                                    </button>
                                </div>
                            </div>

                            <div style={styles.weekdays}>
                                {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
                            </div>
                            <div style={styles.dayGrid}>
                                {cells.map((c) => (
                                    <button
                                        type="button"
                                        key={c.key}
                                        onClick={() => set({ scheduled_date: c.key })}
                                        disabled={c.disabled}
                                        aria-pressed={c.selected}
                                        aria-label={`${c.aria}${c.disabled ? ', unavailable' : ''}${c.booked ? `, ${c.booked} installation${c.booked === 1 ? '' : 's'} booked` : ''}`}
                                        style={dayStyle(c)}
                                    >
                                        <span>{c.label}</span>
                                        <span style={{
                                            width: '5px', height: '5px', borderRadius: '50%',
                                            background: c.booked && c.inMonth ? (c.selected ? '#fcd34d' : BOOKED_DOT) : 'transparent',
                                        }} />
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#4b5563' }}>
                                <Legend swatch={{ width: '12px', height: '12px', borderRadius: '4px', border: `2px solid ${ACCENT}`, boxSizing: 'border-box' }}>Today</Legend>
                                <Legend swatch={{ width: '6px', height: '6px', borderRadius: '50%', background: BOOKED_DOT }}>Has an installation</Legend>
                                <Legend swatch={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f3f4f6' }}>Unavailable</Legend>
                            </div>

                            <div style={styles.dayInfo}>
                                {values.scheduled_date ? (
                                    <>
                                        <strong style={{ fontWeight: 600, color: '#111827' }}>{dayLong}</strong>
                                        {' · '}
                                        {dayBookings.length
                                            ? `${dayBookings.length} installation${dayBookings.length === 1 ? '' : 's'} already booked`
                                            : 'No other installations booked'}
                                    </>
                                ) : (
                                    <span style={{ color: '#6b7280' }}>No date selected yet</span>
                                )}
                            </div>
                        </div>

                        <div style={{ ...styles.column, flex: '1 1 320px', gap: '22px' }}>
                            {/* ----- Step 2: time ----- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <StepLabel n={2} done={Boolean(values.scheduled_time)}>Start time</StepLabel>
                                <div style={styles.timeGrid}>
                                    {timeOptions.map((t) => {
                                        const selected = values.scheduled_time === t;
                                        return (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => set({ scheduled_time: t })}
                                                aria-pressed={selected}
                                                style={{
                                                    ...styles.timeBtn,
                                                    ...(selected
                                                        ? { background: ACCENT, color: '#fff', border: `1px solid ${ACCENT}` }
                                                        : {}),
                                                }}
                                            >
                                                {formatTime12(t)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ----- Step 3: technician ----- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <StepLabel n={3} done={technician.length >= 2}>Assign a technician</StepLabel>
                                <div style={styles.techList}>
                                    {knownTechs.map((name) => {
                                        const selected = !showNameInput && techKey(values.assigned_technician) === techKey(name);
                                        return (
                                            <TechOption
                                                key={name}
                                                name={name}
                                                meta={techMeta(name)}
                                                selected={selected}
                                                onClick={() => {
                                                    setAddingTech(false);
                                                    set({ assigned_technician: name });
                                                }}
                                            />
                                        );
                                    })}

                                    {showNameInput ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label htmlFor="schedule-new-tech" style={{ fontSize: '13px', color: '#4b5563' }}>
                                                {knownTechs.length ? 'New technician' : 'Technician name'}
                                            </label>
                                            <input
                                                id="schedule-new-tech"
                                                type="text"
                                                value={values.assigned_technician}
                                                onChange={(e) => set({ assigned_technician: e.target.value })}
                                                placeholder="e.g. Juan Santos"
                                                maxLength={255}
                                                autoFocus={knownTechs.length > 0}
                                                style={styles.input}
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAddingTech(true);
                                                set({ assigned_technician: '' });
                                            }}
                                            style={styles.addTechBtn}
                                        >
                                            + Add another technician
                                        </button>
                                    )}
                                </div>
                            </div>

                            {showNotes && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label htmlFor="schedule-notes" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                        Notes <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional)</span>
                                    </label>
                                    <textarea
                                        id="schedule-notes"
                                        rows={2}
                                        maxLength={500}
                                        value={values.notes}
                                        onChange={(e) => set({ notes: e.target.value })}
                                        placeholder="Gate code, roof access, things the crew should know"
                                        style={{ ...styles.input, resize: 'vertical', height: 'auto' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer style={styles.footer}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', minWidth: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                        <span style={summaryParts.length ? { fontWeight: 600, color: '#111827' } : { color: '#6b7280' }}>
                            {summaryParts.length ? summaryParts.join(' · ') : 'Pick a date, time and technician'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                        <button type="button" onClick={onClose} disabled={submitting} style={styles.cancelBtn}>Cancel</button>
                        <button
                            type="submit"
                            disabled={!ready || submitting}
                            style={{
                                ...styles.confirmBtn,
                                ...(ready && !submitting
                                    ? { background: ACCENT, color: '#fff', cursor: 'pointer' }
                                    : { background: '#d7ddd9', color: '#5b635e', cursor: 'not-allowed' }),
                            }}
                        >
                            {submitting ? 'Saving…' : confirmLabel}
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    );
}

function StepLabel({ n, done, children }) {
    return (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <span style={{
                display: 'inline-flex', width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                background: done ? ACCENT : '#9ca3af', color: '#fff', fontSize: '12px',
                alignItems: 'center', justifyContent: 'center', marginRight: '8px',
            }}>
                {n}
            </span>
            {children}
        </span>
    );
}

function Legend({ swatch, children }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={swatch} />
            {children}
        </span>
    );
}

function TechOption({ name, meta, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
                ...(selected
                    ? { background: '#f2f8f4', border: `2px solid ${ACCENT}` }
                    : { background: '#fff', border: '1px solid #e5e7eb' }),
            }}
        >
            <span style={{
                width: '36px', height: '36px', borderRadius: '50%', background: colors.primaryTint, color: ACCENT,
                fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                {initials(name)}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {name}
                </span>
                <span style={{ fontSize: '13px', color: meta.includes('job') ? '#b45309' : '#4b5563' }}>{meta}</span>
            </span>
            <span style={{
                width: '18px', height: '18px', borderRadius: '50%', boxSizing: 'border-box', flexShrink: 0,
                border: selected ? `6px solid ${ACCENT}` : '2px solid #c4c9cf',
            }} />
        </button>
    );
}

function Chevron({ dir, color }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
        </svg>
    );
}

function dayStyle(c) {
    const base = {
        height: '46px', borderRadius: '10px', fontFamily: 'inherit', fontSize: '15px', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: 0,
        boxSizing: 'border-box', minWidth: 0,
    };
    if (c.disabled) {
        return {
            ...base, background: '#f3f4f6', color: c.inMonth ? '#a3a8af' : '#c9cdd2', cursor: 'not-allowed',
            border: c.isToday ? `2px solid ${ACCENT}` : 'none',
        };
    }
    if (c.selected) return { ...base, background: ACCENT, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' };
    if (c.isToday) return { ...base, background: '#fff', border: `2px solid ${ACCENT}`, color: ACCENT, fontWeight: 700, cursor: 'pointer' };
    return { ...base, background: '#fff', border: '1px solid #e5e7eb', color: '#111827', cursor: 'pointer' };
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.55)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    },
    dialog: {
        width: '100%', maxWidth: '940px', maxHeight: 'calc(100vh - 32px)', background: '#fff', borderRadius: '18px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        color: '#111827', fontVariantNumeric: 'tabular-nums', margin: 0,
    },
    header: {
        padding: '22px 24px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
    },
    title: { margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', color: '#111827' },
    badge: { fontWeight: 600, color: ACCENT, background: colors.primaryTint, padding: '3px 10px', borderRadius: '999px' },
    closeBtn: {
        width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    },
    // The middle scrolls; header and footer stay in view
    body: { flex: 1, minHeight: 0, overflowY: 'auto' },
    error: {
        margin: '16px 24px 0', background: colors.dangerTint, color: colors.danger, border: '1px solid #fecaca',
        borderRadius: '10px', padding: '10px 14px', fontSize: '14px',
    },
    columns: { display: 'flex', flexWrap: 'wrap', gap: '1px', background: '#e5e7eb' },
    column: { background: '#fff', padding: '22px 24px', display: 'flex', flexDirection: 'column', minWidth: 0 },
    navBtn: {
        width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    weekdays: {
        display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px',
        fontSize: '12px', fontWeight: 600, color: '#6b7280', textAlign: 'center',
    },
    dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' },
    dayInfo: { background: '#f6f7f6', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#374151', minHeight: '22px' },
    timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '8px' },
    timeBtn: {
        height: '44px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        background: '#fff', color: '#111827', border: '1px solid #d1d5db',
    },
    techList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', padding: '2px' },
    addTechBtn: {
        height: '42px', borderRadius: '12px', border: '1px dashed #c4c9cf', background: '#fafaf9', color: ACCENT,
        fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    },
    input: {
        fontFamily: 'inherit', fontSize: '14px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px',
        color: '#111827', width: '100%', boxSizing: 'border-box', background: '#fff',
    },
    footer: {
        padding: '14px 24px', borderTop: '1px solid #e5e7eb', background: '#fafaf9', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', gap: '12px 16px', flexWrap: 'wrap', flexShrink: 0,
    },
    cancelBtn: {
        height: '44px', padding: '0 20px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#fff',
        fontSize: '15px', fontWeight: 600, color: '#111827', cursor: 'pointer', fontFamily: 'inherit',
    },
    confirmBtn: { height: '44px', padding: '0 22px', borderRadius: '10px', border: 'none', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit' },
};
