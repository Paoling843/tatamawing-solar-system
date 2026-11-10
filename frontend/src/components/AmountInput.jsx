import { useLayoutEffect, useRef } from 'react';

// A peso amount field: a ₱ sign inside the box, thousands separators while
// typing (189,440.00), and no up/down arrows. It's a text field with
// inputMode="decimal", so phones still open the number keypad.
//
// `value` and `onChange` use the plain number as text ("189440.00"), so the
// form state and what's sent to the server stay free of commas.

// Keeps digits and one dot, with at most 2 decimals and no leading zeros
function cleanAmount(text) {
    const digits = String(text ?? '').replace(/[^\d.]/g, '');
    const [rawWhole, ...rest] = digits.split('.');
    const whole = rawWhole.replace(/^0+(?=\d)/, '');
    if (!rest.length) return whole;
    return `${whole}.${rest.join('').slice(0, 2)}`;
}

function formatAmount(raw) {
    if (raw === '') return '';
    const [whole, decimals] = raw.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimals === undefined ? grouped : `${grouped || '0'}.${decimals}`;
}

export default function AmountInput({ value, onChange, style, className = '', prefix = '₱', ...rest }) {
    const inputRef = useRef(null);
    // Where the caret goes after the commas move: counted in digits/dots, not commas
    const caretRef = useRef(null);
    const raw = cleanAmount(value);
    const shown = formatAmount(raw);

    useLayoutEffect(() => {
        const input = inputRef.current;
        if (caretRef.current === null || !input || document.activeElement !== input) return;
        let seen = 0;
        let pos = 0;
        while (pos < shown.length && seen < caretRef.current) {
            if (shown[pos] !== ',') seen += 1;
            pos += 1;
        }
        input.setSelectionRange(pos, pos);
        caretRef.current = null;
    }, [shown]);

    const handleChange = (e) => {
        const typed = e.target.value;
        const caret = e.target.selectionStart ?? typed.length;
        caretRef.current = cleanAmount(typed.slice(0, caret)).length;
        onChange(cleanAmount(typed));
    };

    return (
        <div style={wrap}>
            <span style={prefixStyle} aria-hidden="true">{prefix}</span>
            <input
                {...rest}
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={shown}
                onChange={handleChange}
                className={className}
                style={{ ...style, paddingLeft: '2rem', fontVariantNumeric: 'tabular-nums' }}
            />
        </div>
    );
}

const wrap = {
    position: 'relative',
    width: '100%',
};

const prefixStyle = {
    position: 'absolute',
    left: '0.8rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#7a837e',
    fontWeight: 600,
    fontSize: '0.9375rem',
    pointerEvents: 'none',
};
