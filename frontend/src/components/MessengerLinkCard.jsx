// The "Chat on Messenger" card (chat message type `messenger_link`). The
// admin sends it by hand from the inbox, or the slow-response fallback sends
// it when a customer has waited too long. Shown in the admin inbox (on the
// right, as the admin's message) and in the customer's support chat.
//   url      the admin's Messenger link (saved on the message)
//   caption  small text under the card, e.g. "Auto-sent after 10 min without reply · 9:51 AM"
//   mine     true in the admin's inbox (right side), false for the customer
export default function MessengerLinkCard({ url, caption, mine }) {
    return (
        <div style={{ ...styles.wrap, alignSelf: mine ? 'flex-end' : 'flex-start', alignItems: mine ? 'flex-end' : 'flex-start' }}>
            <div style={{ ...styles.card, borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }}>
                <div style={styles.body}>
                    <span style={styles.title}>Is our response taking too long?</span>
                    <span style={styles.text}>
                        Sorry for the wait. You can reach our admin directly on Messenger for a faster reply.
                    </span>
                </div>
                {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={styles.button}>
                        <MessengerIcon />
                        Chat on Messenger
                    </a>
                ) : (
                    <span style={{ ...styles.button, background: '#a9bab0' }}>Messenger link unavailable</span>
                )}
            </div>
            {caption && <span style={styles.caption}>{caption}</span>}
        </div>
    );
}

export function MessengerIcon({ size = 15 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87a.8.8 0 0 1 .53-.04c.91.25 1.87.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63z" />
        </svg>
    );
}

const styles = {
    wrap: { maxWidth: 'min(85%, 340px)', display: 'flex', flexDirection: 'column', gap: '3px' },
    card: {
        background: '#fff', border: '1px solid #d6e2da', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
    },
    body: { padding: '11px 14px 10px', display: 'flex', flexDirection: 'column', gap: '4px' },
    title: { fontSize: '14px', fontWeight: 600, color: '#1b2420' },
    text: { fontSize: '13px', lineHeight: 1.45, color: '#4a524e', textWrap: 'pretty' },
    button: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '10px 14px', background: '#1f4d3a', color: '#fff',
        fontSize: '13px', fontWeight: 600, textDecoration: 'none',
    },
    caption: { fontSize: '11px', color: '#9aa19c' },
};
