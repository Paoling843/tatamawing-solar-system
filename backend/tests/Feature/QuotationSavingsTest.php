<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationSavingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_submitted_quotation_saves_the_savings_estimate(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        Customer::create([
            'user_id' => $user->id,
            'contact_number' => '+639171234567',
        ]);

        // Freezer 1,500 W × 3 night hours = 4,500 Wh/day → 135 kWh/month
        // 10 panels make 29,280 Wh/day, so the 205 Ah battery (8,396.8 Wh) is fully
        // charged and covers the whole night: nothing from SORECO, the ₱3,000 bill is saved
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/quotation-requests', [
            'appliances' => [[
                'appliance_type' => 'freezer',
                'watts' => 1500,
                'qty' => 1,
                'night_from' => 16,
                'night_to' => 19,
            ]],
            'bills' => [
                ['billing_month' => '2026-09', 'amount' => 3000, 'kwh' => 250],
            ],
            'location' => ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Bical', 'purok' => 'Purok 2'],
            'package_kw' => 8,
            'panel_count' => 10,
            'battery_ah' => 205,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('quotation_request.solar_computation.rate_source', 'bill');

        $this->assertDatabaseHas('solar_computations', [
            'quotation_request_id' => $response->json('quotation_request.id'),
            'electricity_rate' => 12,
            'monthly_usage_kwh' => 135,
            'monthly_bill' => 3000,
            'monthly_savings' => 3000,
            'new_monthly_bill' => 0,
            'annual_savings' => 36000,
            // Sizing: 1,500 W + 2,000 = 3,500 W → 5 kW recommended (8 kW is an upgrade);
            // 3,500 ÷ 610 = 5 panels → raised to the 8 kW minimum of 10
            'total_load_w' => 1500,
            'inverter_size_w' => 3500,
            'recommended_package_kw' => 5,
            'recommended_panels' => 10,
        ]);
    }

    public function test_a_big_night_load_adds_a_second_battery_to_the_314_ah(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        Customer::create([
            'user_id' => $user->id,
            'contact_number' => '+639171234567',
        ]);

        // 2,690 W for 8 night hours = 21,520 Wh, more than one 314 Ah (12,861.44 Wh).
        // The 8,658.56 Wh left over gets the cheapest battery that holds it, the 280 Ah:
        // 314 Ah + 280 Ah = 24,330.24 Wh for ₱166,600 + ₱102,200
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/quotation-requests', [
            'appliances' => [[
                'appliance_type' => 'other',
                'custom_name' => 'Night loads',
                'watts' => 2690,
                'qty' => 1,
                'night_from' => 16,
                'night_to' => 24,
            ]],
            'bills' => [
                ['billing_month' => '2026-09', 'amount' => 9000, 'kwh' => null],
            ],
            'location' => ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Bical', 'purok' => 'Purok 2'],
            'package_kw' => 5,
            'panel_count' => 7,
            'battery_ah' => 314,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('solar_computations', [
            'quotation_request_id' => $response->json('quotation_request.id'),
            'battery_ah' => 314,
            'battery_qty' => 1,
            'extra_battery_ah' => 280,
            'battery_wh' => 24330.24,
        ]);

        $items = collect($response->json('quotation_request.solar_computation.line_items'));
        $this->assertEquals(166600, $items->firstWhere('key', 'battery')['amount']);
        $this->assertEquals(102200, $items->firstWhere('key', 'battery_extra')['amount']);
    }
}
