import { useEffect } from 'react';

// Gives every button and link on the admin pages a hover effect that suits
// its look. Most buttons are styled inline, so a stylesheet can't tell a
// green button from an outlined one. This sorts each one by its colours and
// marks it with data-hover="…"; the matching styles (hover, pressed, keyboard
// focus, disabled) are in App.css, in the "Admin button states" section.
//
//   solid    dark green fill (primary)  a lighter green
//   gold     gold fill                  a lighter gold
//   outline  white with a border        light grey fill, darker grey border
//   danger   red text or red border     light red fill
//   on-dark  clear, on the green banner a faint white fill
//   icon     clear, just an icon (or an unselected option in a group)
//                                       a grey patch behind it
//   text     clear, just words          underlined
//   row      a list row or calendar day a light grey fill
//
// Rows and menu items that already have their own hover (sidebar, account
// menu, notifications, the Overview's upcoming installations…) are left alone.

const OWN_HOVER = [
    'upcoming-row', 'qt-row', 'admin-nav-item', 'account-trigger', 'account-item',
    'notif-row', 'mq-row-toggle', 'mat-cell',
];

const parse = (color) => {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
};

const luminance = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const isReddish = (c) => c && c.a > 0.3 && c.r > 150 && c.g < 110 && c.b < 110;
const isGold = (c) => c && c.a > 0.5 && c.r > 200 && c.g > 150 && c.b < 140;

// The first background behind the element that isn't see-through
const backdrop = (el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0.5) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
};

function classify(el) {
    // A disabled button is drawn faded by App.css, which would make it look
    // like a different kind; it keeps the kind it had
    if (el.disabled && el.dataset.hover) return el.dataset.hover;
    if (OWN_HOVER.some((name) => el.classList.contains(name))) return null;
    // Links inside running text (or the breadcrumb) keep the browser's look
    if (el.tagName === 'A' && el.closest('p, nav[aria-label="Breadcrumb"]')) return null;

    const cs = getComputedStyle(el);
    const bg = parse(cs.backgroundColor);
    const text = parse(cs.color);
    const borderWidth = parseFloat(cs.borderTopWidth) || 0;
    const border = borderWidth > 0 && cs.borderTopStyle !== 'none' ? parse(cs.borderTopColor) : null;
    const filled = bg && bg.a > 0.5;

    if (filled && isGold(bg)) return 'gold';
    if (filled && luminance(bg) < 0.35) return 'solid';
    if (isReddish(text) || isReddish(border)) return 'danger';

    // See-through, or a faint white fill (e.g. the filter tiles on the banner)
    const onDark = luminance(backdrop(el)) < 0.35;
    if (onDark) return 'on-dark';
    // Big borderless ones are list rows or calendar days, not buttons as such
    const box = el.getBoundingClientRect();
    if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && borderWidth === 0 && box.height > 40 && (box.width > 160 || box.height > 56)) return 'row';
    if (border && border.a > 0.1) return 'outline';

    const hasWords = (el.innerText || '').trim().length > 1;
    // A plain link, or a lone button of words (e.g. a quotation number)
    const inGroup = el.parentElement && el.parentElement.querySelectorAll(':scope > button').length > 1;
    if (hasWords && (el.tagName === 'A' || !inGroup)) return 'text';
    // Icons, and the unselected options of a segmented control
    return 'icon';
}

const SELECTOR = 'button, a[href], [role="button"]';

function mark(root) {
    const els = root.matches?.(SELECTOR) ? [root] : [];
    root.querySelectorAll?.(SELECTOR).forEach((el) => els.push(el));
    els.forEach((el) => {
        const kind = classify(el);
        if (kind) el.dataset.hover = kind;
        else delete el.dataset.hover;
    });
}

export default function useButtonHover() {
    useEffect(() => {
        // Mark what's on screen, then anything added or restyled later
        // (modals, pages loading in, a tab becoming the selected one)
        let queued = false;
        const pending = new Set();
        const flush = () => {
            queued = false;
            pending.forEach((node) => node.isConnected && mark(node));
            pending.clear();
        };
        const queue = (node) => {
            pending.add(node);
            if (!queued) {
                queued = true;
                requestAnimationFrame(flush);
            }
        };

        mark(document.body);
        const observer = new MutationObserver((records) => {
            records.forEach((record) => {
                if (record.type === 'childList') {
                    record.addedNodes.forEach((node) => node.nodeType === 1 && queue(node));
                } else if (record.target.nodeType === 1) {
                    // A style change on a button (or around it) can change what it looks like
                    const el = record.target;
                    queue(el.matches(SELECTOR) ? el : el.closest(SELECTOR) || el);
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'aria-pressed', 'disabled'] });

        return () => {
            observer.disconnect();
            document.querySelectorAll('[data-hover]').forEach((el) => { delete el.dataset.hover; });
        };
    }, []);
}
