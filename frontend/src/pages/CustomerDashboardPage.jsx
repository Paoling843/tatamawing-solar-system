import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CustomerDashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [quotationRequests, setQuotationRequests] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');

        try {
            const [quotationRes, scheduleRes] = await Promise.all([
                api.get('/quotation-requests'),
                api.get('/customer/schedules'),
            ]);

            setQuotationRequests(quotationRes.data);

            if (scheduleRes.data.length > 0) {
                setSchedule(scheduleRes.data[0]);
            }
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleDownloadQuotation = async (quotationId, customerName) => {
        try {
            const res = await api.get(
                `/customer/reports/quotation/${quotationId}`,
                { responseType: 'blob' }
            );

            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));

            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `quotation-${customerName}-${quotationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setError('Failed to download quotation PDF.');
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
        const styles = {
            pending: { backgroundColor: '#fef9c3', color: '#ca8a04' },
            approved: { backgroundColor: '#dcfce7', color: '#16a34a' },
            rejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
            draft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
        };
        
        return styles[status] || styles.draft;
    };

    const getDaysUntil = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateString);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0 ) return 'Today';
        if (diffDays === 1 ) return 'Tomorrow';
        if (diffDays < 0 ) return `${Math.abs(diffDays)} days ago`;
        return `In ${diffDays} days`;
    };

    const pendingCount = quotationRequests.filter(q => q.status === 'pending').length;
    const approvedCount = quotationRequests.filter(q => q.status === 'approved').length;
    const rejectedCount = quotationRequests.filter(q => q.status === 'rejected').length;

        return (
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* New quotation button */}
                    <button
                        onClick={() => navigate('/quotation/new')}
                        style={styles.navBtn}
                    >
                        ➕ New Quotation
                    </button>
                    {/* Schedule link */}
                    <button
                        onClick={() => navigate('/customer/schedule')}
                        style={styles.navBtn}
                    >
                        📅 Schedule
                    </button>
                    {/* Chat link */}
                    <button
                        onClick={() => navigate('/customer/chat')}
                        style={styles.navBtn}
                    >
                        💬 Chat
                    </button>
                    {/* FAQ link */}
                    <button
                        onClick={() => navigate('/faqs')}
                        style={styles.navBtn}
                    >
                        ❓ FAQs
                    </button>
                    <span style={styles.navRole}>Customer</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.content}>

                {/* Welcome message */}
                <div style={styles.welcomeSection}>
                    <h2 style={styles.welcomeTitle}>
                        Welcome back, {user?.name}! 👋
                    </h2>
                    <p style={styles.welcomeSubtitle}>
                        Here's an overview of your solar power quotation requests.
                    </p>
                </div>

                {/* Error message */}
                {error && <div style={styles.error}>{error}</div>}

                {loading ? (
                    <div style={styles.loadingText}>Loading dashboard...</div>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div style={styles.summaryGrid}>
                            {/* Total requests */}
                            <div style={styles.summaryCard}>
                                <span style={styles.summaryIcon}>📋</span>
                                <span style={styles.summaryNumber}>
                                    {quotationRequests.length}
                                </span>
                                <span style={styles.summaryLabel}>
                                    Total Requests
                                </span>
                            </div>

                            {/* Pending requests */}
                            <div style={{
                                ...styles.summaryCard,
                                borderLeft: '4px solid #ca8a04',
                            }}>
                                <span style={styles.summaryIcon}>⏳</span>
                                <span style={styles.summaryNumber}>
                                    {pendingCount}
                                </span>
                                <span style={styles.summaryLabel}>
                                    Pending Review
                                </span>
                            </div>

                            {/* Approved requests */}
                            <div style={{
                                ...styles.summaryCard,
                                borderLeft: '4px solid #16a34a',
                            }}>
                                <span style={styles.summaryIcon}>✅</span>
                                <span style={styles.summaryNumber}>
                                    {approvedCount}
                                </span>
                                <span style={styles.summaryLabel}>
                                    Approved
                                </span>
                            </div>

                            {/* Rejected requests */}
                            <div style={{
                                ...styles.summaryCard,
                                borderLeft: '4px solid #dc2626',
                            }}>
                                <span style={styles.summaryIcon}>❌</span>
                                <span style={styles.summaryNumber}>
                                    {rejectedCount}
                                </span>
                                <span style={styles.summaryLabel}>
                                    Rejected
                                </span>
                            </div>
                        </div>

                        {/* Installation schedule card — only show if scheduled */}
                        {schedule && (
                            <div style={styles.scheduleCard}>
                                <div style={styles.scheduleCardLeft}>
                                    <span style={styles.scheduleIcon}>🏠</span>
                                    <div>
                                        <h3 style={styles.scheduleTitle}>
                                            Upcoming Installation
                                        </h3>
                                        <p style={styles.scheduleDate}>
                                            📅 {formatDate(schedule.scheduled_date)}
                                        </p>
                                        <p style={styles.scheduleTech}>
                                            👷 {schedule.assigned_technician}
                                        </p>
                                    </div>
                                </div>
                                <div style={styles.scheduleCountdown}>
                                    {getDaysUntil(schedule.scheduled_date)}
                                </div>
                            </div>
                        )}

                        {/* Quick actions */}
                        <div style={styles.quickActions}>
                            <h3 style={styles.sectionTitle}>Quick Actions</h3>
                            <div style={styles.actionButtons}>
                                {/* New quotation button */}
                                <button
                                    onClick={() => navigate('/quotation/new')}
                                    style={styles.actionBtn}
                                >
                                    <span style={styles.actionIcon}>☀️</span>
                                    <span>New Quotation</span>
                                </button>

                                {/* Chat button */}
                                <button
                                    onClick={() => navigate('/customer/chat')}
                                    style={styles.actionBtn}
                                >
                                    <span style={styles.actionIcon}>💬</span>
                                    <span>Chat with Us</span>
                                </button>

                                {/* Schedule button */}
                                <button
                                    onClick={() => navigate('/customer/schedule')}
                                    style={styles.actionBtn}
                                >
                                    <span style={styles.actionIcon}>📅</span>
                                    <span>View Schedule</span>
                                </button>

                                {/* FAQ button */}
                                <button
                                    onClick={() => navigate('/faqs')}
                                    style={styles.actionBtn}
                                >
                                    <span style={styles.actionIcon}>❓</span>
                                    <span>FAQs</span>
                                </button>
                            </div>
                        </div>

                        {/* Quotation history */}
                        <div style={styles.historySection}>
                            <h3 style={styles.sectionTitle}>
                                My Quotation Requests
                            </h3>

                            {quotationRequests.length === 0 ? (
                                // Empty state
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>☀️</div>
                                    <h3 style={styles.emptyTitle}>
                                        No quotations yet
                                    </h3>
                                    <p style={styles.emptyDesc}>
                                        Submit your first solar power quotation
                                        request to get started.
                                    </p>
                                    <button
                                        onClick={() => navigate('/quotation/new')}
                                        style={styles.emptyBtn}
                                    >
                                        Request a Quotation
                                    </button>
                                </div>
                            ) : (
                                // Quotation list
                                <div style={styles.quotationList}>
                                    {quotationRequests.map((qr) => (
                                        <div key={qr.id} style={styles.quotationCard}>

                                            {/* Card header */}
                                            <div style={styles.quotationHeader}>
                                                <div>
                                                    {/* System type */}
                                                    <h4 style={styles.quotationTitle}>
                                                        {qr.solar_system_type
                                                            ?.charAt(0).toUpperCase() +
                                                         qr.solar_system_type?.slice(1)
                                                        } Solar System
                                                    </h4>
                                                    {/* Submission date */}
                                                    <p style={styles.quotationDate}>
                                                        Submitted: {formatDate(qr.submission_date)}
                                                    </p>
                                                </div>

                                                {/* Status badge */}
                                                <span style={{
                                                    ...styles.badge,
                                                    ...getStatusStyle(qr.status),
                                                }}>
                                                    {qr.status?.charAt(0).toUpperCase() +
                                                     qr.status?.slice(1)}
                                                </span>
                                            </div>

                                            {/* Card details */}
                                            <div style={styles.quotationDetails}>
                                                {/* Number of appliances */}
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>
                                                        Appliances
                                                    </span>
                                                    <span style={styles.detailValue}>
                                                        {qr.appliance_items?.length || 0} items
                                                    </span>
                                                </div>

                                                {/* Estimated cost */}
                                                {qr.solar_computation && (
                                                    <div style={styles.detailItem}>
                                                        <span style={styles.detailLabel}>
                                                            Estimated Cost
                                                        </span>
                                                        <span style={styles.detailValue}>
                                                            {formatCurrency(
                                                                qr.solar_computation.estimated_cost
                                                            )}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Final amount if approved */}
                                                {qr.quotation && (
                                                    <div style={styles.detailItem}>
                                                        <span style={styles.detailLabel}>
                                                            Final Amount
                                                        </span>
                                                        <span style={{
                                                            ...styles.detailValue,
                                                            color: '#16a34a',
                                                            fontWeight: '700',
                                                        }}>
                                                            {formatCurrency(
                                                                qr.quotation.total_amount
                                                            )}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Rejection reason if rejected */}
                                                {qr.status === 'rejected' && qr.notes && (
                                                    <div style={styles.rejectionNote}>
                                                        <strong>Reason: </strong>{qr.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card actions */}
                                            <div style={styles.quotationActions}>
                                                {/* Download PDF — only for approved */}
                                                {qr.status === 'approved' && qr.quotation && (
                                                    <button
                                                        onClick={() => handleDownloadQuotation(
                                                            qr.quotation.id,
                                                            user?.name
                                                        )}
                                                        style={styles.downloadBtn}
                                                    >
                                                        ⬇ Download PDF
                                                    </button>
                                                )}

                                                {/* Submit button — only for drafts */}
                                                {qr.status === 'draft' && (
                                                    <button
                                                        onClick={() => navigate('/quotation/new')}
                                                        style={styles.submitBtn}
                                                    >
                                                        Continue Editing
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
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
        gap: '0.75rem',
    },
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
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
    welcomeSection: {
        marginBottom: '1.5rem',
    },
    welcomeTitle: {
        fontSize: '1.75rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    welcomeSubtitle: {
        color: '#6b7280',
        margin: 0,
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        borderLeft: '4px solid #e5e7eb',
    },
    summaryIcon: {
        fontSize: '1.5rem',
    },
    summaryNumber: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#111827',
    },
    summaryLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    scheduleCard: {
        backgroundColor: '#16a34a',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
    },
    scheduleCardLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    scheduleIcon: {
        fontSize: '2rem',
    },
    scheduleTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        margin: '0 0 0.25rem 0',
    },
    scheduleDate: {
        fontSize: '0.875rem',
        margin: '0 0 0.25rem 0',
        opacity: 0.9,
    },
    scheduleTech: {
        fontSize: '0.875rem',
        margin: 0,
        opacity: 0.85,
    },
    scheduleCountdown: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    quickActions: {
        marginBottom: '1.5rem',
    },
    sectionTitle: {
        fontSize: '1.125rem',
        color: '#111827',
        marginBottom: '1rem',
        fontWeight: '600',
    },
    actionButtons: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
    },
    actionBtn: {
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    actionIcon: {
        fontSize: '1.75rem',
    },
    historySection: {
        marginBottom: '2rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: '1rem',
    },
    emptyTitle: {
        fontSize: '1.25rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    emptyDesc: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    emptyBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
    quotationList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    quotationCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    quotationHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
    },
    quotationTitle: {
        fontSize: '1rem',
        color: '#111827',
        margin: '0 0 0.25rem 0',
        fontWeight: '600',
    },
    quotationDate: {
        fontSize: '0.8rem',
        color: '#6b7280',
        margin: 0,
    },
    badge: {
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    quotationDetails: {
        display: 'flex',
        gap: '2rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    detailLabel: {
        fontSize: '0.7rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: '0.9rem',
        color: '#111827',
        fontWeight: '500',
    },
    rejectionNote: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        marginTop: '0.5rem',
    },
    quotationActions: {
        display: 'flex',
        gap: '0.75rem',
    },
    downloadBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
};