<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The new Register form only asks for name, email, mobile number and
 * password. Address and install location are collected later (e.g. at the
 * site survey), so they can be empty when an account is created.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('address')->nullable()->change();
            $table->string('install_location')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Fill any empty values first so the columns can be required again
        DB::table('customers')->whereNull('address')->update(['address' => '']);
        DB::table('customers')->whereNull('install_location')->update(['install_location' => '']);

        Schema::table('customers', function (Blueprint $table) {
            $table->string('address')->nullable(false)->change();
            $table->string('install_location')->nullable(false)->change();
        });
    }
};
