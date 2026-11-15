import { adminUi, statusLabel } from '../styles/adminTheme';

// The admin pages' status label (square-ish, as in the admin mockups).
// Same props as <Badge>, which the customer pages keep using.
//   status  e.g. 'pending', 'approved', 'scheduled'
//   label   text to show instead of the status name
export default function StatusPill({ status, label, style }) {
    return <span style={{ ...adminUi.statusPill(status), ...style }}>{label || statusLabel(status)}</span>;
}
