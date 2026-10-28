// Starting rows for the supplier materials PDF, built from an approved
// quotation's price lines (solar_computation.line_items). The admin can
// edit, remove or add rows before downloading; nothing is saved.
// Installation labour is a service, not a material, so it's left out.
import { productByCode } from '../services/productCatalog';

let nextId = 1;

// One editable row of the materials table
export const materialRow = (fields = {}) => ({
    id: nextId++,
    name: '',
    specification: '',
    code: '',
    quantity: 1,
    unit: '',
    ...fields,
});

// A row for a product from the price list, named exactly as on the list
// (the supplier's own wording). Falls back to our own name when the code
// isn't on the list (e.g. quotations saved before a product was added).
const productRow = (code, quantity, fallback) => {
    const product = productByCode(code);
    return materialRow(product
        ? { name: product.name, code: product.code, unit: product.unit, quantity }
        : { ...fallback, code: code ?? '', quantity });
};

export function materialsFromComputation(computation) {
    const items = computation?.line_items ?? [];
    const rows = [];

    items.forEach((item) => {
        switch (item.key) {
            case 'inverter':
                rows.push(productRow(item.sku, item.qty, {
                    name: 'Hybrid inverter',
                    specification: [computation.package_kw && `${computation.package_kw} kW`, computation.inverter_brand]
                        .filter(Boolean).join(', '),
                    unit: 'each',
                }));
                break;
            case 'panels':
                rows.push(productRow(item.sku, item.qty, {
                    name: 'Solar panel',
                    specification: '610 W bifacial',
                    unit: 'each',
                }));
                break;
            case 'battery':
                rows.push(productRow(item.sku, item.qty, {
                    name: 'Battery',
                    specification: `${computation.battery_ah ?? computation.battery_capacity_ah} Ah, 51.2 V`,
                    unit: 'each',
                }));
                break;
            case 'battery_extra':
                rows.push(productRow(item.sku, item.qty, {
                    name: 'Additional battery',
                    specification: `${computation.extra_battery_ah} Ah, 51.2 V`,
                    unit: 'each',
                }));
                break;
            // The two "complete set" lines have no product code yet: the
            // client's parts list for them is still to come. The admin can
            // swap each for the individual parts from the product list.
            case 'mounting':
                rows.push(materialRow({
                    name: 'Mounting kit (complete set)',
                    specification: 'Rails, clamps and roof brackets (per panel)',
                    quantity: item.qty,
                    unit: 'sets',
                }));
                break;
            case 'safety':
                rows.push(materialRow({
                    name: 'Safety devices and cables (complete set)',
                    specification: 'Breakers, surge protection, cables and earthing',
                    quantity: item.qty,
                    unit: 'set',
                }));
                break;
            default:
                // Installation labour and anything unknown: not a material
                break;
        }
    });

    // Older quotations have no price lines; start with one empty row
    return rows.length ? rows : [materialRow()];
}
