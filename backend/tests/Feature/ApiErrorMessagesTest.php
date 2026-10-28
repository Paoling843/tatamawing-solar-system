<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Faq;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The API answers errors in plain language: no model names, no
// "Forbidden" / "This action is unauthorized.", and long FAQ answers save.
class ApiErrorMessagesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function customerRequest(): QuotationRequest
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

    public function test_a_missing_record_gives_a_friendly_not_found_message(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/quotation-requests/99999')
            ->assertNotFound()
            ->assertExactJson(['message' => "We couldn't find that. It may have been removed."]);
    }

    public function test_a_customer_on_an_admin_route_gets_a_plain_message(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/quotation-requests')
            ->assertForbidden()
            ->assertJsonPath('message', "Your account doesn't have access to this page.");
    }

    public function test_viewing_someone_elses_quotation_gives_a_plain_message(): void
    {
        $request = $this->customerRequest();
        $other = User::factory()->create(['role' => 'customer']);
        Customer::create(['user_id' => $other->id, 'contact_number' => '+639171234568']);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/quotation-requests/{$request->id}")
            ->assertForbidden()
            ->assertJsonPath('message', "You don't have permission to do this.");
    }

    public function test_a_wrong_password_says_so_plainly(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'not-the-password'])
            ->assertStatus(401)
            ->assertJsonPath('message', "That email and password don't match an account.");
    }

    public function test_logins_are_limited_to_ten_a_minute(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $attempt = fn () => $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password']);

        for ($i = 0; $i < 10; $i++) {
            $attempt()->assertStatus(401);
        }

        $attempt()
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too many attempts. Please wait a minute and try again.');
    }

    public function test_a_request_without_a_token_says_the_session_ended(): void
    {
        $this->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Your session has ended. Please log in again.');
    }

    public function test_a_long_faq_answer_saves(): void
    {
        $answer = str_repeat('Solar panels work best facing south. ', 50); // ~1,850 characters

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/faqs', ['question' => 'Which way should my panels face?', 'answer' => $answer])
            ->assertCreated();

        $this->assertSame(trim($answer), Faq::first()->answer);
    }

    public function test_faq_answers_and_questions_over_the_limit_get_field_messages(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/faqs', ['question' => 'A normal question?', 'answer' => str_repeat('a', 5001)])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Keep the answer under 5,000 characters.')
            ->assertJsonPath('errors.answer.0', 'Keep the answer under 5,000 characters.');

        $faq = Faq::create([
            'question' => 'An existing question?',
            'answer' => 'An existing answer.',
            'created_by' => $admin->admin()->firstOrCreate(['user_id' => $admin->id], ['department' => 'Operations'])->id,
        ]);

        // Editing returns the same message shape as creating
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/faqs/{$faq->id}", ['question' => str_repeat('q', 256), 'answer' => 'A fine answer here.'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Keep the question under 255 characters.');
    }
}
