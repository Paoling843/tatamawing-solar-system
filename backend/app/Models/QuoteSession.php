<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One anonymous use of the quote builder. See the create_quote_sessions_table
 * migration for what each column means.
 */
class QuoteSession extends Model
{
    protected $fillable = [
        'session_id',
        'started_as_guest',
        'furthest_step',
        'requested_at',
        'user_id',
        'signed_in_at',
        'quotation_request_id',
        'converted_at',
    ];

    protected function casts(): array
    {
        return [
            'started_as_guest' => 'boolean',
            'furthest_step' => 'integer',
            'requested_at' => 'datetime',
            'signed_in_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }

    /**
     * Marks the session as turned into a quotation request. Called when a
     * customer submits. Does nothing for an unknown or already-used session.
     */
    public static function markConverted(?string $sessionId, User $user, QuotationRequest $quotationRequest): void
    {
        if (! $sessionId) {
            return;
        }

        $session = static::where('session_id', $sessionId)->whereNull('converted_at')->first();

        if (! $session) {
            return;
        }

        $session->update([
            'user_id' => $session->user_id ?? $user->id,
            // A guest who never pinged after signing in still signed in by now
            'signed_in_at' => $session->started_as_guest ? ($session->signed_in_at ?? now()) : null,
            'furthest_step' => 3,
            'requested_at' => $session->requested_at ?? now(),
            'quotation_request_id' => $quotationRequest->id,
            'converted_at' => now(),
        ]);
    }
}
