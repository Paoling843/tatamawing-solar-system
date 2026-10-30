import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState from '../components/LoadingState';
import Badge from '../components/Badge';
import { adminText, adminUi } from '../styles/adminTheme';
import { statusColors } from '../styles/theme';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { ShieldIcon, ClockIcon, UserIcon, FileTextIcon } from '../components/Icons';

// Colour groups for the action badges, in legend order. `tone` is a
// statusColors key, so the colours match the status pills on other pages.
const GROUPS = [
    { id: 'approved', label: 'Approved / confirmed', tone: 'approved' },
    { id: 'rejected', label: 'Rejected', tone: 'rejected' },
    { id: 'scheduling', label: 'Scheduling', tone: 'scheduled' },
    { id: 'customer', label: 'New from customers', tone: 'pending' },
    { id: 'deleted', label: 'Deleted', tone: 'partially_available' },
    { id: 'content', label: 'Content & settings', tone: 'draft' },
];
const TONE_OF = Object.fromEntries(GROUPS.map((group) => [group.id, group.tone]));

// Every action the backend logs (AuditLogger::log calls)
const ACTION_GROUP = {
    quotation_approved: 'approved',
    external_installation_confirmed: 'approved',
    quotation_rejected: 'rejected',
    external_installation_rejected: 'rejected',
    installation_schedule_created: 'scheduling',
    installation_schedule_updated: 'scheduling',
    installation_schedule_status_updated: 'scheduling',
    quotation_created: 'customer',
    quotation_submitted: 'customer',
    faq_deleted: 'deleted',
    faq_created: 'content',
    faq_updated: 'content',
    inbox_settings_updated: 'content',
};

// Actions added later still get a sensible colour from their name
const groupOf = (action) => ACTION_GROUP[action] ?? (
    /approved|confirmed/.test(action) ? 'approved'
        : /rejected/.test(action) ? 'rejected'
            : /schedule/.test(action) ? 'scheduling'
                : /deleted/.test(action) ? 'deleted'
                    : 'content'
);

// Shorter wording for the long action names; others are spelled out
const ACTION_LABEL = {
    external_installation_confirmed: 'External request confirmed',
    external_installation_rejected: 'External request rejected',
    installation_schedule_created: 'Schedule created',
    installation_schedule_updated: 'Schedule updated',
    installation_schedule_status_updated: 'Schedule status changed',
    inbox_settings_updated: 'Inbox settings changed',
};

export default function AdminAuditPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await api.get('/admin/audit-logs');
                setLogs(response.data || []);
            } catch (err) {
                setError(errorMessage(err, "Couldn't load the audit log. Please try again."));
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const formatAction = (action) => ACTION_LABEL[action]
        ?? action.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());

    return (
        <AdminLayout active="Audit Log">
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Audit Log</h1>
                    <p style={styles.pageSubtitle}>Track important admin actions and system events.</p>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={styles.headerTitleWrap}>
                        <ShieldIcon size={18} color="#16211c" />
                        <h2 style={styles.cardTitle}>Security Activity</h2>
                    </div>
                    <ul style={styles.legend} aria-label="Colour key">
                        {GROUPS.map((group) => (
                            <li key={group.id} style={styles.legendItem}>
                                <span
                                    aria-hidden="true"
                                    style={{ ...styles.legendDot, backgroundColor: statusColors[group.tone].text }}
                                />
                                {group.label}
                            </li>
                        ))}
                    </ul>
                </div>

                {loading ? (
                    <LoadingState label="Loading activity..." />
                ) : logs.length === 0 ? (
                    <div style={styles.empty}>No audit activity recorded yet.</div>
                ) : (
                    // Five columns don't fit a phone: scroll sideways inside the card instead
                    <div className="scroll-x">
                    <div style={{ ...styles.tableWrap, minWidth: '760px' }}>
                        <div style={styles.tableHeader}>
                            <span style={{ flex: 1.5 }}>Action</span>
                            <span style={{ flex: 1.4 }}>User</span>
                            <span style={{ flex: 1.8 }}>Target</span>
                            <span style={{ flex: 2.2 }}>Description</span>
                            <span style={{ flex: 1.2 }}>Time</span>
                        </div>

                        {logs.map((log) => (
                            <div key={log.id} style={styles.row}>
                                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Badge status={TONE_OF[groupOf(log.action)]} label={formatAction(log.action)} />
                                </div>

                                <div style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <UserIcon size={14} color="#5d6862" />
                                    <span style={styles.metaText}>{log.actor_id || 'System'}</span>
                                </div>

                                <div style={{ flex: 1.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileTextIcon size={14} color="#5d6862" />
                                    <span style={styles.metaText}>{log.target_label || 'N/A'}</span>
                                </div>

                                <div style={{ flex: 2.2, color: '#293530', fontSize: 14 }}>
                                    {log.description || 'No description provided.'}
                                </div>

                                <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ClockIcon size={14} color="#5d6862" />
                                    <span style={styles.metaText}>
                                        {new Date(log.created_at).toLocaleString('en-PH', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                            hour: 'numeric', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    pageTitle: adminText.pageTitle,
    pageSubtitle: adminText.pageSubtitle,
    card: {
        backgroundColor: '#fff',
        border: '1px solid #e6e8e2',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
        ...adminUi.cardAccent,
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px 24px',
        padding: '18px 20px',
        borderBottom: '1px solid #e6e8e2',
        backgroundColor: '#f9faf8',
    },
    headerTitleWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#16211c',
        ...adminUi.titleMarker,
    },
    tableWrap: {
        display: 'flex',
        flexDirection: 'column',
    },
    tableHeader: {
        display: 'flex',
        gap: 12,
        padding: '14px 20px',
        borderBottom: '1px solid #e6e8e2',
        ...adminUi.tableHead,
        // Runs edge to edge across the card, so no rounded corners
        borderRadius: 0,
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    row: {
        display: 'flex',
        gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid #edf2f7',
        alignItems: 'center',
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 16px',
        margin: 0,
        padding: 0,
        listStyle: 'none',
    },
    legendItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        color: '#4f5a54',
        whiteSpace: 'nowrap',
    },
    legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
    metaText: {
        color: '#4f5a54',
        fontSize: 13,
    },
    empty: {
        padding: 30,
        textAlign: 'center',
        color: '#5d6862',
    },
    error: adminUi.errorBanner,
};
