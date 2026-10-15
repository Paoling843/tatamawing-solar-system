<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the client's sizing figures to solar_computations.
 *
 *   total load    = sum of watts × qty for every appliance (W)
 *   inverter size = total load + 2,000 W buffer → picks the package
 *   panels        = inverter size ÷ 610 W, rounded down
 *
 * Every column is nullable because quotations made before this change
 * were sized from adjusted_total_wh instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->decimal('total_load_w', 12, 2)->nullable()->after('grand_total_wh');
            $table->decimal('inverter_size_w', 12, 2)->nullable()->after('total_load_w');
            $table->unsignedTinyInteger('recommended_panels')->nullable()->after('recommended_package_kw');
        });
    }

    public function down(): void
    {
        Schema::table('solar_computations', function (Blueprint $table) {
            $table->dropColumn(['total_load_w', 'inverter_size_w', 'recommended_panels']);
        });
    }
};
