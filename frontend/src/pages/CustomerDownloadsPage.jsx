import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { colors, typography } from '../styles/theme';

export default function CustomerDownloadsPage() {
    const navigate = useNavigate();

    const [approvedQuotations, setApprovedQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);


    const fetchApprovedQuotations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/quotation-requests');
            const approved = res.data.filter(
                q => q.status === 'approved' && q.quotation
            );
            setApprovedQuotations(approved);
        } catch {
            setError('Failed to load downloads.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchApprovedQuotations);
    }, [fetchApprovedQuotations]);

    const handleDownload = async (quotationId, reference) => {
        setDownloadingId(quotationId);

        try {
            const res = await api.get(
                `/customer/reports/quotation/${quotationId}`,
                { responseType: 'blob' }
            );

            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `${reference}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            setError('Failed to download PDF. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const formatReference = (id, createdAt) => {
        const year = new Date(createdAt).getFullYear();
        const paddedId = String(id).padStart(3, '0');
        return `#Q-${year}-${paddedId}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <CustomerLayout active="Downloads">

            <h1 style={styles.pageTitle}>Downloads</h1>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.tableCard}>

                {loading ? (
                    <LoadingState label="Loading your downloads..." />
                ) : approvedQuotations.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No downloads available</p>
                        <p style={styles.emptyDesc}>
                            Approved quotations will appear here for download.
                        </p>
                        <button
                            className="btn-primary"
                            style={styles.emptyBtn}
                            onClick={() => navigate('/quotation/new')}
                        >
                            Request a Quotation
                        </button>
                    </div>
                ) : (
                <div className="table-scroll">
                <div>
                <div style={styles.tableHeader}>
                    <span style={{ flex: 2 }}>REFERENCE</span>
                    <span style={{ flex: 2 }}>DATE SUBMITTED</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>ACTIONS</span>
                </div>
                    {approvedQuotations.map((qr) => {
                        const reference = formatReference(qr.id, qr.created_at);
                        const quotationId = qr.quotation.id;
                        const isDownloading = downloadingId === quotationId;

                        return (
                            <div key={qr.id} style={styles.tableRow}>

                                <span style={{ flex: 2 }}>
                                    <span style={styles.referenceText}>{reference}</span>
                                </span>

                                <span style={{ flex: 2, color: '#6b7280', fontSize: '0.875rem' }}>
                                    {formatDate(qr.submission_date)}
                                </span>

                                <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-primary"
                                        style={{
                                            ...styles.downloadBtn,
                                            opacity: isDownloading ? 0.7 : 1,
                                            cursor: isDownloading ? 'not-allowed' : 'pointer',
                                        }}
                                        onClick={() => handleDownload(quotationId, reference)}
                                        disabled={isDownloading}
                                    >
                                        {isDownloading ? 'Downloading...' : 'Download'}
                                    </button>
                                </span>
                            </div>
                        );
                    })}
                </div>
                </div>
                )}
            </div>

            <div style={styles.footer}>
                <div style={styles.footerLeft}>
                    <span style={styles.footerText}>
                        © {new Date().getFullYear()} TataMawing Solar. All rights reserved.
                    </span>
                    <div style={styles.footerLinks}>
                        <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                        <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                        <span style={styles.footerLink}>Sustainability Report</span>
                    </div>
                </div>
                <div style={styles.systemStatus}>
                    <div style={styles.statusDot} />
                    <span style={styles.statusText}>All Nodes Active</span>
                </div>
            </div>
        </CustomerLayout>
    );
}

const styles = {
    pageTitle: {
        ...typography.h1,
        marginBottom: '1.5rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    tableCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        marginBottom: '1.5rem',
        overflow: 'hidden',
    },
    tableHeader: {
        display: 'flex',
        padding: '0.875rem 1.5rem',
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: '1px solid #f3f4f6',
    },
    tableRow: {
        display: 'flex',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #f9fafb',
        alignItems: 'center',
    },
    referenceText: {
        fontWeight: '700',
        color: '#111827',
        fontSize: '0.9rem',
    },
    downloadBtn: {
        padding: '0.5rem 1.5rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
        fontSize: '0.875rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
    },
    emptyTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.5rem',
    },
    emptyDesc: {
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginBottom: '1.5rem',
    },
    emptyBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '1rem',
    },
    footerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    footerLinks: {
        display: 'flex',
        gap: '1rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        cursor: 'pointer',
        textDecoration: 'none',
    },
    systemStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
    },
    statusText: {
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
    },
};