import BarangayInput from '../../components/BarangayInput';
import {
    HOME_MUNICIPALITY, HOME_PROVINCE, SITE_DESCRIPTION_MAX,
    barangayError,
} from '../../services/installLocation';
import { C, SANS, s } from './engineStyles';

// STEP 1 (top) — where the system will be installed. For now that's always
// Bulan, Sorsogon; the customer types their barangay and picks it from the
// suggestions. All state lives in QuotationFormPage; this only shows it and
// reports changes.
//   location   { barangay, purok, description }
//   seen(key)  whether to show the barangay's message yet (left the field, or pressed Continue)
export default function LocationCard({ location, seen, onChange, onTouch }) {
    const message = seen('barangay') ? barangayError(location) : null;

    return (
        <div style={{ ...s.card, marginTop: '36px' }}>
            <div style={{ padding: '18px 26px', borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={s.cardTitle}>Where will the system be installed?</div>
                <div style={s.cardNote}>We use this to plan the site visit and the installation.</div>
            </div>

            <div style={styles.grid}>
                <Field label="Municipality">
                    {/* Fixed for now: installations are in Bulan only */}
                    <div style={styles.fixedValue}>{HOME_MUNICIPALITY}, {HOME_PROVINCE}</div>
                </Field>

                <Field label="Barangay *" htmlFor="loc-barangay" error={message}>
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
                            placeholder="e.g. Two-storey concrete house, GI sheet roof facing south, a mango tree shades part of the roof in the afternoon. Narrow road — only a tricycle can reach the gate."
                            style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.5, fontFamily: SANS }}
                        />
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: C.sub }}>
                            <span>Roof type, number of floors, shading, how to reach the house — anything that helps us plan.</span>
                            <span style={{ whiteSpace: 'nowrap' }}>{location.description.length} / {SITE_DESCRIPTION_MAX}</span>
                        </span>
                    </Field>
                </div>
            </div>
        </div>
    );
}

function Field({ label, htmlFor, error, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 }}>
            <label htmlFor={htmlFor} style={{ fontSize: '12.5px', color: C.muted }}>{label}</label>
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
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
        gap: '16px', padding: '22px 26px',
    },
    fixedValue: {
        border: `1px solid ${C.borderSoft}`, background: C.softBg, borderRadius: '8px', padding: '11px 10px',
        fontSize: '14px', color: C.body,
    },
};
