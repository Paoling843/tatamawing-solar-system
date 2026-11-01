<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelQuotationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customerUser;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customerUser = User::factory()->create(['role' => 'customer', 'name' => 'Johnny Boy']);
        $this->customer = Customer::create(['user_id' => $this->customerUser->id, 'contact_number' => '+639171234567']);
    }

    private function request(string $status): QuotationRequest
    {
        return QuotationRequest::create([
            'customer_id' => $this->customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => $status,
        ]);
    }

    private function approvedWithSchedule(string $scheduleStatus): array
    {
        $request = $this->request('approved');
        $quotation = Quotation::create([
            'quotation_request_id' => $request->id,
            'approval_date' => now(),
            'adjusted_cost' => 300000, 'labor_fee' => 0, 'transportation_fee' => 0, 'total_amount' => 300000,
        ]);
        $schedule = InstallationSchedule::create([
            'quotation_id' => $quotation->id,
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'James',
            'status' => $scheduleStatus,
        ]);

        return [$request, $schedule];
    }

    private function cancel(QuotationRequest $request, array $body = [], ?User $as = null)
    {
        return $this->actingAs($as ?? $this->customerUser, 'sanctum')
            ->postJson("/api/quotation-requests/{$request->id}/cancel", $body);
    }

    public function test_a_pending_request_can_be_cancelled_with_a_reason(): void
    {
        $request = $this->request('pending');

        $this->cancel($request, ['reason' => '  Found a cheaper offer.  '])
            ->assertOk()
            ->assertJsonPath('quotation_request.status', 'cancelled')
            ->assertJsonPath('quotation_request.cancellation_reason', 'Found a cheaper offer.');

        $this->assertNotNull($request->fresh()->cancelled_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'quotation_cancelled', 'target_id' => $request->id]);

        // The admins hear about it
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.kind', 'quotation_cancelled')
            ->assertJsonPath('notifications.0.body', 'Found a cheaper offer.');

        // ...and can no longer approve it
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertForbidden();
    }

    public function test_an_approved_request_with_a_booked_installation_frees_the_day(): void
    {
        [$request, $schedule] = $this->approvedWithSchedule('scheduled');

        $this->cancel($request)->assertOk();

        $this->assertSame('cancelled', $request->fresh()->status);
        $this->assertNull($request->fresh()->cancellation_reason);
        $this->assertNull(InstallationSchedule::find($schedule->id));

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.body', 'Their installation was removed from the schedule. No reason given.');
    }

    public function test_it_cannot_be_cancelled_once_the_installation_has_started_or_finished(): void
    {
        [$started] = $this->approvedWithSchedule('in_progress');
        $this->cancel($started)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your installation has already started. Please message us if you need to stop it.');

        [$finished] = $this->approvedWithSchedule('completed');
        $this->cancel($finished)->assertStatus(422);

        $this->assertSame('approved', $started->fresh()->status);
    }

    public function test_rejected_or_already_cancelled_requests_cannot_be_cancelled(): void
    {
        $this->cancel($this->request('rejected'))->assertStatus(422);
        $this->cancel($this->request('cancelled'))->assertStatus(422);
    }

    public function test_only_the_owner_can_cancel(): void
    {
        $request = $this->request('pending');

        $other = User::factory()->create(['role' => 'customer']);
        Customer::create(['user_id' => $other->id, 'contact_number' => '+639181234567']);

        $this->cancel($request, [], $other)->assertForbidden();
        $this->cancel($request, [], $this->admin)->assertForbidden();
        $this->assertSame('pending', $request->fresh()->status);
    }
}
