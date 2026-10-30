<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Purchase Request {{ $reference }}</title>
    {{-- Sent to suppliers on Messenger and usually read on a phone, so the
         text is larger than the other reports. No prices and no customer
         name or phone: only what the supplier needs to prepare the order. --}}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 18px 24px; }
        .header h1 { font-size: 22px; margin-bottom: 3px; }
        .header p { font-size: 12px; opacity: 0.9; }
        .content { padding: 18px 24px 24px; }
        .reply { background-color: #fdf4dc; border: 1px solid #f3e3ad; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #5b4a12; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .grid td { width: 50%; vertical-align: top; padding: 0; }
        .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; }
        .box-left { margin-right: 8px; }
        .box-right { margin-left: 8px; }
        .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .value { font-size: 13px; color: #111827; line-height: 1.45; }
        .system { margin-bottom: 16px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table.items th { background-color: #f0f7f4; text-align: left; padding: 8px 10px; font-size: 11px; color: #1a4a3a; text-transform: uppercase; }
        table.items td { padding: 9px 10px; border-bottom: 1px solid #eef0ec; font-size: 13px; vertical-align: top; }
        table.items td.num { text-align: right; font-weight: bold; }
        .muted { color: #6b7280; }
        .notes-lines { height: 70px; border-bottom: 1px dashed #d1d5db; }
        .footer { margin-top: 18px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Purchase Request</h1>
        <p>TataMawing Solar Power Installation Service &bull; For quotation #{{ $reference }} &bull; {{ $generatedAt }}</p>
    </div>

    <div class="content">
        <div class="reply">
            Please reply on Messenger with the <strong>availability, price and delivery date</strong> for these items.
        </div>

        <table class="grid">
            <tr>
                <td>
                    <div class="box box-left">
                        <div class="label">Deliver to</div>
                        <div class="value">
                            {{ $deliverToSite ? 'Installation site' : 'TataMawing Solar' }}<br>
                            <span class="muted">{{ $deliverTo }}</span>
                        </div>
                        @if($neededBy)
                            <div class="label" style="margin-top: 8px;">Needed by</div>
                            <div class="value">{{ $neededBy }}</div>
                        @endif
                    </div>
                </td>
                <td>
                    <div class="box box-right">
                        <div class="label">Contact</div>
                        <div class="value">
                            TataMawing Solar<br>
                            @if($messengerUrl)<span class="muted">Messenger: {{ $messengerUrl }}</span><br>@endif
                            @if($contactEmail)<span class="muted">Email: {{ $contactEmail }}</span>@endif
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        {{-- So the supplier can check the parts work together (e.g. battery voltage) --}}
        @if($computation)
        <div class="box system">
            <div class="label">System</div>
            <div class="value">
                @if($computation->package_kw){{ $computation->package_kw }} kW hybrid inverter &middot; @endif
                @if($computation->panel_count){{ $computation->panel_count }} &times; 610 W panels &middot; @endif
                @if($computation->battery_ah)
                    @if(($computation->battery_qty ?? 1) > 1){{ $computation->battery_qty }} &times; @endif{{ $computation->battery_ah }} Ah
                    @if($computation->extra_battery_ah) + {{ $computation->extra_battery_ah }} Ah @endif
                    battery at 51.2 V
                @endif
            </div>
        </div>
        @endif

        <table class="items">
            <thead>
                <tr>
                    <th style="width: 6%;">#</th>
                    <th style="width: 32%;">Item</th>
                    <th>Specification</th>
                    <th style="width: 8%; text-align: right;">Qty</th>
                    <th style="width: 10%;">Unit</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $index => $item)
                <tr>
                    <td class="muted">{{ $index + 1 }}</td>
                    <td><strong>{{ $item['name'] }}</strong></td>
                    <td>{{ $item['specification'] ?? '' ?: '—' }}</td>
                    <td class="num">{{ $item['quantity'] }}</td>
                    <td>{{ $item['unit'] ?? '' ?: '—' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        @if($notes)
        <div class="box" style="margin-bottom: 16px;">
            <div class="label">Notes</div>
            <div class="value" style="white-space: pre-wrap;">{{ $notes }}</div>
        </div>
        @endif

        <div class="box">
            <div class="label">Supplier reply (availability / price / delivery date)</div>
            <div class="notes-lines"></div>
        </div>

        <div class="footer">
            TataMawing Solar Power &bull; Purchase request for quotation #{{ $reference }} &bull; {{ $generatedAt }}
        </div>
    </div>
</body>
</html>
