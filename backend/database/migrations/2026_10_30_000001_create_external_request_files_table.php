<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Render's disk is wiped on every restart, so the uploaded quotation is kept
// in the database instead (base64 text: a MySQL BLOB only holds 64 KB)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_request_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('external_installation_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size');
            $table->longText('content');
            $table->timestamps();
        });

        // New requests no longer have a file on disk
        Schema::table('external_installation_requests', function (Blueprint $table) {
            $table->string('quotation_file_path')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_request_files');
    }
};
