// How a quotation's price, system type and age are worded. Shared by the
// admin Quotations panel, the Overview drawer and the detail page so the
// same quotation reads the same everywhere.

// ₱408,600.00
export const formatPeso = (amount) =>
    '₱' + (parseFloat(amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The engine's price until an admin approves it, then the approved total
export const quotationPrice = (q) =>
    parseFloat(q.quotation?.total_amount ?? q.solar_computation?.estimated_cost ?? 0) || 0;

export const priceLabel = (q) => (q.quotation ? 'Approved total' : 'Estimate');

// "hybrid" → "Hybrid", "off-grid" → "Off grid"
export const systemTypeLabel = (type) => {
    if (!type) return '—';
    const words = type.replace('-', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
};

// "Today", "1 day ago", "12 days ago"
export const daysAgoLabel = (days) => {
    if (days === 0) return 'Today';
    return `${days} day${days === 1 ? '' : 's'} ago`;
};
