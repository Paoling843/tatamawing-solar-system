<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the Solar Computation Engine inputs to each appliance row.
 *
 * The old columns (appliance_name, wattage, quantity, usage_hours_per_day)
 * are kept and still filled in, so the admin pages and PDF reports that
 * already read them keep working without changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appliance_items', function (Blueprint $table) {
            // Which dropdown option was picked, e.g. "aircon" or "other"
            $table->string('appliance_type')->nullable()->after('appliance_name');

            // Horsepower, only for aircon and water pump (watts = hp × 800)
            $table->decimal('hp', 3, 1)->nullable()->after('appliance_type');

            // Hours are stored as whole numbers on a 24-hour scale.
            // Daytime runs 8 → 16. Nighttime runs 16 → 32, where 24 means
            // midnight and 32 means 08:00 the next morning, so "to" is always
            // bigger than "from" and the span is simply to − from.
            $table->unsignedTinyInteger('day_from')->nullable()->after('usage_hours_per_day');
            $table->unsignedTinyInteger('day_to')->nullable()->after('day_from');
            $table->unsignedTinyInteger('night_from')->nullable()->after('day_to');
            $table->unsignedTinyInteger('night_to')->nullable()->after('night_from');

            // Computed energy for this row (watts × qty × hours in that window)
            $table->decimal('day_wh', 12, 2)->default(0)->after('night_to');
            $table->decimal('night_wh', 12, 2)->default(0)->after('day_wh');
        });
    }

    public function down(): void
    {
        Schema::table('appliance_items', function (Blueprint $table) {
            $table->dropColumn([
                'appliance_type', 'hp',
                'day_from', 'day_to', 'night_from', 'night_to',
                'day_wh', 'night_wh',
            ]);
        });
    }
};
