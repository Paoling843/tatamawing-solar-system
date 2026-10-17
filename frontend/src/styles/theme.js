export const colors = {
    primary: '#1a4a3a',
    primaryTint: '#f0f7f4',
    primaryBorder: '#dbe7e1',

    textDark: '#111827',
    textBody: '#374151',
    textMuted: '#6b7280',
    textFaint: '#878f8a',   // icons only (3.3:1, enough for non-text)

    bgPage: '#f8f9fb',
    bgSubtle: '#f9fafb',
    bgCard: '#ffffff',
    border: '#e5e7eb',
    borderLight: '#f3f4f6',

    success: '#16a34a',
    successTint: '#dcfce7',
    warning: '#ca8a04',
    warningTint: '#fef9c3',
    danger: '#dc2626',
    dangerTint: '#fef2f2',
    orange: '#ea580c',
    orangeTint: '#ffedd5',
};

export const typography = {
    h1:    { fontSize: '1.75rem', fontWeight: 700, color: colors.textDark, lineHeight: 1.2 },
    h2:    { fontSize: '1.125rem', fontWeight: 700, color: colors.textDark, lineHeight: 1.3 },
    h3:    { fontSize: '1rem', fontWeight: 600, color: colors.textDark, lineHeight: 1.4 },
    body:  { fontSize: '0.9rem', fontWeight: 400, color: colors.textBody, lineHeight: 1.5 },
    small: { fontSize: '0.8rem', fontWeight: 400, color: colors.textMuted, lineHeight: 1.4 },
    label: { fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.03em' },
};

export const spacing = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    cardPadding: '1.5rem',
};

export const radii = {
    sm: '8px',
    md: '10px',
    lg: '16px',
    pill: '999px',
};

export const shadows = {
    card: '0 1px 4px rgba(0,0,0,0.06)',
};


// One set of status colours for every page (used by <Badge> and the
// schedule calendar). Each text colour has at least 4.5:1 contrast on its
// background.
const tone = {
    waiting:  { bg: '#fdf4dc', text: '#8a6a12', border: '#f3e3ad' },
    good:     { bg: '#e4ede8', text: '#0f3b2c', border: '#cfe0d7' },
    bad:      { bg: '#fbeae7', text: '#a4302a', border: '#f0d0cb' },
    partial:  { bg: '#fdeee0', text: '#9a4a10', border: '#f5d6bb' },
    planned:  { bg: '#e8eef8', text: '#2f5fb8', border: '#cfdcf2' },
    neutral:  { bg: '#f1f3ef', text: '#4f5a54', border: '#e6e8e2' },
};

export const statusColors = {
    pending:              tone.waiting,
    pending_review:       tone.waiting,
    in_progress:          tone.waiting,
    approved:             tone.good,
    confirmed:            tone.good,
    available:            tone.good,
    completed:            tone.good,
    rejected:             tone.bad,
    unavailable:          tone.bad,
    out_of_stock:         tone.bad,
    delayed:              tone.bad,
    partially_available:  tone.partial,
    limited:              tone.partial,
    scheduled:            tone.planned,
    draft:                tone.neutral,
};