// Used by the login and register pages for "?redirect=/some/page".
// Only follows redirects to pages inside this app ("/quotation/new"), never
// to another website ("//evil.com" or "https://..."). Returns null otherwise.
export function safeRedirect(value) {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
