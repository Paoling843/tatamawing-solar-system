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
 *   2. computeLoad()     → daytime, nighttime, grand and adjusted totals
 *   3. recommend...()    → smallest inverter package and battery that fit
 *   4. buildQuote()      → itemized price for the customer's selection
 *   5. evaluate()        → runs 1–4 and checks the selection is allowed
 *   6. save()            → stores the result on the quotation request
 */
class SolarComputationService
{
    // ===================================================================
    // CONSTANTS — keep these identical to frontend/src/services/solarEngine.js
    // ===================================================================

    // Flat safety buffer added once to the household's grand total (Wh)
    public const BUFFER_WH = 2000;

    // Loads under this adjusted total always get the smallest package
    public const SMALL_LOAD_FLOOR_WH = 3000;

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
    // watts        = the most adjusted Wh the package is recommended for
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
     *   ADJUSTED TOTAL  = grand + 2,000 buffer
     */
    public function computeLoad(array $rows): array
    {
        $computed = array_map(fn ($row) => $this->computeRow($row), $rows);

        $day = array_sum(array_column($computed, 'day_wh'));
        $night = array_sum(array_column($computed, 'night_wh'));
        $grand = $day + $night;

        return [
            'rows' => $computed,
            'total_day_wh' => $day,
            'total_night_wh' => $night,
            'grand_total_wh' => $grand,
            'adjusted_total_wh' => $grand + self::BUFFER_WH,
        ];
    }

    // ===================================================================
    // STEP 3: RECOMMENDATION
    // ===================================================================

    /**
     * Index (in PACKAGES) of the recommended inverter package.
     * - Under 3,000 Wh → the smallest package.
     * - Otherwise → the first package whose watts cover the adjusted total.
     * - Bigger than every package → the largest one (flagged for an engineer).
     */
    public function recommendPackageIndex(float $adjustedWh): int
    {
        if ($adjustedWh < self::SMALL_LOAD_FLOOR_WH) {
            return 0;
        }

        foreach (self::PACKAGES as $index => $package) {
            if ($package['watts'] >= $adjustedWh) {
                return $index;
            }
        }

        return count(self::PACKAGES) - 1;
    }

    /**
     * True when the adjusted load is more than the largest package can carry.
     * The quote is still built on the largest package; this only adds a warning.
     */
    public function exceedsLargestPackage(float $adjustedWh): bool
    {
        return $adjustedWh > self::PACKAGES[count(self::PACKAGES) - 1]['watts'];
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
     *   Battery storage     = battery price (flat)
     */
    public function buildQuote(array $package, int $panels, array $battery): array
    {
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
                'description' => $battery['ah'] . ' Ah at 51.2 V — stores daytime power so you can use it at night.',
                'sku' => $battery['sku'],
                'qty' => 1,
                'qty_unit' => 'unit',
                'unit_price' => $battery['price'],
                'amount' => $battery['price'],
            ],
        ];

        return [
            'items' => $items,
            'total' => array_sum(array_column($items, 'amount')),
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
     * Pure function (no database) so it is easy to unit test.
     *
     * @throws ValidationException
     */
    public function evaluate(array $rows, int $packageKw, int $panelCount, int $batteryAh): array
    {
        $load = $this->computeLoad($rows);

        // --- Inverter package: upgrade only ---
        $recommendedIndex = $this->recommendPackageIndex($load['adjusted_total_wh']);
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

        return [
            'load' => $load,
            'recommended_package' => self::PACKAGES[$recommendedIndex],
            'package' => $package,
            'exceeds_max_package' => $this->exceedsLargestPackage($load['adjusted_total_wh']),
            'panel_count' => $panelCount,
            'array_kwp' => $panelCount * self::PANEL_WATTS / 1000,
            'recommended_battery' => $recommendedBattery,
            'battery' => $battery,
            'battery_wh' => $this->batteryWh($battery['ah']),
            'quote' => $this->buildQuote($package, $panelCount, $battery),
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
                'adjusted_total_wh' => round($load['adjusted_total_wh'], 2),
                'recommended_package_kw' => $result['recommended_package']['kw'],
                'package_kw' => $package['kw'],
                'inverter_sku' => $package['sku'],
                'inverter_brand' => $package['brand'],
                'exceeds_max_package' => $result['exceeds_max_package'],
                'panel_count' => $result['panel_count'],
                'recommended_battery_ah' => $result['recommended_battery']['ah'],
                'battery_ah' => $battery['ah'],
                'battery_wh' => $result['battery_wh'],
                'battery_sku' => $battery['sku'],
                'line_items' => $result['quote']['items'],
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
