<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Reference numbers that restart every year, e.g. TMS-QT-2026-0017.
 *
 * The model sets REFERENCE_KIND ('QT', 'EXT' or 'INS'). Each record stores
 * its own reference_year and reference_number, given out on creation from
 * the reference_counters table (one row per kind and year), and is sent to
 * the pages as `reference`.
 */
trait HasYearlyReference
{
    public static function bootHasYearlyReference(): void
    {
        static::creating(function (self $model) {
            if ($model->reference_number) {
                return;
            }

            $year = ($model->created_at ?? now())->year;
            $model->reference_year = $year;
            $model->reference_number = self::nextReferenceNumber($year);
        });
    }

    public function initializeHasYearlyReference(): void
    {
        $this->append('reference');
    }

    /**
     * The next number for $year: 1 for the first record of the year, then
     * 2, 3… The counter row is locked while it's read and raised, so two
     * records saved at the same moment can't get the same number. Inside a
     * caller's transaction the lock lasts until that record is saved, and a
     * failed save gives the number back.
     */
    public static function nextReferenceNumber(int $year): int
    {
        return DB::transaction(function () use ($year) {
            $row = fn () => DB::table('reference_counters')->where('kind', static::REFERENCE_KIND)->where('year', $year);

            DB::table('reference_counters')->insertOrIgnore([
                'kind' => static::REFERENCE_KIND,
                'year' => $year,
                'last_number' => 0,
            ]);
            $next = (int) $row()->lockForUpdate()->value('last_number') + 1;
            $row()->update(['last_number' => $next]);

            return $next;
        });
    }

    public static function formatReference(int|string $year, int $number): string
    {
        return sprintf('TMS-%s-%d-%04d', static::REFERENCE_KIND, $year, $number);
    }

    public function getReferenceAttribute(): string
    {
        if ($this->reference_number) {
            return self::formatReference($this->reference_year, $this->reference_number);
        }

        // Only for a record not saved yet
        return self::formatReference(($this->created_at ?? now())->format('Y'), (int) $this->id);
    }
}
