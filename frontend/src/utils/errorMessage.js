// Turns a failed API call into a message a person can act on: what
// happened and what to do next. Every page uses this, so the same problem
// reads the same everywhere and no technical text reaches the screen.

export const NETWORK_MESSAGE = "Can't reach the server. Check your internet connection. If the site was idle, it can take up to a minute to wake up — then try again.";
export const SESSION_ENDED_MESSAGE = 'Your session has ended. Please log in again.';

const STATUS_MESSAGES = {
    401: SESSION_ENDED_MESSAGE,
    403: "You don't have permission to do this.",
    404: "We couldn't find that. It may have been removed.",
    413: 'That file is too large. Upload a file under 10 MB.',
    419: 'This page has expired. Reload it and try again.',
    429: 'Too many attempts. Please wait a minute and try again.',
};
const SERVER_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

// Laravel's built-in texts. If one of these comes back, the status message
// above is used instead.
const DEFAULT_TEXTS = [
    'Server Error',
    'Unauthenticated.',
    'This action is unauthorized.',
    'Too Many Attempts.',
    'Forbidden',
    'Not Found',
];
const isDefaultText = (text) => DEFAULT_TEXTS.some((d) => text.startsWith(d))
    || text.startsWith('No query results')
    || text.startsWith('SQLSTATE');

// No answer at all: offline, the server is down or asleep, or it timed out
export const isNetworkError = (err) => Boolean(err) && !err.response;

// Laravel joins validation errors as "First message (and 2 more errors)"
const stripMoreErrors = (text) => text.replace(/\s*\(and \d+ more errors?\)\s*$/, '');

// Downloads ask for a Blob, so an error's JSON body arrives as a Blob too.
// Reads it back into an object so errorMessage can use the server's message:
//   setError(errorMessage(await readBlobError(err), "Couldn't download…"))
export async function readBlobError(err) {
    const data = err?.response?.data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
        try {
            err.response.data = JSON.parse(await data.text());
        } catch {
            // Not JSON (e.g. an HTML error page): the status rules still apply
        }
    }
    return err;
}

// The first message for each field: { answer: 'Keep the answer under…' }
export function fieldErrors(err) {
    const errors = err?.response?.data?.errors;
    if (!errors || typeof errors !== 'object') return {};
    return Object.fromEntries(
        Object.entries(errors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : String(messages)]),
    );
}

// fallback names the action ("Couldn't load your quotations. Please try
// again.") and is used for server errors and anything unexpected
export function errorMessage(err, fallback = SERVER_MESSAGE) {
    if (isNetworkError(err)) return NETWORK_MESSAGE;

    const { status, data } = err.response;
    const serverText = typeof data?.message === 'string' ? stripMoreErrors(data.message.trim()) : '';

    if (status === 422) {
        const first = Object.values(fieldErrors(err))[0];
        if (first) return first;
    }

    // Our own messages (business rules, plain-language 403/404s) are already
    // written for people, so show them as they are
    if (serverText && !isDefaultText(serverText) && status < 500) return serverText;

    // 502/503/504: the host's proxy answered, but the server itself is
    // asleep or restarting
    if ([502, 503, 504].includes(status)) return NETWORK_MESSAGE;
    return STATUS_MESSAGES[status] || fallback;
}
