import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState from '../components/LoadingState';
import { CheckIcon, XIcon, BoltIcon, SunIcon, PlugIcon, BatteryIcon, ClockIcon, CalendarIcon, ChevronDownIcon, MailIcon } from '../components/Icons';
import api from '../api/axios';
import { colors, typography, statusColors} from '../styles/theme';

// Installations can only be booked from tomorrow onwards. Computing this at
// module scope keeps the render pure (react-hooks/purity).
const MIN_SCHEDULE_DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0];

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
    const hour = parseInt(h,10);
    const period = hour >=12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${period}`;
}

function formatDateLong(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

const TODAY = new Date();
const TODAY_KEY = toDateKey(TODAY);

export default function AdminQuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionSuccess, setActionSuccess] = useState('');
    const [showApproveForm, setShowApproveForm] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [approveForm, setApproveForm] = useState({
        adjusted_cost: '',
        labor_fee: '',
        transportation_fee: '',
    });
    const [rejectForm, setRejectForm] = useState({
        rejection_reason: '',
    });
    const [scheduleForm, setScheduleForm] = useState({
        scheduled_date: '',
        scheduled_time: '',
        assigned_technician: '',
    });
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    const [viewYear, setViewYear] = useState(TODAY.getFullYear());
    const [viewMonth, setViewMonth] = useState(TODAY.getMonth());

    const [bookedSchedules, setBookedSchedules] = useState([]);
    const [scheduleSuccess, setScheduleSuccess] = useState(false);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [materials, setMaterials] = useState(() => [
        {
            id: Date.now(),
            material_name: '',
            quantity: 1,
            unit: '',
            unit_price: '',
        }
    ]);
    const [showPRForm, setShowPRForm] = useState(false);
    const [prSuccess, setPRSuccess] = useState(false);
    const [prLoading, setPRLoading] = useState(false);



    const fetchQuotation = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get(`/admin/quotation-requests/${id}`);
            setQuotation(res.data);
            setApproveForm((prev) => ({
                ...prev,
                adjusted_cost: res.data.solar_computation?.estimated_cost || '',
            }));
        } catch {
            setError('Failed to load quotation details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchQuotation);
    }, [fetchQuotation]);

    const handleApprove = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        setActionSuccess('');

        try {
            await api.post(`/admin/quotation-requests/${id}/approve`, {
                adjusted_cost: parseFloat(approveForm.adjusted_cost),
                labor_fee: parseFloat(approveForm.labor_fee) || 0,
                transportation_fee: parseFloat(approveForm.transportation_fee) || 0,
            });

            setActionSuccess('Quotation approved successfully.');
            setShowApproveForm(false);
            fetchQuotation();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve quotation.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        setActionSuccess('');

        try {
            await api.post(`/admin/quotation-requests/${id}/reject`, {
                rejection_reason: rejectForm.rejection_reason,
            });

            setActionSuccess('Quotation rejected.');
            setShowRejectForm(false);
            fetchQuotation();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject quotation.');
        } finally {
            setActionLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/admin/suppliers');
            setSuppliers(res.data);
        }catch {
            setError('Failed to load suppliers.');
        }
    };

    const addMaterial = () => {
        setMaterials([
            ...materials,
            {
                id: Date.now(),
                material_name: '',
                quantity: 1,
                unit: '',
                unit_price: '',
            }
        ]);
    };

    const removeMaterial = (id) => {
        setMaterials(materials.filter((m) => m.id !== id));
    };

    const handleMaterialChange = (id, field, value) => {
        setMaterials(materials.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const handleGeneratePR = async (e) => {
        e.preventDefault();
        setPRLoading(true);
        setError('');
        setActionSuccess('');

    try{
        await api.post('/admin/purchase-requests', {
            quotation_id: quotation?.quotation?.id,
            supplier_id: selectedSupplier,
            materials: materials.map(({ id, ...rest }) => ({
                ...rest,
                quantity: parseInt(rest.quantity),
                unit_price: rest.unit_price ? parseFloat(rest.unit_price) : null,
            })),
        });

        setActionSuccess('Purchase request generated successfully.');
        setShowPRForm(false);
        setPRSuccess(true);
        fetchQuotation();
    } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate purchase request.');
    } finally {
        setPRLoading(false);
    }
};

    const fetchBookedSchedules = async () => {
        try {
            const res = await api.get('/admin/schedules');
            setBookedSchedules(res.data);
        } catch {
            setBookedSchedules([]);
        }
    };

    const openScheduleModal = () => {
        const [y, m] = MIN_SCHEDULE_DATE.split('-').map(Number);
        setViewYear(y);
        setViewMonth(m -1);

        setScheduleForm({ scheduled_date: '', scheduled_time: '', assigned_technician: '' });
        setError('');
        setShowScheduleModal(true);
        fetchBookedSchedules();
    };

    const closeScheduleModal = () => setShowScheduleModal(false);

    const shiftMonth = (delta) => {
        let m = viewMonth + delta;
        let y = viewYear;
        if (m < 0) { m =11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        setViewMonth(m);
        setViewYear(y);
    };

    const goToToday = () => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
    };

    const getScheduleCustomer = (schedule) => 
        schedule.quotation?.quotation_request?.customer?.user?.name || 'Booked';

    const handleCreateSchedule = async (e) => {
        e.preventDefault();

        setScheduleLoading(true);

        setError('');
        setActionSuccess('');

        try {
            await api.post('/admin/schedules', {
                'quotation_id': quotation?.quotation?.id,
                'scheduled_date': scheduleForm.scheduled_date,
                'scheduled_time' : scheduleForm.scheduled_time,
                'assigned_technician': scheduleForm.assigned_technician,
            });

            setActionSuccess('Installation schedule created successfully.');
            setScheduleSuccess(true);
            setShowScheduleModal(false);
            fetchQuotation();

            // Send the admin back to the top so the success banner is in view
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            setError (err.response?.data?.message || 'Failed to create installation schedule.');
        } finally {
            setScheduleLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusStyle = (status) => {
        const statusStyles = {
            pending: { backgroundColor: '#fef9c3', color: '#ca8a04' },
            approved: { backgroundColor: '#dcfce7', color: '#16a34a' },
            rejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
            draft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
        };
        return statusStyles[status] || statusStyles.draft;
    };

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rowCount = Math.ceil((startOffset + daysInMonth) / 7);

    const calendarCells = [];
    for (let i = 0; i <rowCount * 7; i++) {
        const dayNum = i -startOffset + 1;
        const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
        const cellDate = new Date(viewYear, viewMonth, dayNum);
        const key = toDateKey(cellDate);

        const daySchedules = bookedSchedules
            .filter((s) => s.scheduled_date.split('T')[0] === key)
            .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
        const shown = daySchedules.slice(0,2);

        calendarCells.push({
            key, day: cellDate.getDate(),
            inMonth,
            isToday: key === TODAY_KEY,
            isSelected: key === scheduleForm.scheduled_date,
            isBookable: key >= MIN_SCHEDULE_DATE,
            shown,
            moreCount: daySchedules.length = shown.length,
        });
    }

    if (loading) {
        return (
            <AdminLayout active="Projects">
                <LoadingState label="Loading quotation details..." />
            </AdminLayout>
        );
    }

    if (error && !quotation) {
        return (
            <AdminLayout active="Projects">
                <div style={styles.loadError}>{error}</div>
            </AdminLayout>
        );
    }

    const purchaseRequest = quotation?.quotation?.purchase_request;
    const installSchedule = quotation?.quotation?.installation_schedule;
    const procurementConfirmed = purchaseRequest?.procurement_status === 'confirmed';
    const cycleComplete = Boolean(installSchedule);

    // The four milestones in the header stepper, each resolved from the data
    const steps = [
        { label: 'Submitted', state: 'done' },
        {
            label: quotation?.status === 'rejected' ? 'Rejected' : 'Approved',
            state: quotation?.status === 'approved'
                ? 'done'
                : quotation?.status === 'rejected'
                    ? 'rejected'
                    : 'current',
        },
        {
            label: 'Procurement',
            state: procurementConfirmed
                ? 'done'
                : quotation?.status === 'approved' ? 'current' : 'todo',
        },
        {
            label: 'Installation',
            state: installSchedule
                ? 'done'
                : procurementConfirmed ? 'current' : 'todo',
        },
    ];

    const stepDotStyle = (state) => {
        if (state === 'done') return styles.stepDotDone;
        if (state === 'rejected') return styles.stepDotRejected;
        if (state === 'current') return styles.stepDotCurrent;
        return styles.stepDotTodo;
    };

    return (
        <AdminLayout active="Projects">
            <div style={styles.shell}>

                {/* ---- Sticky header: breadcrumb, title, stepper ---- */}
                <div style={styles.shellHeader}>
                    <button onClick={() => navigate('/admin/projects')} style={styles.backBtn}>
                        <span style={styles.backArrow}>←</span>
                        <span>Back to Projects</span>
                    </button>

                    <div style={styles.titleRow}>
                        <div style={styles.titleGroup}>
                            <h1 style={styles.pageTitle}>
                                Quotation Request #{quotation?.id}
                            </h1>
                            <span style={{ ...styles.badge, ...getStatusStyle(quotation?.status) }}>
                                {quotation?.status?.charAt(0).toUpperCase() +
                                 quotation?.status?.slice(1)}
                            </span>
                        </div>

                        <a
                            href={`mailto:${quotation?.customer?.user?.email || ''}`}
                            style={styles.contactBtn}
                        >
                            <MailIcon size={15} color={colors.textBody} />
                            <span>Contact customer</span>
                        </a>
                    </div>

                    {cycleComplete ? (
                        <div style={styles.completeBadge}>
                            <span style={styles.completeBadgeIcon}>
                                <CheckIcon size={18} color={colors.success} />
                            </span>
                            <span style={styles.completeBadgeText}>Complete!</span>
                        </div>
                    ) : (
                    <div style={styles.stepper}>
                        {steps.map((step, index) => (
                            <Fragment key={step.label}>
                                {index > 0 && (
                                    <div style={{
                                        ...styles.stepConnector,
                                        backgroundColor: step.state === 'done' || step.state === 'rejected'
                                            ? colors.primary
                                            : colors.border,
                                    }} />
                                )}
                                <div style={styles.step}>
                                    <div style={{ ...styles.stepDot, ...stepDotStyle(step.state) }}>
                                        {step.state === 'done' ? (
                                            <CheckIcon size={15} color="white" />
                                        ) : step.state === 'rejected' ? (
                                            <XIcon size={15} color="white" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span style={{
                                        ...styles.stepLabel,
                                        ...(step.state === 'todo' ? styles.stepLabelTodo : {}),
                                        ...(step.state === 'current' ? styles.stepLabelCurrent : {}),
                                    }}>
                                        {step.label}
                                    </span>
                                </div>
                            </Fragment>
                        ))}
                    </div>
                    )}
                </div>

                {/* ---- Body: section nav beside the cards ---- */}
                <div style={styles.shellContent}>

                    {actionSuccess && (
                        <div style={styles.success}>
                            <CheckIcon size={16} color={colors.primary} />
                            <span>{actionSuccess}</span>
                        </div>
                    )}

                    {error && <div style={styles.error}>{error}</div>}

                    {/* ---- Customer information ---- */}
                    <section id="customer" style={styles.card}>
                        <h3 style={styles.cardTitle}>Customer Information</h3>
                        <div className="responsive-grid-2" style={styles.infoGrid}>
                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Name</span>
                                <span style={styles.infoValue}>
                                    {quotation?.customer?.user?.name}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Email</span>
                                <span style={styles.infoValue}>
                                    {quotation?.customer?.user?.email}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Contact Number</span>
                                <span style={styles.infoValue}>
                                    {quotation?.customer?.contact_number}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Installation Location</span>
                                <span style={styles.infoValue}>
                                    {quotation?.customer?.install_location}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>System Type</span>
                                <span style={styles.infoValue}>
                                    {quotation?.solar_system_type?.charAt(0).toUpperCase() +
                                     quotation?.solar_system_type?.slice(1)}
                                </span>
                            </div>

                            {quotation?.monthly_bill && (
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Monthly Bill</span>
                                    <span style={styles.infoValueFigure}>
                                        {formatCurrency(quotation.monthly_bill)}
                                    </span>
                                </div>
                            )}

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Date Submitted</span>
                                <span style={styles.infoValue}>
                                    {formatDate(quotation?.submission_date)}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* ---- Appliance list ---- */}
                    <section id="appliances" style={styles.card}>
                        <h3 style={styles.cardTitle}>Appliance List</h3>

                        <div className="table-scroll">
                            <div style={styles.tableHeader}>
                                <span style={{ flex: 3 }}>Appliance</span>
                                <span style={{ flex: 2 }}>Wattage</span>
                                <span style={{ flex: 1 }}>Qty</span>
                                <span style={{ flex: 2 }}>Hours/Day</span>
                                <span style={{ flex: 2 }}>Daily Usage</span>
                            </div>

                            {quotation?.appliance_items?.map((item) => (
                                <div key={item.id} style={styles.tableRow}>
                                    <span style={{ flex: 3 }}>{item.appliance_name}</span>
                                    <span style={{ ...styles.figure, flex: 2 }}>{item.wattage}W</span>
                                    <span style={{ ...styles.figure, flex: 1 }}>×{item.quantity}</span>
                                    <span style={{ ...styles.figure, flex: 2 }}>{item.usage_hours_per_day}h</span>
                                    <span style={{ ...styles.figure, flex: 2 }}>
                                        {(item.wattage * item.quantity * item.usage_hours_per_day
                                        ).toLocaleString()} Wh
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ---- Computed solar requirements ---- */}
                    <section id="requirements" style={styles.card}>
                        <h3 style={styles.cardTitle}>Computed Solar Requirements</h3>
                        <div className="responsive-grid-2" style={styles.resultGrid}>
                            <div style={styles.resultBox}>
                                <span style={styles.resultIcon}><BoltIcon size={22} color={colors.primary} /></span>
                                <span style={styles.resultLabel}>Total Daily Load</span>
                                <span style={styles.resultValue}>
                                    {parseFloat(quotation?.solar_computation?.total_load_watts
                                    ).toLocaleString()} Wh
                                </span>
                            </div>

                            <div style={styles.resultBox}>
                                <span style={styles.resultIcon}><SunIcon size={22} color={colors.primary} /></span>
                                <span style={styles.resultLabel}>Panel Capacity</span>
                                <span style={styles.resultValue}>
                                    {quotation?.solar_computation?.panel_capacity_kw} kW
                                </span>
                            </div>

                            <div style={styles.resultBox}>
                                <span style={styles.resultIcon}><PlugIcon size={22} color={colors.primary} /></span>
                                <span style={styles.resultLabel}>Inverter Size</span>
                                <span style={styles.resultValue}>
                                    {quotation?.solar_computation?.inverter_specification}
                                </span>
                            </div>

                            {parseFloat(quotation?.solar_computation?.battery_capacity_ah) > 0 && (
                                <div style={styles.resultBox}>
                                    <span style={styles.resultIcon}><BatteryIcon size={22} color={colors.primary} /></span>
                                    <span style={styles.resultLabel}>Battery Capacity</span>
                                    <span style={styles.resultValue}>
                                        {parseFloat(quotation?.solar_computation?.battery_capacity_ah
                                        ).toLocaleString()} Ah
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={styles.totalBanner}>
                            <span style={styles.totalBannerLabel}>System estimated cost</span>
                            <span style={styles.totalBannerValue}>
                                {formatCurrency(quotation?.solar_computation?.estimated_cost)}
                            </span>
                        </div>
                    </section>

                    {/* ---- Finalized quotation ---- */}
                    {quotation?.quotation && (
                        <section id="quotation" style={styles.card}>
                            <h3 style={styles.cardTitle}>Finalized Quotation</h3>

                            <div className="responsive-grid-4" style={styles.infoGrid}>
                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Adjusted Cost</span>
                                    <span style={styles.infoValueFigure}>
                                        {formatCurrency(quotation.quotation.adjusted_cost)}
                                    </span>
                                </div>

                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Labor Fee</span>
                                    <span style={styles.infoValueFigure}>
                                        {formatCurrency(quotation.quotation.labor_fee)}
                                    </span>
                                </div>

                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Transportation Fee</span>
                                    <span style={styles.infoValueFigure}>
                                        {formatCurrency(quotation.quotation.transportation_fee)}
                                    </span>
                                </div>

                                <div style={styles.infoItem}>
                                    <span style={styles.infoLabel}>Approved</span>
                                    <span style={styles.infoValue}>
                                        {formatDate(quotation.quotation.approval_date)}
                                    </span>
                                </div>
                            </div>

                            <div style={styles.totalBanner}>
                                <span style={styles.totalBannerLabel}>Total amount</span>
                                <span style={styles.totalBannerValue}>
                                    {formatCurrency(quotation.quotation.total_amount)}
                                </span>
                            </div>
                        </section>
                    )}

                    {/* ---- Rejection reason ---- */}
                    {quotation?.status === 'rejected' && quotation?.notes && (
                        <section style={{ ...styles.card, ...styles.cardDanger }}>
                            <h3 style={{ ...styles.cardTitle, color: colors.danger }}>
                                Rejection Reason
                            </h3>
                            <p style={styles.cardBodyText}>{quotation.notes}</p>
                        </section>
                    )}

                    {/* ---- Approve / reject ---- */}
                    {quotation?.status === 'pending' && !actionSuccess && (
                        <section id="decision" style={styles.card}>
                            <h3 style={styles.cardTitle}>Decision</h3>

                            {!showApproveForm && !showRejectForm && (
                                <>
                                    <p style={styles.cardDesc}>
                                        Approve this request to set the final costs, or reject it
                                        with a reason the customer can act on.
                                    </p>

                                    <div style={styles.actionButtons}>
                                        <button
                                            className="btn-primary"
                                            onClick={() => setShowApproveForm(true)}
                                            style={styles.approveBtn}
                                        >
                                            <CheckIcon size={16} color="white" />
                                            <span>Approve Quotation</span>
                                        </button>

                                        <button
                                            className="btn-danger"
                                            onClick={() => setShowRejectForm(true)}
                                            style={styles.rejectBtn}
                                        >
                                            <XIcon size={16} color="white" />
                                            <span>Reject Quotation</span>
                                        </button>
                                    </div>
                                </>
                            )}

                            {showApproveForm && (
                                <div>
                                    <p style={styles.cardDesc}>
                                        Review and adjust the costs before approving.
                                        The total amount is computed automatically.
                                    </p>

                                    <form onSubmit={handleApprove}>
                                        <div style={styles.field}>
                                            <label style={styles.label}>Adjusted Base Cost (₱)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={approveForm.adjusted_cost}
                                                onChange={(e) => setApproveForm({
                                                    ...approveForm,
                                                    adjusted_cost: e.target.value
                                                })}
                                                className="input-field"
                                                style={styles.input}
                                                required
                                            />
                                        </div>

                                        <div style={styles.field}>
                                            <label style={styles.label}>Labor Fee (₱)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={approveForm.labor_fee}
                                                onChange={(e) => setApproveForm({
                                                    ...approveForm,
                                                    labor_fee: e.target.value
                                                })}
                                                className="input-field"
                                                style={styles.input}
                                                placeholder="e.g. 15000"
                                            />
                                        </div>

                                        <div style={styles.field}>
                                            <label style={styles.label}>Transportation Fee (₱)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={approveForm.transportation_fee}
                                                onChange={(e) => setApproveForm({
                                                    ...approveForm,
                                                    transportation_fee: e.target.value
                                                })}
                                                className="input-field"
                                                style={styles.input}
                                                placeholder="e.g. 5000"
                                            />
                                        </div>

                                        <div style={styles.totalBanner}>
                                            <span style={styles.totalBannerLabel}>Total amount</span>
                                            <span style={styles.totalBannerValue}>
                                                {formatCurrency(
                                                    (parseFloat(approveForm.adjusted_cost) || 0) +
                                                    (parseFloat(approveForm.labor_fee) || 0) +
                                                    (parseFloat(approveForm.transportation_fee) || 0)
                                                )}
                                            </span>
                                        </div>

                                        <div style={styles.formActions}>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => setShowApproveForm(false)}
                                                style={styles.cancelBtn}
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                style={{
                                                    ...styles.approveBtn,
                                                    opacity: actionLoading ? 0.7 : 1,
                                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                }}
                                                disabled={actionLoading}
                                            >
                                                <span>{actionLoading ? 'Approving...' : 'Confirm Approval'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {showRejectForm && (
                                <div>
                                    <p style={styles.cardDesc}>
                                        Please provide a reason for rejection so the
                                        customer knows what to fix.
                                    </p>

                                    <form onSubmit={handleReject}>
                                        <div style={styles.field}>
                                            <label style={styles.label}>Rejection Reason</label>
                                            <textarea
                                                value={rejectForm.rejection_reason}
                                                onChange={(e) => setRejectForm({
                                                    rejection_reason: e.target.value
                                                })}
                                                className="input-field"
                                                style={{
                                                    ...styles.input,
                                                    height: '100px',
                                                    resize: 'vertical',
                                                }}
                                                placeholder="e.g. Incomplete appliance information..."
                                                required
                                            />
                                        </div>

                                        <div style={styles.formActions}>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => setShowRejectForm(false)}
                                                style={styles.cancelBtn}
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn-danger"
                                                style={{
                                                    ...styles.rejectBtn,
                                                    opacity: actionLoading ? 0.7 : 1,
                                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                }}
                                                disabled={actionLoading}
                                            >
                                                <span>{actionLoading ? 'Rejecting...' : 'Confirm Rejection'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ---- Supplier procurement ---- */}
                    {quotation?.status === 'approved' && (
                        <section id="procurement" style={{ ...styles.card, ...styles.cardAccent }}>
                            <h3 style={styles.cardTitle}>Supplier Procurement</h3>

                            {purchaseRequest ? (
                                <div style={styles.success}>
                                    <CheckIcon size={16} color={colors.primary} />
                                    <span>Purchase request has already been generated.</span>
                                </div>
                            ) : prSuccess ? (
                                <div style={styles.success}>
                                    <CheckIcon size={16} color={colors.primary} />
                                    <span>Purchase request generated and sent to supplier.</span>
                                </div>
                            ) : !showPRForm ? (
                                <div>
                                    <p style={styles.cardDesc}>
                                        Generate a purchase request to order materials from a
                                        supplier for this project.
                                    </p>
                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            setShowPRForm(true);
                                            fetchSuppliers();
                                        }}
                                        style={styles.approveBtn}
                                    >
                                        <span>Generate purchase request</span>
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleGeneratePR}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Select Supplier</label>
                                        <select
                                            value={selectedSupplier}
                                            onChange={(e) => setSelectedSupplier(e.target.value)}
                                            className="input-field"
                                            style={styles.input}
                                            required
                                        >
                                            <option value="">— Select a supplier —</option>
                                            {suppliers.map((supplier) => (
                                                <option key={supplier.id} value={supplier.id}>
                                                    {supplier.company_name} — {supplier.contact_person}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>Materials Needed</label>

                                        <div className="table-scroll">
                                            <div style={styles.materialHeader}>
                                                <span style={{ flex: 3 }}>Material Name</span>
                                                <span style={{ flex: 1 }}>Qty</span>
                                                <span style={{ flex: 1 }}>Unit</span>
                                                <span style={{ flex: 2 }}>Unit Price (₱)</span>
                                                <span style={{ flex: 1 }}></span>
                                            </div>

                                            {materials.map((material) => (
                                                <div key={material.id} style={styles.materialRow}>
                                                    <input
                                                        type="text"
                                                        value={material.material_name}
                                                        onChange={(e) => handleMaterialChange(
                                                            material.id, 'material_name', e.target.value
                                                        )}
                                                        className="input-field"
                                                        style={{ ...styles.input, flex: 3 }}
                                                        placeholder="e.g. Solar Panel 400W"
                                                        required
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={material.quantity}
                                                        onChange={(e) => handleMaterialChange(
                                                            material.id, 'quantity', e.target.value
                                                        )}
                                                        className="input-field"
                                                        style={{ ...styles.input, flex: 1 }}
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        value={material.unit}
                                                        onChange={(e) => handleMaterialChange(
                                                            material.id, 'unit', e.target.value
                                                        )}
                                                        className="input-field"
                                                        style={{ ...styles.input, flex: 1 }}
                                                        placeholder="pcs"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={material.unit_price}
                                                        onChange={(e) => handleMaterialChange(
                                                            material.id, 'unit_price', e.target.value
                                                        )}
                                                        className="input-field"
                                                        style={{ ...styles.input, flex: 2 }}
                                                        placeholder="Optional"
                                                    />
                                                    {materials.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMaterial(material.id)}
                                                            style={styles.removeMaterialBtn}
                                                            aria-label="Remove material"
                                                        >
                                                            <XIcon size={14} color={colors.danger} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addMaterial}
                                            style={styles.addMaterialBtn}
                                        >
                                            + Add Material
                                        </button>
                                    </div>

                                    <div style={styles.formActions}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setShowPRForm(false)}
                                            style={styles.cancelBtn}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            style={{
                                                ...styles.approveBtn,
                                                opacity: prLoading ? 0.7 : 1,
                                                cursor: prLoading ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={prLoading}
                                        >
                                            <span>{prLoading ? 'Generating...' : 'Generate purchase request'}</span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </section>
                    )}

                    {/* ---- Installation schedule ---- */}
                    {quotation?.status === 'approved' && (
                        <section
                            id="installation"
                            style={{
                                ...styles.card,
                                // The design dims this card until procurement is settled
                                opacity: installSchedule || scheduleSuccess || procurementConfirmed ? 1 : 0.6,
                            }}
                        >
                            <h3 style={styles.cardTitle}>Installation Schedule</h3>

                            {installSchedule ? (
                                <div>
                                    <div style={styles.success}>
                                        <CheckIcon size={16} color={colors.primary} />
                                        <span>Installation has been scheduled.</span>
                                    </div>

                                    <div className="responsive-grid-2" style={styles.infoGrid}>
                                        <div style={styles.infoItem}>
                                            <span style={styles.infoLabel}>Scheduled Date</span>
                                            <span style={styles.infoValue}>
                                                {formatDate(installSchedule.scheduled_date)}
                                            </span>
                                        </div>

                                        <div style={styles.infoItem}>
                                            <span style={styles.infoLabel}>Start Time</span>
                                            <span style={styles.infoValueFigure}>
                                                {formatTime(installSchedule.scheduled_time) || 'TBD'}
                                            </span>
                                        </div>

                                        <div style={styles.infoItem}>
                                            <span style={styles.infoLabel}>Assigned Technician</span>
                                            <span style={styles.infoValue}>
                                                {installSchedule.assigned_technician}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : scheduleSuccess ? (
                                <div style={styles.success}>
                                    <CheckIcon size={16} color={colors.primary} />
                                    <span>Installation schedule created successfully.</span>
                                </div>
                            ) : (
                                <div>
                                    <p style={styles.cardDesc}>
                                        {procurementConfirmed
                                            ? 'Pick a day, time and technician for this installation.'
                                            : 'Available once the supplier confirms all materials.'}
                                    </p>

                                    <button
                                        className="btn-primary"
                                        onClick={openScheduleModal}
                                        style={{
                                            ...styles.approveBtn,
                                            opacity: procurementConfirmed ? 1 : 0.55,
                                            cursor: procurementConfirmed ? 'pointer' : 'not-allowed',
                                        }}
                                        disabled={!procurementConfirmed}
                                    >
                                        <CalendarIcon size={15} color="white" />
                                        <span>Set installation schedule</span>
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>

            {showScheduleModal && (
                <div style={styles.modalOverlay} onClick={closeScheduleModal}>
                    <div style={styles.scheduleModalCard} onClick={(e) => e.stopPropagation()}>

                        <div style={styles.modalHeader}>
                            <div style={{ flex: 1, minWidth: 0}}>
                                <div style={styles.modalEyebrow}>Installation</div>
                                <h2 style={styles.modalTitle}>Set installation schedule</h2>
                                <p style={styles.modalSubtitle}>
                                    Pick a day for {quotation?.customer?.user?.name || 'this customer'}.
                                    Days already booked are shown on the calendar.
                                </p>
                            </div>
                            <button onClick={closeScheduleModal} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={colors.textMuted} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSchedule} style={styles.modalForm}>
                            <div style={styles.modalBody}>

                                <div style={styles.calendarHeader}>
                                    <h3 style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</h3>
                                    <div style={styles.monthNav}>
                                        <button type="button" onClick={() => shiftMonth(-1)} style={styles.navBtn} aria-label="Previous month">
                                            <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                                                <ChevronDownIcon size={14} color={colors.primary} />
                                            </span>
                                        </button> 
                                        <button type="button" onClick={goToToday} style={styles.todayBtn}>Today</button>
                                        <button type="button" onClick={() => shiftMonth(1)} style={styles.navBtn} aria-label="Next month">
                                            <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
                                                <ChevronDownIcon size={14} color={colors.primary} />
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div style={styles.weekdayRow}>
                                    {WEEKDAYS.map((w) => (
                                        <div key={w} style={styles.weekdayLabel}>{w}</div>
                                    ))}
                                </div>

                                <div style={styles.cellGrid}>
                                    {calendarCells.map((cell) => (
                                        <div
                                            key={cell.key}
                                            onClick={() => {
                                                if (!cell.isBookable) return;
                                                setScheduleForm({ ...scheduleForm, scheduled_date: cell.key });
                                            }}
                                            style={{
                                                ...styles.dayCell,
                                                backgroundColor: cell.isSelected ? colors.primaryTint : 'white',
                                                boxShadow: cell.isSelected
                                                    ? `inset 0 0 0 1.5px ${colors.primary}`
                                                    : `inset 0 0 0 1px ${colors.borderLight}`,
                                                opacity: !cell.inMonth ? 0.4 : cell.isBookable ? 1 : 0.45,
                                                cursor: cell.isBookable ? 'pointer' : 'not-allowed',
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
                                                {cell.isSelected && (
                                                    <div style={styles.pendingChip}>
                                                        <span style={styles.chipTime}>
                                                            {scheduleForm.scheduled_time
                                                                ? formatTime(scheduleForm.scheduled_time)
                                                                : 'Time'}
                                                        </span>
                                                    </div>
                                                )}
                                                {cell.shown.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        style={{
                                                            ...styles.chip,
                                                            backgroundColor: statusColors[s.status]?.bg || colors.borderLight,
                                                            color: statusColors[s.status]?.text || colors.textMuted,
                                                        }}
                                                    >
                                                        {s.scheduled_time && (
                                                            <span style={styles.chipTime}>{formatTime(s.scheduled_time)}</span>
                                                        )}
                                                        <span style={styles.chipName}>{getScheduleCustomer(s)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={styles.pickedBanner}>
                                    <CalendarIcon size={15} color={colors.primary} />
                                    <span style={styles.pickedText}>
                                        {scheduleForm.scheduled_date
                                            ? formatDateLong(scheduleForm.scheduled_date)
                                            : 'No date selected yet'}
                                    </span>
                                    {scheduleForm.scheduled_time && (
                                        <span style={styles.pickedTime}>
                                            <ClockIcon size={12} color={colors.textMuted} />
                                            {formatTime(scheduleForm.scheduled_time)}
                                        </span>
                                    )}
                                </div>

                                <div style={styles.modalFormRow}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Start Time</label>
                                        <input
                                            type="time"
                                            value={scheduleForm.scheduled_time}
                                            onChange={(e) => setScheduleForm({
                                                ...scheduleForm,
                                                scheduled_time: e.target.value,
                                            })}
                                            className="input-field"
                                            style={styles.input}
                                            required
                                        />
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>Assigned Technician</label>
                                        <input
                                            type="text"
                                            value={scheduleForm.assigned_technician}
                                            onChange={(e) => setScheduleForm({
                                                ...scheduleForm,
                                                assigned_technician: e.target.value,
                                            })}
                                            className="input-field"
                                            style={styles.input}
                                            placeholder="e.g Juan Santos"
                                            required
                                        />
                                </div>
                            </div>
                            </div>

                            {error && (
                                <div style={styles.modalError}>{error}</div>
                            )}

                            <div style={styles.modalFooter}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setScheduleForm({ ...scheduleForm, scheduled_date: '' })}
                                    style={{
                                        ...styles.cancelBtn,
                                        opacity: scheduleForm.scheduled_date ? 1 : 0.5,
                                        cursor: scheduleForm.scheduled_date ? 'pointer' : 'not-allowed',
                                    }}
                                    disabled={!scheduleForm.scheduled_date}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        ...styles.approveBtn,
                                        opacity: scheduleLoading || !scheduleForm.scheduled_date ? 0.7 : 1,
                                        cursor: scheduleLoading || !scheduleForm.scheduled_date ? 'not-allowed' : 'pointer',
                                    }}
                                    disabled={scheduleLoading || !scheduleForm.scheduled_date}
                                >
                                    <CheckIcon size={15} color="white" />
                                    <span>{scheduleLoading ? 'Saving...' : 'Confirm Schedule'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )} 
        </AdminLayout>
    );
}


const styles = {
    loadError: {
        textAlign: 'center',
        padding: '3rem',
        color: colors.danger,
    },

    /* ---------- Shell ---------- */
    shell: {
        maxWidth: '1080px',
        margin: '0 auto',
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        backgroundColor: colors.bgCard,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 12px 32px -18px rgba(17,24,39,0.18)',
    },
    shellHeader: {
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        padding: '1.375rem 1.75rem 1.25rem',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: 'transparent',
        color: colors.textMuted,
        border: 'none',
        padding: 0,
        marginBottom: '0.875rem',
        fontSize: '0.8125rem',
        cursor: 'pointer',
    },
    backArrow: {
        fontSize: '0.9375rem',
        lineHeight: 1,
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.625rem',
    },
    titleGroup: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.75rem',
        flexWrap: 'wrap',
    },
    pageTitle: {
        ...typography.h1,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        margin: 0,
    },
    badge: {
        fontSize: '0.6875rem',
        fontWeight: '600',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '0.3125rem 0.6875rem',
        borderRadius: '100px',
    },
    contactBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4375rem',
        fontSize: '0.8125rem',
        padding: '0.5625rem 0.9375rem',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        color: colors.textBody,
        borderRadius: '9px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
    },

    /* ---------- Progress stepper ---------- */
    completeBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
    },
    completeBadgeIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: colors.successTint,
        flexShrink: 0,
    },
    completeBadgeText: {
        fontSize: '0.8125rem',
        fontWeight: '600',
        letterSpacing: '0.02em',
        color: colors.success,
    },
    stepper: {
        display: 'flex',
        alignItems: 'center',
        gap: 0,
    },
    step: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        flex: 1,
        minWidth: 0,
    },
    stepConnector: {
        height: '2px',
        flex: 1,
        marginBottom: '1.375rem',
    },
    stepDot: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '600',
        flexShrink: 0,
    },
    stepDotDone: {
        backgroundColor: colors.primary,
        color: 'white',
    },
    stepDotRejected: {
        backgroundColor: colors.danger,
        color: 'white',
    },
    stepDotCurrent: {
        border: `2px solid ${colors.primary}`,
        backgroundColor: colors.primaryTint,
        color: colors.primary,
    },
    stepDotTodo: {
        border: `2px solid ${colors.border}`,
        color: colors.textMuted,
    },
    stepLabel: {
        fontSize: '0.71875rem',
        color: colors.textDark,
        fontWeight: '500',
        letterSpacing: '0.02em',
        textAlign: 'center',
    },
    stepLabelCurrent: {
        color: colors.primary,
        fontWeight: '600',
    },
    stepLabelTodo: {
        color: colors.textMuted,
        fontWeight: '400',
    },

    /* ---------- Body ---------- */
    shellContent: {
        padding: '1.375rem 1.75rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minWidth: 0,
        backgroundColor: colors.bgSubtle,
    },

    /* ---------- Cards ---------- */
    card: {
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        padding: '1.25rem 1.375rem',
        backgroundColor: colors.bgCard,
    },
    cardAccent: {
        backgroundColor: colors.primaryTint,
        border: `1px solid ${colors.primaryBorder}`,
    },
    cardDanger: {
        borderLeft: `4px solid ${colors.danger}`,
    },
    cardTitle: {
        fontSize: '0.9375rem',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        color: colors.textDark,
        margin: '0 0 1.125rem 0',
    },
    cardDesc: {
        margin: '0 0 1rem',
        fontSize: '0.8125rem',
        color: colors.textMuted,
        maxWidth: '52ch',
    },
    cardBodyText: {
        margin: 0,
        fontSize: '0.875rem',
        color: colors.textBody,
    },

    /* ---------- Labelled fields ---------- */
    infoGrid: {
        gap: '1.125rem 2rem',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
    },
    infoLabel: {
        fontSize: '0.65625rem',
        color: colors.textMuted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: '0.3125rem',
        fontSize: '0.90625rem',
        color: colors.textDark,
        wordBreak: 'break-word',
    },
    infoValueFigure: {
        marginTop: '0.3125rem',
        fontSize: '0.90625rem',
        color: colors.textDark,
    },
    figure: {
    },

    /* ---------- Total banner ---------- */
    totalBanner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        backgroundColor: colors.primaryTint,
        borderRadius: '11px',
        padding: '1rem 1.25rem',
        marginTop: '1.25rem',
    },
    totalBannerLabel: {
        fontSize: '0.8125rem',
        color: colors.primary,
        fontWeight: '600',
        letterSpacing: '0.02em',
    },
    totalBannerValue: {
        fontSize: '1.375rem',
        fontWeight: '600',
        color: colors.primary,
        letterSpacing: '-0.02em',
    },

    /* ---------- Appliance table ---------- */
    tableHeader: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0 0 0.625rem',
        borderBottom: `1px solid ${colors.border}`,
        fontSize: '0.65625rem',
        fontWeight: '500',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.textMuted,
    },
    tableRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 0',
        borderBottom: `1px solid ${colors.borderLight}`,
        fontSize: '0.875rem',
        color: colors.textBody,
    },

    /* ---------- Solar requirement boxes ---------- */
    resultGrid: {
        gap: '1rem',
    },
    resultBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        padding: '1rem',
        borderRadius: '11px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSubtle,
    },
    resultIcon: {
        display: 'inline-flex',
        marginBottom: '0.25rem',
    },
    resultLabel: {
        fontSize: '0.65625rem',
        color: colors.textMuted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    resultValue: {
        fontSize: '1.0625rem',
        fontWeight: '600',
        color: colors.textDark,
    },

    /* ---------- Buttons and forms ---------- */
    actionButtons: {
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
    },
    approveBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4375rem',
        fontSize: '0.8125rem',
        padding: '0.6875rem 1.125rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '9px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    rejectBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4375rem',
        fontSize: '0.8125rem',
        padding: '0.6875rem 1.125rem',
        backgroundColor: colors.danger,
        color: 'white',
        border: 'none',
        borderRadius: '9px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    cancelBtn: {
        backgroundColor: colors.bgCard,
        color: colors.textBody,
        border: `1px solid ${colors.border}`,
        padding: '0.6875rem 1.125rem',
        borderRadius: '9px',
        fontSize: '0.8125rem',
        cursor: 'pointer',
    },
    field: {
        marginBottom: '1rem',
        flex: 1,
        minWidth: 0,
    },
    label: {
        display: 'block',
        marginBottom: '0.375rem',
        fontSize: '0.65625rem',
        color: colors.textMuted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: `1px solid ${colors.border}`,
        borderRadius: '9px',
        fontSize: '0.9375rem',
        boxSizing: 'border-box',
    },
    formActions: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
    },

    /* ---------- Materials editor ---------- */
    materialHeader: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        fontSize: '0.65625rem',
        color: colors.textMuted,
        fontWeight: '500',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
    },
    materialRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        alignItems: 'center',
    },
    removeMaterialBtn: {
        flex: 1,
        backgroundColor: colors.dangerTint,
        color: colors.danger,
        border: `1px solid ${colors.danger}`,
        borderRadius: '9px',
        padding: '0.5rem',
        cursor: 'pointer',
    },
    addMaterialBtn: {
        backgroundColor: 'transparent',
        color: colors.primary,
        border: `1px dashed ${colors.primary}`,
        borderRadius: '9px',
        padding: '0.625rem 1rem',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        width: '100%',
        marginTop: '0.5rem',
    },

    /* ---------- Banners ---------- */
    success: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: colors.primaryTint,
        color: colors.primary,
        padding: '0.75rem 1rem',
        borderRadius: '9px',
        fontSize: '0.875rem',
    },
    error: {
        backgroundColor: colors.dangerTint,
        color: colors.danger,
        padding: '0.75rem 1rem',
        borderRadius: '9px',
        fontSize: '0.875rem',
    },

    /* ---------- Schedule modal ---------- */
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
    scheduleModalCard: {
        backgroundColor: colors.bgCard,
        borderRadius: '20px',
        maxWidth: '760px',
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
        backgroundColor: colors.primaryTint,
    },
    modalEyebrow: {
        fontSize: '0.65625rem',
        fontWeight: '600',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.primary,
        marginBottom: '0.5rem',
    },
    modalTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        color: colors.textDark,
        margin: '0 0 0.3rem 0',
    },
    modalSubtitle: {
        fontSize: '0.85rem',
        color: colors.textBody,
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
    modalForm: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
    },
    modalBody: {
        padding: '1.25rem 1.5rem 0.5rem',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
    },
    modalFormRow: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    modalError: {
        flexShrink: 0,
        margin: '0 1.5rem 0.25rem',
        padding: '0.75rem',
        borderRadius: '9px',
        backgroundColor: colors.dangerTint,
        color: colors.danger,
        fontSize: '0.8rem',
    },
    modalFooter: {
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        padding: '1.25rem 1.5rem',
        borderTop: `1px solid ${colors.borderLight}`,
        flexWrap: 'wrap',
    },

    /* ---------- Calendar inside the modal ---------- */
    calendarHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    monthLabel: {
        fontSize: '1.05rem',
        fontWeight: '700',
        color: colors.textDark,
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
    weekdayRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '6px',
        marginBottom: '4px',
    },
    weekdayLabel: {
        fontSize: '0.65625rem',
        fontWeight: '500',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.textMuted,
        padding: '0 2px 4px',
    },
    cellGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '6px',
    },
    dayCell: {
        minHeight: '76px',
        borderRadius: '10px',
        padding: '6px 7px',
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
        color: colors.textBody,
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
        color: colors.textMuted,
    },
    chipList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
    },
    pendingChip: {
        padding: '3px 5px',
        borderRadius: '5px',
        fontSize: '0.65rem',
        lineHeight: 1.3,
        overflow: 'hidden',
        backgroundColor: colors.primary,
        color: 'white',
        fontWeight: '600',
    },
    chip: {
        padding: '3px 5px',
        borderRadius: '5px',
        fontSize: '0.65rem',
        lineHeight: 1.3,
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
    pickedBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '1.25rem 0 1rem',
        padding: '0.75rem 1rem',
        borderRadius: '11px',
        backgroundColor: colors.primaryTint,
        flexWrap: 'wrap',
    },
    pickedText: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: colors.primary,
    },
    pickedTime: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.8rem',
        color: colors.textMuted,
    },
};
