<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Purchase Request #{{ $purchaseRequest->id }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        .meta-block { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
        .meta-row { font-size: 10px; color: #374151; margin-bottom: 3px; }
        .meta-row strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f9fafb; text-align: left; padding: 6px 10px; font-size: 10px; color: #6b7280; text-transform: uppercase; }
        td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        .notes-block { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
        .notes-block .label { font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; }
        .notes-lines { height: 60px; border-bottom: 1px dashed #d1d5db; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Purchase Request #{{ $purchaseRequest->id }}</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }}</p>
    </div>

    <div class="content">
        <div class="meta-block">
            <div class="meta-row"><strong>Customer:</strong> {{ $purchaseRequest->quotation->quotationRequest->customer->user->name ?? 'N/A' }}</div>
            <div class="meta-row"><strong>System Type:</strong> {{ ucfirst($purchaseRequest->quotation->quotationRequest->solar_system_type ?? 'N/A') }}</div>
            <div class="meta-row"><strong>Request Date:</strong> {{ \Carbon\Carbon::parse($purchaseRequest->request_date)->format('M d, Y') }}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                </tr>
            </thead>
            <tbody>
                @foreach($purchaseRequest->materialItems as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item->material_name }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ $item->unit ?? '—' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="notes-block">
            <div class="label">Supplier notes / pricing / availability</div>
            <div class="notes-lines"></div>
        </div>

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
