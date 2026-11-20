<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

/**
 * The Procurement report: every materials PDF (purchase request) sent to
 * suppliers in the period, with totals per material.
 */
class ProcurementReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = User::factory()->create(['role' => 'admin', 'name' => 'Admin Paolo']);
    }

    private function approvedQuotation(string $customerName): Quotation
    {
        $user = User::factory()->create(['role' => 'customer', 'name' => $customerName]);
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

    private function sendMaterials(Quotation $quotation, array $items, string $deliverTo = 'business'): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/quotations/{$quotation->id}/materials-pdf", [
                'deliver_to' => $deliverTo,
                'notes' => 'Call before delivery.',
                'items' => $items,
            ])
            ->assertOk();
    }

    private function renderReport(?int $days = null): string
    {
        // The report is a PDF; catch the data the controller gives its view
        // and render that view as HTML to check its text
        $data = null;
        View::composer('reports.procurement', function ($view) use (&$data) {
            $data ??= $view->getData();
        });

        $this->actingAs($this->admin, 'sanctum')
            ->get('/api/admin/reports/procurement' . ($days ? "?days={$days}" : ''))
            ->assertOk();

        return view('reports.procurement', $data)->render();
    }

    public function test_admin_downloads_the_procurement_report(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->get('/api/admin/reports/procurement?days=30');

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString('procurement-report.pdf', $response->headers->get('content-disposition'));
    }

    public function test_customers_cannot_download_it(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/reports/procurement')
            ->assertStatus(403);
    }

    public function test_it_lists_each_request_and_totals_the_materials(): void
    {
        $first = $this->approvedQuotation('Ana Cruz');
        $second = $this->approvedQuotation('Ben Reyes');

        $this->sendMaterials($first, [
            ['name' => 'Solar panel', 'category' => 'Solar panel', 'quantity' => 10, 'unit' => 'pcs'],
            ['name' => 'Hybrid inverter', 'category' => 'Inverter', 'quantity' => 1, 'unit' => 'unit'],
        ], 'site');
        $this->sendMaterials($second, [
            ['name' => 'Solar panel', 'category' => 'Solar panel', 'quantity' => 8, 'unit' => 'pcs'],
        ]);

        $html = $this->renderReport();

        // Both projects, with the customer's name (internal report)
        $this->assertStringContainsString('Ana Cruz', $html);
        $this->assertStringContainsString('Ben Reyes', $html);
        $this->assertStringContainsString('Call before delivery.', $html);
        $this->assertStringContainsString('Admin Paolo', $html);

        // 10 + 8 panels in the totals, across 2 requests
        $this->assertMatchesRegularExpression('/Solar panel<\/td>\s*<td class="r"><strong>18<\/strong>/', $html);

        // Inverters are listed before panels in the totals
        $totals = substr($html, strpos($html, 'Materials requested'), strpos($html, '<h2>Purchase requests') - strpos($html, 'Materials requested'));
        $this->assertLessThan(strpos($totals, '>Solar panel</td>'), strpos($totals, '>Hybrid inverter</td>'));
    }

    public function test_the_period_leaves_out_older_requests(): void
    {
        $old = $this->approvedQuotation('Old Customer');
        $recent = $this->approvedQuotation('Recent Customer');
        $items = [['name' => 'PV cable', 'category' => 'Wiring', 'quantity' => 50, 'unit' => 'm']];

        $this->sendMaterials($old, $items);
        PurchaseRequest::query()->update(['created_at' => now()->subDays(60)]);
        $this->sendMaterials($recent, $items);

        $html = $this->renderReport(30);

        $this->assertStringContainsString('Recent Customer', $html);
        $this->assertStringNotContainsString('Old Customer', $html);
    }

    public function test_an_empty_period_says_so(): void
    {
        $html = $this->renderReport(7);

        $this->assertStringContainsString('No purchase requests were sent in this period.', $html);
    }
}
