// Colours for the calculator steps, from the "Customer · Request quotation"
// mockups (the same palette as the redesigned admin and customer pages)
export const Q = {
    green: '#0F3D2E',
    greenHover: '#1A5A43',
    gold: '#F2C14E',
    onGold: '#14261F',
    ink: '#1B2420',
    body: '#3A4440',
    muted: '#5F6A65',
    subtle: '#7A837E',
    line: '#E3E3DE',
    rowLine: '#EFEFEA',
    control: '#D6D6D0',
    headBg: '#FAFAF8',
    tint: '#E3F1E8',
    tintSoft: '#F3F8F5',
    tintBorder: '#B9D3C5',
    stripText: '#C3D3CB',
    done: '#A8D5C2',
    danger: '#B42318',
};

// Shared pieces of the step pages
export const qs = {
    // The column the steps sit in (the customer layout and the home page)
    page: { width: '100%', maxWidth: '1320px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: 1.45, color: Q.ink },
    card: { background: '#FFFFFF', border: `1px solid ${Q.line}`, borderRadius: '6px' },
    cardHead: {
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '12px', padding: '18px 20px', borderBottom: `1px solid ${Q.line}`,
    },
    h2: { margin: 0, fontSize: '18px', fontWeight: 700, color: Q.ink },
    sub: { margin: '2px 0 0', color: Q.muted },
    legend: {
        padding: 0, marginBottom: '8px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: Q.muted,
    },
    label: { fontSize: '13px', fontWeight: 600, color: Q.ink },
    field: (invalid) => ({
        height: '40px', padding: '0 10px', boxSizing: 'border-box', width: '100%', minWidth: 0,
        border: `1px solid ${invalid ? '#C8372B' : Q.control}`, borderRadius: '6px',
        font: 'inherit', color: Q.ink, background: invalid ? '#FFF8F7' : '#FFFFFF',
    }),
    readonly: {
        height: '40px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 10px',
        border: `1px solid ${Q.rowLine}`, borderRadius: '6px', background: '#F7F7F4',
    },
    error: { fontSize: '12px', color: Q.danger },
    srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
    notice: { margin: 0, padding: '12px 14px', borderRadius: '6px', background: Q.tint, color: '#1F4D3A', lineHeight: 1.5 },
    alert: { margin: 0, padding: '12px 14px', borderRadius: '6px', border: '1px solid #F0D0CB', background: '#FBEAE7', color: '#A4302A', lineHeight: 1.5 },
    bigBtn: { height: '46px', padding: '0 20px', fontSize: '15px', fontWeight: 700 },
};
