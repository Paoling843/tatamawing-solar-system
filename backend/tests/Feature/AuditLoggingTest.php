<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\ExternalInstallationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLoggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_audit_logs(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@example.com',
        ]);

        AuditLog::create([
            'action' => 'quotation_approved',
            'actor_type' => 'App\\Models\\User',
            'actor_id' => $admin->id,
            'target_type' => 'App\\Models\\QuotationRequest',
            'target_id' => 42,
            'target_label' => 'Quotation Request #42',
            'description' => 'Approved quotation request.',
            'metadata' => ['status' => 'approved'],
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/audit-logs');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'action' => 'quotation_approved',
                'target_label' => 'Quotation Request #42',
            ]);
    }

    public function test_admin_rejection_creates_missing_admin_profile_and_succeeds(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'missing-admin@example.com',
        ]);

        $request = ExternalInstallationRequest::create([
            'name' => 'Test Customer',
            'email' => 'customer@example.com',
            'phone' => '0712345678',
            'address' => 'Nairobi',
            'preferred_installation_date' => '2026-10-01',
            'other_company_name' => 'Other Company',
            'quotation_file_path' => 'external-installation-quotations/test.pdf',
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/external-installation-requests/{$request->id}/reject", [
                'rejection_reason' => 'Not eligible for installation.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('request.status', 'rejected')
            ->assertJsonFragment([
                'message' => 'External installation request rejected.',
            ]);

        $this->assertNotNull($admin->fresh()->admin);
        $this->assertNotNull($request->fresh()->reviewed_by_admin_id);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'external_installation_rejected',
            'target_type' => ExternalInstallationRequest::class,
            'target_id' => $request->id,
        ]);
    }

    public function test_admin_confirmation_creates_schedule_and_succeeds(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'confirm-admin@example.com',
        ]);

        $request = ExternalInstallationRequest::create([
            'name' => 'Confirm Customer',
            'email' => 'confirm-customer@example.com',
            'phone' => '0712345678',
            'address' => 'Sorsogon',
            'preferred_installation_date' => now()->addDay()->toDateString(),
            'other_company_name' => 'Other Company',
            'quotation_file_path' => 'external-installation-quotations/confirm.pdf',
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/external-installation-requests/{$request->id}/confirm", [
                'scheduled_date' => now()->addDay()->toDateString(),
                'scheduled_time' => '09:00',
                'assigned_technician' => 'Technician One',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('request.status', 'confirmed')
            ->assertJsonFragment([
                'message' => 'External installation request confirmed.',
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'external_installation_confirmed',
            'target_type' => ExternalInstallationRequest::class,
            'target_id' => $request->id,
        ]);
    }
}
