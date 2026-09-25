<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\PurchaseRequest;
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

    public function quotationHistoryReport()
    {
        $quotationRequests = QuotationRequest::with([
            'customer.user',
            'solarComputation',
            'quotation',
        ])
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.quotation-history', [
            'quotationRequests' => $quotationRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->stream('quotation-history-report.pdf');
    }

    public function quotationMaterialReport()
    {
        $purchaseRequests = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.quotation-material', [
            'purchaseRequests' => $purchaseRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('quotation-material-report.pdf');
    }

    public function procurementReport()
    {
        $purchaseRequests = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user'
        ])
        ->latest()
        ->get();

        $pdf = Pdf::loadView('reports.procurement', [
            'purchaseRequests' => $purchaseRequests,
            'generatedAt' => now()->format('F d, Y h:i A'),
        ]);

        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('procurement-report.pdf');
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
