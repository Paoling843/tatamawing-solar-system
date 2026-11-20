import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../api/axios';
import { adminTokens } from '../styles/adminTheme';
import { errorMessage } from '../utils/errorMessage';

// The materials lists already sent to suppliers for one quotation (saved by
// "Copy & save" and "Download PDF"). One per day; sending again the same day
// replaces it. A wrong or outdated one can be deleted so the Procurement
// report stays right.
//
// refreshKey: changes after a new send, so the list reloads

const formatDate = (value) => (value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—');

export default function PurchaseRequestsCard({ quotationId, refreshKey = 0 }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/admin/quotations/${quotationId}/purchase-requests`);
            setRequests(res.data.purchase_requests ?? []);
            setError('');
        } catch (err) {
            setError(errorMessage(err, "Couldn't load the purchase requests. Please try again."));
        } finally {
            setLoading(false);
        }
    }, [quotationId]);

    useEffect(() => {
        // Start in a microtask so the state updates land after this effect returns
        Promise.resolve().then(load);
    }, [load, refreshKey]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/purchase-requests/${deleteTarget.id}`);
            setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            setError('');
        } catch (err) {
            setError(errorMessage(err, "Couldn't delete the purchase request. Please try again."));
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    return (
        <section id="purchase-requests" style={styles.card}>
            <h2 style={styles.title}>Purchase requests sent</h2>
            <p style={styles.sub}>
                Saved when you use Copy &amp; save or Download PDF, and listed in the Procurement report.
            </p>

            {error && <div role="alert" style={styles.error}>{error}</div>}

            {loading ? (
                <p style={styles.empty}>Loading…</p>
            ) : requests.length === 0 ? (
                <p style={styles.empty}>None sent yet.</p>
            ) : (
                <ul style={styles.list}>
                    {requests.map((pr) => {
                        const open = openId === pr.id;
                        const itemCount = pr.items?.length ?? 0;
                        return (
                            <li key={pr.id} style={styles.item}>
                                <div style={styles.itemHead}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(open ? null : pr.id)}
                                        aria-expanded={open}
                                        style={styles.toggle}
                                    >
                                        <span style={styles.date}>{formatDate(pr.request_date)}</span>
                                        <span style={styles.meta}>
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                            {' · '}
                                            {pr.deliver_to === 'site' ? 'To site' : 'To TataMawing'}
                                            {pr.sent_by?.name ? ` · ${pr.sent_by.name}` : ''}
                                        </span>
                                        <span style={styles.chevron} aria-hidden="true">{open ? '▴' : '▾'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(pr)}
                                        style={styles.deleteBtn}
                                        aria-label={`Delete the purchase request from ${formatDate(pr.request_date)}`}
                                    >
                                        Delete
                                    </button>
                                </div>

                                {open && (
                                    <div style={styles.details}>
                                        <ul style={styles.materials}>
                                            {(pr.items ?? []).map((item) => (
                                                <li key={item.id} style={styles.material}>
                                                    <span style={{ minWidth: 0 }}>{item.material_name}</span>
                                                    <strong style={{ whiteSpace: 'nowrap' }}>{item.quantity} {item.unit || ''}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                        {pr.delivery_address && <p style={styles.detailLine}>Deliver to: {pr.delivery_address}</p>}
                                        {pr.needed_by && <p style={styles.detailLine}>Needed by: {formatDate(pr.needed_by)}</p>}
                                        {pr.notes && <p style={{ ...styles.detailLine, whiteSpace: 'pre-wrap' }}>Notes: {pr.notes}</p>}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete this purchase request?"
                message={deleteTarget
                    ? `The list from ${formatDate(deleteTarget.request_date)} will be removed from the Procurement report. It doesn't unsend anything on Messenger.`
                    : ''}
                confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                danger
                busy={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </section>
    );
}

const styles = {
    card: {
        background: '#FFFFFF', border: `1px solid ${adminTokens.line}`, borderRadius: adminTokens.radius, padding: '16px 20px',
    },
    title: { margin: 0, fontSize: '16px', fontWeight: 700, color: adminTokens.ink },
    sub: { margin: '4px 0 12px', fontSize: '13px', color: adminTokens.muted, lineHeight: 1.45 },
    empty: { margin: 0, fontSize: '14px', color: adminTokens.subtle },
    error: {
        margin: '0 0 10px', padding: '8px 10px', borderRadius: '6px', background: '#FFF4F2',
        border: '1px solid #E8C4BF', color: '#8A2A1E', fontSize: '13px',
    },
    list: { listStyle: 'none', margin: 0, padding: 0 },
    item: { borderTop: `1px solid ${adminTokens.hairline}` },
    itemHead: { display: 'flex', alignItems: 'center', gap: '8px' },
    toggle: {
        flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 10px',
        padding: '10px 0', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
        font: 'inherit', color: adminTokens.ink,
    },
    date: { fontWeight: 700, fontSize: '14px' },
    meta: { fontSize: '13px', color: adminTokens.muted },
    chevron: { marginLeft: 'auto', color: adminTokens.subtle, fontSize: '12px' },
    deleteBtn: {
        flex: 'none', padding: '5px 10px', background: 'none', border: `1px solid ${adminTokens.control}`,
        borderRadius: '6px', color: adminTokens.danger, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    },
    details: { padding: '0 0 12px' },
    materials: { listStyle: 'none', margin: 0, padding: '8px 10px', background: '#F7F7F4', borderRadius: '6px' },
    material: {
        display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '3px 0', fontSize: '13px', color: adminTokens.body,
    },
    detailLine: { margin: '6px 0 0', fontSize: '13px', color: adminTokens.body },
};
