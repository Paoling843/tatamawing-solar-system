<?php

namespace Tests\Feature;

use App\Models\ExternalInstallationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ExternalRequestStatusLinkTest extends TestCase
{
    use RefreshDatabase;

    private function record(): ExternalInstallationRequest
    {
        config(['app.frontend_url' => 'https://tatamawing.test']);

        return ExternalInstallationRequest::create([
            'name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'phone' => '+639171234567',
            'address' => 'Brgy. Zone 1, Bulan, Sorsogon',
            'preferred_installation_date' => now()->addWeek()->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external-installation-quotations/q.pdf',
            'status' => 'pending_review',
        ]);
    }

    private function apiLink(ExternalInstallationRequest $record): string
    {
        return URL::temporarySignedRoute(
            'external-installation-requests.status',
            now()->addDays(30),
            ['externalInstallationRequest' => $record->id]
        );
    }

    public function test_the_email_link_opens_the_website_status_page(): void
    {
        $record = $this->record();

        $url = $record->statusPageUrl();

        $this->assertStringStartsWith("https://tatamawing.test/installation-request/{$record->id}/status?", $url);
        $this->assertStringContainsString('expires=', $url);
        $this->assertStringContainsString('signature=', $url);
    }

    public function test_an_older_email_link_opened_in_a_browser_goes_to_the_status_page(): void
    {
        $record = $this->record();

        $response = $this->get($this->apiLink($record), ['Accept' => 'text/html']);

        $response->assertRedirect();
        $this->assertStringStartsWith(
            "https://tatamawing.test/installation-request/{$record->id}/status?expires=",
            $response->headers->get('Location')
        );
    }

    public function test_the_status_page_loads_the_request_with_the_signature(): void
    {
        $record = $this->record();

        $this->getJson($this->apiLink($record))
            ->assertOk()
            ->assertJsonPath('status', 'pending_review')
            ->assertJsonPath('other_company_name', 'Other Solar Co.')
            ->assertJsonPath('scheduled_date', null);
    }

    public function test_a_changed_link_is_refused(): void
    {
        $record = $this->record();

        $this->getJson($this->apiLink($record).'tampered')->assertForbidden();
    }
}
