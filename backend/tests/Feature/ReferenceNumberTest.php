<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

// Reference numbers: TMS-<QT|EXT|INS>-<year>-<number>, restarting at 0001
// every January, with a separate count for each kind
class ReferenceNumberTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $user = User::factory()->create(['role' => 'customer']);
        $this->customer = Customer::create(['user_id' => $user->id, 'contact_number' => '+639171234567']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function newRequest(): QuotationRequest
    {
        return QuotationRequest::create([
            'customer_id' => $this->customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => 'pending',
        ]);
    }

    private function newExternal(): ExternalInstallationRequest
    {
        return ExternalInstallationRequest::create([
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'phone' => '09171234567',
            'address' => 'Brgy. Gate, Bulan, Sorsogon',
            'preferred_installation_date' => now()->addDays(5)->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external/quote.pdf',
        ]);
    }

    private function newSchedule(): InstallationSchedule
    {
        return InstallationSchedule::create([
            'customer_id' => $this->customer->id,
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'James',
        ]);
    }

    public function test_numbers_count_up_within_a_year(): void
    {
        Carbon::setTestNow('2026-11-17 10:00:00');

        $this->assertSame('TMS-QT-2026-0001', $this->newRequest()->reference);
        $this->assertSame('TMS-QT-2026-0002', $this->newRequest()->reference);
        $this->assertSame('TMS-QT-2026-0003', $this->newRequest()->fresh()->reference);
    }

    public function test_the_number_restarts_in_january(): void
    {
        Carbon::setTestNow('2026-12-31 23:00:00');
        $this->newRequest();
        $this->newRequest();

        Carbon::setTestNow('2027-01-01 08:00:00');
        $this->assertSame('TMS-QT-2027-0001', $this->newRequest()->reference);

        // A 2026 request keeps its 2026 reference
        $this->assertSame('TMS-QT-2026-0002', QuotationRequest::orderBy('id')->skip(1)->first()->reference);
    }

    public function test_each_kind_has_its_own_count(): void
    {
        Carbon::setTestNow('2026-11-17 10:00:00');
        $this->newRequest();
        $this->newRequest();

        $this->assertSame('TMS-EXT-2026-0001', $this->newExternal()->reference);
        $this->assertSame('TMS-INS-2026-0001', $this->newSchedule()->reference);
        $this->assertSame('TMS-INS-2026-0002', $this->newSchedule()->reference);
        $this->assertSame('TMS-QT-2026-0003', $this->newRequest()->reference);
    }

    public function test_the_references_are_sent_to_the_pages(): void
    {
        Carbon::setTestNow('2026-11-17 10:00:00');
        $request = $this->newRequest();
        $external = $this->newExternal();

        $this->actingAs($this->customer->user, 'sanctum')
            ->getJson("/api/quotation-requests/{$request->id}")
            ->assertOk()
            ->assertJsonFragment(['reference' => 'TMS-QT-2026-0001']);

        // The visitor's status page (signed link, no login)
        $statusUrl = URL::temporarySignedRoute(
            'external-installation-requests.status', now()->addDay(), ['externalInstallationRequest' => $external->id]
        );
        $this->getJson($statusUrl)->assertOk()->assertJsonPath('reference', 'TMS-EXT-2026-0001');
    }

    public function test_the_migration_numbers_existing_records_and_renames_old_references(): void
    {
        // Rebuild the state before the migration: two 2026 requests and one
        // 2027 request numbered by id, an external request, a schedule, and a
        // chat message and notification that mention the old references
        $migration = require database_path('migrations/2026_11_19_000001_add_yearly_reference_numbers.php');
        $migration->down();

        $make = function (string $createdAt) {
            return DB::table('quotation_requests')->insertGetId([
                'customer_id' => $this->customer->id,
                'solar_system_type' => 'hybrid',
                'submission_date' => substr($createdAt, 0, 10),
                'status' => 'pending',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        };
        $first = $make('2026-03-01 09:00:00');
        $second = $make('2026-05-01 09:00:00');
        $third = $make('2027-01-05 09:00:00');

        $external = DB::table('external_installation_requests')->insertGetId([
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'phone' => '09171234567',
            'address' => 'Brgy. Gate, Bulan, Sorsogon',
            'preferred_installation_date' => '2026-06-10',
            'other_company_name' => 'Other Solar Co.',
            'quotation_file_path' => 'external/quote.pdf',
            'status' => 'pending_review',
            'created_at' => '2026-06-01 09:00:00',
            'updated_at' => '2026-06-01 09:00:00',
        ]);
        $schedule = DB::table('installation_schedules')->insertGetId([
            'customer_id' => $this->customer->id,
            'scheduled_date' => '2026-07-01',
            'scheduled_time' => '08:00',
            'assigned_technician' => 'James',
            'status' => 'scheduled',
            'created_at' => '2026-06-20 09:00:00',
            'updated_at' => '2026-06-20 09:00:00',
        ]);

        $pad = fn (int $id) => str_pad((string) $id, 3, '0', STR_PAD_LEFT);
        DB::table('chat_messages')->insert([
            'sender_id' => $this->customer->user_id,
            'receiver_id' => $this->customer->user_id,
            'message' => 'Question',
            'type' => 'text',
            'meta' => json_encode(['quotation_reference' => '#Q-2026-' . $pad($second)]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('notifications')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'type' => 'App\\Notifications\\AppNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $this->customer->user_id,
            'data' => json_encode(['title' => 'External request #EXT-' . $pad($external)]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration->up();

        $this->assertSame('TMS-QT-2026-0001', QuotationRequest::find($first)->reference);
        $this->assertSame('TMS-QT-2026-0002', QuotationRequest::find($second)->reference);
        $this->assertSame('TMS-QT-2027-0001', QuotationRequest::find($third)->reference);
        $this->assertSame('TMS-EXT-2026-0001', ExternalInstallationRequest::find($external)->reference);
        $this->assertSame('TMS-INS-2026-0001', InstallationSchedule::find($schedule)->reference);
        $this->assertSame(
            'TMS-QT-2026-0002',
            json_decode(DB::table('chat_messages')->value('meta'), true)['quotation_reference'],
        );
        $this->assertSame(
            'External request TMS-EXT-2026-0001',
            json_decode(DB::table('notifications')->value('data'), true)['title'],
        );

        // New records continue from the counters the migration left
        Carbon::setTestNow('2027-02-01 10:00:00');
        $this->assertSame('TMS-QT-2027-0002', $this->newRequest()->reference);
        Carbon::setTestNow('2026-12-01 10:00:00');
        $this->assertSame('TMS-EXT-2026-0002', $this->newExternal()->reference);
        $this->assertSame('TMS-INS-2026-0002', $this->newSchedule()->reference);
    }
}
