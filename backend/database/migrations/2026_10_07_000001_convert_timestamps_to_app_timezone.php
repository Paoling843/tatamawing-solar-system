<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The app used to run on UTC; it now runs on Philippine time (Asia/Manila,
 * see config/app.php). Laravel saves date-times in the app's time zone, so
 * every date-time already saved was written in UTC and would now read 8
 * hours early. This shifts them all forward once.
 *
 * - Only this app's database is touched (on MySQL the schema list also
 *   includes the server's other databases).
 * - Date-only columns (scheduled_date, approval_date, …) are left alone:
 *   a date has no hour to shift.
 * - On a fresh database the tables are empty, so this does nothing.
 * - The shift is the app time zone's UTC offset, so with APP_TIMEZONE=UTC
 *   it does nothing either.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->shift(now()->utcOffset());
    }

    public function down(): void
    {
        $this->shift(-now()->utcOffset());
    }

    private function shift(int $minutes): void
    {
        if ($minutes === 0) {
            return;
        }

        $driver = DB::getDriverName();
        $grammar = DB::getQueryGrammar();

        foreach ($this->timestampColumns() as $table => $columns) {
            $sets = [];
            foreach ($columns as $column) {
                $wrapped = $grammar->wrap($column);
                $sets[$column] = DB::raw($driver === 'sqlite'
                    ? "datetime({$wrapped}, '" . sprintf('%+d', $minutes) . " minutes')"
                    : "DATE_ADD({$wrapped}, INTERVAL {$minutes} MINUTE)");
            }

            // NULL values stay NULL
            DB::table($table)->update($sets);
        }
    }

    /**
     * table => [date-time columns], for this app's database only.
     */
    private function timestampColumns(): array
    {
        $database = DB::getDatabaseName();
        $result = [];

        foreach (Schema::getTables() as $table) {
            // MySQL/MariaDB list every database on the server; keep ours
            if (DB::getDriverName() !== 'sqlite' && ($table['schema'] ?? null) !== $database) {
                continue;
            }

            $columns = collect(Schema::getColumns($table['name']))
                ->filter(fn ($column) => in_array(strtolower($column['type_name']), ['timestamp', 'datetime'], true))
                ->pluck('name')
                ->all();

            if ($columns) {
                $result[$table['name']] = $columns;
            }
        }

        return $result;
    }
};
