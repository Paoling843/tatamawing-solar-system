<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Each materials PDF sent to a supplier is now saved as a purchase request,
 * so the Procurement report can list them. The old availability / confirm
 * columns (procurement_status, availability, prices) stay but are unused.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            // business = TataMawing's address, site = the installation site
            $table->string('deliver_to', 10)->default('business')->after('request_date');
            // The address printed on the PDF, kept as it was on that day
            $table->string('delivery_address')->nullable()->after('deliver_to');
            $table->date('needed_by')->nullable()->after('delivery_address');
            $table->text('notes')->nullable()->after('needed_by');
            $table->foreignId('sent_by_user_id')->nullable()->after('notes')
                ->constrained('users')->nullOnDelete();
        });

        Schema::table('material_items', function (Blueprint $table) {
            $table->string('category', 20)->nullable()->after('purchase_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('material_items', function (Blueprint $table) {
            $table->dropColumn('category');
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropForeign(['sent_by_user_id']);
            $table->dropColumn(['deliver_to', 'delivery_address', 'needed_by', 'notes', 'sent_by_user_id']);
        });
    }
};
