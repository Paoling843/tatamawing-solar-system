import { useNavigate } from 'react-router-dom';
import { BoltIcon, HardHatIcon, PesoIcon, LeafIcon } from '../components/Icons';

export default function LandingPage() {
    const navigate = useNavigate();

    const features = [
        { icon: <BoltIcon size={22} color="#1a4a3a" />, title: 'Free Instant Estimate', desc: 'Enter your appliances and get a computed solar system size in seconds — no waiting for a site visit.'},
        { icon: <HardHatIcon size={22} color="#1a4a3a" />, title: 'Licensed Technicianse', desc: 'Every installation is handled by certified, experienced tefchnicians.'},
        { icon: <PesoIcon size={22} color="#1a4a3a" />, title: 'Flexible Financing', desc: 'Transparent pricing with payment options that fits your budget.' },
        { icon: <LeafIcon size={22} color="#1a4a3a" />, title: 'Eco-Friendly', desc: 'Cut your carbon footprint while cutting your electricty bill.'},
    ];

    const steps = [
        { number: '1', title: 'Submit Appliances', desc: 'Tell us what appliances you use and how often.'},
        { number: '2', title: 'Get Instant Estimate', desc: 'Our system computes youre ideal solar setup right away.'},
        { number: '3', title: 'Admin Reviews & Approves', desc: 'Our team reviews and finalizes your quotation.'},
        { number: '4', title: 'Installation Scheduled', desc: 'We schedule and install your solar system.'},
    ]

    const testimonials = [
        { quote: 'The estimate was accurate and the whole process was so much faster than I expected.', name: 'Maria Santos', role: 'Homeowner, Zone 8'},
        { quote: 'Our electricity bill dropped by more than half within the first month', name: 'Juan Dela Cruz', role: 'Homeowner, Barangay Obrero'},
        { quote: 'Professional installers and clear communication from start to finish.', name: 'Liza Reyes', role: 'Homeowner, Villa Las Palmas'},
    ]

    return (
        <div style={styles.page}>
            <style>{`
                @keyframes floatA {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(20px, -30px) rotate(8deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes floatB {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(-25px, 20px) rotate(-6deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes floatC {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(15px, 15px) scale(1.05); }
                    100% { transform: translate(0, 0) scale(1); }
                }
            `}</style>

            <div style={styles.navbar}>
                <span style={styles.logo}>TataMawing Solar</span>
                <div style={styles.navRight}>
                    <button style={styles.navLoginBtn} onClick={() => navigate('/login')}>Log In</button>
                    <button style={styles.navCtaBtn} onClick={() => navigate('/register')}>Get Started</button>
                </div>
            </div>

            <div style={styles.hero}>
                <div style={{ ...styles.placeholderImg, ...styles.imgOne}}>Image 1</div>
                <div style={{ ...styles.placeholderImg, ...styles.imgTwo}}> Image</div>
                <div style={{ ...styles.placeholderImg, ...styles.imgThree}}> Image 3</div>

                <div style={styles.heroText}>
                    <h1 style={styles.heroTitle}>Power Your Home With TataMawing Solar</h1>
                    <p style={styles.heroSubtitle}>
                        Get a free, instant solar system estimate based on your appliances and monthly usage.
                    </p>
                    <button style={styles.ctaBtn} onClick={() => navigate('/register')}>
                        Get Started
                    </button>
                </div>
            </div>

            <div style={styles.statsStrip}>
                <div style={styles.statItem}>
                    <span style={styles.statNumber}>500+</span>
                    <span style={styles.statLabel}>Installations</span>
                </div>
                {/* <div style={styles.statItem}>
                    <span style={styles.statNumber}>10-Year</span>
                    <span style={styles.statLabel}>Warranty</span>
                </div> */}
                <div style={styles.statItem}>
                    <span style={styles.statNumber}>98%</span>
                    <span style={styles.statLabel}>Customer Satisfaction</span>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Why Choose Us?</h2>
                <p style={styles.sectionSubtitle}> Everything you need for a smooth solar installation.</p>

                <div style={styles.featuresGrid}>
                    {features.map((f) => (
                        <div key={f.title} style={styles.featureCard}>
                            <div style={styles.featureIconWrap}>{f.icon}</div>
                            <h3 style={styles.featureTitle}>{f.title}</h3>
                            <p style={styles.featureDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.howItWorksBand}>
                <div style={styles.seaction}>
                    <h2 style={styles.sectionTitle}>How It Works?</h2>
                    <p style={styles.sectionSubtitle}>From estimate to installation in four simple steps.</p>

                    <div style={styles.stepsGrid}>
                        {steps.map((s) => (
                            <div key={s.number} style={styles.stepCard}>
                                <div style={styles.stepNumber}>{s.number}</div>
                                <h3 style={styles.featureTitle}>{s.title}</h3>
                                <p style={styles.featureDesc}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>What Our Customers Say</h2>
                <p style={styles.sectionSubtitle}>Placeholder Testemonials -- replace with real customer feedback.</p>

                <div style={styles.testimonialsGrid}>
                    {testimonials.map((t) => (
                        <div key={t.name} style={styles.testimonialCard}>
                            <p style={styles.testimonialQuote}>"{t.quote}"</p> 
                            <div style={styles.testimonialAuthorRow}>
                                <div style={styles.testimonialAvatar}>{t.name.charAt(0)}</div>
                                <div>
                                    <p style={styles.testimonialName}>{t.name}</p>
                                    <p style={styles.testimonialRole}>{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div> 

            <div style={styles.ctaBanner}>
                <h2 style={styles.ctaBannerTitle}>Ready to Go Solar?</h2>
                <p style={styles.ctaBannerSubtitle}>Get you free instant estimate today — no commitment required.</p>
                <button style={styles.ctaBannerBtn} onClick={() => navigate('/register')}>
                    Get Started
                </button>
            </div>

            <div style={styles.footer}>
                <span style={styles.footerText}>© 2024 TataMawing Solar. All rights reserved.</span>
                <div style={styles.footerLinks}>
                    <span style={styles.footerLink}>About</span>
                    <span style={styles.footerLink}>Contact</span>
                    <span style={styles.footerLink}>Privacy Policy</span>
                    <span style={styles.footerLink}>Terms of Service</span>
                </div>
            </div>
        </div>
    );
}
const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: 'white',
    },
    navbar: {
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: {
        fontWeight: '800',
        fontSize: '1.25rem',
        color: '#1a4a3a',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    navLoginBtn: {
        backgroundColor: 'transparent',
        color: '#374151',
        border: 'none',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    navCtaBtn: {
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '10px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    hero: {
        position: 'relative',
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '5rem 2rem',
        overflow: 'hidden',
        boxSizing: 'border-box',
    },
    heroText: {
        position: 'relative',
        zIndex: 2,
        maxWidth: '560px',
        textAlign: 'left',
    },
    heroTitle: {
        fontSize: '2.5rem',
        fontWeight: '800',
        color: '#111827',
        marginBottom: '1rem',
        lineHeight: 1.15,
    },
    heroSubtitle: {
        fontSize: '1.1rem',
        color: '#6b7280',
        marginBottom: '2rem',
    },
    ctaBtn: {
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        padding: '0.875rem 2rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    placeholderImg: {
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.875rem',
        borderRadius: '20px',
        zIndex: 1,
    },
    imgOne: {
        top: '0',
        right: '15%',
        width: '160px',
        height: '160px',
        backgroundColor: '#1a4a3a',
        animation: 'floatA 6s ease-in-out infinite',
    },
    imgTwo: {
        top: '55%',
        right: '0',
        width: '120px',
        height: '120px',
        backgroundColor: '#f59e0b',
        borderRadius: '50%',
        animation: 'floatB 7s ease-in-out infinite',
        animationDelay: '0.5s',
    },
    imgThree: {
        top: '30%',
        right: '35%',
        width: '90px',
        height: '90px',
        backgroundColor: '#38bdf8',
        animation: 'floatC 5s ease-in-out infinite',
        animationDelay: '1s',
    },
    statsStrip: {
        backgroundColor: '#f8f9fb',
        borderTop: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        padding: '2.5rem 2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        maxWidth: '1100px',
        margin: '0 auto',
        boxSizing: 'border-box',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '0.25rem',
    },
    statNumber: {
        fontSize: '2rem',
        fontWeight: '800',
        color: '#1a4a3a',
    },
    statLabel: {
        fontSize: '0.8rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        fontWeight: '600',
    },
    section: {
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '4rem 2rem',
        boxSizing: 'border-box',
    },
    sectionTitle: {
        fontSize: '2rem',
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: '0.5rem',
    },
    sectionSubtitle: {
        fontSize: '1rem',
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: '2.5rem',
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem',
    },
    featureCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        textAlign: 'left',
    },
    featureIconWrap: {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        backgroundColor: '#f0f7f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
    },
    featureTitle: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.5rem 0',
    },
    featureDesc: {
        fontSize: '0.875rem',
        color: '#6b7280',
        lineHeight: '1.5',
        margin: 0,
    },
    howItWorksBand: {
        backgroundColor: '#f8f9fb',
        borderTop: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
    },
    stepsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem',
    },
    stepCard: {
        textAlign: 'left',
    },
    stepNumber: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#1a4a3a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
        marginBottom: '1rem',
    },
    testimonialsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem',
    },
    testimonialCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    testimonialQuote: {
        fontSize: '0.9rem',
        color: '#374151',
        lineHeight: '1.6',
        fontStyle: 'italic',
        marginBottom: '1.25rem',
    },
    testimonialAuthorRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    testimonialAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#1a4a3a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '0.875rem',
        flexShrink: 0,
    },
    testimonialName: {
        fontSize: '0.875rem',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
    },
    testimonialRole: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: 0,
    },
    ctaBanner: {
        backgroundColor: '#1a4a3a',
        padding: '4rem 2rem',
        textAlign: 'center',
    },
    ctaBannerTitle: {
        fontSize: '2rem',
        fontWeight: '800',
        color: 'white',
        marginBottom: '0.5rem',
    },
    ctaBannerSubtitle: {
        fontSize: '1rem',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: '2rem',
    },
    ctaBannerBtn: {
        backgroundColor: 'white',
        color: '#1a4a3a',
        border: 'none',
        padding: '0.875rem 2rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    footer: {
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxSizing: 'border-box',
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    footerLinks: {
        display: 'flex',
        gap: '1.5rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        cursor: 'pointer',
    },
};