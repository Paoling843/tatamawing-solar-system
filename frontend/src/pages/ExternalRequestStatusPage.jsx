import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { CalendarIcon, CheckCircleIcon, ClockIcon, XIcon } from '../components/Icons';
import { colors, typography } from '../styles/theme';

// "Check request status" from the installation-request emails
// (/installation-request/:id/status?expires=…&signature=…). No login: the
// signature in the link is what lets the API show this one request.

const STATUS = {
    pending_review: {
        label: 'Pending review',
        title: "We're reviewing your request",
        text: 'Our team is checking your quotation from the other company. We will email you once it is confirmed.',
        color: colors.warning,
        tint: colors.warningTint,
        Icon: ClockIcon,
    },
    confirmed: {
        label: 'Confirmed',
        title: 'Your installation is confirmed',
        text: 'Our team will contact you with the remaining installation details.',
        color: colors.success,
        tint: colors.successTint,
        Icon: CheckCircleIcon,
    },
    rejected: {
        label: 'Not approved',
        title: 'Your request was not approved',
        text: 'Your installation request was not approved at this time.',
        color: colors.danger,
        tint: colors.dangerTint,
        Icon: XIcon,
    },
};

// "2026-11-03" → "November 3, 2026" (date only, so no timezone shift)
const longDate = (value) => {
    if (!value) return null;
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

// "13:30:00" → "1:30 PM"
const clockTime = (value) => {
    if (!value) return null;
    const [h, min] = String(value).split(':').map(Number);
    return new Date(2000, 0, 1, h, min).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
};

export default function ExternalRequestStatusPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');

    const [request, setRequest] = useState(null);
    const [error, setError] = useState(expires && signature ? '' : 'This status link is incomplete. Please open it again from your email.');

    useEffect(() => {
        if (!expires || !signature) return undefined;
        let alive = true;
        api.get(`/external-installation-requests/${id}/status`, { params: { expires, signature } })
            .then((res) => { if (alive) setRequest(res.data); })
            .catch((err) => {
                if (!alive) return;
                setError(err.response?.status === 403
                    ? 'This status link has expired or is no longer valid. Links work for 30 days; message us if you need an update.'
                    : errorMessage(err, "We couldn't load your request. Please try again in a moment."));
            });
        return () => { alive = false; };
    }, [id, expires, signature]);

    const status = STATUS[request?.status] ?? STATUS.pending_review;
    const details = request ? [
        ['Request number', `#${request.id}`],
        ['Name', request.name],
        ['Installation site', request.address],
        ['Quotation from', request.other_company_name],
        ['Preferred date', longDate(request.preferred_installation_date)],
        ...(request.status === 'confirmed'
            ? [['Scheduled date', [longDate(request.scheduled_date), clockTime(request.scheduled_time)].filter(Boolean).join(' · ')]]
            : []),
        ...(request.status === 'rejected' && request.rejection_reason ? [['Reason', request.rejection_reason]] : []),
    ].filter(([, value]) => value) : [];

    return (
        <main style={styles.page}>
            <section style={styles.card}>
                <p style={styles.eyebrow}>TataMawing Solar · Installation request</p>

                {error ? (
                    <div role="alert">
                        <h1 style={styles.title}>Can't show this request</h1>
                        <p style={styles.text}>{error}</p>
                    </div>
                ) : !request ? (
                    <p role="status" style={styles.text}>Loading your request…</p>
                ) : (
                    <>
                        <span style={{ ...styles.pill, color: status.color, background: status.tint }}>
                            <status.Icon size={15} color={status.color} />
                            {status.label}
                        </span>
                        <h1 style={styles.title}>{status.title}</h1>
                        <p style={styles.text}>{status.text}</p>

                        <dl style={styles.details}>
                            {details.map(([label, value]) => (
                                <div key={label} style={styles.detailRow}>
                                    <dt style={styles.detailLabel}>{label}</dt>
                                    <dd style={styles.detailValue}>
                                        {label === 'Scheduled date' && <CalendarIcon size={15} color={colors.primary} />}
                                        <span>{value}</span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </>
                )}

                <div style={styles.actions}>
                    <Link to="/" style={styles.secondaryButton}>Go to home page</Link>
                    <Link to="/faqs" style={styles.textLink}>Questions? See the FAQs</Link>
                </div>
            </section>
        </main>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#f6f7f4',
        padding: 'clamp(20px, 6vw, 48px) clamp(12px, 4vw, 20px)',
        fontFamily: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
        color: colors.textDark,
    },
    card: {
        maxWidth: '620px',
        margin: '0 auto',
        padding: 'clamp(18px, 5vw, 36px)',
        background: 'white',
        border: '1px solid #e6e8e2',
        borderRadius: '14px',
        boxShadow: '0 12px 40px rgba(15,59,44,.08)',
    },
    eyebrow: { ...typography.label, color: colors.primary, margin: '0 0 18px' },
    pill: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 700,
    },
    title: { ...typography.h1, margin: '12px 0 0' },
    text: { ...typography.body, color: colors.textMuted, margin: '10px 0 0' },
    details: { margin: '24px 0 0', borderTop: `1px solid ${colors.border}` },
    detailRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
        gap: '2px 16px',
        padding: '12px 0',
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    detailLabel: { fontSize: '14px', color: colors.textMuted },
    detailValue: {
        margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: colors.textDark, overflowWrap: 'anywhere', minWidth: 0,
    },
    actions: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 20px', marginTop: '28px' },
    secondaryButton: {
        border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 16px', background: 'white', color: colors.textBody, fontWeight: 600, textDecoration: 'none',
    },
    textLink: { color: colors.primary, fontWeight: 600, fontSize: '14px' },
};
