export default function LoadingState({ label = 'Loading...' }) {
    return (
        <div style={styles.container}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
            <div style={styles.spinner} />
            <span style={styles.label}>{label}</span>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem', color: '#6b7280' },
    spinner: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '3px solid #e5e7eb',
        borderTopColor: '#1a4a3a',
        animation: 'spin 0.7s linear infinite', 
    },
    label: { fontSize: '0.875rem' },
};