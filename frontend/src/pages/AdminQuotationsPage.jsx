import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import { adminTokens } from '../styles/adminTheme';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';

const APPLIANCE_COLUMNS = 'minmax(0,1.6fr) minmax(36px,0.5fr) minmax(48px,0.7fr) minmax(56px,0.95fr)';

const NOW_MS = Date.now();

const daysAgo = (dateStr) => {
    if (!dateStr) return 0;
    const diff = NOW_MS - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
};

const formatReference = (id, createdAt) => {
    const year = new Date(createdAt).getFullYear();
    const paddedId = String(id).padStart(3, '0');
    return `#Q-${year}-${paddedId}`;
};

const formatMonthDay = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatFullDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
});

const formatPeso0 = (amount) => '₱' + Math.round(amount || 0).toLocaleString('en-PH');

const getValue = (q) => parseFloat(q.quotation?.total_amount ?? q.solar_computation?.estimated_cost ?? 0) || 0;

const getCapacity = (q) => {
    const kw = q.solar_computation?.panel_capacity_kw;
    if (!kw) return 'N/A';
    return `${parseFloat(kw).toFixed(2)} kW`;
};

const waitingLabel = (q) => {
    const age = daysAgo(q.created_at);
    if (age === 0) return 'Today';
    return `${age} day${age === 1 ? '' : 's'}`;
};

const ageLabelFor = (q) => {
    const age = daysAgo(q.created_at);
    if (age === 0) return 'today';
    if (q.status === 'pending') return `${age}d`;
    return formatMonthDay(q.created_at);
};

const dailyWh = (item) => (Number(item.wattage) || 0) * (Number(item.quantity) || 0) * (Number(item.usage_hours_per_day) || 0);

function StatusPill({ status }) {
    const map = {
        pending: { bg: '#fdf4dc', text: '#8a6a12', border: '#f3e3ad' },
        approved: { bg: '#e4ede8', text: '#0f3b2c', border: '#cfe0d7' },
        rejected: { bg: '#fbeae7', text: '#a4302a', border: '#f0d0cb' },
    };
    const c = map[status] || map.pending;
    return (
        <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '11.5px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            backgroundColor: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
        }}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
        </span>
    );
}

function FigureCell({ label, value, mono, color, danger }) {
    return (
        <div style={styles.figureCell}>
            <div style={styles.figureLabel}>{label}</div>
            <div style={{
                ...styles.figureValue,
                ...(mono ? styles.figureValueMono : {}),
                ...(color ? { color } : {}),
                ...(danger ? { color: adminTokens.danger } : {}),
            }}>
                {value}
            </div>
        </div>
    );
}

export default function AdminQuotationsPage() {
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const [schedules, setSchedules] = useState([]);

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('newest');
    const [searchValue, setSearchValue] = useState('');
    const [selectedId, setSelectedId] = useState(null);

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/quotation-requests');
            setQuotations(res.data);
        } catch {
            setError('Failed to load quotation requests. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSchedules = useCallback(async () => {
        try {
            const res = await api.get('/admin/schedules');
            setSchedules(res.data);
        } catch {
            setSchedules([]);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(fetchQuotations);
        Promise.resolve().then(fetchSchedules);
    }, [fetchQuotations, fetchSchedules]);

    const updateQuotation = (updated) => {
        setQuotations((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
    };

    const handleApprove = async (quotation) => {
        setActionError('');
        try {
            const res = await api.post(`/admin/quotation-requests/${quotation.id}/approve`);
            updateQuotation(res.data.quotation_request);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to approve quotation.');
        }
    };

    const handleReject = async (quotation) => {
        const reason = window.prompt('Reason for rejecting this quotation:');
        if (!reason) return;
        setActionError('');
        try {
            const res = await api.post(`/admin/quotation-requests/${quotation.id}/reject`, {
                rejection_reason: reason,
            });
            updateQuotation(res.data.quotation_request);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to reject quotation.');
        }
    };

    const totalCount = quotations.length;
    const filterCounts = {
        all: totalCount,
        pending: quotations.filter((q) => q.status === 'pending').length,
        approved: quotations.filter((q) => q.status === 'approved').length,
        rejected: quotations.filter((q) => q.status === 'rejected').length,
    };

    const search = searchValue.trim().toLowerCase();

    const sortFn = (a, b) => {
        if (sortKey === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortKey === 'capacity') {
            const av = parseFloat(a.solar_computation?.panel_capacity_kw) || 0;
            const bv = parseFloat(b.solar_computation?.panel_capacity_kw) || 0;
            return bv - av;
        }
        return new Date(b.created_at) - new Date(a.created_at);
    };

    const filteredSorted = quotations
        .filter((q) => statusFilter === 'all' || q.status === statusFilter)
        .filter((q) => {
            if (!search) return true;
            const ref = formatReference(q.id, q.created_at).toLowerCase();
            const name = (q.customer?.user?.name || '').toLowerCase();
            const location = (q.customer?.install_location || '').toLowerCase();
            return ref.includes(search) || name.includes(search) || location.includes(search);
        })
        .sort(sortFn);

    const selected = selectedId
        ? (filteredSorted.find((q) => q.id === selectedId) || filteredSorted[0] || null)
        : null;

    const stepSelection = (delta) => {
        if (!filteredSorted.length) return;
        if (!selected) {
            setSelectedId(filteredSorted[0].id);
            return;
        }
        const idx = filteredSorted.findIndex((q) => q.id === selected.id);
        const nextIndex = (idx + delta + filteredSorted.length) % filteredSorted.length;
        setSelectedId(filteredSorted[nextIndex].id);
    };

    const totalDailyWh = selected
        ? (selected.appliance_items || []).reduce((sum, item) => sum + dailyWh(item), 0)
        : 0;

    const scheduledQuotationIds = new Set(schedules.map((s) => s.quotation_id).filter(Boolean));
    const selectedHasSchedule = !!(selected?.quotation?.id && scheduledQuotationIds.has(selected.quotation.id));

    return (
        <AdminLayout
            active="Quotations"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
        >
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.pageTitle}>Quotation Requests</h1>
                    <p style={styles.pageSubtitle}>Review and manage customer quotation requests</p>
                </div>

                <div style={styles.headerControls}>
                    <div style={styles.segmented}>
                        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                style={{
                                    ...styles.segmentBtn,
                                    ...(statusFilter === tab ? styles.segmentBtnActive : {}),
                                }}
                            >
                                <span>{tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                                <span style={{
                                    ...styles.segmentCount,
                                    ...(statusFilter === tab ? styles.segmentCountActive : {}),
                                }}>
                                    {filterCounts[tab]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div style={styles.sortBox}>
                        <span style={styles.sortLabel}>SORT</span>
                        {[
                            { key: 'newest', label: 'Newest' },
                            { key: 'oldest', label: 'Oldest' },
                            { key: 'capacity', label: 'Capacity' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setSortKey(opt.key)}
                                style={{
                                    ...styles.sortBtn,
                                    ...(sortKey === opt.key ? styles.sortBtnActive : {}),
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {actionError && <div style={styles.error}>{actionError}</div>}

            {loading ? (
                <LoadingState label="Loading quotation requests..." />
            ) : (
                <div style={styles.splitGrid}>

                    <div style={styles.listPanel}>
                        <div style={styles.listHeader}>
                            <span style={styles.listCount}>
                                {filteredSorted.length} OF {totalCount} REQUESTS
                            </span>
                            {filteredSorted.length > 1 && (
                                <div style={styles.stepButtons}>
                                    <button
                                        style={styles.stepBtn}
                                        onClick={() => stepSelection(-1)}
                                        aria-label="Previous request"
                                    >
                                        &#8593;
                                    </button>
                                    <button
                                        style={styles.stepBtn}
                                        onClick={() => stepSelection(1)}
                                        aria-label="Next request"
                                    >
                                        &#8595;
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={styles.listScroll}>
                            {filteredSorted.length === 0 ? (
                                <div style={styles.listEmpty}>No requests match this filter.</div>
                            ) : (
                                filteredSorted.map((q) => {
                                    const isSelected = selected?.id === q.id;
                                    const staleAge = q.status === 'pending' && daysAgo(q.created_at) >= 3;
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setSelectedId(q.id)}
                                            aria-pressed={isSelected}
                                            style={{
                                                ...styles.listRow,
                                                ...(isSelected ? styles.listRowSelected : {}),
                                                borderLeftColor: isSelected ? adminTokens.green : 'transparent',
                                            }}
                                        >
                                            <div style={styles.listRowMain}>
                                                <div style={styles.listRowTop}>
                                                    <span style={styles.listRowName}>
                                                        {q.customer?.user?.name || 'N/A'}
                                                    </span>
                                                    <StatusPill status={q.status} />
                                                </div>
                                                <div style={styles.listRowMeta}>
                                                    <span style={styles.listRowCapacity}>{getCapacity(q)}</span>
                                                    <span style={styles.listRowDivider} />
                                                    <span style={styles.listRowLocation}>
                                                        {q.customer?.install_location || ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <span style={{
                                                ...styles.listRowAge,
                                                ...(staleAge ? styles.listRowAgeDanger : {}),
                                            }}>
                                                {ageLabelFor(q)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={styles.detailPanel}>
                        {!selected ? (
                            <div style={styles.detailEmpty}>Select a request to review it.</div>
                        ) : (
                            <>
                                <div style={styles.detailHeader}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={styles.detailRef}>
                                            {formatReference(selected.id, selected.created_at)}
                                        </div>
                                        <h2 style={styles.detailName}>
                                            {selected.customer?.user?.name || 'N/A'}
                                        </h2>
                                        <p style={styles.detailMeta}>
                                            {selected.customer?.install_location || 'N/A'} &middot; submitted {formatFullDate(selected.created_at)}
                                        </p>
                                    </div>
                                    <StatusPill status={selected.status} />
                                </div>

                                <div style={styles.figureGrid}>
                                    <FigureCell label="SYSTEM" value="Hybrid" />
                                    <FigureCell
                                        label="CAPACITY"
                                        value={getCapacity(selected)}
                                        mono
                                        color={adminTokens.green}
                                    />
                                    <FigureCell
                                        label="ESTIMATE"
                                        value={formatPeso0(getValue(selected))}
                                        mono
                                    />
                                    <FigureCell
                                        label="WAITING"
                                        value={waitingLabel(selected)}
                                        danger={selected.status === 'pending' && daysAgo(selected.created_at) >= 3}
                                    />
                                </div>

                                <div style={styles.applianceSection}>
                                    <div style={styles.sectionLabel}>APPLIANCE LOAD</div>
                                    <div style={styles.applianceTable}>
                                        <div style={{
                                            ...styles.applianceRow,
                                            ...styles.applianceHeaderRow,
                                            gridTemplateColumns: APPLIANCE_COLUMNS,
                                        }}>
                                            <span>APPLIANCE</span>
                                            <span style={styles.numCell}>QTY</span>
                                            <span style={styles.numCell}>WATTS</span>
                                            <span style={styles.numCell}>DAILY Wh</span>
                                        </div>

                                        {(selected.appliance_items || []).map((item) => (
                                            <div
                                                key={item.id}
                                                style={{ ...styles.applianceRow, gridTemplateColumns: APPLIANCE_COLUMNS }}
                                            >
                                                <span style={styles.applianceName}>{item.appliance_name}</span>
                                                <span style={{ ...styles.applianceFigure, ...styles.numCell }}>
                                                    {item.quantity}
                                                </span>
                                                <span style={{ ...styles.applianceFigure, ...styles.numCell }}>
                                                    {item.wattage}W
                                                </span>
                                                <span style={{ ...styles.applianceFigure, ...styles.numCell }}>
                                                    {dailyWh(item).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}

                                        <div style={{
                                            ...styles.applianceRow,
                                            ...styles.applianceTotalRow,
                                            gridTemplateColumns: APPLIANCE_COLUMNS,
                                        }}>
                                            <span style={styles.applianceTotalLabel}>Total</span>
                                            <span style={styles.numCell} />
                                            <span style={styles.numCell} />
                                            <span style={{ ...styles.applianceFigure, ...styles.numCell }}>
                                                {totalDailyWh.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.actionBar}>
                                    <div style={styles.actionBarLeft}>
                                        <button
                                            style={styles.secondaryBtn}
                                            onClick={() => navigate('/admin/inbox')}
                                        >
                                            Contact customer
                                        </button>
                                        <button
                                            style={styles.secondaryBtn}
                                            onClick={() => navigate(`/admin/quotation-requests/${selected.id}`)}
                                        >
                                            Open computation
                                        </button>
                                    </div>

                                    {selected.status === 'pending' ? (
                                        <div style={styles.actionBarRight}>
                                            <button style={styles.rejectBtn} onClick={() => handleReject(selected)}>
                                                Reject
                                            </button>
                                            <button style={styles.approveBtn} onClick={() => handleApprove(selected)}>
                                                Approve request
                                            </button>
                                        </div>
                                    ) : selected.status === 'approved' && !selectedHasSchedule ? (
                                        <div style={styles.actionBarRight}>
                                            <button
                                                style={styles.approveBtn}
                                                onClick={() => navigate('/admin/schedule', {
                                                    state: {
                                                        scheduleQuotationId: selected.quotation?.id,
                                                        scheduleCustomerName: selected.customer?.user?.name || 'Customer',
                                                        scheduleLocation: selected.customer?.install_location || '',
                                                        scheduleReference: formatReference(selected.id, selected.created_at),
                                                    },
                                                })}
                                            >
                                                Schedule installation
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={styles.decidedNote}>
                                            {selected.status === 'approved' ? 'Installation already scheduled.' : 'Already rejected.'}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

const styles = {
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '18px',
    },
    pageTitle: {
        fontSize: '30px',
        fontWeight: 800,
        letterSpacing: '-.03em',
        color: adminTokens.ink,
        margin: 0,
    },
    pageSubtitle: {
        fontSize: '14px',
        color: adminTokens.muted,
        margin: '6px 0 0',
    },
    headerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
    },
    segmented: {
        display: 'flex',
        gap: '2px',
        backgroundColor: '#f2f4f0',
        border: `1px solid ${adminTokens.border}`,
        padding: '3px',
        borderRadius: '10px',
    },
    segmentBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: adminTokens.muted,
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    segmentBtnActive: {
        backgroundColor: '#fff',
        color: adminTokens.ink,
        boxShadow: '0 1px 3px rgba(16,33,26,.12)',
    },
    segmentCount: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: '999px',
        backgroundColor: '#e6e8e2',
        color: adminTokens.muted,
    },
    segmentCountActive: {
        backgroundColor: adminTokens.green,
        color: '#fff',
    },
    sortBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#fff',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '10px',
        padding: '5px 8px',
    },
    sortLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '9.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
        padding: '0 6px 0 2px',
    },
    sortBtn: {
        padding: '5px 9px',
        border: 'none',
        borderRadius: '7px',
        backgroundColor: 'transparent',
        color: adminTokens.muted,
        fontSize: '12.5px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    sortBtnActive: {
        backgroundColor: adminTokens.greenTint,
        color: adminTokens.green,
        fontWeight: 700,
    },
    error: {
        backgroundColor: '#fbeae7',
        color: '#a4302a',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },

    splitGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '14px',
        alignItems: 'start',
    },

    listPanel: {
        backgroundColor: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '13px',
        boxShadow: '0 1px 2px rgba(16,33,26,.04)',
        overflow: 'hidden',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 16px',
        borderBottom: `1px solid ${adminTokens.hairline}`,
    },
    listCount: {
        fontFamily: adminTokens.fontMono,
        fontSize: '9.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
    },
    stepButtons: { display: 'flex', gap: '6px' },
    stepBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '7px',
        border: `1px solid ${adminTokens.border}`,
        backgroundColor: '#fff',
        color: adminTokens.muted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '12px',
    },
    listScroll: {
        maxHeight: '648px',
        overflowY: 'auto',
    },
    listEmpty: {
        padding: '32px 16px',
        textAlign: 'center',
        fontSize: '13px',
        color: adminTokens.muted,
    },
    listRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        borderBottom: `1px solid ${adminTokens.hairline2}`,
        borderLeft: '3px solid transparent',
        backgroundColor: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    listRowSelected: {
        backgroundColor: '#f2f6f3',
    },
    listRowMain: { flex: 1, minWidth: 0 },
    listRowTop: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    listRowName: {
        fontSize: '14px',
        fontWeight: 600,
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    listRowMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    listRowCapacity: {
        fontFamily: adminTokens.fontMono,
        fontSize: '12px',
        color: adminTokens.green,
        flexShrink: 0,
    },
    listRowDivider: {
        width: '1px',
        height: '12px',
        backgroundColor: adminTokens.border,
        flexShrink: 0,
    },
    listRowLocation: {
        fontSize: '12.5px',
        color: adminTokens.faint,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    listRowAge: {
        fontFamily: adminTokens.fontMono,
        fontSize: '12px',
        color: adminTokens.muted,
        flexShrink: 0,
    },
    listRowAgeDanger: {
        color: adminTokens.danger,
        fontWeight: 500,
    },

    detailPanel: {
        backgroundColor: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '13px',
        boxShadow: '0 1px 2px rgba(16,33,26,.04)',
        padding: '24px 26px',
        position: 'sticky',
        top: '82px',
    },
    detailEmpty: {
        padding: '48px 0',
        textAlign: 'center',
        fontSize: '13.5px',
        color: adminTokens.muted,
    },
    detailHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '20px',
    },
    detailRef: {
        fontFamily: adminTokens.fontMono,
        fontSize: '11.5px',
        color: adminTokens.muted,
        marginBottom: '4px',
    },
    detailName: {
        fontSize: '26px',
        fontWeight: 800,
        letterSpacing: '-.028em',
        color: adminTokens.ink,
        margin: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    detailMeta: {
        fontSize: '13.5px',
        color: adminTokens.muted,
        margin: '4px 0 0',
    },

    figureGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
        gap: '12px',
        marginBottom: '22px',
    },
    figureCell: {
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '11px',
        padding: '12px 14px',
    },
    figureLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '9.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
        marginBottom: '8px',
    },
    figureValue: {
        fontSize: '15px',
        fontWeight: 600,
        color: adminTokens.ink,
    },
    figureValueMono: {
        fontFamily: adminTokens.fontMono,
        fontSize: '16px',
    },

    applianceSection: { marginBottom: '22px' },
    sectionLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '9.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
        marginBottom: '8px',
    },
    applianceTable: {
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '11px',
        overflow: 'hidden',
    },
    applianceRow: {
        display: 'grid',
        gap: '10px',
        padding: '9px 12px',
        borderBottom: `1px solid ${adminTokens.hairline2}`,
        alignItems: 'center',
    },
    applianceHeaderRow: {
        backgroundColor: '#fafbf9',
        fontFamily: adminTokens.fontMono,
        fontSize: '9.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: adminTokens.faint,
    },
    applianceName: {
        fontSize: '13.5px',
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    applianceFigure: {
        fontFamily: adminTokens.fontMono,
        fontSize: '12.5px',
        color: adminTokens.body,
    },
    numCell: { textAlign: 'right' },
    applianceTotalRow: {
        backgroundColor: '#fafbf9',
        borderBottom: 'none',
    },
    applianceTotalLabel: {
        fontSize: '13px',
        fontWeight: 700,
        color: adminTokens.ink,
    },

    actionBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        borderTop: `1px solid ${adminTokens.hairline}`,
        paddingTop: '20px',
    },
    actionBarLeft: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    actionBarRight: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    secondaryBtn: {
        padding: '9px 14px',
        backgroundColor: '#fff',
        border: '1px solid #dcdfd8',
        borderRadius: '9px',
        color: adminTokens.ink,
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    rejectBtn: {
        padding: '9px 14px',
        backgroundColor: '#fff',
        border: '1px solid #f0d0cb',
        borderRadius: '9px',
        color: adminTokens.danger,
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    approveBtn: {
        padding: '9px 16px',
        backgroundColor: adminTokens.green,
        border: 'none',
        borderRadius: '9px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    decidedNote: {
        fontSize: '13px',
        color: adminTokens.muted,
    },
};
