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

    public function test_barangays_must_be_official_and_are_saved_with_official_spelling(): void
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
        $canonical = fn ($town, $name) => \App\Support\SorsogonBarangays::canonical($town, $name);
        $this->assertSame('J. P. Laurel', $canonical('Bulan', 'jp laurel'));
        $this->assertSame('Osmeña', $canonical('Bulan', 'osmena'));
        $this->assertSame('Santa Remedios', $canonical('Bulan', 'Sta. Remedios'));
        $this->assertSame('Zone II Poblacion', $canonical('Bulan', 'zone 2'));
        $this->assertSame('Cocok-Cabitan', $canonical('Bulan', 'cocok cabitan'));
        $this->assertSame('Santo Niño', $canonical('Sorsogon City', 'sto nino'));
        $this->assertSame('Bitan-o/Dalipay', $canonical('Sorsogon City', 'bitan o dalipay'));
        $this->assertSame('San Antonio (Sapa)', $canonical('Pilar', 'san antonio sapa'));
        $this->assertNull($canonical('Bulan', 'Not A Barangay'));
        // Two barangays share this start, so the customer has to pick one
        $this->assertNull($canonical('Sorsogon City', 'balogo'));
    }

    public function test_every_official_name_matches_itself(): void
    {
        foreach (\App\Support\SorsogonBarangays::TOWNS as $town => $barangays) {
            $this->assertSame($town, \App\Support\SorsogonBarangays::canonicalTown($town));

            foreach ($barangays as $barangay) {
                $this->assertSame($barangay, \App\Support\SorsogonBarangays::canonical($town, $barangay));
            }
        }
    }

    public function test_every_town_in_sorsogon_is_accepted_with_its_own_barangays(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'sorsogon city', 'barangay' => 'bibincahan', 'purok' => 'Purok 1']))
            ->assertStatus(201)
            ->assertJsonPath('quotation_request.install_barangay', 'Bibincahan')
            ->assertJsonPath('quotation_request.install_municipality', 'Sorsogon City')
            ->assertJsonPath('quotation_request.installation_address', 'Purok 1, Brgy. Bibincahan, Sorsogon City, Sorsogon');

        // A barangay of another town isn't accepted
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => 'Irosin', 'barangay' => 'Bical']))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Choose a barangay of Irosin from the list.');

        // Outside Sorsogon isn't either
        foreach ([['Sorsogon', 'Legazpi City'], ['Albay', 'Bulan']] as [$province, $town]) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/quotation-requests', $this->payload(['province' => $province, 'municipality' => $town, 'barangay' => 'Gate']))
                ->assertStatus(422)
                ->assertJsonPath('message', 'Choose a town in Sorsogon from the list.');
        }
    }

    public function test_the_same_barangay_name_in_two_towns_counts_separately(): void
    {
        $user = $this->customer();
        foreach (['Bulan', 'Irosin'] as $town) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/quotation-requests', $this->payload(['province' => 'Sorsogon', 'municipality' => $town, 'barangay' => 'San Isidro']))
                ->assertStatus(201);
        }

        $names = collect($this->actingAs(User::factory()->create(['role' => 'admin']), 'sanctum')
            ->getJson('/api/admin/analytics?days=30')
            ->json('locations'))->pluck('name')->sort()->values()->all();

        $this->assertSame(['San Isidro, Bulan', 'San Isidro, Irosin'], $names);
    }

    public function test_backend_and_frontend_barangay_lists_match(): void
    {
        $js = file_get_contents(base_path('../frontend/src/services/installLocation.js'));
        $this->assertNotFalse($js);

        preg_match('/export const SORSOGON_BARANGAYS = \{(.*?)\n\};/s', $js, $m);
        preg_match_all("/^\s*'?([A-Za-z ]+?)'?: \[(.*?)\n\s*\],$/ms", $m[1] ?? '', $towns, PREG_SET_ORDER);

        $frontend = [];
        foreach ($towns as [, $town, $list]) {
            preg_match_all("/'([^']+)'/", $list, $names);
            $frontend[$town] = $names[1];
        }

        $backend = \App\Support\SorsogonBarangays::TOWNS;
        $this->assertCount(15, $backend);
        $this->assertSame(541, count($backend, COUNT_RECURSIVE) - count($backend));
        $this->assertCount(63, $backend['Bulan']);
        $this->assertSame($backend, $frontend);
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
