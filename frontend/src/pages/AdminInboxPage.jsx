import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import MessengerLinkCard from '../components/MessengerLinkCard';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';

// Admin Messages — conversations | thread | details (customer, linked
// request, and the slow-response fallback that sends a "Chat on Messenger"
// card when a customer has waited too long). Layout from
// "Admin inbox redesign/Admin Inbox.dc.html".

const T = {
    green: '#1f4d3a',
    greenDark: '#163a2b',
    greenPale: '#a9bab0',
    selected: '#eef3ef',
    ink: '#1b2420',
    body: '#4a524e',
    muted: '#7a837e',
    faint: '#9aa19c',
    border: '#e6e6e0',
    line: '#efefea',
    soft: '#f5f5f2',
    threadBg: '#fafaf8',
};

const AVATAR_COLORS = [
    ['#e3ecfb', '#2f5fb8'],
    ['#f6e8dc', '#9a5426'],
    ['#e4efe7', '#1f4d3a'],
    ['#f3e3f1', '#8a3f7f'],
    ['#fdf1d6', '#8a6210'],
];

const STATUS = {
    New: ['#fdf1d6', '#8a6210'],
    Quoted: ['#e3ecfb', '#2f5fb8'],
    Scheduled: ['#e4efe7', '#1f4d3a'],
    Rejected: ['#fbe4e1', '#b4483a'],
};

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'new', label: 'New leads' },
];

const DELAYS = [5, 10, 15, 30];

// The details panel starts hidden below this width (as in the design)
const NARROW = '(max-width: 1240px)';

// Same reference format as the Quotations page
const formatReference = (id, createdAt) =>
    `#Q-${new Date(createdAt).getFullYear()}-${String(id).padStart(3, '0')}`;

const initialsOf = (name) =>
    (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const avatarColors = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

const isSameDay = (a, b) => a.toDateString() === b.toDateString();

const formatClock = (date) =>
    new Date(date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

// List time: "9:41 AM" today, "Yesterday", or "Oct 3"
const formatListTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, now)) return formatClock(d);
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Thread separators: TODAY, YESTERDAY, or OCT 3, 2026
const formatDayLabel = (date) => {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, now)) return 'TODAY';
    if (isSameDay(d, yesterday)) return 'YESTERDAY';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
};

// What the inbox shows about a conversation's customer and linked request
const describe = (conversation) => {
    const request = conversation.linked_request;
    const customer = conversation.user.customer;

    let status = null;
    if (request) {
        if (request.status === 'rejected') status = 'Rejected';
        else if (request.has_schedule) status = 'Scheduled';
        else if (request.status === 'approved') status = 'Quoted';
        else status = 'New';
    }

    const location = request?.install_barangay
        ? `${request.install_barangay}, ${request.install_municipality || 'Bulan'}`
        : customer?.install_location || customer?.address || 'Location not given';

    let system = null;
    if (request) {
        const parts = [];
        if (request.system_kw) parts.push(`${Number(request.system_kw.toFixed(2))} kW ${request.solar_system_type || ''}`.trim());
        else if (request.solar_system_type) parts.push(request.solar_system_type);
        if (request.panel_count) parts.push(`${request.panel_count} panels`);
        system = parts.join(' · ') || null;
    }

    return {
        reference: request ? formatReference(request.id, request.created_at) : null,
        status,
        location,
        system,
        email: conversation.user.email,
        phone: customer?.contact_number || '—',
    };
};

export default function AdminInboxPage() {
    const { user } = useAuth();

    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [showDetails, setShowDetails] = useState(() => !window.matchMedia(NARROW).matches);

    const [settings, setSettings] = useState(null);
    const [urlDraft, setUrlDraft] = useState('');
    const [settingsError, setSettingsError] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    const threadRef = useRef(null);

    // Hide the details panel on narrower screens, show it on wide ones
    useEffect(() => {
        const mq = window.matchMedia(NARROW);
        const onChange = () => setShowDetails(!mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/conversations');
            setConversations(res.data);
        } catch {
            // Polling refresh — keep the list we already have
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    const fetchMessages = useCallback(async (userId) => {
        try {
            const res = await api.get(`/messages/${userId}`);
            setMessages(res.data);
        } catch {
            // Polling refresh — keep the thread we already have
        }
    }, []);

    useEffect(() => {
        // Start the first load in a microtask so its state updates land after
        // this effect returns rather than cascading a render inside it
        Promise.resolve().then(fetchConversations);
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (!selectedUserId) return;

        Promise.resolve().then(() => fetchMessages(selectedUserId));
        const interval = setInterval(() => fetchMessages(selectedUserId), 5000);
        return () => clearInterval(interval);
    }, [selectedUserId, fetchMessages]);

    useEffect(() => {
        api.get('/admin/inbox-settings')
            .then((res) => {
                setSettings(res.data);
                setUrlDraft(res.data.messenger_url || '');
            })
            .catch(() => {});
    }, []);

    // Keep the newest message in view (scrolls the thread only, not the page)
    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, selectedUserId]);

    const selectConversation = (conversation) => {
        setSelectedUserId(conversation.user.id);
        setMessages([]);
        setDraft('');
        setSendError('');
        // Opening the thread marks it read on the server; reflect it right away
        setConversations((list) => list.map((c) => (c.user.id === conversation.user.id ? { ...c, unread_count: 0 } : c)));
    };

    const send = async (payload) => {
        if (sending || !selectedUserId) return;
        setSending(true);
        setSendError('');
        try {
            const res = await api.post('/messages', { receiver_id: selectedUserId, ...payload });
            setMessages((prev) => [...prev, res.data.chat_message]);
            if (payload.message) setDraft('');
            fetchConversations();
        } catch (err) {
            // The composer keeps its text
            setSendError(err.response?.data?.message || 'The message could not be sent. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const sendDraft = (e) => {
        e?.preventDefault();
        if (!draft.trim()) return;
        send({ message: draft.trim() });
    };

    const saveSettings = async (changes) => {
        setSavingSettings(true);
        setSettingsError('');
        try {
            const res = await api.put('/admin/inbox-settings', changes);
            setSettings(res.data);
            setUrlDraft(res.data.messenger_url || '');
        } catch (err) {
            const errors = err.response?.data?.errors;
            setSettingsError(
                errors?.messenger_url?.[0] || errors?.fallback_delay_minutes?.[0]
                || err.response?.data?.message || 'Could not save. Please try again.'
            );
        } finally {
            setSavingSettings(false);
        }
    };

    const saveUrl = () => {
        const url = urlDraft.trim();
        if (url === (settings?.messenger_url || '')) return;
        saveSettings({ messenger_url: url || null });
    };

    // ----- derived -----
    const unreadConversations = conversations.filter((c) => c.unread_count > 0).length;
    const summary = loadingConversations
        ? 'Loading conversations…'
        : unreadConversations
            ? `${unreadConversations} unread · ${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
            : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'} · all caught up`;

    const q = query.trim().toLowerCase();
    const visible = conversations.filter((c) => {
        if (filter === 'unread' && !c.unread_count) return false;
        if (filter === 'new' && c.linked_request?.status !== 'pending') return false;
        if (!q) return true;
        const info = describe(c);
        return `${c.user.name} ${info.reference || ''} ${info.location}`.toLowerCase().includes(q);
    });

    const current = conversations.find((c) => c.user.id === selectedUserId) || null;
    const info = current ? describe(current) : null;
    const firstName = current?.user.name?.split(' ')[0] || '';
    const messengerUrl = settings?.messenger_url || '';

    const quickReplies = [
        {
            label: 'Send quotation',
            text: info?.reference
                ? `Hi ${firstName}, your quotation ${info.reference} is ready. You can view it under My Quotations.`
                : `Hi ${firstName}, your quotation is ready. You can view it under My Quotations.`,
        },
        { label: 'Schedule site visit', text: 'We can do a site visit this week. What day works for you?' },
        { label: 'Request roof photos', text: 'Could you send a few photos of your roof and electric meter?' },
    ];

    const days = [];
    messages.forEach((message) => {
        const key = new Date(message.created_at).toDateString();
        const last = days[days.length - 1];
        if (last?.key === key) last.messages.push(message);
        else days.push({ key, label: formatDayLabel(message.created_at), messages: [message] });
    });

    const columns = showDetails && current
        ? 'minmax(220px, 300px) minmax(360px, 1fr) minmax(220px, 280px)'
        : 'minmax(220px, 300px) minmax(360px, 1fr)';

    return (
        <AdminLayout active="Messages">
            <header style={styles.header}>
                <h1 style={styles.title}>Messages</h1>
                <span style={styles.summary}>{summary}</span>
            </header>

            <section className="inbox-card" style={{ ...styles.card, gridTemplateColumns: columns }}>
                {/* ---------- Conversations ---------- */}
                <div className="inbox-list" style={styles.listCol}>
                    <div style={styles.listTop}>
                        <div style={styles.search}>
                            <SearchGlyph />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search conversations"
                                aria-label="Search conversations"
                                style={styles.searchInput}
                            />
                        </div>
                        <Segmented
                            options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
                            value={filter}
                            onChange={setFilter}
                            padding="6px 0"
                        />
                    </div>

                    <div style={styles.list}>
                        {loadingConversations ? (
                            <div style={styles.listEmpty}>Loading…</div>
                        ) : visible.length === 0 ? (
                            <div style={styles.listEmpty}>
                                {conversations.length === 0 ? 'No conversations yet.' : 'No conversations match.'}
                            </div>
                        ) : (
                            visible.map((c) => {
                                const d = describe(c);
                                const unread = c.unread_count > 0;
                                const on = c.user.id === selectedUserId;
                                const preview = c.latest_type === 'messenger_link'
                                    ? 'Sent Messenger link'
                                    : `${c.latest_from_admin ? 'You: ' : ''}${c.latest_message || ''}`;
                                return (
                                    <button
                                        key={c.user.id}
                                        type="button"
                                        onClick={() => selectConversation(c)}
                                        style={{ ...styles.row, background: on ? T.selected : 'transparent' }}
                                    >
                                        <Avatar id={c.user.id} name={c.user.name} />
                                        <div style={styles.rowText}>
                                            <div style={styles.rowLine}>
                                                <span style={{ ...styles.rowName, fontWeight: unread ? 700 : 500 }}>{c.user.name}</span>
                                                <span style={styles.rowTime}>{c.latest_time ? formatListTime(c.latest_time) : ''}</span>
                                            </div>
                                            <div style={styles.rowLine}>
                                                <span style={{ ...styles.rowPreview, color: unread ? T.ink : T.muted }}>{preview}</span>
                                                {unread && <span style={styles.unreadPill}>{c.unread_count}</span>}
                                            </div>
                                            <span style={styles.rowRef}>{d.reference || 'No quotation yet'}</span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ---------- Thread ---------- */}
                <div className="inbox-thread" style={styles.threadCol}>
                    {current ? (
                        <>
                            <div style={styles.threadHeader}>
                                <Avatar id={current.user.id} name={current.user.name} />
                                <div style={styles.threadWho}>
                                    <span style={styles.threadName}>{current.user.name}</span>
                                    <span style={styles.threadSub}>
                                        {info.location}{info.reference ? ` · ${info.reference}` : ''}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setShowDetails((v) => !v)} style={styles.detailsBtn}>
                                    {showDetails ? 'Hide details' : 'Details'}
                                </button>
                            </div>

                            <div ref={threadRef} style={styles.thread}>
                                {messages.length === 0 ? (
                                    <div style={styles.threadEmpty}>Loading messages…</div>
                                ) : (
                                    days.map((day) => (
                                        <div key={day.key} style={styles.day}>
                                            <div style={styles.dayLabel}>{day.label}</div>
                                            {day.messages.map((m) => {
                                                const mine = m.sender_id === user?.id;
                                                if (m.type === 'messenger_link') {
                                                    const who = m.meta?.auto
                                                        ? `Auto-sent after ${m.meta.after_minutes} min without reply`
                                                        : mine ? 'Sent by you' : 'Sent by an admin';
                                                    return (
                                                        <MessengerLinkCard
                                                            key={m.id}
                                                            mine
                                                            url={m.meta?.url}
                                                            caption={`${who} · ${formatClock(m.created_at)}`}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={m.id}
                                                        style={{
                                                            ...styles.bubbleWrap,
                                                            alignSelf: mine ? 'flex-end' : 'flex-start',
                                                            alignItems: mine ? 'flex-end' : 'flex-start',
                                                        }}
                                                    >
                                                        <div style={mine ? styles.bubbleMine : styles.bubbleTheirs}>{m.message}</div>
                                                        <span style={styles.bubbleTime}>{formatClock(m.created_at)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={sendDraft} style={styles.composer}>
                                <div style={styles.chips}>
                                    {quickReplies.map((r) => (
                                        <button key={r.label} type="button" onClick={() => setDraft(r.text)} style={styles.chip}>
                                            {r.label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => send({ type: 'messenger_link' })}
                                        disabled={!messengerUrl || sending}
                                        title={messengerUrl ? 'Send the "Chat on Messenger" card' : 'Add your Messenger link in Details first'}
                                        style={{ ...styles.chip, opacity: messengerUrl ? 1 : 0.5, cursor: messengerUrl ? 'pointer' : 'not-allowed' }}
                                    >
                                        Send Messenger link
                                    </button>
                                </div>
                                {sendError && <div style={styles.error}>{sendError}</div>}
                                <div style={styles.inputRow}>
                                    <input
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={`Reply to ${current.user.name}`}
                                        aria-label={`Reply to ${current.user.name}`}
                                        maxLength={1000}
                                        style={styles.input}
                                    />
                                    <button
                                        type="submit"
                                        title="Send"
                                        disabled={!draft.trim() || sending}
                                        style={{
                                            ...styles.sendBtn,
                                            background: draft.trim() && !sending ? T.green : T.greenPale,
                                            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        {sending ? 'Sending…' : 'Send'}
                                        <SendGlyph />
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div style={styles.noSelection}>Select a conversation to start messaging</div>
                    )}
                </div>

                {/* ---------- Details ---------- */}
                {showDetails && current && (
                    <aside className="inbox-details" style={styles.detailsCol}>
                        <div style={styles.section}>
                            <span style={styles.sectionLabel}>CUSTOMER</span>
                            <div style={styles.facts}>
                                <span style={styles.factKey}>Email</span>
                                <span style={styles.factValue} title={info.email}>{info.email}</span>
                                <span style={styles.factKey}>Phone</span>
                                <span style={styles.factValue}>{info.phone}</span>
                                <span style={styles.factKey}>Location</span>
                                <span style={styles.factValue}>{info.location}</span>
                            </div>
                        </div>

                        <div style={styles.section}>
                            <span style={styles.sectionLabel}>LINKED REQUEST</span>
                            {current.linked_request ? (
                                <div style={styles.requestCard}>
                                    <div style={styles.requestTop}>
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{info.reference}</span>
                                        <span style={{ ...styles.statusPill, background: STATUS[info.status][0], color: STATUS[info.status][1] }}>
                                            {info.status}
                                        </span>
                                    </div>
                                    {info.system && <span style={{ fontSize: '13px', color: T.body }}>{info.system}</span>}
                                    <Link to={`/admin/quotation-requests/${current.linked_request.id}`} style={styles.openLink}>
                                        Open quotation →
                                    </Link>
                                </div>
                            ) : (
                                <span style={styles.note}>This customer hasn't requested a quotation yet.</span>
                            )}
                        </div>

                        <div style={styles.section}>
                            <div style={styles.fallbackTop}>
                                <span style={styles.sectionLabel}>SLOW-RESPONSE FALLBACK</span>
                                <Toggle
                                    on={Boolean(settings?.fallback_enabled)}
                                    disabled={!settings || savingSettings}
                                    onChange={(on) => saveSettings({ fallback_enabled: on })}
                                />
                            </div>
                            <span style={styles.note}>
                                {settings?.fallback_enabled
                                    ? `If a customer waits ${settings.fallback_delay_minutes} minutes without a reply, they're asked if it's taking too long and given a link to your Messenger.`
                                    : messengerUrl
                                        ? 'Off. Customers won’t be offered a Messenger link automatically.'
                                        : 'Off. Add your Messenger link below, then turn this on.'}
                            </span>

                            <div style={styles.settingBlock}>
                                <span style={styles.settingLabel}>Send after no reply for</span>
                                <Segmented
                                    options={DELAYS.map((n) => ({ value: n, label: `${n}m` }))}
                                    value={settings?.fallback_delay_minutes}
                                    onChange={(n) => saveSettings({ fallback_delay_minutes: n })}
                                    disabled={!settings || savingSettings}
                                    padding="5px 0"
                                />
                            </div>
                            <div style={styles.settingBlock}>
                                <label htmlFor="messenger-url" style={styles.settingLabel}>Admin Messenger link</label>
                                <input
                                    id="messenger-url"
                                    value={urlDraft}
                                    onChange={(e) => setUrlDraft(e.target.value)}
                                    onBlur={saveUrl}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                    placeholder="https://m.me/yourpage"
                                    maxLength={255}
                                    style={styles.urlInput}
                                />
                            </div>
                            {settingsError && <div style={styles.error}>{settingsError}</div>}
                        </div>
                    </aside>
                )}
            </section>
        </AdminLayout>
    );
}

function Avatar({ id, name }) {
    const [bg, fg] = avatarColors(id);
    return <div style={{ ...styles.avatar, background: bg, color: fg }}>{initialsOf(name)}</div>;
}

function Segmented({ options, value, onChange, disabled, padding }) {
    return (
        <div style={styles.segmented}>
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => !on && onChange(o.value)}
                        disabled={disabled}
                        aria-pressed={on}
                        style={{
                            ...styles.segment,
                            padding,
                            background: on ? '#fff' : 'transparent',
                            color: on ? T.ink : T.muted,
                            boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                            cursor: disabled ? 'default' : 'pointer',
                        }}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

function Toggle({ on, onChange, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Slow-response fallback"
            onClick={() => onChange(!on)}
            disabled={disabled}
            style={{
                ...styles.toggle,
                background: on ? T.green : '#d4d6d1',
                justifyContent: on ? 'flex-end' : 'flex-start',
                opacity: disabled ? 0.6 : 1,
            }}
        >
            <span style={styles.toggleKnob} />
        </button>
    );
}

function SearchGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a918d" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}

function SendGlyph() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
    );
}

const styles = {
    header: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' },
    title: { margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-.02em', color: T.ink },
    summary: { fontSize: '13px', color: T.muted },

    card: {
        display: 'grid',
        height: 'calc(100vh - 210px)',
        minHeight: '520px',
        background: '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        color: T.ink,
    },

    // conversations
    listCol: { display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.line}`, minHeight: 0, minWidth: 0 },
    listTop: { padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: '10px' },
    search: {
        display: 'flex', alignItems: 'center', gap: '8px', background: T.soft,
        borderRadius: '10px', padding: '0 12px', height: '36px',
    },
    searchInput: { border: 0, outline: 0, background: 'transparent', fontSize: '13px', flex: 1, minWidth: 0, fontFamily: 'inherit', color: T.ink },
    list: { flex: 1, overflow: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: '2px' },
    listEmpty: { padding: '32px 12px', textAlign: 'center', fontSize: '13px', color: T.faint },
    row: {
        display: 'flex', gap: '11px', alignItems: 'flex-start', textAlign: 'left', border: 0,
        borderRadius: '10px', padding: '11px 10px', cursor: 'pointer', width: '100%', fontFamily: 'inherit',
    },
    rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
    rowLine: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' },
    rowName: { fontSize: '14px', color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowTime: { fontSize: '11px', color: T.faint, flex: 'none' },
    rowPreview: { fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowRef: { fontSize: '11px', color: T.muted, marginTop: '3px' },
    unreadPill: {
        flex: 'none', minWidth: '18px', height: '18px', borderRadius: '999px', background: T.green, color: '#fff',
        fontSize: '11px', fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px', boxSizing: 'border-box',
    },
    avatar: {
        width: '38px', height: '38px', flex: 'none', borderRadius: '50%',
        display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 600,
    },

    // thread
    threadCol: { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 },
    threadHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: `1px solid ${T.line}` },
    threadWho: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
    threadName: { fontSize: '15px', fontWeight: 600 },
    threadSub: { fontSize: '12px', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    detailsBtn: {
        border: `1px solid ${T.border}`, background: '#fff', borderRadius: '9px', height: '34px', padding: '0 12px',
        fontSize: '13px', fontWeight: 500, color: T.body, cursor: 'pointer', fontFamily: 'inherit', flex: 'none',
    },
    thread: {
        flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column',
        gap: '6px', background: T.threadBg,
    },
    threadEmpty: { margin: 'auto', fontSize: '13px', color: T.faint },
    day: { display: 'flex', flexDirection: 'column', gap: '6px' },
    dayLabel: { alignSelf: 'center', fontSize: '11px', fontWeight: 600, color: T.faint, letterSpacing: '.04em', padding: '4px 0 10px' },
    bubbleWrap: { maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '3px' },
    bubbleMine: {
        background: T.green, color: '#fff', padding: '9px 13px', borderRadius: '14px 14px 4px 14px',
        fontSize: '14px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    },
    bubbleTheirs: {
        background: '#fff', border: '1px solid #ebebe6', padding: '9px 13px', borderRadius: '14px 14px 14px 4px',
        fontSize: '14px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    },
    bubbleTime: { fontSize: '11px', color: T.faint },
    noSelection: { margin: 'auto', fontSize: '14px', color: T.faint, padding: '24px', textAlign: 'center' },

    // composer
    composer: { padding: '12px 16px 16px', borderTop: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', gap: '10px' },
    chips: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    chip: {
        border: '1px solid #e1e6e2', background: '#f4f7f5', color: T.green, borderRadius: '999px',
        padding: '5px 11px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    },
    inputRow: {
        display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e1e1db',
        borderRadius: '12px', padding: '6px 6px 6px 14px', background: '#fff',
    },
    input: { border: 0, outline: 0, flex: 1, minWidth: 0, fontSize: '14px', height: '32px', background: 'transparent', fontFamily: 'inherit', color: T.ink },
    sendBtn: {
        height: '34px', padding: '0 14px', border: 0, borderRadius: '9px', color: '#fff', fontSize: '13px',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', flex: 'none',
    },
    error: { fontSize: '12px', color: '#b4483a' },

    // details
    detailsCol: { borderLeft: `1px solid ${T.line}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto', minWidth: 0 },
    section: { display: 'flex', flexDirection: 'column', gap: '12px' },
    sectionLabel: { fontSize: '11px', letterSpacing: '.08em', color: T.faint, fontWeight: 600 },
    facts: { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '8px 14px', fontSize: '13px' },
    factKey: { color: T.muted },
    factValue: { textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    requestCard: { border: '1px solid #ebebe6', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
    requestTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
    statusPill: { fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px' },
    openLink: { fontSize: '13px', fontWeight: 600, textDecoration: 'none', color: T.green },
    note: { fontSize: '12px', lineHeight: 1.5, color: T.muted, textWrap: 'pretty' },
    fallbackTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
    settingBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
    settingLabel: { fontSize: '12px', color: T.body, fontWeight: 500 },
    urlInput: {
        border: '1px solid #e1e1db', borderRadius: '9px', height: '34px', padding: '0 10px', fontSize: '13px',
        outline: 0, minWidth: 0, fontFamily: 'inherit', color: T.ink,
    },
    toggle: { width: '36px', height: '20px', border: 0, borderRadius: '999px', padding: '2px', cursor: 'pointer', display: 'flex', flex: 'none' },
    toggleKnob: { width: '16px', height: '16px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)' },

    segmented: { display: 'flex', gap: '4px', background: T.soft, borderRadius: '9px', padding: '3px' },
    segment: { flex: 1, border: 0, borderRadius: '7px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' },
};
