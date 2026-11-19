import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

import AdminLayout from '../components/AdminLayout';
import { adminTokens, adminUi } from '../styles/adminTheme';
import MessengerLinkCard from '../components/MessengerLinkCard';
import Badge from '../components/StatusPill';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { errorMessage } from '../utils/errorMessage';
import { formatQuotationRef } from '../utils/references';
import { formatPhone } from '../utils/phone';

// Admin Messages — conversations | thread | details (customer, linked
// request, and the slow-response fallback that sends a "Chat on Messenger"
// card when a customer has waited too long). Layout from
// "Admin inbox redesign/Admin Inbox.dc.html".

const T = {
    green: adminTokens.green,
    greenPale: '#A9BAB0',
    selected: adminTokens.greenTint,
    ink: adminTokens.ink,
    body: adminTokens.body,
    muted: adminTokens.muted,
    faint: adminTokens.subtle,
    border: adminTokens.line,
    line: adminTokens.line,
    rowLine: adminTokens.rowLine,
    control: adminTokens.control,
    threadBg: adminTokens.headBg,
};

const AVATAR_COLORS = [
    ['#FBEBC4', '#6B4500'],
    ['#E3F1E8', '#0F3D2E'],
    ['#E6EFF9', '#1F4E80'],
];

// Linked-request label → the shared status colour it uses
const STATUS = {
    New: 'pending',
    Quoted: 'scheduled',
    Scheduled: 'approved',
    Rejected: 'rejected',
    Cancelled: 'cancelled',
};

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    // The customer sent the last message and no admin has answered yet
    { key: 'reply', label: 'Needs reply' },
];

const DELAYS = [5, 10, 15, 30];

// The details panel starts hidden below this width (as in the design)
const NARROW = '(max-width: 1240px)';


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
    if (isSameDay(d, now)) return 'Today';
    if (isSameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

// What the inbox shows about a conversation's customer and linked request
const describe = (conversation) => {
    const request = conversation.linked_request;
    const customer = conversation.user.customer;

    let status = null;
    if (request) {
        if (request.status === 'rejected') status = 'Rejected';
        else if (request.status === 'cancelled') status = 'Cancelled';
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
        reference: request ? formatQuotationRef(request) : null,
        status,
        location,
        system,
        email: conversation.user.email,
        phone: formatPhone(customer?.contact_number) || '—',
    };
};

export default function AdminInboxPage() {
    const { user } = useAuth();

    // Before the latest message in the list: "You: " for your own, the first
    // name when another admin sent it, nothing for the customer's
    const senderPrefix = (c) => {
        if (!c.latest_from_admin) return '';
        if (c.latest_sender_id === user?.id) return 'You: ';
        return c.latest_sender_name ? `${c.latest_sender_name.split(' ')[0]}: ` : '';
    };

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
            setSendError(errorMessage(err, "Couldn't send the message. Your text is still in the box — please try again."));
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
            setSettingsError(errorMessage(err, "Couldn't save the settings. Please try again."));
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
    // The automatic Messenger card doesn't count as an answer
    const needsReply = (c) => Boolean(c.latest_time) && (!c.latest_from_admin || c.latest_is_auto);
    const needsReplyCount = conversations.filter(needsReply).length;
    const summary = loadingConversations
        ? 'Loading conversations…'
        : unreadConversations
            ? `${unreadConversations} unread · ${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
            : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'} · all caught up`;

    const q = query.trim().toLowerCase();
    const visible = conversations.filter((c) => {
        if (filter === 'unread' && !c.unread_count) return false;
        if (filter === 'reply' && !needsReply(c)) return false;
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
            {/* Slim banner: the inbox needs the height */}
            <section aria-label="Page summary" style={styles.header}>
                <h1 style={styles.title}>Messages</h1>
                <span style={styles.summary}>
                    {!loadingConversations && unreadConversations > 0 ? (
                        <><strong style={{ color: adminTokens.gold }}>{unreadConversations} unread</strong> · {conversations.length} conversation{conversations.length === 1 ? '' : 's'}</>
                    ) : summary}
                </span>
            </section>

            {/* On phones the card shows the conversation list or the open thread, not both */}
            <section className={`inbox-card${current ? ' inbox-has-thread' : ''}`} style={{ ...styles.card, gridTemplateColumns: columns }}>
                {/* ---------- Conversations ---------- */}
                <div className="inbox-list" style={styles.listCol}>
                    <div style={styles.listTop}>
                        <label style={styles.search}>
                            <SearchGlyph />
                            <span style={adminUi.srOnly}>Search conversations</span>
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search conversations"
                                style={styles.searchInput}
                            />
                        </label>
                        <div role="group" aria-label="Show" style={styles.tabs}>
                            {FILTERS.map((f) => {
                                const on = filter === f.key;
                                const count = { unread: unreadConversations, reply: needsReplyCount }[f.key] ?? 0;
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setFilter(f.key)}
                                        style={{ ...styles.tab, ...(on ? styles.tabOn : {}) }}
                                    >
                                        {f.label}
                                        {count > 0 && <span style={styles.tabCount}>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={styles.list}>
                        {loadingConversations ? (
                            <div style={styles.listEmpty}>Loading…</div>
                        ) : visible.length === 0 ? (
                            <div style={styles.listEmpty}>
                                {conversations.length === 0
                                    ? 'No conversations yet.'
                                    : filter === 'reply' && !q
                                        ? 'Every customer has had a reply.'
                                        : 'No conversations match.'}
                            </div>
                        ) : (
                            visible.map((c) => {
                                const d = describe(c);
                                const unread = c.unread_count > 0;
                                const on = c.user.id === selectedUserId;
                                const preview = c.latest_type === 'messenger_link'
                                    ? 'Sent Messenger link'
                                    : `${senderPrefix(c)}${c.latest_message || ''}`;
                                return (
                                    <button
                                        key={c.user.id}
                                        type="button"
                                        onClick={() => selectConversation(c)}
                                        style={{ ...styles.row, ...(on ? styles.rowOn : {}) }}
                                    >
                                        <Avatar id={c.user.id} name={c.user.name} />
                                        <div style={styles.rowText}>
                                            <div style={styles.rowLine}>
                                                <span style={{ ...styles.rowName, fontWeight: unread ? 700 : 600 }}>{c.user.name}</span>
                                                <span style={{ ...styles.rowTime, color: unread ? T.green : T.faint }}>{c.latest_time ? formatListTime(c.latest_time) : ''}</span>
                                            </div>
                                            <div style={styles.rowLine}>
                                                <span style={{ ...styles.rowPreview, color: unread ? T.ink : T.muted }}>{preview}</span>
                                                {unread && <span style={styles.unreadPill} aria-label={`${c.unread_count} unread`}>{c.unread_count}</span>}
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
                                {/* Phones only: back to the conversation list */}
                                <button
                                    type="button"
                                    className="inbox-back m-tap"
                                    onClick={() => setSelectedUserId(null)}
                                    aria-label="Back to conversations"
                                    style={styles.backBtn}
                                >
                                    ←
                                </button>
                                <Avatar id={current.user.id} name={current.user.name} />
                                <div style={styles.threadWho}>
                                    <span style={styles.threadName}>{current.user.name}</span>
                                    <span style={styles.threadSub}>
                                        {info.location}{info.reference ? ` · ${info.reference}` : ''}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setShowDetails((v) => !v)} className="m-tap" style={styles.detailsBtn}>
                                    {showDetails ? 'Hide details' : 'Show details'}
                                </button>
                            </div>

                            <div ref={threadRef} style={styles.thread}>
                                {messages.length === 0 ? (
                                    <div style={styles.threadEmpty}>Loading messages…</div>
                                ) : (
                                    days.map((day) => (
                                        <div key={day.key} style={styles.day}>
                                            <div style={styles.dayLabel}><span style={styles.dayLine} />{day.label}<span style={styles.dayLine} /></div>
                                            {day.messages.map((m) => {
                                                // Every admin shares this inbox: anything the team sent sits
                                                // on the right, with the name when another admin sent it
                                                const mine = m.sender?.role === 'admin' || m.sender_id === user?.id;
                                                const byOtherAdmin = mine && m.sender_id !== user?.id;
                                                if (m.type === 'messenger_link') {
                                                    const who = m.meta?.auto
                                                        ? `Auto-sent after ${m.meta.after_minutes} min without reply`
                                                        : byOtherAdmin ? `Sent by ${m.sender?.name || 'another admin'}` : 'Sent by you';
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
                                                        className="inbox-bubble"
                                                        style={{
                                                            ...styles.bubbleWrap,
                                                            alignSelf: mine ? 'flex-end' : 'flex-start',
                                                            alignItems: mine ? 'flex-end' : 'flex-start',
                                                        }}
                                                    >
                                                        {/* Sent with "Ask about this quote": opens that quotation */}
                                                        {m.meta?.quotation_request_id && (
                                                            <Link
                                                                to={`/admin/quotation-requests/${m.meta.quotation_request_id}`}
                                                                style={styles.aboutLink}
                                                            >
                                                                About {m.meta.quotation_reference} →
                                                            </Link>
                                                        )}
                                                        <div style={mine ? styles.bubbleMine : styles.bubbleTheirs}>{m.message}</div>
                                                        <span style={styles.bubbleTime}>
                                                            {mine
                                                                ? (byOtherAdmin && m.sender?.name ? m.sender.name : 'You')
                                                                : (current.user.name || '').split(' ')[0]}
                                                            {' · '}{formatClock(m.created_at)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={sendDraft} style={styles.composer}>
                                <div style={styles.chips}>
                                    <span style={styles.chipsLabel}>Quick replies</span>
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
                            <h2 style={styles.sectionLabel}>Customer</h2>
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
                            <h2 style={styles.sectionLabel}>Linked request</h2>
                            {current.linked_request ? (
                                <div style={styles.requestCard}>
                                    <div style={styles.requestTop}>
                                        <span style={{ fontWeight: 700 }}>{info.reference}</span>
                                        <Badge status={STATUS[info.status]} label={info.status} />
                                    </div>
                                    {info.system && <span style={{ fontSize: '13px', color: T.body }}>{info.system}</span>}
                                    <Link
                                        to={`/admin/quotation-requests/${current.linked_request.id}`}
                                        className="btn-primary"
                                        style={styles.openQuoteBtn}
                                    >
                                        Open quotation
                                    </Link>
                                </div>
                            ) : (
                                <span style={styles.note}>This customer hasn't requested a quotation yet.</span>
                            )}
                        </div>

                        <div style={styles.section}>
                            <div style={styles.fallbackTop}>
                                <h2 style={styles.sectionLabel}>Slow-reply fallback</h2>
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
                                <span style={styles.settingLabel}>Wait before offering</span>
                                <Segmented
                                    options={DELAYS.map((n) => ({ value: n, label: `${n}m` }))}
                                    value={settings?.fallback_delay_minutes}
                                    onChange={(n) => saveSettings({ fallback_delay_minutes: n })}
                                    disabled={!settings || savingSettings}
                                    padding="0"
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
        <div style={{ ...styles.segmented, gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map((o, i) => {
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
                            background: on ? '#E3F1E8' : '#FFFFFF',
                            color: on ? T.green : T.body,
                            fontWeight: on ? 700 : 500,
                            cursor: disabled ? 'default' : 'pointer',
                            ...(i ? { borderLeft: `1px solid ${T.control}` } : {}),
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
                background: on ? T.green : '#C9C9C3',
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
    header: {
        ...adminUi.hero,
        padding: '16px 24px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '6px 14px',
    },
    title: { margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' },
    summary: { fontSize: '14px', color: adminTokens.stripText },

    card: {
        display: 'grid',
        height: 'calc(100vh - 220px)',
        minHeight: '560px',
        background: '#FFFFFF',
        border: `1px solid ${T.border}`,
        borderRadius: adminTokens.radius,
        overflow: 'hidden',
        color: T.ink,
    },

    // conversations
    listCol: { display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.line}`, minHeight: 0, minWidth: 0 },
    listTop: { padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: `1px solid ${T.line}` },
    search: { ...adminUi.searchBox },
    searchInput: adminUi.searchInput,
    tabs: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
    tab: {
        flex: '1 1 auto', height: '32px', padding: '0 10px', whiteSpace: 'nowrap', borderRadius: adminTokens.radius, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
        background: '#FFFFFF', color: T.body, border: `1px solid ${T.control}`,
    },
    tabOn: { background: T.green, color: '#FFFFFF', border: `1px solid ${T.green}` },
    tabCount: {
        marginLeft: '6px', fontSize: '11px', fontWeight: 700, color: adminTokens.onGold,
        background: adminTokens.gold, borderRadius: '8px', padding: '0 6px',
    },
    list: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
    listEmpty: { padding: '32px 12px', textAlign: 'center', fontSize: '14px', color: T.muted },
    row: {
        display: 'flex', gap: '10px', alignItems: 'flex-start', textAlign: 'left', border: 0,
        borderBottom: `1px solid ${T.rowLine}`, padding: '12px 14px', cursor: 'pointer', width: '100%',
        fontFamily: 'inherit', fontSize: '14px', color: T.ink, background: '#FFFFFF',
    },
    rowOn: { background: T.selected, boxShadow: `inset 3px 0 0 ${T.green}` },
    rowText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
    rowLine: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' },
    rowName: { color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowTime: { fontSize: '12px', flex: 'none', whiteSpace: 'nowrap' },
    rowPreview: { flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowRef: { fontSize: '12px', color: T.faint },
    unreadPill: {
        flex: 'none', fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: T.green,
        borderRadius: '9px', padding: '0 6px', lineHeight: '18px',
    },
    avatar: {
        width: '36px', height: '36px', flex: 'none', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700,
    },

    // thread
    threadCol: { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 },
    threadHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: `1px solid ${T.line}` },
    threadWho: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
    threadName: { fontSize: '16px', fontWeight: 700 },
    threadSub: { fontSize: '13px', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    backBtn: {
        border: `1px solid ${T.control}`, background: '#FFFFFF', borderRadius: adminTokens.radius, fontSize: '16px',
        color: T.body, cursor: 'pointer', fontFamily: 'inherit', flex: 'none', alignItems: 'center', justifyContent: 'center',
    },
    detailsBtn: {
        border: `1px solid ${T.control}`, background: '#FFFFFF', borderRadius: adminTokens.radius, height: '34px', padding: '0 12px',
        fontSize: '13px', fontWeight: 600, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', flex: 'none',
    },
    thread: {
        flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column',
        gap: '14px', background: T.threadBg,
    },
    threadEmpty: { margin: 'auto', fontSize: '14px', color: T.muted },
    day: { display: 'flex', flexDirection: 'column', gap: '14px' },
    dayLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 600, color: T.faint },
    dayLine: { flex: 1, borderTop: `1px solid ${T.line}` },
    bubbleWrap: { maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '4px' },
    bubbleMine: {
        background: T.green, color: '#FFFFFF', padding: '10px 14px', borderRadius: '8px 8px 2px 8px',
        fontSize: '14px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left',
    },
    bubbleTheirs: {
        background: '#FFFFFF', border: `1px solid ${T.line}`, padding: '10px 14px', borderRadius: '8px 8px 8px 2px',
        fontSize: '14px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    },
    bubbleTime: { fontSize: '12px', color: T.faint },
    aboutLink: { fontSize: '12px', fontWeight: 600, color: T.green, textDecoration: 'none', padding: '2px 0' },
    noSelection: { margin: 'auto', fontSize: '14px', color: T.muted, padding: '24px', textAlign: 'center' },

    // composer
    composer: { padding: '12px 20px 16px', borderTop: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', gap: '10px' },
    chips: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
    chipsLabel: { fontSize: '12px', fontWeight: 600, color: T.muted, marginRight: '2px' },
    chip: {
        height: '30px', padding: '0 10px', border: `1px solid ${T.control}`, background: '#FFFFFF', color: T.ink,
        borderRadius: adminTokens.radius, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
    },
    inputRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    input: {
        flex: 1, minWidth: 0, height: '44px', padding: '0 12px', border: `1px solid ${T.control}`,
        borderRadius: adminTokens.radius, outline: 0, fontSize: '14px', background: '#FFFFFF', fontFamily: 'inherit',
        color: T.ink, boxSizing: 'border-box',
    },
    sendBtn: {
        height: '44px', padding: '0 16px', border: 0, borderRadius: adminTokens.radius, color: '#FFFFFF', fontSize: '14px',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', flex: 'none',
    },
    error: { fontSize: '13px', color: '#A3261B' },

    // details
    detailsCol: { borderLeft: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 },
    section: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', borderBottom: `1px solid ${T.line}` },
    sectionLabel: { margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted },
    facts: { display: 'grid', gridTemplateColumns: '68px minmax(0, 1fr)', gap: '6px 10px', fontSize: '14px' },
    factKey: { color: T.muted },
    factValue: { overflowWrap: 'anywhere' },
    requestCard: { display: 'flex', flexDirection: 'column', gap: '2px' },
    requestTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
    openQuoteBtn: {
        display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', height: '34px', padding: '0 12px',
        marginTop: '10px', borderRadius: adminTokens.radius, background: T.green, color: '#FFFFFF',
        fontSize: '13px', fontWeight: 600, textDecoration: 'none',
    },
    note: { fontSize: '13px', lineHeight: 1.45, color: T.muted, textWrap: 'pretty' },
    fallbackTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
    settingBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
    settingLabel: { fontSize: '13px', color: T.ink, fontWeight: 600 },
    urlInput: {
        border: `1px solid ${T.control}`, borderRadius: adminTokens.radius, height: '36px', padding: '0 10px', fontSize: '14px',
        outline: 0, minWidth: 0, fontFamily: 'inherit', color: T.ink,
    },
    toggle: { width: '44px', height: '24px', border: 0, borderRadius: '12px', padding: '3px', cursor: 'pointer', display: 'flex', flex: 'none' },
    toggleKnob: { width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF' },

    segmented: { display: 'grid', border: `1px solid ${T.control}`, borderRadius: adminTokens.radius, overflow: 'hidden' },
    segment: { height: '34px', border: 0, fontSize: '13px', fontFamily: 'inherit' },
};
