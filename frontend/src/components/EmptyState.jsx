export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
    return (
        <div style={styles.container}>
            {icon && <div style={styles.iconWrap}>{icon}</div>}
            {title && <h3 style={styles.title}>{title}</h3>}
            {description && <p style={styles.description}>{description}</p>}
            {actionLabel && onAction && (
                <button className="btn-primary" style={styles.actionBtn} onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

const styles = {
    container: { textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #eef0ec'},
    iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#878f8a'},
    title: { fontSize: '1rem', fontWeight: '700', color: '#16211c', margin: '0 0 0.5rem 0' },
    description: { fontSize: '0.875rem', color: '#5d6862', margin: '0 auto', maxWidth: '360px'},
    actionBtn: { marginTop: '1.25rem', backgroundColor: '#0f3b2c', color: 'white', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600 }
};