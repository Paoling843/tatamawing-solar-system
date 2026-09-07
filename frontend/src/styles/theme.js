export const colors = {
    primary: '#1a4a3a',
    primaryTint: '#f0f7f4',
    primaryBorder: '#dbe7e1',

    textDark: '#111827',
    textBody: '#374151',
    textMuted: '#6b7280',
    textFaint: '#dbe7e1',

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


export const statusColors = {
    pending:              { bg: colors.warningTint, text: colors.warning },
    approved:             { bg: colors.successTint, text: colors.success },
    confirmed:            { bg: colors.successTint, text: colors.success },
    available:            { bg: colors.successTint, text: colors.success },
    rejected:             { bg: colors.dangerTint, text: colors.danger },
    unavailable:          { bg: colors.dangerTint, text: colors.danger },
    out_of_stock:         { bg: colors.dangerTint, text: colors.danger },
    partially_available:  { bg: colors.orangeTint, text: colors.orange },
    draft:                { bg: colors.borderLight, text: colors.textMuted },
    scheduled:            { bg: colors.primaryTint, text: colors.primary },
    in_progress:          { bg: colors.warningTint, text: colors.warning },
    completed:            { bg: colors.successTint, text: colors.success },
    delayed:              { bg: colors.dangerTint, text: colors.danger },

};