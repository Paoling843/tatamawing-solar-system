import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import AdminHero, { FilterTiles } from '../components/AdminHero';
import { adminTokens, adminUi, adminStatus } from '../styles/adminTheme';
import { whiteButton } from '../styles/theme';
import LoadingState from '../components/LoadingState';
import Badge from '../components/StatusPill';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';
import { formatPeso, quotationPrice, priceLabel, systemTypeLabel, daysAgoLabel } from '../utils/quotationDisplay';
import { ChevronDownIcon, XIcon } from '../components/Icons';

const APPLIANCE_COLUMNS = 'minmax(0,1.6fr) minmax(36px,0.5fr) minmax(48px,0.7fr) minmax(56px,0.95fr)';

const NOW_MS = Date.now();

const daysAgo = (dateStr) => {
    if (!dateStr) return 0;
    const diff = NOW_MS - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
};


const formatMonthDay = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatFullDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
});

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

function FigureCell({ label, value, color, danger, first }) {
    return (
        <div style={{ ...styles.figureCell, ...(first ? {} : styles.figureCellDivider) }}>
            <dt style={styles.figureLabel}>{label}</dt>
            <dd style={{
                ...styles.figureValue,
                ...(color ? { color } : {}),
                ...(danger ? { color: '#6B4500' } : {}),
            }}>
                {value}
            </dd>
        </div>
    );
}

const FILTERS = [
    { key: 'all', label: 'All', dot: '#FFFFFF' },
    ...['pending', 'approved', 'rejected', 'cancelled'].map((key) => ({ key, label: adminStatus[key].label, dot: adminStatus[key].darkDot })),
];
const SORTS = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'capacity', label: 'Capacity' },
];

export default function AdminQuotationsPage() {
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const [schedules, setSchedules] = useState([]);

    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('newest');
    const [selectedId, setSelectedId] = useState(null);
    // On phones the detail panel stacks below the list, so selecting a
    // request scrolls down to it (otherwise nothing seems to happen)
    const detailRef = useRef(null);
    const selectRequest = (id) => {
        setSelectedId(id);
        if (window.matchMedia('(max-width: 640px)').matches) {
            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
    };
    const [rejectingQuotation, setRejectingQuotation] = useState(null);
    // Shown inside the reject window (the page banner is hidden behind it)
    const [rejectError, setRejectError] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);
    // Quotation waiting for the admin to confirm "Approve"
    const [approveTarget, setApproveTarget] = useState(null);
    const [approveLoading, setApproveLoading] = useState(false);

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/quotation-requests');
            setQuotations(res.data);
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the quotation requests. Please try again."));
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
        setApproveLoading(true);
        try {
            const res = await api.post(`/admin/quotation-requests/${quotation.id}/approve`);
            updateQuotation(res.data.quotation_request);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setActionError(errorMessage(err, "Couldn't approve the quotation. Please try again."));
        } finally {
            setApproveLoading(false);
            setApproveTarget(null);
        }
    };

    const openRejectModal = (quotation) => {
        setRejectingQuotation(quotation);
        setRejectionReason('');
        setActionError('');
        setRejectError('');
    };

    const closeRejectModal = () => {
        if (!rejectLoading) setRejectingQuotation(null);
    };

    const handleReject = async (event) => {
        event.preventDefault();
        if (!rejectingQuotation || !rejectionReason.trim()) return;
        setRejectLoading(true);
        setActionError('');
        try {
            const res = await api.post(`/admin/quotation-requests/${rejectingQuotation.id}/reject`, {
                rejection_reason: rejectionReason.trim(),
            });
            updateQuotation(res.data.quotation_request);
            setRejectingQuotation(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setRejectError(errorMessage(err, "Couldn't reject the quotation. Please try again."));
        } finally {
            setRejectLoading(false);
        }
    };

    const totalCount = quotations.length;
    const filterCounts = {
        all: totalCount,
        pending: quotations.filter((q) => q.status === 'pending').length,
        approved: quotations.filter((q) => q.status === 'approved').length,
        rejected: quotations.filter((q) => q.status === 'rejected').length,
        cancelled: quotations.filter((q) => q.status === 'cancelled').length,
    };

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
        .sort(sortFn);

    // 10 rows fill the list without scrolling; a new filter or sort starts at page 1
    const pager = usePagination(filteredSorted, 10, `${statusFilter}|${sortKey}`);
    const listScrollRef = useRef(null);
    const changePage = (page) => {
        pager.setPage(page);
        if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
    };

    const selected = selectedId
        ? (filteredSorted.find((q) => q.id === selectedId) || filteredSorted[0] || null)
        : null;

    // The ↑ ↓ buttons walk the whole filtered list, turning the page when needed
    const stepSelection = (delta) => {
        if (!filteredSorted.length) return;
        const idx = selected ? filteredSorted.findIndex((q) => q.id === selected.id) : -1;
        const nextIndex = idx === -1 ? 0 : (idx + delta + filteredSorted.length) % filteredSorted.length;
        setSelectedId(filteredSorted[nextIndex].id);
        pager.setPage(pager.pageOf(nextIndex));
    };

    const totalDailyWh = selected
        ? (selected.appliance_items || []).reduce((sum, item) => sum + dailyWh(item), 0)
        : 0;

    const scheduledQuotationIds = new Set(schedules.map((s) => s.quotation_id).filter(Boolean));
    const selectedHasSchedule = !!(selected?.quotation?.id && scheduledQuotationIds.has(selected.quotation.id));

    return (
        <AdminLayout active="Quotations">
            <AdminHero
                eyebrow={`${filterCounts.pending} waiting for review`}
                title="Quotation requests"
                subtitle="Review and approve customer requests"
                actions={
                    <div role="group" aria-label="Sort by" style={styles.sortBox}>
                        <span style={styles.sortLabel}>Sort</span>
                        {SORTS.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                aria-pressed={sortKey === opt.key}
                                onClick={() => setSortKey(opt.key)}
                                style={{ ...styles.sortBtn, ...(sortKey === opt.key ? styles.sortBtnActive : {}) }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
            >
                <FilterTiles
                    label="Filter by status"
                    options={FILTERS.map((f) => ({ ...f, count: filterCounts[f.key] }))}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </AdminHero>

            {error && <div style={styles.error}>{error}</div>}
            {actionError && <div style={styles.error}>{actionError}</div>}

            {loading ? (
                <LoadingState label="Loading quotation requests..." />
            ) : (
                <div style={styles.splitGrid}>

                    <div style={styles.listPanel}>
                        <div style={styles.listHeader}>
                            <span style={styles.listCount}>
                                {filteredSorted.length} request{filteredSorted.length === 1 ? '' : 's'}
                            </span>
                            {filteredSorted.length > 1 && (
                                <div style={styles.stepButtons}>
                                    <button
                                        className="m-tap"
                                        style={styles.stepBtn}
                                        onClick={() => stepSelection(-1)}
                                        aria-label="Previous request"
                                    >
                                        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><ChevronDownIcon size={15} color="currentColor" /></span>
                                    </button>
                                    <button
                                        className="m-tap"
                                        style={styles.stepBtn}
                                        onClick={() => stepSelection(1)}
                                        aria-label="Next request"
                                    >
                                        <ChevronDownIcon size={15} color="currentColor" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div ref={listScrollRef} style={styles.listScroll}>
                            {filteredSorted.length === 0 ? (
                                <div style={styles.listEmpty}>No requests match this filter.</div>
                            ) : (
                                pager.pageItems.map((q) => {
                                    const isSelected = selected?.id === q.id;
                                    const staleAge = q.status === 'pending' && daysAgo(q.created_at) >= 3;
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => selectRequest(q.id)}
                                            aria-pressed={isSelected}
                                            style={{
                                                ...styles.listRow,
                                                ...(isSelected ? styles.listRowSelected : {}),
                                            }}
                                        >
                                            <span style={styles.listRowMain}>
                                                <span style={styles.listRowTop}>
                                                    <span style={styles.listRowName}>
                                                        {q.customer?.user?.name || 'N/A'}
                                                    </span>
                                                    <Badge status={q.status} />
                                                </span>
                                                <span style={styles.listRowMeta}>
                                                    <strong style={styles.listRowCapacity}>{getCapacity(q)}</strong>
                                                    {' · '}
                                                    {q.installation_address || q.customer?.install_location || ''}
                                                </span>
                                            </span>
                                            <span style={{
                                                ...styles.listRowAge,
                                                ...(q.status === 'pending' ? styles.listRowAgePending : {}),
                                                ...(staleAge ? styles.listRowAgeDanger : {}),
                                            }}>
                                                {ageLabelFor(q)}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <Pagination
                            {...pager}
                            noun="requests"
                            onChange={changePage}
                            style={styles.listPager}
                        />
                    </div>

                    <div ref={detailRef} className="m-static" style={styles.detailPanel}>
                        {!selected ? (
                            <div style={styles.detailEmpty}>Select a request to review it.</div>
                        ) : (
                            <>
                                <div style={styles.detailHeader}>
                                    <div style={styles.detailRefRow}>
                                        <span style={styles.detailRef}>
                                            {formatQuotationRef(selected.id, selected.created_at)}
                                        </span>
                                        <Badge status={selected.status} />
                                    </div>
                                    <h2 style={styles.detailName}>
                                        {selected.customer?.user?.name || 'N/A'}
                                    </h2>
                                    <p style={styles.detailMeta}>
                                        {selected.installation_address || selected.customer?.install_location || 'N/A'} &middot; submitted {formatFullDate(selected.created_at)}
                                    </p>
                                </div>

                                <dl style={styles.figureGrid}>
                                    <FigureCell first label="System" value={systemTypeLabel(selected.solar_system_type)} />
                                    <FigureCell
                                        label="Capacity"
                                        value={getCapacity(selected)}
                                    />
                                    <FigureCell
                                        label={priceLabel(selected)}
                                        value={formatPeso(quotationPrice(selected))}
                                        color={adminTokens.green}
                                    />
                                    {/* Only pending requests are waiting on an admin */}
                                    {selected.status === 'pending' ? (
                                        <FigureCell
                                            label="Waiting"
                                            value={waitingLabel(selected)}
                                            danger={daysAgo(selected.created_at) >= 3}
                                        />
                                    ) : (
                                        <FigureCell
                                            label="Submitted"
                                            value={daysAgoLabel(daysAgo(selected.created_at))}
                                        />
                                    )}
                                </dl>

                                <div style={styles.applianceSection}>
                                    <h3 style={styles.sectionLabel}>Appliance load</h3>
                                    <div style={styles.applianceTable}>
                                        <div style={{
                                            ...styles.applianceRow,
                                            ...styles.applianceHeaderRow,
                                            gridTemplateColumns: APPLIANCE_COLUMNS,
                                        }}>
                                            <span>Appliance</span>
                                            <span style={styles.numCell}>Qty</span>
                                            <span style={styles.numCell}>Watts</span>
                                            <span style={styles.numCell}>Wh per day</span>
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
                                                    {Number(item.wattage).toLocaleString()} W
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
                                            <button style={styles.rejectBtn} onClick={() => openRejectModal(selected)}>
                                                Reject
                                            </button>
                                            <button style={styles.approveBtn} onClick={() => setApproveTarget(selected)}>
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
                                                        scheduleLocation: selected.installation_address || selected.customer?.install_location || '',
                                                        scheduleReference: formatQuotationRef(selected.id, selected.created_at),
                                                    },
                                                })}
                                            >
                                                Schedule installation
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={styles.decidedNote}>
                                            {selected.status === 'approved'
                                                ? 'Installation already scheduled.'
                                                : `This request was ${(adminStatus[selected.status]?.label || selected.status).toLowerCase()}.`}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {rejectingQuotation && (
                <div style={styles.modalOverlay} onClick={closeRejectModal}>
                    <div style={styles.rejectModal} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.rejectModalHeader}>
                            <div>
                                <div style={styles.rejectEyebrow}>Quotation review</div>
                                <h2 style={styles.rejectModalTitle}>Reject this request?</h2>
                                <p style={styles.rejectModalSubtitle}>
                                    {rejectingQuotation.customer?.user?.name || 'Customer'} · {formatQuotationRef(rejectingQuotation.id, rejectingQuotation.created_at)}
                                </p>
                            </div>
                            <button type="button" onClick={closeRejectModal} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={adminTokens.muted} />
                            </button>
                        </div>

                        <form onSubmit={handleReject}>
                            <div style={styles.rejectModalBody}>
                                <p style={styles.rejectIntro}>Give the customer a clear explanation they can act on.</p>
                                <label style={styles.rejectField}>
                                    <span style={styles.rejectLabel}>Reason for rejection</span>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(event) => setRejectionReason(event.target.value)}
                                        className="input-field"
                                        style={styles.rejectTextarea}
                                        placeholder="Explain why this quotation cannot be approved..."
                                        maxLength={1000}
                                        rows={5}
                                        required
                                        autoFocus
                                    />
                                </label>
                                <div style={styles.rejectCount}>{rejectionReason.length}/1000</div>
                            </div>
                            {rejectError && <div role="alert" style={styles.modalError}>{rejectError}</div>}
                            <div style={styles.rejectModalFooter}>
                                <button type="button" className="btn-secondary" onClick={closeRejectModal} style={styles.modalCancelBtn}>Cancel</button>
                                <button type="submit" className="btn-danger" style={styles.modalRejectBtn} disabled={rejectLoading || !rejectionReason.trim()}>
                                    {rejectLoading ? 'Rejecting...' : 'Reject quotation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmDialog
                open={!!approveTarget}
                title="Approve this quotation?"
                message={approveTarget
                    ? `${approveTarget.customer?.user?.name || 'Customer'} · ${formatQuotationRef(approveTarget.id, approveTarget.created_at)}. The customer will see it as approved, and you can then schedule the installation. This can't be undone.`
                    : ''}
                confirmLabel={approveLoading ? 'Approving...' : 'Approve'}
                busy={approveLoading}
                onConfirm={() => handleApprove(approveTarget)}
                onCancel={() => setApproveTarget(null)}
            />
        </AdminLayout>
    );
}

const styles = {
    modalError: { ...adminUi.errorBanner, margin: '0 1.5rem 1rem' },
    // Sort control on the green banner
    sortBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: adminTokens.radius,
        padding: '3px',
    },
    sortLabel: {
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: adminTokens.stripLabel,
        padding: '0 8px',
    },
    sortBtn: {
        height: '32px',
        padding: '0 12px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        color: '#DDE7E2',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    sortBtnActive: {
        backgroundColor: '#FFFFFF',
        color: adminTokens.green,
        fontWeight: 700,
    },
    error: adminUi.errorBanner,

    splitGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-start',
    },

    listPanel: {
        ...adminUi.card,
        flex: '1 1 380px',
        minWidth: 0,
        overflow: 'hidden',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: `1px solid ${adminTokens.line}`,
        backgroundColor: adminTokens.headBg,
    },
    listCount: {
        fontSize: '13px',
        fontWeight: 600,
        color: adminTokens.muted,
    },
    stepButtons: { display: 'flex', gap: '4px' },
    stepBtn: {
        width: '32px',
        height: '32px',
        borderRadius: adminTokens.radius,
        border: `1px solid ${adminTokens.control}`,
        backgroundColor: '#FFFFFF',
        color: adminTokens.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
    },
    listScroll: {
        maxHeight: '640px',
        overflowY: 'auto',
    },
    listPager: {
        padding: '10px 16px 12px',
        borderTop: `1px solid ${adminTokens.line}`,
    },
    listEmpty: {
        padding: '32px 16px',
        textAlign: 'center',
        fontSize: '14px',
        color: adminTokens.muted,
    },
    listRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
        backgroundColor: '#FFFFFF',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        color: adminTokens.ink,
        fontFamily: 'inherit',
    },
    listRowSelected: {
        backgroundColor: adminTokens.greenTint,
        boxShadow: `inset 3px 0 0 ${adminTokens.green}`,
    },
    listRowMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' },
    listRowTop: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    listRowName: {
        fontSize: '15px',
        fontWeight: 700,
        color: adminTokens.ink,
        minWidth: 0,
    },
    listRowMeta: {
        color: adminTokens.muted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    listRowCapacity: {
        color: adminTokens.ink,
        fontWeight: 600,
    },
    listRowAge: {
        fontSize: '13px',
        color: adminTokens.subtle,
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    listRowAgePending: { color: '#6B4500' },
    listRowAgeDanger: { color: '#A3261B', fontWeight: 600 },

    detailPanel: {
        ...adminUi.card,
        flex: '999 1 520px',
        minWidth: 0,
        position: 'sticky',
        top: '80px',
    },
    detailEmpty: {
        padding: '48px 24px',
        textAlign: 'center',
        fontSize: '14px',
        color: adminTokens.muted,
    },
    detailHeader: {
        padding: '20px 24px 18px',
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    detailRefRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
    },
    detailRef: {
        fontSize: '13px',
        fontWeight: 600,
        color: adminTokens.muted,
    },
    detailName: {
        fontSize: '24px',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: adminTokens.ink,
        margin: '4px 0 2px',
        overflowWrap: 'anywhere',
    },
    detailMeta: {
        fontSize: '14px',
        color: adminTokens.muted,
        margin: 0,
    },

    figureGrid: {
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        borderBottom: `1px solid ${adminTokens.line}`,
        overflow: 'hidden',
    },
    figureCell: {
        padding: '14px 24px',
    },
    figureCellDivider: { borderLeft: `1px solid ${adminTokens.rowLine}`, marginLeft: '-1px' },
    figureLabel: {
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: adminTokens.muted,
    },
    figureValue: {
        margin: '2px 0 0',
        fontSize: '18px',
        fontWeight: 700,
        color: adminTokens.ink,
    },

    applianceSection: { padding: '18px 24px 8px' },
    sectionLabel: {
        margin: '0 0 10px',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: adminTokens.muted,
    },
    applianceTable: {
        border: `1px solid ${adminTokens.line}`,
        overflow: 'hidden',
    },
    applianceRow: {
        display: 'grid',
        gap: '10px',
        padding: '10px 14px',
        borderBottom: `1px solid ${adminTokens.rowLine}`,
        alignItems: 'center',
    },
    applianceHeaderRow: {
        ...adminUi.tableHead,
        padding: '9px 14px',
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    applianceName: {
        fontSize: '14px',
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
    },
    applianceFigure: {
        fontSize: '14px',
        color: adminTokens.ink,
    },
    numCell: { textAlign: 'right' },
    applianceTotalRow: {
        backgroundColor: '#F3F8F5',
        borderBottom: 'none',
        fontWeight: 700,
    },
    applianceTotalLabel: {
        fontSize: '14px',
        fontWeight: 700,
        color: adminTokens.ink,
    },

    actionBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        borderTop: `1px solid ${adminTokens.line}`,
        padding: '16px 24px 20px',
        marginTop: '10px',
    },
    actionBarLeft: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    actionBarRight: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    secondaryBtn: adminUi.whiteBtn,
    rejectBtn: adminUi.rejectBtn,
    approveBtn: adminUi.primaryBtn,
    decidedNote: {
        fontSize: '13px',
        color: adminTokens.muted,
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(12, 25, 19, 0.48)',
    },
    rejectModal: {
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        boxShadow: '0 24px 70px rgba(16,33,26,.24)',
    },
    rejectModalHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '24px clamp(16px, 5vw, 28px) 20px',
        backgroundColor: '#fbeae7',
        borderBottom: '1px solid #f0d0cb',
    },
    rejectEyebrow: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: adminTokens.danger,
    },
    rejectModalTitle: {
        margin: '7px 0 3px',
        fontSize: '22px',
        color: adminTokens.ink,
    },
    rejectModalSubtitle: {
        margin: 0,
        fontSize: '12.5px',
        color: adminTokens.muted,
    },
    modalCloseBtn: {
        width: '32px',
        height: '32px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,.72)',
        cursor: 'pointer',
    },
    rejectModalBody: {
        padding: '24px clamp(16px, 5vw, 28px) 12px',
    },
    rejectIntro: {
        margin: '0 0 18px',
        fontSize: '13px',
        lineHeight: 1.55,
        color: adminTokens.muted,
    },
    rejectField: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    rejectLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: adminTokens.body,
    },
    rejectTextarea: {
        width: '100%',
        minHeight: '126px',
        resize: 'vertical',
        lineHeight: 1.5,
        boxSizing: 'border-box',
    },
    rejectCount: {
        marginTop: '6px',
        textAlign: 'right',
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '10px',
        color: adminTokens.faint,
    },
    rejectModalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        padding: '16px clamp(16px, 5vw, 28px) 22px',
        borderTop: `1px solid ${adminTokens.hairline}`,
    },
    modalCancelBtn: { ...whiteButton, minWidth: '92px', minHeight: '40px' },
    // Same red button as the dashboard's reject dialog
    modalRejectBtn: {
        minWidth: '132px',
        minHeight: '40px',
        padding: '10px 16px',
        border: `1px solid ${adminTokens.danger}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.danger,
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: 'inherit',
        boxShadow: '0 2px 6px rgba(192,57,43,.14)',
    },
};
