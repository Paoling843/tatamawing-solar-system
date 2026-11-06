<?php

namespace Tests\Feature;

use App\Models\ExternalInstallationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExternalRequestLocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake();
    }

    private function payload(array $location): array
    {
        return [
            'name' => 'Ana Cruz',
            // A real mail domain: the form checks the email's domain exists
            'email' => 'ana.cruz@gmail.com',
            'phone' => '09171234567',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file' => UploadedFile::fake()->create('quotation.pdf', 100, 'application/pdf'),
            'privacy_consent' => true,
        ] + $location;
    }

    public function test_town_and_barangay_are_required_and_must_match(): void
    {
        $this->postJson('/api/external-installation-requests', $this->payload([]))
            ->assertStatus(422)
            ->assertJsonPath('errors.municipality.0', 'Choose the town where the system will be installed.')
            ->assertJsonPath('errors.barangay.0', 'Enter the barangay where the system will be installed.');

        $this->postJson('/api/external-installation-requests', $this->payload(['municipality' => 'Legazpi City', 'barangay' => 'Gate']))
            ->assertStatus(422)
            ->assertJsonPath('errors.municipality.0', 'Choose a town in Sorsogon from the list.');

        $this->postJson('/api/external-installation-requests', $this->payload(['municipality' => 'Bulan', 'barangay' => 'Not A Barangay']))
            ->assertStatus(422)
            ->assertJsonPath('errors.barangay.0', 'Choose a barangay of Bulan from the list.');

        // A barangay of another town
        $this->postJson('/api/external-installation-requests', $this->payload(['municipality' => 'Irosin', 'barangay' => 'Gate']))
            ->assertStatus(422)
            ->assertJsonPath('errors.barangay.0', 'Choose a barangay of Irosin from the list.');
    }

    public function test_a_request_from_another_town_builds_its_address(): void
    {
        $this->postJson('/api/external-installation-requests', $this->payload(['municipality' => 'Santa Magdalena', 'barangay' => 'penafrancia']))
            ->assertStatus(201);

        $request = ExternalInstallationRequest::firstOrFail();
        $this->assertSame('Peñafrancia', $request->install_barangay);
        $this->assertSame('Santa Magdalena', $request->install_municipality);
        $this->assertSame('Brgy. Peñafrancia, Santa Magdalena, Sorsogon', $request->address);
    }

    public function test_location_is_saved_with_official_spelling_and_builds_the_address(): void
    {
        $this->postJson('/api/external-installation-requests', $this->payload([
            'municipality' => 'Bulan',
            'barangay' => 'jp laurel',
            'purok' => '  Purok   5 ',
            'site_description' => "Bungalow, concrete roof.\nGate is blue.",
        ]))->assertStatus(201);

        $request = ExternalInstallationRequest::firstOrFail();
        $this->assertSame('J. P. Laurel', $request->install_barangay);
        $this->assertSame('Bulan', $request->install_municipality);
        $this->assertSame('Sorsogon', $request->install_province);
        $this->assertSame('Purok 5', $request->install_purok);
        $this->assertSame('Purok 5, Brgy. J. P. Laurel, Bulan, Sorsogon', $request->address);
        $this->assertSame("Bungalow, concrete roof.\nGate is blue.", $request->site_description);
    }

    public function test_privacy_consent_is_required(): void
    {
        $payload = $this->payload(['municipality' => 'Bulan', 'barangay' => 'Gate']);
        unset($payload['privacy_consent']);

        $this->postJson('/api/external-installation-requests', $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.privacy_consent.0', 'Please agree to the Privacy Policy to send your request.');

        $this->postJson('/api/external-installation-requests', ['privacy_consent' => false] + $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('privacy_consent');

        $this->assertSame(0, ExternalInstallationRequest::count());
    }

    public function test_external_requests_count_in_top_locations(): void
    {
        $this->postJson('/api/external-installation-requests', $this->payload(['municipality' => 'Bulan', 'barangay' => 'Gate']))->assertStatus(201);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/analytics?days=30')
            ->assertOk()
            ->assertJsonPath('locations.0.name', 'Gate, Bulan')
            ->assertJsonPath('locations.0.count', 1);
    }
}
