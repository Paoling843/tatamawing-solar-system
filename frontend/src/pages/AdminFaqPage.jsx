import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminFaqPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    
    const [form, setForm] = useState({
        question: '',
        answer: '',
        keywords: '',
    });

    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/faqs');
            setFaqs(res.data);
        } catch (err) {
            setError('Failed to load FAQs.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setForm({question: '', answer:'', keywords: ''});
        setEditingFaq(null);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    const handleOpenEdit = (faq) => {
        setForm({
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords || '',
        });

        setEditingFaq(faq);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');

        try {
            if (editingFaq) {
                await api.put(`/admin/faqs/${editingFaq.id}`, form);
                setSuccess('FAQ updated successfully.');
            } else {
                await api.post('/admin/faqs', form);
                setSuccess('FAQ created successfully.')
            }

             setShowForm(false);
             fetchFaqs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save FAQ.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (faq) => {
        if (!window.confirm(`Are you sure you want to delete this FAQ?\n\n"${faq.question}"`)) {
            return;
        }

        setError('');
        setSuccess('');

        try {
            await api.delete(`/admin/faqs/${faq.id}`);
            setSuccess('FAQ deleted successfully.');
            fetchFaqs();
        } catch (err) {
            setError('Failed to delete FAQ.');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };


    return (
        // Outer container
        <div style={styles.container}>

            {/* Navbar */}
            <div style={styles.navbar}>
                <h1 style={styles.navTitle}>TataMawing Solar</h1>
                <div style={styles.navRight}>
                    {/* Link to admin dashboard */}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        style={styles.navBtn}
                    >
                        📋 Quotations
                    </button>
                    {/* Link to admin inbox */}
                    <button
                        onClick={() => navigate('/admin/inbox')}
                        style={styles.navBtn}
                    >
                        💬 Messages
                    </button>
                    <span style={styles.navRole}>Admin</span>
                    <span style={styles.navUser}>Hello, {user?.name}</span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.content}>

                {/* Page header with create button */}
                <div style={styles.pageHeader}>
                    <div>
                        <h2 style={styles.pageTitle}>FAQ Management</h2>
                        <p style={styles.pageSubtitle}>
                            Manage frequently asked questions visible to customers.
                        </p>
                    </div>

                    {/* Create new FAQ button */}
                    <button
                        onClick={handleOpenCreate}
                        style={styles.createBtn}
                    >
                        + Add New FAQ
                    </button>
                </div>

                {/* Success message */}
                {success && <div style={styles.success}>{success}</div>}

                {/* Error message */}
                {error && <div style={styles.error}>{error}</div>}

                {/* Create/Edit form — shown when showForm is true */}
                {showForm && (
                    <div style={styles.formCard}>
                        <h3 style={styles.formTitle}>
                            {/* Show different title based on create or edit */}
                            {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            {/* Question input */}
                            <div style={styles.field}>
                                <label style={styles.label}>Question</label>
                                <input
                                    type="text"
                                    value={form.question}
                                    onChange={(e) => setForm({
                                        ...form, question: e.target.value
                                    })}
                                    style={styles.input}
                                    placeholder="e.g. How long does installation take?"
                                    required
                                />
                            </div>

                            {/* Answer textarea */}
                            <div style={styles.field}>
                                <label style={styles.label}>Answer</label>
                                <textarea
                                    value={form.answer}
                                    onChange={(e) => setForm({
                                        ...form, answer: e.target.value
                                    })}
                                    style={{
                                        ...styles.input,
                                        // Make textarea taller than regular inputs
                                        height: '120px',
                                        resize: 'vertical',
                                    }}
                                    placeholder="Type the answer here..."
                                    required
                                />
                            </div>

                            {/* Keywords input */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Keywords
                                    <span style={styles.optional}> (optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.keywords}
                                    onChange={(e) => setForm({
                                        ...form, keywords: e.target.value
                                    })}
                                    style={styles.input}
                                    placeholder="e.g. installation time duration days"
                                />
                                <p style={styles.hint}>
                                    Separate keywords with spaces. Used to improve search.
                                </p>
                            </div>

                            {/* Form buttons */}
                            <div style={styles.formActions}>
                                {/* Cancel button */}
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={styles.cancelBtn}
                                >
                                    Cancel
                                </button>

                                {/* Save button */}
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.saveBtn,
                                        opacity: formLoading ? 0.7 : 1,
                                        cursor: formLoading ? 'not-allowed' : 'pointer',
                                    }}
                                    {...(formLoading ? { disabled: true } : {})}
                                >
                                    {formLoading
                                        ? 'Saving...'
                                        : editingFaq ? 'Save Changes' : 'Create FAQ'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* FAQ list */}
                {loading ? (
                    <div style={styles.loadingText}>Loading FAQs...</div>
                ) : faqs.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📝</div>
                        <p style={styles.emptyText}>
                            No FAQs yet. Click "Add New FAQ" to create one.
                        </p>
                    </div>
                ) : (
                    // One card per FAQ
                    <div style={styles.faqList}>
                        {faqs.map((faq) => (
                            <div key={faq.id} style={styles.faqCard}>

                                {/* FAQ content */}
                                <div style={styles.faqContent}>
                                    {/* Question */}
                                    <h3 style={styles.faqQuestion}>
                                        {faq.question}
                                    </h3>

                                    {/* Answer */}
                                    <p style={styles.faqAnswer}>{faq.answer}</p>

                                    {/* Keywords if present */}
                                    {faq.keywords && (
                                        <div style={styles.keywordsRow}>
                                            <span style={styles.keywordsLabel}>
                                                Keywords:
                                            </span>
                                            {faq.keywords.split(' ').map((kw, i) => (
                                                <span key={i} style={styles.keywordTag}>
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div style={styles.faqActions}>
                                    {/* Edit button */}
                                    <button
                                        onClick={() => handleOpenEdit(faq)}
                                        style={styles.editBtn}
                                    >
                                        ✏️ Edit
                                    </button>

                                    {/* Delete button */}
                                    <button
                                        onClick={() => handleDelete(faq)}
                                        style={styles.deleteBtn}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0fdf4',
        width: '100%',
    },
    navbar: {
        backgroundColor: '#16a34a',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navTitle: {
        color: 'white',
        fontSize: '1.25rem',
        margin: 0,
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    navRole: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    navUser: {
        color: 'white',
        fontSize: '0.875rem',
    },
    logoutBtn: {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    content: {
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem',
        boxSizing: 'border-box',
    },
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
    },
    pageTitle: {
        fontSize: '1.5rem',
        color: '#111827',
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        color: '#6b7280',
        margin: 0,
    },
    createBtn: {
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
    success: {
        backgroundColor: '#dcfce7',
        color: '#16a34a',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '2px solid #16a34a',
    },
    formTitle: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
        marginBottom: '1.5rem',
    },
    field: {
        marginBottom: '1rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
    },
    optional: {
        color: '#9ca3af',
        fontWeight: 'normal',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    hint: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        margin: '0.25rem 0 0 0',
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        backgroundColor: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    saveBtn: {
        backgroundColor: '#16a34a',
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: '3rem',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
    emptyIcon: {
        fontSize: '2.5rem',
        marginBottom: '0.5rem',
    },
    emptyText: {
        color: '#6b7280',
    },
    faqList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    faqCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
    },
    faqContent: {
        flex: 1,
    },
    faqQuestion: {
        fontSize: '1rem',
        color: '#111827',
        marginTop: 0,
        marginBottom: '0.5rem',
    },
    faqAnswer: {
        color: '#374151',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        margin: '0 0 0.75rem 0',
    },
    keywordsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
    },
    keywordsLabel: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    keywordTag: {
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
    },
    faqActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flexShrink: 0,
    },
    editBtn: {
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
    },
    deleteBtn: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
    },
};