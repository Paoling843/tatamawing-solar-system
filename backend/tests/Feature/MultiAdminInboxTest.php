<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The admins share one inbox: every admin sees every customer chat, any of
// them can reply, and the customer sees one thread with "TataMawing Support"
class MultiAdminInboxTest extends TestCase
{
    use RefreshDatabase;

    private User $adminA; // the oldest admin, the customer chat's target
    private User $adminB;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminA = User::factory()->create(['role' => 'admin', 'name' => 'Admin Anna', 'created_at' => now()->subDay()]);
        $this->adminB = User::factory()->create(['role' => 'admin', 'name' => 'Maria Santos']);
        $this->customer = User::factory()->create(['role' => 'customer', 'name' => 'Johnny Boy']);
        Customer::create(['user_id' => $this->customer->id, 'contact_number' => '+639171234567']);

        // The customer writes to the admin the chat points at (the oldest one)
        $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->adminA->id, 'message' => 'Hello, is 8 kW enough?'])
            ->assertCreated();
    }

    public function test_a_second_admin_sees_the_customer_and_can_reply_in_the_same_thread(): void
    {
        $this->actingAs($this->adminB, 'sanctum')
            ->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user.id', $this->customer->id)
            ->assertJsonPath('0.unread_count', 1)
            ->assertJsonPath('0.latest_from_admin', false);

        $this->actingAs($this->adminB, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->customer->id, 'message' => 'Yes, 8 kW covers it.'])
            ->assertCreated();

        // The customer's badge counts the reply, and it's in their one thread
        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/messages/{$this->adminA->id}/unread")
            ->assertOk()
            ->assertJsonPath('unread_count', 1);

        $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/messages/{$this->adminA->id}")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('1.message', 'Yes, 8 kW covers it.')
            ->assertJsonPath('1.sender.role', 'admin');

        // The list says who sent the latest message
        $this->actingAs($this->adminA, 'sanctum')
            ->getJson('/api/conversations')
            ->assertJsonPath('0.latest_from_admin', true)
            ->assertJsonPath('0.latest_sender_name', 'Maria Santos');
    }

    public function test_reading_a_chat_marks_it_read_for_every_admin(): void
    {
        $this->actingAs($this->adminA, 'sanctum')
            ->getJson("/api/messages/{$this->customer->id}")
            ->assertOk()
            ->assertJsonCount(1);

        $this->actingAs($this->adminB, 'sanctum')
            ->getJson('/api/conversations')
            ->assertJsonPath('0.unread_count', 0);
    }

    public function test_admins_do_not_message_each_other(): void
    {
        $this->actingAs($this->adminB, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->adminA->id, 'message' => 'Hi'])
            ->assertStatus(422);

        $this->actingAs($this->adminB, 'sanctum')
            ->getJson("/api/messages/{$this->adminA->id}")
            ->assertNotFound();
    }
}
