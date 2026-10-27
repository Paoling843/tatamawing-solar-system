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
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quotation Material Report</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel ?? 'All time' }}</p>
    </div>

    <div class="content">
        {{-- One block per approved project: the materials from its quote's price
             lines (installation labour is a service, so it's left out) --}}
        @forelse($quotations as $quotation)
        @php
            $request = $quotation->quotationRequest;
            $materials = collect($request->solarComputation->line_items ?? [])
                ->reject(fn ($item) => ($item['key'] ?? '') === 'installation');
        @endphp
        <div class="project-block">
            <div class="project-header">
                <div class="project-title">
                    #Q-{{ $request->created_at->format('Y') }}-{{ str_pad($request->id, 3, '0', STR_PAD_LEFT) }}
                    — {{ $request->customer->user->name ?? 'Unknown customer' }}
                </div>
                <div class="project-meta">
                    Approved: {{ $quotation->created_at->format('M d, Y') }}
                    @if($request->installation_address) &bull; {{ $request->installation_address }} @endif
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Material</th>
                        <th>Code</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($materials->values() as $index => $item)
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ $item['label'] ?? '—' }}</td>
                        <td>{{ $item['sku'] ?? '—' }}</td>
                        <td>{{ $item['qty'] ?? '—' }}</td>
                        <td>{{ $item['qty_unit'] ?? '—' }}</td>
                    </tr>
                    @empty
                    <tr><td colspan="5" style="color: #6b7280;">No itemized materials for this quotation.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @empty
        <p style="text-align: center; color: #6b7280; padding: 2rem;">No approved quotations in this period.</p>
        @endforelse

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
