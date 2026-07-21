import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminQuotationDetailPage() {
    const { user, logout } = useAuth();
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
        assigned_technician: '',
    });
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleSuccess, setScheduleSuccess] = useState(false);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [materials, setMaterials] = useState([
        {
            id: Date.now(),
            material_name: '',
            quantity: 1,
            unit: '',
            unite_price: '',
        }
    ]);
    const [showPRForm, setShowPRForm] = useState(false);
    const [prSuccess, setPRSuccess] = useState(false);
    const [prLoading, setPRLoading] = useState(false);


    useEffect(() => {
        fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
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
            setError('Failed to load quotation details.');
        } finally {
            setLoading(false);
        }
    };

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
        }catch (err) {
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
        setError(err.repsonse?.data?.message || 'Failed to generate purchase request.');
    } finally {
        setPRLoading(false);
    }
};

    const handleCreateSchedule = async (e) => {
        e.preventDefault();

        setScheduleLoading(true);

        setError('');
        setActionSuccess('');

        try {
            await api.post('/admin/schedules', {
                'quotation_id': quotation?.quotation?.id,
                'scheduled_date': scheduleForm.scheduled_date,
                'assigned_technician': scheduleForm.assigned_technician,
            });

            setActionSuccess('Installation schedule created successfully.');
            setShowScheduleForm(false);
            setScheduleSuccess(true);
            fetchQuotation();

        } catch (err) {
            setError (err.response?.data?.message || 'Failed to create installation schedule.');
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
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

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.navbar}>
                    <h1 style={styles.navTitle}>TataMawing Solar</h1>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    Loading quotation details...
                </div>
            </div>
        );
    }

    if (error && !quotation) {
        return (
            <div style={styles.container}>
                <div style={styles.navbar}>
                    <h1 style={styles.navTitle}>TataMawing Solar</h1>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    <span style={styles.navRole}>Admin</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
                </div>
            </div>

            <div style={styles.content}>
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    style={styles.backBtn}
                >
                    ← Back to Dashboard
                </button>

                <div style={styles.pageHeader}>
                    <h2 style={styles.pageTitle}>
                        Quotation Request #{quotation?.id}
                    </h2>

                    <span style={{
                        ...styles.badge,
                        ...getStatusStyle(quotation?.status),
                    }}>
                        {quotation?.status?.charAt(0).toUpperCase() +
                         quotation?.status?.slice(1)}
                    </span>
                </div>

                {actionSuccess && (
                    <div style={styles.success}>{actionSuccess}</div>
                )}

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Customer Information</h3>
                    <div style={styles.infoGrid}>
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
                                <span style={styles.infoValue}>
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
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Appliance List</h3>

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
                            <span style={{ flex: 2 }}>{item.wattage}W</span>
                            <span style={{ flex: 1 }}>×{item.quantity}</span>
                            <span style={{ flex: 2 }}>{item.usage_hours_per_day}h</span>
                            <span style={{ flex: 2 }}>
                                {(item.wattage * item.quantity * item.usage_hours_per_day
                                ).toLocaleString()} Wh
                            </span>
                        </div>
                    ))}
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Computed Solar Requirements</h3>
                    <div style={styles.resultGrid}>
                        <div style={styles.resultBox}>
                            <span style={styles.resultIcon}>⚡</span>
                            <span style={styles.resultLabel}>Total Daily Load</span>
                            <span style={styles.resultValue}>
                                {parseFloat(quotation?.solar_computation?.total_load_watts
                                ).toLocaleString()} Wh
                            </span>
                        </div>

                        <div style={styles.resultBox}>
                            <span style={styles.resultIcon}>☀️</span>
                            <span style={styles.resultLabel}>Panel Capacity</span>
                            <span style={styles.resultValue}>
                                {quotation?.solar_computation?.panel_capacity_kw} kW
                            </span>
                        </div>

                        <div style={styles.resultBox}>
                            <span style={styles.resultIcon}>🔌</span>
                            <span style={styles.resultLabel}>Inverter Size</span>
                            <span style={styles.resultValue}>
                                {quotation?.solar_computation?.inverter_specification}
                            </span>
                        </div>

                        {parseFloat(quotation?.solar_computation?.battery_capacity_ah) > 0 && (
                            <div style={styles.resultBox}>
                                <span style={styles.resultIcon}>🔋</span>
                                <span style={styles.resultLabel}>Battery Capacity</span>
                                <span style={styles.resultValue}>
                                    {parseFloat(quotation?.solar_computation?.battery_capacity_ah
                                    ).toLocaleString()} Ah
                                </span>
                            </div>
                        )}

                        <div style={{ ...styles.resultBox, ...styles.resultBoxFull }}>
                            <span style={styles.resultIcon}>💰</span>
                            <span style={styles.resultLabel}>System Estimated Cost</span>
                            <span style={{ ...styles.resultValue, color: '#16a34a', fontSize: '1.5rem' }}>
                                {formatCurrency(quotation?.solar_computation?.estimated_cost)}
                            </span>
                        </div>
                    </div>
                </div>

                {quotation?.quotation && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Finalized Quotation</h3>
                        <div style={styles.infoGrid}>
                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Adjusted Cost</span>
                                <span style={styles.infoValue}>
                                    {formatCurrency(quotation.quotation.adjusted_cost)}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Labor Fee</span>
                                <span style={styles.infoValue}>
                                    {formatCurrency(quotation.quotation.labor_fee)}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Transportation Fee</span>
                                <span style={styles.infoValue}>
                                    {formatCurrency(quotation.quotation.transportation_fee)}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Total Amount</span>
                                <span style={{
                                    ...styles.infoValue,
                                    color: '#16a34a',
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                }}>
                                    {formatCurrency(quotation.quotation.total_amount)}
                                </span>
                            </div>

                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Approval Date</span>
                                <span style={styles.infoValue}>
                                    {formatDate(quotation.quotation.approval_date)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {quotation?.status === 'rejected' && quotation?.notes && (
                    <div style={{ ...styles.card, borderLeft: '4px solid #dc2626' }}>
                        <h3 style={{ ...styles.cardTitle, color: '#dc2626' }}>
                            Rejection Reason
                        </h3>
                        <p style={{ color: '#374151', margin: 0 }}>{quotation.notes}</p>
                    </div>
                )}

                {quotation?.status === 'pending' && !actionSuccess && (
                    <div style={styles.actionButtons}>
                        {!showApproveForm && !showRejectForm && (
                            <>
                                <button
                                    onClick={() => setShowApproveForm(true)}
                                    style={styles.approveBtn}
                                >
                                    ✓ Approve Quotation
                                </button>

                                <button
                                    onClick={() => setShowRejectForm(true)}
                                    style={styles.rejectBtn}
                                >
                                    ✕ Reject Quotation
                                </button>
                            </>
                        )}

                    

                        {showApproveForm && (
                            <div style={styles.actionForm}>
                                <h3 style={styles.actionFormTitle}>Approve Quotation</h3>
                                <p style={styles.actionFormDesc}>
                                    Review and adjust the costs before approving.
                                    The total amount will be computed automatically.
                                </p>

                                <form onSubmit={handleApprove}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>
                                            Adjusted Base Cost (₱)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={approveForm.adjusted_cost}
                                            onChange={(e) => setApproveForm({
                                                ...approveForm,
                                                adjusted_cost: e.target.value
                                            })}
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
                                            style={styles.input}
                                            placeholder="e.g. 15000"
                                        />
                                    </div>

                                    <div style={styles.field}>
                                        <label style={styles.label}>
                                            Transportation Fee (₱)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={approveForm.transportation_fee}
                                            onChange={(e) => setApproveForm({
                                                ...approveForm,
                                                transportation_fee: e.target.value
                                            })}
                                            style={styles.input}
                                            placeholder="e.g. 5000"
                                        />
                                    </div>

                                    <div style={styles.totalPreview}>
                                        <span style={styles.totalLabel}>Total Amount:</span>
                                        <span style={styles.totalValue}>
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
                                            onClick={() => setShowApproveForm(false)}
                                            style={styles.cancelBtn}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            style={{
                                                ...styles.approveBtn,
                                                opacity: actionLoading ? 0.7 : 1,
                                            }}
                                            {...(actionLoading ? { disabled: true } : {})}
                                        >
                                            {actionLoading ? 'Approving...' : 'Confirm Approval'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showRejectForm && (
                            <div style={{
                                ...styles.actionForm,
                                borderLeft: '4px solid #dc2626'
                            }}>
                                <h3 style={{
                                    ...styles.actionFormTitle,
                                    color: '#dc2626'
                                }}>
                                    Reject Quotation
                                </h3>
                                <p style={styles.actionFormDesc}>
                                    Please provide a reason for rejection so the
                                    customer knows what to fix.
                                </p>

                                <form onSubmit={handleReject}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>
                                            Rejection Reason
                                        </label>
                                        <textarea
                                            value={rejectForm.rejection_reason}
                                            onChange={(e) => setRejectForm({
                                                rejection_reason: e.target.value
                                            })}
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
                                            onClick={() => setShowRejectForm(false)}
                                            style={styles.cancelBtn}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            style={{
                                                ...styles.rejectBtn,
                                                opacity: actionLoading ? 0.7 : 1,
                                            }}
                                            {...(actionLoading ? { disabled: true } : {})}
                                        >
                                            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
                                {quotation?.status === 'approved' && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Supplier Procurement</h3>
                        {quotation?.quotation?.purchaseRequest ? (
                            <div style={styles.success}>
                                ✅ Purchase request has already been generated.
                            </div>
                        ) : prSuccess ? (
                            <div style={styles.success}>
                                ✅ Purchase request generated and sent to supplier.
                            </div>
                        ) : !showPRForm ? (
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    Generate a purchase request to order materials from a supplier
                                    for this installation project.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowPRForm(true);
                                        fetchSuppliers();
                                    }}
                                    style={styles.approveBtn}
                                >
                                    Generate Purchase Request
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleGeneratePR}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Select Supplier</label>
                                    <select
                                        value={selectedSupplier}
                                        onChange={(e) => setSelectedSupplier(e.target.value)}
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
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                    }}>
                                        <span style={{ flex: 3 }}>Material Name</span>
                                        <span style={{ flex: 1 }}>Qty</span>
                                        <span style={{ flex: 1 }}>Unit</span>
                                        <span style={{ flex: 2 }}>Unit Price (₱)</span>
                                        <span style={{ flex: 1 }}></span>
                                    </div>

                                    {materials.map((material) => (
                                        <div key={material.id} style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            marginBottom: '0.5rem',
                                            alignItems: 'center',
                                        }}>
                                            <input
                                                type="text"
                                                value={material.material_name}
                                                onChange={(e) => handleMaterialChange(
                                                    material.id, 'material_name', e.target.value
                                                )}
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
                                                style={{ ...styles.input, flex: 1 }}
                                                required
                                            />
                                            <input
                                                type="text"
                                                value={material.unit}
                                                onChange={(e) => handleMaterialChange(
                                                    material.id, 'unit', e.target.value
                                                )}
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
                                                style={{ ...styles.input, flex: 2 }}
                                                placeholder="Optional"
                                            />
                                            {materials.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMaterial(material.id)}
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: '#fef2f2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '6px',
                                                        padding: '0.5rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addMaterial}
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: '#16a34a',
                                            border: '1px dashed #16a34a',
                                            borderRadius: '8px',
                                            padding: '0.625rem 1rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            width: '100%',
                                            marginTop: '0.5rem',
                                        }}
                                    >
                                        + Add Material
                                    </button>
                                </div>

                                <div style={styles.formActions}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPRForm(false)}
                                        style={styles.cancelBtn}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            ...styles.approveBtn,
                                            opacity: prLoading ? 0.7 : 1,
                                            cursor: prLoading ? 'not-allowed' : 'pointer',
                                        }}
                                        {...(prLoading ? { disabled: true } : {})}
                                    >
                                        {prLoading ? 'Generating...' : 'Generate Purchase Request'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
                            {/* Installation Schedule Section */}
                {/* Only show this section if the quotation is approved */}
                {quotation?.status === 'approved' && (
                    <div style={styles.card}>
                        {/* Section title */}
                        <h3 style={styles.cardTitle}>Installation Schedule</h3>

                        {/* Show existing schedule if it already exists */}
                        {quotation?.quotation?.installationSchedule ? (
                            <div>
                                {/* Success message */}
                                <div style={styles.success}>
                                    ✅ Installation has been scheduled.
                                </div>

                                {/* Schedule details */}
                                <div style={styles.infoGrid}>
                                    {/* Scheduled date */}
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>Scheduled Date</span>
                                        <span style={styles.infoValue}>
                                            {formatDate(quotation.quotation.installationSchedule.scheduled_date)}
                                        </span>
                                    </div>

                                    {/* Assigned technician */}
                                    <div style={styles.infoItem}>
                                        <span style={styles.infoLabel}>Assigned Technician</span>
                                        <span style={styles.infoValue}>
                                            {quotation.quotation.installationSchedule.assigned_technician}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : scheduleSuccess ? (
                            // Show success message after creating schedule
                            <div style={styles.success}>
                                ✅ Installation schedule created successfully.
                            </div>
                        ) : !showScheduleForm ? (
                            // Show the create schedule button if the form is hidden
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    Set the installation date and assign a technician for this project.
                                    This is only available after the supplier confirms all materials.
                                </p>

                                {/* Button to show the schedule form */}
                                <button
                                    onClick={() => setShowScheduleForm(true)}
                                    style={styles.approveBtn}
                                >
                                    Set Installation Schedule
                                </button>
                            </div>
                        ) : (
                            // Show the schedule form
                            <form onSubmit={handleCreateSchedule}>

                                {/* Scheduled date input */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Installation Date</label>
                                    <input
                                        type="date"
                                        // The currently entered date
                                        value={scheduleForm.scheduled_date}
                                        // Update the date when the admin picks one
                                        onChange={(e) => setScheduleForm({
                                            ...scheduleForm,
                                            scheduled_date: e.target.value,
                                        })}
                                        style={styles.input}
                                        // Date must be in the future
                                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                        required
                                    />
                                </div>

                                {/* Assigned technician input */}
                                <div style={styles.field}>
                                    <label style={styles.label}>Assigned Technician</label>
                                    <input
                                        type="text"
                                        // The currently entered technician name
                                        value={scheduleForm.assigned_technician}
                                        // Update the technician name when the admin types
                                        onChange={(e) => setScheduleForm({
                                            ...scheduleForm,
                                            assigned_technician: e.target.value,
                                        })}
                                        style={styles.input}
                                        placeholder="e.g. Juan Santos"
                                        required
                                    />
                                </div>

                                {/* Form action buttons */}
                                <div style={styles.formActions}>
                                    {/* Cancel button — hides the form */}
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleForm(false)}
                                        style={styles.cancelBtn}
                                    >
                                        Cancel
                                    </button>

                                    {/* Submit button */}
                                    <button
                                        type="submit"
                                        style={{
                                            ...styles.approveBtn,
                                            // Make the button look faded when loading
                                            opacity: scheduleLoading ? 0.7 : 1,
                                            cursor: scheduleLoading ? 'not-allowed' : 'pointer',
                                        }}
                                        // Disable the button while loading
                                        {...(scheduleLoading ? { disabled: true } : {})}
                                    >
                                        {/* Change button text based on loading state */}
                                        {scheduleLoading ? 'Saving...' : 'Confirm Schedule'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div> 
        </div> 
    );
}



const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    navbar: {
        backgroundColor: '#16a34a',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    content: {
        width: '100%',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    backBtn: {
        backgroundColor: 'transparent',
        color: '#16a34a',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        padding: '0',
        marginBottom: '1rem',
        fontWeight: '500',
    },
    pageHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        margin: 0,
    },
    badge: {
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    success: {
        backgroundColor: '#dcfce7',
        color: '#16a34a',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    cardTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
        marginBottom: '1rem',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    infoLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    infoValue: {
        fontSize: '1rem',
        color: '#111827',
        fontWeight: '500',
    },
    tableHeader: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '600',
        textTransform: 'uppercase',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid #e5e7eb',
    },
    tableRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem',
        color: '#374151',
    },
    resultGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginTop: '1rem',
    },
    resultBox: {
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    resultBoxFull: {
        gridColumn: '1 / -1',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
    },
    resultIcon: {
        fontSize: '1.5rem',
    },
    resultLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    resultValue: {
        fontSize: '1.25rem',
        color: '#111827',
        fontWeight: '700',
    },
    actionButtons: {
        marginBottom: '1.5rem',
    },
    approveBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        marginRight: '1rem',
    },
    rejectBtn: {
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
    actionForm: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        marginTop: '1rem',
    },
    actionFormTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
        marginBottom: '0.5rem',
    },
    actionFormDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1rem',
    },
    field: {
        marginBottom: '1rem',
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
    totalPreview: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
    },
    totalLabel: {
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '600',
    },
    totalValue: {
        fontSize: '1.25rem',
        color: '#16a34a',
        fontWeight: '700',
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
    },
    cancelBtn: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
    },
};