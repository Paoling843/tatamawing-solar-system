import darkTextLogo from '../assets/tatamawing-logo-transparent.png';
import whiteTextLogo from '../assets/tatamawing-logo-transparent-white-text.png';
import { C } from '../pages/quote-builder/engineStyles';

// One height for every header and sidebar, so the logo is the same size
// everywhere. It fits the 72px home page header and the 232px sidebar.
const LOGO_HEIGHT = '52px';

// The TataMawing Solar logo. The image already includes the business name.
//   tag            small label next to the logo, e.g. "Admin"
//   textClassName  e.g. "sidebar-label", so a collapsed sidebar hides the tag
//   light          white-text logo, for dark green backgrounds
export default function BrandLogo({ tag, textClassName, light = false }) {
    return (
        <span style={styles.wrap}>
            <img
                src={light ? whiteTextLogo : darkTextLogo}
                alt="TataMawing Solar"
                className="brand-logo-image"
                style={styles.image}
            />
            {tag && (
                <span className={textClassName} style={{ ...styles.tag, color: light ? C.onDarkMuted : C.muted }}>
                    {tag}
                </span>
            )}
        </span>
    );
}

const styles = {
    wrap: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 },
    // The logo is wide, so only its height is set
    image: { display: 'block', flexShrink: 0, height: LOGO_HEIGHT, width: 'auto' },
    tag: { fontSize: '11.5px', fontWeight: 600, letterSpacing: '.02em', whiteSpace: 'nowrap' },
};
