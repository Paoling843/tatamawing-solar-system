<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation History Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #16a34a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #16a34a; color: white; text-align: left; padding: 7px 8px; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .badge-approved { background-color: #dcfce7; color: #16a34a; }
        .badge-pending { background-color: #fef9c3; color: #ca8a04; }
        .badge-rejected { background-color: #fef2f2; color: #dc2626; }
        .badge-draft { background-color: #f3f4f6; color: #6b7280; }
        .summary { margin-bottom: 16px; display: table; width: 100%; }
        .summary-box { display: table-cell; text-align: center; padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
        .summary-number { font-size: 20px; font-weight: bold; color: #16a34a; }
        .summary-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quotation History Report</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }}</p>
    </div>

    <div class="content">

        {{-- Summary boxes --}}
        <table class="summary" style="margin-bottom: 16px;">
            <tr>
                <td class="summary-box">
                    <div class="summary-number">{{ $quotationRequests->count() }}</div>
                    <div class="summary-label">Total Requests</div>
                </td>
                <td class="summary-box">
                    <div class="summary-number">{{ $quotationRequests->where('status', 'approved')->count() }}</div>
                    <div class="summary-label">Approved</div>
                </td>
                <td class="summary-box">
                    <div class="summary-number">{{ $quotationRequests->where('status', 'pending')->count() }}</div>
                    <div class="summary-label">Pending</div>
                </td>
                <td class="summary-box">
                    <div class="summary-number">{{ $quotationRequests->where('status', 'rejected')->count() }}</div>
                    <div class="summary-label">Rejected</div>
                </td>
                <td class="summary-box">
                    <div class="summary-number">PHP{{ number_format($quotationRequests->filter(fn($q) => $q->quotation)->sum(fn($q) => $q->quotation->total_amount), 0) }}</div>
                    <div class="summary-label">Total Value (Approved)</div>
                </td>
            </tr>
        </table>

        {{-- Quotation requests table --}}
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>System Type</th>
                    <th>Submission Date</th>
                    <th>Status</th>
                    <th>Estimated Cost</th>
                    <th>Final Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($quotationRequests as $index => $qr)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $qr->customer->user->name ?? 'N/A' }}</td>
                    <td>{{ ucfirst($qr->solar_system_type) }}</td>
                    <td>{{ \Carbon\Carbon::parse($qr->submission_date)->format('M d, Y') }}</td>
                    <td>
                        <span class="badge badge-{{ $qr->status }}">
                            {{ ucfirst($qr->status) }}
                        </span>
                    </td>
                    <td>PHP{{ $qr->solarComputation ? number_format($qr->solarComputation->estimated_cost, 2) : 'N/A' }}</td>
                    <td>{{ $qr->quotation ? 'PHP' . number_format($qr->quotation->total_amount, 2) : '—' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>