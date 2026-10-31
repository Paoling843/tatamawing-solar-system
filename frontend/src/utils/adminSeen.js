// What the admin has already seen, per sidebar item (quotations, schedule,
// messages), saved in this browser. The sidebar shows a dot when something
// is newer than this; opening the page updates it (AdminLayout).
//   scheduleLatest: the newest schedule id seen on the Schedule page, so that
//                   page can mark the schedules added since the last visit
const SEEN_STORAGE_KEY = 'admin_seen_counts';

export const readSeenCounts = () => {
    try {
        return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

export const writeSeenCounts = (seen) => {
    try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(seen));
    } catch {
        // Storage unavailable (private mode, quota, etc.) — the dot just won't persist.
    }
};
