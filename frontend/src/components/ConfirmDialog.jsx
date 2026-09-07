export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div style={styles.overlay} onClick={onCancel}>
            <div style={styles.card} onClick={(e) => e.stopPropagation()}>
                <h3 style={styles.title}>{title}</h3>
                {message && <p style={styles.message}>{message}</p>}
                <div style={styles.actions}>
                    <button className="btn-secondary" style={styles.cancelBtn} onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button
                        className={danger ? 'btn-danger' : 'btn-primary'}
                        style={danger ? styles.confirmBtnDanger : styles.confirmBtn}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem',
    },
    card: {
        backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    },
    title: { fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0' },
    message: { fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem 0', lineHeight: 1.5 },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
    cancelBtn: { backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '0.625rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600 },
    confirmBtn: { backgroundColor: '#1a4a3a', color: 'white', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600 },
    confirmBtnDanger: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600 },
};