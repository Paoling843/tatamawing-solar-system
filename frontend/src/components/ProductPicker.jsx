import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { searchProducts } from '../services/productCatalog';

// Item box for the supplier materials form: type a name ("mc4",
// "dc breaker 32") and pick from TataMawing's product list. A pick fills
// in the name and unit; typing something not on the list is still allowed
// (e.g. a part bought elsewhere).
//   value      the item name typed so far
//   onChange   (text) on every keystroke
//   onPick     (product) when a product is picked: { code, name, unit }
// Keyboard: ↓ / ↑ move through the list, Enter picks, Esc closes.
// The list is position: fixed so the materials table's sideways scroll
// container doesn't cut it off.
export default function ProductPicker({ value, onChange, onPick, inputStyle, colors, ...inputProps }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [rect, setRect] = useState(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const listId = useId();

    const matches = searchProducts(value);
    const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

    // Follow the input while the page or the table scrolls
    useLayoutEffect(() => {
        if (!open) return undefined;
        const place = () => setRect(inputRef.current?.getBoundingClientRect() ?? null);
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    // Keep the highlighted product visible while using the arrow keys
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open]);

    const pick = (product) => {
        onPick(product);
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && open && matches[activeIndex]) {
            e.preventDefault();
            pick(matches[activeIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    // Wide enough to read the product names even when the column is narrow
    const listStyle = rect && {
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 340),
        maxWidth: 'calc(100vw - 16px)',
        zIndex: 500,
        margin: 0,
        padding: '4px',
        listStyle: 'none',
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        boxShadow: '0 12px 28px rgba(16,33,26,.14)',
        maxHeight: '264px',
        overflowY: 'auto',
    };
    const optionStyle = {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.6rem',
        padding: '8px 10px',
        borderRadius: '7px',
        fontSize: '0.85rem',
        color: colors.text,
        cursor: 'pointer',
    };

    return (
        <>
            <input
                {...inputProps}
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                style={inputStyle}
            />

            {open && listStyle && (
                <ul id={listId} role="listbox" ref={listRef} style={listStyle}>
                    {matches.length === 0 ? (
                        <li style={{ ...optionStyle, color: colors.muted, cursor: 'default' }}>
                            Not on the product list. You can still type your own item.
                        </li>
                    ) : (
                        matches.map((product, i) => (
                            <li
                                key={product.code}
                                id={`${listId}-${i}`}
                                data-index={i}
                                role="option"
                                aria-selected={i === activeIndex}
                                // mousedown (not click) so the input doesn't lose focus first
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(product);
                                }}
                                onMouseEnter={() => setActive(i)}
                                style={{ ...optionStyle, ...(i === activeIndex ? { background: colors.active } : {}) }}
                            >
                                <span style={{ flex: 1, minWidth: 0 }}>{product.name}</span>
                                <span style={{ color: colors.muted, fontSize: '0.75rem', flexShrink: 0 }}>{product.unit}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </>
    );
}
