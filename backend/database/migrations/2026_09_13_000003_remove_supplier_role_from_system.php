<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Suppliers are contacted externally (Messenger), never through the
        // app — purge any leftover supplier-role accounts before the
        // `suppliers` table (and the enum value that points at it) is gone.
        DB::table('users')->where('role', 'supplier')->delete();

        Schema::dropIfExists('suppliers');

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('customer', 'admin') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('customer', 'admin', 'supplier') NOT NULL");
        }

        Schema::create('suppliers', function ($table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            $table->string('company_name');
            $table->string('contact_person');
            $table->timestamps();
        });
    }
};
