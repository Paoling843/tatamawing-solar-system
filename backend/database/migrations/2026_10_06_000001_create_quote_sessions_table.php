<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per use of the Solar Computation Engine (the quote builder),
 * identified by an anonymous random ID kept in the visitor's browser tab.
 *
 * Lets the analytics page count people who built a quotation as a guest but
 * never signed in to request it, which the quotation_requests table can't
 * show because guests' inputs never reach the server. No personal data is
 * stored — only how far they got and, if they continued, who and which request.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();

            // True when the first visit came from someone who wasn't signed in
            $table->boolean('started_as_guest')->default(true);

            // Furthest step reached: 1 = appliances, 2 = computation, 3 = package/quote
            $table->unsignedTinyInteger('furthest_step')->default(1);

            // Pressed "Request quotation"
            $table->timestamp('requested_at')->nullable();

            // A guest who signed in partway through
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('signed_in_at')->nullable();

            // Submitted — the quotation request it turned into
            $table->foreignId('quotation_request_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('converted_at')->nullable();

            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_sessions');
    }
};
