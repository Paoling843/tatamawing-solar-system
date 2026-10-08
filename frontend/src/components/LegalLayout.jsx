import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

// Shared page shell for the Privacy Policy and Terms of Service: a simple
// header back to the site, the document, and links between the two.
export default function LegalLayout({ title, updated, intro, children }) {
    useEffect(() => {
        document.title = `${title} · TataMawing Solar`;
        window.scrollTo(0, 0);
    }, [title]);

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <Link to="/" style={styles.brand}>
                    <span style={styles.logo}>T</span>
                    <span>TataMawing Solar</span>
                </Link>
                <nav style={styles.nav}>
                    <Link to="/privacy" style={styles.navLink}>Privacy Policy</Link>
                    <Link to="/terms" style={styles.navLink}>Terms of Service</Link>
                </nav>
            </header>

            <main style={styles.main}>
                <h1 style={styles.title}>{title}</h1>
                <p style={styles.updated}>Last updated: {updated}</p>
                {intro && <p style={styles.intro}>{intro}</p>}
                <div style={styles.body}>{children}</div>
            </main>

            <footer style={styles.footer}>
                <span>© {new Date().getFullYear()} TataMawing Solar · Bulan, Sorsogon</span>
                <Link to="/" style={styles.footerLink}>Back to home</Link>
            </footer>
        </div>
    );
}

export function Section({ title, children }) {
    return (
        <section style={styles.section}>
            <h2 style={styles.h2}>{title}</h2>
            {children}
        </section>
    );
}

// How to reach the business owner (who also runs the system). The Messenger
// link appears once the owner has saved it in the admin inbox.
export function ContactOwner() {
    const [messengerUrl, setMessengerUrl] = useState(null);

    useEffect(() => {
        api.get('/contact')
            .then((res) => setMessengerUrl(res.data.messenger_url))
            .catch(() => {});
    }, []);

    return (
        <List>
            <li>
                <strong>If you have an account:</strong> sign in and use <strong>Chat with us</strong> (bottom-right of
                your account pages). Your message goes straight to the owner.
            </li>
            {messengerUrl && (
                <li>
                    <strong>On Facebook Messenger:</strong>{' '}
                    <a href={messengerUrl} target="_blank" rel="noopener noreferrer" style={styles.inlineLink}>
                        {messengerUrl.replace(/^https:\/\//, '')}
                    </a>
                </li>
            )}
        </List>
    );
}

export function List({ children }) {
    return <ul style={styles.list}>{children}</ul>;
}

const GREEN = '#1f4d3a';

const styles = {
    page: {
        minHeight: '100vh',
        background: '#f5f5f2',
        color: '#1b2420',
        fontFamily: "'Figtree', Helvetica, Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        padding: '16px clamp(16px, 4vw, 40px)',
        background: '#fff',
        borderBottom: '1px solid #ebebe6',
    },
    brand: { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#1b2420', fontWeight: 700, fontSize: '15px' },
    logo: {
        width: '32px', height: '32px', borderRadius: '9px', background: GREEN, color: '#f3d36b',
        display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '14px',
    },
    nav: { display: 'flex', gap: '18px', flexWrap: 'wrap' },
    navLink: { color: '#4a524e', textDecoration: 'none', fontSize: '14px', fontWeight: 500 },
    main: {
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        padding: '40px 16px 56px',
        boxSizing: 'border-box',
        flex: 1,
    },
    title: { margin: 0, fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 700, letterSpacing: '-.02em' },
    updated: { margin: '8px 0 0', fontSize: '13px', color: '#7a837e' },
    intro: { margin: '20px 0 0', fontSize: '16px', lineHeight: 1.6, color: '#4a524e' },
    body: { marginTop: '28px', fontSize: '15px', lineHeight: 1.65, color: '#33403a' },
    section: {
        background: '#fff',
        border: '1px solid #e6e6e0',
        borderRadius: '14px',
        padding: '20px 22px 10px',
        marginBottom: '14px',
    },
    h2: { margin: '0 0 10px', fontSize: '17px', fontWeight: 700, color: '#1b2420' },
    list: { margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' },
    inlineLink: { color: GREEN, fontWeight: 600 },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '18px clamp(16px, 4vw, 40px)',
        borderTop: '1px solid #ebebe6',
        fontSize: '13px',
        color: '#7a837e',
        background: '#fff',
    },
    footerLink: { color: GREEN, textDecoration: 'none', fontWeight: 600 },
};
