import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CalendarIcon, DocumentIcon, CheckCircleIcon } from '../components/Icons';
import { colors, typography } from '../styles/theme';

const MIN_DATE = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const EMPTY_FORM = {
    name: '',
    email: '',
    phone: '',
    address: '',
    preferred_installation_date: '',
    other_company_name: '',
    quotation_file: null,
};

export default function ExternalInstallationRequestPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const updateField = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
        setFieldErrors((previous) => ({ ...previous, [field]: null }));
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        setFieldErrors({});

        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (value !== null && value !== '') payload.append(key, value);
        });

        try {
            const response = await api.post('/external-installation-requests', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccess(response.data.request);
            setForm(EMPTY_FORM);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'We could not submit your request. Please try again.');
            setFieldErrors(requestError.response?.data?.errors || {});
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <main style={styles.page}>
                <section style={styles.card}>
                    <CheckCircleIcon size={42} color={colors.success} />
                    <h1 style={styles.title}>Request received</h1>
                    <p style={styles.subtitle}>
                        Your installation request is pending review. We have sent a secure status link to your email.
                    </p>
                    <a href={success.status_url} style={styles.statusLink}>Check request status</a>
                    <button type="button" onClick={() => navigate('/')} style={styles.secondaryButton}>
                        Return to home
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main style={styles.page}>
            <section style={styles.card}>
                <button type="button" onClick={() => navigate('/')} style={styles.backButton}>
                    ← Back to TataMawing Solar
                </button>
                <div style={styles.eyebrow}>INSTALLATION SERVICE</div>
                <h1 style={styles.title}>Set your installation date</h1>
                <p style={styles.subtitle}>
                    Already have a quotation from another solar company? Send it to our team and we will review your installation request.
                </p>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.grid}>
                        <Field label="Full name" error={fieldErrors.name}>
                            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} style={styles.input} required />
                        </Field>
                        <Field label="Email address" error={fieldErrors.email}>
                            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} style={styles.input} required />
                        </Field>
                        <Field label="Phone number" error={fieldErrors.phone}>
                            <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} style={styles.input} required />
                        </Field>
                        <Field label="Other solar company" error={fieldErrors.other_company_name}>
                            <input value={form.other_company_name} onChange={(event) => updateField('other_company_name', event.target.value)} style={styles.input} required />
                        </Field>
                    </div>

                    <Field label="Installation address" error={fieldErrors.address}>
                        <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} style={styles.textarea} rows={3} required />
                    </Field>

                    <div style={styles.grid}>
                        <Field label="Preferred installation date" error={fieldErrors.preferred_installation_date}>
                            <div style={styles.inputWithIcon}>
                                <CalendarIcon size={16} color={colors.textMuted} />
                                <input type="date" min={MIN_DATE} value={form.preferred_installation_date} onChange={(event) => updateField('preferred_installation_date', event.target.value)} style={styles.iconInput} required />
                            </div>
                        </Field>
                        <Field label="Existing quotation" error={fieldErrors.quotation_file}>
                            <label style={styles.fileInput}>
                                <DocumentIcon size={16} color={colors.primary} />
                                <span>{form.quotation_file?.name || 'Upload PDF, JPG, or PNG'}</span>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => updateField('quotation_file', event.target.files[0] || null)} required style={styles.hiddenFileInput} />
                            </label>
                        </Field>
                    </div>

                    <div style={styles.formFooter}>
                        <p style={styles.privacyNote}>Your quotation is stored privately and reviewed only by our staff.</p>
                        <button type="submit" disabled={submitting} style={{ ...styles.submitButton, opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? 'Submitting...' : 'Submit installation request'}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}

function Field({ label, error, children }) {
    return (
        <label style={styles.field}>
            <span style={styles.label}>{label}</span>
            {children}
            {error && <span style={styles.fieldError}>{Array.isArray(error) ? error[0] : error}</span>}
        </label>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#f6f7f4', padding: '48px 20px', fontFamily: "'Figtree', Helvetica, Arial, sans-serif", color: colors.textDark },
    card: { maxWidth: '780px', margin: '0 auto', padding: '36px', background: 'white', border: '1px solid #e6e8e2', borderRadius: '14px', boxShadow: '0 12px 40px rgba(15,59,44,.08)' },
    backButton: { border: 'none', background: 'transparent', color: colors.primary, padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 700 },
    eyebrow: { ...typography.label, marginTop: '32px', color: colors.primary },
    title: { ...typography.h1, margin: '10px 0 0' },
    subtitle: { ...typography.body, color: colors.textMuted, maxWidth: '620px', margin: '12px 0 28px' },
    form: { display: 'flex', flexDirection: 'column', gap: '18px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' },
    field: { display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 },
    label: { fontSize: '12px', fontWeight: 700, color: colors.textBody },
    input: { width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '12px', fontSize: '14px', color: colors.textDark, background: '#fff' },
    textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '12px', fontSize: '14px', color: colors.textDark, fontFamily: 'inherit' },
    inputWithIcon: { display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '0 12px' },
    iconInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', padding: '12px 0', fontSize: '14px', color: colors.textDark },
    fileInput: { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '43px', boxSizing: 'border-box', border: `1px dashed ${colors.primaryBorder}`, borderRadius: '8px', padding: '0 12px', color: colors.textMuted, fontSize: '13px', cursor: 'pointer' },
    hiddenFileInput: { display: 'none' },
    fieldError: { color: colors.danger, fontSize: '12px' },
    error: { background: colors.dangerTint, color: colors.danger, borderRadius: '8px', padding: '12px', marginBottom: '18px', fontSize: '13px' },
    formFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '20px', borderTop: `1px solid ${colors.borderLight}` },
    privacyNote: { ...typography.small, margin: 0, maxWidth: '340px' },
    submitButton: { border: 'none', borderRadius: '8px', padding: '13px 18px', background: colors.primary, color: 'white', fontWeight: 700, cursor: 'pointer' },
    statusLink: { display: 'inline-block', color: colors.primary, fontWeight: 700, margin: '8px 0 22px' },
    secondaryButton: { display: 'block', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '11px 16px', background: 'white', color: colors.textBody, fontWeight: 600, cursor: 'pointer' },
};
