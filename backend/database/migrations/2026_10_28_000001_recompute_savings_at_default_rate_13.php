<?php

use App\Services\SolarComputationService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * SORECO's default rate went from ₱12 to ₱13 per kWh, but quotations saved
 * before that still showed ₱12 and savings worked out at ₱12. This redoes
 * the savings of every quotation that used the default rate (the customer
 * didn't give both bill amount and kWh), with the same inputs it was saved
 * with. Quotations that used the customer's own bill rate are left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        $service = app(SolarComputationService::class);
        $round = fn ($value) => $value === null ? null : round($value, 2);

        DB::table('solar_computations')
            ->where('rate_source', 'default')
            ->where('electricity_rate', '!=', SolarComputationService::DEFAULT_RATE_PER_KWH)
            ->whereNotNull('panel_count')
            ->orderBy('id')
            ->each(function ($row) use ($service, $round) {
                // Only the bill amount was given (that's why the default rate
                // was used), so the saved monthly bill is the whole input
                $bills = $row->monthly_bill !== null ? [['amount' => (float) $row->monthly_bill]] : [];

                $savings = $service->computeSavings(
                    (float) $row->total_day_wh,
                    (float) $row->total_night_wh,
                    (int) $row->panel_count,
                    (float) $row->battery_wh,
                    (float) $row->estimated_cost,
                    $bills,
                );

                DB::table('solar_computations')->where('id', $row->id)->update([
                    'electricity_rate' => round($savings['rate'], 2),
                    'monthly_savings' => round($savings['monthly_savings'], 2),
                    'new_monthly_bill' => $round($savings['new_monthly_bill']),
                    'annual_savings' => round($savings['annual_savings'], 2),
                    'payback_years' => $round($savings['payback_years']),
                ]);
            });
    }

    public function down(): void
    {
        // Nothing to undo: the old ₱12 figures were out of date
    }
};
