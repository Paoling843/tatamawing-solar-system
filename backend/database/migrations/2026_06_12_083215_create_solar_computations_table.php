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
        Schema::create('solar_computations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_request_id')->unique()->constrained()->onDelete('cascade');
            $table->decimal('total_load_watts', 10, 2);
            $table->decimal('panel_capacity_kw', 8, 2);
            $table->string('inverter_specification');
            $table->decimal('battery_capacity_ah', 8, 2);
            $table->decimal('estimated_cost', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('solar_computations');
    }
};
