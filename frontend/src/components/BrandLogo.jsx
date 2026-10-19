import logo from '../assets/logo.jpg';
import { C } from '../pages/quote-builder/engineStyles';

// The TataMawing Solar logo as it appears on the home page: the logo image
// and "TataMawing Solar" with "Solar" in a lighter weight. Used by every
// header and sidebar so the brand looks the same everywhere.
//   size           logo height in px
//   fontSize       wordmark size in px
//   tag            small line under the name, e.g. "Admin"
//   textClassName  e.g. "sidebar-label", so a collapsed sidebar hides the text
export default function BrandLogo({ size = 44, fontSize = 17, tag, textClassName }) {
    return (
        <span style={styles.wrap}>
            <img
                src={logo}
                alt=""
                style={{ ...styles.image, height: `${size}px`, width: `${size}px` }}
            />
            <span className={textClassName} style={styles.text}>
                <span style={{ ...styles.name, fontSize: `${fontSize}px` }}>
                    TataMawing <span style={styles.solar}>Solar</span>
                </span>
                {tag && <span style={styles.tag}>{tag}</span>}
            </span>
        </span>
    );
}

const styles = {
    wrap: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 },
    image: { display: 'block', flexShrink: 0, borderRadius: '8px', objectFit: 'cover' },
    text: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    // Cut off with "…" rather than overlapping whatever sits next to it
    name: {
        fontWeight: 700, color: C.ink, letterSpacing: '-.015em', whiteSpace: 'nowrap', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis',
    },
    solar: { color: C.muted, fontWeight: 600 },
    tag: {
        fontSize: '11.5px', fontWeight: 600, color: C.muted, letterSpacing: '.02em', marginTop: '2px',
        whiteSpace: 'nowrap',
    },
};
