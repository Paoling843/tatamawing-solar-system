import { C, MONO, SANS } from './engineStyles';

const HERO_STATS = [
    { value: '2 min', label: 'To a sized system' },
    { value: '5 – 12 kW', label: 'Hybrid packages' },
    { value: '610 W', label: 'Bifacial panels' },
];

const HERO_STEPS = [
    { num: '01', title: 'List your appliances', body: 'Aircon and pump wattage is derived from horsepower. Everything else you enter directly, with the hours split between day and night.' },
    { num: '02', title: 'See the arithmetic', body: 'Daytime and nighttime energy are totalled separately, then a flat safety buffer is added once for the household.' },
    { num: '03', title: 'Get your package', body: 'The smallest inverter that covers the adjusted load, its matching panel range, and a battery sized to your nighttime draw.' },
];

// Intro screen shown before Step 1. It only explains the engine; nothing is
// entered here.
export default function EngineLanding({ onStart, onSetInstallation }) {
    return (
        <div>
            {/* ----- Dark green hero ----- */}
            <section style={styles.hero}>
                <div className="se-hero-copy" style={styles.heroCopy}>
                    <div style={styles.pill}>
                        <span style={styles.pillDot} />
                        <span style={styles.pillText}>SIZED FROM YOUR OWN APPLIANCES</span>
                    </div>
                    <h1 className="se-hero-title" style={styles.heroTitle}>
                        Find the system your household actually needs.
                    </h1>
                    <p style={styles.heroLead}>
                        Tell us what you run and for how long, day and night. We compute the load, add a
                        safety buffer, and recommend the smallest hybrid package that carries it.
                    </p>
                    <div style={styles.ctaRow}>
                        <button className="se-btn-yellow" onClick={onStart} style={styles.yellowButton}>
                            Get Started <span style={{ fontSize: '17px' }}>→</span>
                        </button>
                        <div style={styles.installCta}>
                            <span style={styles.installNote}>Already have a quotation?</span>
                            <button className="se-btn-secondary" onClick={onSetInstallation} style={styles.installButton}>
                                <span style={styles.installIcon}>◷</span>
                                Set Installation
                            </button>
                        </div>
                        <span style={styles.ctaNote}>No account needed<br />until you ask for a quotation</span>
                    </div>
                    <div style={styles.statRow}>
                        {HERO_STATS.map((stat) => (
                            <div key={stat.label}>
                                <div style={styles.statValue}>{stat.value}</div>
                                <div style={styles.statLabel}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="se-hero-card-wrap" style={styles.heroCardWrap}>
                    <div style={styles.heroCard}>
                        <div style={{ ...styles.monoLabel, color: C.onDarkMuted }}>WHAT THE ENGINE DOES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '20px' }}>
                            {HERO_STEPS.map((step) => (
                                <div key={step.num} style={styles.heroStep}>
                                    <span style={styles.heroStepNum}>{step.num}</span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={styles.heroStepTitle}>{step.title}</div>
                                        <p style={styles.heroStepBody}>{step.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={styles.heroCardFoot}>
                            <span style={{ fontFamily: MONO, color: C.yellow }}>↓</span>
                            <span>An itemised price comes with the package, before you request a quotation.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ----- "Before you start" tips ----- */}
            <section className="se-section" style={styles.section}>
                <div style={styles.sectionHead}>
                    <div>
                        <div style={styles.eyebrow}>BEFORE YOU START</div>
                        <h2 style={styles.sectionTitle}>Two things worth having to hand.</h2>
                    </div>
                    <button className="se-btn-primary" onClick={onStart} style={styles.darkButton}>
                        Start the computation <span style={{ fontSize: '17px' }}>→</span>
                    </button>
                </div>
                <div style={styles.tipGrid}>
                    <div style={styles.tipCard}>
                        <div style={styles.monoLabel}>HORSEPOWER RATINGS</div>
                        <h3 style={styles.tipTitle}>For aircon and water pumps</h3>
                        <p style={styles.tipBody}>
                            Check the plate on the unit. We convert horsepower to watts for you, so you never
                            have to read the electrical spec.
                        </p>
                    </div>
                    <div style={styles.tipCard}>
                        <div style={styles.monoLabel}>HOURS OF USE</div>
                        <h3 style={styles.tipTitle}>Split into day and night</h3>
                        <p style={styles.tipBody}>
                            Anything used between 08:00 and 16:00 runs off the array. Everything after 16:00
                            has to come out of the battery, which is what sizes it.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

const styles = {
    hero: {
        background: C.green, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
        alignItems: 'center',
    },
    heroCopy: { padding: '76px 48px 76px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    pill: {
        display: 'inline-flex', alignItems: 'center', gap: '9px', alignSelf: 'flex-start',
        border: '1px solid rgba(244,197,66,.4)', borderRadius: '20px', padding: '6px 13px',
    },
    pillDot: { width: '6px', height: '6px', borderRadius: '50%', background: C.yellow },
    pillText: { fontFamily: MONO, fontSize: '11px', letterSpacing: '.1em', color: C.yellow },
    heroTitle: {
        margin: '26px 0 0', fontSize: '54px', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-.035em',
        color: '#fff', textWrap: 'balance',
    },
    heroLead: { margin: '22px 0 0', fontSize: '17.5px', lineHeight: 1.55, color: C.onDark, maxWidth: '520px', textWrap: 'pretty' },
    ctaRow: { display: 'flex', alignItems: 'center', gap: '18px', marginTop: '36px', flexWrap: 'wrap' },
    yellowButton: {
        display: 'flex', alignItems: 'center', gap: '10px', background: C.yellow, color: C.ink, border: 'none',
        borderRadius: '11px', padding: '18px 30px', fontFamily: SANS, fontSize: '16.5px', fontWeight: 800,
        letterSpacing: '-.01em', cursor: 'pointer', boxShadow: '0 12px 28px -14px rgba(244,197,66,.7)',
    },
    installCta: {
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px',
    },
    installNote: { fontSize: '12px', color: C.onDarkMuted, lineHeight: 1.2 },
    installButton: {
        display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#fff',
        border: '1px solid rgba(255,255,255,.35)', borderRadius: '9px', padding: '11px 15px',
        fontFamily: SANS, fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    },
    installIcon: { color: C.yellow, fontSize: '17px', lineHeight: 1 },
    ctaNote: { fontSize: '14px', color: C.onDarkMuted, lineHeight: 1.4 },
    statRow: {
        display: 'flex', gap: '36px', marginTop: '48px', paddingTop: '26px',
        borderTop: '1px solid rgba(255,255,255,.13)', flexWrap: 'wrap',
    },
    statValue: { fontFamily: MONO, fontSize: '24px', fontWeight: 500, letterSpacing: '-.02em', color: C.yellow },
    statLabel: { fontSize: '12.5px', color: C.onDarkMuted, marginTop: '4px' },
    heroCardWrap: { padding: '48px 40px 48px 0', minWidth: 0 },
    heroCard: { background: C.darkPanel, borderRadius: '13px', padding: '28px', border: '1px solid rgba(255,255,255,.08)' },
    monoLabel: { fontFamily: MONO, fontSize: '10.5px', letterSpacing: '.1em', color: C.faint },
    heroStep: { display: 'flex', gap: '16px', padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,.08)' },
    heroStepNum: { fontFamily: MONO, fontSize: '12px', color: C.yellow, flex: 'none', paddingTop: '2px' },
    heroStepTitle: { fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '-.015em' },
    heroStepBody: { margin: '6px 0 0', fontSize: '13.5px', lineHeight: 1.6, color: '#9aada4', textWrap: 'pretty' },
    heroCardFoot: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', fontSize: '13px', color: '#7d948a' },
    section: { padding: '64px 40px 80px', maxWidth: '1160px', margin: '0 auto', width: '100%' },
    sectionHead: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '36px', flexWrap: 'wrap' },
    eyebrow: { fontFamily: MONO, fontSize: '11px', letterSpacing: '.14em', color: C.faint },
    sectionTitle: {
        margin: '14px 0 0', fontSize: '32px', fontWeight: 800, letterSpacing: '-.028em', color: C.ink,
        maxWidth: '560px', textWrap: 'balance',
    },
    darkButton: {
        display: 'flex', alignItems: 'center', gap: '10px', background: C.green, color: '#fff', border: 'none',
        borderRadius: '10px', padding: '15px 24px', fontFamily: SANS, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
    },
    tipGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '20px', marginTop: '32px' },
    tipCard: { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '13px', padding: '26px 28px' },
    tipTitle: { margin: '12px 0 0', fontSize: '19px', fontWeight: 700, letterSpacing: '-.018em', color: C.ink },
    tipBody: { margin: '10px 0 0', fontSize: '14.5px', lineHeight: 1.6, color: C.muted, textWrap: 'pretty' },
};
