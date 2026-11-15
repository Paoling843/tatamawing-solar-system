<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogPaginationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'name' => 'Shop Owner']);

        // 30 entries, one minute apart; #30 is the newest
        foreach (range(1, 30) as $n) {
            $log = AuditLog::create([
                'action' => 'faq_updated',
                'actor_type' => User::class,
                'actor_id' => $this->admin->id,
                'description' => "Entry {$n}",
            ]);
            $log->forceFill(['created_at' => now()->subMinutes(31 - $n)])->save();
        }
    }

    public function test_first_page_has_the_newest_25_with_paging_details(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonCount(25, 'data')
            ->assertJsonPath('data.0.description', 'Entry 30')
            ->assertJsonPath('data.0.actor_name', 'Shop Owner')
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('last_page', 2)
            ->assertJsonPath('total', 30)
            ->assertJsonPath('from', 1)
            ->assertJsonPath('to', 25);
    }

    public function test_second_page_has_the_oldest_entries(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/audit-logs?page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.4.description', 'Entry 1')
            ->assertJsonPath('from', 26)
            ->assertJsonPath('to', 30);
    }

    public function test_entries_older_than_the_old_200_row_cap_are_reachable(): void
    {
        foreach (range(1, 200) as $n) {
            AuditLog::create(['action' => 'faq_updated', 'actor_type' => User::class, 'actor_id' => $this->admin->id, 'description' => 'Newer']);
        }

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/audit-logs?page=10')
            ->assertOk()
            ->assertJsonPath('total', 230)
            ->assertJsonPath('data.4.description', 'Entry 1');
    }

    public function test_group_filter_returns_only_that_group_with_counts_for_every_tile(): void
    {
        AuditLog::create(['action' => 'quotation_approved', 'actor_type' => User::class, 'actor_id' => $this->admin->id, 'description' => 'Approved']);
        AuditLog::create(['action' => 'installation_schedule_created', 'actor_type' => User::class, 'actor_id' => $this->admin->id, 'description' => 'Scheduled']);
        // Not in the action list: grouped by its name
        AuditLog::create(['action' => 'payment_confirmed', 'actor_type' => User::class, 'actor_id' => $this->admin->id, 'description' => 'Guessed']);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/audit-logs?group=approved')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.description', 'Guessed')
            ->assertJsonPath('data.0.group', 'approved')
            ->assertJsonPath('counts.all', 33)
            ->assertJsonPath('counts.approved', 2)
            ->assertJsonPath('counts.scheduling', 1)
            ->assertJsonPath('counts.content', 30)
            ->assertJsonPath('counts.deleted', 0);
    }

    public function test_unknown_group_is_rejected(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/audit-logs?group=everything')
            ->assertStatus(422);
    }

    public function test_customers_cannot_read_the_audit_log(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/audit-logs')->assertForbidden();
    }
}
