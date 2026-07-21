<?php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Temporary test route
Route::get('/test-pdf', function () {
    $quotationRequests = \App\Models\QuotationRequest::with([
        'customer.user',
        'solarComputation',
        'quotation',
    ])->latest()->get();

    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.quotation-history', [
        'quotationRequests' => $quotationRequests,
        'generatedAt' => now()->format('F d, Y h:i A'),
    ]);

    $pdf->setPaper('a4', 'landscape');

    return $pdf->stream('test.pdf');
});
