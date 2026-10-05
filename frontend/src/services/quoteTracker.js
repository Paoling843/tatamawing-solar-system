// =====================================================================
// Anonymous quote-builder tracking (for the admin analytics page)
// =====================================================================
// Each use of the Solar Computation Engine gets a random ID kept in this
// browser tab (sessionStorage, like the draft inputs). The page tells the
// server how far the visitor got and whether they pressed "Request
// quotation"; when they sign in and submit, the quotation request carries
// the same ID so the server can link the two.
//
// That's how the analytics can count guests who built a quotation but never
// signed in — their inputs never reach the server otherwise.
//
// Nothing personal or from the form is sent: only the ID, a step number and
// the "requested" flag. Every call is fire-and-forget; tracking failures are
// ignored so they can never get in the customer's way.
// =====================================================================

import api from '../api/axios';

const KEY = 'tatamawing.quoteSession';

function read() {
    try {
        return JSON.parse(sessionStorage.getItem(KEY)) || null;
    } catch {
        return null;
    }
}

function write(session) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
        // Storage blocked (e.g. private mode) — tracking just stops
    }
}

function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();

    // Fallback for older browsers: a random version-4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// The current session, created on first use.
//   step      furthest step already reported (0 = none yet)
//   requested "Request quotation" already reported
//   signedIn  already reported while signed in
function current() {
    let session = read();
    if (!session?.id) {
        session = { id: newId(), step: 0, requested: false, signedIn: false };
        write(session);
    }
    return session;
}

function send(session, body) {
    api.post('/quote-sessions/track', { session_id: session.id, ...body }).catch(() => {});
}

// The ID to send along with the quotation request
export function getQuoteSessionId() {
    return current().id;
}

// Reports reaching a step (1 = appliances, 2 = computation, 3 = quote).
// Only sends when the step is further than before, or when the visitor has
// signed in since the last report (so the server can record the sign-in).
export function trackStep(step, signedIn) {
    const session = current();
    const further = step > session.step;
    const newlySignedIn = signedIn && !session.signedIn;
    if (!further && !newlySignedIn) return;

    write({ ...session, step: Math.max(step, session.step), signedIn: session.signedIn || signedIn });
    send(session, { step: Math.max(step, session.step) });
}

// Reports pressing "Request quotation" (once per session)
export function trackRequested(signedIn) {
    const session = current();
    if (session.requested) return;

    write({ ...session, step: 3, requested: true, signedIn: session.signedIn || signedIn });
    send(session, { step: 3, requested: true });
}

// Called after the quotation request is submitted, so the next quotation in
// this tab starts a new session
export function endQuoteSession() {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        // Nothing to clear
    }
}
