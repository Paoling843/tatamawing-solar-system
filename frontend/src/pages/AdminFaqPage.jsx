import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminText, adminUi } from '../styles/adminTheme';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ConfirmDialog from '../components/ConfirmDialog';
import { PlusIcon, EditIcon, TrashIcon, HelpIcon } from '../components/Icons';
import api from '../api/axios';
import { errorMessage, fieldErrors } from '../utils/errorMessage';
import { colors } from '../styles/theme';

// Same limits as FaqController
const QUESTION_MAX = 255;
const ANSWER_MAX = 5000;

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
    // Save errors, shown inside the form: per field, or one general message
    const [formErrors, setFormErrors] = useState({});
    const [formError, setFormError] = useState('');


    const fetchFaqs = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const res = await api.get('/faqs');
            setFaqs(res.data);
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the FAQs. Please try again."));
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
        setFormErrors({});
        setFormError('');
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
        setFormErrors({});
        setFormError('');
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');
        setFormErrors({});
        setFormError('');

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
            // Field problems go under their field; anything else under the form
            const fields = fieldErrors(err);
            setFormErrors(fields);
            setFormError(Object.keys(fields).length ? '' : errorMessage(err, "Couldn't save the FAQ. Please try again."));
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
        } catch (err) {
            setError(errorMessage(err, "Couldn't delete the FAQ. Please try again."));
        } finally {
            setDeleting(false);
            setConfirmingFaq(null);
        }
    };

    return (
        <AdminLayout active="FAQ Management">

            {/* Page header with create button */}
            <div className="m-wrap" style={styles.pageHeader}>
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
                                maxLength={QUESTION_MAX}
                                aria-invalid={Boolean(formErrors.question)}
                                required
                            />
                            {formErrors.question && <p role="alert" style={styles.fieldError}>{formErrors.question}</p>}
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
                                maxLength={ANSWER_MAX}
                                aria-invalid={Boolean(formErrors.answer)}
                                required
                            />
                            <div style={styles.counterRow}>
                                {formErrors.answer
                                    ? <p role="alert" style={styles.fieldError}>{formErrors.answer}</p>
                                    : <span />}
                                <span style={styles.counter}>
                                    {form.answer.length.toLocaleString()} / {ANSWER_MAX.toLocaleString()}
                                </span>
                            </div>
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

                        {formError && <div role="alert" style={styles.formError}>{formError}</div>}

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
                        <div key={faq.id} className="m-pad m-wrap" style={styles.faqCard}>

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
                            <div className="m-row" style={styles.faqActions}>
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
                busy={deleting}
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
        gap: '0.75rem 1rem',
    },
    pageTitle: adminText.pageTitle,
    pageSubtitle: adminText.pageSubtitle,
    createBtn: {
        backgroundColor: '#0f3b2c',
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
        color: '#0f3b2c',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    error: adminUi.errorBanner,
    formCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '2px solid #0f3b2c',
    },
    formTitle: {
        fontSize: '1rem',
        color: '#16211c',
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
        color: '#293530',
        fontWeight: '500',
    },
    optional: {
        color: '#5d6862',
        fontWeight: 'normal',
    },
    input: {
        width: '100%',
        padding: '0.625rem',
        border: '1px solid #dcdfd8',
        borderRadius: '8px',
        fontSize: '1rem',
        boxSizing: 'border-box',
    },
    fieldError: {
        fontSize: '0.75rem',
        color: '#b42318',
        margin: '0.3rem 0 0 0',
    },
    counterRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
    },
    counter: {
        fontSize: '0.72rem',
        color: '#5d6862',
        marginTop: '0.3rem',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
    },
    formError: { ...adminUi.errorBanner, marginBottom: '1rem' },
    hint: {
        fontSize: '0.75rem',
        color: '#5d6862',
        margin: '0.25rem 0 0 0',
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        backgroundColor: 'white',
        color: '#293530',
        border: '1px solid #dcdfd8',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
    saveBtn: {
        backgroundColor: '#0f3b2c',
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
        border: '1px solid #eef0ec',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
    },
    faqContent: {
        // Takes the row on desktop; on phones the buttons drop below it
        flex: '1 1 260px',
        minWidth: 0,
    },
    faqQuestion: {
        fontSize: '1rem',
        fontWeight: '700',
        color: '#16211c',
        marginTop: 0,
        marginBottom: '0.5rem',
    },
    faqAnswer: {
        color: '#293530',
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
        color: '#5d6862',
    },
    keywordTag: {
        backgroundColor: '#f0f7f4',
        color: '#0f3b2c',
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
        color: '#0f3b2c',
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
        backgroundColor: '#fbeae7',
        color: '#a4302a',
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