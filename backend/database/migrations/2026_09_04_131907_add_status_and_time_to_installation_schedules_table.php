<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->time('scheduled_time')->nullable()->after('scheduled_date');
            $table->string('status')->default('scheduled')->after('scheduled_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->dropColumn(['scheduled_time', 'status']);
        });
    }
};
