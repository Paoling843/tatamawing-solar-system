<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * FAQ answers were VARCHAR(255), so any answer longer than that passed
 * validation and then failed to save with a database error. TEXT holds the
 * 5,000-character limit FaqController now checks.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faqs', function (Blueprint $table) {
            $table->text('answer')->change();
        });
    }

    public function down(): void
    {
        // Shorten long answers first so they fit VARCHAR(255) again
        DB::table('faqs')
            ->whereRaw('LENGTH(answer) > 255')
            ->update(['answer' => DB::raw('SUBSTR(answer, 1, 255)')]);

        Schema::table('faqs', function (Blueprint $table) {
            $table->string('answer')->change();
        });
    }
};
