<?php

namespace App\Http\Controllers;

use App\Models\ExternalInstallationRequest;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\PurchaseRequest;
use App\Models\QuoteSession;
use App\Services\AnalyticsService;
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

    public function quotationMaterialReport(Request $request)
    {
        $days = $this->periodDays($request);

        $purchaseRequests = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])
        ->when($this->since($days), fn ($q, $since) => $q->where('created_at', '>=', $since))
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.quotation-material', [
            'purchaseRequests' => $purchaseRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('quotation-material-report.pdf');
    }

    public function procurementReport(Request $request)
    {
        $days = $this->periodDays($request);

        $purchaseRequests = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user'
        ])
        ->when($this->since($days), fn ($q, $since) => $q->where('created_at', '>=', $since))
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.procurement', [
            'purchaseRequests' => $purchaseRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
            'periodLabel' => $this->periodLabel($days),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('procurement-report.pdf');
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

    public function purchaseRequestReport($purchaseRequestId)
    {
        $purchaseRequest = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])->findOrFail($purchaseRequestId);

        $this->authorize('view', $purchaseRequest);

        $pdf = Pdf::loadView('reports.purchase-request', [
            'purchaseRequest' => $purchaseRequest,
            'generatedAt' => now()->format('F d, Y h:i A'),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('purchase-request-' . $purchaseRequest->id . '.pdf');
    }
}
