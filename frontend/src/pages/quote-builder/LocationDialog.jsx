import { useEffect } from 'react';
import BarangayInput from '../../components/BarangayInput';
import {
    HOME_MUNICIPALITY, HOME_PROVINCE, SITE_DESCRIPTION_MAX,
    barangayError,
} from '../../services/installLocation';
import { C, NUM, SANS, s } from './engineStyles';

// Shown when a logged-in customer presses "Request quotation" on Step 3:
// where the system will be installed. The calculator itself never asks for
// it, so guests can try the engine without giving their address. For now
// it's always Bulan, Sorsogon; the customer types their barangay and picks
// it from the suggestions. All state lives in QuotationFormPage; this only
// shows it and reports changes.
//   location   { barangay, purok, description }
//   seen(key)  whether to show the barangay's message yet (left the field, or pressed Send)
//   error      message from a failed send, if any
export default function LocationDialog({ location, seen, submitting, error, onChange, onTouch, onClose, onSubmit }) {
    const message = seen('barangay') ? barangayError(location) : null;

    // Close on Escape, unless the request is already being sent. Escape in
    // the barangay box only closes its suggestion list.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape' || submitting || e.target.id === 'loc-barangay') return;
            onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    return (
        <div className="se-modal" onClick={submitting ? undefined : onClose} style={styles.backdrop}>
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-title"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                style={styles.dialog}
            >
                <div className="se-pad" style={styles.head}>
                    <div>
                        <div style={s.cardEyebrow}>LAST STEP</div>
                        <h3 id="location-title" className="se-dialog-title" style={styles.title}>Where will the system be installed?</h3>
                        <div style={s.cardNote}>We use this to plan the site visit and the installation.</div>
                    </div>
                    <button
                        type="button"
                        className="se-btn-secondary m-tap"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                        style={styles.close}
                    >
                        ×
                    </button>
                </div>

                <div className="se-pad" style={styles.grid}>
                    <Field label="Municipality">
                        {/* Fixed for now: installations are in Bulan only */}
                        <div style={styles.fixedValue}>{HOME_MUNICIPALITY}, {HOME_PROVINCE}</div>
                    </Field>

                    <Field label="Barangay" required htmlFor="loc-barangay" error={message}>
                        <BarangayInput
                            id="loc-barangay"
                            value={location.barangay}
                            inputStyle={inputStyle(Boolean(message))}
                            colors={{ text: C.body, muted: C.muted, border: C.border, active: C.mint }}
                            onChange={(value) => onChange('barangay', value)}
                            onDone={() => onTouch('barangay')}
                        />
                    </Field>

                    <Field label="Purok / street (optional)" htmlFor="loc-purok">
                        <input
                            id="loc-purok"
                            value={location.purok}
                            onChange={(e) => onChange('purok', e.target.value)}
                            placeholder="e.g. Purok 3"
                            maxLength={255}
                            style={inputStyle(false)}
                        />
                    </Field>

                    {/* Full width: the customer's own description of the site */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <Field label="About the house or site (optional)" htmlFor="loc-description">
                            <textarea
                                id="loc-description"
                                rows={3}
                                value={location.description}
                                onChange={(e) => onChange('description', e.target.value)}
                                maxLength={SITE_DESCRIPTION_MAX}
                                placeholder="e.g. Two-storey house, GI roof facing south, shaded by a tree in the afternoon. Only a tricycle can reach the gate."
                                style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.5, fontFamily: SANS }}
                            />
                            <span style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: C.sub }}>
                                <span>Roof, floors, shading, road access — anything that helps us plan.</span>
                                <span style={{ fontFamily: NUM, whiteSpace: 'nowrap' }}>{location.description.length} / {SITE_DESCRIPTION_MAX}</span>
                            </span>
                        </Field>
                    </div>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div className="se-pad" style={styles.actions}>
                    <button type="button" className="se-btn-secondary" onClick={onClose} disabled={submitting} style={s.secondaryButton}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="se-btn-primary"
                        disabled={submitting}
                        style={{ ...s.primaryButton, opacity: submitting ? 0.7 : 1 }}
                    >
                        {submitting ? 'Sending request…' : 'Send request'} <span style={{ fontSize: '17px' }}>→</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, required, htmlFor, error, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
            <label htmlFor={htmlFor} style={{ fontSize: '12.5px', fontWeight: 600, color: C.body }}>
                {label}
                {required && <span aria-hidden="true" style={s.requiredMark}>*</span>}
            </label>
            {children}
            {error && <span style={{ fontSize: '12px', color: C.errorText }}>{error}</span>}
        </div>
    );
}

const inputStyle = (invalid) => ({
    border: `1px solid ${invalid ? C.errorBorder : C.fieldBorder}`,
    background: invalid ? C.errorBg : C.fieldBg,
    borderRadius: '8px', padding: '11px 10px', fontFamily: SANS, fontSize: '14px', color: C.ink,
    outline: 'none', minWidth: 0, width: '100%', boxSizing: 'border-box',
});

const styles = {
    backdrop: {
        position: 'fixed', inset: 0, background: 'rgba(16,33,26,.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '32px', zIndex: 90,
    },
    dialog: {
        width: '100%', maxWidth: '760px', maxHeight: '100%', overflow: 'auto', background: '#fff',
        borderRadius: '14px', boxShadow: '0 50px 90px -34px rgba(16,33,26,.6)', fontFamily: SANS,
    },
    head: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px',
        padding: '26px 26px 18px', borderBottom: `1px solid ${C.borderSoft}`,
    },
    title: { margin: '8px 0 4px', fontSize: '23px', fontWeight: 800, letterSpacing: '-.025em', color: C.ink },
    close: {
        flex: 'none', width: '32px', height: '32px', borderRadius: '9px', border: `1px solid ${C.border}`,
        background: '#fff', color: C.muted, fontSize: '15px', cursor: 'pointer',
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
        gap: '16px', padding: '22px 26px',
    },
    fixedValue: {
        border: `1px solid ${C.borderSoft}`, background: C.softBg, borderRadius: '8px', padding: '11px 10px',
        fontSize: '14px', color: C.body,
    },
    error: {
        margin: '0 26px', padding: '12px 14px', borderRadius: '9px', fontSize: '13.5px', lineHeight: 1.5,
        background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText,
    },
    actions: {
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        padding: '20px 26px 26px',
    },
};
