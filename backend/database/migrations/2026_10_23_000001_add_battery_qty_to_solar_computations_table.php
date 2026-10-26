<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds how many battery units the system uses.
 *
 * The largest battery (314 Ah) is multiplied when one unit can't cover the
 * nighttime load (SolarComputationService::batteryQuantity()). battery_ah
 * stays the per-unit size; battery_wh is all the units together.
 * Older quotations always had one battery, hence the default of 1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->unsignedTinyInteger('battery_qty')->default(1)->after('battery_ah');
        });
    }

    public function down(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->dropColumn('battery_qty');
        });
    }
};
