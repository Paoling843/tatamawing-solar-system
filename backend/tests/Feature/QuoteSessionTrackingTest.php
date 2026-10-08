<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\ExternalInstallationRequest;
use App\Models\QuoteSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuoteSessionTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        $user = User::factory()->create(['role' => 'customer']);
        Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return $user;
    }

    private function quotationPayload(string $sessionId): array
    {
        return [
            'appliances' => [[
                'appliance_type' => 'freezer',
                'watts' => 1500,
                'qty' => 1,
                'night_from' => 16,
                'night_to' => 19,
            ]],
            'location' => ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Bical', 'purok' => 'Purok 2'],
            'package_kw' => 8,
            'panel_count' => 10,
            'battery_ah' => 205,
            'quote_session_id' => $sessionId,
        ];
    }

    public function test_guest_pings_record_furthest_step_and_request(): void
    {
        $id = (string) Str::uuid();

        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 1])->assertNoContent();
        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 3])->assertNoContent();
        // A late, lower step never moves the session backwards
        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 2])->assertNoContent();
        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 3, 'requested' => true])->assertNoContent();

        $session = QuoteSession::where('session_id', $id)->firstOrFail();
        $this->assertTrue($session->started_as_guest);
        $this->assertSame(3, $session->furthest_step);
        $this->assertNotNull($session->requested_at);
        $this->assertNull($session->user_id);
    }

    public function test_ping_rejects_bad_input(): void
    {
        $this->postJson('/api/quote-sessions/track', ['session_id' => 'not-a-uuid', 'step' => 1])->assertStatus(422);
        $this->postJson('/api/quote-sessions/track', ['session_id' => (string) Str::uuid(), 'step' => 9])->assertStatus(422);
    }

    public function test_guest_who_signs_in_and_submits_is_converted(): void
    {
        $id = (string) Str::uuid();
        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 3, 'requested' => true]);

        $user = $this->customer();
        $this->actingAs($user, 'sanctum');

        // Coming back signed in marks the sign-in
        $this->postJson('/api/quote-sessions/track', ['session_id' => $id, 'step' => 3])->assertNoContent();

        $response = $this->postJson('/api/quotation-requests', $this->quotationPayload($id))->assertStatus(201);

        $session = QuoteSession::where('session_id', $id)->firstOrFail();
        $this->assertTrue($session->started_as_guest);
        $this->assertSame($user->id, $session->user_id);
        $this->assertNotNull($session->signed_in_at);
        $this->assertNotNull($session->converted_at);
        $this->assertSame($response->json('quotation_request.id'), $session->quotation_request_id);
    }

    public function test_admin_use_of_the_calculator_is_not_counted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/quote-sessions/track', ['session_id' => (string) Str::uuid(), 'step' => 3])
            ->assertNoContent();

        $this->assertSame(0, QuoteSession::count());
    }

    public function test_analytics_counts_the_three_way_split(): void
    {
        // 2 guests who saw the quote but left, 1 guest who only opened Step 1
        QuoteSession::create(['session_id' => (string) Str::uuid(), 'furthest_step' => 3]);
        QuoteSession::create(['session_id' => (string) Str::uuid(), 'furthest_step' => 3, 'requested_at' => now()]);
        QuoteSession::create(['session_id' => (string) Str::uuid(), 'furthest_step' => 1]);

        // 1 guest who signed in and submitted, 3 hours after starting
        $converted = QuoteSession::create([
            'session_id' => (string) Str::uuid(),
            'furthest_step' => 3,
            'requested_at' => now(),
            'signed_in_at' => now()->addHours(3),
            'converted_at' => now()->addHours(3),
        ]);
        $converted->forceFill(['created_at' => now()])->save();

        // 1 customer who was already signed in
        QuoteSession::create([
            'session_id' => (string) Str::uuid(),
            'started_as_guest' => false,
            'furthest_step' => 3,
            'converted_at' => now(),
        ]);

        // Older than 30 days — left out of the period counts
        $old = QuoteSession::create(['session_id' => (string) Str::uuid(), 'furthest_step' => 3]);
        $old->forceFill(['created_at' => now()->subDays(40)])->save();

        ExternalInstallationRequest::create([
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'phone' => '09171234567',
            'address' => 'Sorsogon City, Sorsogon',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external-installation-quotations/test.pdf',
            'status' => 'pending_review',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/analytics/quote-sessions?days=30')
            ->assertOk()
            ->assertJsonPath('users.guest_not_continued', 2)
            ->assertJsonPath('users.guest_signed_in', 1)
            ->assertJsonPath('users.external_requests', 1)
            ->assertJsonPath('users.signed_in_customers', 1)
            ->assertJsonPath('guest_steps.started', 4)
            ->assertJsonPath('guest_steps.reached_quote', 3)
            ->assertJsonPath('guest_steps.requested', 2)
            ->assertJsonPath('guest_steps.submitted', 1)
            ->assertJsonPath('avg_hours_to_sign_in', 3)
            ->assertJsonCount(6, 'monthly');
    }

    public function test_customers_cannot_read_analytics(): void
    {
        $this->actingAs($this->customer(), 'sanctum')
            ->getJson('/api/admin/analytics/quote-sessions')
            ->assertStatus(403);
    }
}
