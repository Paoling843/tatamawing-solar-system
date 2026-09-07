import { useState, useEffect, Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { colors, typography, radii } from '../styles/theme';
import { CalendarIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';

export default function CustomerSchedulePage() {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Tracks which row's action menu / expanded details are open
    const [openMenuId, setOpenMenuId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);


    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/customer/schedules');
            setSchedules(res.data);
        } catch {
            setError('Failed to load your installation schedules.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchSchedules);
    }, [fetchSchedules]);

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

        const scheduled = new Date(dateString);
        scheduled.setHours(0, 0, 0, 0);

        const diffTime = scheduled - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
        return `In ${diffDays} days`;
    };

    // Builds a reference number the same way CustomerDownloadsPage does,
    // using the linked quotation request's id + created_at.
    // NOTE: assumes schedule.quotation.quotation_request has id & created_at —
    // adjust the field paths here if your schema differs.
    const formatReference = (id, createdAt) => {
        if (!id || !createdAt) return '—';
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(id).padStart(3, '0');
        return `#Q-${year}-${paddedId}`;
    };

    const getSystemType = (schedule) => {
        const type = schedule.quotation?.quotation_request?.solar_system_type;
        if (!type) return '—';
        return type.toUpperCase();
    };

    const getDayAbbrev = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
    };

    // Derives the install status badge purely from scheduled_date vs today,
    // since installation_schedules has no separate status column.
    const getInstallStatus = (dateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const scheduled = new Date(dateString);
        scheduled.setHours(0, 0, 0, 0);

        const diffDays = Math.round((scheduled - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const daysAgo = Math.abs(diffDays);
            return {
                completed: true,
                label: `Installed ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
                subtitle: `Completed on ${formatDate(dateString)}`,
            };
        }

        if (diffDays === 0) {
            return { completed: false, label: 'Installation today', subtitle: `Scheduled for ${formatDate(dateString)}` };
        }

        if (diffDays === 1) {
            return { completed: false, label: 'Installation in 1 day', subtitle: `Scheduled for ${formatDate(dateString)}` };
        }

        return {
            completed: false,
            label: `Installation in ${diffDays} days`,
            subtitle: `Scheduled for ${formatDate(dateString)}`,
        };
    };

    const toggleMenu = (id) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const toggleDetails = (id) => {
        setExpandedId(expandedId === id ? null : id);
        setOpenMenuId(null);
    };

    return (
        <CustomerLayout active="Installation Schedule">
            <div style={styles.card}>
                <h1 style={styles.pageTitle}>Installation Schedule</h1>
                <p style={styles.pageSubtitle}>
                    View your upcoming and completed solar installations.
                </p>

                {/* Show error message if fetch failed */}
                {error && <div style={styles.error}>{error}</div>}

                {loading ? (
                    <LoadingState label="Loading your schedule..." />
                ) : schedules.length === 0 ? (
                    // Empty state
                    <div style={styles.emptyState}>
                        <h3 style={styles.emptyTitle}>No Installation Scheduled Yet</h3>
                        <p style={styles.emptyDesc}>
                            Your installation will be scheduled by TataMawing after
                            your quotation is approved and materials are confirmed.
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/quotation/new')}
                            style={styles.emptyBtn}
                        >
                            Submit a Quotation
                        </button>
                    </div>
                ) : (
                    <div className="table-scroll">
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>REFERENCE</th>
                                <th style={styles.th}>SYSTEM TYPE</th>
                                <th style={styles.th}>INSTALLATION DATE</th>
                                <th style={styles.th}>INSTALLATION STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((schedule) => {
                                const requestId = schedule.quotation?.quotation_request?.id;
                                const createdAt = schedule.quotation?.quotation_request?.created_at;
                                const status = getInstallStatus(schedule.scheduled_date);

                                return (
                                    <Fragment key={schedule.id}>
                                        <tr style={styles.tr}>
                                            <td style={styles.td}>
                                                {formatReference(requestId, createdAt)}
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.systemBadge}>
                                                    {getSystemType(schedule)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.dateCell}>
                                                    <CalendarIcon size={15} color={colors.textMuted} />
                                                    <div>
                                                        <div style={styles.dateText}>
                                                            {formatDate(schedule.scheduled_date)}
                                                        </div>
                                                        <div style={styles.dateSub}>
                                                            ({getDayAbbrev(schedule.scheduled_date)})
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div
                                                    style={{
                                                        ...styles.statusBox,
                                                        ...(status.completed
                                                            ? styles.statusBoxCompleted
                                                            : styles.statusBoxUpcoming),
                                                    }}
                                                >
                                                    <div style={styles.statusHeader}>
                                                        {status.completed ? (
                                                            <CheckCircleIcon size={15} color={colors.success} />
                                                        ) : (
                                                            <ClockIcon size={15} color={colors.orange} />
                                                        )}
                                                        <span
                                                            style={{
                                                                ...styles.statusLabel,
                                                                color: status.completed ? colors.success : colors.orange,
                                                            }}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div style={styles.statusSub}>{status.subtitle}</div>
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'right', position: 'relative' }}>
                                                <button
                                                    onClick={() => toggleMenu(schedule.id)}
                                                    style={styles.menuBtn}
                                                    aria-label="Actions"
                                                >
                                                    ⋮
                                                </button>
                                                {openMenuId === schedule.id && (
                                                    <div style={styles.menuDropdown}>
                                                        <button
                                                            style={styles.menuItem}
                                                            onClick={() => toggleDetails(schedule.id)}
                                                        >
                                                            {expandedId === schedule.id
                                                                ? 'Hide Details'
                                                                : 'View Details'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {expandedId === schedule.id && (
                                            <tr key={`${schedule.id}-details`}>
                                                <td colSpan={5} style={styles.detailsCell}>
                                                    <div className="responsive-grid-4" style={styles.detailsGrid}>
                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>
                                                                Days Until Installation
                                                            </span>
                                                            <span style={styles.detailValue}>
                                                                {getDaysUntil(schedule.scheduled_date)}
                                                            </span>
                                                        </div>

                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>
                                                                Assigned Technician
                                                            </span>
                                                            <span style={styles.detailValue}>
                                                                {schedule.assigned_technician || '—'}
                                                            </span>
                                                        </div>

                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>
                                                                Installation Location
                                                            </span>
                                                            <span style={styles.detailValue}>
                                                                {schedule.quotation?.quotation_request
                                                                    ?.customer?.install_location || '—'}
                                                            </span>
                                                        </div>

                                                        <div style={styles.detailItem}>
                                                            <span style={styles.detailLabel}>
                                                                Total Amount
                                                            </span>
                                                            <span
                                                                style={{
                                                                    ...styles.detailValue,
                                                                    color: colors.primary,
                                                                    fontWeight: '700',
                                                                }}
                                                            >
                                                                {schedule.quotation?.total_amount
                                                                    ? `₱${parseFloat(
                                                                          schedule.quotation.total_amount
                                                                      ).toLocaleString('en-PH', {
                                                                          minimumFractionDigits: 2,
                                                                          maximumFractionDigits: 2,
                                                                      })}`
                                                                    : '—'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={styles.reminder}>
                                                        <strong>Reminder:</strong> Please make sure
                                                        someone is home on the scheduled date. The
                                                        technician will contact you before arriving.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
        </CustomerLayout>
    );
}

// Styles
const styles = {
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        padding: '1.5rem 2rem 2rem',
    },
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        ...typography.body,
        color: colors.textMuted,
        marginBottom: '1.5rem',
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
    emptyState: {
        textAlign: 'center',
        padding: '3rem 1rem',
    },
    emptyTitle: {
        fontSize: '1.125rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    emptyDesc: {
        color: '#6b7280',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
        maxWidth: '400px',
        margin: '0 auto 1.5rem auto',
    },
    emptyBtn: {
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        padding: '0.75rem 0.5rem',
        borderBottom: '1px solid #f3f4f6',
    },
    tr: {
        borderBottom: '1px solid #f3f4f6',
    },
    td: {
        padding: '1rem 0.5rem',
        fontSize: '0.9375rem',
        color: '#111827',
    },
    systemBadge: {
        display: 'inline-block',
        fontSize: '0.7rem',
        fontWeight: '700',
        color: colors.primary,
        backgroundColor: colors.primaryTint,
        padding: '0.3rem 0.75rem',
        borderRadius: radii.pill,
        letterSpacing: '0.02em',
    },
    dateCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    dateText: {
        fontSize: '0.9375rem',
        color: '#111827',
    },
    dateSub: {
        fontSize: '0.75rem',
        color: colors.textMuted,
    },
    statusBox: {
        display: 'inline-block',
        minWidth: '220px',
        borderRadius: '8px',
        border: '1px solid',
        padding: '0.5rem 0.75rem',
    },
    statusBoxCompleted: {
        backgroundColor: colors.successTint,
        borderColor: '#bbf7d0',
    },
    statusBoxUpcoming: {
        backgroundColor: colors.orangeTint,
        borderColor: '#fed7aa',
    },
    statusHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
    },
    statusLabel: {
        fontSize: '0.875rem',
        fontWeight: '700',
    },
    statusSub: {
        fontSize: '0.75rem',
        color: colors.textMuted,
        marginTop: '0.15rem',
        marginLeft: '1.375rem',
    },
    menuBtn: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.25rem',
        color: '#6b7280',
        lineHeight: 1,
    },
    menuDropdown: {
        position: 'absolute',
        right: '0.5rem',
        top: '100%',
        backgroundColor: 'white',
        border: '1px solid #f3f4f6',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 10,
        minWidth: '140px',
    },
    menuItem: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        padding: '0.625rem 0.875rem',
        fontSize: '0.875rem',
        color: '#111827',
        cursor: 'pointer',
    },
    detailsCell: {
        backgroundColor: '#f9fafb',
        padding: '1.25rem',
        borderBottom: '1px solid #f3f4f6',
    },
    detailsGrid: {
        marginBottom: '1rem',
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
        fontSize: '0.9375rem',
        color: '#111827',
        fontWeight: '500',
    },
    reminder: {
        backgroundColor: '#fefce8',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.8125rem',
        color: '#92400e',
    },
};
