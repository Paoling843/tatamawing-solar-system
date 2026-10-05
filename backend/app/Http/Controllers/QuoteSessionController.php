<?php

namespace App\Http\Controllers;

use App\Models\ExternalInstallationRequest;
use App\Models\QuoteSession;
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
    public function analytics(Request $request)
    {
        $days = (int) $request->query('days', 30);
        if (! in_array($days, [7, 30, 90, 365], true)) {
            $days = 30;
        }

        $since = now()->subDays($days);
        $sessions = QuoteSession::where('created_at', '>=', $since)->get();
        $guests = $sessions->where('started_as_guest', true);

        // A quotation counts as "made" once the visitor saw the quote (Step 3)
        $guestNotContinued = $guests->where('furthest_step', 3)->whereNull('converted_at')->count();
        $guestSignedIn = $guests->whereNotNull('converted_at')->count();
        $signedInCustomers = $sessions->where('started_as_guest', false)->whereNotNull('converted_at')->count();
        $external = ExternalInstallationRequest::where('created_at', '>=', $since)->count();

        // Average hours from a guest's first visit to signing in
        $signInHours = $guests->whereNotNull('signed_in_at')
            ->map(fn ($s) => $s->created_at->diffInMinutes($s->signed_in_at) / 60);

        return response()->json([
            'period_days' => $days,
            'users' => [
                'guest_not_continued' => $guestNotContinued,
                'guest_signed_in' => $guestSignedIn,
                'external_requests' => $external,
                // Already signed in when they started (not part of the panel's split)
                'signed_in_customers' => $signedInCustomers,
            ],
            // How far guests got through the quote builder
            'guest_steps' => [
                'started' => $guests->count(),
                'reached_computation' => $guests->where('furthest_step', '>=', 2)->count(),
                'reached_quote' => $guests->where('furthest_step', 3)->count(),
                'requested' => $guests->whereNotNull('requested_at')->count(),
                'signed_in' => $guests->whereNotNull('signed_in_at')->count(),
                'submitted' => $guestSignedIn,
            ],
            'avg_hours_to_sign_in' => $signInHours->isEmpty() ? null : round($signInHours->avg(), 1),
            'monthly' => $this->monthly(),
        ]);
    }

    /**
     * The three-way user split for each of the last 6 months (oldest first).
     * Grouped in PHP so it works the same on MySQL and SQLite.
     */
    private function monthly(): array
    {
        $start = now()->startOfMonth()->subMonths(5);

        $months = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->copy()->addMonths($i);
            $months[$month->format('Y-m')] = [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M'),
                'guest_not_continued' => 0,
                'guest_signed_in' => 0,
                'external_requests' => 0,
            ];
        }

        QuoteSession::where('created_at', '>=', $start)
            ->where('started_as_guest', true)
            ->get(['created_at', 'furthest_step', 'converted_at'])
            ->each(function ($s) use (&$months) {
                $key = $s->created_at->format('Y-m');
                if (! isset($months[$key])) {
                    return;
                }
                if ($s->converted_at) {
                    $months[$key]['guest_signed_in']++;
                } elseif ($s->furthest_step === 3) {
                    $months[$key]['guest_not_continued']++;
                }
            });

        ExternalInstallationRequest::where('created_at', '>=', $start)
            ->get(['created_at'])
            ->each(function ($r) use (&$months) {
                $key = $r->created_at->format('Y-m');
                if (isset($months[$key])) {
                    $months[$key]['external_requests']++;
                }
            });

        return array_values($months);
    }
}
