<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Customers can cancel their own request (while pending, or after approval
// until the installation starts), with an optional reason
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'cancelled'])->default('draft')->change();
            $table->timestamp('cancelled_at')->nullable()->after('notes');
            $table->text('cancellation_reason')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancellation_reason']);
        });
        // Cancelled requests have no place in the old list of statuses
        DB::table('quotation_requests')->where('status', 'cancelled')->update(['status' => 'rejected']);
        Schema::table('quotation_requests', function (Blueprint $table) {
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected'])->default('draft')->change();
        });
    }
};
