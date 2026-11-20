<?php

namespace Tests\Feature;

use App\Mail\QuotationApproved;
use App\Models\Customer;
use App\Models\QuotationRequest;
use App\Models\SolarComputation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * When the admin approves a total that isn't the customer's estimate, the
 * customer is told: in the email, the app notification and their page.
 */
class PriceChangeNoticeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customerUser = User::factory()->create(['role' => 'customer']);
    }

    private function pendingRequest(?float $estimate = 300000): QuotationRequest
    {
        $customer = Customer::create(['user_id' => $this->customerUser->id, 'contact_number' => '+639171234567']);
        $request = QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        if ($estimate !== null) {
            SolarComputation::create([
                'quotation_request_id' => $request->id,
                'total_load_watts' => 3000,
                'panel_capacity_kw' => 6,
                'inverter_specification' => '6 kW hybrid',
                'battery_capacity_ah' => 314,
                'estimated_cost' => $estimate,
            ]);
        }

        return $request;
    }

    private function approve(QuotationRequest $request, array $data)
    {
        return $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", $data);
    }

    private function sentEmailHtml(): string
    {
        $html = null;
        Mail::assertSent(QuotationApproved::class, function (QuotationApproved $mail) use (&$html) {
            $html = $mail->render();

            return true;
        });

        return $html;
    }

    private function notificationBody(): string
    {
        return $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/notifications')
            ->json('notifications.0.body');
    }

    public function test_a_higher_price_is_called_out_with_the_reason(): void
    {
        $request = $this->pendingRequest(300000);

        $this->approve($request, [
            'adjusted_cost' => 320000,
            'labor_fee' => 15000,
            'transportation_fee' => 5000,
            'price_note' => '  Longer cable run to the roof.  ',
        ])->assertOk();

        $quotation = $request->fresh()->quotation;
        $this->assertSame('Longer cable run to the roof.', $quotation->price_note);
        $this->assertSame(40000.0, $quotation->priceChange());

        $html = $this->sentEmailHtml();
        $this->assertStringContainsString('Price updated', $html);
        $this->assertStringContainsString('PHP 300,000.00', $html);
        $this->assertStringContainsString('PHP 340,000.00', $html);
        $this->assertStringContainsString('PHP 40,000.00 more', $html);
        $this->assertStringContainsString('Longer cable run to the roof.', $html);

        $this->assertSame('Price updated: ₱300,000.00 → ₱340,000.00', $this->notificationBody());
    }

    public function test_a_lower_price_is_called_out_too(): void
    {
        $request = $this->pendingRequest(300000);

        $this->approve($request, ['adjusted_cost' => 280000])->assertOk();

        $html = $this->sentEmailHtml();
        $this->assertStringContainsString('PHP 20,000.00 less', $html);
        // No reason given, so no reason box
        $this->assertStringNotContainsString('Why the price changed', $html);
    }

    public function test_the_same_price_reads_as_before(): void
    {
        $request = $this->pendingRequest(300000);

        $this->approve($request, ['adjusted_cost' => 300000])->assertOk();

        $this->assertNull($request->fresh()->quotation->priceChange());
        $this->assertStringNotContainsString('Price updated', $this->sentEmailHtml());
        $this->assertSame('Total ₱300,000.00', $this->notificationBody());
    }

    public function test_a_request_without_an_estimate_has_nothing_to_compare(): void
    {
        $request = $this->pendingRequest(null);

        $this->approve($request, ['adjusted_cost' => 250000])->assertOk();

        $this->assertNull($request->fresh()->quotation->priceChange());
        $this->assertStringNotContainsString('Price updated', $this->sentEmailHtml());
    }

    public function test_the_customer_sees_the_note_on_their_quotation(): void
    {
        $request = $this->pendingRequest(300000);
        $this->approve($request, ['adjusted_cost' => 320000, 'price_note' => 'Roof needs extra rails.'])->assertOk();

        $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/quotation-requests')
            ->assertOk()
            ->assertJsonFragment(['price_note' => 'Roof needs extra rails.']);
    }

    public function test_the_quotation_pdf_shows_the_price_change(): void
    {
        $request = $this->pendingRequest(300000);
        $this->approve($request, ['adjusted_cost' => 320000, 'price_note' => 'Roof needs extra rails.'])->assertOk();

        $quotation = $request->fresh()->quotation->load('quotationRequest.solarComputation', 'quotationRequest.customer.user', 'quotationRequest.applianceItems');
        $html = view('reports.quotation', ['quotation' => $quotation])->render();

        $this->assertStringContainsString('Price updated.', $html);
        $this->assertStringContainsString('PHP300,000.00', $html);
        $this->assertStringContainsString('PHP20,000.00 more', $html);
        $this->assertStringContainsString('Roof needs extra rails.', $html);

        // The customer can download it
        $this->actingAs($this->customerUser, 'sanctum')
            ->get("/api/customer/reports/quotation/{$quotation->id}")
            ->assertOk();
    }

    public function test_the_quotation_pdf_has_no_notice_when_the_price_is_the_same(): void
    {
        $request = $this->pendingRequest(300000);
        $this->approve($request, ['adjusted_cost' => 300000])->assertOk();

        $quotation = $request->fresh()->quotation->load('quotationRequest.solarComputation', 'quotationRequest.customer.user', 'quotationRequest.applianceItems');

        $this->assertStringNotContainsString('Price updated.', view('reports.quotation', ['quotation' => $quotation])->render());
    }

    public function test_a_long_reason_is_refused(): void
    {
        $request = $this->pendingRequest(300000);

        $this->approve($request, ['adjusted_cost' => 320000, 'price_note' => str_repeat('a', 501)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('price_note');

        $this->assertSame('pending', $request->fresh()->status);
    }
}
