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

    public function test_ledger_totals_add_the_2000_buffer(): void
    {
        $load = $this->engine->computeLoad([
            ['appliance_type' => 'aircon', 'hp' => 1, 'qty' => 1, 'day_from' => 8, 'day_to' => 10, 'night_from' => 20, 'night_to' => 22],
            ['appliance_type' => 'freezer', 'watts' => 150, 'qty' => 1, 'day_from' => 8, 'day_to' => 16, 'night_from' => 16, 'night_to' => 32],
        ]);

        // Day: 800×2 + 150×8 = 2,800   Night: 800×2 + 150×16 = 4,000
        $this->assertEquals(2800, $load['total_day_wh']);
        $this->assertEquals(4000, $load['total_night_wh']);
        $this->assertEquals(6800, $load['grand_total_wh']);
        $this->assertEquals(8800, $load['adjusted_total_wh']);
    }

    public function test_package_recommendation_boundaries(): void
    {
        $this->assertSame(0, $this->engine->recommendPackageIndex(2999));  // under floor → 5 kW
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
        // Night: 1,500 W × 3 h = 4,500 Wh → adjusted 6,500 Wh → 8 kW recommended.
        // Upgrading to 10 kW (14 panels) and picking a battery smaller than
        // the recommended one are both allowed.
        $rows = [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]];
        $result = $this->engine->evaluate($rows, 10, 14, 100);

        $this->assertSame(8, $result['recommended_package']['kw']);
        $this->assertSame(10, $result['package']['kw']);
        $this->assertSame(205, $result['recommended_battery']['ah']); // 4,500 Wh night > 4,096
        $this->assertSame(100, $result['battery']['ah']);
        $this->assertEqualsWithDelta(8.54, $result['array_kwp'], 0.0001);
    }

    public function test_evaluate_rejects_package_below_recommended(): void
    {
        // 8 h × 1,000 W day + buffer = 10,000 Wh → 10 kW recommended
        $rows = [['appliance_type' => 'water_heater', 'watts' => 1000, 'qty' => 1, 'day_from' => 8, 'day_to' => 16]];

        $this->expectException(ValidationException::class);
        $this->engine->evaluate($rows, 8, 10, 100);
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

    public function test_savings_use_the_rate_from_the_bills(): void
    {
        // 4 panels → 2.44 kWp × 4.5 h × 0.8 × 30 = 263.52 kWh/month made
        // 5,000 Wh/day → 150 kWh/month used
        // Rates: 3,000 ÷ 250 = 12 and 2,200 ÷ 200 = 11 → average 11.5
        // Savings: 150 × 11.5 = 1,725 (under the 2,600 average bill)
        $savings = $this->engine->computeSavings(5000, 4, 207000, [
            ['amount' => 3000, 'kwh' => 250],
            ['amount' => 2200, 'kwh' => 200],
        ]);

        $this->assertEqualsWithDelta(263.52, $savings['production_kwh'], 0.0001);
        $this->assertEqualsWithDelta(150, $savings['usage_kwh'], 0.0001);
        $this->assertEqualsWithDelta(11.5, $savings['rate'], 0.0001);
        $this->assertSame('bill', $savings['rate_source']);
        $this->assertEqualsWithDelta(2600, $savings['monthly_bill'], 0.0001);
        $this->assertEqualsWithDelta(1725, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(875, $savings['new_monthly_bill'], 0.0001);
        $this->assertEqualsWithDelta(20700, $savings['annual_savings'], 0.0001);
        $this->assertEqualsWithDelta(10, $savings['payback_years'], 0.0001); // 207,000 ÷ 20,700
    }

    public function test_savings_fall_back_to_the_default_rate_without_kwh(): void
    {
        // Bill amount only → default ₱12/kWh. 150 kWh × 12 = 1,800, under the 2,000 bill.
        $savings = $this->engine->computeSavings(5000, 4, 100000, [
            ['amount' => 2000, 'kwh' => null],
            ['amount' => '', 'kwh' => ''],
        ]);

        $this->assertEqualsWithDelta(SolarComputationService::DEFAULT_RATE_PER_KWH, $savings['rate'], 0.0001);
        $this->assertSame('default', $savings['rate_source']);
        $this->assertEqualsWithDelta(2000, $savings['monthly_bill'], 0.0001);
        $this->assertEqualsWithDelta(1800, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(200, $savings['new_monthly_bill'], 0.0001);
    }

    public function test_savings_never_exceed_the_bill(): void
    {
        // 20,000 Wh/day → 600 kWh; 10 panels make 658.8 kWh → 600 × 12 = 7,200,
        // but the bill is only 5,000, so savings stop at 5,000 and the new bill is 0.
        $savings = $this->engine->computeSavings(20000, 10, 100000, [['amount' => 5000, 'kwh' => null]]);

        $this->assertEqualsWithDelta(5000, $savings['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(0, $savings['new_monthly_bill'], 0.0001);
    }

    public function test_savings_are_limited_by_what_the_panels_make(): void
    {
        // 600 kWh used but 4 panels only make 263.52 kWh → 263.52 × 12 = 3,162.24.
        // No bills → no bill cap and no new bill.
        $savings = $this->engine->computeSavings(20000, 4, 100000);

        $this->assertEqualsWithDelta(3162.24, $savings['monthly_savings'], 0.0001);
        $this->assertNull($savings['monthly_bill']);
        $this->assertNull($savings['new_monthly_bill']);
    }

    public function test_no_payback_when_there_are_no_savings(): void
    {
        $savings = $this->engine->computeSavings(0, 4, 100000);

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
        // Same inputs as test_savings_use_the_rate_from_the_bills: 20,700 a year on 207,000
        $savings = $this->engine->computeSavings(5000, 4, 207000, [['amount' => 3000, 'kwh' => 250], ['amount' => 2200, 'kwh' => 200]]);

        $this->assertEqualsWithDelta(10, $savings['roa_percent'], 0.0001);
        $this->assertEqualsWithDelta(310500, $savings['net_gain'], 0.0001);
    }

    public function test_evaluate_includes_savings(): void
    {
        $rows = [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]];
        $result = $this->engine->evaluate($rows, 8, 10, 205, [['amount' => 3000, 'kwh' => 250]]);

        // 4,500 Wh/day → 135 kWh × ₱12 = 1,620
        $this->assertEqualsWithDelta(1620, $result['savings']['monthly_savings'], 0.0001);
        $this->assertEqualsWithDelta(
            $result['quote']['total'] / (1620 * 12),
            $result['savings']['payback_years'],
            0.0001
        );
    }
}
