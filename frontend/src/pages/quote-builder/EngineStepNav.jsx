import { C, MONO } from './engineStyles';

const STEPS = [
    { screen: 'load', label: 'Appliance load' },
    { screen: 'compute', label: 'Computation' },
    { screen: 'package', label: 'Package' },
];

// The 01 · 02 · 03 step indicator. Used in the guest header, and above the
// steps when a logged-in customer sees the engine inside CustomerLayout.
export default function EngineStepNav({ screen }) {
    return (
        <div style={styles.nav}>
            {STEPS.map((step, i) => {
                const current = step.screen === screen;
                return (
                    <div key={step.screen} style={styles.step(current)}>
                        <span style={styles.dot(current)}>0{i + 1}</span>
                        <span className="se-step-label">{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

const styles = {
    nav: { display: 'flex', alignItems: 'center', gap: '22px' },
    step: (current) => ({
        display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px',
        fontWeight: current ? 700 : 500, color: current ? C.ink : C.muted,
    }),
    dot: (current) => ({
        width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: MONO, fontSize: '10.5px',
        background: current ? C.green : C.borderSoft, color: current ? C.yellow : C.sub,
    }),
};
