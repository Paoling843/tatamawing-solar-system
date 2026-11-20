<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * "Copy & save" on the materials form, and the one-record-per-day rule
 * shared with "Download PDF".
 */
class PurchaseRequestTest extends TestCase
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
        $user = User::factory()->create(['role' => 'customer']);
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
            'deliver_to' => 'business',
            'notes' => 'Copied to Messenger.',
            'items' => [
                ['name' => 'Solar panel', 'category' => 'Solar panel', 'quantity' => 10, 'unit' => 'pcs'],
            ],
        ], $overrides);
    }

    private function copyAndSave(Quotation $quotation, array $overrides = [])
    {
        return $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/purchase-requests", $this->payload($overrides));
    }

    public function test_copy_and_save_saves_a_purchase_request(): void
    {
        $quotation = $this->approvedQuotation();

        $this->copyAndSave($quotation)
            ->assertOk()
            ->assertJsonPath('purchase_request.items.0.material_name', 'Solar panel');

        $saved = PurchaseRequest::with('items')->sole();
        $this->assertSame($quotation->id, $saved->quotation_id);
        $this->assertSame('business', $saved->deliver_to);
        $this->assertSame('Copied to Messenger.', $saved->notes);
        $this->assertSame($this->admin->id, $saved->sent_by_user_id);
        $this->assertSame(10, $saved->items->sole()->quantity);
    }

    public function test_copy_then_download_on_the_same_day_keeps_one_record(): void
    {
        $quotation = $this->approvedQuotation();

        $this->copyAndSave($quotation)->assertOk();

        // Then the admin fixes the list and downloads the PDF
        $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/quotations/{$quotation->id}/materials-pdf", $this->payload([
                'deliver_to' => 'site',
                'items' => [
                    ['name' => 'Solar panel', 'category' => 'Solar panel', 'quantity' => 12, 'unit' => 'pcs'],
                    ['name' => 'PV cable', 'category' => 'Wiring', 'quantity' => 50, 'unit' => 'm'],
                ],
            ]))
            ->assertOk();

        $saved = PurchaseRequest::with('items')->sole();
        $this->assertSame('site', $saved->deliver_to);
        $this->assertSame([12, 50], $saved->items->pluck('quantity')->all());
        $this->assertDatabaseCount('material_items', 2);
    }

    public function test_clicking_twice_keeps_one_record(): void
    {
        $quotation = $this->approvedQuotation();

        $this->copyAndSave($quotation)->assertOk();
        $this->copyAndSave($quotation)->assertOk();

        $this->assertDatabaseCount('purchase_requests', 1);
        $this->assertDatabaseCount('material_items', 1);
    }

    public function test_sending_again_on_another_day_adds_a_new_record(): void
    {
        $quotation = $this->approvedQuotation();

        $this->copyAndSave($quotation)->assertOk();
        $this->travel(1)->days();
        $this->copyAndSave($quotation)->assertOk();

        $this->assertDatabaseCount('purchase_requests', 2);
    }

    public function test_each_quotation_has_its_own_record_on_the_same_day(): void
    {
        $this->copyAndSave($this->approvedQuotation())->assertOk();
        $this->copyAndSave($this->approvedQuotation())->assertOk();

        $this->assertDatabaseCount('purchase_requests', 2);
    }

    public function test_only_approved_quotations_can_be_saved(): void
    {
        $quotation = $this->approvedQuotation();
        $quotation->quotationRequest->update(['status' => 'pending']);

        $this->copyAndSave($quotation)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only approved quotations have a materials list.');

        $this->assertDatabaseCount('purchase_requests', 0);
    }

    public function test_an_empty_list_is_refused(): void
    {
        $this->copyAndSave($this->approvedQuotation(), ['items' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');

        $this->assertDatabaseCount('purchase_requests', 0);
    }

    public function test_the_quotation_page_lists_its_purchase_requests_newest_first(): void
    {
        $quotation = $this->approvedQuotation();
        $other = $this->approvedQuotation();

        $this->copyAndSave($quotation, ['notes' => 'First list'])->assertOk();
        $this->travel(1)->days();
        $this->copyAndSave($quotation, ['notes' => 'Corrected list'])->assertOk();
        $this->copyAndSave($other)->assertOk();

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/quotations/{$quotation->id}/purchase-requests")
            ->assertOk()
            ->assertJsonCount(2, 'purchase_requests')
            ->assertJsonPath('purchase_requests.0.notes', 'Corrected list')
            ->assertJsonPath('purchase_requests.1.notes', 'First list')
            ->assertJsonPath('purchase_requests.0.items.0.material_name', 'Solar panel')
            ->assertJsonPath('purchase_requests.0.sent_by.name', $this->admin->name);
    }

    public function test_admin_deletes_a_purchase_request_and_its_items(): void
    {
        $quotation = $this->approvedQuotation();
        $this->copyAndSave($quotation)->assertOk();
        $purchaseRequest = PurchaseRequest::sole();

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/purchase-requests/{$purchaseRequest->id}")
            ->assertOk();

        $this->assertDatabaseCount('purchase_requests', 0);
        $this->assertDatabaseCount('material_items', 0);
        $this->assertDatabaseHas('audit_logs', ['action' => 'purchase_request_deleted']);

        // Gone from the Procurement report too
        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/quotations/{$quotation->id}/purchase-requests")
            ->assertJsonCount(0, 'purchase_requests');
    }

    public function test_customers_cannot_list_or_delete_purchase_requests(): void
    {
        $quotation = $this->approvedQuotation();
        $this->copyAndSave($quotation)->assertOk();
        $customer = $quotation->quotationRequest->customer->user;

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/admin/quotations/{$quotation->id}/purchase-requests")
            ->assertStatus(403);
        $this->actingAs($customer, 'sanctum')
            ->deleteJson('/api/admin/purchase-requests/' . PurchaseRequest::sole()->id)
            ->assertStatus(403);

        $this->assertDatabaseCount('purchase_requests', 1);
    }

    public function test_customers_cannot_save(): void
    {
        $quotation = $this->approvedQuotation();

        $this->actingAs($quotation->quotationRequest->customer->user, 'sanctum')
            ->postJson("/api/admin/quotations/{$quotation->id}/purchase-requests", $this->payload())
            ->assertStatus(403);

        $this->assertDatabaseCount('purchase_requests', 0);
    }
}
