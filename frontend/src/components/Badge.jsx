import { statusColors } from '../styles/theme';

// Status pill used on every page, so a status looks the same everywhere.
//   status  key in statusColors, e.g. 'pending', 'approved', 'out_of_stock'
//   label   text to show instead of the status ('out_of_stock' → 'Out of stock' by default)
export default function Badge({ status, label }) {
    const { bg, text, border } = statusColors[status] || statusColors.draft;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            backgroundColor: bg,
            color: text,
            border: `1px solid ${border}`,
        }}>
            <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, backgroundColor: text }} />
            {label || (status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '')}
        </span>
    );
}
