import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function FaqPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaqId, setOpenFaqId] = useState(null);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async (search = '') => {
        setLoading(true);
        setError('');

        try {
            const url = search ? `/faqs?search=${encodeURIComponent(search)}` : '/faqs';
            const res = await api.get(url);
            setFaqs(res.data);
        } catch (err) {
            setError('Failed to load FAQs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchFaqs(searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        fetchFaqs('');
    };

    const toggleFaq = (id) => {
        setOpenFaqId(openFaqId === id ? null : id);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        // Outer container with light green background
        <div style={styles.container}>

            {/* Top navigation bar */}
            <div style={styles.navbar}>
                {/* App name */}
                <h1 style={styles.navTitle}>TataMawing Solar</h1>

                {/* Right side navigation */}
                <div style={styles.navRight}>
                    {/* Show different nav options based on login status */}
                    {user ? (
                        <>
                            {/* Show role-specific navigation for logged in users */}
                            {user.role === 'customer' && (
                                <>
                                    <button
                                        onClick={() => navigate('/quotation/new')}
                                        style={styles.navBtn}
                                    >
                                        📋 New Quotation
                                    </button>
                                    <button
                                        onClick={() => navigate('/customer/chat')}
                                        style={styles.navBtn}
                                    >
                                        💬 Chat
                                    </button>
                                </>
                            )}

                            {user.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/admin/dashboard')}
                                    style={styles.navBtn}
                                >
                                    📊 Dashboard
                                </button>
                            )}

                            {/* User name */}
                            <span style={styles.navUser}>Hello, {user.name}</span>

                            {/* Logout button */}
                            <button onClick={handleLogout} style={styles.logoutBtn}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Show login/register for guests */}
                            <button
                                onClick={() => navigate('/login')}
                                style={styles.navBtn}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                style={styles.loginBtn}
                            >
                                Register
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main content area */}
            <div style={styles.content}>

                {/* Page header */}
                <div style={styles.pageHeader}>
                    <h2 style={styles.pageTitle}>Frequently Asked Questions</h2>
                    <p style={styles.pageSubtitle}>
                        Find answers to common questions about solar installation,
                        quotations, and our services.
                    </p>
                </div>

                {/* Search form */}
                <form onSubmit={handleSearch} style={styles.searchForm}>
                    {/* Search input */}
                    <input
                        type="text"
                        // Controlled input — value reflects state
                        value={searchQuery}
                        // Update state when user types
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                        placeholder="Search FAQs..."
                    />

                    {/* Search button */}
                    <button type="submit" style={styles.searchBtn}>
                        🔍 Search
                    </button>

                    {/* Clear button — only show when there's a search query */}
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            style={styles.clearBtn}
                        >
                            ✕ Clear
                        </button>
                    )}
                </form>

                {/* Show error message if fetch failed */}
                {error && <div style={styles.error}>{error}</div>}

                {/* FAQ list */}
                {loading ? (
                    <div style={styles.loadingText}>Loading FAQs...</div>
                ) : faqs.length === 0 ? (
                    // Empty state
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>🔍</div>
                        <h3 style={styles.emptyTitle}>No FAQs Found</h3>
                        <p style={styles.emptyDesc}>
                            {searchQuery
                                ? `No results for "${searchQuery}". Try a different search term.`
                                : 'No FAQs have been added yet.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                style={styles.emptyBtn}
                            >
                                Show All FAQs
                            </button>
                        )}
                    </div>
                ) : (
                    // FAQ accordion list
                    <div style={styles.faqList}>
                        {faqs.map((faq) => (
                            <div key={faq.id} style={styles.faqItem}>

                                {/* FAQ question — clickable to expand/collapse */}
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    style={styles.faqQuestion}
                                >
                                    {/* Question text */}
                                    <span>{faq.question}</span>

                                    {/* Arrow icon that rotates when open */}
                                    <span style={{
                                        ...styles.faqArrow,
                                        // Rotate arrow when this FAQ is open
                                        transform: openFaqId === faq.id
                                            ? 'rotate(180deg)'
                                            : 'rotate(0deg)',
                                    }}>
                                        ▼
                                    </span>
                                </button>

                                {/* FAQ answer — only shown when this FAQ is open */}
                                {openFaqId === faq.id && (
                                    <div style={styles.faqAnswer}>
                                        <p style={styles.faqAnswerText}>
                                            {faq.answer}
                                        </p>

                                        {/* Show keywords if they exist */}
                                        {faq.keywords && (
                                            <div style={styles.faqKeywords}>
                                                {/* Split keywords by space and show each as a tag */}
                                                {faq.keywords.split(' ').map((keyword, index) => (
                                                    <span key={index} style={styles.keywordTag}>
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Contact prompt at the bottom */}
                <div style={styles.contactPrompt}>
                    <h3 style={styles.contactTitle}>Still have questions?</h3>
                    <p style={styles.contactDesc}>
                        Can't find the answer you're looking for?
                        Chat with our team directly.
                    </p>
                    {user?.role === 'customer' && (
                        <button
                            onClick={() => navigate('/customer/chat')}
                            style={styles.contactBtn}
                        >
                            💬 Chat with Us
                        </button>
                    )}
                    {!user && (
                        <button
                            onClick={() => navigate('/register')}
                            style={styles.contactBtn}
                        >
                            Get Started
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    // Full page light green background
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    // Green navbar
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // White app name
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    // Right side of navbar
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    // Navigation buttons
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    // White username text
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    // Login button
    loginBtn: {
        backgroundColor: 'white',
        color: '#16a34a',
        border: 'none',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    // Logout button
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    // Content area
    content: {
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    // Page header section
    pageHeader: {
        textAlign: 'center',
        marginBottom: '2rem',
    },
    // Page title
    pageTitle: {
        fontSize: '2rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    // Page subtitle
    pageSubtitle: {
        color: '#6b7280',
        fontSize: '1rem',
    },
    // Search form
    searchForm: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
    },
    // Search input
    searchInput: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: 'white',
    },
    // Search button
    searchBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    // Clear search button
    clearBtn: {
        backgroundColor: 'white',
        color: '#6b7280',
        border: '1px solid #d1d5db',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
    },
    // Red error box
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    // Loading text
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    // Empty state
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // Empty state icon
    emptyIcon: {
        fontSize: '2.5rem',
        marginBottom: '1rem',
    },
    // Empty state title
    emptyTitle: {
        fontSize: '1.25rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    // Empty state description
    emptyDesc: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Empty state button
    emptyBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
    // FAQ accordion list
    faqList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '2rem',
    },
    // Individual FAQ item
    faqItem: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    // FAQ question button
    faqQuestion: {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        color: '#111827',
        fontWeight: '500',
        textAlign: 'left',
        gap: '1rem',
    },
    // Arrow icon in question button
    faqArrow: {
        fontSize: '0.75rem',
        color: '#6b7280',
        // Smooth rotation animation when opening/closing
        transition: 'transform 0.2s ease',
        flexShrink: 0,
    },
    // FAQ answer section
    faqAnswer: {
        padding: '0 1.5rem 1.25rem 1.5rem',
        borderTop: '1px solid #f3f4f6',
    },
    // Answer text
    faqAnswerText: {
        color: '#374151',
        lineHeight: '1.6',
        margin: '1rem 0 0.75rem 0',
    },
    // Keywords container
    faqKeywords: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '0.75rem',
    },
    // Individual keyword tag
    keywordTag: {
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
    },
    // Contact prompt at the bottom
    contactPrompt: {
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    // Contact prompt title
    contactTitle: {
        fontSize: '1.25rem',
        color: '#111827',
        marginBottom: '0.5rem',
    },
    // Contact prompt description
    contactDesc: {
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    // Contact button
    contactBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
};