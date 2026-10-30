<?php

namespace Tests\Feature;

use App\Models\InstallationSchedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleDateFormatTest extends TestCase
{
    use RefreshDatabase;

    // A bare 'date' cast sent Oct 31 as "2026-10-30T16:00:00Z" (midnight in
    // Manila, written in UTC), and the pages read it as Oct 30
    public function test_the_installation_date_is_sent_as_the_same_calendar_day(): void
    {
        $date = now()->addDay()->toDateString();

        InstallationSchedule::create([
            'scheduled_date' => $date,
            'scheduled_time' => '09:00',
            'assigned_technician' => 'James',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/schedules')
            ->assertOk()
            ->assertJsonPath('0.scheduled_date', $date);
    }
}
