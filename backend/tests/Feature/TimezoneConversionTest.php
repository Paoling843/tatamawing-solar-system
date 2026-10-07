<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TimezoneConversionTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_runs_on_philippine_time(): void
    {
        $this->assertSame('Asia/Manila', config('app.timezone'));
        $this->assertSame(480, now()->utcOffset());
    }

    public function test_migration_shifts_saved_utc_times_forward_8_hours(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        // A record saved while the app still ran on UTC: 10:55 UTC = 6:55 PM in Manila
        DB::table('users')->where('id', $user->id)->update([
            'created_at' => '2026-10-07 10:55:09',
            'email_verified_at' => null,
        ]);

        $migration = require database_path('migrations/2026_10_07_000001_convert_timestamps_to_app_timezone.php');
        $migration->up();

        $row = DB::table('users')->where('id', $user->id)->first();
        $this->assertSame('2026-10-07 18:55:09', $row->created_at);
        $this->assertNull($row->email_verified_at); // NULL stays NULL

        // And it can be undone
        $migration->down();
        $this->assertSame('2026-10-07 10:55:09', DB::table('users')->where('id', $user->id)->value('created_at'));
    }
}
