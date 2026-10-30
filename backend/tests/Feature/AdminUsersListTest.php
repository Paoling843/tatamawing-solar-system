<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsersListTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_admin_sees_every_account_newest_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'created_at' => now()->subDays(10)]);

        $withRequest = User::factory()->create(['role' => 'customer', 'created_at' => now()->subDays(5)]);
        $customer = Customer::create(['user_id' => $withRequest->id, 'contact_number' => '+639171234567']);
        QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        // Just signed up: no quotation request yet
        $newcomer = User::factory()->create(['role' => 'customer', 'created_at' => now()]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $newcomer->id)
            ->assertJsonPath('0.quotation_requests_count', 0)
            ->assertJsonPath('1.id', $withRequest->id)
            ->assertJsonPath('1.quotation_requests_count', 1)
            ->assertJsonPath('1.contact_number', '+639171234567')
            ->assertJsonPath('2.role', 'admin')
            ->assertJsonPath('2.quotation_requests_count', null)
            ->assertJsonMissingPath('0.password');
    }

    public function test_customers_cannot_list_users(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }
}
