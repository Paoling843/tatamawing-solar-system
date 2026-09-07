import { statusColors } from '../styles/theme';

export default function Badge({ status, label }) {
    const { bg, text } = statusColors[status] || statusColors.draft;
    
    return (
        <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: bg,
            color: text,
        }}>
            {label || (status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '')}
        </span>          
    );
}