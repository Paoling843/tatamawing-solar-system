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
}
