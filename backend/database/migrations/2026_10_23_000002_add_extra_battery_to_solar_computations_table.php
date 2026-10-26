<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the extra battery of a mixed bank, e.g. 314 Ah + 100 Ah.
 *
 * When one 314 Ah can't cover the night, the bank is full 314 Ah units
 * (battery_qty) plus the cheapest battery that covers the rest
 * (SolarComputationService::batteryBank()). Empty when there's no extra battery.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->unsignedSmallInteger('extra_battery_ah')->nullable()->after('battery_qty');
        });
    }

    public function down(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->dropColumn('extra_battery_ah');
        });
    }
};
