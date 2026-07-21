import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminSchedulePage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingSchedule, setEditingSchedule] = useState(null);

    const [editForm, setEditForm] = useState({
        scheduled_date: '',
        assigned_technician: '',
    });

    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/admin/schedules');
            setSchedules(res.data);
        } catch (err) {
            setError('Failed to load schedules.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (schedule) => {
        setEditForm({
            scheduled_date: schedule.scheduled_date.split('T')[0],
            assigned_technician: schedule.assigned_technician,
        });
        setEditingSchedule(schedule);
        setError('');
        setSuccess('');
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.put(`/admin/schedules/${editingSchedule.id}`, editForm);
            setSuccess('Schedule updated successfully.');
            setEditingSchedule(null);
            fetchSchedules();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update schedule.');
        }finally {
            setEditLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getDaysUntil = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateString);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
        return `In ${diffDays} days`;
    };

        const getCountdownStyle = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateString);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return { backgroundColor: '#fef2f2', color: '#dc2626' };
        if (diffDays <= 7) return { backgroundColor: '#fef9c3', color: '#ca8a04' };
        return { backgroundColor: '#dcfce7', color: '#16a34a' };
    };

        return (
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* Link to quotations */}
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
                    {/* Link to reports */}
                    <button
                        onClick={() => navigate('/admin/reports')}
                        style={styles.navBtn}
                    >
                        📊 Reports
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
                <h2 style={styles.pageTitle}>Installation Schedules</h2>
                <p style={styles.pageSubtitle}>
                    View and manage all scheduled solar installations.
                </p>

                {/* Success message */}
                {success && <div style={styles.success}>{success}</div>}

                {/* Error message */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Edit form — shows when editing a schedule */}
                {editingSchedule && (
                    <div style={styles.editCard}>
                        <h3 style={styles.editTitle}>
                            Edit Schedule — {editingSchedule.quotation
                                ?.quotation_request?.customer?.user?.name}
                        </h3>

                        <form onSubmit={handleUpdate}>
                            {/* Date input */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    New Installation Date
                                </label>
                                <input
                                    type="date"
                                    value={editForm.scheduled_date}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        scheduled_date: e.target.value,
                                    })}
                                    style={styles.input}
                                    // Date must be in the future
                                    min={new Date(Date.now() + 86400000)
                                        .toISOString().split('T')[0]}
                                    required
                                />
                            </div>

                            {/* Technician input */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Assigned Technician
                                </label>
                                <input
                                    type="text"
                                    value={editForm.assigned_technician}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        assigned_technician: e.target.value,
                                    })}
                                    style={styles.input}
                                    placeholder="Technician name"
                                    required
                                />
                            </div>

                            {/* Form buttons */}
                            <div style={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={() => setEditingSchedule(null)}
                                    style={styles.cancelBtn}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.saveBtn,
                                        opacity: editLoading ? 0.7 : 1,
                                        cursor: editLoading
                                            ? 'not-allowed' : 'pointer',
                                    }}
                                    disabled={editLoading}
                                >
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Schedules list */}
                {loading ? (
                    <div style={styles.loadingText}>
                        Loading schedules...
                    </div>
                ) : schedules.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📅</div>
                        <p style={styles.emptyText}>
                            No installation schedules yet.
                            Schedules are created when approving quotations
                            after supplier confirmation.
                        </p>
                    </div>
                ) : (
                    <div style={styles.scheduleList}>
                        {schedules.map((schedule) => (
                            <div key={schedule.id} style={styles.scheduleCard}>

                                {/* Left side — countdown badge */}
                                <div style={{
                                    ...styles.countdownBadge,
                                    ...getCountdownStyle(schedule.scheduled_date),
                                }}>
                                    {getDaysUntil(schedule.scheduled_date)}
                                </div>

                                {/* Middle — schedule details */}
                                <div style={styles.scheduleDetails}>
                                    {/* Customer name */}
                                    <h3 style={styles.customerName}>
                                        {schedule.quotation?.quotation_request
                                            ?.customer?.user?.name || 'Unknown'}
                                    </h3>

                                    {/* Details row */}
                                    <div style={styles.detailsRow}>
                                        {/* Scheduled date */}
                                        <span style={styles.detailChip}>
                                            📅 {formatDate(schedule.scheduled_date)}
                                        </span>

                                        {/* Technician */}
                                        <span style={styles.detailChip}>
                                            👷 {schedule.assigned_technician}
                                        </span>

                                        {/* System type */}
                                        <span style={styles.detailChip}>
                                            ☀️ {schedule.quotation?.quotation_request
                                                ?.solar_system_type?.charAt(0).toUpperCase() +
                                                schedule.quotation?.quotation_request
                                                ?.solar_system_type?.slice(1)}
                                        </span>

                                        {/* Location */}
                                        <span style={styles.detailChip}>
                                            📍 {schedule.quotation?.quotation_request
                                                ?.customer?.install_location}
                                        </span>
                                    </div>
                                </div>

                                {/* Right side — edit button */}
                                <button
                                    onClick={() => handleOpenEdit(schedule)}
                                    style={styles.editBtn}
                                >
                                    ✏️ Reschedule
                                </button>
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
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        color: '#6b7280',
        marginBottom: '1.5rem',
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
    editCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '2px solid #16a34a',
    },
    editTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
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
    formActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    saveBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    emptyIcon: {
        fontSize: '2.5rem',
        marginBottom: '0.5rem',
    },
    emptyText: {
        color: '#6b7280',
        maxWidth: '400px',
        margin: '0 auto',
    },
    scheduleList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    scheduleCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
    },
    countdownBadge: {
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.8rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    scheduleDetails: {
        flex: 1,
    },
    customerName: {
        fontSize: '1rem',
        color: '#111827',
        margin: '0 0 0.5rem 0',
        fontWeight: '600',
    },
    detailsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    detailChip: {
        backgroundColor: '#f3f4f6',
        color: '#374151',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
    },
    editBtn: {
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
};