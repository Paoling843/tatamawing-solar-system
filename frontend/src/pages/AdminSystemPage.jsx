import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminHero from '../components/AdminHero';
import { adminUi, adminTokens } from '../styles/adminTheme';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateUserModal from '../components/CreateUserModal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { PlusIcon, ShieldIcon, UserIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { colors } from '../styles/theme';

// Users: every account (customers and admins), newest first, from
// GET /api/admin/users, creating and deleting accounts, and a link to the audit log.
export default function AdminSystemPage() {
    const navigate = useNavigate();
    const { user: me } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // The account waiting for "Delete" to be confirmed
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [creating, setCreating] = useState(false);
    const pager = usePagination(users, 10);
    const usersCardRef = useRef(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data || []);
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the user list. Please try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchUsers);
    }, [fetchUsers]);

    // The new account goes to the top of the list (it's the newest)
    const handleCreated = (user) => {
        setCreating(false);
        setError('');
        setUsers((list) => [user, ...list]);
        pager.setPage(1);
        setSuccess(`Account created for ${user.name}. Share their password with them; they can change it in My Profile.`);
    };

    const askDelete = (user) => {
        setError('');
        setSuccess('');
        setDeleteTarget(user);
    };

    // The server refuses with a reason (e.g. an unfinished installation),
    // shown in the page's error banner
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/users/${deleteTarget.id}`);
            setSuccess(`${deleteTarget.name}'s account was deleted.`);
            setUsers((list) => list.filter((u) => u.id !== deleteTarget.id));
        } catch (err) {
            setError(errorMessage(err, "Couldn't delete the account. Please try again."));
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const deleteMessage = (user) => (user?.role === 'admin'
        ? `They won't be able to log in anymore. Their past work stays. You can't undo this.`
        : `Their personal details and messages will be erased. Their quotations stay in your records. You can't undo this.`);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getRoleStyle = (role) => {
        if (role === 'admin') {
            return { backgroundColor: '#E3F1E8', color: '#1F6B45' };
        }
        return { backgroundColor: '#E6EFF9', color: '#1F4E80' };
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            customer: 'Customer',
        };
        return labels[role] || role;
    };

    const customerCount = users.filter((user) => user.role === 'customer').length;

    const formatJoined = (value) => (value
        ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—');

    return (
        <AdminLayout active="Users">

            <AdminHero
                eyebrow="Manage"
                title="Users"
                subtitle="Everyone with an account, newest first"
                actions={
                    <button
                        type="button"
                        className="btn-primary"
                        style={styles.createUserBtn}
                        onClick={() => {
                            setSuccess('');
                            setCreating(true);
                        }}
                    >
                        <PlusIcon size={16} color="currentColor" />
                        Create user
                    </button>
                }
            />

            {error && <div role="alert" style={styles.error}>{error}</div>}
            {success && <div role="status" style={styles.success}>{success}</div>}

            <div className="content-grid-sidebar" style={styles.contentGrid}>

                <div ref={usersCardRef} style={styles.usersCard}>
                    <h2 style={styles.sectionTitle}>All users</h2>

                    {loading ? (
                        <LoadingState label="Loading users..." />
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={<UserIcon size={32} color={colors.textFaint} />}
                            title="No users found"
                            description="Accounts appear here as soon as someone registers."
                        />
                    ) : (
                        <div>
                            <div className="scroll-x">
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th scope="col" style={{ ...styles.th, paddingLeft: '20px' }}>User</th>
                                            <th scope="col" style={styles.th}>Role</th>
                                            <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Requests</th>
                                            <th scope="col" style={styles.th}>Joined</th>
                                            <th scope="col" style={{ ...styles.th, paddingRight: '20px' }}>
                                                <span style={styles.srOnly}>Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pager.pageItems.map((user) => (
                                            <tr key={user.id}>
                                                <td style={{ ...styles.td, paddingLeft: '20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                        <div style={{
                                                            ...styles.userAvatar,
                                                            ...(user.role === 'admin' ? styles.userAvatarAdmin : {}),
                                                        }}>
                                                            {getInitials(user.name)}
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <p style={styles.userName}>{user.name}</p>
                                                            <p style={styles.userEmail}>{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td style={styles.td}>
                                                    <span style={{ ...styles.roleBadge, ...getRoleStyle(user.role) }}>
                                                        {getRoleLabel(user.role)}
                                                    </span>
                                                </td>

                                                <td style={{
                                                    ...styles.td,
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                    color: user.quotation_requests_count ? adminTokens.ink : adminTokens.faint,
                                                }}>
                                                    {user.quotation_requests_count == null
                                                        ? '—'
                                                        : `${user.quotation_requests_count} ${user.quotation_requests_count === 1 ? 'request' : 'requests'}`}
                                                </td>

                                                <td style={{ ...styles.td, color: '#3A4440', whiteSpace: 'nowrap' }}>
                                                    {formatJoined(user.created_at)}
                                                </td>

                                                <td style={{ ...styles.td, paddingRight: '20px', textAlign: 'right' }}>
                                                    {user.id === me?.id ? (
                                                        <span style={styles.youLabel}>You</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => askDelete(user)}
                                                            style={styles.deleteBtn}
                                                            aria-label={`Delete ${user.name}'s account`}
                                                        >
                                                            <TrashIcon size={14} color="currentColor" />
                                                            <span>Delete</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination {...pager} noun="users" onChange={pager.setPage} scrollTarget={usersCardRef} style={styles.pager} />

                            <div style={styles.listFooter}>
                                {users.length} {users.length === 1 ? 'user' : 'users'} in total
                                {' · '}{customerCount} {customerCount === 1 ? 'customer' : 'customers'}, {users.length - customerCount} {users.length - customerCount === 1 ? 'admin' : 'admins'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.auditCard}>
                    <div style={styles.auditCardHeader}>
                        <span style={styles.auditIcon}>
                            <ShieldIcon size={17} color="currentColor" />
                        </span>
                        <h2 style={styles.auditTitle}>Audit log</h2>
                    </div>
                    <p style={styles.auditDesc}>
                        Approvals, rejections, schedule changes and setting changes, with who made them and when.
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
            <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={handleCreated} />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title={`Delete ${deleteTarget?.name}'s account?`}
                message={deleteMessage(deleteTarget)}
                confirmLabel={deleting ? 'Deleting…' : 'Delete account'}
                danger
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </AdminLayout>
    );
}

const styles = {
    createUserBtn: adminUi.goldBtn,
    error: adminUi.errorBanner,
    success: {
        ...adminUi.errorBanner,
        backgroundColor: colors.successTint,
        color: '#166534',
        border: '1px solid #bbf7d0',
    },
    deleteBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 10px',
        border: '1px solid transparent',
        borderRadius: adminTokens.radius,
        backgroundColor: 'transparent',
        color: '#B42318',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    youLabel: { fontSize: '13px', fontWeight: 600, color: adminTokens.muted },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '20px',
        alignItems: 'start',
    },
    usersCard: { ...adminUi.card, minWidth: 0 },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: adminTokens.ink,
        margin: 0,
        padding: '16px 20px',
    },
    table: { width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
        ...adminUi.tableHead,
        textAlign: 'left',
        padding: '9px 12px',
        borderTop: `1px solid ${adminTokens.line}`,
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    td: { padding: '12px', borderBottom: `1px solid ${adminTokens.rowLine}`, verticalAlign: 'middle' },
    srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' },
    userAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#E3F1E8',
        color: adminTokens.green,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        flexShrink: 0,
    },
    userAvatarAdmin: { backgroundColor: '#FBEBC4', color: '#6B4500' },
    userName: {
        fontSize: '14px',
        fontWeight: 600,
        color: adminTokens.ink,
        margin: 0,
    },
    userEmail: {
        fontSize: '13px',
        color: adminTokens.muted,
        margin: 0,
        overflowWrap: 'anywhere',
    },
    roleBadge: {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    pager: { padding: '12px 20px 0' },
    listFooter: {
        padding: '12px 20px 14px',
        fontSize: '13px',
        color: adminTokens.muted,
    },
    auditCard: {
        ...adminUi.card,
        padding: '18px 20px',
    },
    auditCardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
    },
    auditTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: adminTokens.ink,
        margin: 0,
    },
    auditIcon: {
        width: '32px',
        height: '32px',
        borderRadius: adminTokens.radius,
        backgroundColor: '#FBEBC4',
        color: '#7A4F00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
    },
    auditDesc: {
        fontSize: '14px',
        lineHeight: 1.45,
        color: adminTokens.muted,
        margin: '0 0 12px 0',
    },
    viewAuditBtn: {
        width: '100%',
        height: '38px',
        backgroundColor: 'white',
        color: adminTokens.ink,
        border: '1px solid #D6D6D0',
        borderRadius: adminTokens.radius,
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
};
