import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import api from '../api/axios';
import { LocationIcon, MailIcon, DocumentIcon } from '../components/Icons';
import { colors, typography, statusColors } from '../styles/theme';

export default function AdminProjectsPage() {
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/quotation-requests');
            setQuotations(res.data);
        } catch {
            setError('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchProjects);
    }, [fetchProjects]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSystemTypeLabel = (type) => {
        const labels = {
            'on-grid': 'On-Grid',
            'off-grid': 'Off-Grid',
            'hybrid': 'Hybrid',
        };
        return labels[type] || type;
    };

    const getCapacityDisplay = (quotation) => {
        const kw = quotation.solar_computation?.panel_capacity_kw;
        if (!kw) return 'N/A';
        return `${parseFloat(kw).toFixed(2)} kW`;
    };

    const getStatusColor = (status) => {
        return (statusColors[status] || statusColors.draft).text;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <AdminLayout active="Projects">

            <h1 style={styles.pageTitle}>Quotation Requests</h1>
            <p style={styles.pageSubtitle}>
                Request a purchase to your suppliers
            </p>

            {error && <div style={styles.error}>{error}</div>}

            {loading ? (
                <LoadingState label="Loading projects..." />
            ) : quotations.length === 0 ? (
                <EmptyState
                    icon={<DocumentIcon size={32} color={colors.textFaint} />}
                    title="No quotation requests found"
                    description="Quotation requests will appear here once customers submit them."
                />
            ) : (
                <div className="responsive-grid-2" style={styles.cardsGrid}>
                    {quotations.map((quotation) => (
                        <div key={quotation.id} style={styles.projectCard}>

                            <div style={styles.cardHeader}>
                                <div style={styles.cardTitleSection}>
                                    <h2 style={styles.cardTitle}>
                                        {quotation.customer?.user?.name || 'Unknown Customer'}
                                    </h2>
                                    <p style={styles.cardSubtitle}>
                                        {getSystemTypeLabel(quotation.solar_system_type)} System
                                    </p>
                                    <div style={styles.locationRow}>
                                        <span style={styles.locationIcon}>
                                            <LocationIcon size={12} color={colors.textFaint} />
                                        </span>
                                        <span style={styles.locationText}>
                                            {quotation.customer?.install_location || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div style={styles.capacityBadge}>
                                    <span style={styles.capacityValue}>
                                        {getCapacityDisplay(quotation)}
                                    </span>
                                    <span style={styles.capacityLabel}>CAPACITY</span>
                                </div>
                            </div>

                            <div style={styles.cardInfoRow}>
                                <div style={styles.personCard}>
                                    <div style={{
                                        ...styles.personAvatar,
                                        backgroundColor: getStatusColor(quotation.status),
                                    }}>
                                        {getInitials(quotation.customer?.user?.name)}
                                    </div>
                                    <span style={styles.personName}>
                                        {quotation.customer?.user?.name?.split(' ')[0] || 'Customer'}
                                    </span>
                                </div>

                                <div style={styles.deadlineCard}>
                                    <span style={styles.deadlineLabel}>
                                        {quotation.status === 'approved' ? 'APPROVED' :
                                         quotation.status === 'rejected' ? 'REJECTED' : 'SUBMITTED'}
                                    </span>
                                    <span style={styles.deadlineValue}>
                                        {formatDate(quotation.submission_date)}
                                    </span>
                                </div>
                            </div>

                            <div style={styles.cardActions}>
                                <button
                                    className="btn-secondary"
                                    style={styles.viewDetailsBtn}
                                    onClick={() => navigate(`/admin/quotation-requests/${quotation.id}`)}
                                >
                                    View Details
                                </button>

                                <button
                                    className="btn-primary"
                                    style={{ ...styles.contactBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    onClick={() => navigate('/admin/inbox')}
                                >
                                    <MailIcon size={15} color="currentColor" /> Contact
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}

const styles = {
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: colors.textMuted,
        margin: '0 0 1.5rem 0',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    cardsGrid: {
        gap: '1.25rem',
    },
    projectCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitleSection: {
        flex: 1,
    },
    cardTitle: {
        fontSize: '1.125rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.25rem 0',
    },
    cardSubtitle: {
        fontSize: '0.8rem',
        color: '#6b7280',
        margin: '0 0 0.375rem 0',
    },
    locationRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    locationIcon: {
        display: 'flex',
        alignItems: 'center',
        color: '#9ca3af',
    },
    locationText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    capacityBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    capacityValue: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#0d9488',
    },
    capacityLabel: {
        fontSize: '0.65rem',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    cardInfoRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
    },
    personCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        padding: '0.75rem',
    },
    personAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
        flexShrink: 0,
    },
    personName: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: '#111827',
    },
    deadlineCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.125rem',
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        padding: '0.75rem',
    },
    deadlineLabel: {
        fontSize: '0.65rem',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: '600',
    },
    deadlineValue: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#111827',
    },
    cardActions: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
    },
    viewDetailsBtn: {
        padding: '0.75rem',
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: '500',
    },
    contactBtn: {
        padding: '0.75rem',
        backgroundColor: colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
};
    