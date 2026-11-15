import { statusColors } from './theme';

// Colours and sizes from the admin redesign mockups (Overview, Quotations,
// Schedule, Analytics, Users, Messages, Audit log and FAQ management).
export const adminTokens = {
    green: '#0F3D2E',
    greenHover: '#0A2A20',
    greenTint: '#EEF6F1',   // selected rows and calendar days
    gold: '#F2C14E',
    onGold: '#14261F',      // text on gold buttons
    ink: '#1B2420',
    body: '#3A4440',
    muted: '#5F6A65',       // secondary text (5.7:1 on white)
    faint: '#5F6A65',       // the lightest grey used for text
    subtle: '#7A837E',      // timestamps and small meta text, as in the mockups
    page: '#F5F5F2',
    surface: '#FFFFFF',
    border: '#E3E3DE',
    hairline: '#EFEFEA',
    hairline2: '#EFEFEA',
    danger: '#B42318',
    fontUI: "'Source Sans 3', system-ui, sans-serif",

    line: '#E3E3DE',        // card and table borders
    rowLine: '#EFEFEA',     // between table rows
    headBg: '#FAFAF8',      // table header rows
    control: '#D6D6D0',     // borders of white buttons and inputs
    strip: '#0B3326',       // the darker band at the bottom of the green banner
    stripText: '#C3D3CB',   // light text on the green banner
    stripLabel: '#9DB5A9',  // small uppercase labels on green
    radius: '6px',
    heroRadius: '8px',
};

// Status colours from the mockups. `dot` is used on white, `darkDot` on the
// green banner's filter tiles.
export const adminStatus = {
    pending:     { label: 'Pending', bg: '#FBEBC4', fg: '#6B4500', dot: '#D49A23', darkDot: '#F2C14E' },
    pending_review: { label: 'Pending review', bg: '#FBEBC4', fg: '#6B4500', dot: '#D49A23', darkDot: '#F2C14E' },
    approved:    { label: 'Approved', bg: '#E3F1E8', fg: '#1F6B45', dot: '#2E8B5E', darkDot: '#A8D5C2' },
    confirmed:   { label: 'Confirmed', bg: '#E3F1E8', fg: '#1F6B45', dot: '#2E8B5E', darkDot: '#A8D5C2' },
    rejected:    { label: 'Rejected', bg: '#FBE4E1', fg: '#A3261B', dot: '#C8372B', darkDot: '#F08A7E' },
    cancelled:   { label: 'Cancelled', bg: '#EEEFEC', fg: '#3A4440', dot: '#6B7570', darkDot: '#B9C4BE' },
    scheduled:   { label: 'Scheduled', bg: '#E6EFF9', fg: '#1F4E80', dot: '#3F7CC0', darkDot: '#8EC1EE' },
    in_progress: { label: 'In progress', bg: '#FBEBC4', fg: '#6B4500', dot: '#D49A23', darkDot: '#F2C14E' },
    completed:   { label: 'Completed', bg: '#E3F1E8', fg: '#1F6B45', dot: '#2E8B5E', darkDot: '#A8D5C2' },
    delayed:     { label: 'Delayed', bg: '#FBE4E1', fg: '#A3261B', dot: '#C8372B', darkDot: '#F08A7E' },
};

// Shared heading styles, for the green banner at the top of every admin page
export const adminText = {
    eyebrow: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: adminTokens.gold,
    },
    pageTitle: {
        margin: '4px 0 0',
        // Shrinks on phones so long page titles don't push the banner wider than the screen
        fontSize: 'clamp(22px, 6vw, 26px)',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
        color: '#FFFFFF',
    },
    pageSubtitle: {
        margin: '2px 0 0',
        fontSize: '14px',
        color: adminTokens.stripText,
    },
};

// Shared blocks used on several admin pages
export const adminUi = {
    errorBanner: {
        backgroundColor: '#FBE4E1',
        color: '#A3261B',
        border: '1px solid #E8C4BF',
        padding: '12px 14px',
        borderRadius: adminTokens.radius,
        marginBottom: '16px',
        fontSize: '14px',
    },
    successBanner: {
        backgroundColor: '#E3F1E8',
        color: '#1F6B45',
        border: '1px solid #C6E2D1',
        padding: '12px 14px',
        borderRadius: adminTokens.radius,
        marginBottom: '16px',
        fontSize: '14px',
    },

    // Spread into a page's own styles, e.g. tableHeader: { ...base, ...adminUi.tableHead }.
    // A main section card
    cardAccent: { border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius, boxShadow: 'none' },
    // A plain white section card
    card: {
        backgroundColor: adminTokens.surface,
        border: `1px solid ${adminTokens.line}`,
        borderRadius: adminTokens.radius,
    },
    // Table header rows: light band with small grey uppercase labels
    tableHead: {
        backgroundColor: adminTokens.headBg,
        color: adminTokens.muted,
        borderRadius: 0,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    // The green banner at the top of a page
    hero: {
        backgroundColor: adminTokens.green,
        color: '#FFFFFF',
        borderRadius: adminTokens.heroRadius,
        padding: '22px 24px 20px',
        marginBottom: '20px',
    },
    // The darker band of numbers at the bottom of the banner
    heroStrip: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
        backgroundColor: adminTokens.strip,
        borderTop: '1px solid rgba(255,255,255,0.14)',
        borderRadius: `0 0 ${adminTokens.heroRadius} ${adminTokens.heroRadius}`,
        overflow: 'hidden',
    },
    // Buttons
    primaryBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '40px', padding: '0 16px', border: 'none', borderRadius: adminTokens.radius,
        backgroundColor: adminTokens.green, color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
        fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
    },
    goldBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '42px', padding: '0 16px', border: 'none', borderRadius: adminTokens.radius,
        backgroundColor: adminTokens.gold, color: adminTokens.onGold, fontSize: '14px', fontWeight: 700,
        fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
    },
    whiteBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '40px', padding: '0 14px', border: `1px solid ${adminTokens.control}`, borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF', color: adminTokens.ink, fontSize: '14px', fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
    },
    rejectBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '40px', padding: '0 14px', border: '1px solid #E8C4BF', borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF', color: adminTokens.danger, fontSize: '14px', fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
    },
    // A search box: label wrapping an icon and a borderless input
    searchBox: {
        display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 10px',
        border: `1px solid ${adminTokens.control}`, borderRadius: adminTokens.radius,
        backgroundColor: '#FFFFFF', color: adminTokens.muted,
    },
    searchInput: {
        border: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: '14px',
        color: adminTokens.ink, background: 'transparent', fontFamily: 'inherit',
    },
    srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
    // Small status label, e.g. statusPill('pending')
    statusPill: (status) => {
        const tone = adminStatus[status];
        const fallback = statusColors[status] || statusColors.draft;
        return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '4px',
            padding: '1px 8px',
            whiteSpace: 'nowrap',
            backgroundColor: tone ? tone.bg : fallback.bg,
            color: tone ? tone.fg : fallback.text,
        };
    },
};

export const statusLabel = (status) => adminStatus[status]?.label
    ?? String(status || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
