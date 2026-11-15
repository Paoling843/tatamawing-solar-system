import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import AdminHero, { FilterTiles } from '../components/AdminHero';
import LoadingState from '../components/LoadingState';
import Pagination from '../components/Pagination';
import { adminTokens, adminUi } from '../styles/adminTheme';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';

// Filter groups, in tile order. The server decides which group an action
// belongs to (AuditLogController::GROUPS) and sends the counts.
//   dot      the badge dot on white;  darkDot  the tile dot on the green banner
const GROUPS = [
    { id: 'approved', label: 'Approved', dot: '#2E8B5E', darkDot: '#A8D5C2', bg: '#E3F1E8', fg: '#1F6B45' },
    { id: 'rejected', label: 'Rejected', dot: '#C8372B', darkDot: '#F08A7E', bg: '#FBE4E1', fg: '#A3261B' },
    { id: 'scheduling', label: 'Scheduling', dot: '#3F7CC0', darkDot: '#8EC1EE', bg: '#E6EFF9', fg: '#1F4E80' },
    { id: 'customer', label: 'From customers', dot: '#D49A23', darkDot: '#F2C14E', bg: '#FBEBC4', fg: '#6B4500' },
    { id: 'deleted', label: 'Deleted', dot: '#A4410E', darkDot: '#E8A06E', bg: '#FBE9DD', fg: '#8A3A0C' },
    { id: 'content', label: 'Settings', dot: '#6B7570', darkDot: '#B9C4BE', bg: '#EEEFEC', fg: '#3A4440' },
];
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((group) => [group.id, group]));

// Shorter wording for the long action names; others are spelled out
const ACTION_LABEL = {
    external_installation_confirmed: 'External request confirmed',
    external_installation_rejected: 'External request rejected',
    installation_schedule_created: 'Schedule created',
    installation_schedule_updated: 'Schedule updated',
    installation_schedule_status_updated: 'Schedule status changed',
    inbox_settings_updated: 'Inbox settings changed',
    prices_updated: 'Prices changed',
    user_deleted: 'Account deleted',
    user_created: 'Account created',
    quotation_cancelled: 'Quotation cancelled',
};

// Under the person's name in the "Done by" column
const ROLE_LABEL = { admin: 'Admin', customer: 'Customer' };

const formatAction = (action) => ACTION_LABEL[action]
    ?? action.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());

const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const timeLabel = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default function AdminAuditPage() {
    const [logs, setLogs] = useState([]);
    // The server sends one page at a time (25 rows, newest first)
    const [page, setPage] = useState(1);
    const [group, setGroup] = useState('all');
    const [meta, setMeta] = useState({ pageCount: 1, from: 0, to: 0, total: 0 });
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    // Turning the page keeps the current rows on screen, dimmed, until the next ones arrive
    const [pageLoading, setPageLoading] = useState(false);
    const [error, setError] = useState('');
    const cardRef = useRef(null);

    useEffect(() => {
        let ignore = false; // a newer page was asked for before this one arrived

        const fetchLogs = async () => {
            setPageLoading(true);
            try {
                const response = await api.get('/admin/audit-logs', {
                    params: { page, ...(group === 'all' ? {} : { group }) },
                });
                if (ignore) return;
                const body = response.data || {};
                setLogs(body.data || []);
                setMeta({
                    pageCount: body.last_page || 1,
                    from: body.from || 0,
                    to: body.to || 0,
                    total: body.total || 0,
                });
                setCounts(body.counts || {});
                setError('');
            } catch (err) {
                if (!ignore) setError(errorMessage(err, "Couldn't load the audit log. Please try again."));
            } finally {
                if (!ignore) {
                    setLoading(false);
                    setPageLoading(false);
                }
            }
        };

        fetchLogs();
        return () => { ignore = true; };
    }, [page, group]);

    // A new filter starts from its first page
    const pickGroup = (id) => {
        setGroup(id);
        setPage(1);
    };

    // Rows grouped under a heading per day, in the order they arrive
    const days = [];
    logs.forEach((log) => {
        const label = dayLabel(log.created_at);
        const last = days[days.length - 1];
        if (last && last.label === label) last.rows.push(log);
        else days.push({ label, rows: [log] });
    });

    const tiles = [
        { key: 'all', label: 'All', dot: '#FFFFFF', count: counts.all ?? 0 },
        ...GROUPS.map((g) => ({ key: g.id, label: g.label, dot: g.darkDot, count: counts[g.id] ?? 0 })),
    ];

    return (
        <AdminLayout active="Audit log">
            <AdminHero
                eyebrow="Manage"
                title="Audit log"
                subtitle="Admin actions and system events, newest first"
            >
                <FilterTiles label="Filter by type" options={tiles} value={group} onChange={pickGroup} />
            </AdminHero>

            {error && <div style={styles.error}>{error}</div>}

            <section ref={cardRef} style={styles.card}>
                {loading ? (
                    <LoadingState label="Loading activity..." />
                ) : (
                    <>
                        <div
                            className="scroll-x"
                            aria-busy={pageLoading}
                            style={{ opacity: pageLoading ? 0.55 : 1, transition: 'opacity 120ms ease' }}
                        >
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.headRow}>
                                        <th scope="col" style={{ ...styles.th, paddingLeft: '20px', width: '110px' }}>Time</th>
                                        <th scope="col" style={{ ...styles.th, width: '230px' }}>Action</th>
                                        <th scope="col" style={{ ...styles.th, width: '160px' }}>Done by</th>
                                        <th scope="col" style={{ ...styles.th, width: '250px' }}>Record</th>
                                        <th scope="col" style={{ ...styles.th, paddingRight: '20px' }}>Details</th>
                                    </tr>
                                </thead>
                                {days.map((day) => (
                                    <tbody key={day.label}>
                                        <tr>
                                            <th scope="rowgroup" colSpan={5} style={styles.dayHeading}>{day.label}</th>
                                        </tr>
                                        {day.rows.map((log) => {
                                            const tone = GROUP_BY_ID[log.group] || GROUP_BY_ID.content;
                                            return (
                                                <tr key={log.id}>
                                                    <td style={{ ...styles.td, paddingLeft: '20px', color: adminTokens.muted, whiteSpace: 'nowrap' }}>
                                                        {timeLabel(log.created_at)}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ ...styles.badge, background: tone.bg, color: tone.fg }}>
                                                            <span aria-hidden="true" style={{ ...styles.badgeDot, background: tone.dot }} />
                                                            {formatAction(log.action)}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={{ fontWeight: 600 }}>
                                                            {log.actor_name || (log.actor_id ? `User #${log.actor_id}` : 'System')}
                                                        </div>
                                                        {log.actor_role && (
                                                            <div style={styles.subText}>{ROLE_LABEL[log.actor_role] || log.actor_role}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ ...styles.td, fontWeight: 600, color: adminTokens.green }}>
                                                        {log.target_label || 'N/A'}
                                                    </td>
                                                    <td style={{ ...styles.td, paddingRight: '20px', color: adminTokens.body }}>
                                                        {log.description || 'No description provided.'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                ))}
                            </table>
                        </div>

                        {logs.length === 0 && (
                            <p style={styles.empty}>
                                {group === 'all' ? 'No audit activity recorded yet.' : 'No events of this type.'}
                            </p>
                        )}

                        <Pagination
                            page={page}
                            {...meta}
                            noun="entries"
                            onChange={setPage}
                            scrollTarget={cardRef}
                            style={styles.pager}
                        />
                    </>
                )}
            </section>
        </AdminLayout>
    );
}

const styles = {
    error: adminUi.errorBanner,
    card: { ...adminUi.card, minHeight: '520px' },
    table: { width: '100%', minWidth: '960px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '14px' },
    headRow: { ...adminUi.tableHead },
    th: {
        textAlign: 'left',
        fontWeight: 600,
        padding: '10px 12px',
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    dayHeading: {
        textAlign: 'left',
        padding: '10px 20px 6px',
        fontSize: '13px',
        fontWeight: 700,
        color: adminTokens.body,
        borderBottom: `1px solid ${adminTokens.rowLine}`,
        background: '#FFFFFF',
        textTransform: 'none',
        letterSpacing: 0,
    },
    td: {
        padding: '12px',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
        verticalAlign: 'top',
        overflowWrap: 'anywhere',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: '4px',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
    },
    badgeDot: { width: '6px', height: '6px', borderRadius: '50%', flex: 'none' },
    subText: { fontSize: '13px', color: adminTokens.muted },
    empty: { margin: 0, padding: '28px 20px', textAlign: 'center', color: adminTokens.muted },
    pager: { padding: '12px 20px 16px' },
};
