<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use App\Services\SolarComputationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

// Quotations saved while the default rate was ₱12 are redone at ₱13;
// quotations that used the customer's own bill rate keep it.
class DefaultRateRecomputeTest extends TestCase
{
    use RefreshDatabase;

    private function submit(array $bill): int
    {
        $user = User::factory()->create(['role' => 'customer']);
        Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return $this->actingAs($user, 'sanctum')->postJson('/api/quotation-requests', [
            'appliances' => [[
                'appliance_type' => 'aircon', 'hp' => 1, 'watts' => 1000, 'qty' => 1,
                'day_from' => 8, 'day_to' => 16, 'night_from' => 19, 'night_to' => 23,
            ]],
            'bills' => [['billing_month' => '2026-09'] + $bill],
            'location' => ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Bical', 'purok' => 'Purok 2'],
            'package_kw' => 5,
            'panel_count' => 4,
            'battery_ah' => 100,
        ])->assertCreated()->json('quotation_request.id');
    }

    private function runMigration(): void
    {
        $migration = require database_path('migrations/2026_10_28_000001_recompute_savings_at_default_rate_13.php');
        $migration->up();
    }

    public function test_old_default_rate_quotations_are_redone_at_13(): void
    {
        $id = $this->submit(['amount' => 4000]);
        $fresh = DB::table('solar_computations')->where('quotation_request_id', $id)->first();

        // Make it look like it was saved while the default was ₱12
        DB::table('solar_computations')->where('id', $fresh->id)->update([
            'electricity_rate' => 12,
            'monthly_savings' => 1,
            'new_monthly_bill' => 3999,
            'annual_savings' => 12,
            'payback_years' => 999,
        ]);

        $this->runMigration();

        $after = DB::table('solar_computations')->where('id', $fresh->id)->first();
        $this->assertEquals(SolarComputationService::DEFAULT_RATE_PER_KWH, $after->electricity_rate);
        // Same figures as a quotation submitted today
        $this->assertEquals($fresh->monthly_savings, $after->monthly_savings);
        $this->assertEquals($fresh->new_monthly_bill, $after->new_monthly_bill);
        $this->assertEquals($fresh->annual_savings, $after->annual_savings);
        $this->assertEquals($fresh->payback_years, $after->payback_years);
    }

    public function test_the_customers_own_bill_rate_is_kept(): void
    {
        // ₱3,000 ÷ 250 kWh = ₱12, from the customer's bill
        $id = $this->submit(['amount' => 3000, 'kwh' => 250]);

        $this->runMigration();

        $row = DB::table('solar_computations')->where('quotation_request_id', $id)->first();
        $this->assertSame('bill', $row->rate_source);
        $this->assertEquals(12, $row->electricity_rate);
    }
}
