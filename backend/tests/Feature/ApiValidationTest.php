<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ApiValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_rejects_blank_names_and_malformed_phone(): void
    {
        $response = $this->postJson('/api/register', [
            'first_name' => '   ',
            'last_name' => '',
            'email' => 'customer@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'contact_number' => '0917123456',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['first_name', 'last_name', 'contact_number']);
    }

    public function test_external_installation_request_requires_valid_file_and_contact_details(): void
    {
        $response = $this->postJson('/api/external-installation-requests', [
            'name' => ' ',
            'email' => 'customer@example.com',
            'phone' => '9999',
            'address' => 'Sample address',
            'preferred_installation_date' => now()->addDay()->format('Y-m-d'),
            'other_company_name' => 'Solar East',
            'quotation_file' => UploadedFile::fake()->create('bad.txt', 100, 'text/plain'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'phone', 'quotation_file']);
    }
}
