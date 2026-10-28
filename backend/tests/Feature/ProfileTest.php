<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => Hash::make('oldpass123'),
        ]);
        Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return $user;
    }

    public function test_a_customer_summary_counts_their_requests(): void
    {
        $user = $this->customer();
        foreach (['pending', 'approved', 'approved'] as $status) {
            QuotationRequest::create([
                'customer_id' => $user->customer->id,
                'solar_system_type' => 'hybrid',
                'submission_date' => now()->toDateString(),
                'status' => $status,
            ]);
        }

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/profile/summary')
            ->assertOk()
            ->assertJsonPath('stats.0', ['label' => 'Quotation requests', 'value' => 3])
            ->assertJsonPath('stats.1', ['label' => 'Approved quotations', 'value' => 2])
            ->assertJsonPath('stats.2', ['label' => 'Installations', 'value' => 0])
            ->assertJsonPath('activity', []);
    }

    public function test_the_admin_summary_shows_their_own_audit_log_entries(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $other = User::factory()->create(['role' => 'admin']);
        $entry = fn (User $who, string $action, string $text) => AuditLog::create([
            'action' => $action, 'actor_type' => User::class, 'actor_id' => $who->id,
            'description' => $text, 'target_label' => '#Q-2026-001',
        ]);
        $entry($admin, 'quotation_approved', 'Approved quotation request.');
        $entry($other, 'faq_created', 'Created an FAQ.');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/profile/summary')
            ->assertOk()
            ->assertJsonPath('stats.0.label', 'Quotes approved')
            ->assertJsonCount(1, 'activity')
            ->assertJsonPath('activity.0.label', 'Approved quotation request · #Q-2026-001')
            ->assertJsonPath('activity.0.tone', 'approved');
    }

    public function test_a_customer_updates_name_and_mobile_but_not_email(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', [
                'name' => '  Juan   Santos ',
                'contact_number' => '+63 918 765 4321',
                'email' => 'someone.else@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Juan Santos')
            ->assertJsonPath('user.customer.contact_number', '+639187654321');

        $this->assertSame('juan@example.com', $user->fresh()->email);
    }

    public function test_the_admin_updates_the_name_without_a_mobile(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Old Name']);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/profile', ['name' => 'Tata Mawing'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Tata Mawing');
    }

    public function test_bad_details_get_field_messages(): void
    {
        $this->actingAs($this->customer(), 'sanctum')
            ->putJson('/api/profile', ['name' => 'J', 'contact_number' => '0917'])
            ->assertStatus(422)
            ->assertJsonPath('errors.name.0', 'Enter your full name.')
            ->assertJsonPath('errors.contact_number.0', 'Enter a 10-digit mobile number after +63.');
    }

    public function test_changing_the_password_needs_the_current_one(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/password', [
                'current_password' => 'wrongpass1',
                'password' => 'newpass456',
                'password_confirmation' => 'newpass456',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.current_password.0', 'Your current password is incorrect.');

        $this->assertTrue(Hash::check('oldpass123', $user->fresh()->password));
    }

    public function test_changing_the_password_keeps_this_device_and_signs_out_the_others(): void
    {
        $user = $this->customer();
        $user->createToken('old-phone');
        $thisDevice = $user->createToken('this-laptop')->plainTextToken;

        $this->withToken($thisDevice)
            ->putJson('/api/profile/password', [
                'current_password' => 'oldpass123',
                'password' => 'newpass456',
                'password_confirmation' => 'newpass456',
                'sign_out_others' => true,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Your password was changed, and your other devices were signed out.');

        $user->refresh();
        $this->assertTrue(Hash::check('newpass456', $user->password));
        $this->assertSame(['this-laptop'], $user->tokens()->pluck('name')->all());
    }

    public function test_the_new_password_must_differ_and_follow_the_rules(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/password', [
                'current_password' => 'oldpass123',
                'password' => 'oldpass123',
                'password_confirmation' => 'oldpass123',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.password.0', 'Choose a password different from your current one.');
    }
}
