<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>External Quotation Requests</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
        .header { background-color: #1a4a3a; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 18px; margin-bottom: 2px; }
        .header p { font-size: 10px; opacity: 0.85; }
        .content { padding: 0 20px 20px 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #1a4a3a; color: white; text-align: left; padding: 7px 8px; font-size: 10px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: top; }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .summary { margin-bottom: 16px; }
        .summary td { text-align: center; padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; }
        .summary-number { font-size: 20px; font-weight: bold; color: #1a4a3a; }
        .summary-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: bold; }
        .badge-pending_review { background-color: #fef9c3; color: #a16207; }
        .badge-confirmed { background-color: #dcfce7; color: #16a34a; }
        .badge-rejected { background-color: #fef2f2; color: #dc2626; }
        .muted { color: #6b7280; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    @php
        $labels = ['pending_review' => 'Pending review', 'confirmed' => 'Confirmed', 'rejected' => 'Rejected'];
    @endphp

    <div class="header">
        <h1>External Quotation Requests</h1>
        <p>TataMawing Solar Power Installation Service &bull; Generated: {{ $generatedAt }} &bull; {{ $periodLabel }}</p>
    </div>

    <div class="content">
        <table class="summary">
            <tr>
                <td>
                    <div class="summary-number">{{ $requests->count() }}</div>
                    <div class="summary-label">Requests</div>
                </td>
                <td>
                    <div class="summary-number">{{ $requests->where('status', 'pending_review')->count() }}</div>
                    <div class="summary-label">Pending review</div>
                </td>
                <td>
                    <div class="summary-number">{{ $requests->where('status', 'confirmed')->count() }}</div>
                    <div class="summary-label">Confirmed</div>
                </td>
                <td>
                    <div class="summary-number">{{ $requests->where('status', 'rejected')->count() }}</div>
                    <div class="summary-label">Rejected</div>
                </td>
            </tr>
        </table>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Requested</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Bought from</th>
                    <th>Preferred date</th>
                    <th>Status</th>
                    <th>Scheduled / reason</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($requests as $r)
                    <tr>
                        <td>{{ str_pad($r->id, 3, '0', STR_PAD_LEFT) }}</td>
                        <td>{{ $r->created_at->format('M d, Y') }}</td>
                        <td>{{ $r->name }}<br><span class="muted">{{ $r->phone }}</span></td>
                        <td>{{ $r->address }}</td>
                        <td>{{ $r->other_company_name }}</td>
                        <td>{{ \Carbon\Carbon::parse($r->preferred_installation_date)->format('M d, Y') }}</td>
                        <td><span class="badge badge-{{ $r->status }}">{{ $labels[$r->status] ?? $r->status }}</span></td>
                        <td>
                            @if ($r->installationSchedule)
                                {{ \Carbon\Carbon::parse($r->installationSchedule->scheduled_date)->format('M d, Y') }}
                                &bull; {{ $r->installationSchedule->assigned_technician }}
                            @elseif ($r->rejection_reason)
                                <span class="muted">{{ $r->rejection_reason }}</span>
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="8" class="muted" style="text-align: center; padding: 20px;">No external quotation requests in this period.</td></tr>
                @endforelse
            </tbody>
        </table>

        <div class="footer">
            <p>TataMawing Solar Power Quotation System &bull; {{ $generatedAt }}</p>
        </div>
    </div>
</body>
</html>
