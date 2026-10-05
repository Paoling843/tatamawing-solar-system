<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the estimated savings to solar_computations.
 *
 * Filled in by SolarComputationService::computeSavings() when a quotation is
 * submitted. Every column is nullable because quotations made before this
 * change don't have a savings estimate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            // ₱ per kWh used for the estimate, and where it came from:
            // 'bill' (amount ÷ kWh from the customer's bills) or 'default'
            $table->decimal('electricity_rate', 8, 2)->nullable()->after('line_items');
            $table->string('rate_source', 10)->nullable()->after('electricity_rate');

            // Monthly energy (kWh): what the panels make vs. what the appliances use
            $table->decimal('monthly_production_kwh', 10, 2)->nullable()->after('rate_source');
            $table->decimal('monthly_usage_kwh', 10, 2)->nullable()->after('monthly_production_kwh');

            // Money (₱). monthly_bill / new_monthly_bill stay empty when no bill was entered.
            $table->decimal('monthly_bill', 12, 2)->nullable()->after('monthly_usage_kwh');
            $table->decimal('monthly_savings', 12, 2)->nullable()->after('monthly_bill');
            $table->decimal('new_monthly_bill', 12, 2)->nullable()->after('monthly_savings');
            $table->decimal('annual_savings', 12, 2)->nullable()->after('new_monthly_bill');
            $table->decimal('payback_years', 12, 2)->nullable()->after('annual_savings');
        });
    }

    public function down(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->dropColumn([
                'electricity_rate', 'rate_source',
                'monthly_production_kwh', 'monthly_usage_kwh',
                'monthly_bill', 'monthly_savings', 'new_monthly_bill',
                'annual_savings', 'payback_years',
            ]);
        });
    }
};
