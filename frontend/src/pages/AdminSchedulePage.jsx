import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    PlusIcon,
} from '../components/Icons';
import ScheduleModal from '../components/ScheduleModal';
import api from '../api/axios';
import { colors, typography, statusColors } from '../styles/theme';

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
    const location = useLocation();
    const navigate = useNavigate();

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

    // Reschedule: the schedule being moved, shown in the shared ScheduleModal
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    // New booking: who it's for. Date, time, technician and notes are picked
    // inside the shared ScheduleModal.
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        customer_id: '',
        quotation_id: '',
    });
    const [linkedQuotation, setLinkedQuotation] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');


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
        schedule.customer?.user?.name ||
        schedule.quotation?.quotation_request?.customer?.user?.name ||
        schedule.external_installation_request?.name ||
        'Unknown';

    const getSystemType = (schedule) => {
        if (!schedule.quotation) return 'Installation Service Only';
        const type = schedule.quotation?.quotation_request?.solar_system_type;
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
    };

    const getCapacityKw = (schedule) =>
        schedule.quotation?.quotation_request?.solar_computation?.panel_capacity_kw;

    const getLocation = (schedule) =>
        schedule.quotation?.quotation_request?.customer?.install_location ||
        schedule.customer?.install_location ||
        schedule.external_installation_request?.address ||
        '—';

    const getDateKey = (schedule) => schedule.scheduled_date.split('T')[0];

    const filteredSchedules = statusFilter === 'all'
        ? schedules
        : schedules.filter((s) => s.status === statusFilter);

    const statusCounts = STATUSES.reduce((acc, status) => {
        acc[status] = schedules.filter((s) => s.status === status).length;
        return acc;
    }, {});

    const selectedDaySchedules = filteredSchedules
        .filter((s) => getDateKey(s) === selectedDate)
        .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

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

    const fetchCustomers = async () => {
        setCustomersLoading(true);
        try {
            const res = await api.get('/admin/customers');
            setCustomers(res.data);
        } catch {
            setCreateError('Failed to load customers.');
        } finally {
            setCustomersLoading(false);
        }
    };

    const openCreateModal = () => {
        setCreateForm({ customer_id: '', quotation_id: '' });
        setLinkedQuotation(null);
        setCreateError('');
        setShowCreateModal(true);
        fetchCustomers();
    };

    // Landed here from a quotation's "Schedule" button — open the modal pre-filled
    // and locked to that quotation instead of the free-form customer picker.
    const openCreateModalForQuotation = (info) => {
        setCreateForm({ customer_id: '', quotation_id: info.id });
        setLinkedQuotation(info);
        setCreateError('');
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setLinkedQuotation(null);
    };

    useEffect(() => {
        const state = location.state;
        if (!state?.scheduleQuotationId) return;

        // Deferred to a microtask so this state update lands after the effect
        // returns rather than cascading a render inside it
        Promise.resolve().then(() => {
            openCreateModalForQuotation({
                id: state.scheduleQuotationId,
                customerName: state.scheduleCustomerName || 'Customer',
                location: state.scheduleLocation || '',
                reference: state.scheduleReference || '',
            });

            // Clear the router state so a refresh or back/forward doesn't reopen the modal
            navigate(location.pathname, { replace: true });
        });
        // Only ever meant to run once, against whatever state we arrived with
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // values comes from ScheduleModal: { scheduled_date, scheduled_time, assigned_technician, notes }
    const handleCreateManualSchedule = async (values) => {
        setCreateLoading(true);
        setCreateError('');

        try {
            await api.post('/admin/schedules', {
                ...(createForm.quotation_id
                    ? { quotation_id: createForm.quotation_id }
                    : { customer_id: createForm.customer_id }),
                scheduled_date: values.scheduled_date,
                scheduled_time: values.scheduled_time,
                assigned_technician: values.assigned_technician,
                notes: values.notes || undefined,
            });
            setShowCreateModal(false);
            setLinkedQuotation(null);
            setSuccess('Installation schedule created successfully.');
            fetchSchedules();
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to create installation schedule.');
        } finally {
            setCreateLoading(false);
        }
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
        setEditingSchedule(schedule);
        setEditError('');
        setModalSchedule(null);
        setError('');
        setSuccess('');
    };

    // values comes from ScheduleModal. The update endpoint doesn't take notes.
    const handleUpdate = async (values) => {
        setEditLoading(true);
        setEditError('');
        setSuccess('');

        try {
            await api.put(`/admin/schedules/${editingSchedule.id}`, {
                scheduled_date: values.scheduled_date,
                scheduled_time: values.scheduled_time,
                assigned_technician: values.assigned_technician,
            });
            setSuccess('Schedule updated successfully.');
            setEditingSchedule(null);
            fetchSchedules();
        } catch (err) {
            setEditError(err.response?.data?.message || 'Failed to update schedule.');
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
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Installation Schedule</h1>
                    <p style={styles.pageSubtitle}>
                        View and manage all scheduled solar installations.
                    </p>
                </div>
                <button className="btn-primary" style={styles.newScheduleBtn} onClick={openCreateModal}>
                    <PlusIcon size={14} color="white" />
                    <span>New Schedule</span>
                </button>
            </div>

            {success && <div style={styles.success}>{success}</div>}
            {error && <div style={styles.error}>{error}</div>}

            {loading ? (
                <LoadingState label="Loading schedules..." />
            ) : schedules.length === 0 ? (
                <EmptyState
                    icon={<CalendarIcon size={32} color={colors.textFaint} />}
                    title="No installation schedules yet"
                    description="Schedules are created when approving quotations, or you can book one directly for a customer who already has their own materials."
                    actionLabel="Schedule Installation"
                    onAction={openCreateModal}
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
                                    onClick={() => setSelectedDate(cell.key)}
                                    style={{
                                        ...styles.dayCell,
                                        backgroundColor: cell.isSelected ? colors.primaryTint : 'white',
                                        boxShadow: cell.isSelected
                                            ? `inset 0 0 0 1.5px ${colors.primary}`
                                            : `inset 0 0 0 1px ${colors.borderLight}`,
                                        opacity: !cell.inMonth ? 0.4 : 1,
                                        cursor: 'pointer',
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
                                        {cell.shown.map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                            <div style={{ ...styles.modalFieldRow, borderBottom: modalSchedule.notes ? '1px solid #f3f4f6' : 'none' }}>
                                <span style={styles.modalFieldLabel}>Location</span>
                                <span style={styles.modalFieldValue}>{getLocation(modalSchedule)}</span>
                            </div>
                            {modalSchedule.notes && (
                                <div style={{ ...styles.modalFieldRow, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                                    <span style={styles.modalFieldLabel}>Notes</span>
                                    <span style={{ ...styles.modalFieldValue, textAlign: 'left' }}>{modalSchedule.notes}</span>
                                </div>
                            )}
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

            {showCreateModal && (
                <ScheduleModal
                    contextLabel={linkedQuotation ? 'For quotation' : 'New booking'}
                    badge={linkedQuotation ? (linkedQuotation.reference || `#${linkedQuotation.id}`) : null}
                    schedules={schedules}
                    intro={linkedQuotation ? (
                        <div style={styles.linkedQuotationBox}>
                            {linkedQuotation.reference && (
                                <div style={styles.linkedQuotationRef}>{linkedQuotation.reference}</div>
                            )}
                            <div style={styles.linkedQuotationName}>{linkedQuotation.customerName}</div>
                            {linkedQuotation.location && (
                                <div style={styles.linkedQuotationLocation}>{linkedQuotation.location}</div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.field}>
                            <label htmlFor="schedule-customer" style={styles.label}>Customer</label>
                            <select
                                id="schedule-customer"
                                value={createForm.customer_id}
                                onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}
                                className="input-field"
                                style={styles.input}
                            >
                                <option value="">
                                    {customersLoading ? 'Loading customers...' : '— Select a customer —'}
                                </option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.user?.name} — {c.contact_number}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    extraValid={Boolean(createForm.quotation_id || createForm.customer_id)}
                    submitting={createLoading}
                    error={createError}
                    onSubmit={handleCreateManualSchedule}
                    onClose={closeCreateModal}
                />
            )}

            {editingSchedule && (
                <ScheduleModal
                    title="Reschedule installation"
                    contextLabel="For"
                    badge={getCustomerName(editingSchedule)}
                    schedules={schedules}
                    excludeScheduleId={editingSchedule.id}
                    initial={{
                        scheduled_date: getDateKey(editingSchedule),
                        scheduled_time: editingSchedule.scheduled_time,
                        assigned_technician: editingSchedule.assigned_technician,
                    }}
                    showNotes={false}
                    confirmLabel="Save new schedule"
                    submitting={editLoading}
                    error={editError}
                    onSubmit={handleUpdate}
                    onClose={() => setEditingSchedule(null)}
                />
            )}
        </AdminLayout>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    newScheduleBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        minHeight: '40px',
        padding: '0.65rem 1.1rem',
        borderRadius: '9px',
        fontSize: '0.875rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(15,59,44,.14)',
    },
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
    linkedQuotationBox: {
        border: `1px solid ${colors.primaryBorder}`,
        backgroundColor: colors.primaryTint,
        borderRadius: '8px',
        padding: '0.625rem 0.75rem',
    },
    linkedQuotationRef: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: colors.primary,
        marginBottom: '0.125rem',
    },
    linkedQuotationName: {
        fontSize: '0.9375rem',
        fontWeight: '600',
        color: colors.textDark,
    },
    linkedQuotationLocation: {
        fontSize: '0.8125rem',
        color: colors.textMuted,
        marginTop: '0.125rem',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
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
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: '1rem',
        overflowY: 'auto',
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
