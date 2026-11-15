import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import FullPageMessage from '../components/FullPageMessage';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../context/auth-context';
import { useMessagePanel } from '../context/message-panel-context';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import EngineHeader from './quote-builder/EngineHeader';
import LandingFooter from './quote-builder/LandingFooter';
import { s } from './quote-builder/engineStyles';
import './quote-builder/engine.css';

// FAQs (route: /faqs), open to everyone. Customers see it inside their
// account layout; visitors see it with the home page's header and footer.
// The question list follows the "Customer · FAQs" mockup in both.
export default function FaqPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    // The chat panel (customers only; visitors have no chat)
    const messagePanel = useMessagePanel();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openFaqId, setOpenFaqId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFaqs = useCallback(async (search = '') => {
        setLoading(true);
        setError('');
        try {
            const url = search
                ? `/faqs?search=${encodeURIComponent(search)}`
                : '/faqs';
            const res = await api.get(url);
            setFaqs(res.data);
            // The first question opens straight away, as in the mockup
            setOpenFaqId((current) => current ?? res.data[0]?.id ?? null);
        } catch (err) {
            setError(errorMessage(err, "We couldn't load the FAQs. Please try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchFaqs);
    }, [fetchFaqs]);

    // Links here can be at the bottom of a long page (the home page footer)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleClearSearch = () => {
        setSearchQuery('');
        fetchFaqs('');
    };

    const toggleFaq = (id) => {
        setOpenFaqId(openFaqId === id ? null : id);
    };

    // A saved login is still being checked, so the right layout isn't known yet
    if (authLoading) {
        return (
            <FullPageMessage>
                <LoadingState label="Connecting to the server…" />
            </FullPageMessage>
        );
    }

    const isCustomer = user?.role === 'customer';

    const faqList = (
        <>
            {error && <div role="alert" style={styles.error}>{error}</div>}

            <section style={styles.faqCard}>
                {loading ? (
                    <LoadingState label="Loading FAQs..." />
                ) : error ? null : faqs.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No FAQs found</p>
                        {searchQuery && (
                            <button type="button" className="c-btn c-btn-primary" onClick={handleClearSearch}>
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    faqs.map((faq, i) => {
                        const isOpen = openFaqId === faq.id;
                        const answerId = `faq-${faq.id}-answer`;

                        return (
                            <div key={faq.id} style={i ? styles.faqDivider : undefined}>
                                <h2 style={{ margin: 0 }}>
                                    <button
                                        type="button"
                                        className="c-card-toggle"
                                        onClick={() => toggleFaq(faq.id)}
                                        aria-expanded={isOpen}
                                        aria-controls={answerId}
                                        style={styles.faqQuestion}
                                    >
                                        {faq.question}
                                        <svg
                                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A4440" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                                            style={{ flex: 'none', transition: 'transform .15s', transform: `rotate(${isOpen ? 180 : 0}deg)` }}
                                        >
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </button>
                                </h2>

                                {isOpen && <p id={answerId} style={styles.answerText}>{faq.answer}</p>}
                            </div>
                        );
                    })
                )}
            </section>
        </>
    );

    if (!isCustomer) {
        const getStarted = () => navigate('/quotation/new');

        return (
            <div className="se-root" style={s.page}>
                <EngineHeader
                    screen="landing"
                    user={user}
                    onLogoClick={() => navigate('/')}
                    onGetStarted={getStarted}
                />
                <main className="se-page" style={styles.publicMain}>
                    <h1 className="se-h1" style={s.h1}>Frequently asked questions</h1>
                    <p style={{ ...s.lead, marginBottom: '28px' }}>
                        Answers to common questions about going solar with TataMawing.
                    </p>
                    {faqList}
                </main>
                <LandingFooter user={user} onStart={getStarted} />
            </div>
        );
    }

    return (
        <CustomerLayout active="FAQs">
            <div style={styles.page}>
                <section aria-label="Summary" style={styles.hero}>
                    <h1 style={styles.heroTitle}>FAQs</h1>
                    <p style={styles.heroSub}>Answers to common questions about going solar</p>
                </section>

                {faqList}

                {/* Opens the chat panel */}
                <div style={styles.askBox}>
                    <span>
                        <strong>Can't find your answer?</strong>{' '}
                        <span style={{ color: '#5F6A65' }}>Send us a message and we'll reply in the chat.</span>
                    </span>
                    <button type="button" className="c-btn c-btn-secondary" onClick={() => messagePanel?.openPanel?.()}>
                        Ask a question
                    </button>
                </div>

                <footer style={styles.footer}>
                    <span style={{ flex: 1 }}>© {new Date().getFullYear()} TataMawing Solar. All rights reserved.</span>
                    <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                </footer>
            </div>
        </CustomerLayout>
    );
}

const styles = {
    publicMain: {
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        padding: '48px 40px 72px',
        boxSizing: 'border-box',
        flex: 1,
    },
    page: { display: 'flex', flexDirection: 'column', gap: '20px', color: '#1B2420' },
    hero: { background: '#0F3D2E', color: '#FFFFFF', borderRadius: '8px', padding: '22px 24px 20px' },
    heroTitle: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 },
    heroSub: { margin: '2px 0 0', fontSize: '14px', color: '#C3D3CB' },
    error: {
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #F0D0CB',
        background: '#FBEAE7', color: '#A4302A', fontSize: '14px', marginBottom: '12px',
    },
    // All the questions in one card, split by thin lines
    faqCard: { background: '#FFFFFF', border: '1px solid #E3E3DE', borderRadius: '6px', overflow: 'hidden' },
    faqDivider: { borderTop: '1px solid #EFEFEA' },
    faqQuestion: {
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
        minHeight: '56px', padding: '14px 20px', border: 'none', background: 'transparent', textAlign: 'left',
        cursor: 'pointer', fontSize: '16px', fontWeight: 700, color: '#1B2420', fontFamily: 'inherit', lineHeight: 1.4,
    },
    answerText: { margin: 0, padding: '0 20px 18px', color: '#3A4440', maxWidth: '820px', fontSize: '15px', lineHeight: 1.6 },
    emptyState: { textAlign: 'center', padding: '40px 20px' },
    emptyTitle: { color: '#5F6A65', margin: '0 0 14px' },
    askBox: {
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        padding: '16px 20px', border: '1px dashed #D6D6D0', borderRadius: '6px',
    },
    footer: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 0 0', fontSize: '13px', color: '#5F6A65' },
    footerLink: { color: '#5F6A65' },
};
