import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import {
    CalendarIcon,
    ClockIcon,
    SunIcon,
    LocationIcon,
    EditIcon,
    ChevronDownIcon,
    CheckIcon,
    XIcon,
} from '../components/Icons';
import api from '../api/axios';
import { colors, typography, statusColors } from '../styles/theme';

// Installations can only be booked from tomorrow onwards. Computing this at
// module scope keeps the render pure (react-hooks/purity).
const MIN_SCHEDULE_DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const STATUSES = ['scheduled', 'in_progress', 'completed', 'delayed'];

const STATUS_LABELS = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    delayed: 'Delayed',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${period}`;
}

// Today, resolved once when the module loads so rendering stays pure.
// Handlers that need the current date read it again themselves.
const TODAY = new Date();
const TODAY_KEY = toDateKey(TODAY);

export default function AdminSchedulePage() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [viewYear, setViewYear] = useState(TODAY.getFullYear());
    const [viewMonth, setViewMonth] = useState(TODAY.getMonth());
    const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
    const [statusFilter, setStatusFilter] = useState('all');

    const [modalSchedule, setModalSchedule] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const [editingSchedule, setEditingSchedule] = useState(null);
    const [editForm, setEditForm] = useState({
        scheduled_date: '',
        scheduled_time: '',
        assigned_technician: '',
    });
    const [editLoading, setEditLoading] = useState(false);


    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/admin/schedules');
            setSchedules(res.data);
        } catch {
            setError('Failed to load schedules.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchSchedules);
    }, [fetchSchedules]);

    const getCustomerName = (schedule) =>
        schedule.quotation?.quotation_request?.customer?.user?.name || 'Unknown';

    const getSystemType = (schedule) => {
        const type = schedule.quotation?.quotation_request?.solar_system_type;
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
    };

    const getCapacityKw = (schedule) =>
        schedule.quotation?.quotation_request?.solar_computation?.panel_capacity_kw;

    const getLocation = (schedule) =>
        schedule.quotation?.quotation_request?.customer?.install_location || '—';

    const getDateKey = (schedule) => schedule.scheduled_date.split('T')[0];

    const filteredSchedules = statusFilter === 'all'
        ? schedules
        : schedules.filter((s) => s.status === statusFilter);

    const statusCounts = STATUSES.reduce((acc, status) => {
        acc[status] = schedules.filter((s) => s.status === status).length;
        return acc;
    }, {});

    const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const monthSchedules = schedules.filter((s) => getDateKey(s).startsWith(monthKey));
    const monthCapacityKw = monthSchedules.reduce(
        (sum, s) => sum + (parseFloat(getCapacityKw(s)) || 0), 0
    );
    const monthDelayed = monthSchedules.filter((s) => s.status === 'delayed').length;

    const selectedDaySchedules = filteredSchedules
        .filter((s) => getDateKey(s) === selectedDate)
        .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

    // While a reschedule is in progress the calendar picks the new date
    const rescheduling = Boolean(editingSchedule);

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rowCount = Math.ceil((startOffset + daysInMonth) / 7);

    const cells = [];
    for (let i = 0; i < rowCount * 7; i++) {
        const dayNum = i - startOffset + 1;
        const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
        const cellDate = new Date(viewYear, viewMonth, dayNum);
        const key = toDateKey(cellDate);
        const daySchedules = filteredSchedules
            .filter((s) => getDateKey(s) === key)
            .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
        const shown = daySchedules.slice(0, 2);

        cells.push({
            key,
            day: cellDate.getDate(),
            inMonth,
            isToday: key === TODAY_KEY,
            isSelected: key === selectedDate,
            // The API rejects a reschedule that is not after today
            isBookable: key >= MIN_SCHEDULE_DATE,
            isPicked: rescheduling && key === editForm.scheduled_date,
            shown,
            moreCount: daySchedules.length - shown.length,
        });
    }

    const shiftMonth = (delta) => {
        let m = viewMonth + delta;
        let y = viewYear;
        if (m < 0) { m = 11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        setViewMonth(m);
        setViewYear(y);
    };

    const goToToday = () => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        setSelectedDate(toDateKey(now));
    };

    const openModal = (schedule) => {
        setModalSchedule(schedule);
        setSelectedDate(getDateKey(schedule));
    };

    const closeModal = () => setModalSchedule(null);

    const handleStatusChange = async (newStatus) => {
        if (!modalSchedule) return;
        setStatusUpdating(true);
        setError('');

        try {
            const res = await api.patch(`/admin/schedules/${modalSchedule.id}/status`, {
                status: newStatus,
            });
            setModalSchedule(res.data.schedule);
            setSuccess('Status updated.');
            fetchSchedules();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update status.');
        } finally {
            setStatusUpdating(false);
        }
    };

    const openEdit = (schedule) => {
        setEditForm({
            scheduled_date: getDateKey(schedule),
            scheduled_time: schedule.scheduled_time ? schedule.scheduled_time.slice(0, 5) : '',
            assigned_technician: schedule.assigned_technician || '',
        });
        setEditingSchedule(schedule);
        setModalSchedule(null);
        setError('');
        setSuccess('');

        // The card renders above the calendar, so make sure it is on screen
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.put(`/admin/schedules/${editingSchedule.id}`, editForm);
            setSuccess('Schedule updated successfully.');
            setEditingSchedule(null);
            fetchSchedules();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update schedule.');
        } finally {
            setEditLoading(false);
        }
    };

    const formatDateLong = (dateKey) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    return (
        <AdminLayout active="Schedule">
            <h1 style={styles.pageTitle}>Installation Schedule</h1>
            <p style={styles.pageSubtitle}>
                View and manage all scheduled solar installations.
            </p>

            {success && <div style={styles.success}>{success}</div>}
            {error && <div style={styles.error}>{error}</div>}

            {loading ? (
                <LoadingState label="Loading schedules..." />
            ) : schedules.length === 0 ? (
                <EmptyState
                    icon={<CalendarIcon size={32} color={colors.textFaint} />}
                    title="No installation schedules yet"
                    description="Schedules are created when approving quotations after supplier confirmation."
                />
            ) : (
                <div className="content-grid-sidebar" style={styles.contentGrid}>

                    <div style={styles.calendarCard}>

                        <div style={styles.calendarHeader}>
                            <h2 style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</h2>
                            <div style={styles.monthNav}>
                                <button onClick={() => shiftMonth(-1)} style={styles.navBtn} aria-label="Previous month">
                                    <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                                        <ChevronDownIcon size={14} color={colors.primary} />
                                    </span>
                                </button>
                                <button onClick={goToToday} style={styles.todayBtn}>Today</button>
                                <button onClick={() => shiftMonth(1)} style={styles.navBtn} aria-label="Next month">
                                    <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
                                        <ChevronDownIcon size={14} color={colors.primary} />
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div style={styles.legend}>
                            <button
                                onClick={() => setStatusFilter('all')}
                                style={{ ...styles.legendItem, ...(statusFilter === 'all' ? styles.legendItemActive : {}) }}
                            >
                                All
                                <span style={styles.legendCount}>{schedules.length}</span>
                            </button>
                            {STATUSES.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    style={{ ...styles.legendItem, ...(statusFilter === status ? styles.legendItemActive : {}) }}
                                >
                                    <span style={{ ...styles.legendDot, backgroundColor: statusColors[status].text }} />
                                    {STATUS_LABELS[status]}
                                    <span style={styles.legendCount}>{statusCounts[status]}</span>
                                </button>
                            ))}
                        </div>

                        <div style={styles.weekdayRow}>
                            {WEEKDAYS.map((w) => (
                                <div key={w} style={styles.weekdayLabel}>{w}</div>
                            ))}
                        </div>

                        <div style={styles.cellGrid}>
                            {cells.map((cell) => (
                                <div
                                    key={cell.key}
                                    onClick={() => {
                                        if (rescheduling) {
                                            if (cell.isBookable) {
                                                setEditForm({ ...editForm, scheduled_date: cell.key });
                                            }
                                            return;
                                        }
                                        setSelectedDate(cell.key);
                                    }}
                                    style={{
                                        ...styles.dayCell,
                                        backgroundColor: cell.isPicked || cell.isSelected ? colors.primaryTint : 'white',
                                        boxShadow: cell.isPicked
                                            ? `inset 0 0 0 2px ${colors.primary}`
                                            : cell.isSelected
                                                ? `inset 0 0 0 1.5px ${colors.primary}`
                                                : `inset 0 0 0 1px ${colors.borderLight}`,
                                        opacity: !cell.inMonth ? 0.4 : rescheduling && !cell.isBookable ? 0.45 : 1,
                                        cursor: rescheduling && !cell.isBookable ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    <div style={styles.dayCellHeader}>
                                        <span style={{ ...styles.dayNumber, ...(cell.isToday ? styles.dayNumberToday : {}) }}>
                                            {cell.day}
                                        </span>
                                        {cell.moreCount > 0 && (
                                            <span style={styles.moreLabel}>+{cell.moreCount}</span>
                                        )}
                                    </div>

                                    <div style={styles.chipList}>
                                        {cell.isPicked && (
                                            <div style={styles.pickedChip}>
                                                <span style={styles.chipTime}>
                                                    {editForm.scheduled_time ? formatTime(editForm.scheduled_time) : 'New'}
                                                </span>
                                                <span style={styles.chipName}>Moving here</span>
                                            </div>
                                        )}
                                        {cell.shown.map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Mid-reschedule a chip click picks the day rather
                                                    // than opening a different schedule
                                                    if (rescheduling) {
                                                        if (cell.isBookable) {
                                                            setEditForm({ ...editForm, scheduled_date: cell.key });
                                                        }
                                                        return;
                                                    }
                                                    openModal(s);
                                                }}
                                                style={{
                                                    ...styles.chip,
                                                    backgroundColor: statusColors[s.status]?.bg || colors.borderLight,
                                                    color: statusColors[s.status]?.text || colors.textMuted,
                                                }}
                                            >
                                                {s.scheduled_time && (
                                                    <span style={styles.chipTime}>{formatTime(s.scheduled_time)}</span>
                                                )}
                                                <span style={styles.chipName}>{getCustomerName(s)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.sideColumn}>

                        {rescheduling ? (
                        <div style={styles.sidePanel}>
                            <div style={styles.sidePanelEyebrow}>Rescheduling</div>
                            <div style={styles.selectedDateLabel}>
                                {getCustomerName(editingSchedule)}
                            </div>
                            <div style={styles.selectedCountLabel}>
                                {editForm.scheduled_date
                                    ? formatDateLong(editForm.scheduled_date)
                                    : 'Pick a day on the calendar'}
                            </div>

                            <form onSubmit={handleUpdate}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Start Time</label>
                                    <input
                                        type="time"
                                        value={editForm.scheduled_time}
                                        onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                                        className="input-field"
                                        style={styles.input}
                                        required
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>Assigned Technician</label>
                                    <input
                                        type="text"
                                        value={editForm.assigned_technician}
                                        onChange={(e) => setEditForm({ ...editForm, assigned_technician: e.target.value })}
                                        className="input-field"
                                        style={styles.input}
                                        placeholder="Technician name"
                                        required
                                    />
                                </div>

                                <div style={styles.formActions}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setEditingSchedule(null)}
                                        style={styles.cancelBtn}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{
                                            ...styles.saveBtn,
                                            opacity: editLoading || !editForm.scheduled_date ? 0.7 : 1,
                                            cursor: editLoading || !editForm.scheduled_date ? 'not-allowed' : 'pointer',
                                        }}
                                        disabled={editLoading || !editForm.scheduled_date}
                                    >
                                        {editLoading ? 'Saving...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        ) : (
                        <div style={styles.sidePanel}>
                            <div style={styles.sidePanelEyebrow}>Selected day</div>
                            <div style={styles.selectedDateLabel}>{formatDateLong(selectedDate)}</div>
                            <div style={styles.selectedCountLabel}>
                                {selectedDaySchedules.length === 0
                                    ? 'Nothing scheduled'
                                    : `${selectedDaySchedules.length} installation${selectedDaySchedules.length === 1 ? '' : 's'}`}
                            </div>

                            {selectedDaySchedules.length === 0 ? (
                                <div style={styles.emptyDay}>
                                    <div style={styles.emptyDayTitle}>No installations booked</div>
                                    <div style={styles.emptyDayDesc}>Nothing is scheduled for this day.</div>
                                </div>
                            ) : (
                                <div style={styles.dayEventList}>
                                    {selectedDaySchedules.map((s) => (
                                        <div key={s.id} onClick={() => openModal(s)} style={styles.dayEventCard}>
                                            <div style={styles.dayEventTop}>
                                                <span style={styles.dayEventTime}>
                                                    <ClockIcon size={12} color={colors.textMuted} />
                                                    {formatTime(s.scheduled_time) || 'Time TBD'}
                                                </span>
                                                <span style={{
                                                    ...styles.statusPill,
                                                    backgroundColor: statusColors[s.status]?.bg,
                                                    color: statusColors[s.status]?.text,
                                                }}>
                                                    {STATUS_LABELS[s.status] || s.status}
                                                </span>
                                            </div>
                                            <div style={styles.dayEventName}>{getCustomerName(s)}</div>
                                            <div style={styles.dayEventMetaRow}>
                                                <span style={styles.metaChip}>
                                                    <SunIcon size={12} color="currentColor" />
                                                    {getSystemType(s)}
                                                </span>
                                                {getCapacityKw(s) && (
                                                    <span style={styles.metaChip}>{getCapacityKw(s)} kW</span>
                                                )}
                                                <span style={styles.metaChip}>
                                                    <LocationIcon size={12} color="currentColor" />
                                                    {getLocation(s)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        <div style={styles.sidePanel}>
                            <div style={styles.sidePanelEyebrow}>This month</div>
                            <div style={styles.statsList}>
                                <div style={styles.statRow}>
                                    <span style={styles.statLabel}>Installations</span>
                                    <span style={styles.statValue}>{monthSchedules.length}</span>
                                </div>
                                <div style={styles.statRow}>
                                    <span style={styles.statLabel}>Capacity installed</span>
                                    <span style={styles.statValue}>{monthCapacityKw.toFixed(1)} kW</span>
                                </div>
                                <div style={{ ...styles.statRow, borderBottom: 'none' }}>
                                    <span style={styles.statLabel}>Delayed jobs</span>
                                    <span style={styles.statValue}>{monthDelayed}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalSchedule && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>

                        <div style={{
                            ...styles.modalHeader,
                            backgroundColor: statusColors[modalSchedule.status]?.bg || colors.primaryTint,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    ...styles.modalEyebrow,
                                    color: statusColors[modalSchedule.status]?.text || colors.primary,
                                }}>
                                    Installation
                                </div>
                                <h2 style={styles.modalTitle}>{getCustomerName(modalSchedule)}</h2>
                                <p style={styles.modalSubtitle}>
                                    {getSystemType(modalSchedule)}
                                    {getCapacityKw(modalSchedule) ? ` · ${getCapacityKw(modalSchedule)} kW` : ''}
                                </p>
                            </div>
                            <button onClick={closeModal} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={colors.textMuted} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.modalFieldRow}>
                                <span style={styles.modalFieldLabel}>Date</span>
                                <span style={styles.modalFieldValue}>{formatDateLong(getDateKey(modalSchedule))}</span>
                            </div>
                            <div style={styles.modalFieldRow}>
                                <span style={styles.modalFieldLabel}>Time</span>
                                <span style={styles.modalFieldValue}>{formatTime(modalSchedule.scheduled_time) || 'TBD'}</span>
                            </div>
                            <div style={styles.modalFieldRow}>
                                <span style={styles.modalFieldLabel}>Status</span>
                                <span style={{
                                    ...styles.statusPill,
                                    backgroundColor: statusColors[modalSchedule.status]?.bg,
                                    color: statusColors[modalSchedule.status]?.text,
                                }}>
                                    {STATUS_LABELS[modalSchedule.status] || modalSchedule.status}
                                </span>
                            </div>
                            <div style={{ ...styles.modalFieldRow, borderBottom: 'none' }}>
                                <span style={styles.modalFieldLabel}>Location</span>
                                <span style={styles.modalFieldValue}>{getLocation(modalSchedule)}</span>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <div style={styles.statusActions}>
                                {STATUSES.map((status) => {
                                    const isCurrent = modalSchedule.status === status;

                                    return (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            style={{
                                                ...styles.statusActionBtn,
                                                ...(isCurrent ? styles.statusActionBtnCurrent : {}),
                                                opacity: statusUpdating ? 0.6 : 1,
                                                cursor: statusUpdating || isCurrent ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={statusUpdating || isCurrent}
                                        >
                                            {isCurrent && <CheckIcon size={13} color="white" />}
                                            <span>{STATUS_LABELS[status]}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button onClick={() => openEdit(modalSchedule)} className="btn-secondary" style={styles.rescheduleBtn}>
                                <EditIcon size={14} color={colors.textBody} />
                                <span>Reschedule</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

const styles = {
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: colors.textMuted,
        margin: '0 0 1.5rem 0',
    },
    success: {
        backgroundColor: colors.successTint,
        color: colors.success,
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    error: {
        backgroundColor: colors.dangerTint,
        color: colors.danger,
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    field: {
        marginBottom: '1rem',
        flex: 1,
    },
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
    },
    pickedChip: {
        padding: '3px 5px',
        borderRadius: '5px',
        fontSize: '0.65rem',
        lineHeight: 1.3,
        overflow: 'hidden',
        backgroundColor: colors.primary,
        color: 'white',
        fontWeight: '600',
    },
    cancelBtn: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
    },
    saveBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '1.5rem',
        alignItems: 'start',
    },
    calendarCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        minWidth: 0,
    },
    calendarHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    monthLabel: {
        fontSize: '1.15rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    monthNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '3px',
        borderRadius: '10px',
        backgroundColor: colors.borderLight,
    },
    navBtn: {
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        cursor: 'pointer',
    },
    todayBtn: {
        padding: '0.4rem 0.75rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: colors.primary,
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '4px',
        borderRadius: '10px',
        backgroundColor: colors.borderLight,
        marginBottom: '1.25rem',
        width: 'fit-content',
        maxWidth: '100%',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 0.75rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: colors.textMuted,
        fontSize: '0.8rem',
        fontWeight: '500',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    legendItemActive: {
        backgroundColor: 'white',
        color: '#111827',
        fontWeight: '600',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    legendDot: {
        width: '7px',
        height: '7px',
        borderRadius: '50%',
    },
    legendCount: {
        fontSize: '0.7rem',
        color: colors.textFaint === colors.textFaint ? '#9ca3af' : '#9ca3af',
    },
    weekdayRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '6px',
        marginBottom: '4px',
    },
    weekdayLabel: {
        fontSize: '0.7rem',
        fontWeight: '600',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#9ca3af',
        padding: '0 2px 4px',
    },
    cellGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '6px',
    },
    dayCell: {
        minHeight: '96px',
        borderRadius: '10px',
        padding: '6px 7px',
        cursor: 'pointer',
        overflow: 'hidden',
    },
    dayCellHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    dayNumber: {
        fontSize: '0.75rem',
        color: '#374151',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNumberToday: {
        backgroundColor: colors.primary,
        color: 'white',
        borderRadius: '50%',
        fontWeight: '600',
    },
    moreLabel: {
        fontSize: '0.65rem',
        color: '#9ca3af',
    },
    chipList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
    },
    chip: {
        padding: '3px 5px',
        borderRadius: '5px',
        fontSize: '0.65rem',
        lineHeight: 1.3,
        cursor: 'pointer',
        overflow: 'hidden',
    },
    chipTime: {
        fontWeight: '600',
        marginRight: '4px',
    },
    chipName: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    sideColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    sidePanel: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.25rem 1.25rem 1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    sidePanelEyebrow: {
        fontSize: '0.7rem',
        fontWeight: '600',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#9ca3af',
        marginBottom: '0.5rem',
    },
    selectedDateLabel: {
        fontSize: '1.05rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '0.2rem',
    },
    selectedCountLabel: {
        fontSize: '0.8rem',
        color: '#9ca3af',
        marginBottom: '1rem',
    },
    emptyDay: {
        padding: '1.5rem 1rem',
        borderRadius: '12px',
        backgroundColor: colors.borderLight,
        textAlign: 'center',
    },
    emptyDayTitle: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.25rem',
    },
    emptyDayDesc: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    dayEventList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    dayEventCard: {
        padding: '0.875rem',
        borderRadius: '10px',
        border: '1px solid #f3f4f6',
        cursor: 'pointer',
    },
    dayEventTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        gap: '0.5rem',
    },
    dayEventTime: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#374151',
    },
    statusPill: {
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: '700',
        whiteSpace: 'nowrap',
    },
    dayEventName: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '0.35rem',
    },
    dayEventMetaRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
    },
    metaChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        backgroundColor: colors.borderLight,
        color: '#6b7280',
        padding: '0.2rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
    },
    statsList: {
        display: 'flex',
        flexDirection: 'column',
    },
    statRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '0.7rem 0',
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    statLabel: {
        fontSize: '0.8rem',
        color: colors.textMuted,
    },
    statValue: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#111827',
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '1rem',
    },
    modalCard: {
        backgroundColor: 'white',
        borderRadius: '20px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.5rem 1.5rem 1.25rem',
    },
    modalEyebrow: {
        fontSize: '0.7rem',
        fontWeight: '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
    },
    modalTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.3rem 0',
    },
    modalSubtitle: {
        fontSize: '0.85rem',
        color: '#4b5563',
        margin: 0,
    },
    modalCloseBtn: {
        width: '32px',
        height: '32px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '0.5rem 1.5rem 1rem',
        overflowY: 'auto',
    },
    modalFieldRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid #f3f4f6',
    },
    modalFieldLabel: {
        fontSize: '0.8rem',
        color: '#9ca3af',
    },
    modalFieldValue: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#111827',
        textAlign: 'right',
    },
    modalFooter: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid #f3f4f6',
    },
    rescheduleBtn: {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        gap: '0.4rem',
        padding: '0.6rem 1rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: '600',
    },
    statusActions: {
        display: 'flex',
        width: '100%',
        gap: '0.5rem',
    },
    statusActionBtn: {
        display: 'flex',
        alignItems: 'center',
        // Equal flex keeps all four slots the same size, so no button moves
        // or changes when the status changes
        flex: 1,
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        gap: '0.3rem',
        padding: '0.6rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        border: `1px solid ${colors.border}`,
        backgroundColor: 'white',
        color: colors.textBody,
    },
    statusActionBtnCurrent: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        color: 'white',
    },
};
