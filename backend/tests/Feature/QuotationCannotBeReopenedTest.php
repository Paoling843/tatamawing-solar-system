<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationCannotBeReopenedTest extends TestCase
{
    use RefreshDatabase;

    // The old "submit" route set any request back to pending, even an
    // approved one; it was removed (new requests start as pending)
    public function test_a_customer_cannot_send_an_approved_request_back_to_pending(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);
        $quotationRequest = QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/quotation-requests/{$quotationRequest->id}/submit")
            ->assertNotFound();

        $this->assertSame('approved', $quotationRequest->fresh()->status);
    }
}
