// Starting rows for the supplier materials PDF, built from an approved
// quotation's price lines (solar_computation.line_items). The admin can
// edit, remove or add rows before downloading; nothing is saved.
// Installation labour is a service, not a material, so it's left out.

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

export function materialsFromComputation(computation) {
    const items = computation?.line_items ?? [];
    const rows = [];

    items.forEach((item) => {
        switch (item.key) {
            case 'inverter':
                rows.push(materialRow({
                    name: 'Hybrid inverter',
                    specification: [computation.package_kw && `${computation.package_kw} kW`, computation.inverter_brand]
                        .filter(Boolean).join(', '),
                    code: item.sku ?? '',
                    quantity: item.qty,
                    unit: 'unit',
                }));
                break;
            case 'panels':
                rows.push(materialRow({
                    name: 'Solar panel',
                    specification: 'Canadian 610 W bifacial',
                    code: item.sku ?? '',
                    quantity: item.qty,
                    unit: 'pcs',
                }));
                break;
            case 'battery':
                rows.push(materialRow({
                    name: 'Battery',
                    specification: `${computation.battery_ah ?? computation.battery_capacity_ah} Ah, 51.2 V`,
                    code: item.sku ?? '',
                    quantity: item.qty,
                    unit: item.qty > 1 ? 'units' : 'unit',
                }));
                break;
            case 'battery_extra':
                rows.push(materialRow({
                    name: 'Additional battery',
                    specification: `${computation.extra_battery_ah} Ah, 51.2 V`,
                    code: item.sku ?? '',
                    quantity: item.qty,
                    unit: 'unit',
                }));
                break;
            case 'mounting':
                rows.push(materialRow({
                    name: 'Mounting kit',
                    specification: 'Rails, clamps and roof brackets (per panel)',
                    quantity: item.qty,
                    unit: 'sets',
                }));
                break;
            case 'safety':
                rows.push(materialRow({
                    name: 'Safety devices',
                    specification: 'Breakers, surge protection and earthing',
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
