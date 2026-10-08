<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * External installation requests now ask for the location the same way as
 * the quote builder: barangay (from the official Bulan list), purok/street,
 * and an optional description of the house. The existing `address` column
 * is kept and filled from these, so pages and reports that show it still
 * work. Nullable: older requests only have the free-text address.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_installation_requests', function (Blueprint $table) {
            $table->string('install_purok')->nullable()->after('address');
            $table->string('install_barangay', 120)->nullable()->after('install_purok');
            $table->string('install_municipality', 120)->nullable()->after('install_barangay');
            $table->string('install_province', 120)->nullable()->after('install_municipality');
            $table->text('site_description')->nullable()->after('install_province');
        });
    }

    public function down(): void
    {
        Schema::table('external_installation_requests', function (Blueprint $table) {
            $table->dropColumn(['install_purok', 'install_barangay', 'install_municipality', 'install_province', 'site_description']);
        });
    }
};
