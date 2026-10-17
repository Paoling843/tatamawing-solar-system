// Reference numbers shown to admins and customers. Kept in one place so a
// quotation or order reads the same on every page.

// Quotation request: #Q-2026-049
export const formatQuotationRef = (id, createdAt) =>
    `#Q-${new Date(createdAt).getFullYear()}-${String(id).padStart(3, '0')}`;

// Purchase request: ORD-00049
export const formatOrderRef = (id) => `ORD-${String(id).padStart(5, '0')}`;

// External installation request: #EXT-049
export const formatExternalRef = (id) => `#EXT-${String(id).padStart(3, '0')}`;
