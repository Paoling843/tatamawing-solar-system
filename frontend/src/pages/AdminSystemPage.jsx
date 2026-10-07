import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { SettingsIcon, ClockIcon, UserIcon } from '../components/Icons';
import api from '../api/axios';
import { colors, typography } from '../styles/theme';

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
                    uniqueUsers.push({
                        ...qr.customer.user,
                        role_label: 'Customer',
                    });
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
        if (role === 'admin' || role === 'Senior Admin') {
            return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
        }
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            customer: 'Customer',
        };
        return labels[role] || role;
    };

    const auditLogs = [
        {
            id: 1,
            title: 'Policy Updated',
            desc: 'Admin modified Procurement settings',
            time: '14:32 PM • Security',
            color: '#3b82f6',
        },
        {
            id: 2,
            title: 'Failed Login Attempt',
            desc: 'IP blocked after 5 attempts',
            time: '11:15 AM • Security',
            color: '#dc2626',
        },
        {
            id: 3,
            title: 'New Customer Registered',
            desc: 'New customer account created',
            time: '09:04 AM • Users',
            color: '#111827',
        },
    ];
    return (
        <AdminLayout active="Users">

            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Administration & Settings</h1>
                    <p style={styles.pageSubtitle}>
                        Control user permissions, system configurations,
                        and view system-wide logs.
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

                <div style={styles.usersCard}>
                    <h2 style={styles.sectionTitle}>System Users</h2>

                    {loading ? (
                        <LoadingState label="Loading users..." />
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={<UserIcon size={32} color={colors.textFaint} />}
                            title="No users found"
                            description="Customers will appear here once they submit a quotation request."
                        />
                    ) : (
                    <div className="table-scroll">
                        <div>
                            <div style={styles.usersTableHeader}>
                                <span style={{ flex: 3 }}>User</span>
                                <span style={{ flex: 1.5 }}>Role</span>
                                <span style={{ flex: 1.5 }}>Status</span>
                                <span style={{ flex: 2 }}>Last Login</span>
                                <span style={{ flex: 0.5 }}></span>
                            </div>

                            {users.map((user) => (
                                <div key={user.id} style={styles.userRow}>
                                    <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            ...styles.userAvatar,
                                            backgroundColor: user.role === 'admin'
                                                ? '#1d4ed8'
                                                : '#6b7280',
                                        }}>
                                            {getInitials(user.name)}
                                        </div>
                                        <div>
                                            <p style={styles.userName}>{user.name}</p>
                                            <p style={styles.userEmail}>{user.email}</p>
                                        </div>
                                    </div>

                                    <span style={{ flex: 1.5 }}>
                                        <span style={{
                                            ...styles.roleBadge,
                                            ...getRoleStyle(user.role),
                                        }}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </span>

                                    <span style={{ flex: 1.5 }}>
                                        <div style={styles.statusRow}>
                                            <div style={styles.statusDotActive} />
                                            <span style={styles.statusText}>Active</span>
                                        </div>
                                    </span>

                                    <span style={{ flex: 2, fontSize: '0.8rem', color: '#9ca3af' }}>
                                        Recently
                                    </span>

                                    <span style={{ flex: 0.5 }}>
                                        <button style={styles.actionDots}>⋯</button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {users.length > 0 && (
                        <div style={styles.paginationRow}>
                            <span style={styles.paginationText}>
                                Showing {users.length} users
                            </span>
                            <div style={styles.paginationBtns}>
                                <button className="btn-secondary" style={styles.paginationBtn}>Previous</button>
                                <button className="btn-primary" style={styles.paginationBtnActive}>Next</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.rightColumn}>

                    <div style={styles.configCard}>
                        <h3 style={{ ...styles.configTitle, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <SettingsIcon size={16} color="currentColor" />
                            System Configuration
                        </h3>

                        <div style={styles.configItem}>
                            <div>
                                <p style={styles.configItemTitle}>Maintenance Mode</p>
                                <p style={styles.configItemDesc}>
                                    Restrict access during updates
                                </p>
                            </div>
                            <div style={styles.toggleOff}>
                                <div style={styles.toggleKnobOff} />
                            </div>
                        </div>

                        <div style={styles.configItem}>
                            <div>
                                <p style={styles.configItemTitle}>Two-Factor Auth</p>
                                <p style={{ ...styles.configItemDesc, color: '#16a34a' }}>
                                    Mandatory for all Admin users
                                </p>
                            </div>
                            <div style={styles.toggleOn}>
                                <div style={styles.toggleKnobOn} />
                            </div>
                        </div>

                        <button className="btn-primary" style={styles.applyBtn}>Apply Changes</button>
                    </div>

                    <div style={styles.auditCard}>
                        <div style={styles.auditCardHeader}>
                            <h3 style={styles.configTitle}>Recent Audit Logs</h3>
                            <span style={styles.auditIcon}>
                                <ClockIcon size={16} color="currentColor" />
                            </span>
                        </div>

                        {auditLogs.map((log) => (
                            <div key={log.id} style={styles.auditItem}>
                                <div style={{
                                    ...styles.auditDot,
                                    backgroundColor: log.color,
                                }} />
                                <div>
                                    <p style={styles.auditTitle}>{log.title}</p>
                                    <p style={styles.auditDesc}>{log.desc}</p>
                                    <p style={styles.auditTime}>{log.time}</p>
                                </div>
                            </div>
                        ))}

                        <button
                            className="btn-secondary"
                            style={styles.viewAuditBtn}
                            onClick={() => navigate('/admin/reports')}
                        >
                            View Detailed Audit Report
                        </button>
                    </div>
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
    },
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: colors.textMuted,
        margin: 0,
        maxWidth: '500px',
    },
    createUserBtn: {
        padding: '0.625rem 1.25rem',
        backgroundColor: '#38bdf8',
        color: 'white',
        border: 'none',
        borderRadius: '999px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        flexShrink: 0,
    },
    tabsRow: {
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '1.5rem',
        gap: '0',
    },
    tab: {
        padding: '0.75rem 1.25rem',
        border: 'none',
        borderBottom: '2px solid transparent',
        backgroundColor: 'transparent',
        color: '#6b7280',
        fontSize: '0.875rem',
        cursor: 'pointer',
        marginBottom: '-2px',
    },
    tabActive: {
        color: '#1a4a3a',
        borderBottom: '2px solid #1a4a3a',
        fontWeight: '600',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
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
        border: '1px solid #f3f4f6',
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 1rem 0',
    },
    usersTableHeader: {
        display: 'flex',
        padding: '0.5rem 0',
        fontSize: '0.75rem',
        color: '#9ca3af',
        fontWeight: '600',
        borderBottom: '1px solid #f3f4f6',
        marginBottom: '0.5rem',
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '0.875rem 0',
        borderBottom: '1px solid #f9fafb',
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
        color: '#111827',
        margin: '0 0 0.125rem 0',
    },
    userEmail: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: 0,
    },
    roleBadge: {
        padding: '0.2rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
    },
    statusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
    },
    statusDotActive: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
    },
    statusText: {
        fontSize: '0.875rem',
        color: '#374151',
    },
    actionDots: {
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: '#9ca3af',
    },
    paginationRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #f3f4f6',
    },
    paginationText: {
        fontSize: '0.8rem',
        color: '#9ca3af',
    },
    paginationBtns: {
        display: 'flex',
        gap: '0.5rem',
    },
    paginationBtn: {
        padding: '0.375rem 0.875rem',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: 'white',
        color: '#374151',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    paginationBtnActive: {
        padding: '0.375rem 0.875rem',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#1a4a3a',
        color: 'white',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },
    rightColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    configCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    configTitle: {
        fontSize: '0.9rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 1rem 0',
    },
    configItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #f3f4f6',
    },
    configItemTitle: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#111827',
        margin: '0 0 0.125rem 0',
    },
    configItemDesc: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: 0,
    },
    toggleOff: {
        width: '44px',
        height: '24px',
        borderRadius: '999px',
        backgroundColor: '#e5e7eb',
        position: 'relative',
        flexShrink: 0,
    },
    toggleKnobOff: {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: 'white',
        position: 'absolute',
        top: '3px',
        left: '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    },
    toggleOn: {
        width: '44px',
        height: '24px',
        borderRadius: '999px',
        backgroundColor: '#38bdf8',
        position: 'relative',
        flexShrink: 0,
    },
    toggleKnobOn: {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: 'white',
        position: 'absolute',
        top: '3px',
        right: '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    },
    applyBtn: {
        width: '100%',
        padding: '0.625rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
    auditCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    auditCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    auditIcon: {
        fontSize: '1rem',
        color: '#9ca3af',
    },
    auditItem: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #f9fafb',
    },
    auditDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        flexShrink: 0,
        marginTop: '4px',
    },
    auditTitle: {
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#111827',
        margin: '0 0 0.125rem 0',
    },
    auditDesc: {
        fontSize: '0.75rem',
        color: '#6b7280',
        margin: '0 0 0.125rem 0',
    },
    auditTime: {
        fontSize: '0.7rem',
        color: '#9ca3af',
        margin: 0,
    },
    viewAuditBtn: {
        width: '100%',
        padding: '0.625rem',
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
};