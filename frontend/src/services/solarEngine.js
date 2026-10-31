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

// Flat safety buffer added once to the household's total load (W)
// to get the inverter size
export const INVERTER_BUFFER_W = 2000;

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
//   watts        → the largest inverter size (W) this package is recommended for
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

// Savings estimate (the client's formula).
// SORECO's rate, used when the customer's bills don't give both amount and kWh (₱/kWh)
export const DEFAULT_RATE_PER_KWH = 13;
// Peak sun hours per day (the client's figure for Bulan)
export const PEAK_SUN_HOURS = 6;
// Share of the panels' output counted, since heavy clouds sometimes block the sun
export const SYSTEM_DERATE = 0.8;
export const DAYS_PER_MONTH = 30;
// Years the system is expected to keep saving (typical panel warranty)
export const SYSTEM_LIFE_YEARS = 25;

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
//   TOTAL LOAD      = sum of row watts (every appliance running at once)
//   INVERTER SIZE   = total load + 2,000 W buffer
export function computeLoad(rows) {
    const computed = rows.map(computeRow);
    const day = computed.reduce((sum, r) => sum + r.dayWh, 0);
    const night = computed.reduce((sum, r) => sum + r.nightWh, 0);
    const totalLoad = computed.reduce((sum, r) => sum + r.rowWatts, 0);

    return {
        rows: computed,
        day,
        night,
        grand: day + night,
        totalLoad,
        inverterSize: totalLoad + INVERTER_BUFFER_W,
    };
}

// A row is ready when it has a quantity, and a wattage if it isn't an HP appliance.
export function isRowComplete(row) {
    return toNumber(row.qty) > 0 && (usesHp(row.appliance) || toNumber(row.watts) > 0);
}

// ---------------------------------------------------------------------
// STEP 3: RECOMMENDATION
// ---------------------------------------------------------------------

// Index (in PACKAGES) of the recommended inverter package: the first package
// whose watts cover the inverter size. Bigger than every package → the
// largest (flagged for an engineer).
export function recommendPackageIndex(inverterSize) {
    const index = PACKAGES.findIndex((p) => p.watts >= inverterSize);
    return index < 0 ? PACKAGES.length - 1 : index;
}

// True when the inverter size is more than the largest package can carry.
export function exceedsLargestPackage(inverterSize) {
    return inverterSize > PACKAGES[PACKAGES.length - 1].watts;
}

// Panels the inverter size calls for: inverter size ÷ 610 W, rounded down
export function panelsForInverterSize(inverterSize) {
    return Math.floor(inverterSize / PANEL_WATTS);
}

// Recommended panel count for a package: panelsForInverterSize(), kept
// inside the package's panel range (panelDefault–panelMax)
export function recommendPanelCount(inverterSize, pkg) {
    return Math.max(pkg.panelDefault, Math.min(pkg.panelMax, panelsForInverterSize(inverterSize)));
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

// The battery bank the night needs, when the largest battery (314 Ah) is
// picked and one unit can't cover the nighttime load:
//   - as many full 314 Ah units as fit the night (rounded down), then
//   - the cheapest battery that covers what's left over.
// e.g. 15,000 Wh → 314 Ah + 100 Ah; 21,520 Wh → 314 Ah + 280 Ah.
// If the left-over needs another 314 Ah, it's counted as one more unit
// instead (25,000 Wh → 2 × 314 Ah). Any other battery is a single unit.
//   returns { qty: units of battery, extra: the added battery or null }
export function batteryBank(battery, nightWh) {
    const largest = BATTERIES[BATTERIES.length - 1];
    const unitWh = batteryWh(battery.ah);
    if (battery.ah !== largest.ah || nightWh <= unitWh) return { qty: 1, extra: null };

    const qty = Math.floor(nightWh / unitWh);
    const leftOverWh = nightWh - qty * unitWh;
    if (leftOverWh <= 0) return { qty, extra: null };

    // Cheapest battery that holds the left-over (the 280 Ah costs less than the 205 Ah)
    const extra = BATTERIES
        .filter((b) => batteryWh(b.ah) >= leftOverWh)
        .reduce((best, b) => (best === null || b.price < best.price ? b : best), null);

    return extra.ah === largest.ah ? { qty: qty + 1, extra: null } : { qty, extra };
}

// Usable Wh of a whole bank: the main battery × its units, plus the extra one
export function bankWh(battery, bank) {
    return batteryWh(battery.ah) * bank.qty + (bank.extra ? batteryWh(bank.extra.ah) : 0);
}

// "314 Ah", "2 × 314 Ah" or "314 Ah + 100 Ah"
export function bankLabel(battery, bank) {
    const main = bank.qty > 1 ? `${bank.qty} × ${battery.ah} Ah` : `${battery.ah} Ah`;
    return bank.extra ? `${main} + ${bank.extra.ah} Ah` : main;
}

// The explanation of why a package was recommended is RecommendationReason
// in pages/quote-builder/ReasonText.jsx (it needs bold text, so it's JSX)

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
    const recommendedPkgIndex = recommendPackageIndex(load.inverterSize);
    const pkgIndex = choice.pkg !== null && choice.pkg >= recommendedPkgIndex ? choice.pkg : recommendedPkgIndex;
    const pkg = PACKAGES[pkgIndex];

    const recommendedPanels = recommendPanelCount(load.inverterSize, pkg);
    const panels = choice.panels !== null && choice.panels >= pkg.panelDefault && choice.panels <= pkg.panelMax
        ? choice.panels
        : recommendedPanels;

    const recommendedBatteryIndex = recommendBatteryIndex(load.night);
    const batteryIndex = choice.battery !== null ? choice.battery : recommendedBatteryIndex;
    const battery = BATTERIES[batteryIndex];
    // Full 314 Ah units + an extra battery, only for a 314 Ah on a big night load
    const bank = batteryBank(battery, load.night);
    const recommendedBattery = BATTERIES[recommendedBatteryIndex];
    const recommendedBank = batteryBank(recommendedBattery, load.night);

    return {
        recommendedPkgIndex,
        pkgIndex,
        pkg,
        recommendedPanels,
        panels,
        recommendedBatteryIndex,
        recommendedBank,
        recommendedBatteryLabel: bankLabel(recommendedBattery, recommendedBank),
        batteryIndex,
        battery,
        bank,
        batteryLabel: bankLabel(battery, bank),
        // Usable Wh of the whole bank
        batteryWhTotal: bankWh(battery, bank),
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
//   Battery storage     = battery price × units (see batteryBank())
//   Additional battery  = the extra battery's price, when the bank has one
// bank is batteryBank()'s result; without it, one unit of battery.
export function buildQuote(pkg, panels, battery, bank = { qty: 1, extra: null }) {
    const batteryQty = bank.qty;
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
            description: `${bankLabel(battery, { qty: batteryQty, extra: null })} at 51.2 V — stores daytime power so you can use it at night.`,
            sku: battery.sku,
            qty: batteryQty,
            qtyLabel: batteryQty > 1 ? `${batteryQty} units` : '1 unit',
            unitPrice: battery.price,
            unitLabel: batteryQty > 1 ? `${peso(battery.price)} each` : '',
            amount: battery.price * batteryQty,
        },
    ];

    if (bank.extra) {
        items.push({
            key: 'battery_extra',
            label: 'Additional battery',
            description: `${bank.extra.ah} Ah at 51.2 V — covers the rest of the night the main battery can't.`,
            sku: bank.extra.sku,
            qty: 1,
            qtyLabel: '1 unit',
            unitPrice: bank.extra.price,
            unitLabel: '',
            amount: bank.extra.price,
        });
    }

    return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

// ---------------------------------------------------------------------
// STEP 3: SAVINGS ESTIMATE
// ---------------------------------------------------------------------

// Estimated savings for the chosen system — the client's formula.
//
// Daytime first: the panels power the daytime appliances, and what's left
// over charges the battery.
//   production = 610 W × panels × 6 peak hours × 80% (Wh/day)
//   left over  = production − daytime Wh (never below 0)
//
// Nighttime: the battery covers the night up to its size, and only as much
// as the left-over charge allowed. The rest is bought from SORECO.
//   night covered = smaller of (nighttime Wh, battery Wh, left over)
//   grid          = daytime the panels couldn't cover + nighttime not covered (Wh/day)
//   new bill      = grid ÷ 1000 × 30 days × rate
//
// Savings and ROI:
//   savings     = monthly bill − new bill, kept between ₱0 and the bill
//   ROI (years) = total price ÷ monthly savings ÷ 12 months (the payback period)
//   ROA         = annual savings ÷ total price × 100
//   net gain    = savings over 25 years − total price
//
// rate = average amount ÷ kWh of the bills that have both, else SORECO's ₱13.
// Without a bill amount, the bill is estimated as all the appliances' energy
// at that rate (so savings = the energy solar covers × rate); monthlyBill and
// newMonthlyBill then stay null, as no real bill was given.
export function computeSavings(dayWh, nightWh, panels, batteryWhUsable, total, bills) {
    const productionWh = PANEL_WATTS * panels * PEAK_SUN_HOURS * SYSTEM_DERATE;

    // Daytime first; what's left over charges the battery
    const dayCoveredWh = Math.min(dayWh, productionWh);
    const leftOverWh = Math.max(0, productionWh - dayWh);

    // The battery covers the night up to its size and its charge
    const nightCoveredWh = Math.min(nightWh, batteryWhUsable, leftOverWh);
    const gridWh = (dayWh - dayCoveredWh) + (nightWh - nightCoveredWh);

    const productionKwh = (productionWh / 1000) * DAYS_PER_MONTH;
    const usageKwh = ((dayWh + nightWh) / 1000) * DAYS_PER_MONTH;
    const gridKwh = (gridWh / 1000) * DAYS_PER_MONTH;

    const rates = [];
    const amounts = [];

    bills.forEach((bill) => {
        const amount = Number(bill.amount);
        const kwh = Number(bill.kwh);

        if (bill.amount !== '' && amount > 0) {
            amounts.push(amount);
            if (bill.kwh !== '' && kwh > 0) rates.push(amount / kwh);
        }
    });

    const average = (list) => list.reduce((sum, n) => sum + n, 0) / list.length;
    const rate = rates.length ? average(rates) : DEFAULT_RATE_PER_KWH;
    const monthlyBill = amounts.length ? average(amounts) : null;

    // What's still bought from SORECO each month with solar
    const gridCost = gridKwh * rate;

    // No bill entered → estimate it from the appliances at the same rate.
    // Never below ₱0 (when the listed appliances' grid cost is more than the
    // bill); never above the bill, since the grid cost is never negative.
    const billForSavings = monthlyBill ?? usageKwh * rate;
    const monthlySavings = Math.max(0, billForSavings - gridCost);
    const annualSavings = monthlySavings * 12;

    return {
        rate,
        rateSource: rates.length ? 'bill' : 'default',
        productionKwh,
        usageKwh,
        dayCoveredWh,
        leftOverWh,
        nightCoveredWh,
        gridKwh,
        monthlyBill,
        // How many bill amounts went into monthlyBill (2 means it's an average)
        billCount: amounts.length,
        monthlySavings,
        newMonthlyBill: monthlyBill !== null ? monthlyBill - monthlySavings : null,
        annualSavings,
        // The client's "years ROI": price ÷ monthly savings ÷ 12
        paybackYears: monthlySavings > 0 ? total / monthlySavings / 12 : null,
        ...computeReturn(annualSavings, total),
    };
}

// Return on the system, from its annual savings and price. Pages showing an
// approved quotation call this with the admin's approved total.
//   roaPercent         = annual savings ÷ total × 100
//   lifetimeSavings    = annual savings × 25 years
//   netGain            = lifetime savings − total
//   lifetimeRoiPercent = net gain ÷ total × 100
export function computeReturn(annualSavings, total) {
    const lifetimeSavings = annualSavings * SYSTEM_LIFE_YEARS;
    const netGain = lifetimeSavings - total;

    return {
        roaPercent: total > 0 ? (annualSavings / total) * 100 : null,
        lifetimeSavings,
        netGain,
        lifetimeRoiPercent: total > 0 ? (netGain / total) * 100 : null,
    };
}

// Signed peso amount: -5000 → "−₱5,000", 5000 → "₱5,000"
export function signedPeso(n) {
    return n < 0 ? `−${peso(-n)}` : peso(n);
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
