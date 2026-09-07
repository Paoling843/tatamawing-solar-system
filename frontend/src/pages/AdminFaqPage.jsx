import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ConfirmDialog from '../components/ConfirmDialog';
import { PlusIcon, EditIcon, TrashIcon, HelpIcon } from '../components/Icons';
import api from '../api/axios';
import { colors, typography } from '../styles/theme';

export default function AdminFaqPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [confirmingFaq, setConfirmingFaq] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [form, setForm] = useState({
        question: '',
        answer: '',
        keywords: '',
    });

    const [formLoading, setFormLoading] = useState(false);


    const fetchFaqs = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/faqs');
            setFaqs(res.data);
        } catch {
            setError('Failed to load FAQs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start the fetch in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchFaqs);
    }, [fetchFaqs]);

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

    const handleDeleteClick = (faq) => {
        setConfirmingFaq(faq);
    };

    const confirmDelete = async () => {
        if (!confirmingFaq) return;

        setDeleting(true);
        setError('');
        setSuccess('');

        try {
            await api.delete(`/admin/faqs/${confirmingFaq.id}`);
            setSuccess('FAQ deleted successfully.');
            fetchFaqs();
        } catch {
            setError('Failed to delete FAQ.');
        } finally {
            setDeleting(false);
            setConfirmingFaq(null);
        }
    };

    return (
        <AdminLayout active="Help Center">

            {/* Page header with create button */}
            <div style={styles.pageHeader}>
                <div>
                    <h1 style={styles.pageTitle}>FAQ Management</h1>
                    <p style={styles.pageSubtitle}>
                        Manage frequently asked questions visible to customers.
                    </p>
                </div>

                {/* Create new FAQ button */}
                <button
                    onClick={handleOpenCreate}
                    className="btn-primary"
                    style={styles.createBtn}
                >
                    <PlusIcon size={14} color="white" />
                    <span>Add New FAQ</span>
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
                                className="input-field"
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
                                className="input-field"
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
                                className="input-field"
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
                                className="btn-secondary"
                                style={styles.cancelBtn}
                            >
                                Cancel
                            </button>

                            {/* Save button */}
                            <button
                                type="submit"
                                className="btn-primary"
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
                <LoadingState label="Loading FAQs..." />
            ) : faqs.length === 0 ? (
                <EmptyState
                    icon={<HelpIcon size={32} color={colors.textFaint} />}
                    title="No FAQs yet"
                    description="Create your first FAQ so customers can find answers without contacting support."
                    actionLabel="Add New FAQ"
                    onAction={handleOpenCreate}
                />
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
                                    className="btn-secondary"
                                    style={styles.editBtn}
                                >
                                    <EditIcon size={14} />
                                    <span>Edit</span>
                                </button>

                                {/* Delete button */}
                                <button
                                    onClick={() => handleDeleteClick(faq)}
                                    className="btn-danger"
                                    style={styles.deleteBtn}
                                >
                                    <TrashIcon size={14} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!confirmingFaq}
                title="Delete FAQ"
                message={confirmingFaq ? `Are you sure you want to delete "${confirmingFaq.question}"? This action cannot be undone.` : ''}
                confirmLabel={deleting ? 'Deleting...' : 'Delete'}
                danger
                onConfirm={confirmDelete}
                onCancel={() => setConfirmingFaq(null)}
            />
        </AdminLayout>
    );
}

// Styles
const styles = {
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
    },
    pageTitle: {
        ...typography.h1,
        marginBottom: '0.25rem',
    },
    pageSubtitle: {
        fontSize: '0.875rem',
        color: colors.textMuted,
        margin: 0,
    },
    createBtn: {
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.25rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    success: {
        backgroundColor: '#f0f7f4',
        color: '#1a4a3a',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '2px solid #1a4a3a',
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
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    faqList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    faqCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
    },
    faqContent: {
        flex: 1,
    },
    faqQuestion: {
        fontSize: '1rem',
        fontWeight: '700',
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
        backgroundColor: '#f0f7f4',
        color: '#1a4a3a',
        border: '1px solid #dbe7e1',
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
        backgroundColor: '#f0f7f4',
        color: '#1a4a3a',
        border: '1px solid #dbe7e1',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
    deleteBtn: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
    },
};