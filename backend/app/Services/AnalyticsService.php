<?php

namespace App\Services;

use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\QuoteSession;
use Illuminate\Support\Carbon;

/**
 * Every number on the admin Analytics page, for a period of the last
 * `days` days (7, 30, 90 or 365).
 *
 * Grouping is done in PHP rather than SQL so it works the same on MySQL and
 * on the SQLite test database. The data sets are small (one business's
 * quotations), so this stays fast.
 */
class AnalyticsService
{
    public const PERIODS = [7, 30, 90, 365];

    public static function normalizeDays(mixed $days): int
    {
        $days = (int) $days;

        return in_array($days, self::PERIODS, true) ? $days : 30;
    }

    /**
     * Everything the Analytics page shows.
     */
    public function overview(int $days): array
    {
        $since = now()->subDays($days);

        return $this->quoteSessionStats($days) + [
            'kpis' => $this->kpis($days),
            'funnel' => $this->funnel($since),
            'step_times' => $this->stepTimes($since),
            'sizes' => $this->sizes($since),
            'locations' => $this->locations($since),
            'savings' => $this->savings($since),
            'review_queue' => $this->reviewQueue($since),
        ];
    }

    // ------------------------------------------------------------------
    // Who used the quote builder (anonymous guest tracking)
    // ------------------------------------------------------------------

    public function quoteSessionStats(int $days): array
    {
        $since = now()->subDays($days);
        $sessions = QuoteSession::where('created_at', '>=', $since)->get();
        $guests = $sessions->where('started_as_guest', true);

        // A quotation counts as "made" once the visitor saw the quote (Step 3)
        $guestNotContinued = $guests->where('furthest_step', 3)->whereNull('converted_at')->count();
        $guestSignedIn = $guests->whereNotNull('converted_at')->count();

        // Average hours from a guest's first visit to signing in
        $signInHours = $guests->whereNotNull('signed_in_at')
            ->map(fn ($s) => $s->created_at->diffInMinutes($s->signed_in_at) / 60);

        return [
            'period_days' => $days,
            'users' => [
                'guest_not_continued' => $guestNotContinued,
                'guest_signed_in' => $guestSignedIn,
                'external_requests' => ExternalInstallationRequest::where('created_at', '>=', $since)->count(),
                // Already signed in when they started (not part of the panel's split)
                'signed_in_customers' => $sessions->where('started_as_guest', false)->whereNotNull('converted_at')->count(),
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
        ];
    }

    /**
     * The three-way user split for each of the last 6 months (oldest first).
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

    // ------------------------------------------------------------------
    // KPI cards: this period vs. the period before it
    // ------------------------------------------------------------------

    private function kpis(int $days): array
    {
        $since = now()->subDays($days);
        $before = now()->subDays($days * 2);

        $approvedIn = fn (Carbon $from, Carbon $to) => Quotation::whereDate('approval_date', '>', $from->toDateString())
            ->whereDate('approval_date', '<=', $to->toDateString());

        $installedIn = fn (Carbon $from, Carbon $to) => InstallationSchedule::where('status', 'completed')
            ->whereDate('scheduled_date', '>', $from->toDateString())
            ->whereDate('scheduled_date', '<=', $to->toDateString());

        return [
            'quotations_created' => [
                'value' => QuotationRequest::where('created_at', '>=', $since)->count(),
                'previous' => QuotationRequest::whereBetween('created_at', [$before, $since])->count(),
            ],
            'approved_projects' => [
                'value' => $approvedIn($since, now())->count(),
                'previous' => $approvedIn($before, $since)->count(),
            ],
            'revenue' => [
                'value' => (float) $approvedIn($since, now())->sum('total_amount'),
                'previous' => (float) $approvedIn($before, $since)->sum('total_amount'),
            ],
            'installations_completed' => [
                'value' => $installedIn($since, now())->count(),
                'previous' => $installedIn($before, $since)->count(),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // From quotation to installation
    // ------------------------------------------------------------------

    /**
     * Follows every quote-builder visit started in the period through to
     * installation. External requests skip the quote builder, so they're
     * not part of it.
     */
    private function funnel(Carbon $since): array
    {
        $sessions = QuoteSession::with('quotationRequest.quotation.installationSchedule')
            ->where('created_at', '>=', $since)
            ->get();

        $request = fn ($s) => $s->quotationRequest;
        $schedule = fn ($s) => $s->quotationRequest?->quotation?->installationSchedule;

        return [
            ['key' => 'saw_quote', 'label' => 'Made a quotation', 'count' => $sessions->where('furthest_step', 3)->count()],
            ['key' => 'requested', 'label' => 'Pressed Request quotation', 'count' => $sessions->whereNotNull('requested_at')->count()],
            ['key' => 'submitted', 'label' => 'Submitted for review', 'count' => $sessions->whereNotNull('converted_at')->count()],
            ['key' => 'approved', 'label' => 'Project approved', 'count' => $sessions->filter(fn ($s) => $request($s)?->status === 'approved')->count()],
            ['key' => 'scheduled', 'label' => 'Installation scheduled', 'count' => $sessions->filter(fn ($s) => $schedule($s) !== null)->count()],
            ['key' => 'installed', 'label' => 'Installed', 'count' => $sessions->filter(fn ($s) => $schedule($s)?->status === 'completed')->count()],
        ];
    }

    /**
     * Average days between the main steps, for steps finished in the period.
     */
    private function stepTimes(Carbon $since): array
    {
        $avgDays = fn ($values) => $values->isEmpty() ? null : round($values->avg(), 1);

        $signIn = QuoteSession::where('started_as_guest', true)
            ->whereNotNull('signed_in_at')
            ->where('signed_in_at', '>=', $since)
            ->get()
            ->map(fn ($s) => $s->created_at->diffInMinutes($s->signed_in_at) / 1440);

        $approval = Quotation::with('quotationRequest')
            ->whereDate('approval_date', '>', $since->toDateString())
            ->get()
            ->filter(fn ($q) => $q->quotationRequest)
            ->map(fn ($q) => max(0, $q->quotationRequest->created_at->copy()->startOfDay()->diffInDays(Carbon::parse($q->approval_date))));

        $install = InstallationSchedule::with('quotation')
            ->where('status', 'completed')
            ->whereNotNull('quotation_id')
            ->whereDate('scheduled_date', '>', $since->toDateString())
            ->get()
            ->filter(fn ($s) => $s->quotation)
            ->map(fn ($s) => max(0, Carbon::parse($s->quotation->approval_date)->diffInDays(Carbon::parse($s->scheduled_date))));

        return [
            ['key' => 'visit_to_sign_in', 'label' => 'First visit → sign in', 'days' => $avgDays($signIn)],
            ['key' => 'submitted_to_approved', 'label' => 'Submitted → approved', 'days' => $avgDays($approval)],
            ['key' => 'approved_to_installed', 'label' => 'Approved → installed', 'days' => $avgDays($install)],
        ];
    }

    // ------------------------------------------------------------------
    // What was quoted, and where
    // ------------------------------------------------------------------

    /**
     * Quotations per inverter package (every package listed, even at zero).
     */
    private function sizes(Carbon $since): array
    {
        $kws = QuotationRequest::with('solarComputation')
            ->where('created_at', '>=', $since)
            ->get()
            ->map(fn ($r) => $r->solarComputation?->package_kw)
            ->filter();

        return [
            'packages' => array_map(fn ($p) => [
                'kw' => $p['kw'],
                'count' => $kws->filter(fn ($kw) => (int) $kw === $p['kw'])->count(),
            ], SolarComputationService::PACKAGES),
            'average_kw' => $kws->isEmpty() ? null : round($kws->avg(), 1),
        ];
    }

    /**
     * Top 5 installation locations ("Bical, Bulan") across quotation
     * requests and external installation requests, from the location entered
     * in the quote builder / external request form. Older records fall back
     * to "Brgy. X" in their address, else "Not specified". Spellings that
     * differ only in capitals or spacing count together.
     */
    private function locations(Carbon $since): array
    {
        $quotations = QuotationRequest::with('customer')
            ->where('created_at', '>=', $since)
            ->get()
            ->map(fn ($r) => $this->locationLabel(
                $r->install_barangay,
                $r->install_municipality,
                $r->customer?->install_location ?: $r->customer?->address
            ));

        $external = ExternalInstallationRequest::where('created_at', '>=', $since)
            ->get()
            ->map(fn ($e) => $this->locationLabel($e->install_barangay, $e->install_municipality, $e->address));

        return $quotations->concat($external)
            ->groupBy(fn ($label) => mb_strtolower(preg_replace('/\s+/', ' ', trim($label))))
            ->map(fn ($labels) => ['name' => $labels->first(), 'count' => $labels->count()])
            ->sortByDesc('count')
            ->take(5)
            ->values()
            ->all();
    }

    private function locationLabel(?string $barangay, ?string $municipality, ?string $fallbackAddress): string
    {
        if ($barangay) {
            return collect([$barangay, $municipality])->filter()->implode(', ');
        }
        if ($fallbackAddress && preg_match('/\bBrgy\.?\s*([^,]+)/i', $fallbackAddress, $m)) {
            return trim($m[1]);
        }

        return 'Not specified';
    }

    // ------------------------------------------------------------------
    // Savings and the review queue
    // ------------------------------------------------------------------

    private function savings(Carbon $since): array
    {
        $computations = QuotationRequest::with('solarComputation')
            ->where('created_at', '>=', $since)
            ->get()
            ->map(fn ($r) => $r->solarComputation)
            ->filter(fn ($c) => $c && $c->monthly_savings !== null);

        if ($computations->isEmpty()) {
            return ['count' => 0, 'avg_monthly_savings' => null, 'avg_payback_years' => null, 'avg_roa_percent' => null, 'own_rate_percent' => null];
        }

        $roa = $computations
            ->filter(fn ($c) => (float) $c->estimated_cost > 0)
            ->map(fn ($c) => (float) $c->annual_savings / (float) $c->estimated_cost * 100);

        return [
            'count' => $computations->count(),
            'avg_monthly_savings' => round($computations->avg(fn ($c) => (float) $c->monthly_savings), 2),
            'avg_payback_years' => round($computations->whereNotNull('payback_years')->avg(fn ($c) => (float) $c->payback_years), 1),
            'avg_roa_percent' => $roa->isEmpty() ? null : round($roa->avg(), 1),
            // Share of customers who entered a bill with its kWh (their own rate)
            'own_rate_percent' => round($computations->where('rate_source', 'bill')->count() / $computations->count() * 100),
        ];
    }

    private function reviewQueue(Carbon $since): array
    {
        $oldestPending = QuotationRequest::where('status', 'pending')->min('created_at');

        $decided = QuotationRequest::where('created_at', '>=', $since)
            ->whereIn('status', ['approved', 'rejected'])
            ->get(['status']);

        return [
            'pending' => QuotationRequest::where('status', 'pending')->count(),
            'oldest_pending_days' => $oldestPending ? (int) Carbon::parse($oldestPending)->diffInDays(now()) : null,
            'approval_rate_percent' => $decided->isEmpty()
                ? null
                : round($decided->where('status', 'approved')->count() / $decided->count() * 100),
            'rejected' => $decided->where('status', 'rejected')->count(),
        ];
    }
}
