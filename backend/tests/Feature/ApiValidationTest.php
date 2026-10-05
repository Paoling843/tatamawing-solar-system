<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ApiValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_a_valid_local_email(): void
    {
        $user = User::factory()->create([
            'email' => 'local@example.com',
            'password' => bcrypt('password123'),
            'role' => 'customer',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.email', $user->email);

        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('email', $user->email);
    }

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

    public function test_customer_cannot_read_another_customers_private_conversation(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer2@example.com',
        ]);

        $otherCustomer = User::factory()->create([
            'role' => 'customer',
            'email' => 'customer3@example.com',
        ]);

        \App\Models\ChatMessage::create([
            'sender_id' => $otherCustomer->id,
            'receiver_id' => $customer->id,
            'message' => 'Private message',
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson('/api/messages/' . $otherCustomer->id);

        $response->assertStatus(403);
    }

    public function test_customer_cannot_download_another_customers_quotation_report(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
            'email' => 'report-customer@example.com',
        ]);
        $owner = User::factory()->create([
            'role' => 'customer',
            'email' => 'report-owner@example.com',
        ]);

        $ownerCustomer = Customer::create([
            'user_id' => $owner->id,
            'contact_number' => '09171234567',
            'address' => 'Owner address',
            'install_location' => 'Owner location',
        ]);
        $quotationRequest = QuotationRequest::create([
            'customer_id' => $ownerCustomer->id,
            'solar_system_type' => 'hybrid',
            'monthly_bill' => 5000,
            'submission_date' => now()->toDateString(),
            'status' => 'approved',
        ]);
        $quotation = Quotation::create([
            'quotation_request_id' => $quotationRequest->id,
            'approval_date' => now()->toDateString(),
            'total_amount' => 100000,
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->get('/api/customer/reports/quotation/' . $quotation->id);

        $response->assertStatus(403);

    }
}
