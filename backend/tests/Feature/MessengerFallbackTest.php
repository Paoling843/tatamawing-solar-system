<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessengerFallbackTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://m.me/tatamawing.solar';

    private User $admin;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->freezeSecond();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customer = User::factory()->create(['role' => 'customer', 'name' => 'Johnny Boy']);
        Customer::create(['user_id' => $this->customer->id, 'contact_number' => '+639171234567']);
    }

    private function settings(array $data)
    {
        return $this->actingAs($this->admin, 'sanctum')->putJson('/api/admin/inbox-settings', $data);
    }

    private function enable(int $delay = 10): void
    {
        $this->settings(['messenger_url' => self::URL, 'fallback_delay_minutes' => $delay, 'fallback_enabled' => true])
            ->assertOk()
            ->assertJsonPath('fallback_enabled', true);
    }

    private function customerSays(string $text): void
    {
        $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->admin->id, 'message' => $text])
            ->assertCreated();
    }

    private function cards()
    {
        return ChatMessage::where('type', ChatMessage::TYPE_MESSENGER_LINK)->get();
    }

    private function adminRefreshes(): void
    {
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/conversations')->assertOk();
    }

    public function test_no_card_when_off_or_before_the_delay(): void
    {
        $this->customerSays('hello');
        $this->travel(30)->minutes();
        $this->adminRefreshes();
        $this->assertCount(0, $this->cards(), 'off: nothing is sent');

        $this->enable(10);
        $this->adminRefreshes();
        $this->assertCount(0, $this->cards(), 'messages from before it was turned on are ignored');

        $this->customerSays('anyone there?');
        $this->travel(9)->minutes();
        $this->adminRefreshes();
        $this->assertCount(0, $this->cards(), 'not yet due');
    }

    public function test_card_is_sent_once_after_the_delay(): void
    {
        $this->enable(10);
        $this->customerSays('hello');
        $sentAt = now()->copy();

        $this->travel(12)->minutes();
        $this->adminRefreshes();
        $this->adminRefreshes();
        $this->customerSays('still there?');
        $this->adminRefreshes();

        $cards = $this->cards();
        $this->assertCount(1, $cards, 'one card until the admin really replies');
        $card = $cards->first();
        $this->assertSame($this->admin->id, $card->sender_id);
        $this->assertSame($this->customer->id, $card->receiver_id);
        $this->assertTrue($card->meta['auto']);
        $this->assertSame(10, $card->meta['after_minutes']);
        $this->assertSame(self::URL, $card->meta['url']);
        $this->assertTrue($card->created_at->eq($sentAt->copy()->addMinutes(10)), 'dated when it became due');
    }

    public function test_customer_chat_refresh_also_sends_it(): void
    {
        $this->enable(5);
        $this->customerSays('hello');
        $this->travel(6)->minutes();

        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/messages/' . $this->admin->id)
            ->assertOk()
            ->assertJsonPath('1.type', 'messenger_link')
            ->assertJsonPath('1.meta.url', self::URL);
    }

    public function test_no_card_when_the_admin_replied_and_a_new_wait_can_get_one(): void
    {
        $this->enable(10);
        $this->customerSays('hello');
        $this->travel(3)->minutes();
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->customer->id, 'message' => 'Hi! How can we help?'])
            ->assertCreated();

        $this->travel(20)->minutes();
        $this->adminRefreshes();
        $this->assertCount(0, $this->cards());

        $this->customerSays('Can I get a quotation?');
        $this->travel(11)->minutes();
        $this->adminRefreshes();
        $this->assertCount(1, $this->cards());
    }

    public function test_settings_validation_and_access(): void
    {
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/inbox-settings')
            ->assertOk()
            ->assertJson(['fallback_enabled' => false, 'fallback_delay_minutes' => 10, 'messenger_url' => null]);

        $this->settings(['fallback_enabled' => true])
            ->assertStatus(422)->assertJsonPath('errors.messenger_url.0', 'Add your Messenger link first.');
        $this->settings(['fallback_delay_minutes' => 7])->assertStatus(422)->assertJsonValidationErrors('fallback_delay_minutes');
        $this->settings(['messenger_url' => 'http://m.me/page'])->assertStatus(422)->assertJsonValidationErrors('messenger_url');
        $this->settings(['messenger_url' => 'https://evil.example.com/page'])->assertStatus(422)->assertJsonValidationErrors('messenger_url');

        $this->enable(15);
        $this->settings(['messenger_url' => ''])->assertOk()
            ->assertJson(['fallback_enabled' => false, 'messenger_url' => null]);

        $this->actingAs($this->customer, 'sanctum')->getJson('/api/admin/inbox-settings')->assertForbidden();
        $this->actingAs($this->customer, 'sanctum')->putJson('/api/admin/inbox-settings', ['fallback_enabled' => false])->assertForbidden();
    }

    public function test_public_contact_shows_only_the_messenger_link(): void
    {
        $this->getJson('/api/contact')->assertOk()->assertExactJson(['messenger_url' => null]);

        $this->enable(10);

        $this->getJson('/api/contact')->assertOk()->assertExactJson(['messenger_url' => self::URL]);
    }

    public function test_admin_can_send_the_link_by_hand(): void
    {
        $send = fn (User $from, int $to) => $this->actingAs($from, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $to, 'type' => 'messenger_link']);

        $send($this->admin, $this->customer->id)->assertStatus(422)->assertJsonPath('message', 'Add your Messenger link first.');

        $this->settings(['messenger_url' => self::URL])->assertOk();
        $send($this->admin, $this->customer->id)
            ->assertCreated()
            ->assertJsonPath('chat_message.type', 'messenger_link')
            ->assertJsonPath('chat_message.meta.auto', false)
            ->assertJsonPath('chat_message.meta.url', self::URL);

        $send($this->customer, $this->admin->id)->assertForbidden();
    }

    public function test_conversations_include_the_linked_request(): void
    {
        $request = QuotationRequest::create([
            'customer_id' => $this->customer->customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
            'install_barangay' => 'Bical',
            'install_municipality' => 'Bulan',
            'install_province' => 'Sorsogon',
        ]);
        $this->customerSays('hello');
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/messages', ['receiver_id' => $this->customer->id, 'message' => 'Hi Johnny'])
            ->assertCreated();

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user.name', 'Johnny Boy')
            ->assertJsonPath('0.user.customer.contact_number', '+639171234567')
            ->assertJsonPath('0.latest_message', 'Hi Johnny')
            ->assertJsonPath('0.latest_from_admin', true)
            ->assertJsonPath('0.unread_count', 1)
            ->assertJsonPath('0.linked_request.id', $request->id)
            ->assertJsonPath('0.linked_request.status', 'pending')
            ->assertJsonPath('0.linked_request.install_barangay', 'Bical')
            ->assertJsonPath('0.linked_request.has_schedule', false);
    }
}
