// =====================================================================
// The quote builder's unfinished inputs, saved in this browser tab
// =====================================================================
// Every visit to the quote builder is a new session: a refresh, going back
// to the home page, or logging out all start it empty.
//
// The one exception is the login hand-off. A guest who presses "Request
// quotation" is sent to log in or register; their inputs are saved with
// awaitingLogin: true so the quote builder can bring them back to Step 3
// once. After that the draft no longer counts as a hand-off.
// =====================================================================

import { endQuoteSession } from './quoteTracker';

const DRAFT_KEY = 'tatamawing.solarEngineDraft';

// The saved draft, or null if there is none or storage is blocked
export function loadDraft() {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveDraft(draft) {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
        // Storage can be blocked (e.g. private mode). The page still works,
        // the inputs just won't survive the trip to the login page.
    }
}

export function clearDraft() {
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    } catch {
        // Nothing to clear
    }
}

// Forgets the inputs and the anonymous analytics session, so the next
// visit to the quote builder starts fresh
export function startNewQuoteSession() {
    clearDraft();
    endQuoteSession();
}
