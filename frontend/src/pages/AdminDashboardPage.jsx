import { useState, useEffect, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import { adminTokens } from '../styles/adminTheme';

import LoadingState from '../components/LoadingState';

import ScheduleModal from '../components/ScheduleModal';
import api from '../api/axios';

import { CalendarIcon, DownloadIcon, XIcon } from '../components/Icons';

const TABLE_COLUMNS = '126px minmax(0,1.5fr) 96px 124px 78px 108px 40px';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const NOW_MS = Date.now();

export default function AdminDashboardPage() {
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [schedules, setSchedules] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [externalRequests, setExternalRequests] = useState([]);

    const [statusFilter, setStatusFilter] = useState('all');
    const [sort, setSort] = useState({ key: 'age', dir: 'desc' });
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [approvingQuotationId, setApprovingQuotationId] = useState(null);
    // External request being confirmed; date, time, technician and notes are
    // picked inside the shared ScheduleModal
    const [confirmingExternal, setConfirmingExternal] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [rejectingExternal, setRejectingExternal] = useState(null);
    const [rejectingQuotation, setRejectingQuotation] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);
    const [quotationPreview, setQuotationPreview] = useState(null);
    const [quotationPreviewLoadingId, setQuotationPreviewLoadingId] = useState(null);

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/quotation-requests');
            setQuotations(res.data);
        } catch {
            setError('Failed to load quotations. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSchedules = useCallback(async () => {
        setScheduleLoading(true);
        try {
            const res = await api.get('/admin/schedules');
            setSchedules(res.data);
        } catch {
            setSchedules([]);
        } finally {
            setScheduleLoading(false);
        }
    }, []);

    const fetchExternalRequests = useCallback(async () => {
        try {
            const res = await api.get('/admin/external-installation-requests');
            setExternalRequests(res.data);
        } catch {
            setExternalRequests([]);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(fetchQuotations);
        Promise.resolve().then(fetchSchedules);
        Promise.resolve().then(fetchExternalRequests);
    }, [fetchQuotations, fetchSchedules, fetchExternalRequests]);

    const openConfirmExternal = (requestRecord) => {
        setConfirmError('');
        setConfirmingExternal(requestRecord);
        setError('');
    };

    const closeConfirmExternal = () => {
        if (!confirmLoading) setConfirmingExternal(null);
    };

    // values comes from ScheduleModal: { scheduled_date, scheduled_time, assigned_technician, notes }
    const handleConfirmExternal = async (values) => {
        if (!confirmingExternal) return;
        setConfirmLoading(true);
        setConfirmError('');
        try {
            await api.post(`/admin/external-installation-requests/${confirmingExternal.id}/confirm`, {
                scheduled_date: values.scheduled_date,
                scheduled_time: values.scheduled_time,
                assigned_technician: values.assigned_technician,
                notes: values.notes || undefined,
            });
            setConfirmingExternal(null);
            fetchExternalRequests();
            fetchSchedules();
        } catch (requestError) {
            setConfirmError(requestError.response?.data?.message || 'Failed to confirm external installation request.');
        } finally {
            setConfirmLoading(false);
        }
    };

    const openRejectExternal = (requestRecord) => {
        setRejectingExternal(requestRecord);
        setRejectionReason('');
        setError('');
    };

    const closeRejectExternal = () => {
        if (!rejectLoading) setRejectingExternal(null);
    };

    const handleRejectExternal = async (event) => {
        event.preventDefault();
        if (!rejectingExternal || !rejectionReason.trim()) return;
        setRejectLoading(true);
        setError('');
        try {
            await api.post(`/admin/external-installation-requests/${rejectingExternal.id}/reject`, {
                rejection_reason: rejectionReason.trim(),
            });
            setRejectingExternal(null);
            fetchExternalRequests();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Failed to reject external installation request.');
        } finally {
            setRejectLoading(false);
        }
    };

    const previewExternalQuotation = async (requestRecord) => {
        setQuotationPreviewLoadingId(requestRecord.id);
        setError('');
        try {
            const response = await api.get(`/admin/external-installation-requests/${requestRecord.id}/quotation`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            setQuotationPreview({
                requestRecord,
                url,
                type: response.data.type || response.headers['content-type'] || '',
            });
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Failed to download quotation proof.');
        } finally {
            setQuotationPreviewLoadingId(null);
        }
    };

    const closeQuotationPreview = () => {
        if (quotationPreview?.url) URL.revokeObjectURL(quotationPreview.url);
        setQuotationPreview(null);
    };

    const downloadPreviewedQuotation = () => {
        if (!quotationPreview) return;
        const link = document.createElement('a');
        link.href = quotationPreview.url;
        link.download = `external-quotation-${quotationPreview.requestRecord.id}`;
        link.click();
    };

    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatReference = (id, createdAt) => {
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(id).padStart(3, '0');
        return `#Q-${year}-${paddedId}`;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${m} ${period}`;
    };

    const daysAgo = (dateStr) => {
        if (!dateStr) return 0;
        const diff = NOW_MS - new Date(dateStr).getTime();
        return Math.max(0, Math.floor(diff / 86400000));
    };

    const getValue = (q) => parseFloat(q.quotation?.total_amount ?? q.solar_computation?.estimated_cost ?? 0) || 0;

    const updateQuotationInState = (updated) => {
        setQuotations((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
        setSelectedQuotation((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    };

    const handleApprove = async (quotation) => {
        if (approvingQuotationId) return;
        setError('');
        setApprovingQuotationId(quotation.id);
        try {
            const res = await api.post(`/admin/quotation-requests/${quotation.id}/approve`);
            const approvedQuotation = res.data.quotation_request;
            updateQuotationInState(approvedQuotation);
            window.dispatchEvent(new Event('admin:counts-refresh'));
            navigate('/admin/schedule', {
                state: {
                    scheduleQuotationId: approvedQuotation.quotation?.id,
                    scheduleCustomerName: approvedQuotation.customer?.user?.name || 'Customer',
                    scheduleLocation: approvedQuotation.customer?.install_location || '',
                    scheduleReference: formatReference(approvedQuotation.id, approvedQuotation.created_at),
                },
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve quotation.');
        } finally {
            setApprovingQuotationId(null);
        }
    };

    const openRejectQuotation = (quotation) => {
        setRejectingQuotation(quotation);
        setRejectionReason('');
        setError('');
    };

    const closeRejectQuotation = () => {
        if (!rejectLoading) setRejectingQuotation(null);
    };

    const handleRejectQuotation = async (event) => {
        event.preventDefault();
        if (!rejectingQuotation || !rejectionReason.trim()) return;
        setRejectLoading(true);
        setError('');
        try {
            const res = await api.post(`/admin/quotation-requests/${rejectingQuotation.id}/reject`, {
                rejection_reason: rejectionReason.trim(),
            });
            updateQuotationInState(res.data.quotation_request);
            setRejectingQuotation(null);
            window.dispatchEvent(new Event('admin:counts-refresh'));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject quotation.');
        } finally {
            setRejectLoading(false);
        }
    };

    const goToSchedule = (quotation) => {
        navigate('/admin/schedule', {
            state: {
                scheduleQuotationId: quotation.quotation?.id,
                scheduleCustomerName: quotation.customer?.user?.name || 'Customer',
                scheduleLocation: quotation.customer?.install_location || '',
                scheduleReference: formatReference(quotation.id, quotation.created_at),
            },
        });
    };

    const totalCount = quotations.length;
    const approvedList = quotations.filter((q) => q.status === 'approved');
    const approvedCount = approvedList.length;
    const pendingList = quotations.filter((q) => q.status === 'pending');
    const pendingCount = pendingList.length;
    const rejectedCount = quotations.filter((q) => q.status === 'rejected').length;

    const oldestPendingDays = pendingList.length
        ? Math.max(...pendingList.map((q) => daysAgo(q.created_at)))
        : 0;

    const contractedValue = approvedList.reduce((sum, q) => sum + getValue(q), 0);
    const contractedValueM = (contractedValue / 1_000_000).toFixed(2);
    const avgQuote = approvedCount ? contractedValue / approvedCount : 0;

    const scheduledQuotationIds = new Set(schedules.map((s) => s.quotation_id).filter(Boolean));
    const approvedUnscheduledList = approvedList.filter(
        (q) => q.quotation?.id && !scheduledQuotationIds.has(q.quotation.id)
    );

    const queue = [
        ...[...pendingList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((q) => ({ ...q, queueKind: 'pending' })),
        ...[...approvedUnscheduledList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((q) => ({ ...q, queueKind: 'approved' })),
    ];

    const upcomingSchedules = [...schedules]
        .filter((s) => new Date(s.scheduled_date) >= TODAY)
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
        .slice(0, 6);

    const sortValue = (q, key) => {
        if (key === 'reference') return q.id;
        if (key === 'customer') return (q.customer?.user?.name || '').toLowerCase();
        if (key === 'age') return daysAgo(q.created_at);
        return 0;
    };

    const handleSort = (key) => {
        setSort((prev) => (
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        ));
    };

    const filteredBase = statusFilter === 'all' ? quotations : quotations.filter((q) => q.status === statusFilter);
    const filteredRows = [...filteredBase].sort((a, b) => {
        const av = sortValue(a, sort.key);
        const bv = sortValue(b, sort.key);
        if (av < bv) return sort.dir === 'asc' ? -1 : 1;
        if (av > bv) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const filterCounts = { all: totalCount, approved: approvedCount, pending: pendingCount, rejected: rejectedCount };

    return (
        <AdminLayout
            active="Overview"
            title="Operational Overview"
            subtitle="Real-time procurement metrics and eco-impact tracking."
            actions={
                <button
                    className="btn-primary"
                    style={styles.exportBtn}
                    onClick={() => navigate('/admin/reports')}
                >
                    <DownloadIcon size={15} color="currentColor" /> Export Report
                </button>
            }
        >
            {loading ? (
                <LoadingState label="Loading dashboard..." />
            ) : (
                <div style={styles.blocks}>

                    <div style={styles.metricGrid}>
                        <MetricCard
                            label="TOTAL REQUESTS"
                            value={totalCount.toLocaleString()}
                            note="Across Sorsogon and Albay"
                            barColor={adminTokens.gold}
                        />
                        <MetricCard
                            label="APPROVED PROJECTS"
                            value={approvedCount.toLocaleString()}
                            note="Ready for procurement"
                            barColor="#2f8f5b"
                        />
                        <MetricCard
                            label="PENDING PROCUREMENT"
                            value={pendingCount.toLocaleString()}
                            note={`Oldest waiting ${oldestPendingDays}d`}
                            barColor="#8a6a12"
                        />
                        <MetricCard
                            label="CONTRACTED VALUE"
                            value={`₱${contractedValueM}`}
                            unit="M"
                            note={`Average quote ${formatCurrency(avgQuote)}`}
                            barColor={adminTokens.green}
                        />
                    </div>

                    <div style={styles.twoColGrid}>
                        <div style={styles.card}>
                            <div style={styles.queueHeader}>
                                <div>
                                    <h2 style={styles.cardTitle}>Decision queue</h2>
                                    <p style={styles.cardSubtitle}>Pending decisions and approved installs to schedule</p>
                                </div>
                                <span style={{
                                    ...styles.countPill,
                                    ...(pendingList.length ? styles.countPillGold : styles.countPillGreen),
                                }}>
                                    {pendingList.length} waiting
                                </span>
                            </div>

                            {queue.length === 0 ? (
                                <div style={styles.queueEmpty}>Nothing waiting on a decision.</div>
                            ) : (
                                <div style={styles.queueList}>
                                    {queue.map((q) => {
                                        const age = daysAgo(q.created_at);
                                        const isPending = q.queueKind === 'pending';
                                        const stale = isPending && age >= 3;
                                        return (
                                            <div
                                                key={q.id}
                                                style={{
                                                    ...styles.queueRow,
                                                    borderLeft: `3px solid ${stale ? adminTokens.danger : adminTokens.gold}`,
                                                }}
                                            >
                                                <div style={styles.queueTopLine}>
                                                    <button
                                                        style={styles.queueRef}
                                                        onClick={() => setSelectedQuotation(q)}
                                                    >
                                                        {formatReference(q.id, q.created_at)}
                                                    </button>
                                                    <span style={styles.queueCustomer}>
                                                        {q.customer?.user?.name || 'N/A'}
                                                    </span>
                                                    <span style={{
                                                        ...styles.queueAgePill,
                                                        ...(stale ? styles.queueAgePillDanger : {}),
                                                    }}>
                                                        {isPending ? `waiting ${age}d` : `approved ${age}d ago`}
                                                    </span>
                                                </div>
                                                <div style={styles.queueBottomLine}>
                                                    <span style={styles.queueLocation}>
                                                        {q.customer?.install_location || ''}
                                                    </span>
                                                    <span style={styles.queueValue}>
                                                        {formatCurrency(getValue(q))}
                                                    </span>
                                                    <div style={styles.queueActions}>
                                                        {isPending ? (
                                                            <>
                                                                <button
                                                                    style={{
                                                                        ...styles.queueApproveBtn,
                                                                        opacity: approvingQuotationId ? 0.65 : 1,
                                                                        cursor: approvingQuotationId ? 'not-allowed' : 'pointer',
                                                                    }}
                                                                    onClick={() => handleApprove(q)}
                                                                    disabled={Boolean(approvingQuotationId)}
                                                                >
                                                                    {approvingQuotationId === q.id ? 'Approving...' : 'Approve & schedule'}
                                                                </button>
                                                                <button
                                                                    style={styles.queueRejectBtn}
                                                                    onClick={() => openRejectQuotation(q)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                style={styles.queueScheduleBtn}
                                                                onClick={() => goToSchedule(q)}
                                                            >
                                                                Schedule
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ ...styles.card, ...styles.scheduleCard }}>
                            <div style={styles.scheduleHeader}>
                                <h2 style={styles.cardTitle}>Upcoming schedules</h2>
                                <span
                                    style={styles.scheduleLink}
                                    onClick={() => navigate('/admin/schedule')}
                                >
                                    Schedule
                                </span>
                            </div>

                            {scheduleLoading ? (
                                <p style={styles.cardSubtitle}>Loading schedules...</p>
                            ) : upcomingSchedules.length === 0 ? (
                                <div style={styles.queueEmpty}>No upcoming installations scheduled.</div>
                            ) : (
                                <div style={styles.scheduleList}>
                                    {upcomingSchedules.map((s) => {
                                        const d = new Date(s.scheduled_date);
                                        const customerName = s.quotation?.quotation_request?.customer?.user?.name
                                            || s.customer?.user?.name
                                            || s.external_installation_request?.name
                                            || 'N/A';
                                        const location = s.quotation?.quotation_request?.customer?.install_location
                                            || s.customer?.install_location
                                            || s.external_installation_request?.address
                                            || '';
                                        return (
                                            <div key={s.id} style={styles.scheduleRow}>
                                                <div style={styles.scheduleDateBlock}>
                                                    <span style={styles.scheduleMonth}>
                                                        {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                                    </span>
                                                    <span style={styles.scheduleDay}>{d.getDate()}</span>
                                                </div>
                                                <div style={styles.scheduleInfo}>
                                                    <div style={styles.scheduleCustomer}>{customerName}</div>
                                                    <div style={styles.scheduleLocation}>{location}</div>
                                                </div>
                                                <span style={styles.scheduleTime}>{formatTime(s.scheduled_time)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.tableCardHeader}>
                            <div>
                                <h2 style={styles.cardTitle}>External installation requests</h2>
                                <p style={styles.cardSubtitle}>Customers with quotations from another solar company</p>
                            </div>
                            <span style={{ ...styles.countPill, ...styles.countPillGold }}>
                                {externalRequests.filter((item) => item.status === 'pending_review').length} pending review
                            </span>
                        </div>

                        {externalRequests.length === 0 ? (
                            <div style={styles.queueEmpty}>No external installation requests.</div>
                        ) : (
                            <div style={styles.externalList}>
                                {externalRequests.map((requestRecord) => (
                                    <div key={requestRecord.id} style={styles.externalRow}>
                                        <div style={styles.externalInfo}>
                                            <div style={styles.queueTopLine}>
                                                <span style={styles.queueRef}>#EXT-{String(requestRecord.id).padStart(3, '0')}</span>
                                                <span style={styles.queueCustomer}>{requestRecord.name}</span>
                                                <span style={styles.externalSource}>External quotation</span>
                                            </div>
                                            <div style={styles.externalMeta}>
                                                {requestRecord.other_company_name} · Preferred {new Date(requestRecord.preferred_installation_date).toLocaleDateString('en-PH')}
                                            </div>
                                        </div>
                                        <div style={styles.externalActions}>
                                            <button style={styles.queueScheduleBtn} onClick={() => previewExternalQuotation(requestRecord)} disabled={quotationPreviewLoadingId === requestRecord.id}>
                                                {quotationPreviewLoadingId === requestRecord.id ? 'Loading...' : 'View quotation'}
                                            </button>
                                            {requestRecord.status === 'pending_review' && (
                                                <>
                                                    <button style={styles.queueApproveBtn} onClick={() => openConfirmExternal(requestRecord)}>
                                                        Confirm
                                                    </button>
                                                    <button style={styles.queueRejectBtn} onClick={() => openRejectExternal(requestRecord)}>
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {requestRecord.status !== 'pending_review' && (
                                                <StatusPill status={requestRecord.status} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.card}>
                        <div style={styles.tableCardHeader}>
                            <div>
                                <h2 style={styles.cardTitle}>Recent Quotations</h2>
                                <p style={styles.cardSubtitle}>Manage and review latest quotation requests</p>
                            </div>

                            <div style={styles.segmented}>
                                {['all', 'approved', 'pending', 'rejected'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setStatusFilter(tab)}
                                        style={{
                                            ...styles.segmentBtn,
                                            ...(statusFilter === tab ? styles.segmentBtnActive : {}),
                                        }}
                                    >
                                        <span>{tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                                        <span style={styles.segmentCount}>{filterCounts[tab]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <div style={styles.error}>{error}</div>}

                        <div style={styles.tableScrollWrap}>
                            <div style={{ ...styles.tableHeaderRow, gridTemplateColumns: TABLE_COLUMNS }}>
                                <SortableHeader label="REFERENCE" sortKey="reference" sortState={sort} onSort={handleSort} />
                                <SortableHeader label="CUSTOMER NAME" sortKey="customer" sortState={sort} onSort={handleSort} />
                                <span style={styles.th}>SYSTEM</span>
                                <span style={{ ...styles.th, justifyContent: 'flex-end' }}>VALUE</span>
                                <SortableHeader label="AGE" sortKey="age" sortState={sort} onSort={handleSort} align="right" />
                                <span style={styles.th}>STATUS</span>
                                <span style={styles.th} />
                            </div>

                            {filteredRows.length === 0 ? (
                                <div style={styles.emptyFilterState}>No quotations match this filter.</div>
                            ) : (
                                filteredRows.map((q) => {
                                    const age = daysAgo(q.created_at);
                                    const staleAge = q.status === 'pending' && age >= 3;
                                    return (
                                        <div
                                            key={q.id}
                                            className="qt-row"
                                            style={{ ...styles.tableBodyRow, gridTemplateColumns: TABLE_COLUMNS }}
                                            onClick={() => setSelectedQuotation(q)}
                                        >
                                            <span style={styles.tdMono}>{formatReference(q.id, q.created_at)}</span>

                                            <span style={{ minWidth: 0 }}>
                                                <div style={styles.tdCustomerName}>
                                                    {q.customer?.user?.name || 'N/A'}
                                                </div>
                                                <div style={styles.tdCustomerLocation}>
                                                    {q.customer?.install_location || ''}
                                                </div>
                                            </span>

                                            <span style={styles.tdSystem}>
                                                {q.solar_system_type?.replace('-', ' ')}
                                            </span>

                                            <span style={styles.tdValue}>{formatCurrency(getValue(q))}</span>

                                            <span style={{ ...styles.tdAge, ...(staleAge ? styles.tdAgeDanger : {}) }}>
                                                {age}d
                                            </span>

                                            <span>
                                                <StatusPill status={q.status} />
                                            </span>

                                            <span style={{ textAlign: 'right' }}>
                                                <button
                                                    style={styles.actionDots}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/admin/quotation-requests/${q.id}`);
                                                    }}
                                                >
                                                    &#8943;
                                                </button>
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={styles.footerRow}>
                            <span style={styles.footerText}>
                                Showing {filteredRows.length} of {quotations.length} quotations
                            </span>
                            <span style={styles.footerLink} onClick={() => navigate('/admin/quotations')}>
                                View all
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {quotationPreview && (
                <div style={styles.modalOverlay} onClick={closeQuotationPreview}>
                    <div style={styles.quotationPreviewCard} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.quotationPreviewHeader}>
                            <div>
                                <div style={styles.modalEyebrow}>External quotation</div>
                                <h2 style={styles.confirmModalTitle}>Quotation preview</h2>
                                <p style={styles.confirmModalSubtitle}>
                                    {quotationPreview.requestRecord.name} · #{String(quotationPreview.requestRecord.id).padStart(3, '0')}
                                </p>
                            </div>
                            <button onClick={closeQuotationPreview} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={adminTokens.muted} />
                            </button>
                        </div>

                        <div style={styles.quotationPreviewBody}>
                            {quotationPreview.type.startsWith('image/') ? (
                                <img
                                    src={quotationPreview.url}
                                    alt={`Quotation submitted by ${quotationPreview.requestRecord.name}`}
                                    style={styles.quotationPreviewImage}
                                />
                            ) : quotationPreview.type === 'application/pdf' ? (
                                <iframe
                                    src={quotationPreview.url}
                                    title={`Quotation submitted by ${quotationPreview.requestRecord.name}`}
                                    style={styles.quotationPreviewFrame}
                                />
                            ) : (
                                <div style={styles.quotationUnsupported}>
                                    <p>This file type cannot be previewed here.</p>
                                    <button type="button" className="btn-primary" style={styles.modalPrimaryBtn} onClick={downloadPreviewedQuotation}>
                                        <DownloadIcon size={15} color="white" />
                                        Download quotation
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={styles.confirmModalFooter}>
                            <button type="button" className="btn-secondary" onClick={closeQuotationPreview} style={styles.modalSecondaryBtn}>Close</button>
                            <button type="button" className="btn-primary" onClick={downloadPreviewedQuotation} style={styles.modalPrimaryBtn}>
                                <DownloadIcon size={15} color="white" />
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rejectingQuotation && (
                <div style={styles.modalOverlay} onClick={closeRejectQuotation}>
                    <div style={styles.rejectModalCard} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.rejectModalHeader}>
                            <div>
                                <div style={styles.rejectModalEyebrow}>Reject quotation request</div>
                                <h2 style={styles.rejectModalTitle}>Add a reason for rejection</h2>
                                <p style={styles.confirmModalSubtitle}>
                                    {rejectingQuotation.customer?.user?.name || 'Customer'} · {formatReference(rejectingQuotation.id, rejectingQuotation.created_at)}
                                </p>
                            </div>
                            <button onClick={closeRejectQuotation} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={adminTokens.muted} />
                            </button>
                        </div>

                        <form onSubmit={handleRejectQuotation}>
                            <div style={styles.rejectModalBody}>
                                <p style={styles.rejectIntro}>The customer will see this explanation with their quotation status.</p>
                                <label style={styles.confirmField}>
                                    <span style={styles.confirmLabel}>Reason for rejection</span>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(event) => setRejectionReason(event.target.value)}
                                        className="input-field"
                                        style={styles.rejectTextarea}
                                        placeholder="Explain what needs to be changed or why this request cannot be approved..."
                                        maxLength={1000}
                                        rows={5}
                                        required
                                        autoFocus
                                    />
                                </label>
                                <div style={styles.rejectCharacterCount}>{rejectionReason.length}/1000</div>
                            </div>
                            <div style={styles.confirmModalFooter}>
                                <button type="button" className="btn-secondary" onClick={closeRejectQuotation} style={styles.modalSecondaryBtn}>Cancel</button>
                                <button type="submit" className="btn-danger" style={styles.modalDangerBtn} disabled={rejectLoading || !rejectionReason.trim()}>
                                    {rejectLoading ? 'Rejecting...' : 'Reject quotation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {rejectingExternal && (
                <div style={styles.modalOverlay} onClick={closeRejectExternal}>
                    <div style={styles.rejectModalCard} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.rejectModalHeader}>
                            <div>
                                <div style={styles.rejectModalEyebrow}>Reject external installation</div>
                                <h2 style={styles.rejectModalTitle}>Add a reason for rejection</h2>
                                <p style={styles.confirmModalSubtitle}>
                                    {rejectingExternal.name} · #{String(rejectingExternal.id).padStart(3, '0')}
                                </p>
                            </div>
                            <button onClick={closeRejectExternal} aria-label="Close" style={styles.modalCloseBtn}>
                                <XIcon size={16} color={adminTokens.muted} />
                            </button>
                        </div>

                        <form onSubmit={handleRejectExternal}>
                            <div style={styles.rejectModalBody}>
                                <p style={styles.rejectIntro}>The customer will receive this reason in their installation request update email.</p>
                                <label style={styles.confirmField}>
                                    <span style={styles.confirmLabel}>Reason for rejection</span>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(event) => setRejectionReason(event.target.value)}
                                        className="input-field"
                                        style={styles.rejectTextarea}
                                        placeholder="Explain why this request cannot be approved..."
                                        maxLength={1000}
                                        rows={5}
                                        required
                                    />
                                </label>
                                <div style={styles.rejectCharacterCount}>{rejectionReason.length}/1000</div>
                            </div>
                            <div style={styles.confirmModalFooter}>
                                <button type="button" className="btn-secondary" onClick={closeRejectExternal} style={styles.modalSecondaryBtn}>Cancel</button>
                                <button type="submit" className="btn-danger" style={styles.modalDangerBtn} disabled={rejectLoading || !rejectionReason.trim()}>
                                    {rejectLoading ? 'Rejecting...' : 'Reject request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmingExternal && (
                <ScheduleModal
                    title="Confirm external installation"
                    contextLabel={confirmingExternal.name}
                    badge={`#${String(confirmingExternal.id).padStart(3, '0')}`}
                    schedules={schedules}
                    initial={{ scheduled_date: confirmingExternal.preferred_installation_date?.split('T')[0] }}
                    intro={
                        <div style={styles.confirmPreferredNote}>
                            <CalendarIcon size={15} color={adminTokens.green} />
                            <span>
                                Preferred date: <strong>{new Date(confirmingExternal.preferred_installation_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                            </span>
                        </div>
                    }
                    confirmLabel="Confirm installation"
                    submitting={confirmLoading}
                    error={confirmError}
                    onSubmit={handleConfirmExternal}
                    onClose={closeConfirmExternal}
                />
            )}

            {selectedQuotation && (
                <>
                    <div style={styles.scrim} onClick={() => setSelectedQuotation(null)} />
                    <div style={styles.drawer}>
                        <div style={styles.drawerHeader}>
                            <span style={styles.drawerRef}>
                                {formatReference(selectedQuotation.id, selectedQuotation.created_at)}
                            </span>
                            <button
                                style={styles.drawerClose}
                                onClick={() => setSelectedQuotation(null)}
                                aria-label="Close"
                            >
                                &#10005;
                            </button>
                        </div>

                        <h2 style={styles.drawerCustomer}>
                            {selectedQuotation.customer?.user?.name || 'N/A'}
                        </h2>
                        <p style={styles.drawerLocation}>
                            {selectedQuotation.customer?.install_location || ''}
                        </p>

                        <div style={styles.drawerRows}>
                            <div style={styles.drawerRow}>
                                <span style={styles.drawerRowLabel}>SYSTEM TYPE</span>
                                <span style={styles.drawerRowValue}>
                                    {selectedQuotation.solar_system_type?.replace('-', ' ')}
                                </span>
                            </div>
                            <div style={styles.drawerRow}>
                                <span style={styles.drawerRowLabel}>QUOTED VALUE</span>
                                <span style={styles.drawerRowValue}>
                                    {formatCurrency(getValue(selectedQuotation))}
                                </span>
                            </div>
                            <div style={styles.drawerRow}>
                                <span style={styles.drawerRowLabel}>REQUESTED</span>
                                <span style={styles.drawerRowValue}>
                                    {daysAgo(selectedQuotation.created_at)} days ago
                                </span>
                            </div>
                            <div style={{ ...styles.drawerRow, ...styles.drawerRowLast }}>
                                <span style={styles.drawerRowLabel}>STATUS</span>
                                <StatusPill status={selectedQuotation.status} />
                            </div>
                        </div>

                        {selectedQuotation.status === 'pending' ? (
                            <div style={styles.drawerActions}>
                                <button
                                    style={styles.drawerApproveBtn}
                                    onClick={() => handleApprove(selectedQuotation)}
                                >
                                    Approve
                                </button>
                                <button
                                    style={styles.drawerRejectBtn}
                                    onClick={() => openRejectQuotation(selectedQuotation)}
                                >
                                    Reject
                                </button>
                            </div>
                        ) : selectedQuotation.status === 'approved' && selectedQuotation.quotation?.id
                            && !scheduledQuotationIds.has(selectedQuotation.quotation.id) ? (
                            <div style={styles.drawerActions}>
                                <button
                                    style={styles.drawerApproveBtn}
                                    onClick={() => goToSchedule(selectedQuotation)}
                                >
                                    Schedule installation
                                </button>
                            </div>
                        ) : selectedQuotation.status === 'approved' ? (
                            <p style={styles.drawerDecided}>Installation already scheduled.</p>
                        ) : (
                            <p style={styles.drawerDecided}>This quotation has already been decided.</p>
                        )}
                    </div>
                </>
            )}

            <style>{`.qt-row:hover { background-color: #fafbf9; }`}</style>
        </AdminLayout>
    );
}

function MetricCard({ label, value, unit, note, barColor }) {
    return (
        <div style={{ ...styles.metricCard, borderTop: `3px solid ${barColor}` }}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={styles.metricValueRow}>
                <span style={styles.metricValue}>{value}</span>
                {unit && <span style={styles.metricUnit}>{unit}</span>}
            </div>
            <div style={styles.metricNote}>{note}</div>
        </div>
    );
}

function SortableHeader({ label, sortKey, sortState, onSort, align }) {
    const active = sortState.key === sortKey;
    const arrow = sortState.dir === 'asc' ? '↑' : '↓';
    return (
        <button
            onClick={() => onSort(sortKey)}
            style={{
                ...styles.thSortable,
                justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            }}
        >
            {align === 'right' && active && <span style={styles.sortArrow}>{arrow}</span>}
            <span>{label}</span>
            {align !== 'right' && active && <span style={styles.sortArrow}>{arrow}</span>}
        </button>
    );
}

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
            padding: '4px 11px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
        }}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
        </span>
    );
}

const styles = {
    exportBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.55rem 1rem',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '13.5px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
    },
    blocks: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    metricGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))',
        gap: '14px',
    },
    metricCard: {
        backgroundColor: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '13px',
        boxShadow: '0 1px 2px rgba(16,33,26,.04)',
        padding: '16px 18px',
    },
    metricLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.11em',
        color: adminTokens.faint,
        marginBottom: '10px',
    },
    metricValueRow: { display: 'flex', alignItems: 'baseline', gap: '4px' },
    metricValue: { fontSize: '30px', fontWeight: 800, color: adminTokens.ink, lineHeight: 1 },
    metricUnit: { fontSize: '14px', fontWeight: 600, color: adminTokens.muted },
    metricNote: { fontSize: '12.5px', color: adminTokens.muted, marginTop: '8px' },

    twoColGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '14px',
        alignItems: 'stretch',
    },
    card: {
        backgroundColor: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '13px',
        boxShadow: '0 1px 2px rgba(16,33,26,.04)',
        padding: '20px',
    },
    cardTitle: { fontSize: '15px', fontWeight: 700, color: adminTokens.ink, margin: 0 },
    cardSubtitle: { fontSize: '12.5px', color: adminTokens.muted, margin: '2px 0 0' },

    queueHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '14px',
        gap: '0.75rem',
    },
    countPill: {
        fontFamily: adminTokens.fontMono,
        fontSize: '11px',
        fontWeight: 600,
        padding: '4px 11px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
    },
    countPillGold: { backgroundColor: '#fdf4dc', color: '#8a6a12' },
    countPillGreen: { backgroundColor: '#e4ede8', color: adminTokens.green },
    queueEmpty: {
        backgroundColor: '#e4ede8',
        color: adminTokens.green,
        borderRadius: '10px',
        padding: '14px',
        fontSize: '13px',
        fontWeight: 600,
        textAlign: 'center',
    },
    queueList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    externalList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    externalRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px',
        flexWrap: 'wrap', borderRadius: '10px', backgroundColor: adminTokens.page, padding: '12px 14px',
    },
    externalInfo: { minWidth: 0, flex: '1 1 280px' },
    externalSource: {
        fontFamily: adminTokens.fontMono, fontSize: '10px', fontWeight: 600, padding: '3px 8px',
        borderRadius: '999px', backgroundColor: '#fdf4dc', color: '#8a6a12',
    },
    externalMeta: { fontSize: '12px', color: adminTokens.muted, marginTop: '5px' },
    externalActions: { display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' },
    queueRow: {
        borderRadius: '10px',
        backgroundColor: adminTokens.page,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    queueTopLine: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    queueRef: {
        fontFamily: adminTokens.fontMono,
        fontSize: '12.5px',
        color: adminTokens.green,
        textDecoration: 'underline',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
    },
    queueCustomer: { fontSize: '13.5px', fontWeight: 600, color: adminTokens.ink },
    queueAgePill: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: '999px',
        backgroundColor: '#f2f4f0',
        color: adminTokens.muted,
        marginLeft: 'auto',
    },
    queueAgePillDanger: { backgroundColor: '#fbeae7', color: adminTokens.danger },
    queueBottomLine: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
    queueLocation: {
        fontSize: '12px',
        color: adminTokens.muted,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    queueValue: { fontFamily: adminTokens.fontMono, fontSize: '12.5px', color: adminTokens.ink },
    queueActions: { display: 'flex', gap: '6px' },
    queueApproveBtn: {
        padding: '5px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    queueScheduleBtn: {
        padding: '5px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    queueRejectBtn: {
        padding: '5px 12px',
        border: '1px solid #f0d0cb',
        borderRadius: '8px',
        backgroundColor: '#fff',
        color: adminTokens.danger,
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
    },

    scheduleCard: { display: 'flex', flexDirection: 'column', height: '100%' },
    scheduleHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
    },
    scheduleLink: {
        fontSize: '12.5px',
        fontWeight: 600,
        color: adminTokens.green,
        cursor: 'pointer',
        textDecoration: 'underline',
    },
    scheduleList: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
    scheduleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: `1px solid ${adminTokens.hairline2}`,
    },
    scheduleDateBlock: {
        width: '44px',
        flexShrink: 0,
        textAlign: 'center',
        paddingRight: '12px',
        borderRight: `1px solid ${adminTokens.hairline}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    scheduleMonth: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10px',
        color: adminTokens.faint,
        textTransform: 'uppercase',
    },
    scheduleDay: { fontSize: '17px', fontWeight: 700, color: adminTokens.ink },
    scheduleInfo: { flex: 1, minWidth: 0 },
    scheduleCustomer: {
        fontSize: '13.5px',
        fontWeight: 600,
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    scheduleLocation: {
        fontSize: '12px',
        color: adminTokens.muted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    scheduleTime: { fontFamily: adminTokens.fontMono, fontSize: '12px', color: adminTokens.muted, flexShrink: 0 },

    tableCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '16px',
    },
    segmented: {
        display: 'flex',
        gap: '2px',
        backgroundColor: '#f2f4f0',
        padding: '4px',
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
    segmentCount: { fontFamily: adminTokens.fontMono, fontSize: '10.5px', color: adminTokens.faint },

    error: {
        backgroundColor: '#fbeae7',
        color: '#a4302a',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },

    modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(16,33,26,.42)',
    },
    rejectModalCard: {
        width: 'min(520px, 100%)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        borderRadius: '16px',
        backgroundColor: adminTokens.surface,
        boxShadow: '0 20px 60px rgba(16,33,26,.22)',
    },
    quotationPreviewCard: {
        width: 'min(900px, 100%)',
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden',
        borderRadius: '16px',
        backgroundColor: adminTokens.surface,
        boxShadow: '0 20px 60px rgba(16,33,26,.22)',
    },
    quotationPreviewHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '24px 28px 20px',
        backgroundColor: adminTokens.greenTint,
        borderBottom: `1px solid ${adminTokens.border}`,
    },
    quotationPreviewBody: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '320px',
        maxHeight: 'calc(100vh - 220px)',
        overflow: 'auto',
        padding: '20px',
        backgroundColor: '#f2f4f0',
    },
    quotationPreviewImage: { display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 270px)', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 18px rgba(16,33,26,.14)' },
    quotationPreviewFrame: { display: 'block', width: '100%', height: 'min(620px, calc(100vh - 270px))', border: 'none', borderRadius: '8px', backgroundColor: 'white' },
    quotationUnsupported: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: adminTokens.muted, textAlign: 'center' },
    modalEyebrow: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: adminTokens.green,
    },
    confirmModalTitle: { margin: '7px 0 3px', fontSize: '22px', color: adminTokens.ink },
    confirmModalSubtitle: { margin: 0, color: adminTokens.muted, fontSize: '13px' },
    rejectModalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', padding: '24px 28px 20px', backgroundColor: '#fbeae7', borderBottom: '1px solid #f0d0cb' },
    rejectModalEyebrow: { fontFamily: adminTokens.fontMono, fontSize: '10px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: adminTokens.danger },
    rejectModalTitle: { margin: '7px 0 3px', fontSize: '22px', color: adminTokens.ink },
    modalCloseBtn: {
        display: 'grid',
        placeItems: 'center',
        width: '30px',
        height: '30px',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '8px',
        backgroundColor: adminTokens.surface,
        cursor: 'pointer',
        flexShrink: 0,
    },
    rejectModalBody: { padding: '24px 28px 12px' },
    rejectIntro: { margin: '0 0 18px', color: adminTokens.body, fontSize: '13px', lineHeight: 1.55 },
    rejectTextarea: { width: '100%', boxSizing: 'border-box', minHeight: '126px', padding: '10px 11px', resize: 'vertical', fontFamily: adminTokens.fontUI, lineHeight: 1.5 },
    rejectCharacterCount: { marginTop: '6px', color: adminTokens.faint, fontFamily: adminTokens.fontMono, fontSize: '10px', textAlign: 'right' },
    confirmPreferredNote: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '18px',
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#fdf8e8',
        color: '#725b16',
        fontSize: '12.5px',
    },
    confirmField: { display: 'flex', flexDirection: 'column', gap: '7px' },
    confirmLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: adminTokens.body },
    confirmModalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '9px', padding: '16px 28px 22px', borderTop: `1px solid ${adminTokens.hairline}` },
    modalSecondaryBtn: { minWidth: '92px', minHeight: '40px', padding: '10px 16px', borderRadius: '9px', fontWeight: 600 },
    modalPrimaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', minWidth: '170px', minHeight: '40px', padding: '10px 16px', border: 'none', borderRadius: '9px', backgroundColor: adminTokens.green, color: 'white', fontWeight: 700, boxShadow: '0 2px 6px rgba(15,59,44,.14)' },
    modalDangerBtn: { minWidth: '132px', minHeight: '40px', padding: '10px 16px', border: '1px solid #c0392b', borderRadius: '9px', backgroundColor: '#c0392b', color: 'white', fontWeight: 700, boxShadow: '0 2px 6px rgba(192,57,43,.14)' },

    tableScrollWrap: { overflowX: 'auto' },
    th: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: adminTokens.faint,
        display: 'flex',
        alignItems: 'center',
    },
    thSortable: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: adminTokens.faint,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    sortArrow: { color: adminTokens.green, fontSize: '10px' },
    tableHeaderRow: {
        display: 'grid',
        gap: '12px',
        padding: '10px 20px',
        minWidth: '860px',
        borderBottom: `1px solid ${adminTokens.hairline}`,
    },
    tableBodyRow: {
        display: 'grid',
        gap: '12px',
        padding: '14px 20px',
        minWidth: '860px',
        alignItems: 'center',
        borderBottom: `1px solid ${adminTokens.hairline2}`,
        cursor: 'pointer',
    },
    tdMono: { fontFamily: adminTokens.fontMono, fontSize: '12.5px', color: adminTokens.ink },
    tdCustomerName: {
        fontSize: '14px',
        fontWeight: 600,
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    tdCustomerLocation: {
        fontSize: '12.5px',
        color: adminTokens.faint,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    tdSystem: { fontSize: '13.5px', color: adminTokens.body, textTransform: 'capitalize' },
    tdValue: { fontFamily: adminTokens.fontMono, fontSize: '12.5px', color: adminTokens.ink, textAlign: 'right' },
    tdAge: { fontFamily: adminTokens.fontMono, fontSize: '12.5px', color: adminTokens.muted, textAlign: 'right' },
    tdAgeDanger: { color: adminTokens.danger, fontWeight: 500 },
    actionDots: {
        background: 'none',
        border: 'none',
        fontSize: '1.1rem',
        cursor: 'pointer',
        color: adminTokens.faint,
        padding: '0 0.25rem',
    },
    emptyFilterState: {
        padding: '32px 0',
        textAlign: 'center',
        fontSize: '13px',
        color: adminTokens.muted,
    },
    footerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '14px',
        marginTop: '6px',
        borderTop: `1px solid ${adminTokens.hairline}`,
    },
    footerText: { fontSize: '12.5px', color: adminTokens.muted },
    footerLink: { fontSize: '12.5px', fontWeight: 600, color: adminTokens.green, cursor: 'pointer', textDecoration: 'underline' },

    scrim: { position: 'fixed', inset: 0, backgroundColor: 'rgba(16,33,26,.32)', zIndex: 200 },
    drawer: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(400px, 88vw)',
        backgroundColor: '#fff',
        zIndex: 201,
        padding: '24px',
        overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(16,33,26,.12)',
    },
    drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
    drawerRef: { fontFamily: adminTokens.fontMono, fontSize: '12.5px', color: adminTokens.muted },
    drawerClose: { background: 'none', border: 'none', fontSize: '18px', color: adminTokens.muted, cursor: 'pointer', lineHeight: 1 },
    drawerCustomer: { fontSize: '22px', fontWeight: 800, color: adminTokens.ink, margin: '8px 0 2px' },
    drawerLocation: { fontSize: '13px', color: adminTokens.muted, margin: '0 0 20px' },
    drawerRows: { border: `1px solid ${adminTokens.border}`, borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' },
    drawerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 14px',
        borderBottom: `1px solid ${adminTokens.hairline2}`,
    },
    drawerRowLast: { borderBottom: 'none' },
    drawerRowLabel: {
        fontFamily: adminTokens.fontMono,
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: adminTokens.faint,
    },
    drawerRowValue: { fontSize: '13px', fontWeight: 600, color: adminTokens.ink, textTransform: 'capitalize' },
    drawerActions: { display: 'flex', gap: '10px' },
    drawerApproveBtn: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    drawerRejectBtn: {
        flex: 1,
        padding: '12px',
        border: '1px solid #f0d0cb',
        borderRadius: '10px',
        backgroundColor: '#fff',
        color: adminTokens.danger,
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    drawerDecided: {
        fontSize: '13px',
        color: adminTokens.muted,
        backgroundColor: adminTokens.page,
        borderRadius: '10px',
        padding: '14px',
        textAlign: 'center',
    },
};
