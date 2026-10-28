import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState from '../components/LoadingState';
import { adminText, adminUi } from '../styles/adminTheme';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { ShieldIcon, ClockIcon, UserIcon, FileTextIcon } from '../components/Icons';

const statusColor = {
    quotation_approved: '#16a34a',
    quotation_rejected: '#a4302a',
    schedule_created: '#2563eb',
    purchase_confirmed: '#7c3aed',
    faq_created: '#f59e0b',
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

    const formatAction = (action) => action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

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
                                    <span
                                        style={{
                                            ...styles.badge,
                                            backgroundColor: statusColor[log.action] || '#5d6862',
                                            color: '#fff',
                                        }}
                                    >
                                        {formatAction(log.action)}
                                    </span>
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
    badge: {
        display: 'inline-flex',
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
    },
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
