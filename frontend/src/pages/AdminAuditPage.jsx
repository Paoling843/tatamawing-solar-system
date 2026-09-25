import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';
import { ShieldIcon, ClockIcon, UserIcon, FileTextIcon } from '../components/Icons';

const statusColor = {
    quotation_approved: '#16a34a',
    quotation_rejected: '#dc2626',
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
            } catch {
                setError('Failed to load audit logs.');
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
                        <ShieldIcon size={18} color="#0f172a" />
                        <h2 style={styles.cardTitle}>Security Activity</h2>
                    </div>
                </div>

                {loading ? (
                    <div style={styles.loading}>Loading activity...</div>
                ) : logs.length === 0 ? (
                    <div style={styles.empty}>No audit activity recorded yet.</div>
                ) : (
                    <div style={styles.tableWrap}>
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
                                            backgroundColor: statusColor[log.action] || '#64748b',
                                            color: '#fff',
                                        }}
                                    >
                                        {formatAction(log.action)}
                                    </span>
                                </div>

                                <div style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <UserIcon size={14} color="#64748b" />
                                    <span style={styles.metaText}>{log.actor_id || 'System'}</span>
                                </div>

                                <div style={{ flex: 1.8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileTextIcon size={14} color="#64748b" />
                                    <span style={styles.metaText}>{log.target_label || 'N/A'}</span>
                                </div>

                                <div style={{ flex: 2.2, color: '#374151', fontSize: 14 }}>
                                    {log.description || 'No description provided.'}
                                </div>

                                <div style={{ flex: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ClockIcon size={14} color="#64748b" />
                                    <span style={styles.metaText}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
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
    pageTitle: {
        margin: 0,
        fontSize: 32,
        fontWeight: 800,
        color: '#0f172a',
    },
    pageSubtitle: {
        margin: '8px 0 0',
        color: '#64748b',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
    },
    cardHeader: {
        padding: '18px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
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
        color: '#0f172a',
    },
    tableWrap: {
        display: 'flex',
        flexDirection: 'column',
    },
    tableHeader: {
        display: 'flex',
        gap: 12,
        padding: '14px 20px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        color: '#475569',
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
        color: '#475569',
        fontSize: 13,
    },
    loading: {
        padding: 28,
        textAlign: 'center',
        color: '#64748b',
    },
    empty: {
        padding: 30,
        textAlign: 'center',
        color: '#64748b',
    },
    error: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 16,
    },
};
