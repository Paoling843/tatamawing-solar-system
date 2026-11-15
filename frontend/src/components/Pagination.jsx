import { adminTokens } from '../styles/adminTheme';

/**
 * "Showing 11–20 of 47 requests" with Previous / page numbers / Next.
 * Renders nothing when everything fits on one page.
 *
 * Works with usePagination (client-side) and with Laravel's paginate()
 * response (server-side): both give page, pageCount, from, to and total.
 *
 * scrollTarget: a ref to the list. After a page change from the bottom of a
 * long list, the top of the list is brought back into view.
 */
export default function Pagination({ page, pageCount, from, to, total, noun = 'items', onChange, scrollTarget, style }) {
    if (pageCount <= 1) return null;

    const go = (next) => {
        if (next < 1 || next > pageCount || next === page) return;
        onChange(next);

        const el = scrollTarget?.current;
        // The admin pages scroll inside the layout, not the window, so use
        // scrollIntoView (it scrolls whichever container holds the list)
        if (el && el.getBoundingClientRect().top < 72) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav aria-label="Pagination" style={{ ...styles.bar, ...style }}>
            <span style={styles.summary} aria-live="polite">
                Showing {from}–{to} of {total} {noun}
            </span>

            <div style={styles.buttons}>
                <button
                    type="button"
                    className="m-tap"
                    style={{ ...styles.btn, ...(page === 1 ? styles.disabled : {}) }}
                    onClick={() => go(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                >
                    ‹ Prev
                </button>

                {pageNumbers(page, pageCount).map((n, i) => (n === '…' ? (
                    <span key={`gap-${i}`} style={styles.gap} aria-hidden="true">…</span>
                ) : (
                    <button
                        key={n}
                        type="button"
                        className="m-tap"
                        style={{ ...styles.btn, ...styles.number, ...(n === page ? styles.active : {}) }}
                        onClick={() => go(n)}
                        aria-label={`Page ${n}`}
                        aria-current={n === page ? 'page' : undefined}
                    >
                        {n}
                    </button>
                )))}

                <button
                    type="button"
                    className="m-tap"
                    style={{ ...styles.btn, ...(page === pageCount ? styles.disabled : {}) }}
                    onClick={() => go(page + 1)}
                    disabled={page === pageCount}
                    aria-label="Next page"
                >
                    Next ›
                </button>
            </div>
        </nav>
    );
}

// First, last, and the pages next to the current one: 1 … 4 5 6 … 12
function pageNumbers(page, pageCount) {
    const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
    const list = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

    return list.flatMap((n, i) => {
        const prev = list[i - 1];
        if (prev === undefined || n - prev === 1) return [n];
        // A gap of exactly one page shows that page instead of "…"
        return n - prev === 2 ? [prev + 1, n] : ['…', n];
    });
}

const styles = {
    bar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px 16px',
        // Shorthand only, so a page can override it with its own padding
        padding: '14px 0 0',
    },
    summary: {
        fontSize: '0.8rem',
        color: adminTokens.muted,
        fontVariantNumeric: 'tabular-nums',
    },
    buttons: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
    },
    btn: {
        height: '32px',
        padding: '0 10px',
        // Written out in parts: the current page swaps only the colour, and React
        // warns when a shorthand and one of its parts change together
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: adminTokens.border,
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        color: adminTokens.body,
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    number: {
        minWidth: '32px',
        padding: '0 6px',
        fontVariantNumeric: 'tabular-nums',
    },
    active: {
        backgroundColor: adminTokens.green,
        borderColor: adminTokens.green,
        color: '#ffffff',
        cursor: 'default',
    },
    disabled: {
        opacity: 0.45,
        cursor: 'not-allowed',
    },
    gap: {
        minWidth: '20px',
        textAlign: 'center',
        color: adminTokens.muted,
        fontSize: '0.8rem',
    },
};
