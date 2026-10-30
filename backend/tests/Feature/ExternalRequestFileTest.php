<?php

namespace Tests\Feature;

use App\Models\ExternalInstallationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExternalRequestFileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake();
    }

    // A small but real PDF body (a fake file of a given size has no content)
    private const PDF = "%PDF-1.4\n%test quotation\n";

    private function sendRequest(): ExternalInstallationRequest
    {
        $this->postJson('/api/external-installation-requests', [
            'name' => 'Ana Cruz',
            'email' => 'ana.cruz@gmail.com',
            'phone' => '09171234567',
            'barangay' => 'Gate',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file' => UploadedFile::fake()->createWithContent('quotation.pdf', self::PDF),
            'privacy_consent' => true,
        ])->assertCreated();

        return ExternalInstallationRequest::firstOrFail();
    }

    public function test_the_uploaded_quotation_is_kept_in_the_database(): void
    {
        $record = $this->sendRequest();

        // Nothing written to the server's disk
        $this->assertEmpty(Storage::allFiles());

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->get("/api/admin/external-installation-requests/{$record->id}/quotation")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertSame(self::PDF, $response->getContent());
    }

    public function test_the_file_is_not_sent_in_the_request_list(): void
    {
        $this->sendRequest();

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/external-installation-requests')
            ->assertOk()
            ->assertJsonMissingPath('0.quotation_file')
            ->assertJsonMissingPath('0.content');
    }

    public function test_a_request_whose_file_is_gone_says_so(): void
    {
        $record = ExternalInstallationRequest::create([
            'name' => 'Old Request',
            'email' => 'old@example.com',
            'phone' => '09171234567',
            'address' => 'Brgy. Gate, Bulan, Sorsogon',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external-installation-quotations/wiped.pdf',
            'status' => 'pending_review',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/external-installation-requests/{$record->id}/quotation")
            ->assertNotFound()
            ->assertJsonPath('message', 'The file for this request is no longer available. Ask the customer to send it again.');
    }
}
