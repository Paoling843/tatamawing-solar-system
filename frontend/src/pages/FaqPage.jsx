import { useState, useEffect, useCallback } from 'react';
import CustomerLayout from '../components/CustomerLayout';
import { ChevronDownIcon } from '../components/Icons';
import api from '../api/axios';

export default function FaqPage() {
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
        } catch {
            setError('Failed to load FAQs. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchFaqs);
    }, [fetchFaqs]);

    const handleClearSearch = () => {
        setSearchQuery('');
        fetchFaqs('');
    };

    const toggleFaq = (id) => {
        setOpenFaqId(openFaqId === id ? null : id);
    };

    return (
        <CustomerLayout active="FAQs">
            <h1 style={styles.pageTitle}>FAQs</h1>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.faqContainer}>
                {loading ? (
                    <div style={styles.loadingText}>Loading FAQs...</div>
                ) : faqs.length === 0 ? (
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
                                        <p style={styles.answerText}>
                                            {faq.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div style={styles.footer}>
                <div style={styles.footerLeft}>
                    <span style={styles.footerText}>
                        © 2024 TataMawing Solar. All rights reserved.
                    </span>
                    <div style={styles.footerLinks}>
                        <span style={styles.footerLink}>Privacy Policy</span>
                        <span style={styles.footerLink}>Terms of Service</span>
                        <span style={styles.footerLink}>Sustainability Report</span>
                    </div>
                </div>
                <div style={styles.systemStatus}>
                    <div style={styles.statusDot} />
                    <span style={styles.statusText}>All Nodes Active</span>
                </div>
            </div>
        </CustomerLayout>
    );
}

const styles = {
    pageTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '1.5rem',
        marginTop: 0,
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
    },
    systemStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
    },
    statusText: {
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
    },
};