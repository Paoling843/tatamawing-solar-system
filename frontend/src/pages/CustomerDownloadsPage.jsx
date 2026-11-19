import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { errorMessage, readBlobError } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';

// PDF copies of the customer's approved quotations, one row each.
// Look from the "Customer · Downloads" mockup.

const C = {
    green: '#0F3D2E',
    ink: '#1B2420',
    muted: '#5F6A65',
    line: '#E3E3DE',
    rowLine: '#EFEFEA',
    stripText: '#C3D3CB',
};

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
        } catch (err) {
            setError(errorMessage(err, "We couldn't load your downloads. Please try again."));
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
        } catch (err) {
            setError(errorMessage(await readBlobError(err), "We couldn't download the PDF. Please try again."));
        } finally {
            setDownloadingId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <CustomerLayout active="Downloads">
            <div style={styles.page}>
                <section aria-label="Summary" style={styles.hero}>
                    <h1 style={styles.heroTitle}>Downloads</h1>
                    <p style={styles.heroSub}>PDF copies of your quotations</p>
                </section>

                {error && <div role="alert" style={styles.error}>{error}</div>}

                <section style={styles.card}>
                    {loading ? (
                        <LoadingState label="Loading your downloads..." />
                    ) : approvedQuotations.length === 0 ? (
                        <div style={styles.emptyState}>
                            <h2 style={styles.emptyTitle}>No downloads available</h2>
                            <p style={styles.emptyDesc}>Approved quotations will appear here for download.</p>
                            <button
                                type="button"
                                className="c-btn c-btn-primary"
                                style={{ height: '40px', fontSize: '14px' }}
                                onClick={() => navigate('/quotation/new')}
                            >
                                Request a quotation
                            </button>
                        </div>
                    ) : (
                        <ul style={styles.list}>
                            {approvedQuotations.map((qr, i) => {
                                const reference = formatQuotationRef(qr);
                                const quotationId = qr.quotation.id;
                                const isDownloading = downloadingId === quotationId;

                                return (
                                    <li key={qr.id} style={{ ...styles.row, ...(i ? styles.rowDivider : {}) }}>
                                        <span style={styles.fileIcon} aria-hidden="true">PDF</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700 }}>Quotation {reference}</div>
                                            <div style={{ fontSize: '13px', color: C.muted }}>
                                                Submitted {formatDate(qr.submission_date || qr.created_at)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="c-btn c-btn-secondary"
                                            aria-label={`Download quotation ${reference} as PDF`}
                                            onClick={() => handleDownload(quotationId, reference)}
                                            disabled={isDownloading}
                                            style={isDownloading ? { opacity: 0.7, cursor: 'wait' } : undefined}
                                        >
                                            <DownloadGlyph />
                                            {isDownloading ? 'Downloading…' : 'Download'}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <footer style={styles.footer}>
                    <span style={{ flex: 1 }}>© {new Date().getFullYear()} TataMawing Solar. All rights reserved.</span>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                </footer>
            </div>
        </CustomerLayout>
    );
}

function DownloadGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
        </svg>
    );
}

const styles = {
    page: { display: 'flex', flexDirection: 'column', gap: '20px' },

    hero: { background: C.green, color: '#FFFFFF', borderRadius: '8px', padding: '22px 24px 20px' },
    heroTitle: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
    heroSub: { margin: '2px 0 0', fontSize: '14px', color: C.stripText },

    error: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #F0D0CB',
        background: '#FBEAE7', color: '#A4302A', fontSize: '14px',
    },

    card: { background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: '6px' },
    list: { listStyle: 'none', margin: 0, padding: 0 },
    row: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', color: C.ink },
    rowDivider: { borderTop: `1px solid ${C.rowLine}` },
    fileIcon: {
        width: '36px', height: '36px', borderRadius: '6px', background: '#FBE4E1', color: '#A3261B',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.04em', flex: 'none',
    },

    emptyState: { textAlign: 'center', padding: '40px 20px', color: C.muted },
    emptyTitle: { fontSize: '16px', fontWeight: 700, color: C.ink, margin: '0 0 6px' },
    emptyDesc: { margin: '0 0 18px' },

    footer: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 0 0', fontSize: '13px', color: C.muted },
    footerLink: { color: C.muted },
};
