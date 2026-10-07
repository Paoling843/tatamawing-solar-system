<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Guest vs Signed-in Quotations</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #1a4a3a; color: white; text-align: left; padding: 7px 8px; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .summary { margin-bottom: 16px; }
        .summary td { text-align: center; padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
        .summary-number { font-size: 20px; font-weight: bold; color: #1a4a3a; }
        .summary-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .badge-left { background-color: #fef9c3; color: #a16207; }
        .badge-done { background-color: #dcfce7; color: #16a34a; }
        .muted { color: #6b7280; }
        .note { font-size: 9px; color: #6b7280; margin-bottom: 12px; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    @php
        $steps = [1 => 'Appliances', 2 => 'Computation', 3 => 'Saw the quote'];
        $guests = $sessions->where('started_as_guest', true);
    @endphp

    <div class="header">
        <h1>Guest vs Signed-in Quotations</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel }}</p>
    </div>

    <div class="content">
        <table class="summary">
            <tr>
                <td>
                    <div class="summary-number">{{ $guests->where('furthest_step', 3)->whereNull('converted_at')->count() }}</div>
                    <div class="summary-label">Guest quotation, did not continue</div>
                </td>
                <td>
                    <div class="summary-number">{{ $guests->whereNotNull('converted_at')->count() }}</div>
                    <div class="summary-label">Signed in to continue</div>
                </td>
                <td>
                    <div class="summary-number">{{ $sessions->where('started_as_guest', false)->whereNotNull('converted_at')->count() }}</div>
                    <div class="summary-label">Already signed in</div>
                </td>
                <td>
                    <div class="summary-number">{{ $sessions->count() }}</div>
                    <div class="summary-label">Quote-builder visits</div>
                </td>
            </tr>
        </table>

        <p class="note">Visits are anonymous until the visitor signs in. A guest "did not continue" when they saw the quote but never submitted it.</p>

        <table>
            <thead>
                <tr>
                    <th>Started</th>
                    <th>Started as</th>
                    <th>Furthest step</th>
                    <th>Pressed Request</th>
                    <th>Signed in</th>
                    <th>Customer</th>
                    <th>Outcome</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($sessions as $s)
                    <tr>
                        <td>{{ $s->created_at->format('M d, Y h:i A') }}</td>
                        <td>{{ $s->started_as_guest ? 'Guest' : 'Signed-in customer' }}</td>
                        <td>{{ $steps[$s->furthest_step] ?? $s->furthest_step }}</td>
                        <td>{{ $s->requested_at ? $s->requested_at->format('M d, h:i A') : '—' }}</td>
                        <td>{{ $s->signed_in_at ? $s->signed_in_at->format('M d, h:i A') : '—' }}</td>
                        <td>{{ $s->user?->name ?? '—' }}</td>
                        <td>
                            @if ($s->converted_at)
                                <span class="badge badge-done">Submitted &bull; Request #{{ $s->quotation_request_id }}</span>
                            @else
                                <span class="badge badge-left">Did not continue</span>
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="7" class="muted" style="text-align: center; padding: 20px;">No quote-builder visits in this period.</td></tr>
                @endforelse
            </tbody>
        </table>

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
