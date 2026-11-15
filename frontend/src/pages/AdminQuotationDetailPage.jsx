import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminStatus, adminTokens, adminText, adminUi, statusLabel } from '../styles/adminTheme';
import LoadingState from '../components/LoadingState';
import Badge from '../components/StatusPill';
import { CheckIcon, XIcon, CalendarIcon, DownloadIcon, MailIcon } from '../components/Icons';
import ScheduleModal from '../components/ScheduleModal';
import ProductPicker from '../components/ProductPicker';
import AmountInput from '../components/AmountInput';
import { BUSINESS_NAME } from './quote-builder/businessInfo';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';
import { materialsFromComputation, materialRow, supplierRows } from '../utils/materials';
import { categoryOf } from '../services/productCatalog';
import { colors, smallGreenButton } from '../styles/theme';
import { formatPhone } from '../utils/phone';
import { computeReturn, signedPeso, SYSTEM_LIFE_YEARS } from '../services/solarEngine';

function formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h,10);
    const period = hour >=12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${period}`;
}

// Colors for the product list under the Item box
const PICKER_COLORS = { text: adminTokens.ink, muted: adminTokens.muted, border: adminTokens.border, active: adminTokens.greenTint };

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
    // Shown inside the approve / reject windows (the page banner is behind them)
    const [decisionError, setDecisionError] = useState('');
    const [approveForm, setApproveForm] = useState({
        adjusted_cost: '',
        labor_fee: '',
        transportation_fee: '',
    });
    const [rejectForm, setRejectForm] = useState({
        rejection_reason: '',
    });
    // Date, time, technician and notes are picked inside the shared ScheduleModal
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleError, setScheduleError] = useState('');

    const [bookedSchedules, setBookedSchedules] = useState([]);
    const [scheduleSuccess, setScheduleSuccess] = useState(false);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    // Materials PDF for the supplier (sent on Messenger; nothing is saved)
    const [materialsOpen, setMaterialsOpen] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [materialsForm, setMaterialsForm] = useState({ deliver_to: 'business', needed_by: '', notes: '' });
    // TataMawing's own address (BUSINESS_ADDRESS on the server), shown as a delivery option
    const [businessAddress, setBusinessAddress] = useState('');
    const [materialsLoading, setMaterialsLoading] = useState(false);
    const [materialsError, setMaterialsError] = useState('');
    // "Copied ✓" on the Copy message button for a moment after copying
    const [messageCopied, setMessageCopied] = useState(false);


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
        } catch (err) {
            setError(errorMessage(err, "Couldn't load this quotation. Please try again."));
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
            setDecisionError(errorMessage(err, "Couldn't approve the quotation. Please try again."));
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
            setDecisionError(errorMessage(err, "Couldn't reject the quotation. Please try again."));
        } finally {
            setActionLoading(false);
        }
    };

    // ----- Materials PDF for the supplier -----
    // Opens the form pre-filled from the approved quote's price lines
    const openMaterials = () => {
        setMaterials(materialsFromComputation(quotation?.solar_computation));
        setMaterialsForm({
            deliver_to: 'business',
            // Materials are needed by the installation date, if one is set
            needed_by: quotation?.quotation?.installation_schedule?.scheduled_date?.slice(0, 10) ?? '',
            notes: '',
        });
        setMaterialsError('');
        setMaterialsOpen(true);

        // TataMawing's address for the "deliver to" choice (fetched once)
        if (!businessAddress) {
            api.get('/contact')
                .then((res) => setBusinessAddress(res.data.address ?? ''))
                .catch(() => {});
        }
    };

    const addMaterial = () => setMaterials([...materials, materialRow()]);
    const removeMaterial = (rowId) => setMaterials(materials.filter((m) => m.id !== rowId));
    const handleMaterialChange = (rowId, field, value) => {
        setMaterials(materials.map((m) => (m.id === rowId ? { ...m, [field]: value } : m)));
    };
    // A product picked from the list fills the row's name and unit
    const pickProduct = (rowId, product) => {
        setMaterials(materials.map((m) => (m.id === rowId
            ? { ...m, name: product.name, unit: product.unit }
            : m)));
    };

    // The same list as the PDF, as a message to paste into Messenger
    const copyMaterialsMessage = async () => {
        const lines = supplierRows(materials)
            .map((m, i) => `${i + 1}. [${m.category}] ${m.name.trim()} — ${m.quantity} ${m.unit.trim()}`.trimEnd());
        const deliverTo = materialsForm.deliver_to === 'site'
            ? quotation?.installation_address || 'Installation site'
            : businessAddress || BUSINESS_NAME;
        const neededBy = materialsForm.needed_by
            && new Date(`${materialsForm.needed_by}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });

        const message = [
            `Hi! Purchase request from ${BUSINESS_NAME}:`,
            '',
            ...lines,
            '',
            `Deliver to: ${deliverTo}`,
            neededBy && `Needed by: ${neededBy}`,
            materialsForm.notes.trim() && `Note: ${materialsForm.notes.trim()}`,
            '',
            'Thank you!',
        ].filter((line) => line !== false && line !== null && line !== undefined).join('\n');

        try {
            await navigator.clipboard.writeText(message);
            setMaterialsError('');
            setMessageCopied(true);
            setTimeout(() => setMessageCopied(false), 2000);
        } catch {
            setMaterialsError("Couldn't copy the message. Your browser blocked it — try again, or download the PDF instead.");
        }
    };

    const handleDownloadMaterials = async (e) => {
        e.preventDefault();
        setMaterialsLoading(true);
        setMaterialsError('');

        try {
            const res = await api.post(
                `/admin/quotations/${quotation.quotation.id}/materials-pdf`,
                {
                    ...materialsForm,
                    needed_by: materialsForm.needed_by || null,
                    notes: materialsForm.notes.trim() || null,
                    items: supplierRows(materials).map(({ id: _id, ...row }) => ({ ...row, quantity: parseInt(row.quantity, 10) || 0 })),
                },
                { responseType: 'blob' },
            );

            // File name from the server, e.g. TataMawing-materials-Q-2026-050.pdf
            const disposition = res.headers['content-disposition'] ?? '';
            const fileName = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? 'TataMawing-materials.pdf';
            const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            // Errors come back as a Blob because of responseType
            setMaterialsError(errorMessage(await readBlobError(err), "Couldn't create the materials PDF. Please try again."));
        } finally {
            setMaterialsLoading(false);
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
        setScheduleError('');
        setShowScheduleModal(true);
        fetchBookedSchedules();
    };

    const closeScheduleModal = () => setShowScheduleModal(false);

    // values comes from ScheduleModal: { scheduled_date, scheduled_time, assigned_technician, notes }
    const handleCreateSchedule = async (values) => {
        setScheduleLoading(true);
        setScheduleError('');
        setActionSuccess('');

        try {
            await api.post('/admin/schedules', {
                quotation_id: quotation?.quotation?.id,
                scheduled_date: values.scheduled_date,
                scheduled_time: values.scheduled_time,
                assigned_technician: values.assigned_technician,
                notes: values.notes || undefined,
            });

            setActionSuccess('Installation schedule created successfully.');
            setScheduleSuccess(true);
            setShowScheduleModal(false);
            fetchQuotation();

            // Send the admin back to the top so the success banner is in view
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            setScheduleError(errorMessage(err, "Couldn't create the installation schedule. Please try again."));
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

    const formatNumber = (value) => parseFloat(value).toLocaleString('en-PH', { maximumFractionDigits: 2 });

    // The bill the savings are based on: the average of both bills when the
    // customer entered two. Older requests only have the first bill saved.
    const billCount = (quotation?.electricity_bills ?? []).filter((bill) => parseFloat(bill.amount) > 0).length;
    const savingsBill = quotation?.solar_computation?.monthly_bill ?? quotation?.monthly_bill ?? null;
    const billLabel = billCount > 1 ? 'Average Monthly Bill' : 'Monthly Bill';

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <AdminLayout active="Quotations">
                <LoadingState label="Loading quotation details..." />
            </AdminLayout>
        );
    }

    if (error && !quotation) {
        return (
            <AdminLayout active="Quotations">
                <div style={styles.loadError}>{error}</div>
            </AdminLayout>
        );
    }

    const installSchedule = quotation?.quotation?.installation_schedule;
    const isApproved = quotation?.status === 'approved';

    // The three milestones in the banner's progress strip, each resolved from the data
    const steps = [
        { label: 'Submitted', state: 'done' },
        {
            // A request cancelled after approval still shows that it was approved
            label: quotation?.status === 'rejected' ? 'Rejected'
                : quotation?.status === 'cancelled' && !quotation?.quotation ? 'Cancelled' : 'Approved',
            state: quotation?.status === 'approved' || (quotation?.status === 'cancelled' && quotation?.quotation)
                ? 'done'
                : ['rejected', 'cancelled'].includes(quotation?.status)
                    ? 'rejected'
                    : 'current',
        },
        // Materials are arranged with the supplier over Messenger (the PDF
        // below), so there's no procurement step to track here
        {
            label: quotation?.status === 'cancelled' && quotation?.quotation ? 'Cancelled' : 'Installation',
            state: installSchedule
                ? 'done'
                : quotation?.status === 'cancelled' && quotation?.quotation ? 'rejected'
                    : isApproved ? 'current' : 'todo',
        },
    ];


    const quoteRef = formatQuotationRef(quotation.id, quotation.created_at);
    const customerName = quotation?.customer?.user?.name;
    const customerEmail = quotation?.customer?.user?.email;
    const siteAddress = quotation?.installation_address || quotation?.customer?.install_location;
    const computation = quotation?.solar_computation;
    const approvedQuote = quotation?.quotation;

    // A date under each step of the progress strip, when there is one
    const scheduleDay = installSchedule?.scheduled_date
        ? new Date(`${String(installSchedule.scheduled_date).slice(0, 10)}T00:00:00`)
        : null;
    const stepDates = [
        quotation?.submission_date ? formatDate(quotation.submission_date) : '',
        approvedQuote?.approval_date && steps[1].state === 'done'
            ? formatDate(approvedQuote.approval_date)
            : steps[1].state === 'current' ? 'Waiting for a decision' : '',
        scheduleDay
            ? `${formatDate(scheduleDay)}${installSchedule.scheduled_time ? ` · ${formatTime(installSchedule.scheduled_time)}` : ''}`
            : steps[2].state === 'current' ? 'Not scheduled yet' : '',
    ];
    const stepLabels = [steps[0].label, steps[1].label, installSchedule ? 'Installation scheduled' : steps[2].label];

    // Appliance totals for the last table row
    const applianceItems = quotation?.appliance_items ?? [];
    const totalWatts = applianceItems.reduce((sum, item) => sum + item.wattage * item.quantity, 0);
    const totalWh = applianceItems.reduce((sum, item) => sum + item.wattage * item.quantity * item.usage_hours_per_day, 0);

    // "Recommended system" cells; the inverter sizing ones only exist on newer quotations
    const sizing = [
        ['Daily energy use', `${formatNumber(computation?.total_load_watts)} Wh`],
        computation?.total_load_w != null && ['Total load', `${formatNumber(computation.total_load_w)} W`],
        computation?.inverter_size_w != null && ['Inverter size', `${formatNumber(computation.inverter_size_w)} W`, 'Total load + 2,000 W buffer'],
        ['Inverter', computation?.inverter_specification || '—'],
        ['Panels', `${computation?.panel_count ? `${computation.panel_count} panels · ` : ''}${computation?.panel_capacity_kw ?? '—'} kW`],
        parseFloat(computation?.battery_capacity_ah) > 0 && [
            'Battery',
            // A big night load gets a bank: 2 × 314 Ah, or 314 Ah + a smaller one
            `${computation.battery_qty > 1 ? `${computation.battery_qty} × ` : ''}${parseFloat(computation.battery_capacity_ah).toLocaleString()} Ah${computation.extra_battery_ah ? ` + ${computation.extra_battery_ah} Ah` : ''}`,
        ],
    ].filter(Boolean);

    // Savings — quotations made before this feature don't have them.
    // Once approved, payback uses the approved total instead of the engine's price.
    const savings = computation?.monthly_savings != null ? (() => {
        const total = approvedQuote?.total_amount ?? computation.estimated_cost;
        const annual = parseFloat(computation.annual_savings);
        const ret = computeReturn(annual, parseFloat(total));
        return {
            rate: `${formatCurrency(computation.electricity_rate)}/kWh`,
            fromBill: computation.rate_source === 'bill',
            netGain: signedPeso(ret.netGain),
            rows: [
                ['Monthly savings', formatCurrency(computation.monthly_savings)],
                ['Yearly savings', formatCurrency(computation.annual_savings)],
                ['New monthly bill', computation.new_monthly_bill != null ? formatCurrency(computation.new_monthly_bill) : '—', '#1F6B45'],
                ['Payback period', annual > 0 ? `${(parseFloat(total) / annual).toFixed(1)} years` : '—'],
                [`${SYSTEM_LIFE_YEARS}-year savings`, formatCurrency(ret.lifetimeSavings)],
            ],
        };
    })() : null;

    const darkPill = adminStatus[quotation?.status]?.darkDot || '#B9C4BE';

    // The gold "Materials PDF" button opens the form below and brings it into view
    const startMaterials = () => {
        openMaterials();
        setTimeout(() => document.getElementById('materials')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    return (
        <AdminLayout active="Quotations" crumb={quoteRef}>
            <div style={D.page}>
                <button type="button" onClick={() => navigate('/admin/quotations')} style={D.backLink}>
                    <span aria-hidden="true">←</span>
                    All quotations
                </button>

                {/* ---- Banner: who, status, actions, then the progress strip ---- */}
                <section aria-label="Quotation summary" style={D.hero}>
                    <div style={D.heroTop}>
                        <div style={{ minWidth: 0 }}>
                            <span style={adminText.eyebrow}>Quotation {quoteRef}</span>
                            <div style={D.heroNameRow}>
                                <h1 style={D.heroName}>{customerName || 'Customer'}</h1>
                                <span style={{ ...D.heroPill, background: darkPill }}>{statusLabel(quotation?.status)}</span>
                            </div>
                            {siteAddress && <p style={D.heroAddress}>{siteAddress}</p>}
                        </div>
                        <div style={D.heroActions}>
                            {customerEmail && (
                                <a href={`mailto:${customerEmail}`} style={D.heroOutlineBtn}>
                                    <MailIcon size={16} color="currentColor" />
                                    Contact customer
                                </a>
                            )}
                            {isApproved && approvedQuote && (
                                <button type="button" onClick={startMaterials} style={adminUi.goldBtn}>
                                    <DownloadIcon size={16} color="currentColor" />
                                    Materials PDF
                                </button>
                            )}
                        </div>
                    </div>

                    <ol aria-label="Progress" style={D.progress}>
                        {steps.map((step, index) => (
                            <li key={step.label + index} style={D.progressStep}>
                                <span
                                    style={{
                                        ...D.progressDot,
                                        ...(step.state === 'done' ? D.progressDone : {}),
                                        ...(step.state === 'rejected' ? D.progressRejected : {}),
                                        ...(step.state === 'current' ? D.progressCurrent : {}),
                                    }}
                                >
                                    {step.state === 'done' ? <CheckIcon size={14} color="currentColor" />
                                        : step.state === 'rejected' ? <XIcon size={14} color="currentColor" />
                                            : index + 1}
                                </span>
                                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, color: step.state === 'todo' ? adminTokens.stripText : '#FFFFFF' }}>
                                        {stepLabels[index]}
                                        <span style={adminUi.srOnly}>
                                            {step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (next)' : step.state === 'rejected' ? ' (stopped)' : ''}
                                        </span>
                                    </span>
                                    {stepDates[index] && <span style={{ fontSize: '13px', color: adminTokens.stripText }}>{stepDates[index]}</span>}
                                </span>
                                {index < steps.length - 1 && <span aria-hidden="true" style={D.progressLine} />}
                            </li>
                        ))}
                    </ol>
                </section>

                {actionSuccess && (
                    <div role="status" style={D.success}>
                        <CheckIcon size={16} color="currentColor" />
                        <span>{actionSuccess}</span>
                    </div>
                )}
                {error && <div role="alert" style={adminUi.errorBanner}>{error}</div>}

                <div style={D.columns}>
                    {/* ---- Left: the numbers ---- */}
                    <div style={D.leftCol}>
                        <section id="appliances" style={D.card}>
                            <CardHead title="Appliances" sub="What the customer wants to run on solar" />
                            <div className="scroll-x">
                                <table style={D.table}>
                                    <thead>
                                        <tr style={adminUi.tableHead}>
                                            <th scope="col" style={{ ...D.th, paddingLeft: '20px' }}>Appliance</th>
                                            <th scope="col" style={{ ...D.th, textAlign: 'right' }}>Watts</th>
                                            <th scope="col" style={{ ...D.th, textAlign: 'right' }}>Qty</th>
                                            <th scope="col" style={{ ...D.th, textAlign: 'right' }}>Hours/day</th>
                                            <th scope="col" style={{ ...D.th, textAlign: 'right', paddingRight: '20px' }}>Wh per day</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applianceItems.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ ...D.td, paddingLeft: '20px' }}>{item.appliance_name}</td>
                                                <td style={D.tdNum}>{formatNumber(item.wattage)} W</td>
                                                <td style={D.tdNum}>{item.quantity}</td>
                                                <td style={D.tdNum}>{item.usage_hours_per_day}</td>
                                                <td style={{ ...D.tdNum, paddingRight: '20px' }}>
                                                    {(item.wattage * item.quantity * item.usage_hours_per_day).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {applianceItems.length > 0 && (
                                            <tr style={{ background: '#F3F8F5' }}>
                                                <th scope="row" style={{ ...D.td, paddingLeft: '20px', textAlign: 'left', fontWeight: 700, borderBottom: 'none' }}>Total</th>
                                                <td style={{ ...D.tdNum, fontWeight: 700, borderBottom: 'none' }}>{totalWatts.toLocaleString()} W</td>
                                                <td colSpan={2} style={{ borderBottom: 'none' }} />
                                                <td style={{ ...D.tdNum, fontWeight: 700, paddingRight: '20px', borderBottom: 'none' }}>{totalWh.toLocaleString()} Wh</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section id="requirements" style={D.card}>
                            <CardHead title="Recommended system" sub="Worked out from the appliance list" />
                            <dl style={D.sizingGrid}>
                                {sizing.map(([label, value, note]) => (
                                    <div key={label} style={D.sizingCell}>
                                        <dt style={D.sizingLabel}>{label}</dt>
                                        <dd style={D.sizingValue}>{value}</dd>
                                        {note && <dd style={{ margin: '2px 0 0', fontSize: '13px', color: adminTokens.muted }}>{note}</dd>}
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section id="quotation" style={D.card}>
                            <CardHead
                                title="Pricing"
                                sub={approvedQuote?.approval_date
                                    ? `Estimate, then the final amount approved on ${formatDate(approvedQuote.approval_date)}`
                                    : 'Estimate from the quote builder'}
                            />
                            <div className="scroll-x">
                                <table style={D.table}>
                                    {computation?.line_items?.length > 0 && (
                                        <thead>
                                            <tr style={adminUi.tableHead}>
                                                <th scope="col" style={{ ...D.th, paddingLeft: '20px' }}>Item</th>
                                                <th scope="col" style={D.th}>Quantity × price</th>
                                                <th scope="col" style={{ ...D.th, textAlign: 'right', paddingRight: '20px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                    )}
                                    <tbody>
                                        {(computation?.line_items ?? []).map((item) => (
                                            <tr key={item.key}>
                                                <td style={{ ...D.td, paddingLeft: '20px' }}>
                                                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                                                    {item.sku && <span style={{ fontSize: '12px', color: adminTokens.subtle }}> {item.sku}</span>}
                                                </td>
                                                <td style={{ ...D.td, color: adminTokens.muted }}>
                                                    {item.qty} {item.qty_unit} × {formatCurrency(item.unit_price)}
                                                </td>
                                                <td style={{ ...D.tdNum, paddingRight: '20px' }}>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <th scope="row" colSpan={2} style={{ ...D.td, paddingLeft: '20px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${adminTokens.line}` }}>
                                                Estimated cost
                                            </th>
                                            <td style={{ ...D.tdNum, paddingRight: '20px', fontWeight: 700, borderBottom: `1px solid ${adminTokens.line}` }}>
                                                {formatCurrency(computation?.estimated_cost)}
                                            </td>
                                        </tr>
                                        {approvedQuote && (
                                            <>
                                                {[
                                                    ['Adjusted cost', approvedQuote.adjusted_cost],
                                                    ['+ Labor fee', approvedQuote.labor_fee],
                                                    ['+ Transportation fee', approvedQuote.transportation_fee],
                                                ].map(([label, amount]) => (
                                                    <tr key={label}>
                                                        <td colSpan={2} style={{ ...D.td, paddingLeft: '20px', color: adminTokens.body }}>{label}</td>
                                                        <td style={{ ...D.tdNum, paddingRight: '20px' }}>{formatCurrency(amount)}</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: '#E3F1E8' }}>
                                                    <th scope="row" colSpan={2} style={D.grandLabel}>Approved total</th>
                                                    <td style={D.grandValue}>{formatCurrency(approvedQuote.total_amount)}</td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* ---- Approve / reject ---- */}
                        {quotation?.status === 'pending' && !actionSuccess && (
                            <section id="decision" style={{ ...D.card, padding: '16px 20px' }}>
                                <h2 style={D.cardTitle}>Decision</h2>
                                <p style={{ margin: '2px 0 14px', color: adminTokens.muted, fontSize: '13px' }}>
                                    Approve this request to set the final costs, or reject it with a reason the customer can act on.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <button type="button" onClick={() => { setDecisionError(''); setShowApproveForm(true); }} style={adminUi.primaryBtn}>
                                        <CheckIcon size={16} color="currentColor" />
                                        Approve Quotation
                                    </button>
                                    <button type="button" onClick={() => { setDecisionError(''); setShowRejectForm(true); }} style={adminUi.rejectBtn}>
                                        <XIcon size={16} color="currentColor" />
                                        Reject Quotation
                                    </button>
                                </div>

                            {showApproveForm && (
                                <div style={styles.decisionModalOverlay} onClick={() => setShowApproveForm(false)}>
                                    <div style={styles.decisionModal} onClick={(e) => e.stopPropagation()}>
                                    <p style={styles.cardDesc}>
                                        Review and adjust the costs before approving.
                                        The total amount is computed automatically.
                                    </p>

                                    <form onSubmit={handleApprove} style={styles.decisionForm}>
                                        <div style={styles.field}>
                                            <label htmlFor="approve-base-cost" style={styles.label}>Adjusted Base Cost</label>
                                            <AmountInput
                                                id="approve-base-cost"
                                                value={approveForm.adjusted_cost}
                                                onChange={(adjusted_cost) => setApproveForm({ ...approveForm, adjusted_cost })}
                                                className="input-field"
                                                style={styles.decisionInput}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>

                                        <div style={styles.field}>
                                            <label htmlFor="approve-labor-fee" style={styles.label}>Labor Fee</label>
                                            <AmountInput
                                                id="approve-labor-fee"
                                                value={approveForm.labor_fee}
                                                onChange={(labor_fee) => setApproveForm({ ...approveForm, labor_fee })}
                                                className="input-field"
                                                style={styles.decisionInput}
                                                placeholder="15,000"
                                            />
                                        </div>

                                        <div style={styles.field}>
                                            <label htmlFor="approve-transport-fee" style={styles.label}>Transportation Fee</label>
                                            <AmountInput
                                                id="approve-transport-fee"
                                                value={approveForm.transportation_fee}
                                                onChange={(transportation_fee) => setApproveForm({ ...approveForm, transportation_fee })}
                                                className="input-field"
                                                style={styles.decisionInput}
                                                placeholder="5,000"
                                            />
                                        </div>

                                        <div style={styles.totalBanner}>
                                            <span style={styles.totalBannerLabel}>Approved total</span>
                                            <span style={styles.totalBannerValue}>
                                                {formatCurrency(
                                                    (parseFloat(approveForm.adjusted_cost) || 0) +
                                                    (parseFloat(approveForm.labor_fee) || 0) +
                                                    (parseFloat(approveForm.transportation_fee) || 0)
                                                )}
                                            </span>
                                        </div>

                                        {decisionError && <div role="alert" style={styles.error}>{decisionError}</div>}

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
                                </div>
                            )}

                            {showRejectForm && (
                                <div style={styles.decisionModalOverlay} onClick={() => setShowRejectForm(false)}>
                                    <div style={styles.decisionModal} onClick={(e) => e.stopPropagation()}>
                                    <p style={styles.cardDesc}>
                                        Please provide a reason for rejection so the
                                        customer knows what to fix.
                                    </p>

                                    <form onSubmit={handleReject} style={styles.decisionForm}>
                                        <div style={styles.field}>
                                            <label style={styles.label}>Rejection Reason</label>
                                            <textarea
                                                value={rejectForm.rejection_reason}
                                                onChange={(e) => setRejectForm({
                                                    rejection_reason: e.target.value
                                                })}
                                                className="input-field"
                                                style={styles.decisionTextarea}
                                                placeholder="e.g. Incomplete appliance information..."
                                                maxLength={1000}
                                                required
                                            />
                                        </div>

                                        {decisionError && <div role="alert" style={styles.error}>{decisionError}</div>}

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
                                </div>
                            )}
                            </section>
                        )}

                        {/* ---- Materials PDF for the supplier (the open form) ---- */}
                        {/* The admin downloads it and sends it on Messenger; nothing is saved or tracked */}
                        {isApproved && approvedQuote && materialsOpen && (
                            <section id="materials" className="m-pad" style={{ ...D.card, padding: '16px 20px' }}>
                                <form onSubmit={handleDownloadMaterials}>
                                    <div style={styles.matHead}>
                                        <div>
                                            <h3 style={{ ...styles.cardTitle, margin: 0 }}>Materials for supplier</h3>
                                        </div>
                                        <span style={styles.matCount}>
                                            {materials.length} {materials.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>

                                    {/* Reads like the PDF: plain text until you hover or click a cell */}
                                    <div className="scroll-x">
                                        <div style={{ minWidth: '540px' }}>
                                            <div style={{ ...styles.matGrid, ...styles.matHeaderRow }}>
                                                <span>#</span>
                                                <span>Category</span>
                                                <span>Item</span>
                                                <span style={{ textAlign: 'center' }}>Qty</span>
                                                <span>Unit</span>
                                                <span />
                                            </div>

                                            {materials.map((material, index) => (
                                                <div key={material.id} style={{ ...styles.matGrid, ...styles.matRow }}>
                                                    <span style={styles.matIndex}>{index + 1}</span>
                                                    {/* Set automatically from the item's name */}
                                                    <span style={material.name.trim() ? styles.matCategory : styles.matCategoryEmpty}>
                                                        {categoryOf(material.name) || '—'}
                                                    </span>
                                                    <ProductPicker
                                                        value={material.name}
                                                        onChange={(text) => handleMaterialChange(material.id, 'name', text)}
                                                        onPick={(product) => pickProduct(material.id, product)}
                                                        className="input-field mat-cell"
                                                        inputStyle={{ ...styles.matCell, fontWeight: 600, color: adminTokens.ink }}
                                                        colors={PICKER_COLORS}
                                                        placeholder="Name, e.g. MC4"
                                                        maxLength={120}
                                                        aria-label={`Item ${index + 1}`}
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        // 1–999, whole numbers only
                                                        pattern="[1-9][0-9]{0,2}"
                                                        title="Enter a quantity from 1 to 999"
                                                        maxLength={3}
                                                        value={material.quantity}
                                                        onChange={(e) => handleMaterialChange(material.id, 'quantity', e.target.value.replace(/\D/g, ''))}
                                                        className="input-field"
                                                        style={styles.matQty}
                                                        aria-label={`Quantity ${index + 1}`}
                                                        required
                                                    />
                                                    <input
                                                        value={material.unit}
                                                        onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                                                        className="input-field mat-cell"
                                                        style={{ ...styles.matCell, color: adminTokens.muted }}
                                                        placeholder="unit"
                                                        maxLength={20}
                                                        aria-label={`Unit ${index + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="m-tap"
                                                        onClick={() => removeMaterial(material.id)}
                                                        disabled={materials.length === 1}
                                                        style={{ ...styles.matRemove, opacity: materials.length === 1 ? 0.3 : 1 }}
                                                        aria-label={`Remove ${material.name || `item ${index + 1}`}`}
                                                        title="Remove"
                                                    >
                                                        <XIcon size={13} color="currentColor" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button type="button" onClick={addMaterial} style={styles.matAdd}>
                                        + Add item
                                    </button>

                                    <div style={styles.matDivider} />

                                    <div style={styles.matDeliveryRow}>
                                        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
                                            <span style={styles.label}>Deliver to</span>
                                            <div role="radiogroup" aria-label="Deliver to" style={styles.matChoices}>
                                                {[
                                                    {
                                                        value: 'business',
                                                        label: 'TataMawing',
                                                        address: businessAddress || 'TataMawing address',
                                                    },
                                                    {
                                                        value: 'site',
                                                        label: 'Installation site',
                                                        address: quotation?.installation_address || 'No site address on this request yet.',
                                                    },
                                                ].map((option) => {
                                                    const checked = materialsForm.deliver_to === option.value;
                                                    return (
                                                        <label
                                                            key={option.value}
                                                            style={{ ...styles.matChoice, ...(checked ? styles.matChoiceOn : {}) }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="deliver_to"
                                                                value={option.value}
                                                                checked={checked}
                                                                onChange={() => setMaterialsForm({ ...materialsForm, deliver_to: option.value })}
                                                                style={{ accentColor: adminTokens.green, margin: '0.2rem 0 0' }}
                                                            />
                                                            <span style={{ minWidth: 0 }}>
                                                                <span style={styles.matChoiceTitle}>{option.label}</span>
                                                                {/* The address that will be printed on the PDF */}
                                                                <span style={styles.matChoiceAddress}>{option.address}</span>
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                            <label htmlFor="materials-needed-by" style={styles.label}>
                                                Needed by · <span style={{ letterSpacing: '0.06em' }}>optional</span>
                                            </label>
                                            <input
                                                id="materials-needed-by"
                                                type="date"
                                                value={materialsForm.needed_by}
                                                onChange={(e) => setMaterialsForm({ ...materialsForm, needed_by: e.target.value })}
                                                className="input-field"
                                                style={styles.input}
                                            />
                                            {installSchedule && (
                                                <p style={styles.matHint}>
                                                    Installation is scheduled for {formatDate(installSchedule.scheduled_date)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ ...styles.field, marginTop: '1rem' }}>
                                        <label htmlFor="materials-notes" style={styles.label}>
                                            Note for the supplier · <span style={{ letterSpacing: '0.06em' }}>optional</span>
                                        </label>
                                        <textarea
                                            id="materials-notes"
                                            value={materialsForm.notes}
                                            onChange={(e) => setMaterialsForm({ ...materialsForm, notes: e.target.value })}
                                            maxLength={1000}
                                            rows={2}
                                            className="input-field"
                                            style={{ ...styles.input, resize: 'vertical', fontSize: '0.875rem' }}
                                            placeholder="e.g. Please deliver in the morning."
                                        />
                                    </div>

                                    {materialsError && <div role="alert" style={styles.error}>{materialsError}</div>}

                                    <div style={styles.matFooter}>
                                        <span style={styles.matFooterNote}>The PDF leaves out prices and customer details.</span>
                                        <div style={styles.matFooterActions}>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => setMaterialsOpen(false)}
                                                style={styles.cancelBtn}
                                            >
                                                Close
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={copyMaterialsMessage}
                                                style={styles.cancelBtn}
                                                title="Copies the list as a message you can paste into Messenger"
                                            >
                                                {messageCopied ? 'Copied ✓' : 'Copy message'}
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                disabled={materialsLoading}
                                                style={{
                                                    ...styles.approveBtn,
                                                    fontWeight: 600,
                                                    opacity: materialsLoading ? 0.7 : 1,
                                                    cursor: materialsLoading ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <span>{materialsLoading ? 'Preparing…' : 'Download PDF'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </section>
                        )}
                    </div>

                    {/* ---- Right: who, when, what next ---- */}
                    <div style={D.rightCol}>
                        {quotation?.status === 'cancelled' && (
                            <section style={{ ...D.card, ...D.dangerCard }}>
                                <h2 style={{ ...D.cardTitle, color: adminTokens.danger }}>Cancelled by the customer</h2>
                                <p style={{ margin: '6px 0 0', color: adminTokens.body }}>{quotation.cancellation_reason || 'No reason was given.'}</p>
                                {quotation.cancelled_at && (
                                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: adminTokens.muted }}>
                                        {new Date(quotation.cancelled_at).toLocaleString('en-PH', {
                                            month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                                        })}
                                    </p>
                                )}
                            </section>
                        )}

                        {quotation?.status === 'rejected' && quotation?.notes && (
                            <section style={{ ...D.card, ...D.dangerCard }}>
                                <h2 style={{ ...D.cardTitle, color: adminTokens.danger }}>Rejection reason</h2>
                                <p style={{ margin: '6px 0 0', color: adminTokens.body }}>{quotation.notes}</p>
                            </section>
                        )}

                        {isApproved && (
                            <section id="installation" style={{ ...D.card, padding: '16px 20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <h2 style={D.cardTitle}>Installation</h2>
                                    {installSchedule && <Badge status={installSchedule.status || 'scheduled'} />}
                                </div>
                                {installSchedule && scheduleDay ? (
                                    <>
                                        <div style={D.bookedRow}>
                                            <div style={D.calTile} aria-hidden="true">
                                                <div style={D.calTileMonth}>{scheduleDay.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
                                                <div style={{ fontSize: '20px', fontWeight: 700, padding: '2px 0' }}>{scheduleDay.getDate()}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>
                                                    {scheduleDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div style={{ color: adminTokens.muted }}>
                                                    {installSchedule.scheduled_time ? `Starts ${formatTime(installSchedule.scheduled_time)}` : 'Start time to be decided'}
                                                </div>
                                            </div>
                                        </div>
                                        <dl style={{ ...D.facts, marginTop: '12px' }}>
                                            <dt style={D.factLabel}>Technician</dt>
                                            <dd style={{ margin: 0, fontWeight: 600 }}>{installSchedule.assigned_technician || '—'}</dd>
                                        </dl>
                                    </>
                                ) : scheduleSuccess ? (
                                    <p style={{ margin: 0, color: '#1F6B45', fontWeight: 600 }}>Installation schedule created successfully.</p>
                                ) : (
                                    <>
                                        <p style={{ margin: '0 0 12px', color: adminTokens.muted }}>Pick a day, time and technician for this installation.</p>
                                        <button type="button" onClick={openScheduleModal} style={adminUi.primaryBtn}>
                                            <CalendarIcon size={15} color="currentColor" />
                                            Set installation schedule
                                        </button>
                                    </>
                                )}
                            </section>
                        )}

                        <section id="customer" style={{ ...D.card, padding: '16px 20px' }}>
                            <h2 style={{ ...D.cardTitle, marginBottom: '12px' }}>Customer</h2>
                            <dl style={D.facts}>
                                <dt style={D.factLabel}>Name</dt>
                                <dd style={D.factValue}>{customerName || '—'}</dd>
                                <dt style={D.factLabel}>Email</dt>
                                <dd style={D.factValue}>
                                    {customerEmail ? <a href={`mailto:${customerEmail}`} style={{ color: adminTokens.green, textDecoration: 'none' }}>{customerEmail}</a> : '—'}
                                </dd>
                                <dt style={D.factLabel}>Phone</dt>
                                <dd style={D.factValue}>{formatPhone(quotation?.customer?.contact_number) || '—'}</dd>
                                <dt style={D.factLabel}>Address</dt>
                                <dd style={D.factValue}>{siteAddress || '—'}</dd>
                                <dt style={D.factLabel}>System</dt>
                                <dd style={D.factValue}>
                                    {quotation?.solar_system_type
                                        ? quotation.solar_system_type.charAt(0).toUpperCase() + quotation.solar_system_type.slice(1)
                                        : '—'}
                                </dd>
                                {savingsBill != null && (
                                    <>
                                        <dt style={D.factLabel}>Monthly bill</dt>
                                        <dd style={D.factValue}>
                                            {formatCurrency(savingsBill)}{billLabel === 'Average Monthly Bill' ? ' on average' : ''}
                                        </dd>
                                    </>
                                )}
                                <dt style={D.factLabel}>Submitted</dt>
                                <dd style={D.factValue}>{quotation?.submission_date ? formatDate(quotation.submission_date) : '—'}</dd>
                            </dl>
                            {/* The customer's own description of the house / site */}
                            {quotation?.site_description && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${adminTokens.rowLine}` }}>
                                    <div style={D.factLabel}>About the site</div>
                                    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{quotation.site_description}</p>
                                </div>
                            )}
                        </section>

                        {savings && (
                            <section style={D.card}>
                                <div style={{ padding: '16px 20px 0' }}>
                                    <h2 style={D.cardTitle}>Estimated savings</h2>
                                    <p style={{ margin: '2px 0 12px', fontSize: '13px', color: adminTokens.muted }}>
                                        At {savings.rate}, {savings.fromBill ? "taken from the customer's bill" : 'the SORECO rate'}
                                    </p>
                                </div>
                                <div style={D.netGain}>
                                    <span style={{ color: '#1F4D3A' }}>{SYSTEM_LIFE_YEARS}-year net gain</span>
                                    <span style={{ fontSize: '22px', fontWeight: 700, color: adminTokens.green }}>{savings.netGain}</span>
                                </div>
                                <dl style={{ margin: 0, padding: '0 20px 14px' }}>
                                    {savings.rows.map(([label, value, color]) => (
                                        <div key={label} style={D.savingsRow}>
                                            <dt style={{ color: adminTokens.body }}>{label}</dt>
                                            <dd style={{ margin: 0, fontWeight: 700, color: color || adminTokens.ink }}>{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        )}

                        {isApproved && approvedQuote && !materialsOpen && (
                            <section id="materials" style={D.materialsCard}>
                                <h2 style={D.cardTitle}>Materials for the supplier</h2>
                                <p style={{ margin: '4px 0 12px', color: '#5C3D00' }}>
                                    A purchase request PDF of this quotation's materials, ready to send on Messenger. It has no prices or customer name.
                                </p>
                                <button type="button" onClick={startMaterials} style={{ ...adminUi.primaryBtn, height: '38px', fontWeight: 600 }}>
                                    Prepare materials PDF
                                </button>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {showScheduleModal && (
                <ScheduleModal
                    contextLabel="For quotation"
                    badge={formatQuotationRef(quotation.id, quotation.created_at)}
                    schedules={bookedSchedules}
                    intro={
                        <div style={{ fontSize: '14px', color: adminTokens.body }}>
                            Installing for <strong>{quotation?.customer?.user?.name || 'this customer'}</strong>
                            {(quotation?.installation_address || quotation?.customer?.install_location)
                                ? ` · ${quotation.installation_address || quotation.customer.install_location}`
                                : ''}
                        </div>
                    }
                    submitting={scheduleLoading}
                    error={scheduleError}
                    onSubmit={handleCreateSchedule}
                    onClose={closeScheduleModal}
                />
            )}
        </AdminLayout>
    );
}


// Title and grey line at the top of a card
function CardHead({ title, sub }) {
    return (
        <div style={{ padding: '16px 20px 12px' }}>
            <h2 style={D.cardTitle}>{title}</h2>
            {sub && <p style={{ margin: '2px 0 0', fontSize: '13px', color: adminTokens.muted }}>{sub}</p>}
        </div>
    );
}

const styles = {
    loadError: {
        textAlign: 'center',
        padding: '3rem',
        color: adminTokens.danger,
    },

    /* ---------- Shell ---------- */
    shell: {
        maxWidth: '1080px',
        margin: '0 auto',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 12px 32px -18px rgba(17,24,39,0.18)',
    },
    shellHeader: {
        backgroundColor: adminTokens.surface,
        borderBottom: `1px solid ${adminTokens.border}`,
        padding: '1.375rem 1.75rem 1.25rem',
    },
    backBtn: { ...smallGreenButton, marginBottom: '0.875rem' },
    backArrow: {
        fontSize: '0.9375rem',
        lineHeight: 1,
    },
    titleRow: {
        ...adminUi.hero,
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
    pageTitle: adminText.pageTitle,
    contactBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4375rem',
        fontSize: '0.8125rem',
        padding: '0.5625rem 0.9375rem',
        border: `1px solid ${adminTokens.border}`,
        backgroundColor: adminTokens.surface,
        color: adminTokens.body,
        borderRadius: '6px',
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
        backgroundColor: adminTokens.green,
        color: 'white',
    },
    stepDotRejected: {
        backgroundColor: adminTokens.danger,
        color: 'white',
    },
    stepDotCurrent: {
        border: `2px solid ${adminTokens.green}`,
        backgroundColor: adminTokens.greenTint,
        color: adminTokens.green,
    },
    stepDotTodo: {
        border: `2px solid ${adminTokens.border}`,
        color: adminTokens.muted,
    },
    stepLabel: {
        fontSize: '0.71875rem',
        color: adminTokens.ink,
        fontWeight: '500',
        letterSpacing: '0.02em',
        textAlign: 'center',
    },
    stepLabelCurrent: {
        color: adminTokens.green,
        fontWeight: '600',
    },
    stepLabelTodo: {
        color: adminTokens.muted,
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
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        padding: '1.25rem 1.375rem',
        backgroundColor: adminTokens.surface,
        ...adminUi.cardAccent,
    },
    cardDanger: {
        borderLeft: `4px solid ${adminTokens.danger}`,
    },
    cardTitle: {
        fontSize: '0.9375rem',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        color: adminTokens.ink,
        margin: '0 0 1.125rem 0',
    },
    cardDesc: {
        margin: '0 0 1rem',
        fontSize: '0.8125rem',
        color: adminTokens.muted,
        maxWidth: '52ch',
    },
    cardBodyText: {
        margin: 0,
        fontSize: '0.875rem',
        color: adminTokens.body,
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
        color: adminTokens.muted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: '0.3125rem',
        fontSize: '0.90625rem',
        color: adminTokens.ink,
        wordBreak: 'break-word',
    },
    infoValueFigure: {
        marginTop: '0.3125rem',
        fontSize: '0.90625rem',
        color: adminTokens.ink,
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
        backgroundColor: adminTokens.greenTint,
        borderRadius: '6px',
        padding: '1rem 1.25rem',
        marginTop: '1.25rem',
    },
    totalBannerLabel: {
        fontSize: '0.8125rem',
        color: adminTokens.green,
        fontWeight: '600',
        letterSpacing: '0.02em',
    },
    totalBannerValue: {
        fontSize: '1.375rem',
        fontWeight: '600',
        color: adminTokens.green,
        letterSpacing: '-0.02em',
    },

    /* ---------- Appliance table ---------- */
    tableHeader: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.55rem 0.625rem',
        fontSize: '0.65625rem',
        fontWeight: '600',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        ...adminUi.tableHead,
    },
    // Same side padding as the header band so the columns line up
    tableRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 0.625rem',
        borderBottom: `1px solid ${adminTokens.hairline}`,
        fontSize: '0.875rem',
        color: adminTokens.body,
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
        borderRadius: '6px',
        border: `1px solid ${adminTokens.border}`,
        backgroundColor: colors.bgSubtle,
    },
    resultIcon: {
        display: 'inline-flex',
        marginBottom: '0.25rem',
    },
    resultLabel: {
        fontSize: '0.65625rem',
        color: adminTokens.muted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    resultValue: {
        fontSize: '1.0625rem',
        fontWeight: '600',
        color: adminTokens.ink,
    },
    resultNote: {
        fontSize: '0.75rem',
        color: adminTokens.muted,
    },

    /* ---------- Price breakdown ---------- */
    breakdown: {
        marginTop: '1.25rem',
        borderTop: `1px solid ${adminTokens.border}`,
        paddingTop: '0.875rem',
    },
    breakdownTitle: {
        fontSize: '0.65625rem',
        color: adminTokens.muted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
        marginBottom: '0.25rem',
    },
    breakdownRow: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '0.25rem 1rem',
        padding: '0.625rem 0',
        borderBottom: `1px solid ${adminTokens.hairline}`,
        fontSize: '0.875rem',
        color: adminTokens.body,
    },
    breakdownLabel: { fontWeight: 600, color: adminTokens.ink },
    breakdownSku: { color: adminTokens.muted, fontSize: '0.8125rem' },
    breakdownQty: { flex: 2, minWidth: '140px', color: adminTokens.muted, fontSize: '0.8125rem' },
    breakdownAmount: { flex: 1, minWidth: '100px', textAlign: 'right', fontWeight: 600, color: adminTokens.ink },

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
        backgroundColor: adminTokens.green,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    rejectBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4375rem',
        fontSize: '0.8125rem',
        padding: '0.6875rem 1.125rem',
        backgroundColor: adminTokens.danger,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    cancelBtn: {
        backgroundColor: adminTokens.surface,
        color: adminTokens.body,
        border: `1px solid ${adminTokens.border}`,
        padding: '0.6875rem 1.125rem',
        borderRadius: '6px',
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
        color: adminTokens.muted,
        letterSpacing: '0.1em',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        fontSize: '0.9375rem',
        boxSizing: 'border-box',
    },
    decisionForm: {
        padding: '1rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: colors.bgSubtle,
    },
    decisionModalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(15, 31, 24, 0.48)',
    },
    decisionModal: {
        width: '100%',
        maxWidth: '500px',
        maxHeight: 'calc(100vh - 2rem)',
        overflowY: 'auto',
        padding: '1.25rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        boxShadow: '0 24px 70px rgba(17,24,39,0.22)',
    },
    decisionInput: {
        width: '100%',
        padding: '0.7rem 0.75rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        color: adminTokens.ink,
        fontSize: '0.9375rem',
        fontWeight: '600',
        boxSizing: 'border-box',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
    },
    decisionTextarea: {
        width: '100%',
        minHeight: '122px',
        padding: '0.75rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        color: adminTokens.ink,
        fontSize: '0.875rem',
        lineHeight: 1.55,
        boxSizing: 'border-box',
        resize: 'vertical',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
    },
    formActions: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
    },

    /* ---------- Materials for supplier ---------- */
    matHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        marginBottom: '1.125rem',
    },
    matSub: {
        margin: '0.3rem 0 0',
        fontSize: '0.8125rem',
        color: adminTokens.muted,
        maxWidth: '60ch',
    },
    matCount: {
        flexShrink: 0,
        fontSize: '0.65625rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: adminTokens.muted,
        paddingTop: '0.2rem',
    },
    // # · Category · Item · Qty · Unit · remove
    matGrid: {
        display: 'grid',
        gridTemplateColumns: '28px 104px minmax(200px, 1fr) 64px 72px 32px',
        alignItems: 'center',
        columnGap: '0.5rem',
    },
    matHeaderRow: {
        padding: '0.55rem 0.375rem',
        fontSize: '0.65625rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        ...adminUi.tableHead,
    },
    // Same side padding as the header band so the columns line up
    matRow: {
        padding: '0.375rem 0.375rem',
        borderBottom: `1px solid ${adminTokens.hairline}`,
    },
    matIndex: {
        fontSize: '0.8125rem',
        color: adminTokens.muted,
        fontVariantNumeric: 'tabular-nums',
    },
    // Read-only: set from the item's name
    matCategory: {
        justifySelf: 'start',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        backgroundColor: adminTokens.greenTint,
        color: adminTokens.ink,
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    matCategoryEmpty: {
        fontSize: '0.8125rem',
        color: adminTokens.muted,
    },
    // Looks like plain text until hovered or focused (see .mat-cell in App.css)
    matCell: {
        width: '100%',
        minWidth: 0,
        padding: '0.45rem 0.5rem',
        border: '1px solid transparent',
        borderRadius: '7px',
        backgroundColor: 'transparent',
        fontSize: '0.875rem',
        color: adminTokens.body,
        boxSizing: 'border-box',
        textOverflow: 'ellipsis',
    },
    matQty: {
        width: '100%',
        padding: '0.4rem 0.25rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '7px',
        backgroundColor: adminTokens.surface,
        fontSize: '0.875rem',
        fontWeight: 600,
        color: adminTokens.ink,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
    },
    matRemove: {
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '7px',
        backgroundColor: 'transparent',
        color: adminTokens.muted,
        cursor: 'pointer',
    },
    matAdd: {
        marginTop: '0.75rem',
        padding: '0.25rem 0',
        border: 'none',
        backgroundColor: 'transparent',
        color: adminTokens.green,
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    matDivider: {
        height: '1px',
        backgroundColor: adminTokens.border,
        margin: '1.125rem 0',
    },
    matDeliveryRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem 1.5rem',
    },
    matChoices: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
        gap: '0.625rem',
    },
    matChoice: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.75rem 0.875rem',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        cursor: 'pointer',
    },
    matChoiceOn: {
        borderColor: adminTokens.green,
        backgroundColor: adminTokens.greenTint,
        boxShadow: `inset 0 0 0 1px ${adminTokens.green}`,
    },
    matChoiceTitle: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: adminTokens.ink,
    },
    matChoiceAddress: {
        display: 'block',
        marginTop: '0.2rem',
        fontSize: '0.75rem',
        lineHeight: 1.45,
        color: adminTokens.muted,
        overflowWrap: 'anywhere',
    },
    matHint: {
        margin: '0.4rem 0 0',
        fontSize: '0.75rem',
        color: adminTokens.muted,
    },
    matFooter: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem 1rem',
        marginTop: '0.25rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${adminTokens.border}`,
    },
    matFooterNote: {
        fontSize: '0.75rem',
        color: adminTokens.muted,
    },
    matFooterActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginLeft: 'auto',
    },

    /* ---------- Banners ---------- */
    success: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: adminTokens.greenTint,
        color: adminTokens.green,
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
    },
    error: { ...adminUi.errorBanner, marginBottom: 0 },

    /* ---------- Schedule modal ---------- */

    /* ---------- Calendar inside the modal ---------- */
};

// Page look from the "Quotation detail" mockup
const D = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', color: adminTokens.ink },
    backLink: {
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '32px',
        padding: 0, border: 'none', background: 'none', color: adminTokens.green, fontSize: '14px', fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer',
    },

    hero: { background: adminTokens.green, color: '#FFFFFF', borderRadius: adminTokens.heroRadius },
    heroTop: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '16px 24px', padding: '22px 24px 20px',
    },
    heroNameRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '4px' },
    heroName: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', overflowWrap: 'anywhere' },
    heroPill: { fontSize: '12px', fontWeight: 700, color: adminTokens.green, borderRadius: '4px', padding: '2px 8px' },
    heroAddress: { margin: '2px 0 0', fontSize: '14px', color: adminTokens.stripText },
    heroActions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    heroOutlineBtn: {
        height: '42px', padding: '0 14px', boxSizing: 'border-box', borderRadius: adminTokens.radius,
        border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#FFFFFF', fontSize: '14px',
        fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', whiteSpace: 'nowrap',
    },
    progress: {
        listStyle: 'none', margin: 0, padding: '14px 24px 16px', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px 0',
        borderTop: '1px solid rgba(255,255,255,0.14)', background: adminTokens.strip,
        borderRadius: `0 0 ${adminTokens.heroRadius} ${adminTokens.heroRadius}`,
    },
    progressStep: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
    progressDot: {
        width: '26px', height: '26px', borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: adminTokens.stripText,
        border: '1px solid rgba(255,255,255,0.3)', boxSizing: 'border-box',
    },
    progressDone: { background: '#A8D5C2', color: adminTokens.green, border: 'none' },
    progressRejected: { background: '#F08A7E', color: '#5A120B', border: 'none' },
    progressCurrent: { background: 'transparent', color: adminTokens.gold, border: `2px solid ${adminTokens.gold}` },
    progressLine: { flex: 1, minWidth: '16px', height: '1px', background: 'rgba(255,255,255,0.22)', margin: '0 16px' },

    success: {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: adminTokens.radius,
        background: '#E3F1E8', color: '#1F6B45', fontWeight: 600,
    },

    columns: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' },
    leftCol: { flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' },
    rightCol: { flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' },

    card: { background: '#FFFFFF', border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius },
    cardTitle: { margin: 0, fontSize: '16px', fontWeight: 700, color: adminTokens.ink },
    dangerCard: { padding: '16px 20px', borderColor: '#F0D0CB', background: '#FFF8F7' },

    table: { width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
        textAlign: 'left', fontWeight: 600, padding: '9px 12px',
        borderTop: `1px solid ${adminTokens.line}`, borderBottom: `1px solid ${adminTokens.line}`,
    },
    td: { padding: '10px 12px', borderBottom: `1px solid ${adminTokens.rowLine}` },
    tdNum: { padding: '10px 12px', borderBottom: `1px solid ${adminTokens.rowLine}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
    grandLabel: { textAlign: 'left', padding: '14px 12px 14px 20px', fontSize: '15px', fontWeight: 700, color: adminTokens.green },
    grandValue: { padding: '14px 20px 14px 12px', textAlign: 'right', fontSize: '22px', fontWeight: 700, color: adminTokens.green, whiteSpace: 'nowrap' },

    sizingGrid: {
        margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        borderTop: `1px solid ${adminTokens.line}`, overflow: 'hidden',
        borderRadius: `0 0 ${adminTokens.radius} ${adminTokens.radius}`,
    },
    // The right/bottom lines of the last column and row fall outside and are clipped
    sizingCell: {
        padding: '14px 20px', borderBottom: `1px solid ${adminTokens.rowLine}`, borderRight: `1px solid ${adminTokens.rowLine}`,
        marginRight: '-1px', marginBottom: '-1px',
    },
    sizingLabel: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: adminTokens.muted },
    sizingValue: { margin: '2px 0 0', fontSize: '17px', fontWeight: 700, overflowWrap: 'anywhere' },

    bookedRow: { display: 'flex', gap: '14px', alignItems: 'center', paddingBottom: '12px', borderBottom: `1px solid ${adminTokens.rowLine}` },
    calTile: { width: '52px', flex: 'none', border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius, overflow: 'hidden', textAlign: 'center' },
    calTileMonth: { background: adminTokens.green, color: '#FFFFFF', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', padding: '2px 0' },

    facts: { margin: 0, display: 'grid', gridTemplateColumns: '90px minmax(0, 1fr)', gap: '8px 10px' },
    factLabel: { color: adminTokens.muted },
    factValue: { margin: 0, overflowWrap: 'anywhere' },

    netGain: {
        margin: '0 20px 12px', padding: '12px 14px', background: '#E3F1E8', borderRadius: adminTokens.radius,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap',
    },
    savingsRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderTop: `1px solid ${adminTokens.rowLine}` },

    materialsCard: { background: '#FDF6E3', border: '1px solid #F1DFB0', borderRadius: adminTokens.radius, padding: '16px 20px' },
};
