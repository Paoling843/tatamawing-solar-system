<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstallationLocationTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        $user = User::factory()->create(['role' => 'customer']);
        Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);

        return $user;
    }

    private function payload(?array $location): array
    {
        return array_filter([
            'appliances' => [[
                'appliance_type' => 'freezer',
                'watts' => 150,
                'qty' => 1,
                'night_from' => 16,
                'night_to' => 32,
            ]],
            'package_kw' => 5,
            'panel_count' => 4,
            'battery_ah' => 100,
            'location' => $location,
        ], fn ($v) => $v !== null);
    }

    public function test_a_quotation_needs_a_barangay(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(null))
            ->assertStatus(422)
            ->assertJsonValidationErrors('location');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => '']))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Enter the barangay where the system will be installed.');
    }

    public function test_the_location_is_saved_cleaned_up_and_shown_as_an_address(): void
    {
        $response = $this->actingAs($this->customer(), 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload([
                'province' => 'Sorsogon',
                'municipality' => 'Bulan',
                'barangay' => '  San   Isidro ',
                'purok' => 'Purok 4',
            ]))
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.installation_address', 'Purok 4, Brgy. San Isidro, Bulan, Sorsogon');

        $request = QuotationRequest::findOrFail($response->json('quotation_request.id'));
        $this->assertSame('San Isidro', $request->install_barangay);
        $this->assertSame('Bulan', $request->install_municipality);
    }

    public function test_the_site_description_is_optional_and_saved(): void
    {
        $user = $this->customer();
        $location = ['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Gate'];

        // Without one
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload($location))
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.site_description', null);

        // With one — line breaks kept, outer spaces trimmed
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload($location) + [
                'site_description' => "  Two-storey concrete house.\nGI sheet roof facing south, no big trees.  ",
            ])
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.site_description', "Two-storey concrete house.\nGI sheet roof facing south, no big trees.");

        // Too long
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload($location) + ['site_description' => str_repeat('a', 1001)])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Keep the description of your house under 1,000 characters.');
    }

    public function test_bulan_barangays_must_be_official_and_are_saved_with_official_spelling(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => 'Not A Barangay']))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Choose a barangay of Bulan from the list.');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => '  zone ii   poblacion ']))
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.install_barangay', 'Zone II Poblacion');

        // Forgiving matching, same as the website's suggestions
        $this->assertSame('J. P. Laurel', \App\Support\BulanBarangays::canonical('jp laurel'));
        $this->assertSame('Osmeña', \App\Support\BulanBarangays::canonical('osmena'));
        $this->assertSame('Santa Remedios', \App\Support\BulanBarangays::canonical('Sta. Remedios'));
        $this->assertSame('Zone II Poblacion', \App\Support\BulanBarangays::canonical('zone 2'));
        $this->assertSame('Cocok-Cabitan', \App\Support\BulanBarangays::canonical('cocok cabitan'));
        $this->assertNull(\App\Support\BulanBarangays::canonical('Not A Barangay'));

        // Outside Bulan, any barangay name is accepted as typed
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Albay', 'municipality' => 'Legazpi City', 'barangay' => 'Bitano']))
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.install_barangay', 'Bitano');
    }

    public function test_backend_and_frontend_barangay_lists_match(): void
    {
        $js = file_get_contents(base_path('../frontend/src/services/installLocation.js'));
        $this->assertNotFalse($js);

        preg_match('/export const BULAN_BARANGAYS = \[(.*?)\];/s', $js, $m);
        preg_match_all("/'([^']+)'/", $m[1] ?? '', $names);

        $this->assertCount(63, \App\Support\BulanBarangays::NAMES);
        $this->assertSame(\App\Support\BulanBarangays::NAMES, $names[1]);
    }

    public function test_top_locations_group_spellings_together(): void
    {
        $user = $this->customer();
        foreach (['Bical', 'bical', ' BICAL ', 'Gate'] as $barangay) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'Bulan', 'barangay' => $barangay]))
                ->assertStatus(201);
        }

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/analytics?days=30')
            ->assertOk()
            ->assertJsonPath('locations.0.name', 'Bical, Bulan')
            ->assertJsonPath('locations.0.count', 3)
            ->assertJsonPath('locations.1.name', 'Gate, Bulan')
            ->assertJsonPath('locations.1.count', 1);
    }
}
