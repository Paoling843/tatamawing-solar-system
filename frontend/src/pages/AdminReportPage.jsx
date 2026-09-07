import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';
import {
    ClockIcon,
    BoltIcon,
    DollarSignIcon,
    LeafIcon,
    SunIcon,
    BarChartIcon,
    DownloadIcon,
    WrenchIcon,
    PackageIcon,
    DocumentIcon,
} from '../components/Icons';
import { colors, typography } from '../styles/theme';

function DonutChart({ data, centerLabel, centerSubLabel }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    // Each slice needs the share of the circle taken up by the slices before
    // it. Deriving that up front keeps the render free of mutable state.
    const slices = data.map((item, index) => {
        const share = (value) => (total > 0 ? value / total : 0);
        return {
            ...item,
            percentage: share(item.value),
            offset: data.slice(0, index).reduce((sum, prev) => sum + share(prev.value), 0),
        };
    });

    return (
        <svg width="180" height="180" viewBox="0 0 180 180">
            <circle
                cx="90" cy="90" r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="28"
            />
            {slices.map((item, index) => {
                const strokeDasharray = `${item.percentage * circumference} ${circumference}`;
                const strokeDashoffset = -item.offset * circumference;

                return (
                    <circle
                        key={index}
                        cx="90" cy="90"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="28"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 90 90)"
                    />
                );
            })}
            <text x="90" y="85" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
                {centerLabel}
            </text>
            <text x="90" y="103" textAnchor="middle" fontSize="10" fill="#6b7280">
                {centerSubLabel}
            </text>
        </svg>
    );
}

export default function AdminReportPage() {
    const [quotationRequests, setQuotationRequests] = useState([]);
    const [loading, setLoading] = useState('');
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [error, setError] = useState('');


    const fetchQuotations = useCallback(async () => {
        try {
            const res = await api.get('/admin/quotation-requests');
            setQuotationRequests(res.data);
        } catch {
            setError('Failed to load analytics data.');
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchQuotations);
    }, [fetchQuotations]);

    const downloadReport = async (reportType) => {
        setError('');
        setLoading(reportType);

        try {
            let url = '';
            let filename = '';

            if (reportType === 'quotation-history') {
                url = '/admin/reports/quotation-history';
                filename = 'quotation-history-report.pdf';
            } else if (reportType === 'quotation-material') {
                url = '/admin/reports/quotation-material';
                filename = 'quotation-material-report.pdf';
            } else if (reportType === 'procurement') {
                url = '/admin/reports/procurement';
                filename = 'procurement-report.pdf';
            } else if (reportType === 'quotation') {
                if (!selectedQuotationId) {
                    setError('Please select a quotation first.');
                    setLoading('');
                    return;
                }
                url = `/admin/reports/quotation/${selectedQuotationId}`;
                filename = `quotation-report-${selectedQuotationId}.pdf`;
            }

            const res = await api.get(url, { responseType: 'blob' });

            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            setError('Failed to generate report. Please try again.');
        } finally {
            setLoading('');
        }
    };

    const totalRequests = quotationRequests.length;
    const approvedRequests = quotationRequests.filter(q => q.status === 'approved').length;
    const totalRevenue = quotationRequests
        .filter(q => q.quotation?.total_amount)
        .reduce((sum, q) => sum + parseFloat(q.quotation.total_amount), 0);

    const onGridCount = quotationRequests.filter(q => q.solar_system_type === 'on-grid').length;
    const offGridCount = quotationRequests.filter(q => q.solar_system_type === 'off-grid').length;
    const hybridCount = quotationRequests.filter(q => q.solar_system_type === 'hybrid').length;

    const chartData = [
        { label: 'On-Grid', value: onGridCount || 1, color: '#38bdf8' },
        { label: 'Off-Grid', value: offGridCount || 1, color: '#1a4a3a' },
        { label: 'Hybrid', value: hybridCount || 1, color: '#f59e0b' },
    ];

    const chartTotal = chartData.reduce((sum, d) => sum + d.value, 0);

    const approvedQuotations = quotationRequests.filter(
        q => q.status === 'approved' && q.quotation
    );

    return (
        <AdminLayout active="Analytics">
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>Detailed Analytics</h1>
                    <p style={styles.pageSubtitle}>
                        Real-time performance metrics and report generation.
                    </p>
                </div>
                <div style={styles.headerActions}>
                    <button
                        className="btn-secondary"
                        style={styles.exportPdfBtn}
                        onClick={() => downloadReport('quotation-history')}
                    >
                        {loading === 'quotation-history' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <ClockIcon size={14} color="currentColor" /> Generating...
                            </span>
                        ) : 'Export PDF'}
                    </button>
                    <button
                        style={styles.shareReportBtn}
                        onClick={() => downloadReport('procurement')}
                    >
                        {loading === 'procurement' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <ClockIcon size={14} color="currentColor" /> Generating...
                            </span>
                        ) : 'Share Report'}
                    </button>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div className="responsive-grid-4" style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                    <div style={styles.metricCardHeader}>
                        <span style={styles.metricIcon}><BoltIcon size={24} color="#38bdf8" /></span>
                    </div>
                    <p style={styles.metricLabel}>TOTAL REQUESTS</p>
                    <p style={styles.metricValue}>{totalRequests.toLocaleString()}</p>
                    <p style={styles.metricSubLabel}>Vs. last billing cycle</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#38bdf8' }} />
                </div>

                <div style={styles.metricCard}>
                    <div style={styles.metricCardHeader}>
                        <span style={styles.metricIcon}><DollarSignIcon size={24} color="#16a34a" /></span>
                    </div>
                    <p style={styles.metricLabel}>TOTAL REVENUE</p>
                    <p style={styles.metricValue}>
                        ₱{(totalRevenue / 1000)}K
                    </p>
                    <p style={styles.metricSubLabel}>From approved projects</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#16a34a' }} />
                </div>

                <div style={styles.metricCard}>
                    <div style={styles.metricCardHeader}>
                        <span style={styles.metricIcon}><LeafIcon size={24} color="#34d399" /></span>
                    </div>
                    <p style={styles.metricLabel}>APPROVED PROJECTS</p>
                    <p style={styles.metricValue}>{approvedRequests}</p>
                    <p style={styles.metricSubLabel}>Successfully processed</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#34d399' }} />
                </div>

                <div style={styles.metricCard}>
                    <div style={styles.metricCardHeader}>
                        <span style={styles.metricIcon}><SunIcon size={24} color="#f59e0b" /></span>
                    </div>
                    <p style={styles.metricLabel}>SYSTEM STATUS</p>
                    <p style={styles.metricValue}>Active</p>
                    <p style={styles.metricSubLabel}>All systems operational</p>
                    <div style={{ ...styles.accentBar, backgroundColor: '#f59e0b' }} />
                </div>
            </div>

            <div className="responsive-grid-2" style={styles.contentRow}>
                <div style={styles.chartCard}>
                    <h2 style={styles.chartTitle}>Source Distribution</h2>
                    <p style={styles.chartSubtitle}>
                        Solar quotations by system type
                    </p>

                    <div style={styles.chartWrapper}>
                        <DonutChart
                            data={chartData}
                            centerLabel="100%"
                            centerSubLabel="SOLAR"
                        />
                    </div>

                    <div style={styles.legendList}>
                        {chartData.map((item) => (
                            <div key={item.label} style={styles.legendItem}>
                                <div style={{
                                    ...styles.legendDot,
                                    backgroundColor: item.color,
                                }} />
                                <span style={styles.legendLabel}>{item.label}</span>
                                <span style={styles.legendPercent}>
                                    {chartTotal > 0
                                        ? Math.round((item.value / chartTotal) * 100)
                                        : 0}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.reportsCard}>
                    <h2 style={styles.chartTitle}>Download Reports</h2>
                    <p style={styles.chartSubtitle}>Export system data as PDF</p>

                    <div style={styles.reportsList}>
                        <div style={styles.reportItem}>
                            <div style={styles.reportItemLeft}>
                                <span style={styles.reportIcon}><BarChartIcon size={24} color="#1a4a3a" /></span>
                                <div>
                                    <p style={styles.reportName}>Quotation History</p>
                                    <p style={styles.reportDesc}>All requests with statuses</p>
                                </div>
                            </div>
                            <button
                                onClick={() => downloadReport('quotation-history')}
                                style={styles.reportDownloadBtn}
                                disabled={loading === 'quotation-history'}
                            >
                                {loading === 'quotation-history' ? <ClockIcon size={16} color="currentColor" /> : <DownloadIcon size={16} color="currentColor" />}
                            </button>
                        </div>

                        <div style={styles.reportItem}>
                            <div style={styles.reportItemLeft}>
                                <span style={styles.reportIcon}><WrenchIcon size={24} color="#1a4a3a" /></span>
                                <div>
                                    <p style={styles.reportName}>Material Report</p>
                                    <p style={styles.reportDesc}>Materials per project</p>
                                </div>
                            </div>
                            <button
                                onClick={() => downloadReport('quotation-material')}
                                style={styles.reportDownloadBtn}
                                disabled={loading === 'quotation-material'}
                            >
                                {loading === 'quotation-material' ? <ClockIcon size={16} color="currentColor" /> : <DownloadIcon size={16} color="currentColor" />}
                            </button>
                        </div>

                        <div style={styles.reportItem}>
                            <div style={styles.reportItemLeft}>
                                <span style={styles.reportIcon}><PackageIcon size={24} color="#1a4a3a" /></span>
                                <div>
                                    <p style={styles.reportName}>Procurement Report</p>
                                    <p style={styles.reportDesc}>Purchase requests and supplier responses</p>
                                </div>
                            </div>
                            <button
                                onClick={() => downloadReport('procurement')}
                                style={styles.reportDownloadBtn}
                                disabled={loading === 'procurement'}
                            >
                                {loading === 'procurement' ? <ClockIcon size={16} color="currentColor" /> : <DownloadIcon size={16} color="currentColor" />}
                            </button>
                        </div>

                        <div style={styles.reportItem}>
                            <div style={styles.reportItemLeft}>
                                <span style={styles.reportIcon}><DocumentIcon size={24} color="#1a4a3a" /></span>
                                <div>
                                    <p style={styles.reportName}>Individual Quotation</p>
                                    <select
                                        value={selectedQuotationId}
                                        onChange={(e) => setSelectedQuotationId(e.target.value)}
                                        className="input-field"
                                        style={styles.quotationSelect}
                                    >
                                        <option value="">Select quotation...</option>
                                        {approvedQuotations.map((qr) => (
                                            <option key={qr.quotation?.id} value={qr.quotation?.id}>
                                                {qr.customer?.user?.name} — #{qr.quotation?.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={() => downloadReport('quotation')}
                                style={styles.reportDownloadBtn}
                                disabled={loading === 'quotation'}
                            >
                                {loading === 'quotation' ? <ClockIcon size={16} color="currentColor" /> : <DownloadIcon size={16} color="currentColor" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: colors.textMuted,
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        gap: '0.75rem',
    },
    exportPdfBtn: {
        padding: '0.5rem 1.25rem',
        border: '1px solid #1a4a3a',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: '#1a4a3a',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    shareReportBtn: {
        padding: '0.5rem 1.25rem',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#38bdf8',
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    metricsGrid: {
        marginBottom: '1.5rem',
    },
    metricCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
    },
    metricCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
    },
    metricIcon: {
        fontSize: '1.5rem',
    },
    metricTrend: {
        fontSize: '0.75rem',
        color: '#16a34a',
        fontWeight: '600',
    },
    metricLabel: {
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: '0 0 0.25rem 0',
    },
    metricValue: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.25rem 0',
    },
    metricSubLabel: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: 0,
    },
    accentBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
    },
    contentRow: {
        gap: '1.5rem',
    },
    chartCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    chartTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.25rem 0',
    },
    chartSubtitle: {
        fontSize: '0.8rem',
        color: '#6b7280',
        margin: '0 0 1.5rem 0',
    },
    chartWrapper: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem',
    },
    legendList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    legendDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    legendLabel: {
        flex: 1,
        fontSize: '0.875rem',
        color: '#374151',
    },
    legendPercent: {
        fontSize: '0.875rem',
        color: '#6b7280',
        fontWeight: '600',
    },
    reportsCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    reportsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginTop: '1rem',
    },
    reportItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        flexWrap: 'wrap',
        gap: '0.75rem',
    },
    reportItemLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flex: 1,
    },
    reportIcon: {
        fontSize: '1.5rem',
    },
    reportName: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#111827',
        margin: '0 0 0.125rem 0',
    },
    reportDesc: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: 0,
    },
    quotationSelect: {
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        color: '#374151',
        marginTop: '0.25rem',
        maxWidth: '200px',
    },
    reportDownloadBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        backgroundColor: '#f0f7f4',
        color: '#1a4a3a',
        border: '1px solid #bbf7d0',
        cursor: 'pointer',
        fontSize: '1rem',
        flexShrink: 0,
    },
};
