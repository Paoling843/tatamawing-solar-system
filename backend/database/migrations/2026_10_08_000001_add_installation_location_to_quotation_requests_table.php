<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where the system will be installed, asked at the top of the quote
 * builder's Step 1. Stored on the quotation request (not the customer)
 * because one customer can quote for more than one site.
 *
 * Nullable: requests made before this change have no location.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->string('install_purok')->nullable()->after('notes');
            $table->string('install_barangay', 120)->nullable()->after('install_purok');
            $table->string('install_municipality', 120)->nullable()->after('install_barangay');
            $table->string('install_province', 120)->nullable()->after('install_municipality');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->dropColumn(['install_purok', 'install_barangay', 'install_municipality', 'install_province']);
        });
    }
};
