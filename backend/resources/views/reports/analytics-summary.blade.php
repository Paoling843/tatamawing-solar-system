<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Analytics Summary</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        h2 { font-size: 13px; color: #1a4a3a; border-bottom: 2px solid #1a4a3a; padding-bottom: 4px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; color: #374151; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        .num { text-align: right; }
        .summary { width: 100%; margin-bottom: 4px; }
        .summary td { text-align: center; padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
        .summary-number { font-size: 18px; font-weight: bold; color: #1a4a3a; }
        .summary-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .muted { color: #6b7280; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    @php
        $users = $data['users'];
        $splitTotal = $users['guest_not_continued'] + $users['guest_signed_in'] + $users['external_requests'];
        $pct = fn ($n) => $splitTotal > 0 ? round($n / $splitTotal * 100) . '%' : '—';
        $kpi = $data['kpis'];
        $days = fn ($v) => $v === null ? '—' : number_format($v, 1) . ' days';
    @endphp

    <div class="header">
        <h1>Analytics Summary</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel }}</p>
    </div>

    <div class="content">
        <h2>Who's using the system</h2>
        <table class="summary">
            <tr>
                <td>
                    <div class="summary-number">{{ $users['guest_not_continued'] }}</div>
                    <div class="summary-label">Guest quotation, did not continue ({{ $pct($users['guest_not_continued']) }})</div>
                </td>
                <td>
                    <div class="summary-number">{{ $users['guest_signed_in'] }}</div>
                    <div class="summary-label">Signed in to continue ({{ $pct($users['guest_signed_in']) }})</div>
                </td>
                <td>
                    <div class="summary-number">{{ $users['external_requests'] }}</div>
                    <div class="summary-label">External quotation requests ({{ $pct($users['external_requests']) }})</div>
                </td>
            </tr>
        </table>
        <p class="muted">Plus {{ $users['signed_in_customers'] }} customer(s) who were already signed in when they made their quotation.</p>

        <h2>Key figures</h2>
        <table>
            <tr><th>Metric</th><th class="num">This period</th><th class="num">Previous period</th></tr>
            <tr><td>Quotations created</td><td class="num">{{ $kpi['quotations_created']['value'] }}</td><td class="num">{{ $kpi['quotations_created']['previous'] }}</td></tr>
            <tr><td>Approved projects</td><td class="num">{{ $kpi['approved_projects']['value'] }}</td><td class="num">{{ $kpi['approved_projects']['previous'] }}</td></tr>
            <tr><td>Value of approved projects (contract value)</td><td class="num">PHP{{ number_format($kpi['revenue']['value'], 2) }}</td><td class="num">PHP{{ number_format($kpi['revenue']['previous'], 2) }}</td></tr>
            <tr><td>Installations completed</td><td class="num">{{ $kpi['installations_completed']['value'] }}</td><td class="num">{{ $kpi['installations_completed']['previous'] }}</td></tr>
        </table>

        <h2>From quotation to installation</h2>
        <table>
            <tr><th>Step</th><th class="num">Count</th><th class="num">Dropped off from previous step</th></tr>
            @foreach ($data['funnel'] as $i => $step)
                @php $prev = $i > 0 ? $data['funnel'][$i - 1]['count'] : null; @endphp
                <tr>
                    <td>{{ $step['label'] }}</td>
                    <td class="num">{{ $step['count'] }}</td>
                    <td class="num">{{ $prev ? round(($prev - $step['count']) / $prev * 100) . '%' : '—' }}</td>
                </tr>
            @endforeach
        </table>

        <h2>Average time between steps</h2>
        <table>
            @foreach ($data['step_times'] as $t)
                <tr><td>{{ $t['label'] }}</td><td class="num">{{ $days($t['days']) }}</td></tr>
            @endforeach
        </table>

        <h2>Estimated savings of quoted systems</h2>
        <table>
            <tr><td>Average monthly savings</td><td class="num">{{ $data['savings']['avg_monthly_savings'] !== null ? 'PHP' . number_format($data['savings']['avg_monthly_savings'], 2) : '—' }}</td></tr>
            <tr><td>Average payback period</td><td class="num">{{ $data['savings']['avg_payback_years'] !== null ? $data['savings']['avg_payback_years'] . ' years' : '—' }}</td></tr>
            <tr><td>Average annual return (ROA)</td><td class="num">{{ $data['savings']['avg_roa_percent'] !== null ? $data['savings']['avg_roa_percent'] . '%' : '—' }}</td></tr>
            <tr><td>Customers who entered their own rate (bill + kWh)</td><td class="num">{{ $data['savings']['own_rate_percent'] !== null ? $data['savings']['own_rate_percent'] . '%' : '—' }}</td></tr>
        </table>

        <h2>Quoted system sizes and top barangays</h2>
        <table>
            <tr>
                <td style="width: 50%; vertical-align: top; border: none; padding: 0 8px 0 0;">
                    <table>
                        <tr><th>Package</th><th class="num">Quotations</th></tr>
                        @foreach ($data['sizes']['packages'] as $p)
                            <tr><td>{{ $p['kw'] }} kW hybrid</td><td class="num">{{ $p['count'] }}</td></tr>
                        @endforeach
                        <tr><td><strong>Average size</strong></td><td class="num"><strong>{{ $data['sizes']['average_kw'] !== null ? $data['sizes']['average_kw'] . ' kW' : '—' }}</strong></td></tr>
                    </table>
                </td>
                <td style="width: 50%; vertical-align: top; border: none; padding: 0 0 0 8px;">
                    <table>
                        <tr><th>Barangay</th><th class="num">Quotations</th></tr>
                        @forelse ($data['barangays'] as $b)
                            <tr><td>{{ $b['name'] }}</td><td class="num">{{ $b['count'] }}</td></tr>
                        @empty
                            <tr><td colspan="2" class="muted">No quotations in this period.</td></tr>
                        @endforelse
                    </table>
                </td>
            </tr>
        </table>

        <h2>Review queue</h2>
        <table>
            <tr><td>Waiting for review now</td><td class="num">{{ $data['review_queue']['pending'] }}</td></tr>
            <tr><td>Oldest waiting request</td><td class="num">{{ $data['review_queue']['oldest_pending_days'] !== null ? $data['review_queue']['oldest_pending_days'] . ' days' : '—' }}</td></tr>
            <tr><td>Approval rate (decided requests this period)</td><td class="num">{{ $data['review_queue']['approval_rate_percent'] !== null ? $data['review_queue']['approval_rate_percent'] . '%' : '—' }}</td></tr>
        </table>

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
