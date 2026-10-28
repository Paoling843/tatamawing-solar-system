<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// "Ask about this quote": the customer's message carries the quotation it's
// about, so the admin sees which one
class AskAboutQuotationTest extends TestCase
{
    use RefreshDatabase;

    private function customerWithRequest(): array
    {
        $user = User::factory()->create(['role' => 'customer']);
        $customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        $request = QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        return [$user, $request];
    }

    public function test_the_message_carries_the_quotation_reference(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$user, $request] = $this->customerWithRequest();
        $reference = '#Q-'.$request->created_at->format('Y').'-'.str_pad($request->id, 3, '0', STR_PAD_LEFT);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', [
                'receiver_id' => $admin->id,
                'message' => 'Can the battery be bigger?',
                'quotation_request_id' => $request->id,
            ])
            ->assertCreated()
            ->assertJsonPath('chat_message.meta.quotation_request_id', $request->id)
            ->assertJsonPath('chat_message.meta.quotation_reference', $reference);

        // The admin sees it in the conversation
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/messages/{$user->id}")
            ->assertOk()
            ->assertJsonPath('0.meta.quotation_reference', $reference);
    }

    public function test_a_customer_cannot_attach_someone_elses_quotation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [, $theirRequest] = $this->customerWithRequest();
        [$other] = $this->customerWithRequest();

        $this->actingAs($other, 'sanctum')
            ->postJson('/api/messages', [
                'receiver_id' => $admin->id,
                'message' => 'Hello',
                'quotation_request_id' => $theirRequest->id,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', "We couldn't find that quotation on your account.");

        $this->assertSame(0, ChatMessage::count());
    }

    public function test_a_plain_message_has_no_quotation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$user] = $this->customerWithRequest();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $admin->id, 'message' => 'Hi'])
            ->assertCreated()
            ->assertJsonPath('chat_message.meta', null);
    }
}
