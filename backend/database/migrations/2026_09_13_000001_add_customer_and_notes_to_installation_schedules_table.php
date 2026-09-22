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
            $table->dropForeign(['quotation_id']);
        });

        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('quotation_id')->nullable()->change();
        });

        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');

            $table->foreignId('customer_id')->nullable()->after('quotation_id')
                ->constrained()->onDelete('cascade');

            $table->text('notes')->nullable()->after('assigned_technician');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['customer_id', 'notes']);
        });

        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->dropForeign(['quotation_id']);
        });

        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('quotation_id')->nullable(false)->change();
        });

        Schema::table('installation_schedules', function (Blueprint $table) {
            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
        });
    }
};
