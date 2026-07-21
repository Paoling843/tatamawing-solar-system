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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_request_id')->unique()->constrained()->onDelete('cascade');
            $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->onDelete('set null');
            $table->date('approval_date')->nullable();
            $table->decimal('adjusted_cost', 12, 2)->nullable();
            $table->decimal('labor_fee', 12, 2)->default(0);
            $table->decimal('transportation_fee', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
