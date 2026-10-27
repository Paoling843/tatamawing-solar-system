<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMaterialsPdfRequest;
use App\Models\ExternalInstallationRequest;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\QuoteSession;
use App\Services\AnalyticsService;
use App\Services\MessengerFallback;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function quotationReport(Request $request, $quotationId)
    {
        $quotation = Quotation::with([
            'quotationRequest.applianceItems',
            'quotationRequest.solarComputation',
            'quotationRequest.customer.user',
            'approvedByAdmin.user',
        ])->findOrFail($quotationId);

        $this->authorize('view', $quotation->quotationRequest);

        $pdf = Pdf::loadView('reports.quotation', [
            'quotation' => $quotation,
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download(
            'quotation-' . $quotation->quotationRequest->customer->user->name . '-' .
            $quotation->id . '.pdf' 
        );
    }

    // ------------------------------------------------------------------
    // Period-based reports. With ?days=7|30|90|365 they cover that period
    // (the range picked on the Analytics page); without it, all time.
    // ------------------------------------------------------------------

    private function periodDays(Request $request): ?int
    {
        return $request->filled('days') ? AnalyticsService::normalizeDays($request->query('days')) : null;
    }

    private function periodLabel(?int $days): string
    {
        return match ($days) {
            null => 'All time',
            365 => 'Last 12 months',
            default => "Last {$days} days",
        };
    }

    private function since(?int $days)
    {
        return $days ? now()->subDays($days) : null;
    }

    public function quotationHistoryReport(Request $request)
    {
        $days = $this->periodDays($request);

        $quotationRequests = QuotationRequest::with([
            'customer.user',
            'solarComputation',
            'quotation',
        ])
        ->when($this->since($days), fn ($q, $since) => $q->where('created_at', '>=', $since))
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.quotation-history', [
            'quotationRequests' => $quotationRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('quotation-history-report.pdf');
    }

    /**
     * Materials per approved project, from each quote's price lines
     * (installation labour left out, since it isn't a material).
     */
    public function quotationMaterialReport(Request $request)
    {
        $days = $this->periodDays($request);

        $quotations = Quotation::with([
            'quotationRequest.customer.user',
            'quotationRequest.solarComputation',
        ])
        ->whereHas('quotationRequest', fn ($q) => $q->where('status', 'approved'))
        ->when($this->since($days), fn ($q, $since) => $q->where('created_at', '>=', $since))
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.quotation-material', [
            'quotations' => $quotations,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('quotation-material-report.pdf');
    }

    /**
     * The materials list for one approved quotation, as a PDF the admin sends
     * to a supplier on Messenger. The list comes from the admin's form
     * (pre-filled from the quote, then edited); nothing is saved. It has no
     * prices and no customer name or phone, only the delivery place.
     */
    public function materialsPdf(StoreMaterialsPdfRequest $request, Quotation $quotation, MessengerFallback $messenger)
    {
        $quotation->load('quotationRequest.solarComputation');
        $quotationRequest = $quotation->quotationRequest;

        if ($quotationRequest->status !== 'approved') {
            return response()->json(['message' => 'Only approved quotations have a materials list.'], 422);
        }

        $reference = 'Q-' . $quotationRequest->created_at->format('Y') . '-' . str_pad($quotationRequest->id, 3, '0', STR_PAD_LEFT);
        // TataMawing's own address, or the installation site
        $deliverTo = $request->deliver_to === 'site'
            ? ($quotationRequest->installation_address ?? 'Installation site (address to follow)')
            : config('app.business_address');

        $pdf = Pdf::loadView('reports.materials-request', [
            'reference' => $reference,
            'computation' => $quotationRequest->solarComputation,
            'items' => $request->validated('items'),
            'deliverToSite' => $request->deliver_to === 'site',
            'deliverTo' => $deliverTo,
            'neededBy' => $request->needed_by ? \Carbon\Carbon::parse($request->needed_by)->format('F j, Y') : null,
            'notes' => $request->notes,
            'messengerUrl' => $messenger->settings()['messenger_url'],
            'contactEmail' => filter_var(config('app.contact_email'), FILTER_VALIDATE_EMAIL) ? config('app.contact_email') : null,
            'generatedAt' => now()->format('F j, Y'),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("TataMawing-materials-{$reference}.pdf");
    }

    /**
     * One-page summary of the Analytics page ("Export PDF").
     */
    public function analyticsSummaryReport(Request $request, AnalyticsService $analytics)
    {
        $days = AnalyticsService::normalizeDays($request->query('days', 30));

        $pdf = Pdf::loadView('reports.analytics-summary', [
            'data' => $analytics->overview($days),
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download("analytics-summary-{$days}-days.pdf");
    }

    /**
     * Every quote-builder visit and whether the visitor signed in.
     */
    public function quoteSessionsReport(Request $request)
    {
        $days = $this->periodDays($request) ?? 30;

        $sessions = QuoteSession::with('user', 'quotationRequest')
            ->where('created_at', '>=', $this->since($days))
            ->latest()
            ->get();

        $pdf = Pdf::loadView('reports.quote-sessions', [
            'sessions' => $sessions,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download("guest-vs-signed-in-quotations-{$days}-days.pdf");
    }

    /**
     * Schedule requests from people who bought their system elsewhere.
     */
    public function externalRequestsReport(Request $request)
    {
        $days = $this->periodDays($request);

        $requests = ExternalInstallationRequest::with('installationSchedule')
            ->when($this->since($days), fn ($q, $since) => $q->where('created_at', '>=', $since))
            ->latest()
            ->get();

        $pdf = Pdf::loadView('reports.external-requests', [
            'requests' => $requests,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('external-quotation-requests.pdf');
    }
}
