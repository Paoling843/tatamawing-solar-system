<?php

namespace App\Http\Controllers;

use App\Models\QuoteSession;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;

class QuoteSessionController extends Controller
{
    /**
     * Public ping from the quote builder: "this browser tab reached step N"
     * and/or "pressed Request quotation". Works with or without a login; a
     * bearer token, if sent, tells us the visitor is signed in.
     */
    public function track(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['required', 'uuid'],
            'step' => ['required', 'integer', 'between:1,3'],
            'requested' => ['sometimes', 'boolean'],
        ]);

        $user = auth('sanctum')->user();

        // Admins trying the calculator aren't customers — don't count them
        if ($user && $user->role !== 'customer') {
            return response()->noContent();
        }

        $session = QuoteSession::firstOrNew(['session_id' => $data['session_id']]);

        // Once submitted, the session is finished
        if ($session->converted_at) {
            return response()->noContent();
        }

        if (! $session->exists) {
            $session->started_as_guest = ! $user;
            $session->user_id = $user?->id;
            $session->furthest_step = $data['step'];
        } else {
            $session->furthest_step = max($session->furthest_step, $data['step']);

            // A guest who has now signed in
            if ($user && ! $session->user_id) {
                $session->user_id = $user->id;
                $session->signed_in_at = now();
            }
        }

        if (($data['requested'] ?? false) && ! $session->requested_at) {
            $session->requested_at = now();
        }

        $session->save();

        return response()->noContent();
    }

    /**
     * Admin analytics: who used the quote builder and how far they got,
     * for the last `days` days (7, 30, 90 or 365; default 30).
     */
    public function analytics(Request $request, AnalyticsService $analytics)
    {
        return response()->json(
            $analytics->quoteSessionStats(AnalyticsService::normalizeDays($request->query('days', 30)))
        );
    }
}
