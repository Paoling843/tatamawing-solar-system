<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\BulanSorsogonSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnalyticsOverviewTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $this->seed(BulanSorsogonSeeder::class);
        $this->admin = User::where('role', 'admin')->firstOrFail();
    }

    public function test_overview_returns_every_section_for_the_year(): void
    {
        $data = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/analytics?days=365')
            ->assertOk()
            ->assertJsonStructure([
                'period_days', 'users', 'guest_steps', 'monthly', 'kpis', 'funnel',
                'step_times', 'sizes' => ['packages', 'average_kw'], 'barangays', 'savings', 'review_queue',
            ])
            ->json();

        $this->assertSame(365, $data['period_days']);
        $this->assertSame(12, $data['kpis']['quotations_created']['value']);
        $this->assertSame(5, $data['users']['external_requests']);

        // Every quotation is in exactly one package bucket
        $this->assertCount(5, $data['sizes']['packages']);
        $this->assertSame(12, array_sum(array_column($data['sizes']['packages'], 'count')));

        // Funnel never grows from one step to the next
        $counts = array_column($data['funnel'], 'count');
        $sorted = $counts;
        rsort($sorted);
        $this->assertSame($sorted, $counts);
        $this->assertSame(12, $counts[2]); // all 12 seeded requests were submitted through the quote builder
        $this->assertSame(6, $counts[3]);  // 6 approved

        // Barangays are read from "Brgy. X" in the address
        $this->assertNotContains('Not specified', array_column($data['barangays'], 'name'));
        $this->assertLessThanOrEqual(5, count($data['barangays']));

        $this->assertSame(12, $data['savings']['count']);
        $this->assertSame(50, (int) $data['savings']['own_rate_percent']); // half entered their kWh
        $this->assertSame(4, $data['review_queue']['pending']);
        $this->assertSame(75, (int) $data['review_queue']['approval_rate_percent']); // 6 of 8 decided
    }

    public function test_unknown_period_falls_back_to_30_days(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/analytics?days=12')
            ->assertOk()
            ->assertJsonPath('period_days', 30);
    }

    public function test_customers_cannot_see_analytics_or_reports(): void
    {
        $customer = User::where('role', 'customer')->firstOrFail();

        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/analytics')->assertStatus(403);
        $this->actingAs($customer, 'sanctum')->get('/api/admin/reports/analytics-summary')->assertStatus(403);
    }

    public function test_every_report_downloads_as_pdf_for_a_period(): void
    {
        $reports = [
            '/api/admin/reports/analytics-summary?days=90',
            '/api/admin/reports/quote-sessions?days=90',
            '/api/admin/reports/external-requests?days=90',
            '/api/admin/reports/quotation-history?days=90',
            '/api/admin/reports/quotation-material?days=90',
            '/api/admin/reports/procurement?days=90',
            // Without a period, the older reports still cover all time
            '/api/admin/reports/quotation-history',
        ];

        foreach ($reports as $url) {
            $response = $this->actingAs($this->admin, 'sanctum')->get($url);
            $response->assertOk();
            $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'), $url);
        }
    }
}
