<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the Solar Computation Engine results to solar_computations.
 *
 * The old summary columns (total_load_watts, panel_capacity_kw,
 * inverter_specification, battery_capacity_ah, estimated_cost) stay and are
 * still filled in by SolarComputationService, so existing pages keep working.
 * Every new column is nullable because quotations made before this change
 * don't have these values.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            // ----- Step 2: the energy ledger -----
            $table->decimal('total_day_wh', 12, 2)->nullable()->after('estimated_cost');
            $table->decimal('total_night_wh', 12, 2)->nullable()->after('total_day_wh');
            $table->decimal('grand_total_wh', 12, 2)->nullable()->after('total_night_wh');
            $table->decimal('adjusted_total_wh', 12, 2)->nullable()->after('grand_total_wh');

            // ----- Step 3: inverter package -----
            // What the engine recommended vs. what the customer picked (upgrade only)
            $table->unsignedTinyInteger('recommended_package_kw')->nullable()->after('adjusted_total_wh');
            $table->unsignedTinyInteger('package_kw')->nullable()->after('recommended_package_kw');
            $table->string('inverter_sku')->nullable()->after('package_kw');
            $table->string('inverter_brand')->nullable()->after('inverter_sku');
            // True when the adjusted load is above the 12 kW package → engineer review
            $table->boolean('exceeds_max_package')->default(false)->after('inverter_brand');

            // ----- Step 3: panels -----
            $table->unsignedTinyInteger('panel_count')->nullable()->after('exceeds_max_package');

            // ----- Step 3: battery -----
            $table->unsignedSmallInteger('recommended_battery_ah')->nullable()->after('panel_count');
            $table->unsignedSmallInteger('battery_ah')->nullable()->after('recommended_battery_ah');
            $table->decimal('battery_wh', 10, 2)->nullable()->after('battery_ah');
            $table->string('battery_sku')->nullable()->after('battery_wh');

            // ----- Step 3: itemized quote -----
            // A snapshot of every line (description, qty, unit price, amount).
            // Saved as JSON so the quote stays the same even if prices change later.
            $table->json('line_items')->nullable()->after('battery_sku');
        });
    }

    public function down(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->dropColumn([
                'total_day_wh', 'total_night_wh', 'grand_total_wh', 'adjusted_total_wh',
                'recommended_package_kw', 'package_kw', 'inverter_sku', 'inverter_brand',
                'exceeds_max_package', 'panel_count',
                'recommended_battery_ah', 'battery_ah', 'battery_wh', 'battery_sku',
                'line_items',
            ]);
        });
    }
};
