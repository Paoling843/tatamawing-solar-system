import { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import api from "../api/axios";
import { CheckIcon, BoltIcon, SunIcon, PlugIcon, BatteryIcon, DollarSignIcon } from '../components/Icons';

export default function QuotationResultPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const {quotationRequest, computation } = location.state || {};
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!quotationRequest || !computation) {
        navigate('/quotation/new');
        return null;
    }

    const handleSubmit = async () => {
        setError('');
        setSubmitLoading(true);

        try {
            await api.patch(`/quotation-requests/${quotationRequest.id}/submit`);

            setSubmitSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit the quotation. Please try again.')
        } finally {
            setSubmitLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <CustomerLayout active="Request Quotation">

            {/* Page title */}
            <h1 style={styles.pageTitle}>Your Solar Quotation Estimate</h1>
            <p style={styles.pageSubtitle}>
                Based on your appliance data, here are the estimated solar system requirements.
            </p>

            {/* Show success message if quotation was submitted */}
            {submitSuccess && (
                <div style={{ ...styles.success, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckIcon size={16} color="#1a4a3a" />
                    <span>
                        Your quotation has been submitted for admin review.
                        You will be notified once it has been approved.
                    </span>
                </div>
            )}

            {/* Show error message if submission failed */}
            {error && <div style={styles.error}>{error}</div>}

            {/* System type and status badge */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>Quotation Summary</h3>

                    {/* Status badge — shows current status of the quotation */}
                    <span style={{
                        ...styles.badge,
                        // Green for approved, yellow for pending, grey for draft
                        backgroundColor:
                            quotationRequest.status === 'approved' ? '#dcfce7' :
                            quotationRequest.status === 'pending' ? '#fef9c3' : '#f3f4f6',
                        color:
                            quotationRequest.status === 'approved' ? '#16a34a' :
                            quotationRequest.status === 'pending' ? '#ca8a04' : '#6b7280',
                    }}>
                        {/* Capitalize the first letter of the status */}
                        {quotationRequest.status.charAt(0).toUpperCase() + quotationRequest.status.slice(1)}
                    </span>
                </div>

                {/* Two-column info grid */}
                <div style={styles.infoGrid}>
                    {/* Solar system type */}
                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>System Type</span>
                        {/* Capitalize and format the system type */}
                        <span style={styles.infoValue}>
                            {quotationRequest.solar_system_type.charAt(0).toUpperCase() +
                             quotationRequest.solar_system_type.slice(1).replace('-', '-')}
                        </span>
                    </div>

                    {/* Monthly bill if provided */}
                    {quotationRequest.monthly_bill && (
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Monthly Bill</span>
                            <span style={styles.infoValue}>
                                {formatCurrency(quotationRequest.monthly_bill)}
                            </span>
                        </div>
                    )}

                    {/* Submission date */}
                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Date Submitted</span>
                        <span style={styles.infoValue}>
                            {/* Format the date to a readable format */}
                            {new Date(quotationRequest.submission_date).toLocaleDateString('en-PH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Solar computation results */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Computed Solar Requirements</h3>

                {/* Four result boxes in a grid */}
                <div style={styles.resultGrid}>

                    {/* Total daily load */}
                    <div style={styles.resultBox}>
                        {/* Icon for visual appeal */}
                        <span style={styles.resultIcon}><BoltIcon size={24} color="#1a4a3a" /></span>
                        <span style={styles.resultLabel}>Total Daily Load</span>
                        <span style={styles.resultValue}>
                            {parseFloat(computation.total_load_watts).toLocaleString()} Wh
                        </span>
                    </div>

                    {/* Panel capacity */}
                    <div style={styles.resultBox}>
                        <span style={styles.resultIcon}><SunIcon size={24} color="#1a4a3a" /></span>
                        <span style={styles.resultLabel}>Panel Capacity</span>
                        <span style={styles.resultValue}>
                            {computation.panel_capacity_kw} kW
                        </span>
                    </div>

                    {/* Inverter specification */}
                    <div style={styles.resultBox}>
                        <span style={styles.resultIcon}><PlugIcon size={24} color="#1a4a3a" /></span>
                        <span style={styles.resultLabel}>Inverter Size</span>
                        <span style={styles.resultValue}>
                            {computation.inverter_specification}
                        </span>
                    </div>

                    {/* Battery capacity — only show for off-grid and hybrid */}
                    {parseFloat(computation.battery_capacity_ah) > 0 && (
                        <div style={styles.resultBox}>
                            <span style={styles.resultIcon}><BatteryIcon size={24} color="#1a4a3a" /></span>
                            <span style={styles.resultLabel}>Battery Capacity</span>
                            <span style={styles.resultValue}>
                                {parseFloat(computation.battery_capacity_ah).toLocaleString()} Ah
                            </span>
                        </div>
                    )}

                    {/* Estimated cost — spans full width since it's the most important */}
                    <div style={{ ...styles.resultBox, ...styles.resultBoxFull }}>
                        <span style={styles.resultIcon}><DollarSignIcon size={24} color="#1a4a3a" /></span>
                        <span style={styles.resultLabel}>Estimated Cost</span>
                        <span style={{ ...styles.resultValue, ...styles.resultValueLarge }}>
                            {formatCurrency(computation.estimated_cost)}
                        </span>
                        <span style={styles.resultNote}>
                            *This is a preliminary estimate. Final cost may vary after admin review.
                        </span>
                    </div>
                </div>
            </div>

            {/* Appliance list — shows what was submitted */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Appliance List</h3>

                {/* Table header */}
                <div style={styles.applianceHeader}>
                    <span style={{ flex: 3 }}>Appliance</span>
                    <span style={{ flex: 2 }}>Wattage</span>
                    <span style={{ flex: 1 }}>Qty</span>
                    <span style={{ flex: 2 }}>Hours/Day</span>
                    <span style={{ flex: 2 }}>Daily Usage</span>
                </div>

                {/* One row per appliance */}
                {quotationRequest.appliance_items.map((item) => (
                    <div key={item.id} style={styles.applianceRow}>
                        {/* Appliance name */}
                        <span style={{ flex: 3 }}>{item.appliance_name}</span>
                        {/* Wattage */}
                        <span style={{ flex: 2 }}>{item.wattage}W</span>
                        {/* Quantity */}
                        <span style={{ flex: 1 }}>×{item.quantity}</span>
                        {/* Hours per day */}
                        <span style={{ flex: 2 }}>{item.usage_hours_per_day}h</span>
                        {/* Computed daily usage for this appliance */}
                        <span style={{ flex: 2 }}>
                            {(item.wattage * item.quantity * item.usage_hours_per_day).toLocaleString()} Wh
                        </span>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div style={styles.actions}>
                {/* Back button — only show if not yet submitted */}
                {!submitSuccess && (
                    <button
                        type="button"
                        // Go back to the form to make changes
                        onClick={() => navigate('/quotation/new')}
                        style={styles.backBtn}
                    >
                        ← Revise Appliances
                    </button>
                )}

                {/* Submit for review button — only show if not yet submitted */}
                {!submitSuccess && (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        style={{
                            ...styles.submitBtn,
                            // Dim when loading
                            opacity: submitLoading ? 0.7 : 1,
                            cursor: submitLoading ? 'not-allowed' : 'pointer',
                        }}
                        {...(submitLoading ? { disabled: true } : {})}
                    >
                        {submitLoading ? 'Submitting...' : 'Submit for Admin Review'}
                    </button>
                )}

                {/* New quotation button — only show after successful submission */}
                {submitSuccess && (
                    <button
                        type="button"
                        onClick={() => navigate('/quotation/new')}
                        style={styles.submitBtn}
                    >
                        Submit Another Quotation
                    </button>
                )}
            </div>
        </CustomerLayout>
    );
}

// Styles object
const styles = {
    // Page heading
    pageTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '0.25rem',
        marginTop: 0,
    },
    // Page description
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Success box
    success: {
        backgroundColor: '#f0f7f4',
        color: '#1a4a3a',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
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
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    // Card header row with title and badge
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    // Card title
    cardTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    // Status badge pill
    badge: {
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
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
    // Info label (grey small text)
    infoLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    // Info value (larger dark text)
    infoValue: {
        fontSize: '1rem',
        color: '#111827',
        fontWeight: '500',
    },
    // Grid for the result boxes
    resultGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginTop: '1rem',
    },
    // Individual result box
    resultBox: {
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    // Full width result box (for estimated cost)
    resultBoxFull: {
        gridColumn: '1 / -1',
        backgroundColor: '#f0f7f4',
        border: '1px solid #dbe7e1',
    },
    // Icon in result box
    resultIcon: {
        fontSize: '1.5rem',
    },
    // Label in result box
    resultLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    // Value in result box
    resultValue: {
        fontSize: '1.25rem',
        color: '#111827',
        fontWeight: '700',
    },
    // Larger value for the cost box
    resultValueLarge: {
        fontSize: '1.75rem',
        color: '#1a4a3a',
    },
    // Small note below the cost
    resultNote: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '0.25rem',
    },
    // Appliance table header
    applianceHeader: {
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
    // Each appliance data row
    applianceRow: {
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem',
        color: '#374151',
    },
    // Bottom action buttons row
    actions: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    // Grey back/revise button
    backBtn: {
        flex: 1,
        padding: '0.75rem',
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '10px',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    // Primary submit button
    submitBtn: {
        flex: 2,
        padding: '0.75rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
    },
};
