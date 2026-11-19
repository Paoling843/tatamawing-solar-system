import { useState, useEffect, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import AdminHero, { HeroStat, HeroStrip } from '../components/AdminHero';
import { adminTokens, adminUi } from '../styles/adminTheme';
import { smallGreenButton, whiteButton } from '../styles/theme';

import LoadingState from '../components/LoadingState';
import Badge from '../components/StatusPill';

import ScheduleModal from '../components/ScheduleModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { formatQuotationRef, formatExternalRef } from '../utils/references';
import { priceLabel, systemTypeLabel, daysAgoLabel } from '../utils/quotationDisplay';

import { CalendarIcon, CheckIcon, DownloadIcon, PlusIcon, XIcon } from '../components/Icons';

const TABLE_COLUMNS = '126px minmax(0,1.5fr) 96px 124px 78px 108px';

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
    // Shown in the External installation requests card (e.g. a missing quotation file)
    const [externalError, setExternalError] = useState('');

    const [statusFilter, setStatusFilter] = useState('all');
    const [sort, setSort] = useState({ key: 'age', dir: 'desc' });
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [approvingQuotationId, setApprovingQuotationId] = useState(null);
    // Quotation waiting for the admin to confirm "Approve"
    const [approveTarget, setApproveTarget] = useState(null);
    // External request being confirmed; date, time, technician and notes are
    // picked inside the shared ScheduleModal
    const [confirmingExternal, setConfirmingExternal] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [rejectingExternal, setRejectingExternal] = useState(null);
    const [rejectingQuotation, setRejectingQuotation] = useState(null);
    // Shown inside the reject windows (the page banner is hidden behind them)
    const [rejectError, setRejectError] = useState('');
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
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the quotations. Please try again."));
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
        setExternalError('');
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
            setConfirmError(errorMessage(requestError, "Couldn't confirm the installation request. Please try again."));
        } finally {
            setConfirmLoading(false);
        }
    };

    const openRejectExternal = (requestRecord) => {
        setRejectingExternal(requestRecord);
        setRejectError('');
        setRejectionReason('');
        setExternalError('');
    };

    const closeRejectExternal = () => {
        if (!rejectLoading) setRejectingExternal(null);
    };

    const handleRejectExternal = async (event) => {
        event.preventDefault();
        if (!rejectingExternal || !rejectionReason.trim()) return;
        setRejectLoading(true);
        setExternalError('');
        try {
            await api.post(`/admin/external-installation-requests/${rejectingExternal.id}/reject`, {
                rejection_reason: rejectionReason.trim(),
            });
            setRejectingExternal(null);
            fetchExternalRequests();
        } catch (requestError) {
            setRejectError(errorMessage(requestError, "Couldn't reject the installation request. Please try again."));
        } finally {
            setRejectLoading(false);
        }
    };

    const previewExternalQuotation = async (requestRecord) => {
        setQuotationPreviewLoadingId(requestRecord.id);
        setExternalError('');
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
            setExternalError(errorMessage(await readBlobError(requestError), "Couldn't open the customer's quotation file. Please try again."));
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
        // With the file type on the end, so the computer knows what opens it
        const extension = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' }[quotationPreview.type] || '';
        link.download = `external-quotation-${quotationPreview.requestRecord.id}${extension}`;
        link.click();
    };

    const formatCurrency = (amount) => {
        if (!amount) return '₱0.00';
        return '₱' + parseFloat(amount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
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
                    scheduleLocation: approvedQuotation.installation_address || approvedQuotation.customer?.install_location || '',
                    scheduleReference: formatQuotationRef(approvedQuotation),
                },
            });
        } catch (err) {
            setError(errorMessage(err, "Couldn't approve the quotation. Please try again."));
        } finally {
            setApprovingQuotationId(null);
        }
    };

    const openRejectQuotation = (quotation) => {
        setRejectingQuotation(quotation);
        setRejectError('');
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
            setRejectError(errorMessage(err, "Couldn't reject the quotation. Please try again."));
        } finally {
            setRejectLoading(false);
        }
    };

    const goToSchedule = (quotation) => {
        navigate('/admin/schedule', {
            state: {
                scheduleQuotationId: quotation.quotation?.id,
                scheduleCustomerName: quotation.customer?.user?.name || 'Customer',
                scheduleLocation: quotation.installation_address || quotation.customer?.install_location || '',
                scheduleReference: formatQuotationRef(quotation),
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

    const cancelledCount = quotations.filter((q) => q.status === 'cancelled').length;
    const filterCounts = { all: totalCount, approved: approvedCount, pending: pendingCount, rejected: rejectedCount, cancelled: cancelledCount };

    // The queue sits beside "Upcoming schedules" (6 rows), so 5 keeps the two
    // cards about the same height. A new filter or sort starts at page 1.
    const queuePager = usePagination(queue, 5);
    const externalPager = usePagination(externalRequests, 5);
    const rowsPager = usePagination(filteredRows, 10, `${statusFilter}|${sort.key}|${sort.dir}`);

    return (
        <AdminLayout active="Overview">
            <AdminHero
                eyebrow={TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                title="Overview"
                subtitle="Customer quotations and installation schedules"
                actions={
                    <button
                        className="btn-primary"
                        style={styles.exportBtn}
                        onClick={() => navigate('/admin/reports')}
                    >
                        <DownloadIcon size={16} color="currentColor" /> Export report
                    </button>
                }
            >
                {!loading && (
                    <HeroStrip>
                        <HeroStat label="Total requests" value={totalCount.toLocaleString()} note="Across Sorsogon" />
                        <HeroStat label="Approved projects" value={approvedCount.toLocaleString()} note="Ready for installation" valueColor="#A8D5C2" />
                        <HeroStat
                            label="Waiting for review"
                            value={pendingCount.toLocaleString()}
                            note={`Oldest has waited ${oldestPendingDays} ${oldestPendingDays === 1 ? 'day' : 'days'}`}
                            valueColor={adminTokens.gold}
                        />
                        <HeroStat label="Contracted value" value={`₱${contractedValueM}M`} note={`Average quotation ${formatCurrency(avgQuote)}`} />
                    </HeroStrip>
                )}
            </AdminHero>

            {loading ? (
                <LoadingState label="Loading dashboard..." />
            ) : (
                <div style={styles.blocks}>

                    <div className="ov-grid" style={styles.twoColGrid}>
                        <div style={{ ...styles.card, padding: 0 }}>
                            <div style={styles.queueHeader}>
                                <div>
                                    <h2 style={{ ...styles.cardTitle, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        Needs a decision
                                        <span style={{
                                            ...styles.countPill,
                                            ...(queue.length ? styles.countPillGold : styles.countPillGreen),
                                        }}>
                                            {queue.length}
                                        </span>
                                    </h2>
                                    <p style={styles.cardSubtitle}>Quotation requests waiting for approval or scheduling, oldest first</p>
                                </div>
                                {queue.length > 0 && (
                                    <button type="button" style={styles.viewAllLink} onClick={() => navigate('/admin/quotations')}>
                                        View all {queue.length} →
                                    </button>
                                )}
                            </div>

                            {queue.length === 0 ? (
                                <div style={{ ...styles.queueEmpty, margin: '0 24px 20px' }}>Nothing waiting on a decision.</div>
                            ) : (
                                // Fits without scrolling on a computer; on a phone the table scrolls
                                // sideways inside the card so the buttons stay reachable
                                <div className="scroll-x">
                                    <table style={styles.queueTable}>
                                        <thead>
                                            <tr>
                                                <th scope="col" style={{ ...styles.queueTh, paddingLeft: '24px' }}>Customer</th>
                                                <th scope="col" style={styles.queueTh}>Location</th>
                                                <th scope="col" style={{ ...styles.queueTh, textAlign: 'right' }}>Amount</th>
                                                <th scope="col" style={styles.queueTh}>Waiting</th>
                                                <th scope="col" style={{ ...styles.queueTh, paddingRight: '24px' }}>
                                                    <span style={styles.srOnly}>Actions</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queuePager.pageItems.map((q) => {
                                                const age = daysAgo(q.created_at);
                                                const isPending = q.queueKind === 'pending';
                                                const stale = isPending && age >= 3;
                                                return (
                                                    <tr key={q.id}>
                                                        <td style={{ ...styles.queueTd, paddingLeft: '24px' }}>
                                                            <div style={styles.queueCustomer}>{q.customer?.user?.name || 'N/A'}</div>
                                                            <button
                                                                style={styles.queueRef}
                                                                onClick={() => setSelectedQuotation(q)}
                                                            >
                                                                {formatQuotationRef(q)}
                                                            </button>
                                                        </td>
                                                        <td style={{ ...styles.queueTd, ...styles.queueLocation }}>
                                                            {q.installation_address || q.customer?.install_location || ''}
                                                        </td>
                                                        <td style={{ ...styles.queueTd, ...styles.queueValue }}>
                                                            {formatCurrency(getValue(q))}
                                                        </td>
                                                        <td style={{ ...styles.queueTd, whiteSpace: 'nowrap' }}>
                                                            <span style={{
                                                                ...styles.queueAgePill,
                                                                ...(stale ? styles.queueAgePillDanger : {}),
                                                            }}>
                                                                {isPending ? `waiting ${age}d` : `approved ${age}d ago`}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...styles.queueTd, paddingRight: '24px' }}>
                                                            <div style={styles.queueActions}>
                                                                {isPending ? (
                                                                    <>
                                                                        <button
                                                                            style={{
                                                                                ...styles.queueApproveBtn,
                                                                                opacity: approvingQuotationId ? 0.65 : 1,
                                                                                cursor: approvingQuotationId ? 'not-allowed' : 'pointer',
                                                                            }}
                                                                            onClick={() => setApproveTarget(q)}
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
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <Pagination {...queuePager} noun="in queue" onChange={queuePager.setPage} style={styles.cardPager} />
                        </div>

                        <div style={{ ...styles.card, ...styles.scheduleCard }}>
                            <div style={styles.scheduleHeader}>
                                <div>
                                    <h2 style={styles.cardTitle}>Upcoming installations</h2>
                                    <p style={styles.cardSubtitle}>Next scheduled visits</p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-secondary m-tap"
                                    style={styles.outlineSmallBtn}
                                    onClick={() => navigate('/admin/schedule')}
                                >
                                    <PlusIcon size={14} color="currentColor" />
                                    Schedule
                                </button>
                            </div>

                            {scheduleLoading ? (
                                <div aria-busy="true" aria-label="Loading schedules" style={styles.scheduleList}>
                                    {[['60%', '40%'], ['70%', '35%'], ['55%', '45%']].map(([w1, w2]) => (
                                        <div key={w1} className="ov-pulse" style={styles.scheduleRow}>
                                            <div style={{ ...styles.scheduleDateBlock, backgroundColor: '#EDF3EF' }} />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ height: '10px', width: w1, background: '#ECECE7', borderRadius: '3px' }} />
                                                <div style={{ height: '10px', width: w2, background: '#F2F2EE', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    ))}
                                    <p style={{ ...styles.cardSubtitle, padding: '12px 0 0' }}>Loading schedules…</p>
                                </div>
                            ) : upcomingSchedules.length === 0 ? (
                                <div style={{ ...styles.queueEmpty, margin: '16px 24px 20px' }}>No upcoming installations scheduled.</div>
                            ) : (
                                <div style={styles.scheduleList}>
                                    {upcomingSchedules.map((s) => {
                                        const d = new Date(s.scheduled_date);
                                        const customerName = s.quotation?.quotation_request?.customer?.user?.name
                                            || s.customer?.user?.name
                                            || s.external_installation_request?.name
                                            || 'N/A';
                                        const location = s.quotation?.quotation_request?.installation_address
                                            || s.quotation?.quotation_request?.customer?.install_location
                                            || s.customer?.install_location
                                            || s.external_installation_request?.address
                                            || '';
                                        return (
                                            // Opens the Schedule page on that day with this installation's details
                                            <button
                                                key={s.id}
                                                type="button"
                                                className="upcoming-row"
                                                onClick={() => navigate('/admin/schedule', { state: { openScheduleId: s.id } })}
                                                aria-label={`${customerName}, ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${s.scheduled_time ? ` at ${formatTime(s.scheduled_time)}` : ''}. View on the schedule`}
                                                style={styles.scheduleRow}
                                            >
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
                                            </button>
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

                        {externalError && <div style={styles.error}>{externalError}</div>}

                        {externalRequests.length === 0 ? (
                            <div style={styles.queueEmpty}>No external installation requests.</div>
                        ) : (
                            <div style={styles.externalList}>
                                {externalPager.pageItems.map((requestRecord) => (
                                    <div key={requestRecord.id} style={styles.externalRow}>
                                        <div style={styles.externalInfo}>
                                            <div style={styles.queueTopLine}>
                                                <span style={styles.queueRef}>{formatExternalRef(requestRecord)}</span>
                                                <span style={styles.queueCustomer}>{requestRecord.name}</span>
                                                <span style={styles.externalSource}>External quotation</span>
                                            </div>
                                            <div style={styles.externalMeta}>
                                                {requestRecord.other_company_name} · Preferred {new Date(requestRecord.preferred_installation_date).toLocaleDateString('en-PH')}
                                            </div>
                                            {requestRecord.address && (
                                                <div style={styles.externalMeta}>{requestRecord.address}</div>
                                            )}
                                            {requestRecord.site_description && (
                                                <div style={{ ...styles.externalMeta, whiteSpace: 'pre-wrap' }}>
                                                    About the site: {requestRecord.site_description}
                                                </div>
                                            )}
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
                                                <Badge status={requestRecord.status} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Pagination {...externalPager} noun="requests" onChange={externalPager.setPage} />
                    </div>

                    <div style={styles.card}>
                        <div style={styles.tableCardHeader}>
                            <div>
                                <h2 style={styles.cardTitle}>Recent Quotations</h2>
                                <p style={styles.cardSubtitle}>Manage and review latest quotation requests</p>
                            </div>

                            <div className="m-wrap" style={styles.segmented}>
                                {['all', 'approved', 'pending', 'rejected', 'cancelled'].map((tab) => (
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
                            </div>

                            {filteredRows.length === 0 ? (
                                <div style={styles.emptyFilterState}>No quotations match this filter.</div>
                            ) : (
                                rowsPager.pageItems.map((q) => {
                                    const age = daysAgo(q.created_at);
                                    const staleAge = q.status === 'pending' && age >= 3;
                                    return (
                                        <div
                                            key={q.id}
                                            className="qt-row"
                                            style={{ ...styles.tableBodyRow, gridTemplateColumns: TABLE_COLUMNS }}
                                            onClick={() => setSelectedQuotation(q)}
                                        >
                                            <span style={styles.tdMono}>{formatQuotationRef(q)}</span>

                                            <span style={{ minWidth: 0 }}>
                                                <div style={styles.tdCustomerName}>
                                                    {q.customer?.user?.name || 'N/A'}
                                                </div>
                                                <div style={styles.tdCustomerLocation}>
                                                    {q.installation_address || q.customer?.install_location || ''}
                                                </div>
                                            </span>

                                            <span style={styles.tdSystem}>
                                                {systemTypeLabel(q.solar_system_type)}
                                            </span>

                                            <span style={styles.tdValue}>{formatCurrency(getValue(q))}</span>

                                            <span style={{ ...styles.tdAge, ...(staleAge ? styles.tdAgeDanger : {}) }}>
                                                {age}d
                                            </span>

                                            <span>
                                                <Badge status={q.status} />
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="m-wrap" style={styles.footerRow}>
                            {rowsPager.pageCount > 1 ? (
                                <Pagination
                                    {...rowsPager}
                                    noun="quotations"
                                    onChange={rowsPager.setPage}
                                    style={styles.footerPager}
                                />
                            ) : (
                                <span style={styles.footerText}>
                                    Showing {filteredRows.length} of {quotations.length} quotations
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn-primary m-tap"
                                style={smallGreenButton}
                                onClick={() => navigate('/admin/quotations')}
                            >
                                View all
                            </button>
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
                                    {quotationPreview.requestRecord.name} · {formatExternalRef(quotationPreview.requestRecord)}
                                </p>
                            </div>
                            <button onClick={closeQuotationPreview} aria-label="Close" className="m-tap" style={styles.modalCloseBtn}>
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

                        <div className="m-wrap" style={styles.confirmModalFooter}>
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
                                    {rejectingQuotation.customer?.user?.name || 'Customer'} · {formatQuotationRef(rejectingQuotation)}
                                </p>
                            </div>
                            <button onClick={closeRejectQuotation} aria-label="Close" className="m-tap" style={styles.modalCloseBtn}>
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
                            {rejectError && <div role="alert" style={styles.modalError}>{rejectError}</div>}
                            <div className="m-wrap" style={styles.confirmModalFooter}>
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
                                    {rejectingExternal.name} · {formatExternalRef(rejectingExternal)}
                                </p>
                            </div>
                            <button onClick={closeRejectExternal} aria-label="Close" className="m-tap" style={styles.modalCloseBtn}>
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
                            {rejectError && <div role="alert" style={styles.modalError}>{rejectError}</div>}
                            <div className="m-wrap" style={styles.confirmModalFooter}>
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
                    badge={formatExternalRef(confirmingExternal)}
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

            {selectedQuotation && (() => {
                const q = selectedQuotation;
                // The installation booked for this quotation, if there is one
                const booked = q.quotation?.id ? schedules.find((s) => s.quotation_id === q.quotation.id) : null;
                const bookedDate = booked?.scheduled_date ? new Date(`${String(booked.scheduled_date).slice(0, 10)}T00:00:00`) : null;
                const address = q.installation_address || q.customer?.install_location || '';
                const email = q.customer?.user?.email;

                return (
                <>
                    <div style={styles.scrim} onClick={() => setSelectedQuotation(null)} aria-hidden="true" />
                    <aside role="dialog" aria-modal="true" aria-labelledby="qv-title" style={styles.drawer}>
                        <div style={styles.drawerHead}>
                            <div style={styles.drawerHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={styles.drawerRef}>{formatQuotationRef(q)}</span>
                                    <Badge status={q.status} />
                                </div>
                                <button
                                    type="button"
                                    className="m-tap"
                                    style={styles.drawerClose}
                                    onClick={() => setSelectedQuotation(null)}
                                    aria-label="Close"
                                >
                                    <XIcon size={20} color="currentColor" />
                                </button>
                            </div>
                            <h2 id="qv-title" style={styles.drawerCustomer}>{q.customer?.user?.name || 'N/A'}</h2>
                            {address && <p style={styles.drawerLocation}>{address}</p>}
                        </div>

                        <div style={styles.drawerBody}>
                            <div style={styles.drawerTotal}>
                                <div style={{ fontSize: '13px', color: '#1F4D3A' }}>{priceLabel(q)}</div>
                                <div style={styles.drawerTotalValue}>{formatCurrency(getValue(q))}</div>
                            </div>

                            <dl style={styles.drawerFacts}>
                                <dt style={{ color: adminTokens.muted }}>System</dt>
                                <dd style={{ margin: 0, fontWeight: 600 }}>{systemTypeLabel(q.solar_system_type)}</dd>
                                <dt style={{ color: adminTokens.muted }}>Requested</dt>
                                <dd style={{ margin: 0 }}>
                                    <span style={{ fontWeight: 600 }}>
                                        {new Date(q.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span style={{ color: adminTokens.muted }}> · {daysAgoLabel(daysAgo(q.created_at))}</span>
                                </dd>
                            </dl>

                            {booked && bookedDate && (
                                <div style={styles.drawerBooked}>
                                    <div style={styles.drawerBookedHead}>
                                        <CheckIcon size={16} color="#2E8B5E" />
                                        Installation scheduled
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px' }}>
                                        <div style={styles.calTile} aria-hidden="true">
                                            <div style={styles.calTileMonth}>
                                                {bookedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{bookedDate.getDate()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>
                                                {bookedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                {booked.scheduled_time ? ` · ${formatTime(booked.scheduled_time)}` : ''}
                                            </div>
                                            {booked.assigned_technician && (
                                                <div style={{ color: adminTokens.muted }}>Technician: {booked.assigned_technician}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        {q.status === 'pending' ? (
                            <div style={styles.drawerActions}>
                                <button
                                    style={styles.drawerApproveBtn}
                                    onClick={() => setApproveTarget(selectedQuotation)}
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
                        ) : q.status === 'approved' && q.quotation?.id
                            && !scheduledQuotationIds.has(q.quotation.id) ? (
                            <div style={styles.drawerActions}>
                                <button
                                    style={styles.drawerApproveBtn}
                                    onClick={() => goToSchedule(q)}
                                >
                                    Schedule installation
                                </button>
                            </div>
                        ) : q.status === 'approved' ? (
                            // The booking card above already says so, when the schedule is loaded
                            !booked && <p style={styles.drawerDecided}>Installation already scheduled.</p>
                        ) : (
                            <p style={styles.drawerDecided}>This quotation has already been decided.</p>
                        )}
                        </div>

                        <div style={styles.drawerFoot}>
                            <button
                                type="button"
                                className="m-tap"
                                style={{ ...adminUi.primaryBtn, flex: 1, height: '42px' }}
                                onClick={() => navigate(`/admin/quotation-requests/${q.id}`)}
                            >
                                View full quotation →
                            </button>
                            {email && (
                                <a href={`mailto:${email}`} style={{ ...adminUi.whiteBtn, height: '42px', textDecoration: 'none' }}>
                                    Contact
                                </a>
                            )}
                        </div>
                    </aside>
                </>
                );
            })()}

            <ConfirmDialog
                open={!!approveTarget}
                title="Approve this quotation?"
                message={approveTarget
                    ? `${approveTarget.customer?.user?.name || 'Customer'} · ${formatQuotationRef(approveTarget)}. The customer will see it as approved, and you'll go to the Schedule page to set the installation date. This can't be undone.`
                    : ''}
                confirmLabel={approvingQuotationId ? 'Approving...' : 'Approve'}
                busy={Boolean(approvingQuotationId)}
                onConfirm={async () => {
                    await handleApprove(approveTarget);
                    setApproveTarget(null);
                }}
                onCancel={() => setApproveTarget(null)}
            />

            <style>{`.qt-row:hover { background-color: #fafbf9; }`}</style>
        </AdminLayout>
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

const styles = {
    modalError: { ...adminUi.errorBanner, margin: '0 1.5rem 1rem' },
    // Gold button on the green banner
    exportBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '42px',
        padding: '0 16px',
        border: 'none',
        borderRadius: adminTokens.radius,
        backgroundColor: adminTokens.gold,
        color: '#14261F',
        fontSize: '14px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    blocks: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    // The queue takes the room it needs; the schedule list is a narrow column
    twoColGrid: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: '20px',
        alignItems: 'start',
    },
    viewAllLink: {
        border: 'none', background: 'none', padding: '2px 0 0', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '14px', fontWeight: 600, color: adminTokens.green, whiteSpace: 'nowrap',
    },
    outlineSmallBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 12px',
        border: `1px solid ${adminTokens.control}`, borderRadius: adminTokens.radius, background: '#FFFFFF',
        color: adminTokens.ink, fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
    },
    card: {
        ...adminUi.card,
        padding: '20px 24px',
        minWidth: 0,
    },
    cardTitle: { fontSize: '16px', fontWeight: 700, color: adminTokens.ink, margin: 0 },
    cardSubtitle: { fontSize: '13px', color: adminTokens.muted, margin: '4px 0 0' },
    cardPager: { padding: '12px 24px 16px' },

    queueHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '20px 24px 14px',
        gap: '0.75rem',
    },
    queueTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    queueTh: {
        ...adminUi.tableHead,
        textAlign: 'left',
        padding: '9px 12px',
        borderTop: `1px solid ${adminTokens.line}`,
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    queueTd: { padding: '14px 12px', borderBottom: `1px solid ${adminTokens.rowLine}`, verticalAlign: 'middle' },
    srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' },
    countPill: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '12px',
        fontWeight: 700,
        padding: '1px 7px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
    },
    countPillGold: { backgroundColor: '#FBEBC4', color: '#7A4F00' },
    countPillGreen: { backgroundColor: '#e4ede8', color: adminTokens.green },
    queueEmpty: {
        backgroundColor: '#e4ede8',
        color: adminTokens.green,
        borderRadius: adminTokens.radius,
        padding: '14px',
        fontSize: '13px',
        fontWeight: 600,
        textAlign: 'center',
    },
    queueList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    externalList: { display: 'flex', flexDirection: 'column', borderTop: `1px solid ${adminTokens.line}` },
    externalRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px',
        flexWrap: 'wrap', padding: '14px 0', borderBottom: `1px solid ${adminTokens.rowLine}`,
    },
    externalInfo: { minWidth: 0, flex: '1 1 280px' },
    externalSource: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '12px', fontWeight: 700, padding: '1px 8px',
        borderRadius: '4px', backgroundColor: '#FBEBC4', color: '#6B4500',
    },
    externalMeta: { fontSize: '13px', color: adminTokens.muted, marginTop: '4px' },
    externalActions: { display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' },
    queueTopLine: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    queueRef: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '13px',
        color: adminTokens.muted,
        textDecoration: 'underline',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
    },
    queueCustomer: { fontSize: '14px', fontWeight: 600, color: adminTokens.ink },
    queueAgePill: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '13px',
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: '4px',
        backgroundColor: '#FBE9DD',
        color: '#A4410E',
    },
    queueAgePillDanger: { backgroundColor: '#fbe4e1', color: '#a3261b' },
    queueLocation: { color: '#3A4440' },
    queueValue: { textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: adminTokens.ink },
    // Buttons wrap under each other instead of widening the table
    queueActions: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' },
    queueApproveBtn: {
        padding: '0 12px',
        minHeight: '34px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        border: 'none',
        borderRadius: adminTokens.radius,
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    queueScheduleBtn: {
        padding: '0 12px',
        minHeight: '34px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        border: 'none',
        borderRadius: adminTokens.radius,
        backgroundColor: adminTokens.green,
        color: 'white',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    queueRejectBtn: {
        padding: '0 12px',
        minHeight: '34px',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        border: '1px solid #E8C4BF',
        borderRadius: adminTokens.radius,
        backgroundColor: '#fff',
        color: adminTokens.danger,
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },

    scheduleCard: { display: 'flex', flexDirection: 'column', padding: 0 },
    scheduleHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '20px 24px 14px',
        borderBottom: `1px solid ${adminTokens.line}`,
    },
    // Rows reach 12px further out than the text, so the hover highlight has room
    scheduleList: { display: 'flex', flexDirection: 'column', padding: '4px 12px 12px' },
    // A button that looks like a list row; its background and hover are in
    // App.css (.upcoming-row), because an inline background would hide the hover
    scheduleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: adminTokens.radius,
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
    },
    scheduleDateBlock: {
        width: '44px',
        height: '44px',
        flexShrink: 0,
        textAlign: 'center',
        justifyContent: 'center',
        borderRadius: adminTokens.radius,
        backgroundColor: '#EDF3EF',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
    },
    scheduleMonth: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '10px',
        color: adminTokens.faint,
        textTransform: 'uppercase',
    },
    scheduleDay: { fontSize: '17px', fontWeight: 700, color: adminTokens.ink, lineHeight: 1.1 },
    scheduleInfo: { flex: 1, minWidth: 0 },
    scheduleCustomer: {
        fontSize: '14px',
        fontWeight: 600,
        color: adminTokens.ink,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    scheduleLocation: {
        fontSize: '13px',
        color: adminTokens.muted,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    scheduleTime: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: adminTokens.muted, flexShrink: 0 },

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
        flexWrap: 'wrap',
        gap: '4px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D6D6D0',
        padding: '3px',
        borderRadius: adminTokens.radius,
    },
    segmentBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        color: '#4a5a52',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: adminTokens.fontUI,
    },
    segmentBtnActive: {
        backgroundColor: adminTokens.green,
        color: '#ffffff',
    },
    segmentCount: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '10.5px', opacity: 0.8 },

    error: adminUi.errorBanner,

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
        borderRadius: adminTokens.heroRadius,
        backgroundColor: adminTokens.surface,
        boxShadow: '0 20px 60px rgba(16,33,26,.22)',
    },
    quotationPreviewCard: {
        width: 'min(900px, 100%)',
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden',
        borderRadius: adminTokens.heroRadius,
        backgroundColor: adminTokens.surface,
        boxShadow: '0 20px 60px rgba(16,33,26,.22)',
    },
    quotationPreviewHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '24px clamp(16px, 5vw, 28px) 20px',
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
    quotationPreviewImage: { display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 270px)', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 4px 18px rgba(16,33,26,.14)' },
    quotationPreviewFrame: { display: 'block', width: '100%', height: 'min(620px, calc(100vh - 270px))', border: 'none', borderRadius: '6px', backgroundColor: 'white' },
    quotationUnsupported: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: adminTokens.muted, textAlign: 'center' },
    modalEyebrow: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: adminTokens.green,
    },
    confirmModalTitle: { margin: '7px 0 3px', fontSize: '22px', color: adminTokens.ink },
    confirmModalSubtitle: { margin: 0, color: adminTokens.muted, fontSize: '13px' },
    rejectModalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', padding: '24px clamp(16px, 5vw, 28px) 20px', backgroundColor: '#fbeae7', borderBottom: '1px solid #f0d0cb' },
    rejectModalEyebrow: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '10px', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: adminTokens.danger },
    rejectModalTitle: { margin: '7px 0 3px', fontSize: '22px', color: adminTokens.ink },
    modalCloseBtn: {
        display: 'grid',
        placeItems: 'center',
        width: '30px',
        height: '30px',
        border: `1px solid ${adminTokens.border}`,
        borderRadius: '6px',
        backgroundColor: adminTokens.surface,
        cursor: 'pointer',
        flexShrink: 0,
    },
    rejectModalBody: { padding: '24px clamp(16px, 5vw, 28px) 12px' },
    rejectIntro: { margin: '0 0 18px', color: adminTokens.body, fontSize: '13px', lineHeight: 1.55 },
    rejectTextarea: { width: '100%', boxSizing: 'border-box', minHeight: '126px', padding: '10px 11px', resize: 'vertical', fontFamily: adminTokens.fontUI, lineHeight: 1.5 },
    rejectCharacterCount: { marginTop: '6px', color: adminTokens.faint, fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '10px', textAlign: 'right' },
    confirmPreferredNote: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '18px',
        padding: '10px 12px',
        borderRadius: '6px',
        backgroundColor: '#fdf8e8',
        color: '#725b16',
        fontSize: '12.5px',
    },
    confirmField: { display: 'flex', flexDirection: 'column', gap: '7px' },
    confirmLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: adminTokens.body },
    confirmModalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '9px', flexWrap: 'wrap', padding: '16px clamp(16px, 5vw, 28px) 22px', borderTop: `1px solid ${adminTokens.hairline}` },
    modalSecondaryBtn: { ...whiteButton, minWidth: '92px', minHeight: '40px' },
    modalPrimaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', minWidth: '170px', minHeight: '40px', padding: '10px 16px', border: 'none', borderRadius: '6px', backgroundColor: adminTokens.green, color: 'white', fontWeight: 700, boxShadow: '0 2px 6px rgba(15,59,44,.14)' },
    modalDangerBtn: { minWidth: '132px', minHeight: '40px', padding: '10px 16px', border: '1px solid #c0392b', borderRadius: '6px', backgroundColor: '#c0392b', color: 'white', fontWeight: 700, boxShadow: '0 2px 6px rgba(192,57,43,.14)' },

    tableScrollWrap: { overflowX: 'auto' },
    th: {
        fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums',
        fontSize: '10.5px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: adminTokens.green,
        display: 'flex',
        alignItems: 'center',
    },
    thSortable: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'inherit',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        // Same as the other column labels on the light table head
        color: adminTokens.muted,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    sortArrow: { color: adminTokens.green, fontSize: '12px' },
    tableHeaderRow: {
        display: 'grid',
        gap: '12px',
        padding: '10px 20px',
        minWidth: '860px',
        ...adminUi.tableHead,
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
    tdMono: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '12.5px', color: adminTokens.ink },
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
    tdValue: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '12.5px', color: adminTokens.ink, textAlign: 'right' },
    tdAge: { fontFamily: adminTokens.fontUI, fontVariantNumeric: 'tabular-nums', fontSize: '12.5px', color: adminTokens.muted, textAlign: 'right' },
    tdAgeDanger: { color: adminTokens.danger, fontWeight: 500 },
    emptyFilterState: {
        padding: '32px 0',
        textAlign: 'center',
        fontSize: '13px',
        color: adminTokens.muted,
    },
    // Sits in the footer next to "View all", which brings its own spacing
    footerPager: { padding: 0, flex: 1, minWidth: 0 },
    footerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px 16px',
        paddingTop: '14px',
        marginTop: '6px',
        borderTop: `1px solid ${adminTokens.hairline}`,
    },
    footerText: { fontSize: '12.5px', color: adminTokens.muted },

    // Quick view: a panel from the right edge (the "quick view" mockup)
    scrim: { position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 30, 24, 0.42)', zIndex: 200 },
    drawer: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '440px',
        maxWidth: '100%',
        backgroundColor: '#FFFFFF',
        borderLeft: `1px solid ${adminTokens.line}`,
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
        fontSize: '14px',
        color: adminTokens.ink,
    },
    drawerHead: { padding: '18px 24px 16px', borderBottom: `1px solid ${adminTokens.line}` },
    drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
    drawerRef: { fontSize: '13px', fontWeight: 600, color: adminTokens.muted, fontVariantNumeric: 'tabular-nums' },
    drawerClose: {
        width: '44px', height: '44px', margin: '-10px -12px -10px 0', border: 'none', background: 'transparent',
        borderRadius: adminTokens.radius, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: adminTokens.body, flex: 'none',
    },
    drawerCustomer: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', color: adminTokens.ink, margin: '6px 0 2px' },
    drawerLocation: { color: adminTokens.muted, margin: 0 },
    drawerBody: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' },
    drawerTotal: { background: '#E3F1E8', borderRadius: adminTokens.radius, padding: '14px 16px' },
    drawerTotalValue: { fontSize: '26px', fontWeight: 700, color: adminTokens.green, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' },
    drawerFacts: { margin: 0, display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '10px 12px' },
    drawerBooked: { border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius },
    drawerBookedHead: {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontWeight: 700,
        borderBottom: `1px solid ${adminTokens.rowLine}`, background: adminTokens.headBg,
        borderRadius: `${adminTokens.radius} ${adminTokens.radius} 0 0`,
    },
    calTile: {
        width: '46px', flex: 'none', border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius,
        overflow: 'hidden', textAlign: 'center',
    },
    calTileMonth: {
        background: adminTokens.green, color: '#FFFFFF', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', padding: '1px 0',
    },
    drawerFoot: { display: 'flex', gap: '8px', padding: '14px 24px', borderTop: `1px solid ${adminTokens.line}` },
    drawerActions: { display: 'flex', gap: '10px' },
    drawerApproveBtn: {
        flex: 1,
        padding: '12px',
        border: 'none',
        borderRadius: '6px',
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
        borderRadius: '6px',
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
        borderRadius: '6px',
        padding: '14px',
        textAlign: 'center',
    },
};
