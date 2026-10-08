<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The customer's own description of the site (roof type, number of floors,
 * shading, access, …), asked under the installation location in the quote
 * builder. Optional. Separate from `notes`, which admins use for rejection
 * reasons.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->text('site_description')->nullable()->after('install_province');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->dropColumn('site_description');
        });
    }
};
