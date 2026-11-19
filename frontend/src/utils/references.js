// Reference numbers shown to admins and customers. Kept in one place so a
// quotation reads the same on every page.

// The server stores each record's year and number (restarting at 0001 every
// January) and sends the finished reference as `reference`. The fallback is
// only for data from before the server sent it.
const formatRef = (kind, record) => {
    if (!record) return '';
    if (record.reference) return record.reference;
    const year = new Date(record.created_at).getFullYear();
    return `TMS-${kind}-${year}-${String(record.id).padStart(4, '0')}`;
};

// Quotation request: TMS-QT-2026-0049
export const formatQuotationRef = (request) => formatRef('QT', request);

// External installation request: TMS-EXT-2026-0003
export const formatExternalRef = (request) => formatRef('EXT', request);

// Installation schedule: TMS-INS-2026-0003
export const formatScheduleRef = (schedule) => formatRef('INS', schedule);
