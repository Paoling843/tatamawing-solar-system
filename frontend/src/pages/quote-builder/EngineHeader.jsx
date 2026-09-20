import { Link } from 'react-router-dom';
import logo from '../../assets/logo.jpg';
import { C, MONO, SANS } from './engineStyles';
import EngineStepNav from './EngineStepNav';

// Sticky top bar: logo, engine name, and either the "Get Started" button
// (on the landing screen) or the 01 · 02 · 03 step indicator.
export default function EngineHeader({ screen, user, onLogoClick, onGetStarted }) {
    const onLanding = screen === 'landing';

    // Logged-in users get a way back to their own dashboard
    const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';

    return (
        <header className="se-header" style={styles.header}>
            <div onClick={onLogoClick} style={styles.brand}>
                <img src={logo} alt="TataMawing Solar" style={styles.logo} />
                <div style={styles.brandName}>
                    TataMawing <span style={{ color: C.muted, fontWeight: 600 }}>Solar</span>
                </div>
            </div>
            <div className="se-header-divider" style={styles.divider} />
            <div className="se-header-tagline" style={styles.tagline}>SOLAR COMPUTATION ENGINE</div>

            <div style={styles.right}>
                {!onLanding && <EngineStepNav screen={screen} />}

                {/* Guests on the landing page can log in to an existing account */}
                {onLanding && !user && (
                    <Link to="/login" className="se-link" style={styles.dashboardLink}>
                        Log in
                    </Link>
                )}

                {onLanding && (
                    <button className="se-btn-primary" onClick={onGetStarted} style={styles.getStarted}>
                        Get Started
                    </button>
                )}

                {user && (
                    <Link to={dashboardPath} className="se-link" style={styles.dashboardLink}>
                        My dashboard
                    </Link>
                )}
            </div>
        </header>
    );
}

const styles = {
    header: {
        height: '72px', flex: 'none', background: '#fff', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: '28px', padding: '0 40px',
        position: 'sticky', top: 0, zIndex: 40,
    },
    brand: { display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer', minWidth: 0 },
    logo: { height: '44px', width: 'auto', display: 'block', borderRadius: '8px' },
    brandName: { fontSize: '17px', fontWeight: 700, color: C.ink, letterSpacing: '-.015em', whiteSpace: 'nowrap' },
    divider: { width: '1px', height: '24px', background: C.border },
    tagline: { fontFamily: MONO, fontSize: '11.5px', letterSpacing: '.1em', color: C.muted },
    right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '22px' },
    getStarted: {
        background: C.green, color: '#fff', border: 'none', borderRadius: '9px', padding: '11px 18px',
        fontFamily: SANS, fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
    },
    dashboardLink: { fontSize: '13.5px', fontWeight: 600, color: C.green, textDecoration: 'none', whiteSpace: 'nowrap' },
};
