// Starting rows for the supplier materials PDF, built from an approved
// quotation's price lines (solar_computation.line_items). The admin can
// edit, remove or add rows before downloading; nothing is saved.
// Only single products are added: the inverter, panels and batteries.
// The mounting kit and safety devices are sets in the quote, and their
// individual parts per package are still to come from the client, so the
// admin adds those parts from the product list. Installation labour is a
// service, not a material, so it's left out too.
import { productByCode, categoryOf, CATEGORIES } from '../services/productCatalog';

// The rows as the supplier sees them (PDF and Messenger message): named
// rows only, each with its category, grouped by category in the order of
// CATEGORIES. Rows in the same category keep the admin's order.
export function supplierRows(materials) {
    return materials
        .filter((m) => m.name.trim())
        .map((m, index) => ({ ...m, category: categoryOf(m.name), index }))
        .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.index - b.index)
        .map(({ index: _index, ...m }) => m);
}

let nextId = 1;

// One editable row of the materials table
export const materialRow = (fields = {}) => ({
    id: nextId++,
    name: '',
    quantity: 1,
    unit: '',
    ...fields,
});

// A row for a product from the price list, named exactly as on the list
// (the supplier's own wording). The quote's product code only finds the
// product; the supplier list leaves codes out. Falls back to our own name,
// with its size in it, when the code isn't on the list (e.g. quotations
// saved before a product was added).
const productRow = (code, quantity, fallbackName) => {
    const product = productByCode(code);
    return materialRow(product
        ? { name: product.name, unit: product.unit, quantity }
        : { name: fallbackName, unit: 'each', quantity });
};

const named = (...parts) => parts.filter(Boolean).join(' ');

export function materialsFromComputation(computation) {
    const items = computation?.line_items ?? [];
    const rows = [];

    items.forEach((item) => {
        switch (item.key) {
            case 'inverter':
                rows.push(productRow(item.sku, item.qty, named(
                    'Hybrid inverter',
                    computation.package_kw && `${computation.package_kw} kW`,
                    computation.inverter_brand,
                )));
                break;
            case 'panels':
                rows.push(productRow(item.sku, item.qty, 'Solar panel 610 W bifacial'));
                break;
            case 'battery':
                rows.push(productRow(item.sku, item.qty,
                    `Battery 51.2 V ${computation.battery_ah ?? computation.battery_capacity_ah} Ah`));
                break;
            case 'battery_extra':
                rows.push(productRow(item.sku, item.qty, `Battery 51.2 V ${computation.extra_battery_ah} Ah`));
                break;
            default:
                // Mounting kit and safety devices (sets), installation
                // labour, and anything unknown
                break;
        }
    });

    // Older quotations have no price lines; start with one empty row
    return rows.length ? rows : [materialRow()];
}
