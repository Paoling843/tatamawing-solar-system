<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Procurement Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #16a34a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background-color: #16a34a; color: white; text-align: left; padding: 7px 8px; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .badge-confirmed { background-color: #dcfce7; color: #16a34a; }
        .badge-pending { background-color: #fef9c3; color: #ca8a04; }
        .badge-partially_available { background-color: #ffedd5; color: #ea580c; }
        .badge-unavailable { background-color: #fef2f2; color: #dc2626; }
        .materials-list { font-size: 9px; color: #6b7280; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Procurement Report</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }}</p>
    </div>

    <div class="content">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Supplier</th>
                    <th>Request Date</th>
                    <th>Materials</th>
                    <th>Procurement Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($purchaseRequests as $index => $pr)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $pr->quotation->quotationRequest->customer->user->name ?? 'N/A' }}</td>
                    <td>{{ $pr->supplier->company_name ?? 'N/A' }}</td>
                    <td>{{ \Carbon\Carbon::parse($pr->request_date)->format('M d, Y') }}</td>
                    <td>
                        <div class="materials-list">
                            @foreach($pr->materialItems as $item)
                                • {{ $item->material_name }} ({{ $item->quantity }} {{ $item->unit }})
                                — {{ ucwords(str_replace('_', ' ', $item->availability)) }}<br>
                            @endforeach
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-{{ $pr->procurement_status }}">
                            {{ ucwords(str_replace('_', ' ', $pr->procurement_status)) }}
                        </span>
                    </td>
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