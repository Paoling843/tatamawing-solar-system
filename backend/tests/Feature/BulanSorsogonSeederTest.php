<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\QuotationRequest;
use App\Models\QuoteSession;
use App\Models\User;
use Database\Seeders\BulanSorsogonSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BulanSorsogonSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_bulan_customers_with_quotations_at_every_stage(): void
    {
        Storage::fake();

        $this->seed(BulanSorsogonSeeder::class);

        $this->assertSame(1, User::where('role', 'admin')->count());
        $this->assertSame(12, Customer::count());
        $this->assertSame(12, Customer::where('address', 'like', '%Bulan, Sorsogon')->count());

        // Every request was computed by the engine, savings included
        $this->assertSame(12, QuotationRequest::whereHas('solarComputation', fn ($q) => $q->whereNotNull('monthly_savings'))->count());
        $this->assertSame(4, QuotationRequest::where('status', 'pending')->count());
        $this->assertSame(6, QuotationRequest::where('status', 'approved')->count());
        $this->assertSame(2, QuotationRequest::where('status', 'rejected')->count());

        // Schedules: 5 for approved quotations (one is still waiting) + 1 for a confirmed external request
        $this->assertSame(6, InstallationSchedule::count());
        $this->assertFalse(InstallationSchedule::where('status', 'completed')->where('scheduled_date', '>', now())->exists());

        $this->assertSame(5, ExternalInstallationRequest::count());
        Storage::assertExists('external-installation-quotations/sample-external-quotation.pdf');

        // Analytics: 12 converted visits plus abandoned guest visits, none in the future
        $this->assertSame(12, QuoteSession::whereNotNull('converted_at')->count());
        $this->assertGreaterThan(40, QuoteSession::whereNull('converted_at')->count());
        $this->assertFalse(QuoteSession::where('created_at', '>', now())->exists());
    }

    public function test_running_twice_does_not_duplicate(): void
    {
        Storage::fake();

        $this->seed(BulanSorsogonSeeder::class);
        $this->seed(BulanSorsogonSeeder::class);

        $this->assertSame(12, Customer::count());
    }

    public function test_uses_the_existing_admin_instead_of_creating_one(): void
    {
        Storage::fake();
        User::factory()->create(['role' => 'admin', 'email' => 'owner@example.com']);

        $this->seed(BulanSorsogonSeeder::class);

        $this->assertSame(1, User::where('role', 'admin')->count());
        $this->assertFalse(User::where('email', 'admin@tatamawing.test')->exists());
    }
}
