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
        Schema::create('appliance_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_request_id')->constrained()->onDelete('cascade');
            $table->string('appliance_name');
            $table->integer('wattage');
            $table->integer('quantity');
            $table->decimal('usage_hours_per_day', 4, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appliance_items');
    }
};
