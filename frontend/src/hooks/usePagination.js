import { useState } from 'react';

/**
 * Splits an already-loaded list into pages (client-side pagination).
 *
 * Used where the page needs the whole list anyway — for the status counts,
 * sorting and filtering — so the API keeps returning everything and only
 * the rows on screen are limited.
 *
 *   const pager = usePagination(filtered, 10, `${statusFilter}|${sortKey}`);
 *   pager.pageItems.map(...)
 *   <Pagination {...pager} onChange={pager.setPage} />
 *
 * resetKey: when it changes (a new filter or sort), go back to page 1.
 */
export default function usePagination(items, pageSize = 10, resetKey = '') {
    const [page, setPage] = useState(1);
    const [lastKey, setLastKey] = useState(resetKey);

    // Adjusting state while rendering (instead of in an effect) avoids
    // showing one frame of the old page after the filter changes
    if (resetKey !== lastKey) {
        setLastKey(resetKey);
        setPage(1);
    }

    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    // After a delete the last page can disappear, so stay within range
    const current = Math.min(page, pageCount);
    const start = (current - 1) * pageSize;

    return {
        page: current,
        pageCount,
        setPage,
        total,
        from: total === 0 ? 0 : start + 1,
        to: Math.min(start + pageSize, total),
        pageItems: items.slice(start, start + pageSize),
        // The page that holds the item at this position in the full list
        pageOf: (index) => Math.floor(index / pageSize) + 1,
    };
}
