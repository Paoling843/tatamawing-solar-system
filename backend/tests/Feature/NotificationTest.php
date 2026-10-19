<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InstallationSchedule;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function pendingRequest(?User $user = null): QuotationRequest
    {
        $user ??= User::factory()->create(['role' => 'customer']);
        $customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);
    }

    public function test_customer_is_notified_when_their_quotation_is_approved(): void
    {
        Mail::fake();
        $customerUser = User::factory()->create(['role' => 'customer']);
        $request = $this->pendingRequest($customerUser);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000, 'labor_fee' => 10000])
            ->assertOk();

        $reference = '#Q-' . $request->created_at->format('Y') . '-' . str_pad($request->id, 3, '0', STR_PAD_LEFT);

        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.kind', 'quotation_approved')
            ->assertJsonPath('notifications.0.title', "{$reference} approved")
            ->assertJsonPath('notifications.0.body', 'Total ₱310,000.00')
            ->assertJsonPath('notifications.0.link', '/customer/my-quotations');
    }

    public function test_customer_is_notified_with_the_reason_when_rejected(): void
    {
        $customerUser = User::factory()->create(['role' => 'customer']);
        $request = $this->pendingRequest($customerUser);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/reject", ['rejection_reason' => 'Please add the aircon horsepower.'])
            ->assertOk();

        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.kind', 'quotation_rejected')
            ->assertJsonPath('notifications.0.body', 'Please add the aircon horsepower.');
    }

    public function test_customer_is_notified_when_installation_is_scheduled_and_moved(): void
    {
        Mail::fake();
        $customerUser = User::factory()->create(['role' => 'customer']);
        $request = $this->pendingRequest($customerUser);
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000]);
        $this->travel(1)->minutes();

        $scheduleId = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/schedules', [
                'quotation_id' => $request->fresh()->quotation->id,
                'scheduled_date' => '2026-11-24',
                'scheduled_time' => '09:00',
                'assigned_technician' => 'Jerome Gile',
            ])
            ->assertStatus(201)
            ->json('schedule.id');

        // Notifications are listed newest first, so keep each step a minute apart
        $this->travel(1)->minutes();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/schedules/{$scheduleId}", [
                'scheduled_date' => '2026-11-26',
                'scheduled_time' => '09:00',
                'assigned_technician' => 'Jerome Gile',
            ])
            ->assertOk();

        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('unread_count', 3)
            ->assertJsonPath('notifications.0.title', 'Installation moved to Nov 26')
            ->assertJsonPath('notifications.1.title', 'Installation set for Nov 24');
    }

    public function test_admins_are_notified_of_a_new_quotation_request(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create(['role' => 'customer', 'name' => 'Juan Bautista']);
        Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        $this->actingAs($user, 'sanctum')->postJson('/api/quotation-requests', [
            'appliances' => [['appliance_type' => 'freezer', 'watts' => 1500, 'qty' => 1, 'night_from' => 16, 'night_to' => 19]],
            'bills' => [],
            'location' => ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Bical'],
            'package_kw' => 8,
            'panel_count' => 10,
            'battery_ah' => 205,
        ])->assertStatus(201);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.kind', 'quotation_new')
            ->assertJsonPath('notifications.0.title', 'New request from Juan Bautista');
    }

    public function test_waiting_reminder_is_created_once(): void
    {
        $admin = $this->admin();
        $request = $this->pendingRequest();
        $request->forceFill(['created_at' => now()->subDays(4)])->save();

        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.kind', 'quotation_waiting');
        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications')
            ->assertJsonPath('unread_count', 1);
    }

    public function test_customer_gets_an_installation_tomorrow_reminder(): void
    {
        $customerUser = User::factory()->create(['role' => 'customer']);
        $customer = Customer::create(['user_id' => $customerUser->id, 'contact_number' => '+639171234567']);
        InstallationSchedule::create([
            'customer_id' => $customer->id,
            'scheduled_date' => now()->addDay()->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'Jerome Gile',
        ]);

        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/api/notifications')
            ->assertJsonPath('notifications.0.kind', 'installation_tomorrow');
    }

    public function test_notifications_can_be_marked_read(): void
    {
        $customerUser = User::factory()->create(['role' => 'customer']);
        $admin = $this->admin();
        $first = $this->pendingRequest($customerUser);
        $second = QuotationRequest::create([
            'customer_id' => $first->customer_id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);
        foreach ([$first, $second] as $request) {
            $this->actingAs($admin, 'sanctum')
                ->postJson("/api/admin/quotation-requests/{$request->id}/reject", ['rejection_reason' => 'Incomplete load details.'])
                ->assertOk();
        }

        $list = $this->actingAs($customerUser, 'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count', 2);

        $this->actingAs($customerUser, 'sanctum')
            ->patchJson('/api/notifications/' . $list->json('notifications.0.id') . '/read')
            ->assertOk();
        $this->actingAs($customerUser, 'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count', 1);

        $this->actingAs($customerUser, 'sanctum')->postJson('/api/notifications/read-all')->assertOk();
        $this->actingAs($customerUser, 'sanctum')->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
    }

    public function test_users_cannot_read_someone_elses_notification(): void
    {
        $owner = User::factory()->create(['role' => 'customer']);
        $request = $this->pendingRequest($owner);
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/reject", ['rejection_reason' => 'Incomplete load details.']);
        $id = $owner->notifications()->first()->id;

        $this->actingAs(User::factory()->create(['role' => 'customer']), 'sanctum')
            ->patchJson("/api/notifications/{$id}/read")
            ->assertNotFound();
    }
}
