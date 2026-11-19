<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reference numbers that restart every year (see HasYearlyReference):
 *
 *   quotation requests          #Q-2026-017   → TMS-QT-2026-0017
 *   external install requests   #EXT-003      → TMS-EXT-2026-0003
 *   installation schedules      #INST-2026-003 → TMS-INS-2026-0003
 *
 * Before this, references were built from the database id, so the number
 * kept counting across years. Now each record stores its own year and
 * number, and reference_counters holds the last number given out for each
 * kind and year.
 *
 * Existing records are numbered in the order they were made within their
 * year, and old references saved inside chat messages ("About #Q-2026-017")
 * and notifications ("#Q-2026-017 approved") are rewritten.
 */
return new class extends Migration
{
    // table => [kind, old reference for an id and year]
    private function tables(): array
    {
        return [
            'quotation_requests' => ['QT', fn (int $id, int $year) => '#Q-' . $year . '-' . str_pad((string) $id, 3, '0', STR_PAD_LEFT)],
            'external_installation_requests' => ['EXT', fn (int $id, int $year) => '#EXT-' . str_pad((string) $id, 3, '0', STR_PAD_LEFT)],
            'installation_schedules' => ['INS', null], // its old #INST-… was only shown, never saved
        ];
    }

    public function up(): void
    {
        Schema::create('reference_counters', function (Blueprint $table) {
            $table->string('kind', 10);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->primary(['kind', 'year']);
        });

        $renames = [];

        foreach ($this->tables() as $table => [$kind, $oldReference]) {
            // Named by hand: the default name is over MySQL's 64-character limit
            // for external_installation_requests
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->unsignedSmallInteger('reference_year')->nullable()->after('id');
                $blueprint->unsignedInteger('reference_number')->nullable()->after('reference_year');
                $blueprint->unique(['reference_year', 'reference_number'], "{$table}_reference_unique");
            });

            // Number the existing records, oldest first within each year
            $lastNumber = [];

            DB::table($table)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get(['id', 'created_at'])
                ->each(function ($row) use ($table, $kind, $oldReference, &$lastNumber, &$renames) {
                    $year = (int) substr((string) ($row->created_at ?? now()), 0, 4);
                    $number = $lastNumber[$year] = ($lastNumber[$year] ?? 0) + 1;

                    DB::table($table)->where('id', $row->id)->update([
                        'reference_year' => $year,
                        'reference_number' => $number,
                    ]);

                    if ($oldReference) {
                        $renames[$oldReference($row->id, $year)] = sprintf('TMS-%s-%d-%04d', $kind, $year, $number);
                    }
                });

            foreach ($lastNumber as $year => $number) {
                DB::table('reference_counters')->insert(['kind' => $kind, 'year' => $year, 'last_number' => $number]);
            }
        }

        // strtr() replaces the longest match first, so #EXT-100 never eats
        // the start of #EXT-1000
        $this->rewrite('chat_messages', 'meta', $renames);
        $this->rewrite('notifications', 'data', $renames);
    }

    private function rewrite(string $table, string $column, array $renames): void
    {
        if (! $renames || ! Schema::hasTable($table)) {
            return;
        }

        DB::table($table)
            ->where(fn ($query) => $query->where($column, 'like', '%#Q-%')->orWhere($column, 'like', '%#EXT-%'))
            ->get(['id', $column])
            ->each(function ($row) use ($table, $column, $renames) {
                $updated = strtr($row->{$column}, $renames);

                if ($updated !== $row->{$column}) {
                    DB::table($table)->where('id', $row->id)->update([$column => $updated]);
                }
            });
    }

    public function down(): void
    {
        // Text rewritten in chat messages and notifications is left as it is
        foreach (array_keys($this->tables()) as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropUnique("{$table}_reference_unique");
                $blueprint->dropColumn(['reference_year', 'reference_number']);
            });
        }

        Schema::dropIfExists('reference_counters');
    }
};
