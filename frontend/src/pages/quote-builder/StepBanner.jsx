// The green banner at the top of every calculator step: "Step N of 3", the
// step's title and subtitle, an optional figure on the right, and the
// progress strip (done / current / still to come) along its bottom.
// Look from the "Customer · Request quotation" mockups.
import { Q } from './calcTheme';

const STEPS = [
    { screen: 'load', label: 'Appliance load' },
    { screen: 'compute', label: 'Computation' },
    { screen: 'package', label: 'Package' },
];

const srOnly = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

export default function StepBanner({ screen, title, subtitle, aside }) {
    const current = STEPS.findIndex((step) => step.screen === screen);

    return (
        <section aria-label="Summary" style={styles.hero}>
            <div style={styles.top}>
                <div style={{ minWidth: 0 }}>
                    <span style={styles.eyebrow}>Step {current + 1} of 3</span>
                    <h1 style={styles.title}>{title}</h1>
                    {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
                </div>
                {aside}
            </div>
            <ol aria-label="Progress" className="step-progress" style={styles.strip}>
                {STEPS.map((step, i) => {
                    const state = i < current ? 'done' : i === current ? 'current' : 'todo';
                    return (
                        <li key={step.screen} aria-current={state === 'current' ? 'step' : undefined} className="step-progress-item" style={styles.step}>
                            <span style={{ ...styles.dot, ...styles[`dot_${state}`] }}>
                                {state === 'done' ? (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                ) : i + 1}
                            </span>
                            <span className="step-progress-label" style={{
                                fontWeight: state === 'todo' ? 500 : state === 'current' ? 700 : 600,
                                color: state === 'todo' ? Q.stripText : '#FFFFFF',
                                whiteSpace: 'nowrap',
                            }}>
                                {step.label}
                            </span>
                            <span style={srOnly}>{state === 'done' ? ' (done)' : state === 'current' ? ' (current step)' : ''}</span>
                            {i < STEPS.length - 1 && <span aria-hidden="true" className="step-progress-line" style={styles.line} />}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

const styles = {
    hero: { background: Q.green, color: '#FFFFFF', borderRadius: '8px' },
    top: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '16px 24px', padding: '22px 24px 20px',
    },
    eyebrow: { display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: Q.gold },
    title: { margin: '4px 0 0', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: '#FFFFFF' },
    subtitle: { margin: '2px 0 0', fontSize: '14px', color: Q.stripText },
    strip: {
        listStyle: 'none', margin: 0, padding: '14px 24px', display: 'grid',
        // Always the three steps side by side; on phones each step stacks its
        // number over its name (App.css .step-progress)
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px 0',
        borderTop: '1px solid rgba(255,255,255,0.14)', background: '#0B3326', borderRadius: '0 0 8px 8px',
    },
    step: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
    dot: {
        width: '26px', height: '26px', borderRadius: '50%', boxSizing: 'border-box', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flex: 'none',
    },
    dot_done: { background: Q.done, color: Q.green },
    dot_current: { background: Q.gold, color: Q.onGold },
    dot_todo: { background: 'transparent', color: Q.stripText, border: '1px solid rgba(255,255,255,0.35)' },
    line: { flex: 1, minWidth: '12px', height: '1px', background: 'rgba(255,255,255,0.22)', margin: '0 14px' },
};
