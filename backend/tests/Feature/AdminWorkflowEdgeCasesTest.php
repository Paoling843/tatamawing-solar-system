<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminWorkflowEdgeCasesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    // A request made before the Solar Computation Engine: no computed cost
    private function legacyQuotationRequest(): QuotationRequest
    {
        $user = User::factory()->create(['role' => 'customer']);
        $customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);
    }

    public function test_approving_without_a_computed_cost_asks_for_one_instead_of_crashing(): void
    {
        Mail::fake();
        $request = $this->legacyQuotationRequest();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This request has no computed system cost. Enter an adjusted cost to approve it.');

        $this->assertSame('pending', $request->fresh()->status);
    }

    public function test_approving_without_a_computed_cost_works_with_an_adjusted_cost(): void
    {
        Mail::fake();
        $request = $this->legacyQuotationRequest();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 350000, 'labor_fee' => 10000])
            ->assertOk();

        $this->assertSame('approved', $request->fresh()->status);
        $this->assertEquals(360000, $request->fresh()->quotation->total_amount);
    }

    public function test_approved_quotation_can_be_scheduled_without_a_purchase_request(): void
    {
        Mail::fake();
        $request = $this->legacyQuotationRequest();
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/schedules', [
                'quotation_id' => $request->fresh()->quotation->id,
                'scheduled_date' => now()->addDays(3)->toDateString(),
                'scheduled_time' => '09:00',
                'assigned_technician' => 'Jerome Gile',
            ])
            ->assertStatus(201);

        $this->assertSame(1, InstallationSchedule::where('quotation_id', $request->fresh()->quotation->id)->count());
    }

    public function test_quotation_still_cannot_be_scheduled_twice(): void
    {
        Mail::fake();
        $request = $this->legacyQuotationRequest();
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000]);

        $payload = [
            'quotation_id' => $request->fresh()->quotation->id,
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_time' => '09:00',
            'assigned_technician' => 'Jerome Gile',
        ];

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/schedules', $payload)->assertStatus(201);
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/schedules', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'An installation schedule already exists for this quotation.');
    }

    public function test_invalid_schedule_status_returns_a_readable_message(): void
    {
        $schedule = InstallationSchedule::create([
            'scheduled_date' => now()->addWeek()->toDateString(),
            'scheduled_time' => '09:00',
            'assigned_technician' => 'Juan Santos',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->patchJson("/api/admin/schedules/{$schedule->id}/status", ['status' => 'cancelled'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Choose a valid status: scheduled, in progress, completed or delayed.')
            ->assertJsonValidationErrors('status');
    }

    public function test_rejecting_an_external_request_succeeds_even_if_the_email_fails(): void
    {
        $external = ExternalInstallationRequest::create([
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'phone' => '09171234567',
            'address' => 'Sorsogon City, Sorsogon',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external-installation-quotations/test.pdf',
            'status' => 'pending_review',
        ]);

        // Simulate the mail server being down
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP unavailable'));

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/external-installation-requests/{$external->id}/reject", [
                'rejection_reason' => 'The quotation file is unreadable.',
            ])
            ->assertOk();

        $this->assertSame('rejected', $external->fresh()->status);
    }
}
