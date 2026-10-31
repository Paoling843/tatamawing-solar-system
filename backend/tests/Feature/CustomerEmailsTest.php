<?php

namespace Tests\Feature;

use App\Mail\InstallationRescheduled;
use App\Mail\QuotationRejected;
use App\Models\Customer;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Emails besides the approval: a rejected quotation and a moved installation
class CustomerEmailsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customerUser;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->customerUser = User::factory()->create(['role' => 'customer', 'email' => 'johnny@example.com']);
        $this->customer = Customer::create(['user_id' => $this->customerUser->id, 'contact_number' => '+639171234567']);
    }

    private function request(string $status): QuotationRequest
    {
        return QuotationRequest::create([
            'customer_id' => $this->customer->id,
            'solar_system_type' => 'hybrid',
            'submission_date' => now()->toDateString(),
            'status' => $status,
        ]);
    }

    private function scheduleFor(array $owner): InstallationSchedule
    {
        return InstallationSchedule::create($owner + [
            'scheduled_date' => now()->addDays(3)->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'James',
        ]);
    }

    private function move(InstallationSchedule $schedule, array $changes = [])
    {
        return $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/schedules/{$schedule->id}", $changes + [
                'scheduled_date' => now()->addDays(5)->toDateString(),
                'scheduled_time' => '09:00',
                'assigned_technician' => 'James',
            ])
            ->assertOk();
    }

    public function test_the_customer_is_emailed_the_reason_when_their_quotation_is_rejected(): void
    {
        $request = $this->request('pending');

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/quotation-requests/{$request->id}/reject", ['rejection_reason' => 'Please add the aircon horsepower.'])
            ->assertOk();

        Mail::assertSent(QuotationRejected::class, function (QuotationRejected $mail) use ($request) {
            return $mail->hasTo('johnny@example.com')
                && $mail->quotationRequest->is($request)
                && str_contains($mail->render(), 'Please add the aircon horsepower.');
        });
    }

    public function test_the_customer_is_emailed_when_their_installation_is_moved(): void
    {
        $quotation = Quotation::create([
            'quotation_request_id' => $this->request('approved')->id,
            'approval_date' => now(),
            'adjusted_cost' => 300000,
            'labor_fee' => 0,
            'transportation_fee' => 0,
            'total_amount' => 300000,
        ]);
        $schedule = $this->scheduleFor(['quotation_id' => $quotation->id]);
        $oldDate = $schedule->scheduled_date->format('F j, Y');

        $this->move($schedule);

        Mail::assertSent(InstallationRescheduled::class, function (InstallationRescheduled $mail) use ($oldDate) {
            $html = $mail->render();

            return $mail->hasTo('johnny@example.com')
                && str_contains($html, now()->addDays(5)->format('F j, Y') . ' · 9:00 AM')
                && str_contains($html, "Previously {$oldDate} · 8:00 AM")
                && str_contains($mail->link, '/customer/schedule');
        });
    }

    public function test_an_external_visitor_is_emailed_with_their_status_link(): void
    {
        $schedule = $this->scheduleFor([]);
        ExternalInstallationRequest::create([
            'name' => 'Ana Cruz',
            'email' => 'ana@example.com',
            'phone' => '09171234567',
            'address' => 'Brgy. Gate, Bulan, Sorsogon',
            'preferred_installation_date' => now()->addDays(3)->toDateString(),
            'other_company_name' => 'Other Solar Co.',
            'status' => 'confirmed',
            'installation_schedule_id' => $schedule->id,
        ]);

        $this->move($schedule);

        Mail::assertSent(InstallationRescheduled::class, fn (InstallationRescheduled $mail) => $mail->hasTo('ana@example.com')
            && str_contains($mail->link, '/installation-request/'));
    }

    public function test_no_email_when_only_the_technician_changes(): void
    {
        $schedule = $this->scheduleFor(['customer_id' => $this->customer->id]);

        $this->move($schedule, [
            'scheduled_date' => $schedule->scheduled_date->toDateString(),
            'scheduled_time' => '08:00',
            'assigned_technician' => 'Pedro',
        ]);

        Mail::assertNotSent(InstallationRescheduled::class);
    }
}
