<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Procurement Report</title>
    {{-- Internal report: every materials PDF (purchase request) sent to
         suppliers in the period. Prices and availability are agreed on
         Messenger, so they aren't here. --}}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        .summary { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 18px; }
        .summary td { width: 25%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; background-color: #f0f7f4; }
        .summary .num { font-size: 18px; font-weight: bold; color: #1a4a3a; }
        .summary .lbl { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        h2 { font-size: 12px; color: #1a4a3a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; }
        .section { margin-bottom: 20px; }
        .block { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
        .block-header { background-color: #f0f7f4; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
        .block-title { font-weight: bold; font-size: 12px; }
        .block-meta { font-size: 10px; color: #6b7280; margin-top: 2px; line-height: 1.5; }
        table.items { width: 100%; border-collapse: collapse; }
        table.items th { background-color: #f9fafb; text-align: left; padding: 6px 10px; font-size: 10px; color: #6b7280; text-transform: uppercase; }
        table.items td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        table.items .r { text-align: right; }
        .totals { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .notes { padding: 8px 14px; font-size: 10px; color: #374151; white-space: pre-wrap; border-top: 1px solid #f3f4f6; }
        .muted { color: #6b7280; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Procurement Report</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel }}</p>
    </div>

    <div class="content">
        <table class="summary">
            <tr>
                <td><div class="num">{{ $summary['requests'] }}</div><div class="lbl">Purchase requests</div></td>
                <td><div class="num">{{ $summary['projects'] }}</div><div class="lbl">Projects</div></td>
                <td><div class="num">{{ number_format($summary['items']) }}</div><div class="lbl">Items requested</div></td>
                <td><div class="num">{{ $summary['to_site'] }}</div><div class="lbl">Delivered to site</div></td>
            </tr>
        </table>

        @if($purchaseRequests->isEmpty())
            <p style="text-align: center; color: #6b7280; padding: 2rem;">No purchase requests were sent in this period.</p>
        @else
            {{-- What was ordered in total, e.g. for buying in bulk --}}
            <div class="section">
                <h2>Materials requested (totals)</h2>
                <div class="totals">
                    <table class="items">
                        <thead>
                            <tr>
                                <th style="width: 18%;">Category</th>
                                <th>Item</th>
                                <th class="r" style="width: 10%;">Qty</th>
                                <th style="width: 12%;">Unit</th>
                                <th class="r" style="width: 14%;">Requests</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($totals as $row)
                            <tr>
                                <td class="muted">{{ $row['category'] }}</td>
                                <td>{{ $row['name'] }}</td>
                                <td class="r"><strong>{{ number_format($row['quantity']) }}</strong></td>
                                <td>{{ $row['unit'] ?: '—' }}</td>
                                <td class="r muted">{{ $row['requests'] }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>

            {{-- Each purchase request, newest first --}}
            <h2>Purchase requests</h2>
            @foreach($purchaseRequests as $pr)
            @php
                $qr = $pr->quotation?->quotationRequest;
                $computation = $qr?->solarComputation;
                $system = collect([
                    $computation?->package_kw ? $computation->package_kw . ' kW' : null,
                    $computation?->panel_count ? $computation->panel_count . ' × 610 W' : null,
                    $computation?->battery_ah ? $computation->battery_ah . ' Ah' : null,
                ])->filter()->implode(' · ');
            @endphp
            <div class="block">
                <div class="block-header">
                    <div class="block-title">
                        {{ $qr->reference ?? 'Quotation #' . $pr->quotation_id }}
                        — {{ $qr?->customer?->user?->name ?? 'Unknown customer' }}
                    </div>
                    <div class="block-meta">
                        Sent {{ $pr->created_at->format('M d, Y') }}
                        @if($pr->sentBy) by {{ $pr->sentBy->name }} @endif
                        &bull; Deliver to: {{ $pr->deliver_to === 'site' ? 'Installation site' : 'TataMawing Solar' }}@if($pr->delivery_address), {{ $pr->delivery_address }}@endif
                        <br>
                        @if($pr->needed_by) Needed by {{ $pr->needed_by->format('M d, Y') }} @else No needed-by date @endif
                        @if($system) &bull; System: {{ $system }} @endif
                    </div>
                </div>

                <table class="items">
                    <thead>
                        <tr>
                            <th style="width: 6%;">#</th>
                            <th style="width: 18%;">Category</th>
                            <th>Item</th>
                            <th class="r" style="width: 10%;">Qty</th>
                            <th style="width: 12%;">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($pr->items as $index => $item)
                        <tr>
                            <td class="muted">{{ $index + 1 }}</td>
                            <td class="muted">{{ $item->category ?: '—' }}</td>
                            <td>{{ $item->material_name }}</td>
                            <td class="r"><strong>{{ $item->quantity }}</strong></td>
                            <td>{{ $item->unit ?: '—' }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                @if($pr->notes)
                <div class="notes"><span class="muted">Notes:</span> {{ $pr->notes }}</div>
                @endif
            </div>
            @endforeach
        @endif

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
