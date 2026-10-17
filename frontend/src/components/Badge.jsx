import { statusColors } from '../styles/theme';

// Status pill used on every page, so a status looks the same everywhere.
//   status  key in statusColors, e.g. 'pending', 'approved', 'out_of_stock'
//   label   text to show instead of the status ('out_of_stock' → 'Out of stock' by default)
export default function Badge({ status, label }) {
    const { bg, text, border } = statusColors[status] || statusColors.draft;

    return (
        <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            backgroundColor: bg,
            color: text,
            border: `1px solid ${border}`,
        }}>
            {label || (status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '')}
        </span>
    );
}
