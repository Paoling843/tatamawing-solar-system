<?php

namespace Tests\Unit;

use App\Services\SolarComputationService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Checks every formula of the Solar Computation Engine with hand-worked numbers.
 * Uses Laravel's TestCase only so ValidationException can build its messages;
 * no database is touched.
 * Run with:  php artisan test --filter=SolarComputationServiceTest
 */
class SolarComputationServiceTest extends TestCase
{
    private SolarComputationService $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new SolarComputationService();
    }

    public function test_hp_appliance_watts_and_day_night_energy(): void
    {
        // 1.5 hp aircon → 1.5 × 800 = 1,200 W; 2 units → 2,400 W
        // Day 08:00–16:00 = 8 h → 2,400 × 8 = 19,200 Wh
        // Night 18:00–24:00 = 6 h → 2,400 × 6 = 14,400 Wh
        $row = $this->engine->computeRow([
            'appliance_type' => 'aircon', 'hp' => 1.5, 'qty' => 2,
            'day_from' => 8, 'day_to' => 16, 'night_from' => 18, 'night_to' => 24,
        ]);

        $this->assertEquals(1200, $row['watts']);
        $this->assertEquals(2400, $row['row_watts']);
        $this->assertEquals(19200, $row['day_wh']);
        $this->assertEquals(14400, $row['night_wh']);
        $this->assertSame('Aircon', $row['name']);
    }

    public function test_manual_watts_ignore_hp_and_other_uses_custom_name(): void
    {
        $row = $this->engine->computeRow([
            'appliance_type' => 'other', 'custom_name' => 'Rice cooker', 'hp' => 2,
            'watts' => 700, 'qty' => 1, 'day_from' => 10, 'day_to' => 12,
        ]);

        $this->assertEquals(700, $row['watts']);
        $this->assertEquals(1400, $row['day_wh']);
        $this->assertEquals(0, $row['night_wh']);
        $this->assertSame('Rice cooker', $row['name']);
    }

    public function test_hour_span_rules(): void
    {
        // Full night window: 16:00 → 08:00 next day (32) = 16 h
        $this->assertEquals(16, $this->engine->span(16, 32));
        // Missing or backwards times count as 0 hours
        $this->assertEquals(0, $this->engine->span(null, 20));
        $this->assertEquals(0, $this->engine->span(14, 10));
        $this->assertEquals(0, $this->engine->span(12, 12));
    }

    public function test_ledger_totals_and_inverter_size(): void
    {
        $load = $this->engine->computeLoad([
            ['appliance_type' => 'aircon', 'hp' => 1, 'qty' => 1, 'day_from' => 8, 'day_to' => 10, 'night_from' => 20, 'night_to' => 22],
            ['appliance_type' => 'freezer', 'watts' => 150, 'qty' => 1, 'day_from' => 8, 'day_to' => 16, 'night_from' => 16, 'night_to' => 32],
        ]);

        // Day: 800×2 + 150×8 = 2,800   Night: 800×2 + 150×16 = 4,000
        $this->assertEquals(2800, $load['total_day_wh']);
        $this->assertEquals(4000, $load['total_night_wh']);
        $this->assertEquals(6800, $load['grand_total_wh']);
        // Total load: 800×1 + 150×1 = 950 W   Inverter size: 950 + 2,000 = 2,950 W
        $this->assertEquals(950, $load['total_load_w']);
        $this->assertEquals(2950, $load['inverter_size_w']);
    }

    public function test_package_matches_client_example(): void
    {
        // The client's example: 2 × 1 hp aircon, 1 hp water pump, 120 W freezer,
        // 2,000 W induction cooker. Total load 1,600 + 800 + 120 + 2,000 = 4,520 W,
        // + 2,000 = 6,520 W → 8 kW. Panels: 6,520 ÷ 610 = 10.69 → 10.
        $rows = [
            ['appliance_type' => 'aircon', 'hp' => 1, 'qty' => 2, 'day_from' => 13, 'day_to' => 16, 'night_from' => 20, 'night_to' => 22],
            ['appliance_type' => 'water_pump', 'hp' => 1, 'qty' => 1, 'day_from' => 8, 'day_to' => 9],
            ['appliance_type' => 'freezer', 'watts' => 120, 'qty' => 1, 'day_from' => 8, 'day_to' => 16, 'night_from' => 16, 'night_to' => 32],
            ['appliance_type' => 'induction_cooker', 'watts' => 2000, 'qty' => 1, 'day_from' => 11, 'day_to' => 12, 'night_from' => 18, 'night_to' => 19],
        ];
        $load = $this->engine->computeLoad($rows);

        $this->assertEquals(4520, $load['total_load_w']);
        $this->assertEquals(6520, $load['inverter_size_w']);

        $result = $this->engine->evaluate($rows, 8, 10, 205);
        $this->assertSame(8, $result['recommended_package']['kw']);
        $this->assertSame(10, $result['recommended_panels']);
        $this->assertFalse($result['exceeds_max_package']);
    }

    public function test_recommended_panels_round_down_within_the_package_range(): void
    {
        [$kw5, , $kw8, , $kw12] = SolarComputationService::PACKAGES;

        $this->assertSame(6, $this->engine->recommendPanelCount(4150, $kw5));   // 6.80 → 6
        $this->assertSame(10, $this->engine->recommendPanelCount(6100, $kw8));  // exactly 10
        $this->assertSame(10, $this->engine->recommendPanelCount(6099, $kw8));  // 9 → raised to the 8 kW minimum
        $this->assertSame(4, $this->engine->recommendPanelCount(2000, $kw5));   // 3 → raised to the 5 kW minimum
        $this->assertSame(26, $this->engine->recommendPanelCount(20000, $kw12)); // 32 → capped at the 12 kW maximum
    }

    public function test_package_recommendation_boundaries(): void
    {
        $this->assertSame(0, $this->engine->recommendPackageIndex(2000));  // buffer only → 5 kW
        $this->assertSame(0, $this->engine->recommendPackageIndex(5000));  // exactly 5 kW cap
        $this->assertSame(1, $this->engine->recommendPackageIndex(5001));  // → 6 kW
        $this->assertSame(4, $this->engine->recommendPackageIndex(12000)); // exactly 12 kW cap
        $this->assertFalse($this->engine->exceedsLargestPackage(12000));

        // Above every package → still 12 kW, but flagged
        $this->assertSame(4, $this->engine->recommendPackageIndex(15000));
        $this->assertTrue($this->engine->exceedsLargestPackage(15000));
    }

    public function test_battery_wh_and_recommendation_is_inclusive(): void
    {
        $this->assertEquals(4096, $this->engine->batteryWh(100));
        $this->assertEquals(11468.8, $this->engine->batteryWh(280));

        $this->assertSame(0, $this->engine->recommendBatteryIndex(0));
        $this->assertSame(0, $this->engine->recommendBatteryIndex(4096));    // exactly 100 Ah
        $this->assertSame(1, $this->engine->recommendBatteryIndex(4097));    // → 205 Ah
        $this->assertSame(3, $this->engine->recommendBatteryIndex(12861.44)); // exactly 314 Ah
        $this->assertSame(3, $this->engine->recommendBatteryIndex(50000));   // bigger than all → largest
    }

    public function test_a_big_night_gets_full_314_ah_units_plus_the_cheapest_battery_for_the_rest(): void
    {
        [$ah100, $ah205, $ah280, $ah314] = SolarComputationService::BATTERIES;
        $bank = fn (float $nightWh) => $this->engine->batteryBank($ah314, $nightWh);

        // 15,000 − 12,861.44 = 2,138.56 left → 100 Ah (4,096 Wh) is enough
        $this->assertSame(['qty' => 1, 'extra' => $ah100], $bank(15000));
        // Client's example: 21,520 − 12,861.44 = 8,658.56 left → 280 Ah (cheaper than the 205 Ah)
        $this->assertSame(['qty' => 1, 'extra' => $ah280], $bank(21520));
        // 25,000 − 12,861.44 = 12,138.56 left → only another 314 Ah holds it → 2 × 314 Ah
        $this->assertSame(['qty' => 2, 'extra' => null], $bank(25000));
        // 30,000 − 2 × 12,861.44 = 4,277.12 left → 280 Ah (₱102,200) beats 205 Ah (₱112,000)
        $this->assertSame(['qty' => 2, 'extra' => $ah280], $bank(30000));
        // Exactly one or two units → nothing extra
        $this->assertSame(['qty' => 1, 'extra' => null], $bank(12861.44));
        $this->assertSame(['qty' => 2, 'extra' => null], $bank(25722.88));
        // Smaller batteries are never banked
        $this->assertSame(['qty' => 1, 'extra' => null], $this->engine->batteryBank($ah205, 21520));

        $this->assertEqualsWithDelta(12861.44 + 4096, $this->engine->bankWh($ah314, $bank(15000)), 0.0001);
        $this->assertSame('314 Ah + 100 Ah', $this->engine->bankLabel($ah314, $bank(15000)));
        $this->assertSame('2 × 314 Ah + 280 Ah', $this->engine->bankLabel($ah314, $bank(30000)));
    }

    public function test_quote_charges_every_battery_in_the_bank(): void
    {
        [$ah100, , , $ah314] = SolarComputationService::BATTERIES;
        $quote = $this->engine->buildQuote(SolarComputationService::PACKAGES[0], 7, $ah314, ['qty' => 1, 'extra' => $ah100]);
        $items = collect($quote['items']);

        $this->assertEquals(166600, $items->firstWhere('key', 'battery')['amount']);
        $this->assertEquals(57400, $items->firstWhere('key', 'battery_extra')['amount']);

        $double = $this->engine->buildQuote(SolarComputationService::PACKAGES[0], 7, $ah314, ['qty' => 2, 'extra' => null]);
        $battery = collect($double['items'])->firstWhere('key', 'battery');
        $this->assertSame(2, $battery['qty']);
        $this->assertEquals(166600 * 2, $battery['amount']);
        $this->assertNull(collect($double['items'])->firstWhere('key', 'battery_extra'));
    }

    public function test_evaluate_banks_the_314_ah_for_a_big_night(): void
    {
        // 2,690 W for 8 night hours = 21,520 Wh → 314 Ah + 280 Ah = 24,330.24 Wh
        // 7 panels make 20,496 Wh, all left over for the battery → 20,496 Wh of the night covered
        $rows = [['appliance_type' => 'other', 'watts' => 2690, 'qty' => 1, 'night_from' => 16, 'night_to' => 24]];
        $result = $this->engine->evaluate($rows, 5, 7, 314);

        $this->assertSame(1, $result['battery_qty']);
        $this->assertSame(280, $result['extra_battery']['ah']);
        $this->assertSame(280, $result['recommended_extra_battery']['ah']);
        $this->assertSame('314 Ah + 280 Ah', $result['battery_label']);
        $this->assertEqualsWithDelta(24330.24, $result['battery_wh'], 0.0001);
        $this->assertEqualsWithDelta(20496, $result['savings']['night_covered_wh'], 0.0001);
    }

    public function test_itemized_quote(): void
    {
        $package = SolarComputationService::PACKAGES[2];  // 8 kW
        $battery = SolarComputationService::BATTERIES[1]; // 205 Ah
        $quote = $this->engine->buildQuote($package, 12, $battery);

        $amounts = array_column($quote['items'], 'amount', 'key');
        $this->assertEquals(119000, $amounts['inverter']);
        $this->assertEquals(8260 * 12, $amounts['panels']);
        $this->assertEquals(5000 * 12, $amounts['installation']);
        $this->assertEquals(2500 * 12, $amounts['mounting']);
        $this->assertEquals(20000, $amounts['safety']);      // flat, not × panels
        $this->assertEquals(112000, $amounts['battery']);
        $this->assertEquals(119000 + 99120 + 60000 + 30000 + 20000 + 112000, $quote['total']);
    }

    public function test_evaluate_accepts_upgrades_and_any_battery(): void
    {
        // Total load 1,500 W + 2,000 = 3,500 W → 5 kW recommended.
        // Upgrading to 10 kW (14 panels) and picking a battery smaller than
        // the recommended one are both allowed.
        $rows = [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]];
        $result = $this->engine->evaluate($rows, 10, 14, 100);

        $this->assertSame(5, $result['recommended_package']['kw']);
        $this->assertSame(14, $result['recommended_panels']); // 3,500 ÷ 610 = 5 → raised to the 10 kW minimum
        $this->assertSame(10, $result['package']['kw']);
        $this->assertSame(205, $result['recommended_battery']['ah']); // 4,500 Wh night > 4,096
        $this->assertSame(100, $result['battery']['ah']);
        $this->assertEqualsWithDelta(8.54, $result['array_kwp'], 0.0001);
    }

    public function test_evaluate_rejects_package_below_recommended(): void
    {
        // Total load 4,500 W + 2,000 = 6,500 W → 8 kW recommended, so 6 kW is refused
        $rows = [['appliance_type' => 'water_heater', 'watts' => 4500, 'qty' => 1, 'day_from' => 8, 'day_to' => 9]];

        $this->expectException(ValidationException::class);
        $this->engine->evaluate($rows, 6, 7, 100);
    }

    public function test_evaluate_rejects_panels_outside_package_range(): void
    {
        $rows = [['appliance_type' => 'freezer', 'watts' => 100, 'qty' => 1]];

        $this->expectException(ValidationException::class);
        $this->engine->evaluate($rows, 5, 3, 100); // 5 kW takes 4–12 panels
    }

    public function test_evaluate_rejects_unknown_battery(): void
    {
        $rows = [['appliance_type' => 'freezer', 'watts' => 100, 'qty' => 1]];

        $this->expectException(ValidationException::class);
        $this->engine->evaluate($rows, 5, 4, 150);
    }

    public function test_savings_follow_the_clients_day_then_battery_formula(): void
    {
        // The client's example: 10 panels, 8,560 Wh day, 7,120 Wh night, 205 Ah (8,396.8 Wh)
        //   production  = 610 × 10 × 6 h × 80% = 29,280 Wh/day
        //   left over   = 29,280 − 8,560 = 20,720 Wh → charges the battery
        //   night       = 7,120 − 8,396.8 → fully covered, nothing from SORECO
        // Bill amount only → SORECO's ₱13; savings = the whole ₱6,575 bill
        // ROI = 408,600 ÷ 6,575 ÷ 12 = 5.18 years
        $savings = $this->engine->computeSavings(8560, 7120, 10, 8396.8, 408600, [
            ['amount' => 6575, 'kwh' => null],
            ['amount' => '', 'kwh' => ''],
        ]);

        $this->assertEqualsWithDelta(878.4, $savings['production_kwh'], 0.0001); // 29,280 × 30 ÷ 1000
        $this->assertEqualsWithDelta(8560, $savings['day_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(20720, $savings['left_over_wh'], 0.0001);
        $this->assertEqualsWithDelta(7120, $savings['night_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(0, $savings['grid_kwh'], 0.0001);
        $this->assertEqualsWithDelta(SolarComputationService::DEFAULT_RATE_PER_KWH, $savings['rate'], 0.0001);
        $this->assertSame('default', $savings['rate_source']);
        $this->assertEqualsWithDelta(6575, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(0, $savings['new_monthly_bill'], 0.0001);
        $this->assertEqualsWithDelta(408600 / 6575 / 12, $savings['payback_years'], 0.0001);
    }

    public function test_a_small_battery_leaves_part_of_the_night_on_the_grid(): void
    {
        // Same house with a 100 Ah battery (4,096 Wh):
        //   night not covered = 7,120 − 4,096 = 3,024 Wh/day → 90.72 kWh/month × ₱13 = ₱1,179.36
        //   savings = 6,575 − 1,179.36 = ₱5,395.64
        $savings = $this->engine->computeSavings(8560, 7120, 10, 4096, 354000, [['amount' => 6575, 'kwh' => null]]);

        $this->assertEqualsWithDelta(4096, $savings['night_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(90.72, $savings['grid_kwh'], 0.0001);
        $this->assertEqualsWithDelta(5395.64, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(1179.36, $savings['new_monthly_bill'], 0.0001);
    }

    public function test_the_battery_only_charges_from_what_the_panels_leave_over(): void
    {
        // 4 panels make 610 × 4 × 6 × 0.8 = 11,712 Wh; 8,000 Wh day leaves 3,712 Wh,
        // so a 205 Ah battery only covers 3,712 of the 6,000 Wh night.
        // Night from SORECO: 2,288 Wh/day → 68.64 kWh × ₱13 = ₱892.32
        // No bill → it's estimated: 14,000 Wh/day → 420 kWh × ₱13 = ₱5,460
        $savings = $this->engine->computeSavings(8000, 6000, 4, 8396.8, 100000);

        $this->assertEqualsWithDelta(3712, $savings['night_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(68.64, $savings['grid_kwh'], 0.0001);
        $this->assertEqualsWithDelta(5460 - 892.32, $savings['monthly_savings'], 0.0001);
        $this->assertNull($savings['monthly_bill']);
        $this->assertNull($savings['new_monthly_bill']);
    }

    public function test_daytime_the_panels_cannot_cover_is_bought_from_the_grid(): void
    {
        // 20,000 Wh day but 4 panels make only 11,712 Wh → 8,288 Wh/day from SORECO,
        // nothing left over for the battery. Bill rate: 3,000 ÷ 250 = ₱12.
        //   grid = 248.64 kWh × 12 = 2,983.68 → savings = 3,000 − 2,983.68 = 16.32
        $savings = $this->engine->computeSavings(20000, 0, 4, 4096, 100000, [['amount' => 3000, 'kwh' => 250]]);

        $this->assertEqualsWithDelta(11712, $savings['day_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(0, $savings['left_over_wh'], 0.0001);
        $this->assertEqualsWithDelta(248.64, $savings['grid_kwh'], 0.0001);
        $this->assertSame('bill', $savings['rate_source']);
        $this->assertEqualsWithDelta(16.32, $savings['monthly_savings'], 0.0001);
    }

    public function test_savings_never_go_below_zero(): void
    {
        // Same 8,288 Wh/day from the grid at ₱13 = ₱3,232.32, more than the ₱1,000 bill
        $savings = $this->engine->computeSavings(20000, 0, 4, 4096, 100000, [['amount' => 1000, 'kwh' => null]]);

        $this->assertEqualsWithDelta(0, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(1000, $savings['new_monthly_bill'], 0.0001);
        $this->assertNull($savings['payback_years']);
    }

    public function test_savings_use_the_rate_from_the_bills(): void
    {
        // Rates: 3,000 ÷ 250 = 12 and 2,200 ÷ 200 = 11 → average 11.5; bill average 2,600.
        // 4 panels cover the whole 5,000 Wh day → nothing from the grid → savings = 2,600
        $savings = $this->engine->computeSavings(5000, 0, 4, 4096, 207000, [
            ['amount' => 3000, 'kwh' => 250],
            ['amount' => 2200, 'kwh' => 200],
        ]);

        $this->assertEqualsWithDelta(150, $savings['usage_kwh'], 0.0001);
        $this->assertEqualsWithDelta(11.5, $savings['rate'], 0.0001);
        $this->assertSame('bill', $savings['rate_source']);
        $this->assertEqualsWithDelta(2600, $savings['monthly_bill'], 0.0001);
        $this->assertEqualsWithDelta(2600, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(31200, $savings['annual_savings'], 0.0001);
        $this->assertEqualsWithDelta(207000 / 2600 / 12, $savings['payback_years'], 0.0001);
    }

    public function test_no_payback_when_there_are_no_savings(): void
    {
        $savings = $this->engine->computeSavings(0, 0, 4, 4096, 100000);

        $this->assertEqualsWithDelta(0, $savings['monthly_savings'], 0.0001);
        $this->assertNull($savings['payback_years']);
    }

    public function test_return_on_asset_and_lifetime_gain(): void
    {
        // ₱20,700 a year on a ₱207,000 system → ROA 10% a year
        // 25 years × 20,700 = 517,500 → net gain 310,500 → 150% lifetime ROI
        $return = $this->engine->computeReturn(20700, 207000);

        $this->assertEqualsWithDelta(10, $return['roa_percent'], 0.0001);
        $this->assertEqualsWithDelta(517500, $return['lifetime_savings'], 0.0001);
        $this->assertEqualsWithDelta(310500, $return['net_gain'], 0.0001);
        $this->assertEqualsWithDelta(150, $return['lifetime_roi_percent'], 0.0001);
    }

    public function test_net_gain_can_be_negative(): void
    {
        // ₱10,000 a year on a ₱400,000 system → 25 years saves only 250,000
        $return = $this->engine->computeReturn(10000, 400000);

        $this->assertEqualsWithDelta(2.5, $return['roa_percent'], 0.0001);
        $this->assertEqualsWithDelta(-150000, $return['net_gain'], 0.0001);
    }

    public function test_savings_include_the_return(): void
    {
        // Same inputs as test_savings_use_the_rate_from_the_bills: 31,200 a year on 207,000
        // ROA = 31,200 ÷ 207,000 × 100; net gain = 31,200 × 25 − 207,000 = 573,000
        $savings = $this->engine->computeSavings(5000, 0, 4, 4096, 207000, [['amount' => 3000, 'kwh' => 250], ['amount' => 2200, 'kwh' => 200]]);

        $this->assertEqualsWithDelta(31200 / 207000 * 100, $savings['roa_percent'], 0.0001);
        $this->assertEqualsWithDelta(573000, $savings['net_gain'], 0.0001);
    }

    public function test_evaluate_includes_savings(): void
    {
        // 1,500 W freezer for 3 night hours = 4,500 Wh; 10 panels leave plenty to
        // charge the 205 Ah battery, so the night is covered and the whole ₱3,000 bill is saved
        $rows = [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]];
        $result = $this->engine->evaluate($rows, 8, 10, 205, [['amount' => 3000, 'kwh' => 250]]);

        $this->assertEqualsWithDelta(4500, $result['savings']['night_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(3000, $result['savings']['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(
            $result['quote']['total'] / 3000 / 12,
            $result['savings']['payback_years'],
            0.0001
        );
    }

    public function test_evaluate_uses_the_battery_the_customer_picked(): void
    {
        // Same freezer, but the 100 Ah battery (4,096 Wh) leaves 404 Wh of the night
        // on the grid: 12.12 kWh × ₱12 = ₱145.44 → savings 3,000 − 145.44 = 2,854.56
        $rows = [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]];
        $result = $this->engine->evaluate($rows, 8, 10, 100, [['amount' => 3000, 'kwh' => 250]]);

        $this->assertEqualsWithDelta(4096, $result['savings']['night_covered_wh'], 0.0001);
        $this->assertEqualsWithDelta(2854.56, $result['savings']['monthly_savings'], 0.0001);
    }
}
