import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState from '../components/LoadingState';
import { DownloadIcon } from '../components/Icons';
import api from '../api/axios';
import { colors, typography } from '../styles/theme';

export default function AdminPurchaseRequestDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [purchaseRequest, setPurchaseRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [actionLoading, setActionLoading] = useState(false);
    const [actionSuccess, setActionSuccess] = useState('');

    // items holds the editable list of material items — a separate state
    // so admin can edit availability/price before saving
    const [items, setItems] = useState([]);
    const [confirmStatus, setConfirmStatus] = useState('');

    const [downloading, setDownloading] = useState(false);

    const fetchPurchaseRequest = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get(`/admin/purchase-requests/${id}`);
            setPurchaseRequest(res.data);

            setItems(res.data.material_items.map((item) => ({
                id: item.id,
                material_name: item.material_name,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price || '',
                availability: item.availability,
            })));

            setConfirmStatus(res.data.procurement_status);
        } catch (err) {
            setError('Failed to load purchase request details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchPurchaseRequest);
    }, [fetchPurchaseRequest]);

    const handleItemChange = (itemId, field, value) => {
        setItems(items.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const handleUpdateItems = async () => {
        setActionLoading(true);
        setError('');
        setActionSuccess('');

        try {
            await api.patch(`/admin/purchase-requests/${id}/update-items`, {
                items: items.map((item) => ({
                    id: item.id,
                    availability: item.availability,
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
                })),
            });

            setActionSuccess('Material items updated successfully.');
            fetchPurchaseRequest();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update items.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirm = async () => {
        setActionLoading(true);
        setError('');
        setActionSuccess('');

        try {
            await api.patch(`/admin/purchase-requests/${id}/confirm`, {
                procurement_status: confirmStatus,
            });

            setActionSuccess('Procurement status updated successfully.');
            fetchPurchaseRequest();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update status.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        setDownloading(true);
        setError('');

        try {
            const res = await api.get(`/admin/reports/purchase-request/${id}`, {
                responseType: 'blob',
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `purchase-request-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setError('Failed to download the PDF.');
        } finally {
            setDownloading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getAvailabilityStyle = (availability) => {
        const styles = {
            available: { backgroundColor: '#dcfce7', color: '#16a34a' },
            limited: { backgroundColor: '#ffedd5', color: '#ea580c' },
            out_of_stock: { backgroundColor: '#fef2f2', color: '#dc2626' },
        };
        return styles[availability] || styles.available;
    };

    if (loading) {
        return (
            <AdminLayout active="Purchase Request">
                <LoadingState label="Loading purchase request details..." />
            </AdminLayout>
        );
    }

    if (error && !purchaseRequest) {
        return (
            <AdminLayout active="Purchase Request">
                <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>
                    {error}
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout active="Purchase Request">

            <button
                onClick={() => navigate('/admin/purchase-requests')}
                style={styles.backBtn}
            >
                ← Back to Purchase Requests
            </button>

            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>
                    Purchase Request #{purchaseRequest?.id}
                </h1>
                <button
                    className="btn-secondary"
                    style={styles.pdfBtn}
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                >
                    <DownloadIcon size={14} color="currentColor" />
                    <span>{downloading ? 'Preparing PDF...' : 'Download PDF for Supplier'}</span>
                </button>
            </div>

            {actionSuccess && <div style={styles.success}>{actionSuccess}</div>}
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Project Information</h3>
                <div className="responsive-grid-2" style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Customer</span>
                        <span style={styles.infoValue}>
                            {purchaseRequest?.quotation?.quotation_request?.customer?.user?.name}
                        </span>
                    </div>

                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>System Type</span>
                        <span style={styles.infoValue}>
                            {purchaseRequest?.quotation?.quotation_request?.solar_system_type
                                ?.charAt(0).toUpperCase() +
                             purchaseRequest?.quotation?.quotation_request?.solar_system_type
                                ?.slice(1)}
                        </span>
                    </div>

                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Request Date</span>
                        <span style={styles.infoValue}>
                            {formatDate(purchaseRequest?.request_date)}
                        </span>
                    </div>

                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Current Status</span>
                        <span style={styles.infoValue}>
                            {purchaseRequest?.procurement_status
                                ?.split('_')
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Material Items</h3>
                <p style={styles.cardDesc}>
                    Update the availability and unit price once you hear back from the supplier.
                </p>

                <div className="table-scroll">
                <div>
                <div style={styles.itemHeader}>
                    <span style={{ flex: 3 }}>Material</span>
                    <span style={{ flex: 1 }}>Qty</span>
                    <span style={{ flex: 1 }}>Unit</span>
                    <span style={{ flex: 2 }}>Unit Price (₱)</span>
                    <span style={{ flex: 2 }}>Availability</span>
                </div>

                {items.map((item) => (
                    <div key={item.id} style={styles.itemRow}>
                        <span style={{ flex: 3 }}>{item.material_name}</span>
                        <span style={{ flex: 1 }}>{item.quantity}</span>
                        <span style={{ flex: 1 }}>{item.unit || '—'}</span>

                        <span style={{ flex: 2 }}>
                            <input
                                type="number"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(
                                    item.id, 'unit_price', e.target.value
                                )}
                                className="input-field"
                                style={styles.itemInput}
                                placeholder="Enter price"
                            />
                        </span>

                        <span style={{ flex: 2 }}>
                            <select
                                value={item.availability}
                                onChange={(e) => handleItemChange(
                                    item.id, 'availability', e.target.value
                                )}
                                className="input-field"
                                style={{
                                    ...styles.itemInput,
                                    ...getAvailabilityStyle(item.availability),
                                }}
                            >
                                <option value="available">Available</option>
                                <option value="limited">Limited</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </span>
                    </div>
                ))}
                </div>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleUpdateItems}
                    style={{
                        ...styles.saveBtn,
                        opacity: actionLoading ? 0.7 : 1,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                    {...(actionLoading ? { disabled: true } : {})}
                >
                    {actionLoading ? 'Saving...' : 'Save Item Updates'}
                </button>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Confirm Overall Status</h3>
                <p style={styles.cardDesc}>
                    Set the overall procurement status based on the supplier's reply.
                </p>

                <div style={styles.field}>
                    <label style={styles.label}>Overall Procurement Status</label>
                    <select
                        value={confirmStatus}
                        onChange={(e) => setConfirmStatus(e.target.value)}
                        className="input-field"
                        style={styles.select}
                    >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed — All materials available</option>
                        <option value="partially_available">Partially Available — Some items missing</option>
                        <option value="unavailable">Unavailable — Cannot fulfill request</option>
                    </select>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleConfirm}
                    style={{
                        ...styles.confirmBtn,
                        opacity: actionLoading ? 0.7 : 1,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                    }}
                    {...(actionLoading ? { disabled: true } : {})}
                >
                    {actionLoading ? 'Updating...' : 'Confirm Status'}
                </button>
            </div>
        </AdminLayout>
    );
}

const styles = {
    backBtn: {
        backgroundColor: 'transparent',
        color: colors.primary,
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        padding: '0',
        marginBottom: '1rem',
        fontWeight: '500',
    },
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    pageTitle: {
        ...typography.h1,
        margin: 0,
    },
    pdfBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        whiteSpace: 'nowrap',
    },
    success: {
        backgroundColor: colors.primaryTint,
        color: colors.primary,
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    cardTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#111827',
        marginTop: 0,
        marginBottom: '0.5rem',
    },
    cardDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1rem',
    },
    infoGrid: {
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
    itemHeader: {
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
    itemRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f3f4f6',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#374151',
    },
    itemInput: {
        width: '100%',
        padding: '0.375rem 0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        boxSizing: 'border-box',
    },
    saveBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: '600',
        marginTop: '1rem',
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
    select: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
    },
};
