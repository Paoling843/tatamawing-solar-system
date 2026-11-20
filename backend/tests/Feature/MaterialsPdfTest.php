<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The materials PDF the admin sends to a supplier on Messenger: built from
 * the form, and saved as a purchase request for the Procurement report.
 */
class MaterialsPdfTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function approvedQuotation(): Quotation
    {
        $user = User::factory()->create(['role' => 'customer', 'name' => 'Ana Cruz']);
        $customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);
        $request = QuotationRequest::create([
            'customer_id' => $customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
            'install_purok' => 'Purok 2',
            'install_barangay' => 'Bical',
            'install_municipality' => 'Bulan',
            'install_province' => 'Sorsogon',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/approve", ['adjusted_cost' => 300000])
            ->assertOk();

        return $request->fresh()->quotation;
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'deliver_to' => 'site',
            'needed_by' => now()->addWeek()->toDateString(),
            'notes' => 'Please deliver in the morning.',
            'items' => [
                ['name' => 'Hybrid inverter', 'category' => 'Inverter', 'quantity' => 1, 'unit' => 'unit'],
                ['name' => 'Solar panel', 'category' => 'Solar panel', 'quantity' => 10, 'unit' => 'pcs'],
                ['name' => 'PV cable', 'category' => 'Wiring', 'quantity' => 50, 'unit' => 'm'],
            ],
        ], $overrides);
    }

    public function test_admin_downloads_the_materials_pdf(): void
    {
        $quotation = $this->approvedQuotation();
        $ref = 'TMS-QT-' . $quotation->quotationRequest->created_at->format('Y') . '-0001';

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload());

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString("TataMawing-purchase-request-{$ref}.pdf", $response->headers->get('content-disposition'));
    }

    public function test_each_download_is_saved_as_a_purchase_request(): void
    {
        $quotation = $this->approvedQuotation();

        $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload())
            ->assertOk();

        $purchaseRequest = $quotation->purchaseRequests()->with('items')->sole();
        $this->assertSame('site', $purchaseRequest->deliver_to);
        $this->assertStringContainsString('Bical', $purchaseRequest->delivery_address);
        $this->assertSame('Please deliver in the morning.', $purchaseRequest->notes);
        $this->assertSame($this->admin->id, $purchaseRequest->sent_by_user_id);
        $this->assertSame(now()->addWeek()->toDateString(), $purchaseRequest->needed_by->toDateString());
        $this->assertSame(['Hybrid inverter', 'Solar panel', 'PV cable'], $purchaseRequest->items->pluck('material_name')->all());
        $this->assertSame(['Inverter', 'Solar panel', 'Wiring'], $purchaseRequest->items->pluck('category')->all());
        $this->assertSame([1, 10, 50], $purchaseRequest->items->pluck('quantity')->all());
    }

    public function test_a_refused_list_saves_nothing(): void
    {
        $quotation = $this->approvedQuotation();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload(['items' => []]))
            ->assertStatus(422);

        $quotation->quotationRequest->update(['status' => 'pending']);
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload())
            ->assertStatus(422);

        $this->assertDatabaseCount('purchase_requests', 0);
        $this->assertDatabaseCount('material_items', 0);
    }

    public function test_the_pdf_has_no_customer_name_and_shows_the_site(): void
    {
        $quotation = $this->approvedQuotation();

        // Render the same view the PDF uses, to check its text
        $html = view('reports.materials-request', [
            'reference' => 'TMS-QT-2026-0001',
            'computation' => null,
            'items' => $this->payload()['items'],
            'deliverToSite' => true,
            'deliverTo' => $quotation->quotationRequest->installation_address,
            'neededBy' => null,
            'notes' => null,
            'messengerUrl' => 'https://m.me/tatamawing',
            'contactEmail' => null,
            'generatedAt' => 'October 26, 2026',
        ])->render();

        $this->assertStringContainsString('Brgy. Bical', $html);
        $this->assertStringContainsString('PV cable', $html);
        $this->assertStringNotContainsString('Ana Cruz', $html);
        $this->assertStringNotContainsString('+639171234567', $html);
    }

    public function test_customers_cannot_download_it(): void
    {
        $quotation = $this->approvedQuotation();
        $customer = $quotation->quotationRequest->customer->user;

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload())
            ->assertStatus(403);
    }

    public function test_only_approved_quotations_have_a_materials_list(): void
    {
        $quotation = $this->approvedQuotation();
        $quotation->quotationRequest->update(['status' => 'pending']);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload())
            ->assertStatus(422);
    }

    public function test_an_unknown_category_is_refused(): void
    {
        $quotation = $this->approvedQuotation();
        $items = [['name' => 'Solar panel', 'category' => 'Snacks', 'quantity' => 1, 'unit' => 'pcs']];

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload(['items' => $items]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.category');
    }

    public function test_the_list_needs_at_least_one_material(): void
    {
        $quotation = $this->approvedQuotation();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload(['items' => []]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }
}
