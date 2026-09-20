// =====================================================================
// Solar Computation Engine (frontend)
// =====================================================================
// Every solar formula the React pages use lives in this one file, so the
// numbers on Step 1, Step 2 and Step 3 always agree with each other.
//
// These are plain functions with no React inside, which makes them easy to
// read and to test on their own.
//
// The backend has the SAME formulas in
//   backend/app/Services/SolarComputationService.php
// The browser uses this file to update the screen instantly while the
// customer types. When the quotation is submitted, the server recomputes
// everything itself, so nobody can change a price by editing the browser.
// If you change a constant or a formula here, change it there too.
// =====================================================================

// ---------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------

// Flat safety buffer added once to the household's grand total (Wh)
export const BUFFER_WH = 2000;

// Loads under this adjusted total always get the smallest package
export const SMALL_LOAD_FLOOR_WH = 3000;

// Aircon and water pump wattage is derived from horsepower: hp × 800 W
export const WATTS_PER_HP = 800;
export const HP_OPTIONS = [0.6, 1, 1.5, 2, 2.5];

// Daytime window (the panels are generating): 08:00 → 16:00
export const DAY_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

// Nighttime window (the battery carries the load): 16:00 → 08:00 next day.
// After midnight we keep counting past 24 (01:00 = 25 … 08:00 = 32), so the
// "to" hour is always bigger than the "from" hour and hours = to − from.
export const NIGHT_SLOTS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// Appliance dropdown. hp: true means the wattage comes from horsepower.
export const APPLIANCES = [
    { id: 'aircon', label: 'Aircon', hp: true },
    { id: 'water_pump', label: 'Water pump', hp: true },
    { id: 'induction_cooker', label: 'Induction Cooker', hp: false },
    { id: 'water_heater', label: 'Water Heater', hp: false },
    { id: 'freezer', label: 'Freezer', hp: false },
    { id: 'shower_heater', label: 'Shower Heater', hp: false },
    { id: 'other', label: 'Other appliance', hp: false },
];

// Hybrid inverter packages, smallest first.
//   watts        → the most adjusted Wh this package is recommended for
//   panelDefault → panels that ship with the package (the minimum)
//   panelMax     → most panels the package accepts
//   inverter     → inverter price (₱)
//   safety       → safety devices price (₱), flat per package
export const PACKAGES = [
    { kw: 5, watts: 5000, panelDefault: 4, panelMax: 12, inverter: 49000, sku: 'tm-0076', brand: 'SOLIS', safety: 20000 },
    { kw: 6, watts: 6000, panelDefault: 7, panelMax: 14, inverter: 63000, sku: 'tm-0110', brand: 'DEYE', safety: 20000 },
    { kw: 8, watts: 8000, panelDefault: 10, panelMax: 18, inverter: 119000, sku: 'tm-0029', brand: 'DEYE', safety: 20000 },
    { kw: 10, watts: 10000, panelDefault: 14, panelMax: 22, inverter: 140000, sku: 'tm-0031', brand: 'DEYE', safety: 25000 },
    { kw: 12, watts: 12000, panelDefault: 18, panelMax: 26, inverter: 154000, sku: 'tm-0102', brand: 'DEYE', safety: 25000 },
];

// Solar panel: Canadian 610 W bifacial
export const PANEL_WATTS = 610;
export const PANEL_PRICE = 8260;
export const PANEL_SKU = 'tm-0040';

// Per-panel costs that grow with the number of panels chosen
export const INSTALL_PER_PANEL = 5000;
export const MOUNT_PER_PANEL = 2500;

// Batteries (51.2 V). Only Ah and price are stored — Wh is always computed.
export const BATTERIES = [
    { ah: 100, price: 57400, sku: 'tm-0049' },
    { ah: 205, price: 112000, sku: 'tm-0048' },
    { ah: 280, price: 102200, sku: 'tm-0111' },
    { ah: 314, price: 166600, sku: 'tm-0108' },
];

// Usable Wh per Ah. 40.96 = 51.2 V × 0.8, i.e. 80% of the stored energy is
// counted as usable.
export const BATTERY_WH_PER_AH = 40.96;

// ---------------------------------------------------------------------
// SMALL HELPERS
// ---------------------------------------------------------------------

// Turns a text field value into a number. Empty, invalid or negative → 0.
export function toNumber(value) {
    const n = parseFloat(value);
    return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function findAppliance(id) {
    return APPLIANCES.find((a) => a.id === id) || APPLIANCES[0];
}

export function usesHp(applianceId) {
    return findAppliance(applianceId).hp;
}

// Hours between two clock hours, or 0 if either is missing or "to" is not
// after "from".
export function span(from, to) {
    const a = parseFloat(from);
    const b = parseFloat(to);
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
    return b - a;
}

// ---------------------------------------------------------------------
// STEP 1–2: LOAD
// ---------------------------------------------------------------------

// A row object looks like the Step 1 form:
//   { appliance, customName, hp, watts, qty, dayFrom, dayTo, nightFrom, nightTo }

// Watts for ONE unit: hp × 800 for aircon/water pump, otherwise the typed watts.
export function unitWatts(row) {
    return usesHp(row.appliance) ? toNumber(row.hp) * WATTS_PER_HP : toNumber(row.watts);
}

// Display name: the dropdown label, or the custom name for "Other".
export function applianceName(row) {
    if (row.appliance === 'other') {
        return row.customName?.trim() || findAppliance('other').label;
    }
    return findAppliance(row.appliance).label;
}

// Energy for one appliance row:
//   row_watts = watts × qty
//   day_wh    = row_watts × daytime hours
//   night_wh  = row_watts × nighttime hours
export function computeRow(row) {
    const watts = unitWatts(row);
    const qty = Math.max(0, Math.round(toNumber(row.qty)));
    const rowWatts = watts * qty;
    const dayHours = span(row.dayFrom, row.dayTo);
    const nightHours = span(row.nightFrom, row.nightTo);

    return {
        name: applianceName(row),
        usesHp: usesHp(row.appliance),
        watts,
        qty,
        rowWatts,
        dayHours,
        nightHours,
        dayWh: rowWatts * dayHours,
        nightWh: rowWatts * nightHours,
    };
}

// Household totals (the Step 2 ledger):
//   TOTAL DAYTIME   = sum of day_wh
//   TOTAL NIGHTTIME = sum of night_wh
//   GRAND TOTAL     = day + night
//   ADJUSTED TOTAL  = grand + 2,000 buffer
export function computeLoad(rows) {
    const computed = rows.map(computeRow);
    const day = computed.reduce((sum, r) => sum + r.dayWh, 0);
    const night = computed.reduce((sum, r) => sum + r.nightWh, 0);
    const grand = day + night;

    return { rows: computed, day, night, grand, adjusted: grand + BUFFER_WH };
}

// A row is ready when it has a quantity, and a wattage if it isn't an HP appliance.
export function isRowComplete(row) {
    return toNumber(row.qty) > 0 && (usesHp(row.appliance) || toNumber(row.watts) > 0);
}

// ---------------------------------------------------------------------
// STEP 3: RECOMMENDATION
// ---------------------------------------------------------------------

// Index (in PACKAGES) of the recommended inverter package:
//   - under 3,000 Wh → the smallest package
//   - otherwise → the first package whose watts cover the adjusted total
//   - bigger than every package → the largest (flagged for an engineer)
export function recommendPackageIndex(adjustedWh) {
    if (adjustedWh < SMALL_LOAD_FLOOR_WH) return 0;
    const index = PACKAGES.findIndex((p) => p.watts >= adjustedWh);
    return index < 0 ? PACKAGES.length - 1 : index;
}

// True when the adjusted load is more than the largest package can carry.
export function exceedsLargestPackage(adjustedWh) {
    return adjustedWh > PACKAGES[PACKAGES.length - 1].watts;
}

// Usable Wh of a battery: ah × 40.96.
// Worked out as ah × 4096 ÷ 100 so the result is exact — in JavaScript,
// 280 * 40.96 gives 11468.800000000001 instead of 11468.8.
export function batteryWh(ah) {
    return (ah * 4096) / 100;
}

// Index (in BATTERIES) of the default battery: the smallest one whose usable
// Wh is at least the nighttime load. If none is big enough, the largest.
// This is only the default — the customer can still pick any battery.
export function recommendBatteryIndex(nightWh) {
    const index = BATTERIES.findIndex((b) => batteryWh(b.ah) >= nightWh);
    return index < 0 ? BATTERIES.length - 1 : index;
}

// One-sentence explanation of why the package was recommended
export function recommendationReason(adjustedWh) {
    const largest = PACKAGES[PACKAGES.length - 1];

    if (adjustedWh < SMALL_LOAD_FLOOR_WH) {
        return `The adjusted load of ${formatWhole(adjustedWh)} Wh sits under the 3,000 Wh floor, so the smallest package we install applies.`;
    }
    if (exceedsLargestPackage(adjustedWh)) {
        return `At ${formatWhole(adjustedWh)} Wh the adjusted load sits above the largest package we currently offer, so the ${largest.kw} kW is recommended and an engineer will confirm whether a larger tier is needed.`;
    }
    const recommended = PACKAGES[recommendPackageIndex(adjustedWh)];
    return `${formatWhole(adjustedWh)} Wh of adjusted load is the first figure the ${recommended.kw} kW package covers without running at its limit.`;
}

// Every allowed panel count for a package: default, default + 1, … max
export function panelOptions(pkg) {
    return Array.from({ length: pkg.panelMax - pkg.panelDefault + 1 }, (_, k) => pkg.panelDefault + k);
}

// Array size in kWp: panels × 610 W ÷ 1000
export function arrayKwp(panels) {
    return (panels * PANEL_WATTS) / 1000;
}

// Turns the customer's saved choices into a valid selection. A choice that
// isn't allowed any more (e.g. the load grew and the package is now below
// the recommended one) falls back to the default, exactly like the prototype.
//   choice = { pkg: index | null, panels: number | null, battery: index | null }
export function resolveSelection(load, choice) {
    const recommendedPkgIndex = recommendPackageIndex(load.adjusted);
    const pkgIndex = choice.pkg !== null && choice.pkg >= recommendedPkgIndex ? choice.pkg : recommendedPkgIndex;
    const pkg = PACKAGES[pkgIndex];

    const panels = choice.panels !== null && choice.panels >= pkg.panelDefault && choice.panels <= pkg.panelMax
        ? choice.panels
        : pkg.panelDefault;

    const recommendedBatteryIndex = recommendBatteryIndex(load.night);
    const batteryIndex = choice.battery !== null ? choice.battery : recommendedBatteryIndex;

    return {
        recommendedPkgIndex,
        pkgIndex,
        pkg,
        panels,
        recommendedBatteryIndex,
        batteryIndex,
        battery: BATTERIES[batteryIndex],
    };
}

// ---------------------------------------------------------------------
// STEP 3: ITEMIZED QUOTE
// ---------------------------------------------------------------------

// Price lines for a package + panel count + battery:
//   Inverter            = package inverter price (flat)
//   Solar panels        = 8,260 × panels
//   Installation labour = 5,000 × panels
//   Mounting kit        = 2,500 × panels
//   Safety devices      = package safety price (flat, does NOT scale with panels)
//   Battery storage     = battery price (flat)
export function buildQuote(pkg, panels, battery) {
    const items = [
        {
            key: 'inverter',
            label: `${pkg.kw} kW hybrid inverter`,
            description: `Converts what the panels make into the power your outlets use, and manages the battery. ${pkg.brand}.`,
            sku: pkg.sku,
            qty: 1,
            qtyLabel: '1 unit',
            unitPrice: pkg.inverter,
            unitLabel: `Set by the ${pkg.kw} kW package`,
            amount: pkg.inverter,
        },
        {
            key: 'panels',
            label: 'Solar panels',
            description: `${panels} bifacial panels rated 610 W each — these go on the roof and generate the electricity.`,
            sku: PANEL_SKU,
            qty: panels,
            qtyLabel: `${panels} panels`,
            unitPrice: PANEL_PRICE,
            unitLabel: `${peso(PANEL_PRICE)} each`,
            amount: PANEL_PRICE * panels,
        },
        {
            key: 'installation',
            label: 'Installation labour',
            description: 'Our crew mounts the panels, runs the wiring and commissions the system.',
            sku: null,
            qty: panels,
            qtyLabel: `${panels} panels`,
            unitPrice: INSTALL_PER_PANEL,
            unitLabel: `${peso(INSTALL_PER_PANEL)} each`,
            amount: INSTALL_PER_PANEL * panels,
        },
        {
            key: 'mounting',
            label: 'Mounting kit',
            description: 'Rails, clamps and roof brackets that hold the panels down.',
            sku: null,
            qty: panels,
            qtyLabel: `${panels} panels`,
            unitPrice: MOUNT_PER_PANEL,
            unitLabel: `${peso(MOUNT_PER_PANEL)} each`,
            amount: MOUNT_PER_PANEL * panels,
        },
        {
            key: 'safety',
            label: 'Safety devices',
            description: 'Breakers, surge protection and earthing so the system shuts down safely.',
            sku: null,
            qty: 1,
            qtyLabel: '1 set',
            unitPrice: pkg.safety,
            unitLabel: `Set by the ${pkg.kw} kW package`,
            amount: pkg.safety,
        },
        {
            key: 'battery',
            label: 'Battery storage',
            description: `${battery.ah} Ah at 51.2 V — stores daytime power so you can use it at night.`,
            sku: battery.sku,
            qty: 1,
            qtyLabel: '1 unit',
            unitPrice: battery.price,
            unitLabel: '',
            amount: battery.price,
        },
    ];

    return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

// ---------------------------------------------------------------------
// TIME AND MONTH HELPERS
// ---------------------------------------------------------------------

// 24-hour label: 8 → "08:00", 25 → "01:00"
export function clock24(hour) {
    const h = ((hour % 24) + 24) % 24;
    return `${String(h).padStart(2, '0')}:00`;
}

// 12-hour label for display only: 8 → "8:00 AM", 16 → "4:00 PM".
// The value that is saved and submitted always stays on the 24-hour scale.
export function clock12(hour) {
    const h = ((hour % 24) + 24) % 24;
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${suffix}`;
}

export function formatHour(hour, timeFormat) {
    return timeFormat === '12' ? clock12(hour) : clock24(hour);
}

// "2026-03" → "2026-02" (the month immediately before). "" if invalid.
export function prevMonth(period) {
    if (!/^\d{4}-\d{2}$/.test(period)) return '';
    let [year, month] = period.split('-').map(Number);
    month -= 1;
    if (month === 0) {
        month = 12;
        year -= 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}

// "2026-03" → "March 2026"
export function monthLabel(period) {
    if (!/^\d{4}-\d{2}$/.test(period)) return '';
    const [year, month] = period.split('-').map(Number);
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    return `${names[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------
// NUMBER FORMATTING
// ---------------------------------------------------------------------

// 12345.6 → "12,346"
export function formatWhole(n) {
    return Math.round(n).toLocaleString('en-PH');
}

// 8.54 → "8.54", 8 → "8"
export function formatDecimal(n) {
    return n.toLocaleString('en-PH', { maximumFractionDigits: 2 });
}

// 408600 → "₱408,600"
export function peso(n) {
    return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

// ---------------------------------------------------------------------
// SUBMISSION
// ---------------------------------------------------------------------

// Converts the page state into what POST /api/quotation-requests expects.
// Only raw inputs and choices are sent — the server computes the totals.
export function buildSubmitPayload(rows, bills, selection) {
    const hourOrNull = (value) => (value === '' ? null : Number(value));
    const numberOrNull = (value) => (value === '' ? null : Number(value));

    return {
        appliances: rows.map((row) => {
            const hp = usesHp(row.appliance);
            return {
                appliance_type: row.appliance,
                custom_name: row.appliance === 'other' ? row.customName.trim() || null : null,
                hp: hp ? Number(row.hp) : null,
                watts: hp ? null : Number(row.watts),
                qty: Number(row.qty),
                day_from: hourOrNull(row.dayFrom),
                day_to: hourOrNull(row.dayTo),
                night_from: hourOrNull(row.nightFrom),
                night_to: hourOrNull(row.nightTo),
            };
        }),
        bills: bills.map((bill) => ({
            billing_month: bill.period || null,
            amount: numberOrNull(bill.amount),
            kwh: numberOrNull(bill.kwh),
        })),
        package_kw: selection.pkg.kw,
        panel_count: selection.panels,
        battery_ah: selection.battery.ah,
    };
}
