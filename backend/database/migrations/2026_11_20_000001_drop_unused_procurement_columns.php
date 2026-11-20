<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the columns left from the old in-app procurement workflow
 * (availability checks, confirmation and prices). Suppliers now answer on
 * Messenger, so purchase requests only hold what was sent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn(['procurement_status', 'total_amount']);
        });

        Schema::table('material_items', function (Blueprint $table) {
            $table->dropColumn(['unit_price', 'availability']);
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->enum('procurement_status', ['pending', 'available', 'partially_available', 'confirmed', 'unavailable'])
                ->default('pending')->after('request_date');
            $table->decimal('total_amount', 12, 2)->nullable()->after('procurement_status');
        });

        Schema::table('material_items', function (Blueprint $table) {
            $table->decimal('unit_price', 12, 2)->nullable()->after('unit');
            $table->enum('availability', ['available', 'limited', 'out_of_stock'])->default('available')->after('unit_price');
        });
    }
};
