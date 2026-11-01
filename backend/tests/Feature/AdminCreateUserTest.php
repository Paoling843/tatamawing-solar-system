<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCreateUserTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function create(array $data)
    {
        return $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', $data + [
            'first_name' => 'Ana',
            'last_name' => 'Cruz',
            // A real mail domain: the email's domain is checked
            'email' => 'ana.cruz@gmail.com',
            'password' => 'Solar2026',
        ]);
    }

    public function test_the_admin_can_create_a_customer_who_can_then_sign_in(): void
    {
        $this->create(['role' => 'customer', 'contact_number' => '+63 917 123 4567'])
            ->assertCreated()
            ->assertJsonPath('user.name', 'Ana Cruz')
            ->assertJsonPath('user.role', 'customer')
            ->assertJsonPath('user.contact_number', '+639171234567')
            ->assertJsonPath('user.quotation_requests_count', 0);

        $this->assertDatabaseHas('audit_logs', ['action' => 'user_created']);

        $this->postJson('/api/login', ['email' => 'ana.cruz@gmail.com', 'password' => 'Solar2026'])
            ->assertOk()
            ->assertJsonPath('user.customer.contact_number', '+639171234567');
    }

    public function test_the_admin_can_create_another_admin(): void
    {
        $this->create(['role' => 'admin'])
            ->assertCreated()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.quotation_requests_count', null);

        $this->assertNotNull(User::where('email', 'ana.cruz@gmail.com')->first()->admin);
    }

    public function test_the_form_is_checked(): void
    {
        // A customer needs a mobile number
        $this->create(['role' => 'customer'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contact_number']);

        $this->create(['role' => 'admin', 'password' => 'short'])->assertJsonValidationErrors(['password']);
        $this->create(['role' => 'owner'])->assertJsonValidationErrors(['role']);

        // The email must not be taken
        $this->create(['role' => 'admin'])->assertCreated();
        $this->create(['role' => 'admin'])
            ->assertJsonValidationErrors(['email'])
            ->assertJsonPath('errors.email.0', 'An account with this email already exists.');
    }

    public function test_customers_cannot_create_accounts(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/admin/users', ['role' => 'admin'])
            ->assertForbidden();
    }
}
