import { useEffect, useId, useRef, useState } from 'react';
import { officialBarangay, suggestBarangays } from '../services/installLocation';

// Bulan barangay box: type, and pick from suggestions that narrow as you
// type. Used by the quote builder's location card and the external
// installation request form, so both behave the same.
//   value      what's typed
//   onChange   (text) — every keystroke, and the official name once picked
//   onDone     () — the field was left or a suggestion picked (for "Required" messages)
//   inputStyle the page's own input style (border turns red via `invalid` there)
//   colors     { text, muted, border, active } for the suggestion list
// Keyboard: ↓ / ↑ move through the suggestions, Enter picks, Esc closes.
export default function BarangayInput({ id, value, onChange, onDone, inputStyle, colors }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const listId = useId();
    const listRef = useRef(null);

    const matches = suggestBarangays(value);
    const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

    // Keep the highlighted suggestion visible while using the arrow keys
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open]);

    const pick = (name) => {
        onChange(name);
        setOpen(false);
        onDone?.();
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

    // Leaving the box: a typed name that matches ("bical", "zone 2") is
    // turned into its official spelling
    const onBlur = () => {
        setOpen(false);
        const official = officialBarangay(value);
        if (official && official !== value) onChange(official);
        onDone?.();
    };

    const listStyle = {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
        margin: 0, padding: '4px', listStyle: 'none', background: '#fff',
        border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 12px 28px rgba(16,33,26,.14)',
        maxHeight: '264px', overflowY: 'auto', textAlign: 'left',
    };
    const optionStyle = {
        padding: '9px 10px', borderRadius: '7px', fontSize: '14px', color: colors.text, cursor: 'pointer',
    };

    return (
        <div style={{ position: 'relative' }}>
            <input
                id={id}
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
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                placeholder="Start typing, e.g. Bical"
                autoComplete="off"
                maxLength={120}
                style={inputStyle}
            />

            {open && (
                <ul id={listId} role="listbox" ref={listRef} style={listStyle}>
                    {matches.length === 0 ? (
                        <li style={{ ...optionStyle, color: colors.muted, cursor: 'default' }}>
                            No barangay in Bulan matches “{value.trim()}”
                        </li>
                    ) : (
                        matches.map((name, i) => (
                            <li
                                key={name}
                                id={`${listId}-${i}`}
                                data-index={i}
                                role="option"
                                aria-selected={i === activeIndex}
                                // mousedown (not click) so the input doesn't lose focus first
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(name);
                                }}
                                onMouseEnter={() => setActive(i)}
                                style={{ ...optionStyle, ...(i === activeIndex ? { background: colors.active } : {}) }}
                            >
                                <Highlight name={name} query={value} />
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}

// Bolds the part of the name that matches what was typed (when it appears as-is)
function Highlight({ name, query }) {
    const q = query.trim();
    const at = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (at < 0) return name;
    return (
        <>
            {name.slice(0, at)}
            <strong style={{ fontWeight: 700 }}>{name.slice(at, at + q.length)}</strong>
            {name.slice(at + q.length)}
        </>
    );
}
