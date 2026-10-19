import { Link } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useBusinessContact } from '../../services/businessContact';
import { C } from './engineStyles';
import {
    BUSINESS_NAME, SERVICE_AREA, CREDENTIALS, ADDRESS, ADDRESS_MAP_LINK, PHONE_DISPLAY, PHONE_LINK,
    FACEBOOK_LINK, EMAIL, MESSENGER_NAME, SERVICES, SERVICE_OPTIONS,
} from './businessInfo';

// Bottom of the home page: who the business is, how to reach it, and the
// legal pages. Details are from the business's Facebook page (businessInfo.js).
// The Messenger link comes from the server (GET /api/contact, set in the
// admin Messages settings); until it's set, the page name shows as text.

export default function LandingFooter({ user, onStart }) {
    const { messengerUrl } = useBusinessContact();
    const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';

    return (
        <footer className="se-footer" style={styles.footer}>
            <div className="se-footer-grid" style={styles.grid}>
                {/* ----- Who we are ----- */}
                <div style={styles.about}>
                    <BrandLogo light />
                    <p style={styles.aboutText}>
                        {BUSINESS_NAME} — {SERVICE_AREA.charAt(0).toLowerCase() + SERVICE_AREA.slice(1)}.
                    </p>
                    <ul style={styles.credentials} aria-label="Business credentials">
                        {CREDENTIALS.map((item) => (
                            <li key={item} style={styles.credential}>
                                <span style={styles.check} aria-hidden="true">✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ----- Contact ----- */}
                <div>
                    <h2 style={styles.heading}>Contact us</h2>
                    <ul style={styles.list}>
                        <li style={styles.item}>
                            <span style={styles.label}>Phone</span>
                            <a href={PHONE_LINK} className="se-footer-link" style={styles.link}>{PHONE_DISPLAY}</a>
                        </li>
                        <li style={styles.item}>
                            <span style={styles.label}>Facebook</span>
                            <a href={FACEBOOK_LINK} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {MESSENGER_NAME}
                            </a>
                        </li>
                        <li style={styles.item}>
                            <span style={styles.label}>Email</span>
                            <a href={`mailto:${EMAIL}`} style={styles.link}>{EMAIL}</a>
                        </li>
                        <li style={styles.item}>
                            <span style={styles.label}>Messenger</span>
                            {messengerUrl ? (
                                <a href={messengerUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                    {MESSENGER_NAME}
                                </a>
                            ) : (
                                <span style={styles.value}>{MESSENGER_NAME}</span>
                            )}
                        </li>
                    </ul>
                </div>

                {/* ----- Where we are ----- */}
                <div>
                    <h2 style={styles.heading}>Visit us</h2>
                    <ul style={styles.list}>
                        <li style={styles.item}>
                            <span style={styles.label}>Address</span>
                            <a href={ADDRESS_MAP_LINK} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {ADDRESS}
                            </a>
                        </li>
                        <li style={styles.item}>
                            <span style={styles.label}>Services</span>
                            <span style={styles.value}>{SERVICES}</span>
                        </li>
                        <li style={styles.item}>
                            <span style={styles.label}>Options</span>
                            <span style={styles.value}>{SERVICE_OPTIONS}</span>
                        </li>
                    </ul>
                </div>

                {/* ----- Shortcuts ----- */}
                <div>
                    <h2 style={styles.heading}>Get started</h2>
                    <ul style={styles.list}>
                        <li>
                            <button type="button" onClick={onStart} className="se-footer-link" style={styles.linkButton}>
                                Compute your system
                            </button>
                        </li>
                        <li>
                            <Link to="/external-installation-request" className="se-footer-link" style={styles.link}>
                                Set an installation
                            </Link>
                        </li>
                        <li>
                            {user ? (
                                <Link to={dashboardPath} className="se-footer-link" style={styles.link}>My dashboard</Link>
                            ) : (
                                <Link to="/login" className="se-footer-link" style={styles.link}>Log in</Link>
                            )}
                        </li>
                    </ul>
                </div>
            </div>

            {/* ----- Legal ----- */}
            <div className="se-footer-bottom" style={styles.bottom}>
                <span>© {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.</span>
                <nav style={styles.legal} aria-label="Legal">
                    <Link to="/privacy" className="se-footer-link" style={styles.link}>Privacy Policy</Link>
                    <Link to="/terms" className="se-footer-link" style={styles.link}>Terms of Service</Link>
                </nav>
            </div>
        </footer>
    );
}

// Dark green like the hero at the top of the page: light text, yellow links.
// Every text colour here is at least 8:1 on the green.
const DIVIDER = 'rgba(255,255,255,.14)';

const styles = {
    footer: { background: C.green, marginTop: 'auto' },
    grid: {
        maxWidth: '1480px', margin: '0 auto', padding: '48px 40px 36px', display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr)', gap: '40px',
    },
    about: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 },
    aboutText: { margin: 0, fontSize: '14px', lineHeight: 1.55, color: C.onDark, maxWidth: '380px' },
    credentials: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' },
    credential: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: C.onDark },
    check: { color: C.yellow, fontWeight: 800 },
    heading: {
        margin: '0 0 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        color: C.onDarkMuted,
    },
    list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
    item: { display: 'flex', flexDirection: 'column', gap: '2px' },
    label: { fontSize: '12px', color: C.onDarkMuted },
    value: { fontSize: '14px', fontWeight: 600, color: '#fff' },
    link: { fontSize: '14px', fontWeight: 600, color: C.yellow, textDecoration: 'none', overflowWrap: 'anywhere' },
    linkButton: {
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '14px', fontWeight: 600, color: C.yellow, textAlign: 'left',
    },
    bottom: {
        maxWidth: '1480px', margin: '0 auto', padding: '18px 40px 28px', borderTop: `1px solid ${DIVIDER}`,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 24px',
        fontSize: '13px', color: C.onDarkMuted,
    },
    legal: { display: 'flex', flexWrap: 'wrap', gap: '20px' },
};
