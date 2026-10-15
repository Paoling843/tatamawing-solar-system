// Shared colours, fonts and style objects for the Solar Computation Engine
// pages, taken from the Solar Computation design prototype.
// Hover, focus and small-screen rules can't be written as inline styles, so
// those live in engine.css.

export const C = {
    ink: '#16211c',        // headings and main text
    body: '#293530',       // secondary button text
    green: '#0f3b2c',      // brand dark green
    yellow: '#f4c542',     // highlight numbers on dark green
    mint: '#e4ede8',       // selected option background
    // The greys below are kept dark enough to read easily: each one has at
    // least 4.5:1 contrast on white (the WCAG AA minimum for body text).
    muted: '#3c4741',      // body copy
    sub: '#4a5550',        // secondary notes
    faint: '#4f5a54',      // eyebrow labels
    dim: '#6c7570',        // disabled / "not used"
    pageBg: '#f6f7f4',
    fieldBg: '#fbfcfa',
    softBg: '#f3f5f1',
    border: '#e6e8e2',
    borderSoft: '#eef0ec',
    rowBorder: '#f2f4f0',
    fieldBorder: '#bfc5bd',
    darkPanel: '#16211c',
    onDark: '#e2ebe6',     // text on the dark green / dark panels
    onDarkMuted: '#c3d4cb',
    required: '#c0392b',   // the red asterisk on required fields
    errorText: '#9c2f22',
    errorBorder: '#d9a49b',
    errorBg: '#fdf6f4',
    warnBg: '#fbf0d9',
    warnBorder: '#edd9a3',
    warnText: '#5e4300',
    warnBody: '#6b5520',
    warnIcon: '#8a6100',
};

// Inter: sturdy letters and a tall x-height, so small text stays readable.
// Numbers use the same font; engine.css turns on tabular (equal-width)
// digits so figures in tables and totals still line up.
export const SANS = "'Inter', Helvetica, Arial, sans-serif";
export const NUM = SANS;

// Colours for the stacked price bar, darkest for the biggest cost
export const COST_RAMP = ['#0f3b2c', '#1d5c46', '#2e7d62', '#4c9179', '#79ac99', '#f4c542'];

export const s = {
    // Full-width page (landing page and the guest engine page)
    page: {
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: C.pageBg,
        fontFamily: SANS,
        color: C.ink,
    },

    // Page wrappers
    stepPage: (maxWidth) => ({
        maxWidth,
        margin: '0 auto',
        padding: '48px 40px 80px',
        width: '100%',
    }),

    // Small uppercase label, e.g. "STEP 01 · APPLIANCE LOAD"
    eyebrow: { fontFamily: NUM, fontSize: '12.5px', fontWeight: 600, letterSpacing: '.08em', color: C.faint },
    cardEyebrow: { fontFamily: NUM, fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', color: C.faint },

    h1: { margin: '16px 0 0', fontSize: '38px', fontWeight: 800, letterSpacing: '-.03em', color: C.ink, textWrap: 'balance', lineHeight: 1.15 },
    lead: { margin: '12px 0 0', fontSize: '16px', lineHeight: 1.55, color: C.muted, maxWidth: '660px', textWrap: 'pretty' },

    card: { background: '#fff', border: `1px solid ${C.border}`, borderRadius: '13px' },
    cardTitle: { fontSize: '15.5px', fontWeight: 700, color: C.ink, letterSpacing: '-.012em' },
    cardNote: { fontSize: '13px', color: C.sub, marginTop: '3px' },

    // Form controls
    select: {
        border: `1px solid ${C.fieldBorder}`, borderRadius: '8px', padding: '11px 10px',
        fontFamily: SANS, fontSize: '14px', color: C.ink, outline: 'none',
        background: C.fieldBg, cursor: 'pointer', minWidth: 0,
    },
    monoSelect: {
        border: `1px solid ${C.fieldBorder}`, borderRadius: '8px', padding: '10px 6px',
        fontFamily: NUM, fontSize: '13px', color: C.ink, outline: 'none',
        background: C.fieldBg, cursor: 'pointer', minWidth: 0,
    },
    numberInput: (invalid) => ({
        border: `1px solid ${invalid ? C.errorBorder : C.fieldBorder}`, borderRadius: '8px', padding: '10px 9px',
        fontFamily: NUM, fontSize: '14px', color: C.ink, outline: 'none',
        background: invalid ? C.errorBg : C.fieldBg, textAlign: 'right', minWidth: 0, width: '100%',
    }),
    requiredNote: { fontSize: '12px', color: C.errorText, textAlign: 'right' },
    // Red "*" after a required field's label
    requiredMark: { color: C.required, fontWeight: 700, marginLeft: '3px' },

    // Buttons
    primaryButton: {
        display: 'flex', alignItems: 'center', gap: '10px', background: C.green, color: '#fff',
        border: 'none', borderRadius: '10px', padding: '14px 22px', fontFamily: SANS,
        fontSize: '14.5px', fontWeight: 700, cursor: 'pointer',
    },
    secondaryButton: {
        background: '#fff', color: C.body, border: `1px solid ${C.fieldBorder}`, borderRadius: '10px',
        padding: '14px 20px', fontFamily: SANS, fontSize: '14.5px', fontWeight: 600, cursor: 'pointer',
    },

    // Radio-style option rows (inverter package, battery)
    option: (active, locked) => ({
        display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: '9px',
        cursor: locked ? 'not-allowed' : 'pointer', border: `1px solid ${active ? C.green : C.border}`,
        background: active ? C.mint : '#fff', color: locked ? C.dim : C.ink, opacity: locked ? 0.55 : 1,
        width: '100%', fontFamily: SANS, textAlign: 'left',
    }),
    radioDot: (active) => ({
        width: '14px', height: '14px', borderRadius: '50%', flex: 'none',
        border: active ? `4px solid ${C.green}` : '1.5px solid #c3cac4', background: '#fff',
    }),
    tag: (bg, color) => ({
        fontFamily: NUM, fontSize: '11.5px', fontWeight: 600, letterSpacing: '.05em', background: bg, color,
        borderRadius: '20px', padding: '4px 9px', whiteSpace: 'nowrap',
    }),
};
