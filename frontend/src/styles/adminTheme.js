import { pageHero, pageHeroSubtitle, pageHeroTitle } from './theme';

export const adminTokens = {
    green: '#0f3b2c',
    greenHover: '#0b2e22',
    greenTint: '#e8efea',
    gold: '#f4c542',
    ink: '#16211c',
    body: '#293530',
    muted: '#5d6862',   // 5.8:1 on white
    faint: '#646e68',   // 5.3:1 on white — the lightest grey for text
    page: '#f4f6f2',
    surface: '#ffffff',
    border: '#e3e8e2',
    hairline: '#eef0ec',
    hairline2: '#f1f3ef',
    danger: '#c0392b',
    fontUI: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
    // One font for everything; numbers use tabular-nums so columns line up
};

// Shared heading styles, for the green banner at the top of every admin page
export const adminText = {
    pageTitle: pageHeroTitle,
    pageSubtitle: pageHeroSubtitle,
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

    // Spread into a page's own styles, e.g. tableHeader: { ...base, ...adminUi.tableHead }.
    // A main section card
    cardAccent: { border: `1px solid ${adminTokens.border}`, borderRadius: '16px' },
    // Table header rows: dark green band with light labels
    tableHead: { backgroundColor: adminTokens.green, color: '#cfe0d6', borderRadius: '8px' },
    // The green banner at the top of a page
    hero: pageHero,
};
