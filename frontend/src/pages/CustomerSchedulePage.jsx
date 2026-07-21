import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CustomerSchedulePage() {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');   

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/customer/schedules');
            setSchedules(res.data);
        } catch (err) {
            setError ('Failed to load your installation schedules.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
            await logout();
            navigate ('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString). toLocaleDateString('en-PH',{
            year: 'numeric',
            month:'long',
            day: 'numeric',
        });
    };

    const getDaysUntil = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const scheduled = new Date(dateString);
        scheduled.setHours(0, 0, 0, 0);

        const diffTime = scheduled - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60* 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
        return `In ${diffDays} days`;
    };

        return (
        // Outer container with light green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name on the left */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>

                {/* Right side — user name and logout */}
                <div style={styles.navRight}>
                    {/* Customer role indicator */}
                    <span style={styles.navRole}>Customer</span>

                    {/* Logged-in customer's name */}
                    <span style={styles.navUser}>Hello, {user?.name}</span>

                    {/* Logout button */}
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div style={styles.content}>

                {/* Navigation links */}
                <div style={styles.navLinks}>
                    {/* Link back to quotation form */}
                    <button
                        onClick={() => navigate('/quotation/new')}
                        style={styles.navLink}
                    >
                        📋 New Quotation
                    </button>

                    {/* Current page indicator */}
                    <button style={{ ...styles.navLink, ...styles.navLinkActive }}>
                        📅 My Schedule
                    </button>
                </div>

                {/* Page header */}
                <h2 style={styles.pageTitle}>My Installation Schedule</h2>
                <p style={styles.pageSubtitle}>
                    View your upcoming solar installation dates and assigned technician.
                </p>

                {/* Show error message if fetch failed */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Show loading state while fetching */}
                {loading ? (
                    <div style={styles.loadingText}>
                        Loading your schedule...
                    </div>
                ) : schedules.length === 0 ? (
                    // Show empty state if no schedules found
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <h3 style={styles.emptyTitle}>No Installation Scheduled Yet</h3>
                        <p style={styles.emptyDesc}>
                            Your installation will be scheduled by TataMawing after
                            your quotation is approved and materials are confirmed.
                        </p>
                        <button
                            onClick={() => navigate('/quotation/new')}
                            style={styles.emptyBtn}
                        >
                            Submit a Quotation
                        </button>
                    </div>
                ) : (
                    // Show the list of schedules
                    <div>
                        {schedules.map((schedule) => (
                            <div key={schedule.id} style={styles.scheduleCard}>

                                {/* Schedule header with date badge */}
                                <div style={styles.scheduleHeader}>
                                    {/* Installation date */}
                                    <div>
                                        <h3 style={styles.scheduleTitle}>
                                            Solar Installation
                                        </h3>
                                        <p style={styles.scheduleDate}>
                                            📅 {formatDate(schedule.scheduled_date)}
                                        </p>
                                    </div>

                                    {/* Days until badge */}
                                    <div style={styles.daysBadge}>
                                        {getDaysUntil(schedule.scheduled_date)}
                                    </div>
                                </div>

                                {/* Schedule details grid */}
                                <div style={styles.detailsGrid}>

                                    {/* Assigned technician */}
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>
                                            👷 Assigned Technician
                                        </span>
                                        <span style={styles.detailValue}>
                                            {schedule.assigned_technician}
                                        </span>
                                    </div>

                                    {/* Solar system type */}
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>
                                            ☀️ System Type
                                        </span>
                                        <span style={styles.detailValue}>
                                            {schedule.quotation?.quotation_request
                                                ?.solar_system_type?.charAt(0).toUpperCase() +
                                             schedule.quotation?.quotation_request
                                                ?.solar_system_type?.slice(1)}
                                        </span>
                                    </div>

                                    {/* Installation location */}
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>
                                            📍 Installation Location
                                        </span>
                                        <span style={styles.detailValue}>
                                            {schedule.quotation?.quotation_request
                                                ?.customer?.install_location}
                                        </span>
                                    </div>

                                    {/* Total amount */}
                                    <div style={styles.detailItem}>
                                        <span style={styles.detailLabel}>
                                            💰 Total Amount
                                        </span>
                                        <span style={{
                                            ...styles.detailValue,
                                            color: '#16a34a',
                                            fontWeight: '700',
                                        }}>
                                            ₱{parseFloat(schedule.quotation?.total_amount
                                            ).toLocaleString('en-PH', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Reminder message */}
                                <div style={styles.reminder}>
                                    <strong>📌 Reminder:</strong> Please make sure someone
                                    is home on the scheduled date. The technician will
                                    contact you before arriving.
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
    // Customer role badge
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
    // Navigation links row
    navLinks: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
    },
    // Navigation link button
    navLink: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Active navigation link
    navLinkActive: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: '1px solid #16a34a',
    },
    // Page heading
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
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // Loading text
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    // Empty state container
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // Large icon in empty state
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: '1rem',
    },
    // Empty state title
    emptyTitle: {
        fontSize: '1.25rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    // Empty state description
    emptyDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        maxWidth: '400px',
        margin: '0 auto 1.5rem auto',
    },
    // Button in empty state
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
    // Schedule card
    scheduleCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: '4px solid #16a34a',
    },
    // Schedule card header
    scheduleHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
    },
    // Schedule title
    scheduleTitle: {
        fontSize: '1.25rem',
        color: '#111827',
        margin: '0 0 0.25rem 0',
    },
    // Schedule date text
    scheduleDate: {
        color: '#16a34a',
        fontSize: '1rem',
        fontWeight: '600',
        margin: 0,
    },
    // Days until badge
    daysBadge: {
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    // Details grid
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1rem',
    },
    // Each detail item
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    // Detail label
    detailLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    // Detail value
    detailValue: {
        fontSize: '1rem',
        color: '#111827',
        fontWeight: '500',
    },
    // Reminder box at the bottom of each schedule card
    reminder: {
        backgroundColor: '#fefce8',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        color: '#92400e',
    },
};