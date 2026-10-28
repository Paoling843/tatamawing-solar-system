import { colors } from '../styles/theme';

// A centered card that takes the whole page: used while the saved login is
// checked, when the server can't be reached, for pages of the wrong
// account type, and when a page crashes (ErrorBoundary).
// actions: [{ label, onClick, primary }]
export default function FullPageMessage({ icon, title, description, actions = [], children }) {
    return (
        <div style={styles.page}>
            <div role="alert" style={styles.card}>
                {icon && <div style={styles.icon}>{icon}</div>}
                {title && <h1 style={styles.title}>{title}</h1>}
                {description && <p style={styles.description}>{description}</p>}
                {children}
                {actions.length > 0 && (
                    <div style={styles.actions}>
                        {actions.map(({ label, onClick, primary }) => (
                            <button
                                key={label}
                                type="button"
                                className={primary ? 'btn-primary' : 'btn-secondary'}
                                style={primary ? styles.primaryBtn : styles.secondaryBtn}
                                onClick={onClick}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const button = {
    padding: '0.625rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
};

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: colors.bgPage,
    },
    card: {
        width: '100%',
        maxWidth: '440px',
        backgroundColor: colors.bgCard,
        border: '1px solid #eef0ec',
        borderRadius: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
    },
    icon: { display: 'flex', justifyContent: 'center', marginBottom: '1rem' },
    title: { fontSize: '1.15rem', fontWeight: 700, color: '#16211c', margin: '0 0 0.5rem 0' },
    description: { fontSize: '0.9rem', lineHeight: 1.55, color: '#5d6862', margin: 0 },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.75rem',
        marginTop: '1.5rem',
    },
    primaryBtn: { ...button, backgroundColor: '#0f3b2c', color: 'white', border: 'none' },
    secondaryBtn: { ...button, backgroundColor: 'white', color: '#293530', border: '1px solid #e6e8e2' },
};
