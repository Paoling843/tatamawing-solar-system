<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Approving or rejecting still works when the email can't be sent, and the
 * admin is told so (email_sent / email_warning) instead of it failing silently.
 */
class DecisionEmailFailureTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function pendingRequest(): QuotationRequest
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

    private function mailIsDown(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('Mail service unavailable'));
    }

    public function test_approval_reports_a_sent_email(): void
    {
        Mail::fake();
        $request = $this->pendingRequest();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertOk()
            ->assertJsonPath('email_sent', true)
            ->assertJsonPath('email_warning', null);
    }

    public function test_approval_is_saved_and_the_admin_is_warned_when_the_email_fails(): void
    {
        $this->mailIsDown();
        $request = $this->pendingRequest();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertOk()
            ->assertJsonPath('email_sent', false)
            ->assertJsonPath('email_warning', "The email to the customer couldn't be sent.");

        $this->assertSame('approved', $request->fresh()->status);
        // Recorded, so it can be checked later
        $this->assertDatabaseHas('audit_logs', ['action' => 'quotation_approved']);
        $this->assertFalse(\App\Models\AuditLog::where('action', 'quotation_approved')->sole()->metadata['email_sent']);
    }

    public function test_rejection_is_saved_and_the_admin_is_warned_when_the_email_fails(): void
    {
        $this->mailIsDown();
        $request = $this->pendingRequest();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/reject", ['rejection_reason' => 'Please add the aircon horsepower.'])
            ->assertOk()
            ->assertJsonPath('email_sent', false);

        $this->assertSame('rejected', $request->fresh()->status);
    }

    public function test_a_customer_without_an_email_counts_as_not_sent(): void
    {
        Mail::fake();
        $request = $this->pendingRequest();
        // e.g. a deleted account whose email was cleared
        \Illuminate\Support\Facades\DB::table('users')->where('id', $request->customer->user_id)->update(['email' => '']);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertOk()
            ->assertJsonPath('email_sent', false);

        Mail::assertNothingSent();
    }
}
