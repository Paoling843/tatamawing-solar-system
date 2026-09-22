<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The two recent electricity bills a customer can attach to a quotation.
 *
 * These are for reference only (the admin can compare them with the
 * computed load). They are NOT used anywhere in the solar computation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('electricity_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_request_id')->constrained()->onDelete('cascade');

            // 1 = most recent bill, 2 = the month before
            $table->unsignedTinyInteger('sequence');

            // Stored as the first day of the billing month, e.g. 2026-08-01
            $table->date('billing_month')->nullable();
            $table->decimal('amount', 10, 2)->nullable();
            $table->decimal('kwh', 10, 2)->nullable();
            $table->timestamps();

            // A quotation can only have one "bill 1" and one "bill 2"
            $table->unique(['quotation_request_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electricity_bills');
    }
};
