<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation Material Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        .project-block { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .project-header { background-color: #f0f7f4; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
        .project-title { font-weight: bold; font-size: 12px; color: #111827; }
        .project-meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f9fafb; text-align: left; padding: 6px 10px; font-size: 10px; color: #6b7280; text-transform: uppercase; }
        td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .badge-available { background-color: #dcfce7; color: #16a34a; }
        .badge-limited { background-color: #ffedd5; color: #ea580c; }
        .badge-out_of_stock { background-color: #fef2f2; color: #dc2626; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quotation Material Report</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel ?? 'All time' }}</p>
    </div>

    <div class="content">
        @forelse($purchaseRequests as $pr)
        <div class="project-block">
            {{-- Project header --}}
            <div class="project-header">
                <div class="project-title">
                    {{ $pr->quotation->quotationRequest->customer->user->name ?? 'Unknown Customer' }}
                    — {{ ucfirst($pr->quotation->quotationRequest->solar_system_type ?? '') }} System
                </div>
                <div class="project-meta">
                    Request Date: {{ \Carbon\Carbon::parse($pr->request_date)->format('M d, Y') }}
                    &bull; Status: {{ ucwords(str_replace('_', ' ', $pr->procurement_status)) }}
                </div>
            </div>

            {{-- Materials table --}}
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Material</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Unit Price</th>
                        <th>Availability</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($pr->materialItems as $index => $item)
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ $item->material_name }}</td>
                        <td>{{ $item->quantity }}</td>
                        <td>{{ $item->unit ?? '—' }}</td>
                        <td>{{ $item->unit_price ? 'PHP' . number_format($item->unit_price, 2) : '—' }}</td>
                        <td>
                            <span class="badge badge-{{ $item->availability }}">
                                {{ ucwords(str_replace('_', ' ', $item->availability)) }}
                            </span>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        @empty
        <p style="text-align: center; color: #6b7280; padding: 2rem;">No purchase requests found.</p>
        @endforelse

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>