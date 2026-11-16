import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminHero, { FilterTiles } from '../components/AdminHero';
import { adminTokens, adminUi, adminStatus } from '../styles/adminTheme';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import {
    CalendarIcon,
    ClockIcon,
    EditIcon,
    ChevronDownIcon,
    CheckIcon,
    XIcon,
    PlusIcon,
    FileTextIcon,
} from '../components/Icons';
import ScheduleModal from '../components/ScheduleModal';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { colors, statusColors, smallGreenButton, whiteButton } from '../styles/theme';
import { formatQuotationRef, formatExternalRef } from '../utils/references';
import { formatPeso } from '../utils/quotationDisplay';
import { formatPhone } from '../utils/phone';
import { readSeenCounts } from '../utils/adminSeen';

const STATUSES = ['scheduled', 'in_progress', 'completed', 'delayed'];

const STATUS_LABELS = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
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
    // On phones the "Selected day" panel sits below the calendar, so tapping
    // a day scrolls down to it
    const sidePanelRef = useRef(null);
    const selectDay = (key) => {
        setSelectedDate(key);
        if (window.matchMedia('(max-width: 640px)').matches) {
            requestAnimationFrame(() => sidePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
    };
    const [statusFilter, setStatusFilter] = useState('all');

    // The newest schedule id seen on the last visit. Read before the sidebar
    // updates it, so schedules added since then can be marked "New".
    const [seenUpTo] = useState(() => readSeenCounts().scheduleLatest ?? null);
    const isNew = (schedule) => seenUpTo !== null && schedule.id > seenUpTo;

    const [modalSchedule, setModalSchedule] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    // Status the admin picked, waiting for them to confirm it
    const [pendingStatus, setPendingStatus] = useState(null);
    // Shown inside the details window (the page banner is hidden behind it)
    const [statusError, setStatusError] = useState('');

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
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the schedules. Please try again."));
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
        schedule.quotation?.quotation_request?.installation_address ||
        schedule.quotation?.quotation_request?.customer?.install_location ||
        schedule.customer?.install_location ||
        schedule.external_installation_request?.address ||
        '—';

    const getSiteDescription = (schedule) =>
        schedule.quotation?.quotation_request?.site_description ||
        schedule.external_installation_request?.site_description;

    const getDateKey = (schedule) => schedule.scheduled_date.split('T')[0];

    // The "Quotation" part of the details window: which quote (or external
    // request) the installation is for, the system, the price and a phone number
    const getQuoteDetails = (schedule) => {
        const request = schedule.quotation?.quotation_request;
        if (request) {
            const c = request.solar_computation;
            const battery = c?.battery_ah
                ? `${c.battery_qty > 1 ? `${c.battery_qty} × ` : ''}${c.battery_ah} Ah${c.extra_battery_ah ? ` + ${c.extra_battery_ah} Ah` : ''} battery`
                : null;
            return {
                reference: formatQuotationRef(request.id, request.created_at),
                quotationRequestId: request.id,
                rows: [
                    ['System', [
                        c?.package_kw && `${parseFloat(c.package_kw)} kW inverter`,
                        c?.panel_count && `${c.panel_count} panels`,
                        battery,
                    ].filter(Boolean).join(' · ')],
                    ['Approved total', schedule.quotation.total_amount != null ? formatPeso(schedule.quotation.total_amount) : null],
                    ['Contact number', formatPhone(request.customer?.contact_number)],
                ],
            };
        }

        const external = schedule.external_installation_request;
        if (external) {
            return {
                reference: formatExternalRef(external.id),
                rows: [
                    ['Quoted by', external.other_company_name],
                    ['Contact number', formatPhone(external.phone)],
                ],
            };
        }

        // Booked straight for a customer, without a quotation
        return { reference: null, rows: [['Contact number', formatPhone(schedule.customer?.contact_number)]] };
    };

    const modalDetails = modalSchedule ? getQuoteDetails(modalSchedule) : null;

    // Added since the last visit, soonest first
    const newSchedules = schedules
        .filter(isNew)
        .sort((a, b) => getDateKey(a).localeCompare(getDateKey(b)));

    // From the "New" list: go to that day on the calendar and open it
    const showSchedule = (schedule) => {
        const key = getDateKey(schedule);
        const [y, m] = key.split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
        setSelectedDate(key);
        openModal(schedule);
    };

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
        } catch (err) {
            setCreateError(errorMessage(err, "Couldn't load the customer list. Close this window and try again."));
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
            // Made on this page, so the sidebar shouldn't call it new later
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setCreateError(errorMessage(err, "Couldn't create the installation schedule. Please try again."));
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
        setStatusError('');
        setModalSchedule(schedule);
        setSelectedDate(getDateKey(schedule));
    };

    const closeModal = () => setModalSchedule(null);

    // Landed here from an installation in the Overview's "Upcoming installations"
    // card: once the schedules load, go to its day and open its details
    const openOnArrival = useRef(location.state?.openScheduleId ?? null);
    useEffect(() => {
        if (!openOnArrival.current || loading) return;
        const id = openOnArrival.current;
        openOnArrival.current = null;
        const schedule = schedules.find((s) => s.id === id);

        Promise.resolve().then(() => {
            if (schedule) {
                const [y, m] = getDateKey(schedule).split('-').map(Number);
                setViewYear(y);
                setViewMonth(m - 1);
                openModal(schedule);
            } else if (!error) {
                setError('That installation is no longer on the schedule.');
            }
            // Clear the router state so a refresh or back/forward doesn't reopen it
            navigate(location.pathname, { replace: true });
        });
        // Runs once, when the first load finishes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, schedules]);

    const handleStatusChange = async (newStatus) => {
        if (!modalSchedule) return;
        setStatusUpdating(true);
        setStatusError('');

        try {
            const res = await api.patch(`/admin/schedules/${modalSchedule.id}/status`, {
                status: newStatus,
            });
            // Only the status changed. The reply leaves out the customer and the
            // external request, so keep what the window already shows.
            setModalSchedule((prev) => ({ ...prev, status: res.data.schedule.status }));
            setSuccess('Status updated.');
            fetchSchedules();
        } catch (err) {
            setStatusError(errorMessage(err, "Couldn't update the installation status. Please try again."));
        } finally {
            setStatusUpdating(false);
            setPendingStatus(null);
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
            setEditError(errorMessage(err, "Couldn't save the new schedule. Please try again."));
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

    // "Saturday, November 14" for the selected-day panel
    const formatDateShort = (dateKey) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    // Installations in the month on screen, for the banner
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
    const monthCount = schedules.filter((s) => getDateKey(s).startsWith(monthPrefix)).length;

    return (
        <AdminLayout active="Schedule">
            <AdminHero
                eyebrow={`${MONTHS[viewMonth]} ${viewYear} · ${monthCount} installation${monthCount === 1 ? '' : 's'}`}
                title="Installation schedule"
                subtitle="All scheduled solar installations"
                actions={
                    <button className="btn-primary" style={styles.newScheduleBtn} onClick={openCreateModal}>
                        <PlusIcon size={16} color="currentColor" />
                        <span>New schedule</span>
                    </button>
                }
            >
                <FilterTiles
                    label="Filter by status"
                    minWidth={140}
                    options={[
                        { key: 'all', label: 'All', dot: '#FFFFFF', count: schedules.length },
                        ...STATUSES.map((status) => ({
                            key: status,
                            label: STATUS_LABELS[status],
                            dot: adminStatus[status].darkDot,
                            count: statusCounts[status],
                        })),
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </AdminHero>

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
                <div className="cal-layout" style={styles.contentGrid}>

                    <section className="cal-card" style={styles.calendarCard}>

                        <div style={styles.calendarHeader}>
                            <h2 style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</h2>
                            <div style={styles.monthNav}>
                                <button onClick={() => shiftMonth(-1)} className="m-tap" style={styles.navBtn} aria-label="Previous month">
                                    <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                                        <ChevronDownIcon size={16} color={adminTokens.ink} />
                                    </span>
                                </button>
                                <button onClick={goToToday} style={styles.todayBtn}>Today</button>
                                <button onClick={() => shiftMonth(1)} className="m-tap" style={styles.navBtn} aria-label="Next month">
                                    <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
                                        <ChevronDownIcon size={16} color={adminTokens.ink} />
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="cal-grid" aria-hidden="true" style={styles.weekdayRow}>
                            {WEEKDAYS.map((w, i) => (
                                <div key={w} style={{ ...styles.weekdayLabel, color: i === 0 || i === 6 ? adminTokens.subtle : adminTokens.muted }}>{w}</div>
                            ))}
                        </div>

                        <div className="cal-grid" style={styles.cellGrid}>
                            {cells.map((cell, i) => (
                                <div
                                    key={cell.key}
                                    className="cal-cell"
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={cell.isSelected}
                                    aria-label={`${formatDateLong(cell.key)}, ${cell.shown.length + cell.moreCount} installation${cell.shown.length + cell.moreCount === 1 ? '' : 's'}`}
                                    onClick={() => selectDay(cell.key)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDay(cell.key); } }}
                                    style={{
                                        ...styles.dayCell,
                                        ...(i % 7 ? styles.dayCellDivider : {}),
                                        backgroundColor: cell.isSelected ? adminTokens.greenTint : (cell.inMonth ? '#FFFFFF' : adminTokens.headBg),
                                        boxShadow: cell.isSelected ? `inset 0 0 0 2px ${adminTokens.green}` : 'none',
                                    }}
                                >
                                    <div style={styles.dayCellHeader}>
                                        <span style={{
                                            ...styles.dayNumber,
                                            ...(cell.inMonth ? {} : { color: '#A3AAA6' }),
                                            ...(cell.isToday ? styles.dayNumberToday : {}),
                                        }}>
                                            {cell.day}
                                        </span>
                                        {cell.moreCount > 0 && (
                                            <span className="cal-more" style={styles.moreLabel}>+{cell.moreCount}</span>
                                        )}
                                    </div>

                                    {/* Phones: a dot instead of the chips, which are unreadable at that size */}
                                    {cell.shown.length > 0 && <span className="cal-dot" aria-hidden="true" />}
                                    <div className="cal-chips" style={styles.chipList}>
                                        {cell.shown.map((s) => {
                                            const tone = adminStatus[s.status] || adminStatus.scheduled;
                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openModal(s);
                                                    }}
                                                    style={{
                                                        ...styles.chip,
                                                        backgroundColor: tone.bg,
                                                        color: tone.fg,
                                                        borderLeft: `3px solid ${tone.dot}`,
                                                    }}
                                                >
                                                    {isNew(s) && <span style={styles.newDot} title="New" aria-label="New" />}
                                                    {s.scheduled_time && (
                                                        <span style={styles.chipTime}>{formatTime(s.scheduled_time).replace(/ [AP]M$/, '')}</span>
                                                    )}
                                                    {getCustomerName(s)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={styles.legend}>
                            {STATUSES.map((status) => (
                                <span key={status} style={styles.legendItem}>
                                    <span style={{ ...styles.legendDot, backgroundColor: adminStatus[status].dot }} />
                                    {STATUS_LABELS[status]}
                                </span>
                            ))}
                        </div>
                    </section>

                    <div ref={sidePanelRef} className="m-static" style={styles.sideColumn}>

                        {newSchedules.length > 0 && (
                            <aside aria-label="New schedules" style={{ ...styles.sidePanel, ...styles.newPanel }}>
                                <div style={styles.sidePanelHead}>
                                    <span style={styles.sidePanelEyebrow}>New since your last visit</span>
                                    <h2 style={styles.selectedDateLabel}>
                                        {newSchedules.length} new installation{newSchedules.length === 1 ? '' : 's'}
                                    </h2>
                                </div>
                                <ul style={styles.newList}>
                                    {newSchedules.map((s) => (
                                        <li key={s.id}>
                                            <button type="button" onClick={() => showSchedule(s)} style={styles.newItem}>
                                                <span style={styles.newDot} aria-hidden="true" />
                                                <span style={{ minWidth: 0, flex: 1 }}>
                                                    <span style={styles.newItemName}>{getCustomerName(s)}</span>
                                                    <span style={styles.newItemWhen}>
                                                        {formatDateLong(getDateKey(s))}{s.scheduled_time ? ` · ${formatTime(s.scheduled_time)}` : ''}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </aside>
                        )}

                        <aside aria-label="Selected day" style={styles.sidePanel}>
                            <div style={styles.sidePanelHead}>
                                <span style={styles.sidePanelEyebrow}>{selectedDate === TODAY_KEY ? 'Today' : 'Selected day'}</span>
                                <h2 style={styles.selectedDateLabel}>{formatDateShort(selectedDate)}</h2>
                                <p style={styles.selectedCountLabel}>
                                    {selectedDaySchedules.length === 0
                                        ? 'Nothing scheduled'
                                        : `${selectedDaySchedules.length} installation${selectedDaySchedules.length === 1 ? '' : 's'}`}
                                </p>
                            </div>

                            {selectedDaySchedules.length === 0 ? (
                                <div style={styles.emptyDay}>
                                    <p style={{ margin: '0 0 12px' }}>No installations on this day.</p>
                                    <button type="button" style={styles.smallOutlineBtn} onClick={openCreateModal}>Schedule one</button>
                                </div>
                            ) : (
                                <ul style={styles.dayEventList}>
                                    {selectedDaySchedules.map((s) => {
                                        const tone = adminStatus[s.status] || adminStatus.scheduled;
                                        const kw = getCapacityKw(s);
                                        return (
                                            <li key={s.id} style={{ ...styles.dayEventCard, borderLeft: `3px solid ${tone.dot}` }}>
                                                <div style={styles.dayEventTop}>
                                                    <span style={styles.dayEventTime}>
                                                        <ClockIcon size={15} color="currentColor" />
                                                        {formatTime(s.scheduled_time) || 'Time TBD'}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', gap: '6px' }}>
                                                        {isNew(s) && <span style={styles.newPill}>New</span>}
                                                        <span style={{ ...styles.statusPill, backgroundColor: tone.bg, color: tone.fg }}>
                                                            {s.status === 'completed' && <CheckIcon size={12} color="currentColor" />}
                                                            {STATUS_LABELS[s.status] || s.status}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={styles.dayEventName}>{getCustomerName(s)}</div>
                                                <dl style={styles.dayEventDetails}>
                                                    <dt style={styles.dayEventDt}>System</dt>
                                                    <dd style={styles.dayEventDd}>{getSystemType(s)}{kw ? ` · ${kw} kW` : ''}</dd>
                                                    <dt style={styles.dayEventDt}>Address</dt>
                                                    <dd style={styles.dayEventDd}>{getLocation(s)}</dd>
                                                </dl>
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                                                    <button type="button" style={styles.smallOutlineBtn} onClick={() => openModal(s)}>View details</button>
                                                    {s.status !== 'completed' && (
                                                        <button type="button" style={styles.smallOutlineBtn} onClick={() => openEdit(s)}>Reschedule</button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </aside>
                    </div>
                </div>
            )}

            {modalSchedule && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>

                        <div style={{
                            ...styles.modalHeader,
                            backgroundColor: statusColors[modalSchedule.status]?.bg || adminTokens.greenTint,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    ...styles.modalEyebrow,
                                    color: statusColors[modalSchedule.status]?.text || adminTokens.green,
                                }}>
                                    Installation{modalDetails.reference ? ` · ${modalDetails.reference}` : ''}
                                </div>
                                <h2 style={styles.modalTitle}>{getCustomerName(modalSchedule)}</h2>
                                <p style={styles.modalSubtitle}>
                                    {getSystemType(modalSchedule)}
                                    {getCapacityKw(modalSchedule) ? ` · ${getCapacityKw(modalSchedule)} kW` : ''}
                                </p>
                            </div>
                            <button onClick={closeModal} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={adminTokens.muted} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.modalSectionLabel}>Quotation</div>
                            <div style={styles.modalFieldRow}>
                                <span style={styles.modalFieldLabel}>Reference</span>
                                {modalDetails.reference
                                    ? <span style={styles.refCode}>{modalDetails.reference}</span>
                                    : <span style={styles.modalFieldValue}>Booked without a quotation</span>}
                            </div>
                            {modalDetails.rows.filter(([, value]) => value).map(([label, value]) => (
                                <div key={label} style={styles.modalFieldRow}>
                                    <span style={styles.modalFieldLabel}>{label}</span>
                                    <span style={styles.modalFieldValue}>{value}</span>
                                </div>
                            ))}

                            <div style={styles.modalSectionLabel}>Installation</div>
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
                                    {modalSchedule.status === 'completed' && <CheckIcon size={12} color="currentColor" />}
                                    {STATUS_LABELS[modalSchedule.status] || modalSchedule.status}
                                </span>
                            </div>
                            <div style={{ ...styles.modalFieldRow, borderBottom: modalSchedule.notes ? '1px solid #eef0ec' : 'none' }}>
                                <span style={styles.modalFieldLabel}>Location</span>
                                <span style={styles.modalFieldValue}>{getLocation(modalSchedule)}</span>
                            </div>
                            {getSiteDescription(modalSchedule) && (
                                <div style={{ ...styles.modalFieldRow, flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                                    <span style={styles.modalFieldLabel}>About the site (from the customer)</span>
                                    <span style={{ ...styles.modalFieldValue, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                                        {getSiteDescription(modalSchedule)}
                                    </span>
                                </div>
                            )}
                            {modalSchedule.notes && (
                                <div style={{ ...styles.modalFieldRow, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                                    <span style={styles.modalFieldLabel}>Notes</span>
                                    <span style={{ ...styles.modalFieldValue, textAlign: 'left' }}>{modalSchedule.notes}</span>
                                </div>
                            )}
                        </div>

                        {statusError && <div role="alert" style={styles.modalError}>{statusError}</div>}
                        <div style={styles.modalFooter}>
                            {/* A completed installation is final (the server refuses changes too) */}
                            {modalSchedule.status === 'completed' ? (
                                <div role="status" style={styles.completedBox}>
                                    <span style={styles.completedCheck} aria-hidden="true">
                                        <CheckIcon size={18} color="#FFFFFF" />
                                    </span>
                                    <span style={{ fontWeight: 700, color: '#1F6B45' }}>Installation Complete</span>
                                </div>
                            ) : (
                            <>
                            <span style={{ ...styles.modalSectionLabel, margin: 0 }}>Update status</span>
                            <div className="status-actions" style={styles.statusActions}>
                                {STATUSES.map((status) => {
                                    const isCurrent = modalSchedule.status === status;

                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            className={isCurrent ? undefined : 'btn-secondary'}
                                            onClick={() => setPendingStatus(status)}
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
                            </>
                            )}

                            <div style={styles.footerActions}>
                                {modalDetails.quotationRequestId && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/admin/quotation-requests/${modalDetails.quotationRequestId}`)}
                                        style={styles.viewQuoteBtn}
                                    >
                                        <FileTextIcon size={15} color={adminTokens.body} />
                                        <span>View quotation</span>
                                    </button>
                                )}
                                {modalSchedule.status !== 'completed' && (
                                    <button type="button" onClick={() => openEdit(modalSchedule)} className="btn-primary" style={styles.rescheduleBtn}>
                                        <EditIcon size={15} color="#ffffff" />
                                        <span>Reschedule</span>
                                    </button>
                                )}
                            </div>
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
                                        {c.user?.name} — {formatPhone(c.contact_number)}
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
            <ConfirmDialog
                open={!!pendingStatus && !!modalSchedule}
                title={pendingStatus ? `Mark as ${STATUS_LABELS[pendingStatus]}?` : ''}
                message={pendingStatus === 'completed'
                    ? "Only do this once the installation is finished. The customer will see it as completed, and its status and date can't be changed afterwards."
                    : `The customer will see this installation as ${(STATUS_LABELS[pendingStatus] || '').toLowerCase()}.`}
                confirmLabel={statusUpdating ? 'Updating...' : `Mark as ${STATUS_LABELS[pendingStatus] || ''}`}
                busy={statusUpdating}
                onConfirm={() => handleStatusChange(pendingStatus)}
                onCancel={() => setPendingStatus(null)}
            />
        </AdminLayout>
    );
}

const styles = {
    modalError: { ...adminUi.errorBanner, margin: '0 1.25rem 0.75rem' },
    newScheduleBtn: adminUi.goldBtn,
    success: adminUi.successBanner,
    error: adminUi.errorBanner,
    field: {
        marginBottom: '1rem',
        flex: 1,
    },
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: adminTokens.body,
        fontWeight: '500',
    },
    linkedQuotationBox: {
        border: `1px solid ${colors.primaryBorder}`,
        backgroundColor: adminTokens.greenTint,
        borderRadius: '6px',
        padding: '0.625rem 0.75rem',
    },
    linkedQuotationRef: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: adminTokens.green,
        marginBottom: '0.125rem',
    },
    linkedQuotationName: {
        fontSize: '0.9375rem',
        fontWeight: '600',
        color: adminTokens.ink,
    },
    linkedQuotationLocation: {
        fontSize: '0.8125rem',
        color: adminTokens.muted,
        marginTop: '0.125rem',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: `1px solid ${adminTokens.control}`,
        borderRadius: '6px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    // Calendar (wide) and the selected day (narrow); they stack on phones (.cal-layout)
    contentGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-start',
    },
    calendarCard: {
        ...adminUi.card,
        flex: '999 1 620px',
        minWidth: 0,
        overflow: 'hidden',
    },
    calendarHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px 20px',
    },
    monthLabel: {
        fontSize: '18px',
        fontWeight: 700,
        color: adminTokens.ink,
        margin: 0,
    },
    monthNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    navBtn: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${adminTokens.control}`,
        borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        padding: 0,
    },
    todayBtn: {
        height: '36px',
        padding: '0 14px',
        border: `1px solid ${adminTokens.control}`,
        borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF',
        color: adminTokens.ink,
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    weekdayRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        borderTop: `1px solid ${adminTokens.line}`,
        borderBottom: `1px solid ${adminTokens.line}`,
        backgroundColor: adminTokens.headBg,
    },
    weekdayLabel: {
        padding: '8px 10px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    },
    cellGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    },
    dayCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        minHeight: '104px',
        padding: '8px',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
        cursor: 'pointer',
        overflow: 'hidden',
        minWidth: 0,
    },
    dayCellDivider: { borderLeft: `1px solid ${adminTokens.rowLine}` },
    dayCellHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dayNumber: {
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px',
        fontSize: '13px',
        fontWeight: 600,
        color: adminTokens.ink,
    },
    dayNumberToday: {
        width: '26px',
        padding: 0,
        justifyContent: 'center',
        backgroundColor: adminTokens.green,
        color: '#FFFFFF',
        borderRadius: '50%',
        fontWeight: 700,
    },
    moreLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: adminTokens.muted,
    },
    chipList: {
        display: 'flex',
        flexDirection: 'column',
    },
    chip: {
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '4px',
        padding: '3px 6px',
        borderRadius: '4px',
        fontSize: '12px',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
    },
    chipTime: {
        fontWeight: 700,
        marginRight: '4px',
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 16px',
        padding: '12px 20px',
        borderTop: `1px solid ${adminTokens.line}`,
        fontSize: '13px',
        color: adminTokens.muted,
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    legendDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    // Marks a schedule added since the last visit (gold, like the sidebar dot)
    newDot: {
        display: 'inline-block',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: '#D49A23',
        marginRight: '4px',
        flexShrink: 0,
        verticalAlign: 'middle',
    },
    newPill: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 700,
        backgroundColor: '#FBEBC4',
        color: '#6B4500',
    },
    newPanel: { borderTop: `3px solid ${adminTokens.gold}` },
    newList: { listStyle: 'none', margin: 0, padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    newItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #F1E3B0',
        borderRadius: adminTokens.radius,
        backgroundColor: '#FFFBEB',
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    newItemName: { display: 'block', fontSize: '14px', fontWeight: 600, color: adminTokens.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    newItemWhen: { display: 'block', fontSize: '13px', color: adminTokens.muted },
    sideColumn: {
        flex: '1 1 300px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    sidePanel: {
        ...adminUi.card,
        overflow: 'hidden',
    },
    sidePanelHead: {
        padding: '16px 20px',
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    sidePanelEyebrow: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: adminTokens.muted,
    },
    selectedDateLabel: {
        margin: '2px 0 0',
        fontSize: '18px',
        fontWeight: 700,
        color: adminTokens.ink,
    },
    selectedCountLabel: {
        margin: '2px 0 0',
        fontSize: '13px',
        color: adminTokens.muted,
    },
    emptyDay: {
        padding: '28px 20px',
        textAlign: 'center',
        color: adminTokens.muted,
    },
    dayEventList: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
    },
    dayEventCard: {
        padding: '16px 20px',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
    },
    dayEventTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
    },
    dayEventTime: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 600,
        color: adminTokens.body,
    },
    statusPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    // Shown in place of the status buttons once an installation is completed
    completedBox: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
        borderRadius: '6px', background: '#E3F1E8', border: '1px solid #C6E3CF',
    },
    completedCheck: {
        width: '32px', height: '32px', borderRadius: '50%', background: '#2E8B5E', flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    dayEventName: {
        marginTop: '8px',
        fontSize: '16px',
        fontWeight: 700,
        color: adminTokens.ink,
    },
    dayEventDetails: {
        margin: '10px 0 0',
        display: 'grid',
        gridTemplateColumns: '70px 1fr',
        gap: '6px 10px',
        fontSize: '13px',
    },
    dayEventDt: { color: adminTokens.muted },
    dayEventDd: { margin: 0, minWidth: 0, overflowWrap: 'anywhere' },
    smallOutlineBtn: {
        height: '32px',
        padding: '0 12px',
        border: `1px solid ${adminTokens.control}`,
        borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF',
        color: adminTokens.ink,
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
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
        borderRadius: '8px',
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
        color: '#16211c',
        margin: '0 0 0.3rem 0',
    },
    modalSubtitle: {
        fontSize: '0.85rem',
        color: '#4f5a54',
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
        borderBottom: '1px solid #eef0ec',
    },
    modalFieldLabel: {
        fontSize: '0.8rem',
        color: '#5d6862',
    },
    modalFieldValue: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#16211c',
        textAlign: 'right',
    },
    modalFooter: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1.25rem 1.5rem',
        borderTop: '1px solid #eef0ec',
    },
    modalSectionLabel: {
        fontSize: '0.7rem',
        fontWeight: '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: adminTokens.muted,
        margin: '0.9rem 0 0.1rem',
    },
    refCode: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: adminTokens.green,
    },
    footerActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        width: '100%',
    },
    // Same buttons as the rest of the admin: white for the secondary action,
    // green for the main one
    viewQuoteBtn: { ...whiteButton, minHeight: '40px' },
    rescheduleBtn: {
        ...smallGreenButton,
        minHeight: '40px',
        padding: '10px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        marginLeft: 'auto',
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
        minHeight: '40px',
        padding: '0.55rem 0.5rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontWeight: '600',
        fontFamily: 'inherit',
        border: '1px solid #dcdfd8',
        backgroundColor: 'white',
        color: adminTokens.body,
    },
    statusActionBtnCurrent: {
        backgroundColor: adminTokens.green,
        borderColor: adminTokens.green,
        color: 'white',
    },
};
