import { useEffect, useState } from 'react';
import AmountInput from './AmountInput';
import { XIcon } from './Icons';
import api from '../api/axios';
import { adminTokens, adminUi } from '../styles/adminTheme';
import { errorMessage } from '../utils/errorMessage';

// The one approve form for every "Approve" button (quotation page,
// Quotations list, dashboard): the admin checks the costs, sees the total and,
// if it isn't the customer's estimate, can say why. The customer is told when
// the price changed (email, notification, My Quotations).
//
// quotation: the quotation request row (needs id and solar_computation)
// onApproved(quotationRequest): called with the server's updated row

const formatCurrency = (amount) => '₱' + (parseFloat(amount) || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Less than a centavo apart counts as the same amount
const differs = (a, b) => Math.abs(a - b) >= 0.01;

const emptyForm = (quotation) => ({
    // Starts at the customer's estimate
    adjusted_cost: quotation?.solar_computation?.estimated_cost ?? '',
    labor_fee: '',
    transportation_fee: '',
    price_note: '',
});

export default function ApproveQuotationModal({ quotation, onClose, onApproved }) {
    const [form, setForm] = useState(() => emptyForm(quotation));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Approved, but the email didn't go out: the server's response, held
    // until the admin has read the warning
    const [approvedWithoutEmail, setApprovedWithoutEmail] = useState(null);

    // Escape closes it, like clicking outside (not while approving)
    // (after an approval without email it continues instead, so the page updates)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape' || loading) return;
            if (approvedWithoutEmail) onApproved?.(approvedWithoutEmail.quotation_request);
            else onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [loading, onClose, onApproved, approvedWithoutEmail]);

    const baseCost = parseFloat(form.adjusted_cost) || 0;
    const total = baseCost + (parseFloat(form.labor_fee) || 0) + (parseFloat(form.transportation_fee) || 0);
    const estimate = parseFloat(quotation?.solar_computation?.estimated_cost);
    const hasEstimate = Number.isFinite(estimate);
    // How far the total is from the estimate (null when the same, or no estimate)
    const priceChange = hasEstimate && differs(total, estimate) ? total - estimate : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post(`/admin/quotation-requests/${quotation.id}/approve`, {
                adjusted_cost: parseFloat(form.adjusted_cost),
                labor_fee: parseFloat(form.labor_fee) || 0,
                transportation_fee: parseFloat(form.transportation_fee) || 0,
                // Only sent when the total differs from the estimate
                price_note: priceChange !== null ? form.price_note.trim() || null : null,
            });
            window.dispatchEvent(new Event('admin:counts-refresh'));
            if (res.data.email_sent === false) {
                setApprovedWithoutEmail(res.data);
                setLoading(false);
                return;
            }
            await onApproved?.(res.data.quotation_request);
        } catch (err) {
            setError(errorMessage(err, "Couldn't approve the quotation. Please try again."));
            setLoading(false);
        }
    };

    const close = loading ? undefined : onClose;

    // Approved, but the customer wasn't emailed: say so before moving on
    if (approvedWithoutEmail) {
        const done = () => onApproved?.(approvedWithoutEmail.quotation_request);
        return (
            <div style={styles.overlay}>
                <div role="alertdialog" aria-modal="true" aria-labelledby="approve-email-title" style={styles.modal}>
                    <div style={styles.header}>
                        <div style={{ minWidth: 0 }}>
                            <h3 id="approve-email-title" style={styles.title}>Approved, but the email wasn't sent</h3>
                            <p style={styles.desc}>The quotation is approved at {formatCurrency(total)}.</p>
                        </div>
                    </div>
                    <div style={styles.body}>
                        <p style={{ ...styles.changeNote, margin: 0 }}>{approvedWithoutEmail.email_warning}</p>
                    </div>
                    <div style={styles.footer}>
                        <button type="button" className="btn-primary" onClick={done} style={{ ...styles.approveBtn, cursor: 'pointer' }} autoFocus>
                            OK, continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Small line under the base cost
    let baseHint = null;
    if (hasEstimate) {
        baseHint = differs(baseCost, estimate)
            ? `Changed from the customer's estimate of ${formatCurrency(estimate)}.`
            : "Same as the customer's estimate.";
    }

    return (
        <div style={styles.overlay} onClick={close}>
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="approve-quotation-title"
                aria-describedby="approve-quotation-desc"
                style={styles.modal}
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                {/* ---- Header ---- */}
                <div style={styles.header}>
                    <div style={{ minWidth: 0 }}>
                        <h3 id="approve-quotation-title" style={styles.title}>Approve quotation</h3>
                        <p id="approve-quotation-desc" style={styles.desc}>
                            Check the final price. The customer sees this total once you approve.
                        </p>
                    </div>
                    <button type="button" onClick={close} disabled={loading} style={styles.closeBtn} aria-label="Close">
                        <XIcon size={18} color="currentColor" />
                    </button>
                </div>

                {/* ---- Costs ---- */}
                <div style={styles.body}>
                    <div style={styles.row}>
                        <label htmlFor="approve-base-cost" style={styles.rowLabel}>Base cost</label>
                        <div style={styles.inputBox}>
                            <AmountInput
                                id="approve-base-cost"
                                value={form.adjusted_cost}
                                onChange={(adjusted_cost) => setForm({ ...form, adjusted_cost })}
                                className="input-field"
                                style={styles.input}
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                        </div>
                    </div>
                    {baseHint && <p style={styles.hint}>{baseHint}</p>}

                    <div style={styles.row}>
                        <label htmlFor="approve-labor-fee" style={styles.rowLabel}>
                            + Labor fee <span style={styles.optional}>(optional)</span>
                        </label>
                        <div style={styles.inputBox}>
                            <AmountInput
                                id="approve-labor-fee"
                                value={form.labor_fee}
                                onChange={(labor_fee) => setForm({ ...form, labor_fee })}
                                className="input-field"
                                style={styles.input}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div style={styles.row}>
                        <label htmlFor="approve-transport-fee" style={styles.rowLabel}>
                            + Transportation fee <span style={styles.optional}>(optional)</span>
                        </label>
                        <div style={styles.inputBox}>
                            <AmountInput
                                id="approve-transport-fee"
                                value={form.transportation_fee}
                                onChange={(transportation_fee) => setForm({ ...form, transportation_fee })}
                                className="input-field"
                                style={styles.input}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div style={styles.totalBox}>
                        <span style={styles.totalLabel}>Approved total</span>
                        <span style={styles.totalValue} aria-live="polite">{formatCurrency(total)}</span>
                    </div>

                    {/* Whether the customer will be told the price changed */}
                    {!hasEstimate && (
                        <p style={styles.hint}>This request has no estimate to compare with.</p>
                    )}
                    {hasEstimate && priceChange === null && (
                        <p style={styles.hint}>Matches the estimate the customer saw.</p>
                    )}
                    {priceChange !== null && (
                        <>
                            <p style={styles.changeNote}>
                                <strong>{formatCurrency(Math.abs(priceChange))} {priceChange > 0 ? 'more' : 'less'}</strong>
                                {' '}than the {formatCurrency(estimate)} estimate the customer saw. They'll be told the price was updated.
                            </p>
                            <label htmlFor="approve-price-note" style={styles.noteLabel}>
                                Reason for the price change <span style={styles.optional}>(optional, shown to the customer)</span>
                            </label>
                            <textarea
                                id="approve-price-note"
                                value={form.price_note}
                                onChange={(e) => setForm({ ...form, price_note: e.target.value })}
                                className="input-field"
                                style={styles.textarea}
                                placeholder="e.g. Longer cable run to the roof"
                                maxLength={500}
                            />
                        </>
                    )}

                    {error && <div role="alert" style={styles.error}>{error}</div>}
                </div>

                {/* ---- Footer ---- */}
                <div style={styles.footer}>
                    <button type="button" className="btn-secondary" onClick={close} disabled={loading} style={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            ...styles.approveBtn,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Approving…' : `Approve for ${formatCurrency(total)}`}
                    </button>
                </div>
            </form>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backgroundColor: 'rgba(15, 31, 24, 0.48)',
    },
    modal: {
        width: '100%', maxWidth: '488px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', margin: 0,
        backgroundColor: adminTokens.surface, borderRadius: '10px', boxShadow: '0 24px 70px rgba(17,24,39,0.22)',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    },

    header: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
        padding: '1.375rem 1.375rem 1.125rem', borderBottom: `1px solid ${adminTokens.hairline}`,
    },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: adminTokens.ink, lineHeight: 1.3 },
    desc: { margin: '0.375rem 0 0', fontSize: '0.875rem', color: adminTokens.muted, lineHeight: 1.5, maxWidth: '38ch' },
    closeBtn: {
        flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '32px', height: '32px', marginTop: '-0.25rem', marginRight: '-0.375rem', padding: 0,
        background: 'none', border: 'none', borderRadius: '6px', color: adminTokens.body, cursor: 'pointer',
    },

    body: { padding: '1.125rem 1.375rem 1.25rem' },
    row: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: '0.5rem 1rem', marginBottom: '1rem',
    },
    rowLabel: { fontSize: '0.875rem', fontWeight: 600, color: adminTokens.ink },
    optional: { fontWeight: 400, color: adminTokens.subtle },
    inputBox: { width: '192px', maxWidth: '100%' },
    input: {
        width: '100%', padding: '0.75rem 0.875rem', border: `1px solid ${adminTokens.control}`, borderRadius: '6px',
        backgroundColor: adminTokens.surface, color: adminTokens.ink, fontSize: '0.9375rem', fontWeight: 600,
        textAlign: 'right', boxSizing: 'border-box',
    },
    hint: { margin: '-0.375rem 0 1rem', fontSize: '0.8125rem', color: adminTokens.muted, lineHeight: 1.45 },

    totalBox: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem 1rem',
        marginTop: '0.25rem', marginBottom: '1rem', padding: '1.125rem 1rem',
        borderTop: `2px solid ${adminTokens.ink}`, borderRadius: '0 0 6px 6px', backgroundColor: '#E3F1E8',
    },
    totalLabel: { fontSize: '0.875rem', fontWeight: 700, color: adminTokens.green },
    totalValue: {
        fontSize: '1.625rem', fontWeight: 700, color: adminTokens.green, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
    },

    changeNote: {
        margin: '-0.375rem 0 1rem', padding: '0.625rem 0.875rem', borderRadius: '6px', background: '#FDF4DC',
        border: '1px solid #F3E3AD', color: '#5B4A12', fontSize: '0.8125rem', lineHeight: 1.45,
    },
    noteLabel: { display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: adminTokens.ink },
    textarea: {
        width: '100%', minHeight: '84px', padding: '0.75rem', border: `1px solid ${adminTokens.control}`, borderRadius: '6px',
        backgroundColor: adminTokens.surface, color: adminTokens.ink, fontSize: '0.875rem', lineHeight: 1.55,
        boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
    },
    error: { ...adminUi.errorBanner, margin: '1rem 0 0' },

    footer: {
        display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.625rem',
        padding: '1rem 1.375rem', borderTop: `1px solid ${adminTokens.hairline}`, backgroundColor: '#F7F7F4',
        borderRadius: '0 0 10px 10px',
    },
    cancelBtn: {
        backgroundColor: adminTokens.surface, color: adminTokens.ink, border: `1px solid ${adminTokens.control}`,
        padding: '0.75rem 1.125rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
    },
    approveBtn: {
        backgroundColor: adminTokens.green, color: 'white', border: 'none', padding: '0.75rem 1.125rem',
        borderRadius: '6px', fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    },
};
