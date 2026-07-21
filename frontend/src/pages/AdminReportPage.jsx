import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminReportPage () {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [loading, setLoading] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchApprovedQuotations();
    }, []);

    const fetchApprovedQuotations = async () => {
        try {
            const res = await api.get('/admin/quotation-requests?status=approved');
            setQuotations(res.data);
        } catch (err) {
            setError('Failed to load quotations.');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const downloadReport = async (reportType) => {
        setError('');
        setLoading(reportType);

        try {
            let url = '';
            let filename = '';

            if (reportType === 'quotation-history') {
                url = '/admin/reports/quotation-history';
                filename = 'quotation-history-report.pdf';

            } else if (reportType === 'quotation-material') {
                url = '/admin/reports/quotation-material';
                filename = 'quotation-material-report.pdf';

            } else if (reportType === 'procurement') {
                url = '/admin/reports/procurement';
                filename = 'procurement-report.pdf';

            } else if (reportType === 'quotation') {
                if (!selectedQuotationId) {
                    setError('Please select a quotation first.');
                    setLoading('');
                    return;
                }
                url = `/admin/reports/quotation/${selectedQuotationId}`;
                filename = `quotation-report-${selectedQuotationId}.pdf`;
            }

            const res = await api.get(url, {
                responseType: 'blob',
            });

            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            
            const link = document.createElement('a');

            link.href = blobUrl;

            link.setAttribute('download', filename);

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

        } catch (err) {
            setError('Failed to generate report. Please try again.');
        } finally {
            setLoading('');
        }
    };

    return (
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* Link to quotations dashboard */}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        style={styles.navBtn}
                    >
                        📋 Quotations
                    </button>
                    {/* Link to messages */}
                    <button
                        onClick={() => navigate('/admin/inbox')}
                        style={styles.navBtn}
                    >
                        💬 Messages
                    </button>
                    {/* Link to FAQ management */}
                    <button
                        onClick={() => navigate('/admin/faqs')}
                        style={styles.navBtn}
                    >
                        ❓ FAQs
                    </button>
                    <span style={styles.navRole}>Admin</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.content}>

                {/* Page header */}
                <h2 style={styles.pageTitle}>Report Generation</h2>
                <p style={styles.pageSubtitle}>
                    Download system reports in PDF format.
                </p>

                {/* Error message */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Report cards grid */}
                <div style={styles.reportsGrid}>

                    {/* Report 1 — Quotation History */}
                    <div style={styles.reportCard}>
                        {/* Report icon */}
                        <div style={styles.reportIcon}>📊</div>

                        {/* Report title */}
                        <h3 style={styles.reportTitle}>Quotation History Report</h3>

                        {/* Report description */}
                        <p style={styles.reportDesc}>
                            Shows all quotation requests with their statuses,
                            estimated costs, and final approved amounts.
                        </p>

                        {/* Download button */}
                        <button
                            onClick={() => downloadReport('quotation-history')}
                            style={{
                                ...styles.downloadBtn,
                                // Dim while loading
                                opacity: loading === 'quotation-history' ? 0.7 : 1,
                                cursor: loading === 'quotation-history'
                                    ? 'not-allowed' : 'pointer',
                            }}
                            disabled={loading === 'quotation-history'}
                        >
                            {loading === 'quotation-history'
                                ? '⏳ Generating...'
                                : '⬇ Download PDF'}
                        </button>
                    </div>

                    {/* Report 2 — Quotation Material */}
                    <div style={styles.reportCard}>
                        <div style={styles.reportIcon}>🔧</div>
                        <h3 style={styles.reportTitle}>Quotation Material Report</h3>
                        <p style={styles.reportDesc}>
                            Shows all materials required per project including
                            quantities, unit prices, and availability status.
                        </p>
                        <button
                            onClick={() => downloadReport('quotation-material')}
                            style={{
                                ...styles.downloadBtn,
                                opacity: loading === 'quotation-material' ? 0.7 : 1,
                                cursor: loading === 'quotation-material'
                                    ? 'not-allowed' : 'pointer',
                            }}
                            disabled={loading === 'quotation-material'}
                        >
                            {loading === 'quotation-material'
                                ? '⏳ Generating...'
                                : '⬇ Download PDF'}
                        </button>
                    </div>

                    {/* Report 3 — Procurement */}
                    <div style={styles.reportCard}>
                        <div style={styles.reportIcon}>📦</div>
                        <h3 style={styles.reportTitle}>Procurement Report</h3>
                        <p style={styles.reportDesc}>
                            Shows all purchase requests sent to suppliers
                            and their confirmation status per material item.
                        </p>
                        <button
                            onClick={() => downloadReport('procurement')}
                            style={{
                                ...styles.downloadBtn,
                                opacity: loading === 'procurement' ? 0.7 : 1,
                                cursor: loading === 'procurement'
                                    ? 'not-allowed' : 'pointer',
                            }}
                            disabled={loading === 'procurement'}
                        >
                            {loading === 'procurement'
                                ? '⏳ Generating...'
                                : '⬇ Download PDF'}
                        </button>
                    </div>

                    {/* Report 4 — Individual Quotation */}
                    <div style={styles.reportCard}>
                        <div style={styles.reportIcon}>📄</div>
                        <h3 style={styles.reportTitle}>Individual Quotation Report</h3>
                        <p style={styles.reportDesc}>
                            Downloads a detailed quotation PDF for a specific
                            approved project including cost breakdown.
                        </p>

                        {/* Quotation selector dropdown */}
                        <div style={styles.field}>
                            <label style={styles.label}>Select Quotation</label>
                            <select
                                value={selectedQuotationId}
                                onChange={(e) => setSelectedQuotationId(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">— Select an approved quotation —</option>
                                {quotations.map((qr) => (
                                    <option
                                        key={qr.quotation?.id}
                                        value={qr.quotation?.id}
                                    >
                                        {/* Show customer name and date */}
                                        {qr.customer?.user?.name} —
                                        {qr.solar_system_type} —
                                        #{qr.quotation?.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => downloadReport('quotation')}
                            style={{
                                ...styles.downloadBtn,
                                opacity: loading === 'quotation' ? 0.7 : 1,
                                cursor: loading === 'quotation'
                                    ? 'not-allowed' : 'pointer',
                            }}
                            disabled={loading === 'quotation'}
                        >
                            {loading === 'quotation'
                                ? '⏳ Generating...'
                                : '⬇ Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    // Full page green background
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    // Green navbar
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
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
        gap: '0.75rem',
    },
    // Navigation buttons
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    // Admin role badge
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    // White username
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Logout button
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Content area
    content: {
        width: '100%',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    // Page title
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    // Page description
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // Grid of report cards
    reportsGrid: {
        display: 'grid',
        // Two columns on wide screens
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
    },
    // Individual report card
    reportCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    // Large icon at top of card
    reportIcon: {
        fontSize: '2rem',
    },
    // Report title
    reportTitle: {
        fontSize: '1rem',
        color: '#111827',
        margin: 0,
        fontWeight: '600',
    },
    // Report description
    reportDesc: {
        fontSize: '0.875rem',
        color: '#6b7280',
        margin: 0,
        lineHeight: '1.5',
        flex: 1,
    },
    // Field wrapper for the quotation selector
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    // Label above select
    label: {
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    // Select dropdown
    select: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.875rem',
        boxSizing: 'border-box',
    },
    // Download button
    downloadBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        width: '100%',
        marginTop: 'auto',
    },
};