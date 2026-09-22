// Where the login token is kept in the browser.
//
// "Keep me signed in on this device" checked   → localStorage
//   (stays after the browser is closed)
// "Keep me signed in on this device" unchecked → sessionStorage
//   (cleared when the browser is closed)

const KEY = 'token';

export function getToken() {
    try {
        return localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function saveToken(token, remember) {
    try {
        clearToken();
        (remember ? localStorage : sessionStorage).setItem(KEY, token);
    } catch {
        // Storage blocked (e.g. private mode) — the user stays signed in
        // only until the page is reloaded
    }
}

export function clearToken() {
    try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch {
        // Nothing to clear
    }
}
