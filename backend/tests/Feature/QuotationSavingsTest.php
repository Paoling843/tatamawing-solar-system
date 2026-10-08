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
        // Bill: 3,000 ÷ 250 kWh = ₱12/kWh → 135 × 12 = 1,620 savings, new bill 1,380
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
            'monthly_savings' => 1620,
            'new_monthly_bill' => 1380,
            'annual_savings' => 19440,
        ]);
    }
}
