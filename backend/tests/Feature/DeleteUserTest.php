<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\Customer;
use App\Models\Faq;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeleteUserTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customerUser;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->admin->admin()->create(['department' => 'Operations']);
        $this->customerUser = User::factory()->create([
            'role' => 'customer', 'name' => 'Johnny Boy', 'email' => 'johnny.boy@gmail.com', 'password' => 'Password123',
        ]);
        $this->customer = Customer::create([
            'user_id' => $this->customerUser->id, 'contact_number' => '+639171234567', 'address' => 'Purok 3, Gate',
        ]);
    }

    private function request(string $status): QuotationRequest
    {
        return QuotationRequest::create([
            'customer_id' => $this->customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => $status,
            'install_purok' => 'Purok 3',
            'install_barangay' => 'Gate',
            'install_municipality' => 'Bulan',
            'install_province' => 'Sorsogon',
            'site_description' => 'Red roof beside the chapel',
        ]);
    }

    private function deleteAs(User $actor, User $target)
    {
        return $this->actingAs($actor, 'sanctum')->deleteJson("/api/admin/users/{$target->id}");
    }

    public function test_deleting_a_customer_removes_their_details_but_keeps_their_quotations(): void
    {
        $approved = $this->request('approved');
        $pending = $this->request('pending');
        ChatMessage::create(['sender_id' => $this->customerUser->id, 'receiver_id' => $this->admin->id, 'message' => 'Hello']);

        $this->deleteAs($this->admin, $this->customerUser)->assertOk();

        $user = $this->customerUser->fresh();
        $this->assertSame('Deleted customer', $user->name);
        $this->assertNotSame('johnny.boy@gmail.com', $user->email);
        $this->assertNotNull($user->account_deleted_at);
        $this->assertSame('', $this->customer->fresh()->contact_number);
        $this->assertNull($this->customer->fresh()->address);

        // Records stay for the reports, without the exact spot or house description
        $this->assertSame('approved', $approved->fresh()->status);
        $this->assertNull($approved->fresh()->install_purok);
        $this->assertNull($approved->fresh()->site_description);
        $this->assertSame('Gate', $approved->fresh()->install_barangay);
        // A request still waiting can't be answered any more
        $this->assertSame('rejected', $pending->fresh()->status);

        $this->assertSame(0, ChatMessage::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'user_deleted', 'target_label' => "Customer account #{$user->id}"]);

        // Gone from the Users page, can't sign in, and the email is free again
        // (a real mail domain: registration checks the email's domain exists)
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users')->assertJsonCount(1);
        $this->postJson('/api/login', ['email' => 'johnny.boy@gmail.com', 'password' => 'Password123'])->assertUnauthorized();
        $this->postJson('/api/register', [
            'first_name' => 'Johnny', 'last_name' => 'Boy', 'email' => 'johnny.boy@gmail.com',
            'password' => 'Password123', 'password_confirmation' => 'Password123', 'contact_number' => '+639171234567',
        ])->assertCreated();
    }

    public function test_a_customer_with_an_unfinished_installation_cannot_be_deleted(): void
    {
        $quotation = Quotation::create([
            'quotation_request_id' => $this->request('approved')->id,
            'approval_date' => now(),
            'adjusted_cost' => 300000, 'labor_fee' => 0, 'transportation_fee' => 0, 'total_amount' => 300000,
        ]);
        $schedule = InstallationSchedule::create([
            'quotation_id' => $quotation->id,
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'James',
            'status' => 'delayed',
        ]);

        $this->deleteAs($this->admin, $this->customerUser)
            ->assertStatus(422)
            ->assertJsonPath('message', "Johnny Boy has an installation on {$schedule->scheduled_date->format('F j, Y')} that isn't finished. Mark it as completed first.");

        $schedule->update(['status' => 'completed']);
        $this->deleteAs($this->admin, $this->customerUser)->assertOk();
    }

    public function test_admins_cannot_delete_themselves_or_the_last_admin(): void
    {
        $this->deleteAs($this->admin, $this->admin)
            ->assertStatus(422)
            ->assertJsonPath('message', "You can't delete your own account. Ask another admin to do it.");

        $other = User::factory()->create(['role' => 'admin']);
        $this->deleteAs($other, $this->admin)->assertOk();

        // $other is now the only admin left
        $this->deleteAs($other, $other)->assertStatus(422);
    }

    public function test_deleting_an_admin_keeps_their_faqs(): void
    {
        $faq = Faq::create([
            'question' => 'How long does an installation take?',
            'answer' => 'Most installations take one to two days.',
            'created_by' => $this->admin->admin->id,
        ]);
        $other = User::factory()->create(['role' => 'admin']);

        $this->deleteAs($other, $this->admin)->assertOk();

        $this->assertNotNull($faq->fresh());
        $this->assertSame('Deleted admin', $this->admin->fresh()->name);
    }

    public function test_customers_cannot_delete_accounts(): void
    {
        $this->deleteAs($this->customerUser, $this->admin)->assertForbidden();
    }
}
