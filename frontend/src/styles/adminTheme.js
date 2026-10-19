export const adminTokens = {
    green: '#0f3b2c',
    greenHover: '#0b2e22',
    greenTint: '#e8efea',
    gold: '#f4c542',
    ink: '#16211c',
    body: '#293530',
    muted: '#5d6862',   // 5.8:1 on white
    faint: '#646e68',   // 5.3:1 on white — the lightest grey for text
    page: '#f6f7f4',
    surface: '#ffffff',
    border: '#e6e8e2',
    hairline: '#eef0ec',
    hairline2: '#f1f3ef',
    danger: '#c0392b',
    fontUI: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
    fontMono: "'IBM Plex Mono', monospace",
};

// Shared text styles, so every admin page heading looks the same
export const adminText = {
    pageTitle: {
        fontSize: '30px',
        fontWeight: 800,
        letterSpacing: '-.03em',
        color: adminTokens.ink,
        margin: 0,
    },
    pageSubtitle: {
        fontSize: '14px',
        color: adminTokens.muted,
        margin: '6px 0 0',
    },
};

// Shared blocks used on several admin pages
export const adminUi = {
    errorBanner: {
        backgroundColor: '#fbeae7',
        color: '#a4302a',
        border: '1px solid #f0d0cb',
        padding: '12px 14px',
        borderRadius: '10px',
        marginBottom: '16px',
        fontSize: '14px',
    },
};
