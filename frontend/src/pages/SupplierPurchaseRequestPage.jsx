// Import useState and useEffect for managing data and side effects
import { useState, useEffect } from 'react';

// Import useParams to get the purchase request ID from the URL
// Import useNavigate to redirect back to dashboard
import { useParams, useNavigate } from 'react-router-dom';

// Import useAuth to access the logged-in supplier's info
import { useAuth } from '../context/AuthContext';

// Import our custom axios instance for API requests
import api from '../api/axios';

export default function SupplierPurchaseRequestPage() {
    // Get the logged-in user and logout function
    const { user, logout } = useAuth();

    // useParams extracts the :id from the URL
    const { id } = useParams();

    // useNavigate lets us redirect programmatically
    const navigate = useNavigate();

    // purchaseRequest holds the full data fetched from the API
    const [purchaseRequest, setPurchaseRequest] = useState(null);

    // loading tracks whether we're fetching data
    const [loading, setLoading] = useState(true);

    // error holds any error message
    const [error, setError] = useState('');

    // actionLoading tracks whether confirm/update is in progress
    const [actionLoading, setActionLoading] = useState(false);

    // actionSuccess holds the success message after an action
    const [actionSuccess, setActionSuccess] = useState('');

    // items holds the editable list of material items
    // We use a separate state so the supplier can edit
    // availability and unit price before saving
    const [items, setItems] = useState([]);

    // confirmStatus holds the selected overall procurement status
    const [confirmStatus, setConfirmStatus] = useState('');

    // Fetch purchase request when component mounts
    useEffect(() => {
        fetchPurchaseRequest();
    }, [id]);

    // fetchPurchaseRequest fetches the full purchase request details
    const fetchPurchaseRequest = async () => {
        // Show loading state
        setLoading(true);
        // Clear previous errors
        setError('');

        try {
            // Get all purchase requests and find the one matching our ID
            // We use the supplier index endpoint since there's no single show endpoint
            const res = await api.get('/supplier/purchase-requests');

            // Find the purchase request matching the ID from the URL
            const found = res.data.find((pr) => pr.id === parseInt(id));

            // If not found, show error
            if (!found) {
                setError('Purchase request not found.');
                return;
            }

            // Save the purchase request to state
            setPurchaseRequest(found);

            // Initialize the items state with the material items
            // so the supplier can edit them
            setItems(found.material_items.map((item) => ({
                // Keep the item id for the update request
                id: item.id,
                // Material name for display
                material_name: item.material_name,
                // Quantity for display
                quantity: item.quantity,
                // Unit for display
                unit: item.unit,
                // Unit price — editable by supplier
                unit_price: item.unit_price || '',
                // Availability — editable by supplier
                availability: item.availability,
            })));

            // Set the current confirm status
            setConfirmStatus(found.procurement_status);
        } catch (err) {
            // Show error if fetch fails
            setError('Failed to load purchase request details.');
        } finally {
            // Always stop loading
            setLoading(false);
        }
    };

    // handleItemChange updates a specific field in a specific item
    const handleItemChange = (itemId, field, value) => {
        // Map through items and update only the matching one
        setItems(items.map((item) =>
            // If this is the item to update, override the changed field
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    // handleUpdateItems sends the updated items to the API
    const handleUpdateItems = async () => {
        // Show loading state
        setActionLoading(true);
        // Clear previous messages
        setError('');
        setActionSuccess('');

        try {
            // Send PATCH request with updated item data
            await api.patch(`/supplier/purchase-requests/${id}/update-items`, {
                // Map items to only send the fields the API expects
                items: items.map((item) => ({
                    // Item ID for the API to identify which item to update
                    id: item.id,
                    // Updated availability status
                    availability: item.availability,
                    // Updated unit price — convert to float or null if empty
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
                })),
            });

            // Show success message
            setActionSuccess('Material items updated successfully.');

            // Re-fetch to show updated data
            fetchPurchaseRequest();
        } catch (err) {
            // Show error from API or fallback
            setError(err.response?.data?.message || 'Failed to update items.');
        } finally {
            setActionLoading(false);
        }
    };

    // handleConfirm sends the overall procurement status to the API
    const handleConfirm = async () => {
        // Show loading state
        setActionLoading(true);
        // Clear previous messages
        setError('');
        setActionSuccess('');

        try {
            // Send PATCH request with the selected procurement status
            await api.patch(`/supplier/purchase-requests/${id}/confirm`, {
                // The overall procurement status selected by the supplier
                procurement_status: confirmStatus,
            });

            // Show success message
            setActionSuccess('Procurement status updated successfully.');

            // Re-fetch to show updated data
            fetchPurchaseRequest();
        } catch (err) {
            // Show error from API or fallback
            setError(err.response?.data?.message || 'Failed to update status.');
        } finally {
            setActionLoading(false);
        }
    };

    // handleLogout logs the supplier out
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // formatDate formats an ISO date string to readable format
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // getAvailabilityStyle returns badge colors based on availability
    const getAvailabilityStyle = (availability) => {
        const styles = {
            // Green for available
            available: { backgroundColor: '#dcfce7', color: '#16a34a' },
            // Orange for limited
            limited: { backgroundColor: '#ffedd5', color: '#ea580c' },
            // Red for out of stock
            out_of_stock: { backgroundColor: '#fef2f2', color: '#dc2626' },
        };
        return styles[availability] || styles.available;
    };

    // Show loading state while fetching
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.navbar}>
                    <h1 style={styles.navTitle}>TataMawing Solar</h1>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    Loading purchase request details...
                </div>
            </div>
        );
    }

    // Show error state if fetch failed
    if (error && !purchaseRequest) {
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
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    <span style={styles.navRole}>Supplier</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.content}>

                {/* Back button */}
                <button
                    onClick={() => navigate('/supplier/dashboard')}
                    style={styles.backBtn}
                >
                    ← Back to Dashboard
                </button>

                {/* Page title */}
                <h2 style={styles.pageTitle}>
                    Purchase Request #{purchaseRequest?.id}
                </h2>

                {/* Show success message */}
                {actionSuccess && (
                    <div style={styles.success}>{actionSuccess}</div>
                )}

                {/* Show error message */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Project info card */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Project Information</h3>
                    <div style={styles.infoGrid}>

                        {/* Customer name */}
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Customer</span>
                            <span style={styles.infoValue}>
                                {purchaseRequest?.quotation?.quotation_request?.customer?.user?.name}
                            </span>
                        </div>

                        {/* Solar system type */}
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>System Type</span>
                            <span style={styles.infoValue}>
                                {purchaseRequest?.quotation?.quotation_request?.solar_system_type
                                    ?.charAt(0).toUpperCase() +
                                 purchaseRequest?.quotation?.quotation_request?.solar_system_type
                                    ?.slice(1)}
                            </span>
                        </div>

                        {/* Request date */}
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Request Date</span>
                            <span style={styles.infoValue}>
                                {formatDate(purchaseRequest?.request_date)}
                            </span>
                        </div>

                        {/* Current procurement status */}
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

                {/* Material items card — editable by supplier */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Material Items</h3>
                    <p style={styles.cardDesc}>
                        Update the availability and unit price for each material item.
                    </p>

                    {/* Column headers */}
                    <div style={styles.itemHeader}>
                        <span style={{ flex: 3 }}>Material</span>
                        <span style={{ flex: 1 }}>Qty</span>
                        <span style={{ flex: 1 }}>Unit</span>
                        <span style={{ flex: 2 }}>Unit Price (₱)</span>
                        <span style={{ flex: 2 }}>Availability</span>
                    </div>

                    {/* One row per material item */}
                    {items.map((item) => (
                        <div key={item.id} style={styles.itemRow}>

                            {/* Material name — read only */}
                            <span style={{ flex: 3 }}>{item.material_name}</span>

                            {/* Quantity — read only */}
                            <span style={{ flex: 1 }}>{item.quantity}</span>

                            {/* Unit — read only */}
                            <span style={{ flex: 1 }}>{item.unit || '—'}</span>

                            {/* Unit price — editable */}
                            <span style={{ flex: 2 }}>
                                <input
                                    type="number"
                                    min="0"
                                    // Current unit price value
                                    value={item.unit_price}
                                    // Update this item's unit price when changed
                                    onChange={(e) => handleItemChange(
                                        item.id, 'unit_price', e.target.value
                                    )}
                                    style={styles.itemInput}
                                    placeholder="Enter price"
                                />
                            </span>

                            {/* Availability — editable dropdown */}
                            <span style={{ flex: 2 }}>
                                <select
                                    // Current availability value
                                    value={item.availability}
                                    // Update this item's availability when changed
                                    onChange={(e) => handleItemChange(
                                        item.id, 'availability', e.target.value
                                    )}
                                    style={{
                                        ...styles.itemInput,
                                        // Apply color based on availability
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

                    {/* Save items button */}
                    <button
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

                {/* Overall status confirmation card */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Confirm Overall Status</h3>
                    <p style={styles.cardDesc}>
                        Set the overall procurement status based on material availability.
                    </p>

                    {/* Status selector */}
                    <div style={styles.field}>
                        <label style={styles.label}>Overall Procurement Status</label>
                        <select
                            // Current confirm status value
                            value={confirmStatus}
                            // Update confirm status when changed
                            onChange={(e) => setConfirmStatus(e.target.value)}
                            style={styles.select}
                        >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed — All materials available</option>
                            <option value="partially_available">Partially Available — Some items missing</option>
                            <option value="unavailable">Unavailable — Cannot fulfill request</option>
                        </select>
                    </div>

                    {/* Confirm button */}
                    <button
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
            </div>
        </div>
    );
}

// Styles
const styles = {
    // Full page light green background
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    // Green navbar
    navbar: {
        backgroundColor: '#16a34a',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // White app name
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    // Right side of navbar
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    // Supplier role badge
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    // White username text
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Transparent logout button
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Full width content area
    content: {
        width: '100%',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    // Back button
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
    // Page heading
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '1.5rem',
    },
    // Green success box
    success: {
        backgroundColor: '#dcfce7',
        color: '#16a34a',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // White card sections
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // Card title
    cardTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
        marginBottom: '0.5rem',
    },
    // Card description
    cardDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1rem',
    },
    // Two column info grid
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
    },
    // Each info item
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    // Info label
    infoLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    // Info value
    infoValue: {
        fontSize: '1rem',
        color: '#111827',
        fontWeight: '500',
    },
    // Material items header row
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
    // Each material item row
    itemRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f3f4f6',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#374151',
    },
    // Editable input inside item row
    itemInput: {
        width: '100%',
        padding: '0.375rem 0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        boxSizing: 'border-box',
    },
    // Save items button
    saveBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        marginTop: '1rem',
    },
    // Field wrapper
    field: {
        marginBottom: '1rem',
    },
    // Label above select
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    // Overall status select
    select: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    // Confirm status button
    confirmBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
    },
};