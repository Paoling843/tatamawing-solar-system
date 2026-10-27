import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminText, adminUi } from '../styles/adminTheme';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { ClockIcon, UserIcon } from '../components/Icons';
import api from '../api/axios';
import { colors } from '../styles/theme';

// Users: the customers who have submitted quotation requests, and a link to
// the real audit log. Only shows data the system actually has.
export default function AdminSystemPage() {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/quotation-requests');
            const uniqueUsers = [];
            const seen = new Set();
            res.data.forEach(qr => {
                if (qr.customer?.user && !seen.has(qr.customer.user.id)) {
                    seen.add(qr.customer.user.id);
                    uniqueUsers.push(qr.customer.user);
                }
            });
            setUsers(uniqueUsers);
        } catch {
            setError('Failed to load user data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchUsers);
    }, [fetchUsers]);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getRoleStyle = (role) => {
        if (role === 'admin') {
            return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
        }
        return { backgroundColor: '#eef0ec', color: '#5d6862' };
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            customer: 'Customer',
        };
        return labels[role] || role;
    };

    const formatJoined = (value) => (value
        ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—');

    return (
        <AdminLayout active="Users">

            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Users</h1>
                    <p style={styles.pageSubtitle}>
                        Customers who have requested a quotation, and the record of admin actions.
                    </p>
                </div>

                {/* Disabled for now: public registration only creates customer
                    accounts, so creating users from here needs its own admin-only
                    form and endpoint */}
                <button
                    style={{ ...styles.createUserBtn, opacity: 0.55, cursor: 'not-allowed' }}
                    disabled
                    title="Creating users from here isn't available yet"
                >
                    + Create New User
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div className="content-grid-sidebar" style={styles.contentGrid}>

                <div className="m-pad" style={styles.usersCard}>
                    <h2 style={styles.sectionTitle}>Customers</h2>

                    {loading ? (
                        <LoadingState label="Loading users..." />
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={<UserIcon size={32} color={colors.textFaint} />}
                            title="No users found"
                            description="Customers will appear here once they submit a quotation request."
                        />
                    ) : (
                        <div>
                            <div className="m-hide" style={styles.usersTableHeader}>
                                <span style={{ flex: 3 }}>User</span>
                                <span style={{ flex: 1.2 }}>Role</span>
                                <span style={{ flex: 1.3 }}>Joined</span>
                            </div>

                            {users.map((user) => (
                                <div key={user.id} className="m-wrap" style={styles.userRow}>
                                    <div style={{ flex: '3 1 220px', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                        <div style={{
                                            ...styles.userAvatar,
                                            backgroundColor: user.role === 'admin' ? '#1d4ed8' : '#5d6862',
                                        }}>
                                            {getInitials(user.name)}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={styles.userName}>{user.name}</p>
                                            <p style={styles.userEmail}>{user.email}</p>
                                        </div>
                                    </div>

                                    <span style={{ flex: '1.2 1 90px' }}>
                                        <span style={{ ...styles.roleBadge, ...getRoleStyle(user.role) }}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </span>

                                    <span style={{ flex: '1.3 1 110px', fontSize: '0.8rem', color: '#5d6862' }}>
                                        {formatJoined(user.created_at)}
                                    </span>
                                </div>
                            ))}

                            <div style={styles.listFooter}>
                                Showing {users.length} {users.length === 1 ? 'customer' : 'customers'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.auditCard}>
                    <div style={styles.auditCardHeader}>
                        <h3 style={styles.auditTitle}>Audit log</h3>
                        <span style={styles.auditIcon}>
                            <ClockIcon size={16} color="currentColor" />
                        </span>
                    </div>
                    <p style={styles.auditDesc}>
                        Every approval, rejection, schedule change and setting change made by an admin is
                        recorded with who did it and when.
                    </p>
                    <button
                        className="btn-secondary"
                        style={styles.viewAuditBtn}
                        onClick={() => navigate('/admin/audit-logs')}
                    >
                        Open audit log
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem 1rem',
    },
    pageTitle: adminText.pageTitle,
    pageSubtitle: { ...adminText.pageSubtitle, maxWidth: '500px' },
    createUserBtn: {
        padding: '0.625rem 1.25rem',
        backgroundColor: '#0f3b2c',
        color: 'white',
        border: 'none',
        borderRadius: '999px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: 0,
    },
    error: adminUi.errorBanner,
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '1.25rem',
        alignItems: 'start',
    },
    usersCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #eef0ec',
        minWidth: 0,
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#16211c',
        margin: '0 0 1rem 0',
    },
    usersTableHeader: {
        display: 'flex',
        padding: '0.5rem 0',
        fontSize: '0.75rem',
        color: '#5d6862',
        fontWeight: '600',
        borderBottom: '1px solid #eef0ec',
        marginBottom: '0.5rem',
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 0',
        borderBottom: '1px solid #f3f4f1',
        fontSize: '0.875rem',
    },
    userAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    userName: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#16211c',
        margin: '0 0 0.125rem 0',
    },
    userEmail: {
        fontSize: '0.75rem',
        color: '#5d6862',
        margin: 0,
        overflowWrap: 'anywhere',
    },
    roleBadge: {
        padding: '0.2rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
    },
    listFooter: {
        marginTop: '1rem',
        fontSize: '0.8rem',
        color: '#5d6862',
    },
    auditCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #eef0ec',
    },
    auditCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
    },
    auditTitle: {
        fontSize: '0.9rem',
        fontWeight: '700',
        color: '#16211c',
        margin: 0,
    },
    auditIcon: {
        fontSize: '1rem',
        color: '#5d6862',
    },
    auditDesc: {
        fontSize: '0.8rem',
        lineHeight: 1.55,
        color: '#5d6862',
        margin: '0 0 0.75rem 0',
    },
    viewAuditBtn: {
        width: '100%',
        padding: '0.625rem',
        backgroundColor: 'white',
        color: '#293530',
        border: '1px solid #e6e8e2',
        borderRadius: '8px',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
};
