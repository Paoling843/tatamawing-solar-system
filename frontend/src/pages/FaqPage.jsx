import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import FullPageMessage from '../components/FullPageMessage';
import LoadingState from '../components/LoadingState';
import { ChevronDownIcon } from '../components/Icons';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { pageHero, customerHeroTitle } from '../styles/theme';
import EngineHeader from './quote-builder/EngineHeader';
import LandingFooter from './quote-builder/LandingFooter';
import { C, s } from './quote-builder/engineStyles';
import './quote-builder/engine.css';

// FAQs (route: /faqs), open to everyone. Customers see it inside their
// account layout; visitors see it with the home page's header and footer.
export default function FaqPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
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
    const answerStyle = isCustomer ? styles.answerText : { ...styles.answerText, color: C.muted };

    const faqList = (
        <>
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.faqContainer}>
                {loading ? (
                    <div style={styles.loadingText}>Loading FAQs...</div>
                ) : error ? null : faqs.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No FAQs found</p>
                        {searchQuery && (
                            <button
                                style={styles.clearBtn}
                                onClick={handleClearSearch}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    faqs.map((faq) => {
                        const isOpen = openFaqId === faq.id;

                        return (
                            <div key={faq.id} style={styles.faqItem}>
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    style={styles.faqQuestion}
                                >
                                    <span style={styles.questionText}>
                                        {faq.question}
                                    </span>

                                    <span
                                        style={{
                                            ...styles.chevron,
                                            transform: isOpen
                                                ? 'rotate(180deg)'
                                                : 'rotate(0deg)',
                                        }}
                                    >
                                        <ChevronDownIcon
                                            size={16}
                                            color="#6b7280"
                                        />
                                    </span>
                                </button>

                                {isOpen && (
                                    <div style={styles.faqAnswer}>
                                        <p style={answerStyle}>
                                            {faq.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
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
            <div style={pageHero}>
                <h1 style={customerHeroTitle}>FAQs</h1>
            </div>

            {faqList}

            <div className="m-wrap" style={styles.footer}>
                <div style={styles.footerLeft}>
                    <span style={styles.footerText}>
                        © {new Date().getFullYear()} TataMawing Solar. All rights reserved.
                    </span>
                    <div style={styles.footerLinks}>
                        <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                        <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
                    </div>
                </div>
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
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    faqContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
        fontSize: '0.875rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
    },
    emptyTitle: {
        color: '#6b7280',
        marginBottom: '1rem',
    },
    clearBtn: {
        padding: '0.5rem 1rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    faqItem: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
    },
    faqQuestion: {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        gap: '1rem',
    },
    questionText: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#111827',
        lineHeight: '1.4',
    },
    chevron: {
        flexShrink: 0,
        transition: 'transform 0.2s ease',
        display: 'flex',
        alignItems: 'center',
    },
    faqAnswer: {
        padding: '0 1.5rem 1.25rem 1.5rem',
        borderTop: '1px solid #f3f4f6',
    },
    answerText: {
        fontSize: '0.875rem',
        color: '#16a34a',
        lineHeight: '1.6',
        margin: '1rem 0 0 0',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '1rem',
    },
    footerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    footerLinks: {
        display: 'flex',
        gap: '1rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        cursor: 'pointer',
        textDecoration: 'none',
    },
};