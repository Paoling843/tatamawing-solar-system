import { useEffect } from 'react';
import { formatWhole } from '../../services/solarEngine';
import { C, MONO, SANS, s } from './engineStyles';

const PERKS = [
    'Track this quotation to signature',
    'Keep your appliance load on file',
    'Book and reschedule your survey',
];

// Shown when a guest presses "Request quotation". Their inputs are already
// saved in the browser, so they can log in or register and come straight
// back to Step 3 to send the request.
export default function RequestQuoteDialog({ summaryLine, adjustedWh, onClose, onLogin, onRegister }) {
    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="se-modal" onClick={onClose} style={styles.backdrop}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-quote-title"
                onClick={(e) => e.stopPropagation()}
                style={styles.dialog}
            >
                <div style={{ flex: '1 1 440px', minWidth: 0, padding: '34px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                        <div>
                            <div style={s.cardEyebrow}>ONE STEP LEFT</div>
                            <h3 id="request-quote-title" style={styles.title}>Sign in to request your quotation</h3>
                            <p style={styles.blurb}>
                                Your appliance list and this configuration are saved, so you'll come straight back
                                here after you log in or create an account.
                            </p>
                        </div>
                        <button className="se-btn-secondary" onClick={onClose} aria-label="Close" style={styles.close}>×</button>
                    </div>

                    <button className="se-btn-primary" onClick={onRegister} style={styles.primary}>
                        Create an account
                    </button>

                    <div style={styles.orRow}>
                        <span style={styles.orLine} />
                        <span style={{ fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em', color: C.dim }}>OR</span>
                        <span style={styles.orLine} />
                    </div>

                    <button className="se-btn-secondary" onClick={onLogin} style={styles.secondary}>
                        I already have an account — Log in
                    </button>
                </div>

                <aside style={styles.aside}>
                    <div style={{ ...s.cardEyebrow, color: C.onDarkMuted }}>YOU ARE REQUESTING</div>
                    <div style={styles.summary}>{summaryLine}</div>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,.14)', margin: '22px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13.5px', color: C.onDark }}>
                        <span>Adjusted load</span>
                        <span style={{ fontFamily: MONO, color: C.yellow, whiteSpace: 'nowrap' }}>{formatWhole(adjustedWh)} Wh</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '26px' }}>
                        {PERKS.map((perk) => (
                            <div key={perk} style={{ display: 'flex', gap: '10px', fontSize: '13.5px', lineHeight: 1.5, color: C.onDark }}>
                                <span style={{ color: C.yellow, flex: 'none' }}>✓</span>
                                <span>{perk}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '22px', fontSize: '12px', lineHeight: 1.55, color: '#7d948a' }}>
                        By continuing you agree to our terms and privacy policy. We never sell your consumption data.
                    </div>
                </aside>
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: 'fixed', inset: 0, background: 'rgba(16,33,26,.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '32px', zIndex: 90,
    },
    dialog: {
        width: '100%', maxWidth: '920px', maxHeight: '100%', overflow: 'auto', background: '#fff',
        borderRadius: '14px', boxShadow: '0 50px 90px -34px rgba(16,33,26,.6)', display: 'flex', flexWrap: 'wrap',
    },
    title: { margin: '10px 0 0', fontSize: '27px', fontWeight: 800, letterSpacing: '-.028em', color: C.ink },
    blurb: { margin: '9px 0 0', fontSize: '14.5px', lineHeight: 1.6, color: C.muted, maxWidth: '420px' },
    close: {
        flex: 'none', width: '32px', height: '32px', borderRadius: '9px', border: `1px solid ${C.border}`,
        background: '#fff', color: C.muted, fontSize: '15px', cursor: 'pointer',
    },
    primary: {
        width: '100%', marginTop: '26px', background: C.green, color: '#fff', border: 'none', borderRadius: '10px',
        padding: '15px 22px', fontFamily: SANS, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    },
    orRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
    orLine: { flex: 1, height: '1px', background: C.borderSoft },
    secondary: {
        width: '100%', background: '#fff', color: C.body, border: `1px solid ${C.fieldBorder}`, borderRadius: '10px',
        padding: '14px 22px', fontFamily: SANS, fontSize: '14.5px', fontWeight: 600, cursor: 'pointer',
    },
    aside: { flex: '1 1 300px', minWidth: 0, background: C.green, padding: '34px 30px', display: 'flex', flexDirection: 'column' },
    summary: { fontSize: '19px', fontWeight: 800, letterSpacing: '-.02em', color: '#fff', marginTop: '10px', lineHeight: 1.35 },
};
