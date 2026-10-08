<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Chat messages can be more than text: `messenger_link` is the "Chat on
 * Messenger" card the admin sends (or the slow-response fallback sends for
 * them). `meta` holds the card's details: {auto, after_minutes, url}.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('type', 30)->default('text')->after('message');
            $table->json('meta')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['type', 'meta']);
        });
    }
};
