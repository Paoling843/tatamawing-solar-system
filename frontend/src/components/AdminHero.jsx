import { adminText, adminTokens, adminUi } from '../styles/adminTheme';

// The green banner at the top of an admin page. `children` is the optional
// darker strip along its bottom: <HeroStrip>, a row of <HeroStat>s, or
// <FilterTiles>.
export default function AdminHero({ eyebrow, title, subtitle, actions, children, style }) {
    const hasStrip = Boolean(children);

    return (
        <section
            aria-label="Page summary"
            style={{ ...adminUi.hero, ...(hasStrip ? { padding: 0 } : {}), ...style }}
        >
            <div className="hero-top" style={{ ...styles.top, ...(hasStrip ? styles.topPadded : {}) }}>
                <div style={{ minWidth: 0 }}>
                    {eyebrow && <span style={adminText.eyebrow}>{eyebrow}</span>}
                    {title && <h1 style={adminText.pageTitle}>{title}</h1>}
                    {subtitle && <p style={adminText.pageSubtitle}>{subtitle}</p>}
                </div>
                {actions && <div className="hero-actions" style={styles.actions}>{actions}</div>}
            </div>
            {hasStrip && children}
        </section>
    );
}

// The strip on its own, for pages that put something other than stats in it
export function HeroStrip({ children, style, className = '' }) {
    return <div className={`hero-grid ${className}`} style={{ ...adminUi.heroStrip, ...style }}>{children}</div>;
}

// One number in the strip
export function HeroStat({ label, value, note, valueColor }) {
    return (
        <div style={styles.stat}>
            <span style={styles.statLabel}>{label}</span>
            <span style={{ ...styles.statValue, color: valueColor || '#FFFFFF' }}>{value}</span>
            {note && <span style={styles.statLabel}>{note}</span>}
        </div>
    );
}

// Status filter in the strip: one tile per option, each with a coloured dot,
// its label and a count. The chosen tile gets a gold underline.
//   options: [{ key, label, dot, count }]
export function FilterTiles({ label, options, value, onChange, minWidth = 120 }) {
    return (
        <div
            role="group"
            aria-label={label}
            // On phones: "All" across the top, the rest two by two (App.css)
            className="hero-grid hero-grid--lead"
            style={{ ...adminUi.heroStrip, gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))` }}
        >
            {options.map((opt) => {
                const on = value === opt.key;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(opt.key)}
                        style={{ ...styles.tile, ...(on ? styles.tileOn : {}) }}
                    >
                        <span style={{ ...styles.tileLabel, color: on ? '#FFFFFF' : adminTokens.stripText }}>
                            <span style={{ ...styles.tileDot, background: opt.dot || '#FFFFFF' }} />
                            {opt.label}
                        </span>
                        <span style={styles.tileCount}>{opt.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

const styles = {
    top: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '16px 24px',
    },
    topPadded: { padding: '22px 24px 20px' },
    actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' },
    stat: {
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
        // Every cell has a left divider pulled 1px out; the strip's overflow:hidden
        // cuts it off on the first cell of each row, however the grid wraps
        borderLeft: '1px solid rgba(255,255,255,0.12)',
        marginLeft: '-1px',
    },
    statLabel: { fontSize: '13px', color: adminTokens.stripText },
    statValue: { fontSize: '28px', fontWeight: 700, lineHeight: 1.15 },

    tile: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '2px',
        padding: '14px 18px',
        border: 'none',
        borderLeft: '1px solid rgba(255,255,255,0.12)',
        marginLeft: '-1px',
        textAlign: 'left',
        cursor: 'pointer',
        color: '#FFFFFF',
        background: 'transparent',
        fontFamily: 'inherit',
        minWidth: 0,
    },
    tileOn: { background: 'rgba(255,255,255,0.1)', boxShadow: `inset 0 -3px 0 ${adminTokens.gold}` },
    tileLabel: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', whiteSpace: 'nowrap' },
    tileDot: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' },
    tileCount: { fontSize: '24px', fontWeight: 700, lineHeight: 1.2 },
};
