<?php

namespace App\Services;

use App\Models\QuotationRequest;
use App\Models\SolarComputation;
use Illuminate\Validation\ValidationException;

/**
 * Solar Computation Engine (server side).
 *
 * This class is the single place on the backend where the solar formulas live.
 * The React app has a mirror of the same formulas in
 * frontend/src/services/solarEngine.js so the steps can update live while the
 * customer types. When the quotation is submitted, the server does NOT trust
 * the totals or prices sent by the browser — it recomputes everything here
 * from the raw inputs (appliances, hours, chosen package/panels/battery).
 *
 * If you change a constant or formula here, change it in solarEngine.js too.
 *
 * The flow is:
 *   1. computeRow()      → watts and day/night Wh for one appliance
 *   2. computeLoad()     → daytime, nighttime and grand totals, total load and inverter size
 *   3. recommend...()    → smallest inverter package, panel count and battery that fit
 *   4. buildQuote()      → itemized price for the customer's selection
 *   5. computeSavings()  → estimated monthly/annual savings and payback
 *   6. evaluate()        → runs 1–5 and checks the selection is allowed
 *   7. save()            → stores the result on the quotation request
 */
class SolarComputationService
{
    // ===================================================================
    // CONSTANTS — keep these identical to frontend/src/services/solarEngine.js
    // ===================================================================

    // Flat safety buffer added once to the household's total load (W)
    // to get the inverter size
    public const INVERTER_BUFFER_W = 2000;

    // Aircon and water pump wattage is derived from horsepower: hp × 800 W
    public const WATTS_PER_HP = 800;
    public const HP_OPTIONS = [0.6, 1, 1.5, 2, 2.5];

    // Daytime window (array generating): 08:00 → 16:00
    public const DAY_START = 8;
    public const DAY_END = 16;

    // Nighttime window (battery): 16:00 → 08:00 the next day.
    // Hours after midnight continue counting past 24 (01:00 = 25, 08:00 = 32)
    // so the "to" hour is always larger than the "from" hour.
    public const NIGHT_START = 16;
    public const NIGHT_END = 32;

    // Appliance dropdown. 'hp' => true means wattage comes from horsepower.
    public const APPLIANCES = [
        'aircon'           => ['label' => 'Aircon',           'hp' => true],
        'water_pump'       => ['label' => 'Water pump',       'hp' => true],
        'induction_cooker' => ['label' => 'Induction Cooker', 'hp' => false],
        'water_heater'     => ['label' => 'Water Heater',     'hp' => false],
        'freezer'          => ['label' => 'Freezer',          'hp' => false],
        'shower_heater'    => ['label' => 'Shower Heater',    'hp' => false],
        'other'            => ['label' => 'Other appliance',  'hp' => false],
    ];

    // Hybrid inverter packages, smallest first.
    // watts        = the largest inverter size (W) the package is recommended for
    // panelDefault = panels that ship with the package (the minimum)
    // panelMax     = most panels the package accepts
    // inverter     = inverter price (₱), safety = safety devices price (₱)
    public const PACKAGES = [
        ['kw' => 5,  'watts' => 5000,  'panelDefault' => 4,  'panelMax' => 12, 'inverter' => 49000,  'sku' => 'tm-0076', 'brand' => 'SOLIS', 'safety' => 20000],
        ['kw' => 6,  'watts' => 6000,  'panelDefault' => 7,  'panelMax' => 14, 'inverter' => 63000,  'sku' => 'tm-0110', 'brand' => 'DEYE',  'safety' => 20000],
        ['kw' => 8,  'watts' => 8000,  'panelDefault' => 10, 'panelMax' => 18, 'inverter' => 119000, 'sku' => 'tm-0029', 'brand' => 'DEYE',  'safety' => 20000],
        ['kw' => 10, 'watts' => 10000, 'panelDefault' => 14, 'panelMax' => 22, 'inverter' => 140000, 'sku' => 'tm-0031', 'brand' => 'DEYE',  'safety' => 25000],
        ['kw' => 12, 'watts' => 12000, 'panelDefault' => 18, 'panelMax' => 26, 'inverter' => 154000, 'sku' => 'tm-0102', 'brand' => 'DEYE',  'safety' => 25000],
    ];

    // Solar panel: Canadian 610 W bifacial
    public const PANEL_WATTS = 610;
    public const PANEL_PRICE = 8260;
    public const PANEL_SKU = 'tm-0040';

    // Per-panel costs that grow with the number of panels chosen
    public const INSTALL_PER_PANEL = 5000;
    public const MOUNT_PER_PANEL = 2500;

    // Batteries (51.2 V). Only Ah and price are stored — Wh is always computed.
    public const BATTERIES = [
        ['ah' => 100, 'price' => 57400,  'sku' => 'tm-0049'],
        ['ah' => 205, 'price' => 112000, 'sku' => 'tm-0048'],
        ['ah' => 280, 'price' => 102200, 'sku' => 'tm-0111'],
        ['ah' => 314, 'price' => 166600, 'sku' => 'tm-0108'],
    ];

    // Usable Wh per Ah. 40.96 = 51.2 V × 0.8, i.e. 80% of the stored energy
    // is counted as usable.
    public const BATTERY_WH_PER_AH = 40.96;

    // Savings estimate (the client's formula).
    // SORECO's rate, used when the customer's bills don't give both amount and kWh (₱/kWh)
    public const DEFAULT_RATE_PER_KWH = 13;
    // Peak sun hours per day (the client's figure for Bulan)
    public const PEAK_SUN_HOURS = 6;
    // Share of the panels' output counted, since heavy clouds sometimes block the sun
    public const SYSTEM_DERATE = 0.8;
    public const DAYS_PER_MONTH = 30;
    // Years the system is expected to keep saving (typical panel warranty)
    public const SYSTEM_LIFE_YEARS = 25;

    // ===================================================================
    // STEP 1–2: LOAD
    // ===================================================================

    /**
     * Number of hours between two clock hours, or 0 if either is missing
     * or "to" is not after "from".
     */
    public function span($from, $to): float
    {
        if (! is_numeric($from) || ! is_numeric($to) || $to <= $from) {
            return 0;
        }

        return (float) $to - (float) $from;
    }

    /**
     * Watts for one unit of an appliance.
     * Horsepower appliances: hp × 800. Everything else: the typed wattage.
     */
    public function unitWatts(array $row): float
    {
        if ($this->usesHp($row['appliance_type'] ?? '')) {
            return (float) ($row['hp'] ?? 0) * self::WATTS_PER_HP;
        }

        return max(0, (float) ($row['watts'] ?? 0));
    }

    public function usesHp(string $applianceType): bool
    {
        return self::APPLIANCES[$applianceType]['hp'] ?? false;
    }

    /**
     * Display name: the dropdown label, or the custom name for "Other".
     */
    public function applianceName(array $row): string
    {
        $type = $row['appliance_type'] ?? 'other';

        if ($type === 'other') {
            $custom = trim((string) ($row['custom_name'] ?? ''));
            return $custom !== '' ? $custom : self::APPLIANCES['other']['label'];
        }

        return self::APPLIANCES[$type]['label'] ?? 'Appliance';
    }

    /**
     * Energy for one appliance row.
     *   row_watts = watts × qty
     *   day_wh    = row_watts × daytime hours
     *   night_wh  = row_watts × nighttime hours
     */
    public function computeRow(array $row): array
    {
        $watts = $this->unitWatts($row);
        $qty = max(0, (int) round((float) ($row['qty'] ?? 0)));
        $rowWatts = $watts * $qty;
        $dayHours = $this->span($row['day_from'] ?? null, $row['day_to'] ?? null);
        $nightHours = $this->span($row['night_from'] ?? null, $row['night_to'] ?? null);

        return [
            'name' => $this->applianceName($row),
            'uses_hp' => $this->usesHp($row['appliance_type'] ?? ''),
            'watts' => $watts,
            'qty' => $qty,
            'row_watts' => $rowWatts,
            'day_hours' => $dayHours,
            'night_hours' => $nightHours,
            'day_wh' => $rowWatts * $dayHours,
            'night_wh' => $rowWatts * $nightHours,
        ];
    }

    /**
     * Household totals (the Step 2 ledger).
     *   TOTAL DAYTIME   = sum of day_wh
     *   TOTAL NIGHTTIME = sum of night_wh
     *   GRAND TOTAL     = day + night
     *   TOTAL LOAD      = sum of row_watts (every appliance running at once)
     *   INVERTER SIZE   = total load + 2,000 W buffer
     */
    public function computeLoad(array $rows): array
    {
        $computed = array_map(fn ($row) => $this->computeRow($row), $rows);

        $day = array_sum(array_column($computed, 'day_wh'));
        $night = array_sum(array_column($computed, 'night_wh'));
        $totalLoad = array_sum(array_column($computed, 'row_watts'));

        return [
            'rows' => $computed,
            'total_day_wh' => $day,
            'total_night_wh' => $night,
            'grand_total_wh' => $day + $night,
            'total_load_w' => $totalLoad,
            'inverter_size_w' => $totalLoad + self::INVERTER_BUFFER_W,
        ];
    }

    // ===================================================================
    // STEP 3: RECOMMENDATION
    // ===================================================================

    /**
     * Index (in PACKAGES) of the recommended inverter package: the first
     * package whose watts cover the inverter size. Bigger than every package
     * → the largest one (flagged for an engineer).
     */
    public function recommendPackageIndex(float $inverterSizeW): int
    {
        foreach (self::PACKAGES as $index => $package) {
            if ($package['watts'] >= $inverterSizeW) {
                return $index;
            }
        }

        return count(self::PACKAGES) - 1;
    }

    /**
     * True when the inverter size is more than the largest package can carry.
     * The quote is still built on the largest package; this only adds a warning.
     */
    public function exceedsLargestPackage(float $inverterSizeW): bool
    {
        return $inverterSizeW > self::PACKAGES[count(self::PACKAGES) - 1]['watts'];
    }

    /**
     * Recommended panel count: inverter size ÷ 610 W, rounded down, kept
     * inside the package's panel range (panelDefault–panelMax).
     */
    public function recommendPanelCount(float $inverterSizeW, array $package): int
    {
        $panels = (int) floor($inverterSizeW / self::PANEL_WATTS);

        return max($package['panelDefault'], min($package['panelMax'], $panels));
    }

    /**
     * Usable Wh of a battery: ah × 40.96.
     * Worked out as ah × 4096 ÷ 100 so the result is exact (multiplying by
     * 40.96 directly can give tiny rounding errors like 11468.800000000001).
     */
    public function batteryWh(int $ah): float
    {
        return $ah * 4096 / 100;
    }

    /**
     * Index (in BATTERIES) of the default battery: the smallest one whose
     * usable Wh is at least the nighttime load. If none is big enough, the
     * largest. The customer can still pick any battery.
     */
    public function recommendBatteryIndex(float $nightWh): int
    {
        foreach (self::BATTERIES as $index => $battery) {
            if ($this->batteryWh($battery['ah']) >= $nightWh) {
                return $index;
            }
        }

        return count(self::BATTERIES) - 1;
    }

    /**
     * The battery bank the night needs, when the largest battery (314 Ah) is
     * picked and one unit can't cover the nighttime load:
     *   - as many full 314 Ah units as fit the night (rounded down), then
     *   - the cheapest battery that covers what's left over.
     * e.g. 15,000 Wh → 314 Ah + 100 Ah; 21,520 Wh → 314 Ah + 280 Ah.
     * If the left-over needs another 314 Ah, it's counted as one more unit
     * instead (25,000 Wh → 2 × 314 Ah). Any other battery is a single unit.
     *
     * Returns ['qty' => units of $battery, 'extra' => the added battery or null].
     */
    public function batteryBank(array $battery, float $nightWh): array
    {
        $largest = self::BATTERIES[count(self::BATTERIES) - 1];
        $unitWh = $this->batteryWh($battery['ah']);

        if ($battery['ah'] !== $largest['ah'] || $nightWh <= $unitWh) {
            return ['qty' => 1, 'extra' => null];
        }

        $qty = (int) floor($nightWh / $unitWh);
        $leftOverWh = $nightWh - $qty * $unitWh;

        if ($leftOverWh <= 0) {
            return ['qty' => $qty, 'extra' => null];
        }

        // Cheapest battery that holds the left-over (the 280 Ah costs less than the 205 Ah)
        $extra = null;
        foreach (self::BATTERIES as $candidate) {
            if ($this->batteryWh($candidate['ah']) >= $leftOverWh
                && ($extra === null || $candidate['price'] < $extra['price'])) {
                $extra = $candidate;
            }
        }

        if ($extra['ah'] === $largest['ah']) {
            return ['qty' => $qty + 1, 'extra' => null];
        }

        return ['qty' => $qty, 'extra' => $extra];
    }

    /**
     * Usable Wh of a whole bank: the main battery × its units, plus the extra one.
     */
    public function bankWh(array $battery, array $bank): float
    {
        return $this->batteryWh($battery['ah']) * $bank['qty']
            + ($bank['extra'] ? $this->batteryWh($bank['extra']['ah']) : 0);
    }

    /**
     * "314 Ah", "2 × 314 Ah" or "314 Ah + 100 Ah".
     */
    public function bankLabel(array $battery, array $bank): string
    {
        $main = $bank['qty'] > 1 ? "{$bank['qty']} × {$battery['ah']} Ah" : "{$battery['ah']} Ah";

        return $bank['extra'] ? "{$main} + {$bank['extra']['ah']} Ah" : $main;
    }

    // ===================================================================
    // STEP 3: ITEMIZED QUOTE
    // ===================================================================

    /**
     * Price lines for a package + panel count + battery.
     *   Inverter            = package inverter price (flat)
     *   Solar panels        = 8,260 × panels
     *   Installation labour = 5,000 × panels
     *   Mounting kit        = 2,500 × panels
     *   Safety devices      = package safety price (flat)
     *   Battery storage     = battery price × units (see batteryBank())
     *   Additional battery  = the extra battery's price, when the bank has one
     *
     * $bank is batteryBank()'s result; without it, one unit of $battery.
     */
    public function buildQuote(array $package, int $panels, array $battery, ?array $bank = null): array
    {
        $bank ??= ['qty' => 1, 'extra' => null];
        $batteryQty = $bank['qty'];
        $batteryText = $batteryQty > 1 ? "{$batteryQty} × {$battery['ah']} Ah" : "{$battery['ah']} Ah";

        $items = [
            [
                'key' => 'inverter',
                'label' => $package['kw'] . ' kW hybrid inverter',
                'description' => 'Converts what the panels make into the power your outlets use, and manages the battery. ' . $package['brand'] . '.',
                'sku' => $package['sku'],
                'qty' => 1,
                'qty_unit' => 'unit',
                'unit_price' => $package['inverter'],
                'amount' => $package['inverter'],
            ],
            [
                'key' => 'panels',
                'label' => 'Solar panels',
                'description' => $panels . ' bifacial panels rated 610 W each — these go on the roof and generate the electricity.',
                'sku' => self::PANEL_SKU,
                'qty' => $panels,
                'qty_unit' => 'panels',
                'unit_price' => self::PANEL_PRICE,
                'amount' => self::PANEL_PRICE * $panels,
            ],
            [
                'key' => 'installation',
                'label' => 'Installation labour',
                'description' => 'Our crew mounts the panels, runs the wiring and commissions the system.',
                'sku' => null,
                'qty' => $panels,
                'qty_unit' => 'panels',
                'unit_price' => self::INSTALL_PER_PANEL,
                'amount' => self::INSTALL_PER_PANEL * $panels,
            ],
            [
                'key' => 'mounting',
                'label' => 'Mounting kit',
                'description' => 'Rails, clamps and roof brackets that hold the panels down.',
                'sku' => null,
                'qty' => $panels,
                'qty_unit' => 'panels',
                'unit_price' => self::MOUNT_PER_PANEL,
                'amount' => self::MOUNT_PER_PANEL * $panels,
            ],
            [
                'key' => 'safety',
                'label' => 'Safety devices',
                'description' => 'Breakers, surge protection and earthing so the system shuts down safely.',
                'sku' => null,
                'qty' => 1,
                'qty_unit' => 'set',
                'unit_price' => $package['safety'],
                'amount' => $package['safety'],
            ],
            [
                'key' => 'battery',
                'label' => 'Battery storage',
                'description' => $batteryText . ' at 51.2 V — stores daytime power so you can use it at night.',
                'sku' => $battery['sku'],
                'qty' => $batteryQty,
                'qty_unit' => $batteryQty > 1 ? 'units' : 'unit',
                'unit_price' => $battery['price'],
                'amount' => $battery['price'] * $batteryQty,
            ],
        ];

        if ($bank['extra']) {
            $items[] = [
                'key' => 'battery_extra',
                'label' => 'Additional battery',
                'description' => $bank['extra']['ah'] . ' Ah at 51.2 V — covers the rest of the night the main battery can\'t.',
                'sku' => $bank['extra']['sku'],
                'qty' => 1,
                'qty_unit' => 'unit',
                'unit_price' => $bank['extra']['price'],
                'amount' => $bank['extra']['price'],
            ];
        }

        return [
            'items' => $items,
            'total' => array_sum(array_column($items, 'amount')),
        ];
    }

    // ===================================================================
    // STEP 4: SAVINGS
    // ===================================================================

    /**
     * Estimated savings for the chosen system — the client's formula.
     *
     * Daytime first: the panels power the daytime appliances, and what's
     * left over charges the battery.
     *   production  = 610 W × panels × 6 peak hours × 80% (Wh/day)
     *   left over   = production − daytime Wh (never below 0)
     *
     * Nighttime: the battery covers the night up to its size, and only as
     * much as the left-over charge allowed. The rest is bought from SORECO.
     *   night covered = smaller of (nighttime Wh, battery Wh, left over)
     *   grid          = daytime the panels couldn't cover + nighttime not covered (Wh/day)
     *   new bill      = grid ÷ 1000 × 30 days × rate
     *
     * Savings and ROI:
     *   savings     = monthly bill − new bill, kept between ₱0 and the bill
     *   ROI (years) = total price ÷ monthly savings ÷ 12 months  (the payback period)
     *   ROA         = annual savings ÷ total price × 100
     *   net gain    = savings over 25 years − total price
     *
     * rate = average amount ÷ kWh of the bills that have both, else SORECO's ₱13.
     * Without a bill amount, the bill is estimated as all the appliances'
     * energy at that rate (so savings = the energy solar covers × rate);
     * monthly_bill and new_monthly_bill then stay empty, as no real bill was given.
     */
    public function computeSavings(float $dayWh, float $nightWh, int $panels, float $batteryWh, float $total, array $bills = []): array
    {
        $productionWh = self::PANEL_WATTS * $panels * self::PEAK_SUN_HOURS * self::SYSTEM_DERATE;

        // Daytime first; what's left over charges the battery
        $dayCoveredWh = min($dayWh, $productionWh);
        $leftOverWh = max(0, $productionWh - $dayWh);

        // The battery covers the night up to its size and its charge
        $nightCoveredWh = min($nightWh, $batteryWh, $leftOverWh);
        $gridWh = ($dayWh - $dayCoveredWh) + ($nightWh - $nightCoveredWh);

        $productionKwh = $productionWh / 1000 * self::DAYS_PER_MONTH;
        $usageKwh = ($dayWh + $nightWh) / 1000 * self::DAYS_PER_MONTH;
        $gridKwh = $gridWh / 1000 * self::DAYS_PER_MONTH;

        $rates = [];
        $amounts = [];

        foreach ($bills as $bill) {
            $amount = $bill['amount'] ?? null;
            $kwh = $bill['kwh'] ?? null;

            if (is_numeric($amount) && $amount > 0) {
                $amounts[] = (float) $amount;

                if (is_numeric($kwh) && $kwh > 0) {
                    $rates[] = $amount / $kwh;
                }
            }
        }

        $rate = $rates ? array_sum($rates) / count($rates) : self::DEFAULT_RATE_PER_KWH;
        $monthlyBill = $amounts ? array_sum($amounts) / count($amounts) : null;

        // What's still bought from SORECO each month with solar
        $gridCost = $gridKwh * $rate;

        // No bill entered → estimate it from the appliances at the same rate
        $billForSavings = $monthlyBill ?? $usageKwh * $rate;
        // Never below ₱0 (when the listed appliances' grid cost is more than the
        // bill); never above the bill, since the grid cost is never negative
        $monthlySavings = max(0, $billForSavings - $gridCost);
        $annualSavings = $monthlySavings * 12;

        return [
            'rate' => $rate,
            'rate_source' => $rates ? 'bill' : 'default',
            'production_kwh' => $productionKwh,
            'usage_kwh' => $usageKwh,
            'day_covered_wh' => $dayCoveredWh,
            'left_over_wh' => $leftOverWh,
            'night_covered_wh' => $nightCoveredWh,
            'grid_kwh' => $gridKwh,
            'monthly_bill' => $monthlyBill,
            // How many bill amounts went into monthly_bill (2 means it's an average)
            'bill_count' => count($amounts),
            'monthly_savings' => $monthlySavings,
            'new_monthly_bill' => $monthlyBill !== null ? $monthlyBill - $monthlySavings : null,
            'annual_savings' => $annualSavings,
            // The client's "years ROI": price ÷ monthly savings ÷ 12
            'payback_years' => $monthlySavings > 0 ? $total / $monthlySavings / 12 : null,
        ] + $this->computeReturn($annualSavings, $total);
    }

    /**
     * Return on the system, from its annual savings and price. Kept separate
     * from computeSavings() so pages can recompute it with the admin's
     * approved total instead of the engine's price.
     *   roa_percent          = annual savings ÷ total × 100
     *   lifetime_savings     = annual savings × 25 years
     *   net_gain             = lifetime savings − total
     *   lifetime_roi_percent = net gain ÷ total × 100
     */
    public function computeReturn(float $annualSavings, float $total): array
    {
        $lifetimeSavings = $annualSavings * self::SYSTEM_LIFE_YEARS;
        $netGain = $lifetimeSavings - $total;

        return [
            'roa_percent' => $total > 0 ? $annualSavings / $total * 100 : null,
            'lifetime_savings' => $lifetimeSavings,
            'net_gain' => $netGain,
            'lifetime_roi_percent' => $total > 0 ? $netGain / $total * 100 : null,
        ];
    }

    // ===================================================================
    // PUTTING IT TOGETHER
    // ===================================================================

    /**
     * Runs the whole engine for the given inputs and the customer's selection,
     * and rejects any selection the UI would not allow:
     *   - package below the recommended one
     *   - panel count outside the chosen package's range
     *   - a battery that doesn't exist
     *
     * $bills (optional) are the customer's electricity bills, used only for
     * the savings estimate.
     *
     * Pure function (no database) so it is easy to unit test.
     *
     * @throws ValidationException
     */
    public function evaluate(array $rows, int $packageKw, int $panelCount, int $batteryAh, array $bills = []): array
    {
        $load = $this->computeLoad($rows);

        // --- Inverter package: upgrade only ---
        $recommendedIndex = $this->recommendPackageIndex($load['inverter_size_w']);
        $packageIndex = $this->findIndex(self::PACKAGES, 'kw', $packageKw);

        if ($packageIndex === null) {
            throw ValidationException::withMessages([
                'package_kw' => 'Unknown inverter package.',
            ]);
        }

        if ($packageIndex < $recommendedIndex) {
            throw ValidationException::withMessages([
                'package_kw' => 'The inverter cannot be below the recommended ' . self::PACKAGES[$recommendedIndex]['kw'] . ' kW package.',
            ]);
        }

        $package = self::PACKAGES[$packageIndex];

        // --- Panels: between the package default and its maximum ---
        if ($panelCount < $package['panelDefault'] || $panelCount > $package['panelMax']) {
            throw ValidationException::withMessages([
                'panel_count' => "The {$package['kw']} kW package takes {$package['panelDefault']} to {$package['panelMax']} panels.",
            ]);
        }

        // --- Battery: any of the four ---
        $batteryIndex = $this->findIndex(self::BATTERIES, 'ah', $batteryAh);

        if ($batteryIndex === null) {
            throw ValidationException::withMessages([
                'battery_ah' => 'Unknown battery.',
            ]);
        }

        $battery = self::BATTERIES[$batteryIndex];
        $recommendedBattery = self::BATTERIES[$this->recommendBatteryIndex($load['total_night_wh'])];

        // When one 314 Ah can't cover the night: full 314 Ah units + the cheapest battery for the rest
        $bank = $this->batteryBank($battery, $load['total_night_wh']);
        $recommendedBank = $this->batteryBank($recommendedBattery, $load['total_night_wh']);
        $batteryWh = $this->bankWh($battery, $bank);
        $quote = $this->buildQuote($package, $panelCount, $battery, $bank);

        return [
            'load' => $load,
            'recommended_package' => self::PACKAGES[$recommendedIndex],
            'package' => $package,
            'exceeds_max_package' => $this->exceedsLargestPackage($load['inverter_size_w']),
            'recommended_panels' => $this->recommendPanelCount($load['inverter_size_w'], $package),
            'panel_count' => $panelCount,
            'array_kwp' => $panelCount * self::PANEL_WATTS / 1000,
            'recommended_battery' => $recommendedBattery,
            'recommended_battery_qty' => $recommendedBank['qty'],
            'recommended_extra_battery' => $recommendedBank['extra'],
            'battery' => $battery,
            'battery_qty' => $bank['qty'],
            'extra_battery' => $bank['extra'],
            'battery_label' => $this->bankLabel($battery, $bank),
            // Usable Wh of the whole bank
            'battery_wh' => $batteryWh,
            'quote' => $quote,
            'savings' => $this->computeSavings(
                $load['total_day_wh'],
                $load['total_night_wh'],
                $panelCount,
                $batteryWh,
                $quote['total'],
                $bills
            ),
        ];
    }

    /**
     * Saves an evaluate() result as the quotation request's SolarComputation.
     */
    public function save(QuotationRequest $quotationRequest, array $result): SolarComputation
    {
        $load = $result['load'];
        $package = $result['package'];
        $battery = $result['battery'];
        $savings = $result['savings'];
        $roundOrNull = fn ($value) => $value === null ? null : round($value, 2);

        return SolarComputation::updateOrCreate(
            ['quotation_request_id' => $quotationRequest->id],
            [
                // Older summary columns, kept filled for existing pages/reports
                'total_load_watts' => round($load['grand_total_wh'], 2),
                'panel_capacity_kw' => round($result['array_kwp'], 2),
                'inverter_specification' => "{$package['kw']} kW Hybrid Inverter · {$package['brand']} ({$package['sku']})",
                'battery_capacity_ah' => $battery['ah'],
                'estimated_cost' => $result['quote']['total'],

                // Engine results
                'total_day_wh' => round($load['total_day_wh'], 2),
                'total_night_wh' => round($load['total_night_wh'], 2),
                'grand_total_wh' => round($load['grand_total_wh'], 2),
                'total_load_w' => round($load['total_load_w'], 2),
                'inverter_size_w' => round($load['inverter_size_w'], 2),
                'recommended_package_kw' => $result['recommended_package']['kw'],
                'recommended_panels' => $result['recommended_panels'],
                'package_kw' => $package['kw'],
                'inverter_sku' => $package['sku'],
                'inverter_brand' => $package['brand'],
                'exceeds_max_package' => $result['exceeds_max_package'],
                'panel_count' => $result['panel_count'],
                'recommended_battery_ah' => $result['recommended_battery']['ah'],
                // battery_ah is per unit (× battery_qty), plus one extra_battery_ah
                // battery when the bank has one; battery_wh is the whole bank
                'battery_ah' => $battery['ah'],
                'battery_qty' => $result['battery_qty'],
                'extra_battery_ah' => $result['extra_battery']['ah'] ?? null,
                'battery_wh' => $result['battery_wh'],
                'battery_sku' => $battery['sku'],
                'line_items' => $result['quote']['items'],

                // Savings estimate
                'electricity_rate' => round($savings['rate'], 2),
                'rate_source' => $savings['rate_source'],
                'monthly_production_kwh' => round($savings['production_kwh'], 2),
                'monthly_usage_kwh' => round($savings['usage_kwh'], 2),
                'monthly_bill' => $roundOrNull($savings['monthly_bill']),
                'monthly_savings' => round($savings['monthly_savings'], 2),
                'new_monthly_bill' => $roundOrNull($savings['new_monthly_bill']),
                'annual_savings' => round($savings['annual_savings'], 2),
                'payback_years' => $roundOrNull($savings['payback_years']),
            ]
        );
    }

    /**
     * Position of the first item in $list whose $key equals $value, or null.
     */
    private function findIndex(array $list, string $key, $value): ?int
    {
        foreach ($list as $index => $item) {
            if ($item[$key] == $value) {
                return $index;
            }
        }

        return null;
    }
}
